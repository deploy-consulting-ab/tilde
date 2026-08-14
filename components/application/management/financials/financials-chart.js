'use client';

import { useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { buildQuarterComparisonSeries, aggregateFinancialQuarters } from '@/lib/utils';
import { NoDataComponent } from '@/components/errors/no-data';
import {
    QUARTER_LABELS,
    AGGREGATED_QUARTER_PRESETS,
    getQuarterFilterLabel,
    formatFinancialPeriodLabel,
} from './financials-constants';

const FinancialsBarChartCanvas = dynamic(
    () =>
        import('./financials-chart-canvas').then((mod) => mod.FinancialsBarChartCanvas),
    { ssr: false, loading: () => <Skeleton className="w-full h-72" /> }
);

const FinancialsQuarterComparisonChartCanvas = dynamic(
    () =>
        import('./financials-chart-canvas').then(
            (mod) => mod.FinancialsQuarterComparisonChartCanvas
        ),
    { ssr: false, loading: () => <Skeleton className="w-full h-72" /> }
);

const FinancialsLineChartCanvas = dynamic(
    () => import('./financials-chart-canvas').then((mod) => mod.FinancialsLineChartCanvas),
    { ssr: false, loading: () => <Skeleton className="w-full h-72" /> }
);

function useTouchToMouseEvents() {
    const ref = useRef(null);

    const handleTouchMove = useCallback((e) => {
        const touch = e.touches[0];
        if (!touch || !ref.current) return;
        const svgEl = ref.current.querySelector('svg');
        if (!svgEl) return;
        svgEl.dispatchEvent(
            new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                clientX: touch.clientX,
                clientY: touch.clientY,
            })
        );
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (!ref.current) return;
        const svgEl = ref.current.querySelector('svg');
        if (!svgEl) return;
        svgEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    }, []);

    return { ref, handleTouchMove, handleTouchEnd };
}

const CHART_CONFIG = {
    revenue: { label: 'Revenue', color: '#3b82f6' },
    cost: { label: 'Cost', color: '#ef4444' },
    profit: { label: 'Profit', color: '#22c55e' },
    taxes: { label: 'Taxes', color: '#fddA0d' },
};

function buildQuarterlyBreakdownSeries(records, fiscalYear, selectedQuarter = 'all') {
    const fyRecords = records.filter((r) => r.fiscalYear === fiscalYear);

    const toChartRow = (label, record) => ({
        quarter: label,
        revenue: record.revenue,
        cost: record.cost,
        profit: record.profit,
    });

    if (selectedQuarter === 'all') {
        return fyRecords
            .filter((r) => r.quarter >= 1 && r.quarter <= 4)
            .sort((a, b) => a.quarter - b.quarter)
            .map((r) => toChartRow(QUARTER_LABELS[r.quarter], r));
    }

    if (selectedQuarter === '0') {
        const record = fyRecords.find((r) => r.quarter === 0);
        return record ? [toChartRow('Total Year', record)] : [];
    }

    if (['1', '2', '3', '4'].includes(selectedQuarter)) {
        const quarter = parseInt(selectedQuarter, 10);
        const record = fyRecords.find((r) => r.quarter === quarter);
        return record ? [toChartRow(QUARTER_LABELS[quarter], record)] : [];
    }

    const preset = AGGREGATED_QUARTER_PRESETS[selectedQuarter];
    if (preset) {
        const aggregated = aggregateFinancialQuarters(records, fiscalYear, preset.quarters);
        return aggregated ? [toChartRow(preset.label, aggregated)] : [];
    }

    return [];
}

/**
 * Bar chart: Revenue / Cost / Profit / Taxes grouped by quarter for the selected FY.
 */
export function FinancialsBarChartComponent({
    records,
    fiscalYear,
    selectedQuarter = 'all',
    compact = false,
}) {
    const quarterRecords = buildQuarterlyBreakdownSeries(records, fiscalYear, selectedQuarter);
    const quarterLabel = getQuarterFilterLabel(selectedQuarter);
    const chartDescription = quarterLabel
        ? `Revenue, Cost, Profit and Taxes for ${quarterLabel} FY${String(fiscalYear).slice(-2)}`
        : `Revenue, Cost, Profit and Taxes for FY${String(fiscalYear).slice(-2)}`;
    const noDataText =
        selectedQuarter === 'all'
            ? 'No quarterly data for this fiscal year'
            : 'No data for this period';

    const { ref, handleTouchMove, handleTouchEnd } = useTouchToMouseEvents();

    return (
        <Card variant="shadow">
            <CardHeader>
                <CardTitle>Quarterly Breakdown</CardTitle>
                <CardDescription>{chartDescription}</CardDescription>
            </CardHeader>
            <CardContent>
                {quarterRecords.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                        <NoDataComponent text={noDataText} />
                    </div>
                ) : (
                    <div ref={ref} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                        <FinancialsBarChartCanvas
                            data={quarterRecords}
                            compact={compact}
                            chartConfig={CHART_CONFIG}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Line chart: Revenue / Cost / Profit / Taxes for one quarter or aggregated quarters across fiscal years.
 */
export function FinancialsQuarterComparisonChartComponent({
    records,
    quarters,
    label,
    compact = false,
}) {
    const quarterList = Array.isArray(quarters) ? quarters : [quarters];
    const quarterLabel =
        label ??
        (quarterList.length === 1 ? (QUARTER_LABELS[quarterList[0]] ?? `Q${quarterList[0]}`) : null);
    const series = buildQuarterComparisonSeries(records, quarterList).map((r) => ({
        fy: r.fyLabel,
        revenue: r.revenue,
        cost: r.cost,
        profit: r.profit,
        taxes: r.taxes,
    }));

    const { ref, handleTouchMove, handleTouchEnd } = useTouchToMouseEvents();

    return (
        <Card variant="shadow">
            <CardHeader>
                <CardTitle>{quarterLabel} Year-over-Year</CardTitle>
                <CardDescription>
                    {quarterLabel} Revenue, Cost, Profit and Taxes across fiscal years
                </CardDescription>
            </CardHeader>
            <CardContent>
                {series.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                        <NoDataComponent text={`No ${quarterLabel} records available yet`} />
                    </div>
                ) : (
                    <div ref={ref} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                        <FinancialsQuarterComparisonChartCanvas
                            data={series}
                            compact={compact}
                            chartConfig={CHART_CONFIG}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Bar chart: side-by-side comparison of two arbitrary fiscal-year/quarter periods.
 */
export function FinancialsCustomPeriodComparisonChartComponent({
    records,
    basePeriod,
    comparePeriod,
    compact = false,
}) {
    const baseRecord = records.find(
        (r) => r.fiscalYear === basePeriod.fiscalYear && r.quarter === basePeriod.quarter
    );
    const compareRecord = records.find(
        (r) => r.fiscalYear === comparePeriod.fiscalYear && r.quarter === comparePeriod.quarter
    );

    const baseLabel = formatFinancialPeriodLabel(basePeriod.fiscalYear, basePeriod.quarter);
    const compareLabel = formatFinancialPeriodLabel(comparePeriod.fiscalYear, comparePeriod.quarter);

    const chartData = [baseRecord, compareRecord]
        .filter(Boolean)
        .map((record) => ({
            quarter:
                record.fiscalYear === basePeriod.fiscalYear && record.quarter === basePeriod.quarter
                    ? baseLabel
                    : compareLabel,
            revenue: record.revenue,
            cost: record.cost,
            profit: record.profit,
            taxes: record.taxes,
        }));

    const { ref, handleTouchMove, handleTouchEnd } = useTouchToMouseEvents();

    return (
        <Card variant="shadow">
            <CardHeader>
                <CardTitle>Period Comparison</CardTitle>
                <CardDescription>
                    {baseLabel} vs {compareLabel}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                        <NoDataComponent text="No records available for the selected periods" />
                    </div>
                ) : (
                    <div ref={ref} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                        <FinancialsBarChartCanvas
                            data={chartData}
                            compact={compact}
                            chartConfig={CHART_CONFIG}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Line chart: Revenue / Cost / Profit / Taxes trend across fiscal years (Total Year records).
 */
export function FinancialsLineChartComponent({ records, compact = false }) {
    const totalYearRecords = records
        .filter((r) => r.quarter === 0)
        .sort((a, b) => a.fiscalYear - b.fiscalYear)
        .map((r) => ({
            fy: `FY${String(r.fiscalYear).slice(-2)}`,
            revenue: r.revenue,
            cost: r.cost,
            profit: r.profit,
            taxes: r.taxes,
        }));

    const { ref, handleTouchMove, handleTouchEnd } = useTouchToMouseEvents();

    return (
        <Card variant="shadow">
            <CardHeader>
                <CardTitle>Annual Trend</CardTitle>
                <CardDescription>
                    Revenue, Cost, Profit and Taxes across fiscal years (Total Year)
                </CardDescription>
            </CardHeader>
            <CardContent>
                {totalYearRecords.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                        <NoDataComponent text="No Total Year records available yet" />
                    </div>
                ) : (
                    <div ref={ref} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                        <FinancialsLineChartCanvas
                            data={totalYearRecords}
                            compact={compact}
                            chartConfig={CHART_CONFIG}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
