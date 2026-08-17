export const QUARTER_LABELS = {
    0: 'Total Year',
    1: 'Q1',
    2: 'Q2',
    3: 'Q3',
    4: 'Q4',
};

export const ALL_QUARTERS_VALUE = 'all';

export const SINGLE_QUARTER_OPTIONS = [
    { value: '1', label: 'Q1' },
    { value: '2', label: 'Q2' },
    { value: '3', label: 'Q3' },
    { value: '4', label: 'Q4' },
];

export const ALL_FY_VALUE = 'all';

export const QUARTER_FILTER_OPTIONS = [
    { value: ALL_QUARTERS_VALUE, label: 'All Quarters' },
    { value: '0', label: 'Total Year' },
    ...SINGLE_QUARTER_OPTIONS,
];

/**
 * @param {string|string[]} selectedQuarters
 * @returns {string[]}
 */
export function normalizeQuarterSelection(selectedQuarters) {
    if (Array.isArray(selectedQuarters)) return selectedQuarters;
    if (selectedQuarters == null || selectedQuarters === '') return [ALL_QUARTERS_VALUE];
    return [selectedQuarters];
}

/**
 * @param {string|string[]} selectedQuarters
 * @returns {boolean}
 */
export function isAllQuartersSelection(selectedQuarters) {
    const values = normalizeQuarterSelection(selectedQuarters);
    return values.length === 0 || values.includes(ALL_QUARTERS_VALUE);
}

/**
 * Toggle a quarter in the filter. "All Quarters" resets the selection.
 * Unchecking the last item returns to All Quarters.
 * @param {string[]} current
 * @param {string} value
 * @returns {string[]}
 */
export function toggleQuarterFilter(current, value) {
    if (value === ALL_QUARTERS_VALUE) return [ALL_QUARTERS_VALUE];

    const selected = normalizeQuarterSelection(current).filter(
        (item) => item !== ALL_QUARTERS_VALUE
    );
    const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value].toSorted((a, b) => Number(a) - Number(b));

    return next.length === 0 ? [ALL_QUARTERS_VALUE] : next;
}

/**
 * @param {string|string[]} selectedQuarters
 * @returns {string}
 */
export function getQuarterFilterLabel(selectedQuarters) {
    if (isAllQuartersSelection(selectedQuarters)) return 'All Quarters';

    return normalizeQuarterSelection(selectedQuarters)
        .map((value) => {
            if (value === '0') return QUARTER_LABELS[0];
            return QUARTER_LABELS[parseInt(value, 10)] ?? value;
        })
        .join(', ');
}

/**
 * @param {number} fiscalYear
 * @param {number} quarter
 * @returns {string}
 */
export function formatFinancialPeriodLabel(fiscalYear, quarter) {
    const quarterLabel = QUARTER_LABELS[quarter] ?? `Q${quarter}`;
    return `${quarterLabel} FY${String(fiscalYear).slice(-2)}`;
}

/**
 * @param {{ quarter?: number|null, _isAggregated?: boolean, _aggregatedQuarters?: number[] }} record
 * @returns {string}
 */
export function formatFinancialQuarterLabel(record) {
    if (record._isAggregated && record._aggregatedQuarters) {
        return record._aggregatedQuarters.map((q) => QUARTER_LABELS[q]).join(' + ');
    }

    if (record.quarter === -1 || record.quarter === 0) return 'Total Year';
    if (record.quarter == null) return '—';

    return QUARTER_LABELS[record.quarter] ?? `Q${record.quarter}`;
}

/**
 * Resolve quarter filter selection into comparison mode config.
 * Comparison across fiscal years is only enabled when "All FY" is selected
 * and one or more of Total Year / Q1–Q4 are selected.
 * @param {string|string[]} selectedQuarters
 * @param {string} selectedFY
 * @returns {{ isComparison: boolean, quarters: number[]|null, label: string|null }}
 */
export function getQuarterComparisonConfig(selectedQuarters, selectedFY) {
    if (selectedFY !== ALL_FY_VALUE || isAllQuartersSelection(selectedQuarters)) {
        return { isComparison: false, quarters: null, label: null };
    }

    const values = normalizeQuarterSelection(selectedQuarters);
    const quarters = [];

    for (const value of values) {
        const quarter = parseInt(value, 10);
        if (quarter >= 0 && quarter <= 4) quarters.push(quarter);
    }

    if (quarters.length === 0) {
        return { isComparison: false, quarters: null, label: null };
    }

    return {
        isComparison: true,
        quarters,
        label: quarters.map((quarter) => QUARTER_LABELS[quarter]).join(', '),
    };
}
