'use server';

import { requireAuth } from '@/lib/require-auth';
import { NoResultsError, NetworkError, ApiError } from '../callouts/errors.js';
import {
    calculateHolidays,
    calculateNextResetDate,
    buildVacationBalanceFromProfile,
    generateDateRange,
    getUTCToday,
    formatDateToISOString,
    getWeekMonday,
    getWeekSunday,
    getDayOfWeekIndex,
    buildMonthlyOccupancyFromWeeks,
    buildFullMonthlyOccupancy,
    getCurrentFiscalYear,
    getFiscalYearStartDate,
    getFiscalYearEndDate,
    getPreviousFiscalYear,
} from '@/lib/utils.js';
import { getFlexApiService } from './flex-service.js';
import {
    PROJECT_TYPE_ID,
    WORKING_TYPE_ID,
    HOLIDAY_TYPE_ID,
    COMPANY_ID,
    SICK_LEAVE_TYPE_ID,
    PARENTAL_LEAVE_10_DAYS_TYPE_ID,
    PARENTAL_LEAVE_TYPE_ID,
    ABSENCE_STATUS_CODE,
    ARTICLE_TYPE_ID,
} from './constants.js';

// Timecard methods
/**
 * Creates timereport entries in Flex for a timecard (multiple days).
 *
 * Processing is two-phase and distinguishes same-day vs different-day work:
 * - **Different days**: Processed in parallel. Phase 1 blanks all days concurrently;
 *   phase 2 creates rows for all days concurrently (each day is handled by createTimeRow).
 * - **Same day**: Within a single day, rows are processed sequentially. Phase 1 sends
 *   one PUT per day with all rows to blank. Phase 2 creates one row at a time for that
 *   day (createTimeRow awaits each createTimerow) so the API can enforce non-overlapping times.
 *
 * @param {string} flexEmployeeId - The Flex employee ID
 * @param {Object} timecard - The timecard with timeData (array of { date, timeRows })
 * @returns {Promise<number[]>} Flat array of HTTP status codes (one per created row across all days)
 */
export async function createTimereport(flexEmployeeId, timecard) {
    await requireAuth();
    const timeDataEntries = timecard.timeData;
    try {
        // Phase 1: blank all time rows first (must finish before creating new rows)
        const blankPromises = timeDataEntries.map((timeDataEntry) =>
            blankTimeRow(flexEmployeeId, timeDataEntry.date, timeDataEntry.timeRows)
        );
        await Promise.all(blankPromises);

        // Phase 2: create time rows after blanks are done
        const createPromises = timeDataEntries
            .map((timereport) => {
                const date = formatDateToISOString(timereport.date);

                // Skip entire day if it contains a full-day absence (8+ hours)
                // The API rejects updates to days that already have full-day absence entries
                const hasFullDayAbsence = timereport.timeRows?.some(
                    (row) => row.isWorkingTime === false && row.hours >= 8
                );

                if (hasFullDayAbsence) {
                    return null;
                }

                const workingTimeRows =
                    timereport.timeRows?.filter(
                        (row) => row.isWorkingTime !== false && (row.hours ?? 0) > 0
                    ) || [];

                // Skip days with no working time entries to create (0-hour rows are only blanked in phase 1)
                if (workingTimeRows.length === 0) {
                    return null;
                }
                return createTimeRow(flexEmployeeId, date, workingTimeRows);
            })
            .filter(Boolean); // Remove null entries (days with no working time)

        // createTimeRow returns a promise that resolves to an array of statuses per day
        const dayResults = await Promise.all(createPromises);
        return dayResults.flat();
    } catch (error) {
        throw error;
    }
}

/**
 * Returns whether a time row has valid project and role IDs for Flex (non-empty).
 * @param {Object} timeRow - Row with projectId and roleFlexId
 * @returns {boolean}
 */
function hasValidAccountIds(timeRow) {
    const projectId = timeRow?.projectId;
    const roleFlexId = timeRow?.roleFlexId;
    return (
        projectId != null &&
        String(projectId).trim() !== '' &&
        roleFlexId != null &&
        String(roleFlexId).trim() !== ''
    );
}

/**
 * createTimerow does not allow updating rows, createTimereport does.
 * However, createTimereport creates multiple rows so we can't use it.
 * Therefore, we must use createTimerow for same day, but delete first and then re-create.
 * Same day: one request with all rows for that date. Different days: called in parallel
 * from createTimereport (one blankTimeRow per day), so multiple days are blanked concurrently.
 *
 * @param {string} flexEmployeeId - The Flex employee ID
 * @param {string} date - Date for the day (YYYY-MM-DD)
 * @param {Object[]} workingTimeRows - Rows to blank (only those with valid project/role IDs are used)
 * @returns {Promise<number>} HTTP status of the PUT
 */
async function blankTimeRow(flexEmployeeId, date, workingTimeRows) {
    const flexApiClient = await getFlexApiService();
    // Only blank rows with valid project and role IDs; skip rows that would create empty Account/Project/Role in Flex
    const validRows = (workingTimeRows || []).filter(hasValidAccountIds);
    if (validRows.length === 0) {
        return;
    }
    // Rows can't overlap, so passing from 0 to 9 and then from 0 to 6 throws an error
    let previousTomHours = 0;

    const timeRows = validRows.map((timeRow) => {
        const tomHours = previousTomHours + timeRow.hours;
        const body = {
            accounts: [
                {
                    accountDistributionId: PROJECT_TYPE_ID,
                    id: timeRow.projectId,
                },
                {
                    accountDistributionId: ARTICLE_TYPE_ID,
                    id: timeRow.roleFlexId,
                },
            ],
            fromTime: 0, // Set to zero to blank the time row
            tomTime: 0, // Set to zero to blank the time row
            timeCode: {
                code: 'ARB',
            },
        };
        previousTomHours = tomHours;
        return body;
    });

    const body = {
        timeRows: timeRows,
    };
    return flexApiClient.createTimereport(flexEmployeeId, date, body);
}

/**
 * Creates time rows for a single day in Flex. Same day: rows are created sequentially
 * (one POST per row, awaited in order) so the API can enforce non-overlapping times.
 * Different days: createTimereport calls this once per day and awaits all days with
 * Promise.all, so multiple days are processed in parallel.
 *
 * @param {string} flexEmployeeId - The Flex employee ID
 * @param {string} date - Date for the day (YYYY-MM-DD)
 * @param {Object[]} workingTimeRows - Working-time rows to create (valid project/role only)
 * @returns {Promise<number[]>} Array of HTTP status codes (one per created row)
 */
async function createTimeRow(flexEmployeeId, date, workingTimeRows) {
    const flexApiClient = await getFlexApiService();
    // Rows can't overlap; create them sequentially so the API can validate ordering
    let previousTomHours = 0;

    // Only create rows with valid project and role IDs to avoid Flex rows with empty Account/Project/Role
    const validRows = (workingTimeRows || []).filter(hasValidAccountIds);
    const results = [];
    // Await each createTimerow in a loop so for a given day rows are created one by one (API validates ordering).
    for (const timeRow of validRows) {
        const tomHours = previousTomHours + timeRow.hours;
        const body = {
            accounts: [
                {
                    accountDistributionId: PROJECT_TYPE_ID,
                    id: timeRow.projectId,
                },
                {
                    accountDistributionId: ARTICLE_TYPE_ID,
                    id: timeRow.roleFlexId,
                },
            ],
            fromTime: hoursToTimeString(previousTomHours),
            tomTime: hoursToTimeString(tomHours),
            TimeCode: {
                Code: 'ARB',
            },
        };
        previousTomHours = tomHours;
        const status = await flexApiClient.createTimerow(flexEmployeeId, date, body);
        results.push(status);
    }
    return results;
}

/**
 * Get all timereports for a given employee, grouped into weeks.
 * Returns the same shape as the Salesforce getAssignmentTimecards response:
 * { weekStartDate, weekEndDate, hours: [mon, tue, wed, thu, fri, sat, sun] }
 * sorted newest week first.
 * @param {string} flexEmployeeId - The Flex employee ID
 * @param {string|null} flexProjectId - Optional Flex project ID to filter by
 * @param {string|null} startDate - Optional start date to filter by
 * @param {string|null} endDate - Optional end date to filter by
 * @returns {Promise<Array<{weekStartDate: string, weekEndDate: string, hours: number[]}>>}
 */
export async function getAssignmentTimereportsByProjectId(
    flexEmployeeId,
    flexProjectId = null,
    startDate = null,
    endDate = null
) {
    await requireAuth();
    const flexApiClient = await getFlexApiService();
    flexApiClient.config.cache = 'no-store';

    try {
        const timereports = await flexApiClient.getTimereports(flexEmployeeId, startDate, endDate);

        const weekMap = new Map();

        for (const timereport of timereports) {
            if (!timereport.TimeRows?.length) continue;

            const date = formatDateToISOString(timereport.Date);
            const workingRows = timereport.TimeRows.filter((row) => {
                if (row.TimeCode.Id !== WORKING_TYPE_ID) return false;
                if (!flexProjectId) return true;
                const projectAccount = row.Accounts?.find(
                    (account) => account.AccountDistribution.Id === PROJECT_TYPE_ID
                );
                return projectAccount?.Id === flexProjectId;
            });

            const totalMinutes = workingRows.reduce((sum, row) => sum + row.TimeInMinutes, 0);

            if (totalMinutes === 0) continue;

            const mondayDate = formatDateToISOString(getWeekMonday(date));
            const dayIndex = getDayOfWeekIndex(date);

            if (!weekMap.has(mondayDate)) {
                weekMap.set(mondayDate, {
                    weekStartDate: mondayDate,
                    weekEndDate: formatDateToISOString(getWeekSunday(getWeekMonday(date))),
                    hours: [0, 0, 0, 0, 0, 0, 0],
                });
            }

            weekMap.get(mondayDate).hours[dayIndex] = totalMinutes / 60;
        }

        return Array.from(weekMap.values()).sort((a, b) =>
            b.weekStartDate.localeCompare(a.weekStartDate)
        );
    } catch (error) {
        throw error;
    }
}

/**
 * Get all timereports for a given employee, grouped into weeks.
 * Returns the same shape as the Salesforce getAssignmentTimecards response:
 * { weekStartDate, weekEndDate, hours: [mon, tue, wed, thu, fri, sat, sun] }
 * sorted newest week first.
 * @param {string} flexEmployeeId - The Flex employee ID
 * @param {string|null} startDate - Optional start date to filter by
 * @param {string|null} endDate - Optional end date to filter by
 * @returns {Promise<Array<{weekStartDate: string, weekEndDate: string, hours: number[]}>>}
 */
export async function getAssignmentTimereportsForOccupancy(
    flexEmployeeId,
    startDate = null,
    endDate = null
) {
    await requireAuth();
    const flexApiClient = await getFlexApiService();
    flexApiClient.config.cache = 'no-store';

    try {
        const timereports = await flexApiClient.getTimereports(flexEmployeeId, startDate, endDate);

        const weekMap = new Map();

        for (const timereport of timereports) {
            if (!timereport.TimeRows?.length) continue;

            const date = formatDateToISOString(timereport.Date);
            const workingRows = timereport.TimeRows.filter((row) => {
                if (row.TimeCode.Id !== WORKING_TYPE_ID) {
                    return false;
                }

                const projectAccount = row.Accounts.find(
                    (account) => account.AccountDistribution.Id === PROJECT_TYPE_ID
                );

                if (!projectAccount) {
                    return false;
                }

                const regex = /deploy/i;
                const isInternalProject = regex.test(projectAccount.Name);
                if (isInternalProject) {
                    return false;
                }

                return true;
            });

            const totalMinutes = workingRows.reduce((sum, row) => sum + row.TimeInMinutes, 0);

            if (totalMinutes === 0) continue;

            const mondayDate = formatDateToISOString(getWeekMonday(date));
            const dayIndex = getDayOfWeekIndex(date);

            if (!weekMap.has(mondayDate)) {
                weekMap.set(mondayDate, {
                    weekStartDate: mondayDate,
                    weekEndDate: formatDateToISOString(getWeekSunday(getWeekMonday(date))),
                    hours: [0, 0, 0, 0, 0, 0, 0],
                });
            }

            weekMap.get(mondayDate).hours[dayIndex] = totalMinutes / 60;
        }

        return Array.from(weekMap.values()).sort((a, b) =>
            b.weekStartDate.localeCompare(a.weekStartDate)
        );
    } catch (error) {
        throw error;
    }
}

/**
 * Get the timereports for a given employee number
 * @param {string} flexEmployeeId - The employee number
 * @param {string} weekStartDate - The start date of the week
 * @param {string} weekEndDate - The end date of the week
 * @returns {Promise<Object>} The timereports
 */
export async function getTimereports(flexEmployeeId, weekStartDate, weekEndDate) {
    await requireAuth();
    const flexApiClient = await getFlexApiService();
    flexApiClient.config.cache = 'no-store'; // force-cache'; -> this will return the data from he cache

    try {
        const timereports = await flexApiClient.getTimereports(
            flexEmployeeId,
            weekStartDate,
            weekEndDate
        );

        const selectedProjects = new Set();

        const timereportResponse = timereports
            .filter((timereport) => timereport.TimeRows?.length > 0)
            .map((timereport) => ({
                date: timereport.Date,
                timeRows: timereport.TimeRows.map((timeRow) => {
                    if (timeRow.TimeCode.Id === WORKING_TYPE_ID) {
                        const projectAccount = timeRow.Accounts.find(
                            (account) => account.AccountDistribution.Id === PROJECT_TYPE_ID
                        );
                        if (!projectAccount) {
                            return null;
                        }

                        const articleAccount = timeRow.Accounts.find(
                            (account) => account.AccountDistribution.Id === ARTICLE_TYPE_ID
                        );

                        if (!articleAccount) {
                            return null;
                        }

                        selectedProjects.add(projectAccount.Id);

                        // We do not have a project type in Flex, so we use a regex to determine the color
                        const regex = /deploy/i;
                        const isInternalProject = regex.test(projectAccount.Name);
                        const color = isInternalProject ? '#6b7280' : '#3b82f6';

                        return {
                            articleId: articleAccount.Id,
                            projectId: projectAccount.Id,
                            projectName: projectAccount.Name,
                            projectCode: projectAccount.Code,
                            roleFlexId: articleAccount.Id,
                            hours: timeRow.TimeInMinutes / 60,
                            color: color,
                            isWorkingTime: true,
                            isExistingInFlex: true,
                        };

                        // Other types of absences
                    } else {
                        return {
                            projectId: timeRow.TimeCode.Id,
                            projectName: timeRow.TimeCode.Name,
                            projectCode: timeRow.TimeCode.Code,
                            hours: timeRow.TimeInMinutes / 60,
                            color: 'red',
                            isWorkingTime: false,
                            isExistingInFlex: true,
                        };
                    }
                }).filter(Boolean),
            }));

        return {
            timereportResponse,
            selectedProjects,
        };
    } catch (error) {
        throw error;
    }
}

// Absence applications methods

/**
 * Get all absence applications for a given employee number
 * @param {string} employeeNumber - The employee number
 * @returns {Promise<Object>} The absence applications
 */
export async function getAllAbsence(employeeNumber) {
    await requireAuth();
    try {
        const flexApiClient = await getFlexApiService();
        return await flexApiClient.getAbsenceApplications(employeeNumber);
    } catch (error) {
        throw error;
    }
}

/**
 * Get the holidays for a given employee number
 * @param {Object} employeeInformation - The employee information
 * @param {string} employeeInformation.employeeNumber - The employee number
 * @param {number} employeeInformation.yearlyHolidays - The yearly holidays
 * @param {number} employeeInformation.carriedOverHolidays - Ingoing saved days at semester start
 * @param {number} employeeInformation.vacationEarnedDays - Ingoing earned days at semester start
 * @param {number} employeeInformation.vacationAdvanceDays - Ingoing advance days at semester start
 * @param {Object} options - The options for the request
 * @param {string} options.cache - The cache mode for the request
 * @returns {Promise<Object>} The holidays
 */
export async function getHolidays(employeeInformation, options = { cache: 'no-store' }) {
    await requireAuth();
    const {
        employeeNumber,
        yearlyHolidays,
        carriedOverHolidays,
        vacationEarnedDays = 0,
        vacationAdvanceDays = 0,
    } = employeeInformation;
    try {
        const flexApiClient = await getFlexApiService();
        flexApiClient.config.cache = options.cache;

        const response = await flexApiClient.getAbsenceApplications(
            employeeNumber,
            HOLIDAY_TYPE_ID,
            30
        );

        if (!response?.Result) {
            throw new NoResultsError('No holidays found');
        }

        const holidays = calculateHolidays(response.Result);

        const savedDays = carriedOverHolidays ?? 0;
        const balance = buildVacationBalanceFromProfile({
            yearlyHolidays,
            vacationEarnedDays,
            vacationSavedDays: savedDays,
            vacationAdvanceDays,
            usedDays: holidays.currentFiscalUsedHolidays,
        });

        holidays.yearlyHolidays = yearlyHolidays;
        holidays.totalHolidays = balance.totalDays;
        holidays.availableHolidays = balance.availableDays;
        holidays.carriedOverHolidays = savedDays;
        holidays.balance = balance;

        // Format dates as ISO strings before sending to client
        holidays.recentHolidayPeriods = holidays.holidayPeriods.slice(0, 3).map((period) => ({
            ...period,
            fromDate: period.fromDate.toISOString().split('T')[0],
            toDate: period.toDate.toISOString().split('T')[0],
        }));

        holidays.nextResetDate = calculateNextResetDate(getUTCToday()).toISOString().split('T')[0];

        // Convert all holiday range dates to ISO strings
        holidays.allHolidaysRange = [];
        for (const holiday of holidays.holidayPeriods) {
            const range = generateDateRange(holiday.fromDate, holiday.toDate);
            holidays.allHolidaysRange.push(...range.map((date) => date.toISOString()));
        }

        return holidays;
    } catch (error) {
        console.error('Error in getAbsenceApplications:', {
            name: error.name,
            message: error.message,
            status: error.status,
            code: error.code,
        });

        if (error instanceof NoResultsError) {
            throw error;
        }

        if (error instanceof NetworkError || error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            error.message || 'Failed to fetch absence applications',
            error.status,
            error.code
        );
    }
}

/**
 * Get the holiday requests for a given employee number. Only future requests are returned.
 * @param {string} employeeNumber - The employee number
 * @param {string} currentDate - The current date
 * @returns {Promise<Object>} The holiday requests
 */
export async function getHolidayRequests(employeeNumber, currentDate) {
    await requireAuth();
    try {
        const flexApiClient = await getFlexApiService();
        const response = await flexApiClient.getAbsenceApplications(
            employeeNumber,
            HOLIDAY_TYPE_ID
        );

        const currentDateISO = formatDateToISOString(currentDate);

        const filteredResponse = response.Result.filter(
            (request) => formatDateToISOString(request.FromDate) >= currentDateISO
        ).map((request) => ({
            ...request,
            status: ABSENCE_STATUS_CODE[request.CurrentStatus.Status],
        }));

        return filteredResponse || [];
    } catch (error) {
        throw error;
    }
}

export async function getSickLeaveRequests(employeeNumber, currentDate) {
    await requireAuth();
    try {
        const flexApiClient = await getFlexApiService();

        const response = await flexApiClient.getAbsenceApplications(
            employeeNumber,
            SICK_LEAVE_TYPE_ID
        );

        const currentDateISO = formatDateToISOString(currentDate);

        const filteredResponse = response.Result.filter(
            (request) => formatDateToISOString(request.FromDate) >= currentDateISO
        ).map((request) => ({
            ...request,
            status: ABSENCE_STATUS_CODE[request.CurrentStatus.Status],
        }));

        return filteredResponse || [];
    } catch (error) {
        throw error;
    }
}

export async function getParentalLeave10DaysRequests(employeeNumber, currentDate) {
    await requireAuth();
    try {
        const flexApiClient = await getFlexApiService();

        const response = await flexApiClient.getAbsenceApplications(
            employeeNumber,
            PARENTAL_LEAVE_10_DAYS_TYPE_ID
        );

        const currentDateISO = formatDateToISOString(currentDate);

        const filteredResponse = response.Result.filter(
            (request) => formatDateToISOString(request.FromDate) >= currentDateISO
        ).map((request) => ({
            ...request,
            status: ABSENCE_STATUS_CODE[request.CurrentStatus.Status],
        }));

        return filteredResponse || [];
    } catch (error) {
        throw error;
    }
}

export async function getParentalLeaveRequests(employeeNumber, currentDate) {
    await requireAuth();
    try {
        const flexApiClient = await getFlexApiService();

        const response = await flexApiClient.getAbsenceApplications(
            employeeNumber,
            PARENTAL_LEAVE_TYPE_ID
        );

        const currentDateISO = formatDateToISOString(currentDate);

        const filteredResponse = response.Result.filter(
            (request) => formatDateToISOString(request.FromDate) >= currentDateISO
        ).map((request) => ({
            ...request,
            status: ABSENCE_STATUS_CODE[request.CurrentStatus.Status],
        }));

        return filteredResponse || [];
    } catch (error) {
        throw error;
    }
}

/**
 * Create an absence application for a given employee number
 * @param {string} employmentNumber - The employee number
 * @param {string} absenceApplicationType - The type of absence application
 * @param {Object} absenceApplicationData - The data for the absence application
 * @returns {Promise<Object>} The absence application
 */
export async function createAbsenceApplication(
    employmentNumber,
    absenceApplicationType,
    absenceApplicationData
) {
    await requireAuth();
    try {
        switch (absenceApplicationType) {
            case HOLIDAY_TYPE_ID:
                return createHolidayAbsenceApplication(employmentNumber, absenceApplicationData);
            case SICK_LEAVE_TYPE_ID:
                return createSickAbsenceApplication(employmentNumber, absenceApplicationData);
            case PARENTAL_LEAVE_10_DAYS_TYPE_ID:
                return createParentalLeave10DaysAbsenceApplication(
                    employmentNumber,
                    absenceApplicationData
                );
            case PARENTAL_LEAVE_TYPE_ID:
                return createParentalLeaveAbsenceApplication(
                    employmentNumber,
                    absenceApplicationData
                );
            default:
                throw new Error('Invalid absence application type');
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Create a holiday absence application for a given employee number
 * @param {string} employmentNumber - The employee number
 * @param {Object} absenceApplicationData - The data for the absence application
 * @returns {Promise<Object>} The absence application
 */
async function createHolidayAbsenceApplication(employmentNumber, absenceApplicationData) {
    return createAbsenceApplicationByType(
        employmentNumber,
        HOLIDAY_TYPE_ID,
        absenceApplicationData
    );
}

async function createSickAbsenceApplication(employmentNumber, absenceApplicationData) {
    return createAbsenceApplicationByType(
        employmentNumber,
        SICK_LEAVE_TYPE_ID,
        absenceApplicationData
    );
}

async function createParentalLeave10DaysAbsenceApplication(
    employmentNumber,
    absenceApplicationData
) {
    return createAbsenceApplicationByType(
        employmentNumber,
        PARENTAL_LEAVE_10_DAYS_TYPE_ID,
        absenceApplicationData
    );
}

async function createParentalLeaveAbsenceApplication(employmentNumber, absenceApplicationData) {
    return createAbsenceApplicationByType(
        employmentNumber,
        PARENTAL_LEAVE_TYPE_ID,
        absenceApplicationData
    );
}

async function createAbsenceApplicationByType(
    employmentNumber,
    absenceTypeId,
    absenceApplicationData
) {
    try {
        const absenceApplicationPayload = {
            absenceTypeId,
            companyId: COMPANY_ID,
            employmentNumber: employmentNumber,
            fromDate: absenceApplicationData.startDate,
            toDate: absenceApplicationData.endDate,
            ...(absenceApplicationData.isSameDay && { hours: absenceApplicationData.hours }),
        };

        const flexApiClient = await getFlexApiService();
        return await flexApiClient.createAbsenceApplication(
            employmentNumber,
            absenceApplicationPayload
        );
    } catch (error) {
        throw error;
    }
}

/**
 * Update an absence request
 * @param {string} absenceApplicationType - The type of absence application
 * @param {string} absenceRequestId - The ID of the absence request to update
 * @param {string} employmentNumber - The employee number
 * @param {Object} absenceApplicationData - The data for the absence application
 * @param {string} absenceApplicationData.FromDate - The new from date (YYYY-MM-DD)
 * @param {string} absenceApplicationData.ToDate - The new to date (YYYY-MM-DD)
 * @param {number|null} absenceApplicationData.Hours - The hours (only for same-day requests)
 */
export async function updateAbsenceRequest(
    absenceApplicationType,
    absenceRequestId,
    employmentNumber,
    absenceApplicationData
) {
    await requireAuth();
    try {
        switch (absenceApplicationType) {
            case HOLIDAY_TYPE_ID:
                return updateHolidayAbsenceApplication(
                    absenceRequestId,
                    employmentNumber,
                    absenceApplicationData
                );
            case SICK_LEAVE_TYPE_ID:
                return updateSickAbsenceApplication(
                    absenceRequestId,
                    employmentNumber,
                    absenceApplicationData
                );
            case PARENTAL_LEAVE_10_DAYS_TYPE_ID:
                return updateParentalLeave10DaysAbsenceApplication(
                    absenceRequestId,
                    employmentNumber,
                    absenceApplicationData
                );
            case PARENTAL_LEAVE_TYPE_ID:
                return updateParentalLeaveAbsenceApplication(
                    absenceRequestId,
                    employmentNumber,
                    absenceApplicationData
                );
            default:
                throw new Error('Invalid absence application type');
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Update a holiday absence application for a given employee number
 * @param {string} absenceRequestId - The ID of the absence request to update
 * @param {string} employmentNumber - The employee number
 * @param {Object} absenceApplicationData - The data for the absence application
 * @returns {Promise<Object>} The updated absence application
 */
async function updateHolidayAbsenceApplication(
    absenceRequestId,
    employmentNumber,
    absenceApplicationData
) {
    try {
        const payload = {
            fromDate: absenceApplicationData.FromDate,
            toDate: absenceApplicationData.ToDate,
            employmentNumber: employmentNumber,
            absenceTypeId: HOLIDAY_TYPE_ID,
            companyId: COMPANY_ID,
        };

        const flexApiClient = await getFlexApiService();
        return await flexApiClient.updateAbsenceApplication(absenceRequestId, payload);
    } catch (error) {
        throw error;
    }
}

async function updateSickAbsenceApplication(
    absenceRequestId,
    employmentNumber,
    absenceApplicationData
) {
    try {
        const payload = {
            fromDate: absenceApplicationData.FromDate,
            toDate: absenceApplicationData.ToDate,
            employmentNumber: employmentNumber,
            absenceTypeId: SICK_LEAVE_TYPE_ID,
            companyId: COMPANY_ID,
        };
        const flexApiClient = await getFlexApiService();
        return await flexApiClient.updateAbsenceApplication(absenceRequestId, payload);
    } catch (error) {
        throw error;
    }
}

async function updateParentalLeave10DaysAbsenceApplication(
    absenceRequestId,
    employmentNumber,
    absenceApplicationData
) {
    try {
        const payload = {
            fromDate: absenceApplicationData.FromDate,
            toDate: absenceApplicationData.ToDate,
            employmentNumber: employmentNumber,
            absenceTypeId: PARENTAL_LEAVE_10_DAYS_TYPE_ID,
            companyId: COMPANY_ID,
        };
        const flexApiClient = await getFlexApiService();
        return await flexApiClient.updateAbsenceApplication(absenceRequestId, payload);
    } catch (error) {
        throw error;
    }
}

async function updateParentalLeaveAbsenceApplication(
    absenceRequestId,
    employmentNumber,
    absenceApplicationData
) {
    try {
        const payload = {
            fromDate: absenceApplicationData.FromDate,
            toDate: absenceApplicationData.ToDate,
            employmentNumber: employmentNumber,
            absenceTypeId: PARENTAL_LEAVE_TYPE_ID,
            companyId: COMPANY_ID,
        };
        const flexApiClient = await getFlexApiService();
        return await flexApiClient.updateAbsenceApplication(absenceRequestId, payload);
    } catch (error) {
        throw error;
    }
}

/**
 * Delete an absence request
 * @param {string} absenceRequestId - The ID of the absence request to delete
 * @returns {Promise<Object>} The deleted absence request
 */
export async function deleteAbsenceRequest(absenceRequestId) {
    await requireAuth();
    try {
        const flexApiClient = await getFlexApiService();
        return await flexApiClient.deleteAbsenceApplication(absenceRequestId);
    } catch (error) {
        throw error;
    }
}

/**
 * Fetch timereports for a date range and return per-week external AND internal working hours.
 * External hours are rows on non-deploy projects; internal hours are rows on deploy projects.
 * Each week entry contains two parallel 7-element arrays (Mon=0 … Sun=6).
 *
 * Internal helper — not exported. Consumed by getFlexOccupancyHistory and
 * getFlexOccupancyStatsAnchored to build their full per-month breakdowns.
 *
 * @param {string} flexEmployeeId
 * @param {string|null} startDate - YYYY-MM-DD
 * @param {string|null} endDate - YYYY-MM-DD
 * @returns {Promise<Array<{weekStartDate: string, weekEndDate: string,
 *   externalHours: number[], internalHours: number[]}>>} sorted newest week first
 */
async function getTimereportsForOccupancyFull(flexEmployeeId, startDate = null, endDate = null) {
    const flexApiClient = await getFlexApiService();
    flexApiClient.config.cache = 'no-store';

    const timereports = await flexApiClient.getTimereports(flexEmployeeId, startDate, endDate);

    const weekMap = new Map();
    const deployRegex = /deploy/i;

    for (const timereport of timereports) {
        if (!timereport.TimeRows?.length) continue;

        const date = formatDateToISOString(timereport.Date);
        const mondayDate = formatDateToISOString(getWeekMonday(date));
        const dayIndex = getDayOfWeekIndex(date);

        if (!weekMap.has(mondayDate)) {
            weekMap.set(mondayDate, {
                weekStartDate: mondayDate,
                weekEndDate: formatDateToISOString(getWeekSunday(getWeekMonday(date))),
                externalHours: [0, 0, 0, 0, 0, 0, 0],
                internalHours: [0, 0, 0, 0, 0, 0, 0],
            });
        }

        const week = weekMap.get(mondayDate);

        for (const row of timereport.TimeRows) {
            if (row.TimeCode.Id !== WORKING_TYPE_ID) continue;

            const projectAccount = row.Accounts.find(
                (account) => account.AccountDistribution.Id === PROJECT_TYPE_ID
            );
            if (!projectAccount) continue;

            const minutes = row.TimeInMinutes;
            if (!minutes) continue;

            if (deployRegex.test(projectAccount.Name)) {
                week.internalHours[dayIndex] += minutes / 60;
            } else {
                week.externalHours[dayIndex] += minutes / 60;
            }
        }
    }

    return Array.from(weekMap.values()).sort((a, b) =>
        b.weekStartDate.localeCompare(a.weekStartDate)
    );
}

/**
 * Occupancy rate helpers derived from Flex timereports
 */

/**
 * Return monthly occupancy rates for the occupancy chart, covering a date range.
 * Calls getAssignmentTimereportsForOccupancy and builds the monthly shape expected
 * by OccupancyChartComponent: [{ month, date, rate }].
 * @param {string} flexEmployeeId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array<{month: string, date: string, rate: number}>>}
 */
export async function getFlexOccupancyRates(flexEmployeeId, startDate, endDate) {
    await requireAuth();
    const timereports = await getAssignmentTimereportsForOccupancy(
        flexEmployeeId,
        startDate,
        endDate
    );
    const today = endDate ? new Date(endDate + 'T00:00:00Z') : getUTCToday();
    const monthly = buildMonthlyOccupancyFromWeeks(timereports, today);

    return monthly.map(({ monthName, year, date, rate }) => ({
        month: `${monthName} ${year}`,
        date,
        rate,
    }));
}

/**
 * Return full occupancy history for the occupancy list, building the same shape as
 * getOccupancyHistory from Salesforce. Uses a single Flex API call to capture both
 * external (non-deploy) and internal (deploy) working hours per month.
 * @param {string} flexEmployeeId
 * @param {string} endDate - YYYY-MM-DD (inclusive upper bound, typically today)
 * @param {string} [startDate] - YYYY-MM-DD optional lower bound
 * @returns {Promise<Array>}
 */
export async function getFlexOccupancyHistory(flexEmployeeId, endDate, startDate = null) {
    await requireAuth();
    const timereports = await getTimereportsForOccupancyFull(flexEmployeeId, startDate, endDate);
    const today = endDate ? new Date(endDate + 'T00:00:00Z') : getUTCToday();
    const monthly = buildFullMonthlyOccupancy(timereports, today);

    return monthly.map(
        ({
            year,
            month,
            monthName,
            date,
            externalHours,
            internalHours,
            totalHours,
            totalMonthlyHours,
            rate,
        }) => ({
            id: date,
            month: monthName,
            year: String(year),
            period: `${monthName} ${year}`,
            date,
            rate,
            status: rate,
            externalHours,
            internalHours,
            totalHours,
            totalMonthlyHours,
        })
    );
}

/**
 * Compute the average occupancy rate for a custom date range from Flex timereports.
 * @param {string} flexEmployeeId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<{average: number|null, count: number, months: Array}>}
 */
export async function getFlexOccupancyAverageByDateRange(flexEmployeeId, startDate, endDate) {
    await requireAuth();
    const timereports = await getAssignmentTimereportsForOccupancy(
        flexEmployeeId,
        startDate,
        endDate
    );
    const today = endDate ? new Date(endDate + 'T00:00:00Z') : getUTCToday();
    const monthly = buildMonthlyOccupancyFromWeeks(timereports, today);

    const rates = monthly.map((m) => m.rate).filter((r) => r != null);
    if (rates.length === 0) return { average: null, count: 0, months: [] };

    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    return {
        average: Math.round(avg * 100) / 100,
        count: rates.length,
        months: monthly.map(({ monthName, year, rate }) => ({
            month: monthName,
            year: String(year),
            rate,
        })),
    };
}

/**
 * Compute occupancy stats (current, FYTD, last FY) anchored to a specific reference date.
 * Unlike getFlexOccupancyStats, the fiscal year boundaries are derived from referenceDate
 * rather than the real system clock, so passing a past date correctly returns stats for
 * the FY that contained that date.
 * @param {string} flexEmployeeId
 * @param {string} referenceDate - YYYY-MM-DD (the month whose rate is shown as "current")
 * @returns {Promise<Object>}
 */
export async function getFlexOccupancyStatsAnchored(flexEmployeeId, referenceDate) {
    await requireAuth();
    const refDateObj = referenceDate ? new Date(referenceDate + 'T00:00:00Z') : getUTCToday();
    const currentFY = getCurrentFiscalYear(refDateObj);
    const previousFY = getPreviousFiscalYear(refDateObj);

    const currentFYStart = formatDateToISOString(getFiscalYearStartDate(currentFY));
    const lastFYStart = formatDateToISOString(getFiscalYearStartDate(previousFY));
    const lastFYEnd = formatDateToISOString(getFiscalYearEndDate(previousFY));
    const refDateStr = formatDateToISOString(refDateObj);

    const [currentFYTimereports, lastFYTimereports] = await Promise.all([
        getAssignmentTimereportsForOccupancy(flexEmployeeId, currentFYStart, refDateStr),
        getAssignmentTimereportsForOccupancy(flexEmployeeId, lastFYStart, lastFYEnd),
    ]);

    const lastFYEndDate = new Date(lastFYEnd + 'T00:00:00Z');
    const currentFYMonthly = buildMonthlyOccupancyFromWeeks(currentFYTimereports, refDateObj);
    const lastFYMonthly = buildMonthlyOccupancyFromWeeks(lastFYTimereports, lastFYEndDate);

    const computeAverage = (monthly) => {
        const rates = monthly.map((m) => m.rate).filter((r) => r != null);
        if (rates.length === 0) return null;
        return Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100;
    };

    const currentRecord = currentFYMonthly[0];

    return {
        current: currentRecord?.rate ?? null,
        currentMonth: currentRecord ? `${currentRecord.monthName} ${currentRecord.year}` : null,
        currentFYTD: computeAverage(currentFYMonthly),
        lastFY: computeAverage(lastFYMonthly),
        currentFYYear: currentFY,
        previousFYYear: previousFY,
        currentFYMonthCount: currentFYMonthly.length,
        lastFYMonthCount: lastFYMonthly.length,
    };
}

/**
 * Utils methods
 */
/**
 * Converts decimal hours to "HH:MM" time format string.
 * Examples:
 *   0 -> "00:00"
 *   1 -> "01:00"
 *   1.5 -> "01:30"
 *   2.5 -> "02:30"
 *   10.5 -> "10:30"
 * @param {number} decimalHours - The decimal hours to convert
 * @returns {string} The time string in "HH:MM" format
 */
function hoursToTimeString(decimalHours) {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours % 1) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
