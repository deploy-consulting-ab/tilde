export const QUARTER_LABELS = {
    0: 'Total Year',
    1: 'Q1',
    2: 'Q2',
    3: 'Q3',
    4: 'Q4',
};

export const AGGREGATED_QUARTER_PRESETS = {
    h1: { label: 'Q1 + Q2', quarters: [1, 2] },
    '9m': { label: 'Q1 + Q2 + Q3', quarters: [1, 2, 3] },
};

export const SINGLE_QUARTER_OPTIONS = [
    { value: '1', label: 'Q1' },
    { value: '2', label: 'Q2' },
    { value: '3', label: 'Q3' },
    { value: '4', label: 'Q4' },
];

export const ALL_FY_VALUE = 'all';

export const QUARTER_FILTER_OPTIONS = [
    { value: 'all', label: 'All Quarters' },
    { value: '0', label: 'Total Year' },
    ...SINGLE_QUARTER_OPTIONS,
    { value: 'h1', label: AGGREGATED_QUARTER_PRESETS.h1.label },
    { value: '9m', label: AGGREGATED_QUARTER_PRESETS['9m'].label },
];

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
 * Comparison across fiscal years is only enabled when "All FY" is selected.
 * @param {string} selectedQuarter
 * @param {string} selectedFY
 * @returns {{ isComparison: boolean, quarters: number[]|null, label: string|null }}
 */
export function getQuarterComparisonConfig(selectedQuarter, selectedFY) {
    if (selectedFY !== ALL_FY_VALUE) {
        return { isComparison: false, quarters: null, label: null };
    }

    if (['1', '2', '3', '4'].includes(selectedQuarter)) {
        const quarter = parseInt(selectedQuarter, 10);
        return {
            isComparison: true,
            quarters: [quarter],
            label: QUARTER_LABELS[quarter],
        };
    }

    const preset = AGGREGATED_QUARTER_PRESETS[selectedQuarter];
    if (preset) {
        return {
            isComparison: true,
            quarters: preset.quarters,
            label: preset.label,
        };
    }

    return { isComparison: false, quarters: null, label: null };
}
