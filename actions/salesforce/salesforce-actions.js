'use server';

import { requireAuth } from '@/lib/require-auth';

import { queryData, queryCachedData } from './salesforce-service';
import {
    getOpportunitiesByNameQuery,
    getAssignmentsByEmployeeNumberAndProjectNameQuery,
    getAssignmentsMetricsQuery,
    getCurrentAssignmentsByEmployeeNumberQuery,
    getSalesforcePublicHolidaysQuery,
    getEmployeesWithActiveAssignmentsQuery,
    getEmployeesQuery,
    getEmployeeByIdQuery,
    getEmployeesByNameOrEmployeeIdQuery,
    getQuoteLinesQuery,
    getAssignmentsByEmployeeNumberQueryDynamic,
    getAssignmentByIdAndEmployeeNumberQueryDynamic,
    getOpportunitiesQueryDynamic,
    getOpportunityByIdQueryDynamic,
    getEmployeeFYAmountsQuery,
    getAllEmployeesFYAmountsQuery,
    getEmployeesCostsQuery,
} from './queries';
import {
    getCurrentFiscalYear,
    getPreviousFiscalYear,
    getFiscalYearStartDate,
    getFiscalYearEndDate,
    formatDateToISOString,
    getPermittedFieldsFromSession,
} from '@/lib/utils';
import { PROJECT_TYPE_MAP } from './constants';
import { auth } from '@/auth';
import {
    SALESFORCE_SYSTEM,
    SF_OBJECT_ASSIGNMENT,
    SF_OBJECT_OPPORTUNITY,
} from '@/lib/rba-constants';

export async function getAssignmentsByEmployeeNumber(employeeNumber) {
    await requireAuth();
    try {
        const session = await auth();
        const permittedFields = getPermittedFieldsFromSession(
            session?.user?.fieldPermissions,
            SALESFORCE_SYSTEM,
            SF_OBJECT_ASSIGNMENT
        );
        const result = await queryData(
            getAssignmentsByEmployeeNumberQueryDynamic(employeeNumber, permittedFields)
        );
        return result.map((assignment) => ({
            id: assignment.Id,
            name: assignment.Name,
            startDate: assignment.StartDate__c,
            endDate: assignment.EndDate__c,
            projectStatus: assignment.ProjectStatus__c,
            projectName: assignment.Project__r?.Name,
            projectedHours: assignment.ProjectedHours__c,
            actualHours: assignment.ActualHours__c,
            currencyIsoCode: assignment.CurrencyIsoCode,
            ...(assignment.ActualAmount__c !== undefined && {
                actualAmount: assignment.ActualAmount__c,
            }),
            ...(assignment.ActualCost__c !== undefined && { actualCost: assignment.ActualCost__c }),
            ...(assignment.ActualProfitability__c !== undefined && {
                actualProfitability: assignment.ActualProfitability__c,
            }),
            ...(assignment.ActualProfitabilityPercentage__c !== undefined && {
                actualProfitabilityPercentage: assignment.ActualProfitabilityPercentage__c,
            }),
        }));
    } catch (error) {
        throw error;
    }
}

export async function getAssignmentsByEmployeeNumberAndProjectName(employeeNumber, projectName) {
    await requireAuth();
    try {
        const result = await queryData(
            getAssignmentsByEmployeeNumberAndProjectNameQuery(employeeNumber, projectName)
        );
        return result.map((assignment) => ({
            id: assignment.Id,
            name: assignment.Project__r.Name,
            subType: assignment.Project__r.Account__r.Name,
            type: 'Assignment',
        }));
    } catch (error) {
        throw error;
    }
}

export async function getAssignmentByIdAndEmployeeNumber(assignmentId, employeeNumber) {
    await requireAuth();
    try {
        const session = await auth();
        const permittedFields = getPermittedFieldsFromSession(
            session?.user?.fieldPermissions,
            SALESFORCE_SYSTEM,
            SF_OBJECT_ASSIGNMENT
        );
        const results = await queryData(
            getAssignmentByIdAndEmployeeNumberQueryDynamic(
                assignmentId,
                employeeNumber,
                permittedFields
            )
        );
        if (results?.length === 0) {
            return null;
        }

        const result = results[0];

        return {
            id: result.Id,
            name: result.Name,
            flexId: result.Project__r?.FlexID__c,
            startDate: result.StartDate__c,
            endDate: result.EndDate__c,
            projectStatus: result.ProjectStatus__c,
            projectName: result.Project__r?.Name,
            projectedHours: result.ProjectedHours__c,
            actualHours: result.ActualHours__c,
            currencyIsoCode: result.CurrencyIsoCode,
            ...(result.ActualAmount__c !== undefined && { actualAmount: result.ActualAmount__c }),
            ...(result.ActualCost__c !== undefined && { actualCost: result.ActualCost__c }),
            ...(result.ActualProfitability__c !== undefined && {
                actualProfitability: result.ActualProfitability__c,
            }),
            ...(result.ActualProfitabilityPercentage__c !== undefined && {
                actualProfitabilityPercentage: result.ActualProfitabilityPercentage__c,
            }),
        };
    } catch (error) {
        throw error;
    }
}

export async function getCurrentAssignmentsByEmployeeNumber(
    employeeNumber,
    weekStartDate,
    weekEndDate
) {
    await requireAuth();
    try {
        const result = await queryData(
            getCurrentAssignmentsByEmployeeNumberQuery(employeeNumber, weekStartDate, weekEndDate)
        );
        return result.map((assignment) => ({
            id: assignment.Id,
            name: assignment.Project__r.Name,
            client: assignment.Project__r.Account__r.Name,
            startDate: assignment.StartDate__c,
            endDate: assignment.EndDate__c,
            projectType: assignment.ProjectType__c,
            flexId: assignment.Project__r.FlexID__c,
            roleFlexId: assignment?.Role__r?.FlexID__c,
            projectStatus: assignment.ProjectStatus__c,
            projectCode: assignment.Project__r.ProjectCode__c,
            color: assignment.ProjectType__c === PROJECT_TYPE_MAP.INTERNAL ? '#6b7280' : '#3b82f6',
        }));
    } catch (error) {
        throw error;
    }
}

export async function getOpportunities() {
    await requireAuth();
    try {
        const session = await auth();
        const permittedFields = getPermittedFieldsFromSession(
            session?.user?.fieldPermissions,
            SALESFORCE_SYSTEM,
            SF_OBJECT_OPPORTUNITY
        );
        const result = await queryData(getOpportunitiesQueryDynamic(permittedFields));
        return result.map((opportunity) => ({
            id: opportunity.Id,
            name: opportunity.Name,
            stage: opportunity.StageName,
            closeDate: opportunity.CloseDate,
            accountName: opportunity.Account?.Name,
            currency: opportunity.CurrencyIsoCode,
            ...(opportunity.Amount !== undefined && { amount: opportunity.Amount }),
            ...(opportunity.ProductType__c !== undefined && {
                productType: opportunity.ProductType__c,
            }),
        }));
    } catch (error) {
        throw error;
    }
}

export async function getOpportunitiesByName(name) {
    await requireAuth();
    try {
        const result = await queryData(getOpportunitiesByNameQuery(name));
        return result.map((opportunity) => ({
            id: opportunity.Id,
            name: opportunity.Name,
            stage: opportunity.StageName,
            closeDate: opportunity.CloseDate,
            amount: opportunity.Amount,
            subType: opportunity.Account.Name,
            currency: opportunity.CurrencyIsoCode,
            productType: opportunity.ProductType__c,
            type: 'Opportunity',
        }));
    } catch (error) {
        throw error;
    }
}

export async function getOpportunityById(opportunityId) {
    await requireAuth();
    try {
        const session = await auth();
        const permittedFields = getPermittedFieldsFromSession(
            session?.user?.fieldPermissions,
            SALESFORCE_SYSTEM,
            SF_OBJECT_OPPORTUNITY
        );
        const results = await queryData(
            getOpportunityByIdQueryDynamic(opportunityId, permittedFields)
        );
        const result = results[0];
        return {
            id: result.Id,
            name: result.Name,
            stage: result.StageName,
            closeDate: result.CloseDate,
            accountName: result.Account?.Name,
            currency: result.CurrencyIsoCode,
            ...(result.Amount !== undefined && { amount: result.Amount }),
            ...(result.ProductType__c !== undefined && { productType: result.ProductType__c }),
        };
    } catch (error) {
        throw error;
    }
}

export async function getQuoteLines(opportunityId) {
    await requireAuth();
    try {
        const results = await queryData(getQuoteLinesQuery(opportunityId));
        return results.map((quoteLine) => ({
            id: quoteLine.Id,
            productName: quoteLine.Product2.Name,
            startDate: quoteLine.ServiceDate,
            endDate: quoteLine.EndDate__c,
        }));
    } catch (error) {
        throw error;
    }
}

export async function getAssignmentsMetrics(employeeNumber) {
    await requireAuth();
    try {
        const result = await queryData(getAssignmentsMetricsQuery(employeeNumber));

        const map = new Map();
        map.set('All', 0);
        map.set('Ongoing', 0);
        map.set('Completed', 0);
        map.set('Not Started', 0);

        const assignmentsMetrics = [];

        for (const assignment of result) {
            if (map.has(assignment.Status__c)) {
                map.set(
                    assignment.Status__c,
                    map.get(assignment.Status__c) + assignment.assignmentsMetrics
                );
                map.set('All', map.get('All') + assignment.assignmentsMetrics);
            }
        }

        for (const [status, count] of map.entries()) {
            assignmentsMetrics.push({
                status: status,
                count: count,
            });
        }

        return assignmentsMetrics;
    } catch (error) {
        throw error;
    }
}

export async function getSalesforcePublicHolidays() {
    await requireAuth();
    try {
        const result = await queryCachedData(getSalesforcePublicHolidaysQuery(), {
            tags: ['holidays'],
            cacheKey: 'holidays-list',
            revalidate: 86400, // 24 hours
        });
        const holidaysSet = new Set();
        for (const holiday of result) {
            holidaysSet.add(holiday.ActivityDate);
        }
        return holidaysSet;
    } catch (error) {
        throw error;
    }
}

export async function getEmployees() {
    await requireAuth();
    try {
        const result = await queryData(getEmployeesQuery());
        return result.map((employee) => ({
            id: employee.Id,
            name: employee.Name,
            employeeId: employee.EmployeeId__c,
            isActive: employee.IsActive__c,
            employmentType: employee.EmploymentType__c,
            employmentStartDate: employee.EmploymentStartDate__c,
            employmentEndDate: employee.EmploymentEndDate__c,
        }));
    } catch (error) {
        throw error;
    }
}

/**
 * Return employee numbers that have an active external assignment on the given date.
 *
 * Does not call requireAuth(): this is invoked by the slack-timereport-reminder
 * cron (/api/cron/slack-timereport-reminder), which has no user session. That
 * route authenticates with CRON_SECRET instead.
 *
 * @param {string[]} employeeNumbers
 * @param {string} date  ISO date string, e.g. "2026-07-26"
 * @returns {Promise<Set<string>>} Set of EmployeeId__c values
 */
export async function getEmployeesWithActiveAssignments(employeeNumbers, date) {
    try {
        if (!employeeNumbers?.length) {
            return new Set();
        }

        const employeeNumbersString = employeeNumbers.map((num) => `'${num}'`).join(', ');
        const result = await queryData(
            getEmployeesWithActiveAssignmentsQuery(employeeNumbersString, date)
        );
        return new Set(result.map((employee) => employee.EmployeeId__c));
    } catch (error) {
        console.log('error getting employees with active assignments', error);
        throw error;
    }
}

export async function getEmployeesByNameOrEmployeeId(query) {
    await requireAuth();
    try {
        const result = await queryData(getEmployeesByNameOrEmployeeIdQuery(query));
        return result.map((employee) => ({
            id: employee.Id,
            name: employee.Name,
            employeeId: employee.EmployeeId__c,
            subType: employee.EmployeeId__c,
            type: 'Employee',
        }));
    } catch (error) {
        throw error;
    }
}

/**
 * Fetch Projected Amount FY (sum of ProjectedAmount__c) and Actual Amount
 * (sum of TimecardAmount__c) for an employee's FY assignments.
 * @param {string} employeeNumber - The employee's EmployeeId__c
 * @param {string} fyStart - Fiscal year start date (YYYY-MM-DD)
 * @param {string} fyEnd - Fiscal year end date (YYYY-MM-DD)
 */
export async function getEmployeeFYAmounts(employeeNumber, fyStart, fyEnd) {
    await requireAuth();
    try {
        const rows = await queryData(getEmployeeFYAmountsQuery(employeeNumber, fyStart, fyEnd));

        const projectedAmountFY = rows.reduce(
            (sum, row) => sum + (row.projectedPerAssignment ?? 0),
            0
        );
        const actualAmount = rows.reduce((sum, row) => sum + (row.actualPerAssignment ?? 0), 0);

        return { projectedAmountFY, actualAmount };
    } catch (error) {
        throw error;
    }
}

/**
 * Fetch profitability data for all active Full-Time / Part-Time employees.
 * Returns an array of employee objects, each with their assignment-level FY
 * financial data merged with their employee-level adjusted cost fields.
 *
 * Shape:
 * [{
 *   employeeId: string,
 *   employeeName: string,
 *   adjustedCostFY: number,
 *   adjustedCostFYTD: number,
 *   assignments: [{ assignmentName, projectName, projectedAmountFY, timecardAmount }]
 * }]
 */
export async function getEmployeeProfitabilityData() {
    await requireAuth();
    const currentFY = getCurrentFiscalYear();
    const fyStart = formatDateToISOString(getFiscalYearStartDate(currentFY));
    const fyEnd = formatDateToISOString(getFiscalYearEndDate(currentFY));

    const [assignmentRows, employeeRows] = await Promise.all([
        queryData(getAllEmployeesFYAmountsQuery(fyStart, fyEnd)),
        queryData(getEmployeesCostsQuery()),
    ]);

    const employeeCostMap = new Map();
    for (const emp of employeeRows) {
        employeeCostMap.set(emp.EmployeeId__c, {
            id: emp.Id,
            name: emp.Name,
            adjustedCostFY: emp.AdjustedCostFY__c ?? 0,
            adjustedCostFYTD: emp.AdjustedCostFYTD__c ?? 0,
        });
    }

    const employeeMap = new Map();
    for (const row of assignmentRows) {
        const empId = row.employeeId;
        if (!empId) continue;

        const costs = employeeCostMap.get(empId) ?? {
            id: row.salesforceId,
            name: row.employeeName,
            adjustedCostFY: 0,
            adjustedCostFYTD: 0,
        };

        if (!employeeMap.has(empId)) {
            employeeMap.set(empId, {
                employeeId: empId,
                id: costs.id || row.salesforceId,
                employeeName: costs.name || row.employeeName || empId,
                adjustedCostFY: costs.adjustedCostFY,
                adjustedCostFYTD: costs.adjustedCostFYTD,
                assignments: [],
            });
        }

        employeeMap.get(empId).assignments.push({
            assignmentName: row.assignmentName || '-',
            projectName: row.projectName || row.assignmentName || '-',
            projectedAmountFY: row.projectedAmountFY ?? 0,
            timecardAmount: row.timecardAmount ?? 0,
        });
    }

    const employees = [...employeeMap.values()].toSorted((a, b) =>
        a.employeeName.localeCompare(b.employeeName)
    );

    for (const employee of employees) {
        employee.assignments.sort((a, b) =>
            (a.assignmentName || '').localeCompare(b.assignmentName || '')
        );
    }

    return employees;
}

export async function getEmployeeById(employeeId) {
    await requireAuth();
    try {
        const result = await queryData(getEmployeeByIdQuery(employeeId));
        if (result?.length === 0) {
            return null;
        }
        const employee = result[0];
        return {
            id: employee.Id,
            name: employee.Name,
            employeeId: employee.EmployeeId__c,
            isActive: employee.IsActive__c,
            employmentType: employee.EmploymentType__c,
            employmentStartDate: employee.EmploymentStartDate__c,
            employmentEndDate: employee.EmploymentEndDate__c,
            flexId: employee.FlexID__c,
            adjustedCostFY: employee.AdjustedCostFY__c ?? null,
            adjustedCostFYTD: employee.AdjustedCostFYTD__c ?? null,
        };
    } catch (error) {
        throw error;
    }
}
