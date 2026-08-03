'use client';

import { BadgeCheck, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils';

const SEK = 'SEK';
const fmt = (v) => formatCurrency(v, SEK);

/** Keeps currency values readable while allowing wrap instead of overflow. */
const CURRENCY_VALUE_CLASS = 'text-sm tabular-nums leading-tight min-w-0 max-w-full wrap-anywhere';

/** Larger currency display for summary / headline figures. */
export const CURRENCY_VALUE_PROMINENT_CLASS =
    'text-lg sm:text-xl tabular-nums leading-tight min-w-0 max-w-full wrap-anywhere';

export const EMPLOYEE_FINANCIAL_TOOLTIPS = {
    projectedInvoicedFY:
        "Sum of projected invoiced amounts from assignments linked to timecards in the current fiscal year, based on each assignment's Projected Amount FY.",
    invoicedAmount:
        'Total invoiced amount from timecards in the current fiscal year (sum of TimecardAmount__c) for qualifying external assignments.',
    adjustedCostFY:
        'Total adjusted employment cost allocated for the full current fiscal year (1 Feb – 31 Jan).',
    adjustedCostFYTD: 'Adjusted employment cost for the current fiscal year to date.',
    projectedProfitabilityFY: 'Projected Invoiced Amount FY minus Adjusted Cost FY.',
    profitabilityFY:
        'Invoiced Amount minus Adjusted Cost FY for the full fiscal year. When positive, it indicates break even for the full fiscal year.',
    profitabilityFYTD: 'Invoiced Amount minus Adjusted Cost FYTD for the fiscal year to date.',
};

export function InfoTooltip({ label, description, side = 'top' }) {
    if (!description) return null;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="inline-flex shrink-0 cursor-help text-muted-foreground/60 hover:text-muted-foreground"
                    aria-label={`About ${label}`}
                >
                    <Info className="size-3.5" />
                </button>
            </TooltipTrigger>
            <TooltipContent side={side} className="max-w-xs whitespace-pre-line">
                {description}
            </TooltipContent>
        </Tooltip>
    );
}

export function MetricLabel({ label, description, align = 'left' }) {
    return (
        <span
            className={`inline-flex items-center gap-1 min-w-0 ${
                align === 'right' ? 'justify-end' : ''
            }`}
        >
            <span className="truncate">{label}</span>
            <InfoTooltip label={label} description={description} />
        </span>
    );
}

export function BreakEvenBadge({ description }) {
    const badge = (
        <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0 cursor-help"
        >
            <BadgeCheck />
            Break Even
        </Badge>
    );

    if (!description) return badge;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="inline-flex">{badge}</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs whitespace-pre-line">
                {description}
            </TooltipContent>
        </Tooltip>
    );
}

export function ProfitBadge({ value, label = 'FYTD', description }) {
    if (value === null || value === undefined) return null;
    const positive = value >= 0;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    className={`hidden md:inline-flex flex-col items-end gap-0.5 min-w-0 max-w-[48%] text-sm font-semibold px-2.5 py-1 rounded-lg cursor-help ${
                        positive
                            ? 'bg-deploy-blue/10 text-deploy-blue dark:bg-deploy-blue/20 dark:text-deploy-ocean'
                            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                >
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                        {label}
                    </span>
                    <span className="inline-flex items-center justify-end gap-1 min-w-0 max-w-full">
                        {positive ? (
                            <TrendingUp className="h-4 w-4 shrink-0" />
                        ) : (
                            <TrendingDown className="h-4 w-4 shrink-0" />
                        )}
                        <span className={`${CURRENCY_VALUE_CLASS} font-semibold text-right`}>
                            {fmt(value)}
                        </span>
                    </span>
                </span>
            </TooltipTrigger>
            {description && (
                <TooltipContent side="left" className="max-w-xs">
                    {description}
                </TooltipContent>
            )}
        </Tooltip>
    );
}

function metricValueClass(colored, hasValue, positive) {
    if (colored && hasValue) {
        return positive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-500 dark:text-red-400';
    }

    return 'text-foreground';
}

export function MetricCell({
    label,
    value,
    description,
    colored = false,
    hideLabel = false,
    layout = 'stack',
}) {
    const hasValue = value !== null && value !== undefined;
    const positive = hasValue && value >= 0;
    const valueClass = metricValueClass(colored, hasValue, positive);

    if (layout === 'row') {
        return (
            <div className="flex items-center justify-between gap-3 min-w-0">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-tight min-w-0 shrink">
                    <span className="truncate">{label}</span>
                    <InfoTooltip label={label} description={description} />
                </span>
                <span
                    className={`${CURRENCY_VALUE_CLASS} font-semibold text-right shrink min-w-0 ${valueClass}`}
                >
                    {fmt(value)}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0.5 min-w-0">
            {!hideLabel && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-tight min-w-0">
                    <span className="truncate">{label}</span>
                    <InfoTooltip label={label} description={description} />
                </span>
            )}
            <span className={`inline-flex items-center gap-1 min-w-0 max-w-full ${valueClass}`}>
                <span className={`${CURRENCY_VALUE_CLASS} font-semibold`}>{fmt(value)}</span>
                {hideLabel && <InfoTooltip label={label} description={description} />}
            </span>
        </div>
    );
}
