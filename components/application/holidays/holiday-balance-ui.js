'use client';

import { useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn, formatVacationDays } from '@/lib/utils';

export const HOLIDAY_BALANCE_TOOLTIPS = {
    available:
        'Days you can still take this semester year. Calculated as Total minus Used (Flex absence days this semester).',
    total:
        'Total ingoing vacation at semester start (1 Apr): Earned + Saved + Advance. Hover for breakdown.',
    earned:
        'Ingoing earned days at semester start (Flex: Ingoing Vacation Days). HR updates at each semester year start.',
    saved:
        'Ingoing saved days at semester start (Flex: Ingoing Vacation, saved days). Banked from previous years.',
    advance:
        'Ingoing advance days at semester start (Flex: Ingoing Vacation advance). Upfront days for this semester year.',
    used: 'Vacation days registered in Flex during the current semester year (weekdays, excluding public holidays).',
    entitlement:
        'Annual paid vacation entitlement per contract (typically 30 days). Reference only; Total comes from the three pools.',
    reset: 'Semester year resets on 1 April. HR should update ingoing pool values at the start of each semester year.',
    manual:
        'Ingoing pool balances are set manually by HR at semester start from Flex Period Information. Used is calculated automatically from Flex absences.',
};

const TOTAL_BREAKDOWN_ROWS = [
    { key: 'earnedDays', label: 'Earned', tooltipKey: 'earned', valueClassName: 'text-foreground' },
    { key: 'savedDays', label: 'Saved', tooltipKey: 'saved', valueClassName: 'text-deploy-accent-blue' },
    {
        key: 'advanceDays',
        label: 'Advance',
        tooltipKey: 'advance',
        valueClassName: 'text-deploy-accent-orange',
    },
];

export function HolidayInfoTooltip({ label, description, side = 'top', size = 'default' }) {
    if (!description) {
        return null;
    }

    const iconClassName = size === 'sm' ? 'size-3' : 'size-3.5';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="inline-flex shrink-0 cursor-help text-muted-foreground/60 hover:text-muted-foreground"
                    aria-label={`About ${label}`}
                    onClick={(event) => event.stopPropagation()}
                >
                    <Info className={iconClassName} />
                </button>
            </TooltipTrigger>
            <TooltipContent side={side} className="max-w-xs whitespace-pre-line text-left">
                {description}
            </TooltipContent>
        </Tooltip>
    );
}

export function HolidayBalanceStat({
    label,
    value,
    description,
    valueClassName,
    showBorder = true,
}) {
    const displayValue = formatVacationDays(value);
    const isNegative = typeof value === 'number' && value < 0;

    return (
        <div
            className={cn(
                'text-center min-w-0 px-1',
                showBorder && 'border-r border-border/50'
            )}
        >
            <div
                className={cn(
                    'text-2xl font-bold tabular-nums leading-none',
                    isNegative ? 'text-destructive' : valueClassName
                )}
            >
                {displayValue}
            </div>
            <div className="flex items-center justify-center gap-0.5 mt-1 min-w-0">
                <span className="text-xs text-muted-foreground truncate">{label}</span>
                {description && (
                    <HolidayInfoTooltip
                        label={label}
                        description={description}
                        side="bottom"
                        size="sm"
                    />
                )}
            </div>
        </div>
    );
}

function HolidayTotalBreakdownRow({ label, value, description, valueClassName }) {
    const displayValue = formatVacationDays(value);
    const isNegative = typeof value === 'number' && value < 0;

    return (
        <div className="flex items-center justify-between gap-4 py-1.5">
            <div className="flex items-center gap-1 min-w-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                {description && (
                    <HolidayInfoTooltip
                        label={label}
                        description={description}
                        side="top"
                        size="sm"
                    />
                )}
            </div>
            <span
                className={cn(
                    'text-sm font-semibold tabular-nums',
                    isNegative ? 'text-destructive' : valueClassName
                )}
            >
                {displayValue}
            </span>
        </div>
    );
}

export function HolidayTotalBreakdownStat({
    totalDays,
    earnedDays,
    savedDays,
    advanceDays,
    showBorder = true,
}) {
    const [open, setOpen] = useState(false);
    const closeTimeoutRef = useRef(null);

    const clearCloseTimeout = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const scheduleClose = () => {
        clearCloseTimeout();
        closeTimeoutRef.current = setTimeout(() => setOpen(false), 120);
    };

    const handleOpen = () => {
        clearCloseTimeout();
        setOpen(true);
    };

    const displayValue = formatVacationDays(totalDays);
    const isNegative = typeof totalDays === 'number' && totalDays < 0;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
                <button
                    type="button"
                    className={cn(
                        'text-center min-w-0 px-1 w-full cursor-help outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
                        showBorder && 'border-r border-border/50'
                    )}
                    title={HOLIDAY_BALANCE_TOOLTIPS.total}
                    aria-label="Total vacation days. Hover for earned, saved, and advance breakdown."
                    aria-expanded={open}
                    onMouseEnter={handleOpen}
                    onMouseLeave={scheduleClose}
                    onFocus={handleOpen}
                    onBlur={scheduleClose}
                >
                    <div
                        className={cn(
                            'text-2xl font-bold tabular-nums leading-none',
                            isNegative ? 'text-destructive' : 'text-foreground'
                        )}
                    >
                        {displayValue}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <HolidayInfoTooltip
                            label="Total"
                            description={HOLIDAY_BALANCE_TOOLTIPS.total}
                            side="bottom"
                            size="sm"
                        />
                    </div>
                </button>
            </PopoverAnchor>
            <PopoverContent
                className="w-56 p-3"
                align="center"
                side="bottom"
                onMouseEnter={handleOpen}
                onMouseLeave={scheduleClose}
            >
                <p className="text-xs font-medium text-muted-foreground mb-2">
                    Total breakdown
                </p>
                <div className="divide-y divide-border/50">
                    {TOTAL_BREAKDOWN_ROWS.map((row) => (
                        <HolidayTotalBreakdownRow
                            key={row.key}
                            label={row.label}
                            value={
                                row.key === 'earnedDays'
                                    ? earnedDays
                                    : row.key === 'savedDays'
                                      ? savedDays
                                      : advanceDays
                            }
                            description={HOLIDAY_BALANCE_TOOLTIPS[row.tooltipKey]}
                            valueClassName={row.valueClassName}
                        />
                    ))}
                </div>
                <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">Total</span>
                        <HolidayInfoTooltip
                            label="Total"
                            description={HOLIDAY_BALANCE_TOOLTIPS.total}
                            side="top"
                            size="sm"
                        />
                    </div>
                    <span
                        className={cn(
                            'text-sm font-bold tabular-nums',
                            isNegative ? 'text-destructive' : 'text-foreground'
                        )}
                    >
                        {displayValue}
                    </span>
                </div>
            </PopoverContent>
        </Popover>
    );
}
