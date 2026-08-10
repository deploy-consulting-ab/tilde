import { tool } from 'ai';
import { z } from 'zod';
import {
    getEmployeesByNameOrEmployeeId,
    getAssignmentsByEmployeeNumber,
    getOpportunities,
    getOpportunitiesByName,
} from '@/actions/salesforce/salesforce-actions';
import {
    getHolidays,
    getTimereports,
    getFlexOccupancyHistory,
    getFlexOccupancyStatsAnchored,
    getFlexOccupancyAverageByDateRange,
} from '@/actions/flex/flex-actions';
import { getFinancialsAction } from '@/actions/database/financials-actions';
import { getFlexIdByEmployeeNumberAction } from '@/actions/database/user-actions';
import { toPermissionSet, getHolidayEmployeeInfo } from '@/lib/utils';
import {
    VIEW_MANAGEMENT_PERMISSION,
    VIEW_OPPORTUNITIES_PERMISSION,
    VIEW_OCCUPANCY_PERMISSION,
    VIEW_ASSIGNMENTS_PERMISSION,
    VIEW_TIMEREPORT_PERMISSION,
} from '@/lib/rba-constants';

/**
 * Creates the full set of agent tools scoped to the logged-in user.
 * Tools default to the session user's employeeNumber / flexEmployeeId when
 * the caller does not provide an explicit value.
 *
 * @param {{ name: string, employeeNumber: string|null, flexEmployeeId: string|null, carriedOverHolidays: number }} user
 * @returns {Record<string, import('ai').CoreTool>}
 */
export function createAgentTools(user) {
    const defaultEmployeeNumber = user?.employeeNumber ?? null;
    const defaultFlexEmployeeId = user?.flexEmployeeId ?? null;

    const permissionsSet = toPermissionSet(user?.systemPermissions);
    const hasManagementViewPermission = permissionsSet.has(VIEW_MANAGEMENT_PERMISSION);
    const hasOpportunitiesViewPermission = permissionsSet.has(VIEW_OPPORTUNITIES_PERMISSION);
    const hasOccupancyViewPermission = permissionsSet.has(VIEW_OCCUPANCY_PERMISSION);
    const hasAssignmentsViewPermission = permissionsSet.has(VIEW_ASSIGNMENTS_PERMISSION);
    const hasFlexTimereportsViewPermission = permissionsSet.has(VIEW_TIMEREPORT_PERMISSION);

    const canViewEmployee = (id) => hasManagementViewPermission || id === defaultFlexEmployeeId;
    const canViewEmployeeByNumber = (number) =>
        hasManagementViewPermission || number === defaultEmployeeNumber;

    return {
        // Public tools

        getFlexHolidays: tool({
            description:
                'Get holiday (absence) information from Flex for the logged-in employee: total holidays, used holidays, available holidays, and upcoming requests.',
            inputSchema: z.object({
                employeeNumber: z
                    .string()
                    .optional()
                    .describe('Employee number. Must match the logged-in user.'),
            }),
            execute: async ({ employeeNumber }) => {
                const number = employeeNumber ?? defaultEmployeeNumber;
                if (!number) {
                    return { error: 'No employee number available' };
                }
                if (number !== defaultEmployeeNumber) {
                    return {
                        error: 'Not authorized. You can only view your own holiday information.',
                    };
                }
                return getHolidays(getHolidayEmployeeInfo(user));
            },
        }),

        // Protected tools
        searchEmployees: tool({
            description: hasManagementViewPermission
                ? 'Search for employees by name or employee ID. Returns a list of matching employees with their IDs and employment status.'
                : 'Look up the logged-in employee by their own name or employee ID. Cannot be used to search for other employees.',
            inputSchema: z.object({
                query: z.string().describe('Name or employee ID to search for'),
            }),
            execute: async ({ query }) => {
                if (hasManagementViewPermission) {
                    return getEmployeesByNameOrEmployeeId(query);
                }

                const results = await getEmployeesByNameOrEmployeeId(query);
                if (!Array.isArray(results)) {
                    return results;
                }

                const filtered = results.filter(
                    (emp) =>
                        emp.employeeId === defaultEmployeeNumber ||
                        (user?.name && emp.name === user.name)
                );

                if (filtered.length === 0) {
                    return {
                        error: 'Not authorized. You can only search for your own employee record.',
                    };
                }

                return filtered;
            },
        }),

        ...(hasFlexTimereportsViewPermission && {
            getFlexTimereports: tool({
                description:
                    'Get time reports from Flex for a specific employee and week. Returns logged hours per day, project names, and absence entries.',
                inputSchema: z.object({
                    flexEmployeeId: z
                        .string()
                        .optional()
                        .describe('Flex employee ID to look up. Omit to use the logged-in user.'),
                    weekStartDate: z.string().describe('Monday of the week in YYYY-MM-DD format'),
                    weekEndDate: z.string().describe('Sunday of the week in YYYY-MM-DD format'),
                }),
                execute: async ({ flexEmployeeId, weekStartDate, weekEndDate }) => {
                    const id = flexEmployeeId ?? defaultFlexEmployeeId;
                    if (!id) {
                        return { error: 'No Flex employee ID available' };
                    }
                    if (!canViewEmployee(id)) {
                        return {
                            error: 'Not authorized. You can only view your own time reports.',
                        };
                    }
                    const result = await getTimereports(id, weekStartDate, weekEndDate);
                    return result.timereportResponse;
                },
            }),
        }),

        ...(hasAssignmentsViewPermission && {
            getAssignments: tool({
                description: 'Get all project assignments for a specific employee.',
                inputSchema: z.object({
                    employeeNumber: z
                        .string()
                        .optional()
                        .describe('Employee number to look up. Omit to use the logged-in user.'),
                }),
                execute: async ({ employeeNumber }) => {
                    const number = employeeNumber ?? defaultEmployeeNumber;
                    if (!number) {
                        return { error: 'No employee number available' };
                    }
                    if (!canViewEmployeeByNumber(number)) {
                        return { error: 'Not authorized. You can only view your own assignments.' };
                    }
                    return getAssignmentsByEmployeeNumber(number);
                },
            }),
        }),

        ...(hasOpportunitiesViewPermission && {
            searchOpportunities: tool({
                description:
                    'Search for sales opportunities by name. Omit name to retrieve all opportunities.',
                inputSchema: z.object({
                    name: z
                        .string()
                        .optional()
                        .describe(
                            'Opportunity name to search for. Leave empty to get all opportunities.'
                        ),
                }),
                execute: async ({ name }) => {
                    if (!name) {
                        return getOpportunities();
                    }
                    return getOpportunitiesByName(name);
                },
            }),
        }),

        ...(hasOccupancyViewPermission && {
            getOccupancyStats: tool({
                description:
                    'Get occupancy rate statistics for the logged-in employee anchored to a reference date: the rate for the month containing that date, fiscal-year-to-date average, and previous fiscal year average. ' +
                    'Pass the last day of the month the user is asking about as `today` (e.g. "2025-09-30" for September 2025). ' +
                    'For a specific month or custom date range use getOccupancyForDateRange instead.',
                inputSchema: z.object({
                    flexEmployeeId: z.string().optional().describe('Flex employee ID to look up.'),
                    today: z
                        .string()
                        .describe(
                            "Reference date in YYYY-MM-DD format. Use the last day of the target month (e.g. 2025-09-30 for September 2025, or today's date for current stats)."
                        ),
                }),
                execute: async ({ flexEmployeeId, today }) => {
                    const id = flexEmployeeId ?? defaultFlexEmployeeId;
                    if (!id) {
                        return { error: 'No Flex employee ID available' };
                    }
                    if (!canViewEmployee(id)) {
                        return {
                            error: 'Not authorized. You can only view your own occupancy stats.',
                        };
                    }
                    return getFlexOccupancyStatsAnchored(id, today);
                },
            }),
        }),

        ...(hasOccupancyViewPermission && {
            getOccupancyHistory: tool({
                description:
                    'Get the full monthly occupancy rate history for the logged-in employee up to `today`, including hours breakdown per month. ' +
                    'Pass the last day of the latest month the user wants to see (e.g. "2025-09-30" to show history through September 2025).',
                inputSchema: z.object({
                    flexEmployeeId: z.string().optional().describe('Flex employee ID to look up.'),
                    today: z
                        .string()
                        .describe(
                            'Upper bound date in YYYY-MM-DD format. History is returned up to and including this date.'
                        ),
                }),
                execute: async ({ flexEmployeeId, today }) => {
                    const id = flexEmployeeId ?? defaultFlexEmployeeId;
                    if (!id) {
                        return { error: 'No Flex employee ID available' };
                    }
                    if (!canViewEmployee(id)) {
                        return {
                            error: 'Not authorized. You can only view your own occupancy history.',
                        };
                    }
                    return getFlexOccupancyHistory(id, today);
                },
            }),
        }),

        ...(hasOccupancyViewPermission && {
            getOccupancyForDateRange: tool({
                description:
                    'Get the occupancy rate for the logged-in employee for a specific month or custom date range. ' +
                    'Use this whenever the user asks about a specific month (e.g. "September 2025") or any period that is not the current one. ' +
                    'Returns the average rate across the range, a per-month breakdown, and the hours detail.',
                inputSchema: z.object({
                    flexEmployeeId: z.string().optional().describe('Flex employee ID to look up.'),
                    startDate: z
                        .string()
                        .describe(
                            'First day of the range in YYYY-MM-DD format (e.g. 2025-09-01 for September 2025).'
                        ),
                    endDate: z
                        .string()
                        .describe(
                            'Last day of the range in YYYY-MM-DD format (e.g. 2025-09-30 for September 2025).'
                        ),
                }),
                execute: async ({ flexEmployeeId, startDate, endDate }) => {
                    const id = flexEmployeeId ?? defaultFlexEmployeeId;
                    if (!id) {
                        return { error: 'No Flex employee ID available' };
                    }
                    if (!canViewEmployee(id)) {
                        return {
                            error: 'Not authorized. You can only view your own occupancy data.',
                        };
                    }
                    return getFlexOccupancyAverageByDateRange(id, startDate, endDate);
                },
            }),
        }),

        ...(hasManagementViewPermission && {
            getFlexIdByEmployeeNumber: tool({
                description:
                    'Look up a user\'s Flex employee ID from their employee number (e.g. "D002"). ' +
                    'Use this before calling occupancy tools when you have an employee number but not a Flex ID.',
                inputSchema: z.object({
                    employeeNumber: z
                        .string()
                        .describe('The employee number to look up (e.g. "D002").'),
                }),
                execute: async ({ employeeNumber }) => {
                    const result = await getFlexIdByEmployeeNumberAction(employeeNumber);
                    if (!result) {
                        return { error: `No user found with employee number ${employeeNumber}` };
                    }
                    return result;
                },
            }),
        }),

        ...(hasManagementViewPermission && {
            getFinancials: tool({
                description:
                    'Get financial records from the internal database. Returns revenue, cost, profit, and taxes. Fiscal year runs Feb 1 – Jan 31. Quarter 0 = full year total. Always return the results in Swedish currency (SEK).',
                inputSchema: z.object({
                    fiscalYear: z
                        .number()
                        .optional()
                        .describe('Fiscal year (e.g. 2025). Omit to get all years.'),
                    quarter: z
                        .number()
                        .min(0)
                        .max(4)
                        .optional()
                        .describe(
                            'Quarter 1-4, or 0 for full year total. Omit to get all quarters.'
                        ),
                }),
                execute: async ({ fiscalYear, quarter }) => {
                    const where = {};
                    if (fiscalYear !== undefined) where.fiscalYear = fiscalYear;
                    if (quarter !== undefined) where.quarter = quarter;
                    return await getFinancialsAction(where);
                },
            }),
        }),
    };
}
