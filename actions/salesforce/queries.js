import {
    PROJECT_STATUS_MAP,
    PROJECT_TYPE_MAP,
    EMPLOYMENT_TYPE_MAP,
    OPPORTUNITY_STATUS_MAP,
} from '@/actions/salesforce/constants';

/* ─── Shared query utilities ────────────────────────────────────────────── */

/**
 * Always-included Assignment fields that are never gated by field permissions.
 * These are required for core app functionality (routing, status display, etc.)
 */
const ASSIGNMENT_BASE_FIELDS = [
    'Id',
    'Name',
    'StartDate__c',
    'EndDate__c',
    'ProjectStatus__c',
    'Project__r.Name',
    'Project__r.FlexID__c',
    'ProjectedHours__c',
    'ActualHours__c',
    'CurrencyIsoCode',
];

/**
 * Always-included Opportunity fields that are never gated by field permissions.
 */
const OPPORTUNITY_BASE_FIELDS = [
    'Id',
    'Name',
    'StageName',
    'CloseDate',
    'Account.Name',
    'CurrencyIsoCode',
];

/**
 * Build a SOQL SELECT clause from base fields + permitted optional fields.
 * @param {string[]} baseFields - Always-included fields
 * @param {Set<string>|null} permittedFields - Optional fields permitted for this user (null = base fields only)
 * @returns {string} Comma-separated SELECT field list
 */
const buildSelectClause = (baseFields, permittedFields) => {
    if (!permittedFields) return baseFields.join(', ');
    return [...baseFields, ...permittedFields].join(', ');
};

/* ─── Assignment queries ────────────────────────────────────────────────── */

const getAssignmentsByEmployeeNumberQuery = (employeeNumber) => {
    return `SELECT Id, Name, StartDate__c, EndDate__c, ProjectStatus__c, Project__r.Name FROM Assignment__c 
            WHERE Resource__r.EmployeeId__c = '${employeeNumber}' 
            AND ProjectStatus__c != '${PROJECT_STATUS_MAP.DRAFT}'
            AND ProjectStatus__c != '${PROJECT_STATUS_MAP.CANCELED}'
            AND ProjectType__c = '${PROJECT_TYPE_MAP.EXTERNAL}'
            ORDER BY StartDate__c DESC`;
};

const getAssignmentsByEmployeeNumberAndProjectNameQuery = (employeeNumber, projectName) => {
    return `SELECT Id, Name, StartDate__c, EndDate__c, ProjectStatus__c, Project__r.Name, Project__r.Account__r.Name FROM Assignment__c 
            WHERE Resource__r.EmployeeId__c = '${employeeNumber}' 
            AND Project__r.Name LIKE '%${projectName}%'
            AND ProjectStatus__c != '${PROJECT_STATUS_MAP.DRAFT}'
            AND ProjectStatus__c != '${PROJECT_STATUS_MAP.CANCELED}'
            AND ProjectType__c = '${PROJECT_TYPE_MAP.EXTERNAL}'
            ORDER BY StartDate__c DESC`;
};

const getAssignmentByIdQuery = (assignmentId) => {
    return `SELECT Id, Project__r.FlexID__c, Name, StartDate__c, EndDate__c, ProjectStatus__c, Project__r.Name, ProjectedHours__c, ActualHours__c 
            FROM Assignment__c 
            WHERE Id = '${assignmentId}' LIMIT 1`;
};

const getAssignmentByIdAndEmployeeNumberQuery = (assignmentId, employeeNumber) => {
    return `SELECT Id, Project__r.FlexID__c, Name, StartDate__c, EndDate__c, ProjectStatus__c, Project__r.Name, ProjectedHours__c, ActualHours__c 
            FROM Assignment__c 
            WHERE Id = '${assignmentId}' AND Resource__r.EmployeeId__c = '${employeeNumber}' LIMIT 1`;
};

const getAssignmentsMetricsQuery = (employeeNumber) => {
    return `SELECT Project__r.Status__c, StartDate__c, COUNT(Id) assignmentsMetrics
            FROM Assignment__c
            WHERE Resource__r.EmployeeId__c = '${employeeNumber}'
            AND ProjectType__c = '${PROJECT_TYPE_MAP.EXTERNAL}'
            AND ProjectStatus__c != '${PROJECT_STATUS_MAP.DRAFT}'
            AND ProjectStatus__c != '${PROJECT_STATUS_MAP.CANCELED}'
            GROUP BY Project__r.Status__c, StartDate__c
            ORDER BY StartDate__c DESC`;
};

const getCurrentAssignmentsByEmployeeNumberQuery = (employeeNumber, startDate, endDate) => {
    return `SELECT Id, StartDate__c, EndDate__c, ProjectType__c, Project__r.ProjectCode__c, Project__r.Name, Project__r.FlexID__c, Project__r.Account__r.Name, Role__r.FlexID__c 
            FROM Assignment__c 
            WHERE Resource__r.EmployeeId__c = '${employeeNumber}'
            AND Project__r.FlexID__c != NULL
            AND ProjectStatus__c != '${PROJECT_STATUS_MAP.DRAFT}'
            AND ProjectStatus__c != '${PROJECT_STATUS_MAP.CANCELED}'
            AND (
                (StartDate__c <= ${startDate} AND EndDate__c >= ${endDate})
                OR
                ProjectType__c = '${PROJECT_TYPE_MAP.INTERNAL}'
            )
            ORDER BY ProjectType__c, EndDate__c DESC`;
};

/* ─── Dynamic Assignment query builders (field-level permission aware) ──── */

/**
 * @param {string} employeeNumber
 * @param {Set<string>|null} permittedFields - null means base fields only
 */
const getAssignmentsByEmployeeNumberQueryDynamic = (employeeNumber, permittedFields) => {
    const select = buildSelectClause(ASSIGNMENT_BASE_FIELDS, permittedFields);
    return `SELECT ${select} FROM Assignment__c 
            WHERE Resource__r.EmployeeId__c = '${employeeNumber}' 
            AND ProjectStatus__c != '${PROJECT_STATUS_MAP.DRAFT}'
            AND ProjectStatus__c != '${PROJECT_STATUS_MAP.CANCELED}'
            AND ProjectType__c = '${PROJECT_TYPE_MAP.EXTERNAL}'
            ORDER BY StartDate__c DESC`;
};

const getAssignmentByIdAndEmployeeNumberQueryDynamic = (
    assignmentId,
    employeeNumber,
    permittedFields
) => {
    const select = buildSelectClause(ASSIGNMENT_BASE_FIELDS, permittedFields);
    return `SELECT ${select} FROM Assignment__c 
            WHERE Id = '${assignmentId}' AND Resource__r.EmployeeId__c = '${employeeNumber}' LIMIT 1`;
};

/**
 * Single aggregate query that starts from Timecard__c, filters by Timecard date range,
 * and reaches up to the parent Assignment via relationship fields.
 * Groups by Assignment so each assignment contributes its ProjectedAmount__c exactly once
 * (via MAX) and its portion of TimecardAmount__c (via SUM).
 */
const getEmployeeFYAmountsQuery = (employeeNumber, fyStart, fyEnd) => {
    return `SELECT Assignment__c,
                   SUM(TimecardAmount__c) actualPerAssignment,
                   MAX(Assignment__r.ProjectedAmount__c) projectedPerAssignment
            FROM Timecard__c
            WHERE Assignment__r.Resource__r.EmployeeId__c = '${employeeNumber}'
            AND Assignment__r.ProjectType__c = '${PROJECT_TYPE_MAP.EXTERNAL}'
            AND Assignment__r.ProjectStatus__c IN ('${PROJECT_STATUS_MAP.ONGOING}', '${PROJECT_STATUS_MAP.COMPLETED}', '${PROJECT_STATUS_MAP.NOT_STARTED}')
            AND Assignment__r.Resource__r.EmploymentType__c IN ('${EMPLOYMENT_TYPE_MAP.FULL_TIME}', '${EMPLOYMENT_TYPE_MAP.PART_TIME}')
            AND StartDate__c >= ${fyStart} AND StartDate__c <= ${fyEnd}
            AND EndDate__c >= ${fyStart} AND EndDate__c <= ${fyEnd}
            GROUP BY Assignment__c`;
};

/**
 * Aggregate FY timecard amounts for ALL employees, grouped per assignment.
 * Returns one row per assignment with employee identity, project name,
 * sum of timecard amounts, and the assignment's projected FY amount.
 */
const getAllEmployeesFYAmountsQuery = (fyStart, fyEnd) => {
    return `SELECT Assignment__c,
                   MAX(Assignment__r.Resource__r.EmployeeId__c) employeeId,
                   MAX(Assignment__r.Resource__r.Id) salesforceId,
                   MAX(Assignment__r.Resource__r.Name) employeeName,
                   MAX(Assignment__r.Name) assignmentName,
                   MAX(Assignment__r.Project__r.Name) projectName,
                   SUM(TimecardAmount__c) timecardAmount,
                   MAX(Assignment__r.ProjectedAmount__c) projectedAmountFY
            FROM Timecard__c
            WHERE Assignment__r.ProjectType__c = '${PROJECT_TYPE_MAP.EXTERNAL}'
            AND Assignment__r.ProjectStatus__c IN ('${PROJECT_STATUS_MAP.ONGOING}', '${PROJECT_STATUS_MAP.COMPLETED}', '${PROJECT_STATUS_MAP.NOT_STARTED}')
            AND Assignment__r.Resource__r.EmploymentType__c IN ('${EMPLOYMENT_TYPE_MAP.FULL_TIME}', '${EMPLOYMENT_TYPE_MAP.PART_TIME}')
            AND StartDate__c >= ${fyStart} AND StartDate__c <= ${fyEnd}
            AND EndDate__c >= ${fyStart} AND EndDate__c <= ${fyEnd}
            GROUP BY Assignment__c`;
};

/**
 * Fetch adjusted cost fields for all active Full-Time / Part-Time employees.
 */
const getEmployeesCostsQuery = () => {
    return `SELECT Id, EmployeeId__c, Name, AdjustedCostFY__c, AdjustedCostFYTD__c
            FROM Employee__c
            WHERE EmploymentType__c IN ('${EMPLOYMENT_TYPE_MAP.FULL_TIME}', '${EMPLOYMENT_TYPE_MAP.PART_TIME}')
            AND IsActive__c = true`;
};

/* ─── Opportunity queries ───────────────────────────────────────────────── */

const getOpportunitiesQuery = () => {
    return `SELECT Id, Name, StageName, CloseDate, Amount, Account.Name, CurrencyIsoCode, ProductType__c 
            FROM Opportunity 
            WHERE StageName != '${OPPORTUNITY_STATUS_MAP.CLOSED_LOST}'
            AND StageName != '${OPPORTUNITY_STATUS_MAP.CLOSED_DECLINED}'
            AND StageName != '${OPPORTUNITY_STATUS_MAP.CLOSED_WON}'
            ORDER BY CloseDate DESC`;
};

const getOpportunitiesByNameQuery = (name) => {
    return `SELECT Id, Name, StageName, CloseDate, Amount, Account.Name, CurrencyIsoCode, ProductType__c 
            FROM Opportunity WHERE Name LIKE '%${name}%' 
            AND StageName != '${OPPORTUNITY_STATUS_MAP.CLOSED_LOST}'
            AND StageName != '${OPPORTUNITY_STATUS_MAP.CLOSED_DECLINED}'
            AND StageName != '${OPPORTUNITY_STATUS_MAP.CLOSED_WON}'
            ORDER BY CloseDate DESC`;
};

const getOpportunityByIdQuery = (opportunityId) => {
    return `SELECT Id, Name, StageName, CloseDate, Amount, Account.Name, CurrencyIsoCode, ProductType__c 
            FROM Opportunity WHERE Id = '${opportunityId}'
            LIMIT 1`;
};

const getQuoteLinesQuery = (opportunityId) => {
    return `SELECT Id, ServiceDate, EndDate__c, Product2.Name
            FROM QuoteLineItem WHERE Quote.OpportunityId = '${opportunityId}' AND Quote.IsSyncing = true`;
};

/* ─── Dynamic Opportunity query builders (field-level permission aware) ─── */

/**
 * @param {Set<string>|null} permittedFields - null means base fields only
 */
const getOpportunitiesQueryDynamic = (permittedFields) => {
    const select = buildSelectClause(OPPORTUNITY_BASE_FIELDS, permittedFields);
    return `SELECT ${select} FROM Opportunity 
            WHERE StageName != '${OPPORTUNITY_STATUS_MAP.CLOSED_LOST}'
            AND StageName != '${OPPORTUNITY_STATUS_MAP.CLOSED_DECLINED}'
            AND StageName != '${OPPORTUNITY_STATUS_MAP.CLOSED_WON}'
            ORDER BY CloseDate DESC`;
};

const getOpportunityByIdQueryDynamic = (opportunityId, permittedFields) => {
    const select = buildSelectClause(OPPORTUNITY_BASE_FIELDS, permittedFields);
    return `SELECT ${select} FROM Opportunity WHERE Id = '${opportunityId}' LIMIT 1`;
};

/* ─── Holiday queries ───────────────────────────────────────────────────── */

const getSalesforcePublicHolidaysQuery = () => {
    return `SELECT Id, Name, ActivityDate FROM Holiday`;
};

/* ─── Employee queries ──────────────────────────────────────────────────── */

const getEmployeesWithActiveAssignmentsQuery = (employeeNumbers, date) => {
    return `SELECT Id, EmployeeId__c
            FROM Employee__c 
            WHERE Id IN (
                SELECT Resource__c 
                FROM Assignment__c 
                WHERE StartDate__c <= ${date} 
                AND Resource__r.EmployeeId__c IN (${employeeNumbers})
                AND (EndDate__c >= ${date} OR EndDate__c = NULL)
                AND ProjectType__c = '${PROJECT_TYPE_MAP.EXTERNAL}'
                AND ProjectStatus__c != '${PROJECT_STATUS_MAP.DRAFT}'
                AND ProjectStatus__c != '${PROJECT_STATUS_MAP.CANCELED}'
            )

            ORDER BY Name ASC`;
};

const getEmployeesQuery = () => {
    return `SELECT Id, Name, EmployeeId__c, IsActive__c, EmploymentType__c, EmploymentStartDate__c, EmploymentEndDate__c
            FROM Employee__c
            ORDER BY IsActive__c DESC, CreatedDate ASC, Name ASC`;
};

const getEmployeeByIdQuery = (employeeId) => {
    return `SELECT Id, Name, EmployeeId__c, IsActive__c, EmploymentType__c, EmploymentStartDate__c, EmploymentEndDate__c, FlexID__c, AdjustedCostFY__c, AdjustedCostFYTD__c
            FROM Employee__c WHERE Id = '${employeeId}' LIMIT 1`;
};

const getEmployeesByNameOrEmployeeIdQuery = (query) => {
    return `SELECT Id, Name, EmployeeId__c, IsActive__c, EmploymentType__c, EmploymentStartDate__c, EmploymentEndDate__c
            FROM Employee__c
            WHERE Name LIKE '%${query}%' OR EmployeeId__c LIKE '%${query}%'
            ORDER BY IsActive__c DESC, Name ASC`;
};

const getEmployeeByEmployeeNumberQuery = (employeeNumber) => {
    return `SELECT Id, EmploymentStartDate__c
            FROM Employee__c
            WHERE EmployeeId__c = '${employeeNumber}'
            LIMIT 1`;
};

export {
    getAssignmentsByEmployeeNumberQuery,
    getAssignmentByIdQuery,
    getAssignmentByIdAndEmployeeNumberQuery,
    getCurrentAssignmentsByEmployeeNumberQuery,
    getAssignmentsByEmployeeNumberAndProjectNameQuery,
    getAssignmentsMetricsQuery,
    getOpportunitiesQuery,
    getOpportunitiesByNameQuery,
    getOpportunityByIdQuery,
    getSalesforcePublicHolidaysQuery,
    getEmployeesWithActiveAssignmentsQuery,
    getEmployeesQuery,
    getEmployeeByIdQuery,
    getEmployeesByNameOrEmployeeIdQuery,
    getEmployeeByEmployeeNumberQuery,
    getQuoteLinesQuery,
    getAssignmentsByEmployeeNumberQueryDynamic,
    getAssignmentByIdAndEmployeeNumberQueryDynamic,
    getOpportunitiesQueryDynamic,
    getOpportunityByIdQueryDynamic,
    getEmployeeFYAmountsQuery,
    getAllEmployeesFYAmountsQuery,
    getEmployeesCostsQuery,
};
