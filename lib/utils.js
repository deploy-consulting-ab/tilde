import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
    MONTHS,
    SWEDISH_BANK_HOLIDAYS,
    ABSENCE_STATUS_TYPE_TEXT,
    ABSENCE_STATUS_REGISTERED,
    ABSENCE_STATUS_APPLIED_FOR,
    ABSENCE_STATUS_APPROVED,
    ABSENCE_STATUS_REJECTED,
} from '@/actions/flex/constants';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Helper function to format a date to ISO string date part only.
 * This ensures consistent string representation of dates for Set comparison.
 * Uses UTC methods to avoid timezone issues.
 *
 * @param {Date} date - Date object to format
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
const formatDateKey = (date) => {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Returns the 0-based day-of-week index where 0=Monday ... 6=Sunday.
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {number}
 */
export const getDayOfWeekIndex = (dateStr) => {
    const day = new Date(dateStr + 'T00:00:00Z').getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    return day === 0 ? 6 : day - 1;
};

/**
 * Checks if a given date is a Swedish bank holiday.
 * This function provides O(1) lookup time using a pre-calculated Set of holiday dates.
 * The current implementation covers holidays from 2024 to 2030.
 *
 * @param {Date} date - The date to check
 * @returns {boolean} True if the date is a Swedish bank holiday
 * @example
 * // Check if Christmas 2024 is a holiday
 * isSwedishBankHoliday(new Date('2024-12-25')) // Returns true
 *
 * // Check if a regular weekday is a holiday
 * isSwedishBankHoliday(new Date('2024-03-12')) // Returns false
 */
export const isSwedishBankHoliday = (date) => {
    const dateKey = formatDateKey(date);
    return SWEDISH_BANK_HOLIDAYS.has(dateKey);
};

/**
 * Parse a date string (YYYY-MM-DD or ISO) to a Date object in local timezone.
 * Avoids UTC interpretation of bare date strings, keeping results consistent with date pickers.
 * @param {string} dateStr - Date string to parse
 * @returns {Date|null}
 */
export const parseToLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
    return new Date(dateStr);
};

/**
 * YYYY-MM-DD using the machine-local calendar (for date pickers and ISO strings parsed as local dates).
 * @param {Date} date
 * @returns {string}
 */
export const formatLocalDateKey = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Get the Monday of the week containing the given date (local calendar).
 * Use with date-picker values; pair with formatLocalDateKey for comparisons.
 * @param {Date} date
 * @returns {Date}
 */
const getLocalWeekMonday = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
};

/**
 * First and last calendar day of a month in local timezone.
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {{ startDate: Date, endDate: Date }}
 */
export const getLocalMonthBounds = (year, month) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return { startDate, endDate };
};

/**
 * Whether a YYYY-MM-DD key falls within optional inclusive bounds (also YYYY-MM-DD).
 * @param {string} dateKey
 * @param {string|null} startBound
 * @param {string|null} endBound
 * @returns {boolean}
 */
export const isLocalDateKeyInRange = (dateKey, startBound, endBound) => {
    if (startBound && dateKey < startBound) return false;
    if (endBound && dateKey > endBound) return false;
    return true;
};

/**
 * Whether a Monday-based week overlaps an inclusive local date range.
 * @param {string} weekStartDate - YYYY-MM-DD (Monday)
 * @param {string|null} startBound
 * @param {string|null} endBound
 * @returns {boolean}
 */
export const weekOverlapsLocalDateRange = (weekStartDate, startBound, endBound) => {
    if (!startBound && !endBound) return true;

    const weekStart = parseToLocalDate(weekStartDate);
    const weekEndKey = formatLocalDateKey(
        new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
    );

    if (startBound && weekEndKey < startBound) return false;
    if (endBound && weekStartDate > endBound) return false;
    return true;
};

/**
 * Inclusive count of weekdays that are not Swedish bank holidays.
 * Uses local calendar boundaries so results match date pickers and typical `new Date(y, m-1, d)` parsing.
 *
 * @param {Date|null|undefined} startDate
 * @param {Date|null|undefined} endDate
 * @returns {number}
 */
export const countSwedishBusinessDaysLocalInclusive = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;

    const startNoon = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        12,
        0,
        0
    );
    const endNoon = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        12,
        0,
        0
    );

    const rangeStart = startNoon <= endNoon ? startNoon : endNoon;
    const rangeEnd = startNoon <= endNoon ? endNoon : startNoon;

    let count = 0;
    const cursor = new Date(rangeStart);

    while (cursor <= rangeEnd) {
        const day = cursor.getDay();
        const isWeekendDay = day === 0 || day === 6;
        const ymd = formatLocalDateKey(cursor);

        if (!isWeekendDay && !SWEDISH_BANK_HOLIDAYS.has(ymd)) {
            count++;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return count;
};

/**
 * Checks if a date is in a holidays Set
 * @param {Date} date - The date to check
 * @param {Set} holidays - Set of holiday date strings (YYYY-MM-DD format)
 * @returns {boolean} True if the date is a holiday
 */
export const isHolidayDate = (date, holidays) => {
    if (!holidays || holidays.size === 0) return false;
    return holidays.has(formatDateToISOString(date));
};

export const formatDateToSwedish = (dateInput) => {
    // Handle both Date objects and date strings
    let dateString = '';
    if (dateInput instanceof Date) {
        dateString = formatDateToISOString(dateInput);
    } else {
        dateString = dateInput;
    }

    // Parse YYYY-MM-DD format and return in Swedish format (YYYY-MM-DD)
    const [year, month, day] = dateString.split('-').map(Number);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const formatDateToEnUSWithOptions = (dateInput) => {
    let dateString = '';
    if (dateInput instanceof Date) {
        dateString = formatDateToISOString(dateInput);
    } else {
        dateString = dateInput;
    }

    // Parse YYYY-MM-DD format and return in English format (Month Day, Year)
    const [year, month, day] = dateString.split('-').map(Number);
    return `${MONTHS[month - 1]} ${String(day).padStart(2, '0')}, ${year}`;
};

/**
 * Get today's date as a UTC Date object (midnight UTC).
 * Use this on the server to avoid timezone issues with Vercel (UTC) vs local development.
 * @returns {Date} Today's date at midnight UTC
 */
export const getUTCToday = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

/**
 * Format a date to ISO string date part only (YYYY-MM-DD).
 * Uses UTC methods to ensure consistent results regardless of server timezone.
 *
 * IMPORTANT: If a date string without timezone is passed (e.g., '2025-12-23T00:00:00'),
 * we extract the date part directly to avoid local timezone interpretation issues.
 *
 * @param {Date|string} date - Date object or date string to format
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export const formatDateToISOString = (date) => {
    // If it's a string, try to extract date part directly to avoid timezone issues
    if (typeof date === 'string') {
        // Match YYYY-MM-DD at the start of the string (handles both '2025-12-23' and '2025-12-23T00:00:00')
        const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
            return match[1];
        }
    }

    // For Date objects, use UTC methods
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Check if a date falls on a weekend (Saturday or Sunday).
 * Uses UTC methods for server-side consistency.
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if weekend
 */
export const isWeekend = (date) => {
    const d = new Date(date);
    const day = d.getUTCDay();
    return day === 0 || day === 6;
};

/**
 * Get the Monday of the week containing the given date.
 * Uses UTC methods to ensure consistent results regardless of server timezone.
 * @param {Date|string} date - The date to get the Monday for
 * @returns {Date} The Monday of the week (at midnight UTC)
 */
export const getWeekMonday = (date) => {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

/**
 * Get the Sunday of the week containing the given date.
 * Uses UTC methods to ensure consistent results regardless of server timezone.
 * @param {Date|string} date - The date to get the Sunday for
 * @returns {Date} The Sunday of the week (at midnight UTC)
 */
export const getWeekSunday = (date) => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + 6);
    d.setUTCHours(23, 59, 59, 999);
    return d;
};

/**
 * Format date to short display format (e.g., "24 Dec").
 * Uses UTC methods for consistency.
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateDayMonth = (date) => {
    const d = new Date(date);
    const day = d.getUTCDate();
    const month = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
    return `${day} ${month}`;
};

/**
 * Get ISO week number of the year
 * @param {Date} date - The date to get the week number for
 * @returns {number} The week number
 */
export const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

/**
 * Calculates total holidays and current fiscal year holidays from absence data
 * Uses UTC methods for consistent date handling across timezones.
 * @param {Array} holidayEntries - Array of holiday entries
 * @returns {Object} Object containing total days and fiscal year days
 */
export const calculateHolidays = (holidayEntries) => {
    const now = getUTCToday();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();

    // Fiscal year runs from April 1st to March 31st
    // If current month is Jan-Mar (0-2), we're in the fiscal year that started last year
    // If current month is Apr-Dec (3-11), we're in the fiscal year that started this year
    const fiscalYearStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;

    const HOLIDAY_FISCAL_YEAR_START = new Date(Date.UTC(fiscalYearStartYear, 3, 1)); // April 1st UTC
    const HOLIDAY_FISCAL_YEAR_END = new Date(Date.UTC(fiscalYearStartYear + 1, 2, 31)); // March 31st next year UTC

    /**
     * Subfunction to check if date is in current fiscal year
     */
    const isCurrentHolidaysFiscalYear = (date) => {
        return date >= HOLIDAY_FISCAL_YEAR_START && date <= HOLIDAY_FISCAL_YEAR_END;
    };

    // Calculate days for each period
    let currentFiscalUsedHolidays = 0;

    const holidayPeriods = holidayEntries.map((entry) => {
        // Parse dates as UTC to avoid timezone-related shifts
        // The API returns dates like '2025-10-20T00:00:00' (no timezone indicator)
        // Append 'Z' to treat as UTC instead of local time
        const fromDate = new Date(entry.FromDate + 'Z');
        const toDate = new Date(entry.ToDate + 'Z');

        let currentFiscalPeriodUsedHolidays = 0;
        let currentDate = new Date(fromDate);

        while (currentDate <= toDate) {
            // Check date is in current fiscal year, is not a weekend and not a bank holiday
            if (!isWeekend(currentDate) && !isSwedishBankHoliday(currentDate)) {
                currentFiscalPeriodUsedHolidays++;

                if (isCurrentHolidaysFiscalYear(currentDate)) {
                    currentFiscalUsedHolidays++;
                }
            }
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        return {
            id: entry.Id,
            fromDate,
            toDate,
            days: currentFiscalPeriodUsedHolidays,
            message: entry.Message,
        };
    });

    return {
        currentFiscalUsedHolidays: currentFiscalUsedHolidays,
        holidayPeriods: holidayPeriods.map((period) => ({
            id: period.id,
            fromDate: period.fromDate,
            toDate: period.toDate,
            days: period.days,
            message: period.message,
            isCurrentHolidaysFiscalYear:
                period.fromDate >= HOLIDAY_FISCAL_YEAR_START &&
                period.toDate <= HOLIDAY_FISCAL_YEAR_END,
        })),
    };
};

/**
 * Calculate the next reset date for the holiday allowance.
 * Uses UTC methods for consistent date handling.
 * @param {Date} today - The current date
 * @returns {Date} The next reset date (at midnight UTC)
 */
export const calculateNextResetDate = (today) => {
    const d = new Date(today);
    const currentYear = d.getUTCFullYear();
    const nextApril = new Date(Date.UTC(currentYear, 3, 1)); // Month is 0-based, so 3 = April

    if (d >= nextApril) {
        // If we're past April 1st this year, set to next year's April 1st
        return new Date(Date.UTC(currentYear + 1, 3, 1));
    } else {
        return nextApril;
    }
};

/**
 * Generate a list of dates between two dates.
 * Uses UTC methods for consistent date handling.
 * @param {Date} startDate - The start date
 * @param {Date} endDate - The end date
 * @returns {Array} An array of dates (at noon UTC to avoid edge cases)
 */
export const generateDateRange = (startDate, endDate) => {
    const dates = [];
    const date = new Date(startDate);
    date.setUTCHours(12, 0, 0, 0); // Set to noon UTC to avoid edge cases
    const end = new Date(endDate);
    end.setUTCHours(12, 0, 0, 0);

    while (date <= end) {
        if (!isWeekend(date)) {
            dates.push(new Date(date));
        }
        date.setUTCDate(date.getUTCDate() + 1);
    }
    return dates;
};

/**
 * Get the fiscal year for a given date.
 * Uses UTC methods for consistent date handling.
 * @param {Date|string} date - The date to get the fiscal year for
 * @returns {number} The fiscal year
 */
export const getFiscalYear = (date) => {
    const d = new Date(date);
    const month = d.getUTCMonth();
    const year = d.getUTCFullYear();
    // If the month is January (0), it belongs to the previous fiscal year
    return month === 0 ? year - 1 : year;
};

/**
 * Get the start date of a fiscal year.
 * @param {number} fiscalYear - The fiscal year
 * @returns {Date} The start date of the fiscal year (February 1st at midnight UTC)
 */
export const getFiscalYearStart = (fiscalYear) => {
    return new Date(Date.UTC(fiscalYear, 1, 1)); // February 1st UTC
};

/**
 * Get the end date of a fiscal year.
 * @param {number} fiscalYear - The fiscal year
 * @returns {Date} The end date of the fiscal year (January 31st of next year at midnight UTC)
 */
export const getFiscalYearEnd = (fiscalYear) => {
    return new Date(Date.UTC(fiscalYear + 1, 0, 31)); // January 31st of next year UTC
};

/**
 * Check if a date falls within a specific fiscal year.
 * @param {Date|string} date - The date to check
 * @param {number} fiscalYear - The fiscal year to check against
 * @returns {boolean} Whether the date falls within the fiscal year
 */
export const isInFiscalYear = (date, fiscalYear) => {
    const d = new Date(date);
    const start = getFiscalYearStart(fiscalYear);
    const end = getFiscalYearEnd(fiscalYear);
    return d >= start && d <= end;
};

/**
 * Returns date/time components for a given moment in the Europe/Stockholm timezone.
 * Handles DST automatically: Sweden is UTC+1 (CET) in winter and UTC+2 (CEST) in summer.
 *
 * @param {Date} [date=new Date()] - The moment to convert
 * @returns {{ weekday: string, hour: number, minute: number }}
 *   weekday is the English short day name, e.g. 'Mon', 'Fri'
 */
export const getSwedishDateTime = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Stockholm',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const get = (type) => parts.find((p) => p.type === type)?.value;

    return {
        weekday: get('weekday'),
        hour: parseInt(get('hour'), 10),
        minute: parseInt(get('minute'), 10),
    };
};

/**
 * Returns the UTC Date at which the grace period for editing the previous week expires.
 * The grace period ends on the current week's Monday at 22:00 Stockholm time (Europe/Stockholm).
 * Handles DST automatically: Sweden is UTC+1 (CET) in winter and UTC+2 (CEST) in summer.
 *
 * @param {Date} currentWeekMonday - The Monday of the current week (at midnight UTC)
 * @returns {Date} The grace period deadline as a UTC Date
 */
export const getPreviousWeekGraceDeadline = (currentWeekMonday) => {
    const dateStr = formatDateToISOString(currentWeekMonday);
    // Probe the Stockholm offset by checking what hour noon UTC becomes in Stockholm
    const noonUTC = new Date(`${dateStr}T12:00:00Z`);
    const offsetHours = getSwedishDateTime(noonUTC).hour - 12; // 1 in winter (CET), 2 in summer (CEST)
    return new Date(`${dateStr}T${String(23 - offsetHours).padStart(2, '0')}:59:00Z`);
};

export const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /Mobile|Android|iPhone/i.test(window.navigator.userAgent);
};

export const getAssignmentStageColor = (stage) => {
    switch (stage?.toLowerCase()) {
        case 'ongoing':
            return 'bg-deploy-blue';
        case 'completed':
            return 'bg-deploy-teal';
        case 'not started':
            return 'bg-gray-500';
        default:
            return 'bg-gray-500';
    }
};

export const getOpportunityStageColor = (stage) => {
    switch (stage?.toLowerCase()) {
        case 'qualification':
            return 'bg-deploy-ocean';
        case 'discovery':
            return 'bg-deploy-ocean';
        case 'engagement scoping':
            return 'bg-deploy-purple';
        case 'engagement proposal':
            return 'bg-deploy-purple';
        case 'negotiation':
            return 'bg-deploy-blue';
        default:
            return 'bg-gray-500';
    }
};

/**
 * Get the current fiscal year based on a date.
 * Fiscal year runs from February 1st to January 31st.
 * Uses UTC methods for consistent date handling.
 * @param {Date} [date] - The date to get the fiscal year for (defaults to UTC today)
 * @returns {number} The fiscal year
 */
export const getCurrentFiscalYear = (date) => {
    const d = date ? new Date(date) : getUTCToday();
    const month = d.getUTCMonth(); // 0-based: January = 0, February = 1, etc.
    const year = d.getUTCFullYear();

    // If we're in January (0), we're in the previous fiscal year
    if (month === 0) {
        return year - 1;
    }

    return year;
};

/**
 * Get the previous fiscal year based on a date.
 * Uses UTC methods for consistent date handling.
 * @param {Date} [date] - The date to get the previous fiscal year for (defaults to UTC today)
 * @returns {number} The previous fiscal year
 */
export const getPreviousFiscalYear = (date) => {
    return getCurrentFiscalYear(date) - 1;
};

/**
 * Get the start date of a specific fiscal year.
 * @param {number} fiscalYear - The fiscal year
 * @returns {Date} The start date (February 1st of the fiscal year at midnight UTC)
 */
export const getFiscalYearStartDate = (fiscalYear) => {
    return new Date(Date.UTC(fiscalYear, 1, 1)); // February 1st UTC
};

/**
 * Get the end date of a specific fiscal year.
 * @param {number} fiscalYear - The fiscal year
 * @returns {Date} The end date (January 31st of the next year at midnight UTC)
 */
export const getFiscalYearEndDate = (fiscalYear) => {
    return new Date(Date.UTC(fiscalYear + 1, 0, 31)); // January 31st of next year UTC
};

/**
 * Get the last day of the month for a given date string.
 * @param {string} dateStr - YYYY-MM-DD (any day in the target month)
 * @returns {string} YYYY-MM-DD of the last day of that month
 */
export const getLastDayOfMonth = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    return formatDateToISOString(lastDay);
};

/**
 * Transform raw holidays data from API to match HolidaysCard expected format.
 * @param {Object} rawData - Raw holidays data from getAllAbsenceWithHolidays
 * @returns {Object|null} Transformed holidays data for HolidaysCard component
 */
export const transformHolidaysData = (rawData) => {
    if (!rawData) return null;

    return {
        availableDays: rawData.availableHolidays ?? 0,
        totalDays: rawData.totalHolidays ?? 0,
        usedDays: rawData.currentFiscalUsedHolidays ?? 0,
        carriedOverHolidays: rawData.carriedOverHolidays ?? 0,
        nextResetDate: rawData.nextResetDate ?? null,
        upcomingHolidays:
            rawData.recentHolidayPeriods?.map((period) => ({
                id: period.id,
                date: period.fromDate,
                endDate: period.toDate,
                days: period.days,
                name: `${period.days} day${period.days > 1 ? 's' : ''} off`,
            })) ?? [],
    };
};

/**
 * Converts a systemPermissions array (as stored in the JWT/session) into a Set
 * for O(1) permission lookups. Always returns a Set, even if the input is null/undefined.
 *
 * Use this whenever you need to call `.has()` on permissions instead of manually
 * doing `new Set(user?.systemPermissions)` at the call site.
 *
 * @param {string[]|null|undefined} systemPermissions - Array of permission strings
 * @returns {Set<string>}
 */
export const toPermissionSet = (systemPermissions) => {
    return new Set(systemPermissions ?? []);
};

export const populateSystemPermissions = (entitySystemPermissions, totalSystemPermissions) => {
    const systemPermissions = [];

    const entitySystemPermissionsSet = new Set(
        entitySystemPermissions.map((systemPermission) => systemPermission.id)
    );

    for (const systemPermission of totalSystemPermissions) {
        if (entitySystemPermissionsSet.has(systemPermission.id)) {
            systemPermissions.push({
                ...systemPermission,
                assigned: true,
            });
        } else {
            systemPermissions.push({
                ...systemPermission,
                assigned: false,
            });
        }
    }

    systemPermissions.sort((a, b) => (a.assigned ? -1 : 1));

    return systemPermissions;
};

export const getAbsenceStatusColor = (status) => {
    switch (status) {
        case ABSENCE_STATUS_REGISTERED:
            return 'bg-gray-500';
        case ABSENCE_STATUS_APPLIED_FOR:
            return 'bg-blue-500';
        case ABSENCE_STATUS_APPROVED:
            return 'bg-green-500';
        case ABSENCE_STATUS_REJECTED:
            return 'bg-red-500';
    }
};

export const getAbsenceStatusText = (absenceTypeId) => {
    return ABSENCE_STATUS_TYPE_TEXT[absenceTypeId] || 'Other';
};

/**
 * Format a number as a currency amount using the given ISO 4217 currency code.
 * @param {number|null|undefined} value
 * @param {string} [currencyCode='SEK']
 * @returns {string} e.g. "kr 1,250,000" or "€1,250,000"
 */
export const formatCurrency = (value, currencyCode = 'SEK') => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('sv-SE', {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

/**
 * Format a number as Swedish crowns (SEK).
 * @param {number|null|undefined} value
 * @returns {string} e.g. "kr 1,250,000"
 */
export const formatSEK = (value) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'SEK',
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

export const formatSEKCompact = (value) => {
    if (value === null || value === undefined) return '—';
    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
        return `kr ${(value / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1_000) {
        return `kr ${(value / 1_000).toFixed(0)}k`;
    }
    return `kr ${value}`;
};

/**
 * Transform raw timereport weeks into the OccupancyRatesCardComponent format.
 * Groups daily hours by calendar month, computes each month's rate against expected
 * working hours (weekdays excluding Swedish bank holidays)
 *
 * For the current (partial) month, expected hours are capped at today so the
 * in-progress rate reflects work done so far, not the full month target.
 *
 * @param {Array<{weekStartDate: string, weekEndDate: string, hours: number[]}>} timereports
 *   Weeks sorted newest first, as returned by getAssignmentTimereportsByProjectId.
 * @returns {{ currentRate: number, previousRate: number|null, history: Array<{period: string, rate: number}> }|null}
 */
export const transformTimereportsToOccupancy = (timereports) => {
    if (!timereports || timereports.length === 0) return null;

    const actualHoursMap = new Map();

    for (const week of timereports) {
        const [yearNum, monthNum, dayNum] = week.weekStartDate.split('-').map(Number);

        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const dayHours = week.hours[dayIdx];
            if (!dayHours) continue;

            const date = new Date(Date.UTC(yearNum, monthNum - 1, dayNum + dayIdx));
            const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
            actualHoursMap.set(key, (actualHoursMap.get(key) ?? 0) + dayHours);
        }
    }

    if (actualHoursMap.size === 0) return null;

    const today = getUTCToday();
    const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;

    const sortedKeys = Array.from(actualHoursMap.keys()).sort((a, b) => b.localeCompare(a));

    const rates = sortedKeys.map((key) => {
        const [yearStr, monthStr] = key.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1;

        const lastDay =
            key === todayKey
                ? today.getUTCDate()
                : new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

        let expectedDays = 0;
        for (let d = 1; d <= lastDay; d++) {
            const date = new Date(Date.UTC(year, month, d));
            if (!isWeekend(date) && !isSwedishBankHoliday(date)) {
                expectedDays++;
            }
        }

        const expectedHours = expectedDays * 8;
        const actualHours = actualHoursMap.get(key) ?? 0;
        const rate = expectedHours > 0 ? Math.round((actualHours / expectedHours) * 100) : 0;

        const period = new Date(Date.UTC(year, month, 1)).toLocaleString('default', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
        });

        return { id: key, period, rate };
    });

    return {
        currentRate: rates[0]?.rate ?? 0,
        previousRate: rates[1]?.rate ?? null,
        history: rates.slice(1),
    };
};

/**
 * Transform raw metrics data to match StatisticsCard expected format.
 * @param {Array} metrics - Raw metrics data with status and count
 * @returns {Array} Transformed statistics data for StatisticsCard component
 */
export const transformStatisticsData = (metrics) => {
    if (!metrics || metrics.length === 0) return [];

    return metrics.map((metric) => ({
        id: metric.status,
        label: metric.status,
        value: metric.count,
        detail:
            metric.count === 0
                ? `No ${metric.status.toLowerCase()} assignments`
                : `${metric.count} ${metric.status.toLowerCase()} assignment${metric.count > 1 ? 's' : ''}`,
    }));
};

/**
 * Build a computed annual total row from quarterly financial records.
 * Sums Q1–Q4 revenue/cost/profit and incorporates any taxes from the FY record (quarter === 0).
 * Returns null if no quarterly records exist for the given fiscal year.
 * @param {Array} records - All financial records
 * @param {number} fiscalYear - The fiscal year to compute
 * @returns {Object|null}
 */
export function buildComputedTotal(records, fiscalYear) {
    const quarterRecords = records.filter(
        (r) => r.fiscalYear === fiscalYear && r.quarter >= 1 && r.quarter <= 4
    );
    if (quarterRecords.length === 0) return null;

    const fyRecord = records.find((r) => r.fiscalYear === fiscalYear && r.quarter === 0);
    const taxes = fyRecord?.taxes ?? 0;

    return {
        id: `computed-total-${fiscalYear}`,
        fiscalYear,
        quarter: -1,
        revenue: quarterRecords.reduce((sum, r) => sum + r.revenue, 0),
        cost: quarterRecords.reduce((sum, r) => sum + r.cost, 0) + taxes,
        profit: quarterRecords.reduce((sum, r) => sum + r.profit, 0) - taxes,
        taxes,
        _isComputed: true,
    };
}

/**
 * Return available fiscal years from records, sorted descending.
 * @param {Array} records - All financial records
 * @returns {number[]}
 */
export function getFinancialFiscalYears(records) {
    const years = [...new Set(records.map((r) => r.fiscalYear))].toSorted((a, b) => b - a);
    return years;
}

/**
 * Find a financial record for a specific fiscal year and quarter.
 * @param {Array} records
 * @param {number} fiscalYear
 * @param {number} quarter
 * @returns {Object|null}
 */
export function getFinancialRecord(records, fiscalYear, quarter) {
    return records.find((r) => r.fiscalYear === fiscalYear && r.quarter === quarter) ?? null;
}

/**
 * Percent change from a prior value. Returns null when prior is missing or zero.
 * @param {number} current
 * @param {number|null|undefined} previous
 * @returns {number|null}
 */
export function calculatePercentChange(current, previous) {
    if (previous == null || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Format a signed percent change for display (e.g. "+12.5%", "-3%").
 * @param {number|null|undefined} value
 * @returns {string|null}
 */
export function formatPercentChange(value) {
    if (value == null || Number.isNaN(value)) return null;
    const rounded = Math.round(value * 10) / 10;
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded}%`;
}

/**
 * Sum financial metrics for one or more quarters within a fiscal year.
 * Returns null when any requested quarter is missing for that year.
 * @param {Array} records
 * @param {number} fiscalYear
 * @param {number[]} quarters - 1–4
 * @returns {Object|null}
 */
export function aggregateFinancialQuarters(records, fiscalYear, quarters) {
    const quarterRecords = quarters.map((quarter) =>
        records.find((r) => r.fiscalYear === fiscalYear && r.quarter === quarter)
    );

    if (quarterRecords.some((record) => !record)) return null;

    const metrics = ['revenue', 'cost', 'profit', 'taxes'];
    const totals = Object.fromEntries(
        metrics.map((key) => [key, quarterRecords.reduce((sum, record) => sum + record[key], 0)])
    );

    const isAggregated = quarters.length > 1;

    return {
        id: isAggregated
            ? `aggregated-fy${fiscalYear}-q${quarters.join('')}`
            : quarterRecords[0].id,
        fiscalYear,
        quarter: isAggregated ? null : quarters[0],
        ...totals,
        _isAggregated: isAggregated,
        _aggregatedQuarters: isAggregated ? quarters : null,
    };
}

/**
 * Build chart series for one quarter or aggregated quarters across fiscal years (ascending).
 * @param {Array} records
 * @param {number|number[]} quarterSelection - single quarter (1–4) or array of quarters
 * @returns {Array<{ fiscalYear: number, fyLabel: string, revenue: number, cost: number, profit: number, taxes: number }>}
 */
export function buildQuarterComparisonSeries(records, quarterSelection) {
    const quarters = Array.isArray(quarterSelection) ? quarterSelection : [quarterSelection];
    const fiscalYears = [
        ...new Set(records.filter((r) => quarters.includes(r.quarter)).map((r) => r.fiscalYear)),
    ].sort((a, b) => a - b);

    return fiscalYears
        .map((fiscalYear) => aggregateFinancialQuarters(records, fiscalYear, quarters))
        .filter(Boolean)
        .map((record) => ({
            fiscalYear: record.fiscalYear,
            fyLabel: `FY${String(record.fiscalYear).slice(-2)}`,
            revenue: record.revenue,
            cost: record.cost,
            profit: record.profit,
            taxes: record.taxes,
        }));
}

/**
 * Attach YoY percent changes vs the prior fiscal year for the same quarter(s).
 * Returns records sorted by fiscal year descending (newest first).
 * @param {Array} records
 * @param {number|number[]} quarterSelection - single quarter (1–4) or array of quarters
 * @returns {Array}
 */
export function attachYearOverYearChanges(records, quarterSelection) {
    const quarters = Array.isArray(quarterSelection) ? quarterSelection : [quarterSelection];
    const fiscalYears = [
        ...new Set(records.filter((r) => quarters.includes(r.quarter)).map((r) => r.fiscalYear)),
    ].sort((a, b) => a - b);

    const comparisonRecords = fiscalYears
        .map((fiscalYear) => aggregateFinancialQuarters(records, fiscalYear, quarters))
        .filter(Boolean);

    return comparisonRecords
        .map((record, index) => {
            const prior = index > 0 ? comparisonRecords[index - 1] : null;
            const yoy = prior
                ? {
                      revenue: calculatePercentChange(record.revenue, prior.revenue),
                      cost: calculatePercentChange(record.cost, prior.cost),
                      profit: calculatePercentChange(record.profit, prior.profit),
                      taxes: calculatePercentChange(record.taxes, prior.taxes),
                  }
                : null;

            return { ...record, _yoy: yoy };
        })
        .reverse();
}

/**
 * Convert weekly Flex timereport data (from getAssignmentTimereportsForOccupancy) into
 * per-month occupancy entries. Weeks that straddle a month boundary are split correctly.
 * Expected hours use Swedish bank holidays and weekends as non-working days.
 * The current month is capped at `referenceDate` so partial months are handled accurately.
 *
 * @param {Array<{weekStartDate: string, hours: number[]}>} timereports
 * @param {Date} [referenceDate] - cap the current month at this date (defaults to UTC today)
 * @returns {Array<{year: number, month: number, monthName: string, date: string,
 *   externalHours: number, totalMonthlyHours: number, rate: number}>} sorted newest first
 */
export function buildMonthlyOccupancyFromWeeks(timereports, referenceDate) {
    if (!timereports || timereports.length === 0) return [];

    const today = referenceDate ?? getUTCToday();
    const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;

    const actualHoursMap = new Map();

    for (const week of timereports) {
        const [yearNum, monthNum, dayNum] = week.weekStartDate.split('-').map(Number);

        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const dayHours = week.hours[dayIdx];
            if (!dayHours) continue;

            const date = new Date(Date.UTC(yearNum, monthNum - 1, dayNum + dayIdx));
            const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
            actualHoursMap.set(key, (actualHoursMap.get(key) ?? 0) + dayHours);
        }
    }

    if (actualHoursMap.size === 0) return [];

    const sortedKeys = Array.from(actualHoursMap.keys()).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((key) => {
        const [yearStr, monthStr] = key.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const monthIndex = month - 1;

        const lastDay =
            key === todayKey
                ? today.getUTCDate()
                : new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

        let expectedDays = 0;
        for (let d = 1; d <= lastDay; d++) {
            const dayDate = new Date(Date.UTC(year, monthIndex, d));
            if (!isWeekend(dayDate) && !isSwedishBankHoliday(dayDate)) {
                expectedDays++;
            }
        }

        const totalMonthlyHours = expectedDays * 8;
        const externalHours = actualHoursMap.get(key) ?? 0;
        const rate =
            totalMonthlyHours > 0
                ? Math.round((externalHours / totalMonthlyHours) * 10000) / 100
                : 0;

        const firstDay = new Date(Date.UTC(year, monthIndex, 1));
        const monthName = firstDay.toLocaleString('default', { month: 'long', timeZone: 'UTC' });

        return {
            year,
            month,
            monthName,
            date: formatDateToISOString(firstDay),
            externalHours: Math.round(externalHours * 10) / 10,
            totalMonthlyHours,
            rate,
        };
    });
}

/**
 * Convert full weekly Flex timereport data (from getTimereportsForOccupancyFull) into
 * per-month occupancy entries that include both external and internal hours.
 * Weeks straddling a month boundary are split correctly.
 *
 * @param {Array<{weekStartDate: string, externalHours: number[], internalHours: number[]}>} timereports
 * @param {Date} [referenceDate] - cap the current month at this date (defaults to UTC today)
 * @returns {Array<{year: number, month: number, monthName: string, date: string,
 *   externalHours: number, internalHours: number, totalHours: number,
 *   totalMonthlyHours: number, rate: number}>} sorted newest first
 */
export function buildFullMonthlyOccupancy(timereports, referenceDate) {
    if (!timereports || timereports.length === 0) return [];

    const today = referenceDate ?? getUTCToday();
    const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;

    const externalMap = new Map();
    const internalMap = new Map();

    for (const week of timereports) {
        const [yearNum, monthNum, dayNum] = week.weekStartDate.split('-').map(Number);

        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const date = new Date(Date.UTC(yearNum, monthNum - 1, dayNum + dayIdx));
            const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

            const extHours = week.externalHours[dayIdx] ?? 0;
            const intHours = week.internalHours[dayIdx] ?? 0;

            if (extHours) externalMap.set(key, (externalMap.get(key) ?? 0) + extHours);
            if (intHours) internalMap.set(key, (internalMap.get(key) ?? 0) + intHours);
        }
    }

    const allKeys = new Set([...externalMap.keys(), ...internalMap.keys()]);
    if (allKeys.size === 0) return [];

    const sortedKeys = Array.from(allKeys).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((key) => {
        const [yearStr, monthStr] = key.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const monthIndex = month - 1;

        const lastDay =
            key === todayKey
                ? today.getUTCDate()
                : new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

        let expectedDays = 0;
        for (let d = 1; d <= lastDay; d++) {
            const dayDate = new Date(Date.UTC(year, monthIndex, d));
            if (!isWeekend(dayDate) && !isSwedishBankHoliday(dayDate)) {
                expectedDays++;
            }
        }

        const totalMonthlyHours = expectedDays * 8;
        const externalHours = Math.round((externalMap.get(key) ?? 0) * 10) / 10;
        const internalHours = Math.round((internalMap.get(key) ?? 0) * 10) / 10;
        const totalHours = Math.round((externalHours + internalHours) * 10) / 10;
        const rate =
            totalMonthlyHours > 0 ? Math.round((externalHours / totalMonthlyHours) * 100) : 0;

        const firstDay = new Date(Date.UTC(year, monthIndex, 1));
        const monthName = firstDay.toLocaleString('default', { month: 'long', timeZone: 'UTC' });

        return {
            year,
            month,
            monthName,
            date: formatDateToISOString(firstDay),
            externalHours,
            internalHours,
            totalHours,
            totalMonthlyHours,
            rate,
        };
    });
}

/**
 * Group weekly timereports (from getAssignmentTimereportsByProjectId) into monthly buckets.
 * Each week's hours array is iterated day-by-day so weeks that straddle a month
 * boundary are split correctly.
 * @param {Array<{weekStartDate: string, hours: number[]}>} weeklyTimereports
 * @returns {Array<{id: string, month: number, year: number, totalHours: number}>}
 */
export function groupTimereportsByMonth(weeklyTimereports) {
    const monthMap = new Map();

    for (const week of weeklyTimereports) {
        const [y, m, d] = week.weekStartDate.split('-').map(Number);
        const startDate = new Date(Date.UTC(y, m - 1, d));

        for (let i = 0; i < week.hours.length; i++) {
            if (!week.hours[i]) continue;
            const day = new Date(startDate);
            day.setUTCDate(day.getUTCDate() + i);
            const year = day.getUTCFullYear();
            const month = day.getUTCMonth() + 1;
            const key = `${month}-${year}`;

            if (!monthMap.has(key)) {
                monthMap.set(key, { id: key, month, year, totalHours: 0 });
            }
            monthMap.get(key).totalHours += week.hours[i];
        }
    }

    return Array.from(monthMap.values()).sort((a, b) =>
        a.year !== b.year ? b.year - a.year : b.month - a.month
    );
}

/**
 * Extract a Set of permitted fieldNames from session.user.fieldPermissions
 * for a specific system and objectName.
 * Returns null (no restriction applied) when no permissions are configured.
 */
export function getPermittedFieldsFromSession(sessionFieldPermissions, system, objectName) {
    if (!Array.isArray(sessionFieldPermissions) || sessionFieldPermissions.length === 0) {
        return null;
    }
    const fields = sessionFieldPermissions
        .filter((fp) => fp.system === system && fp.objectName === objectName)
        .map((fp) => fp.fieldName);
    return fields.length > 0 ? new Set(fields) : null;
}
