'use client';

import { useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
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

export function HolidayInfoTooltip({
    label,
    description,
    side = 'top',
    size = 'default',
    disabled = false,
}) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);

    if (!description) {
        return null;
    }

    const iconClassName = size === 'sm' ? 'size-3' : 'size-3.5';
    const triggerClassName = cn(
        'inline-flex shrink-0 items-center justify-center text-muted-foreground/60',
        !disabled && 'hover:text-muted-foreground',
        disabled && 'pointer-events-none',
        isMobile ? 'size-8 -m-1.5 rounded-full active:bg-muted/50' : 'cursor-help'
    );

    if (isMobile) {
        return (
            <Popover
                open={disabled ? false : open}
                onOpenChange={disabled ? undefined : setOpen}
            >
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className={triggerClassName}
                        aria-label={`About ${label}`}
                        disabled={disabled}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Info className={iconClassName} />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    side={side}
                    className="max-w-xs whitespace-pre-line text-left text-sm p-3"
                >
                    {description}
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <Tooltip {...(disabled ? { open: false } : {})}>
            <TooltipTrigger asChild>
                <span
                    tabIndex={0}
                    className={triggerClassName}
                    aria-label={`About ${label}`}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    <Info className={iconClassName} />
                </span>
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

function HolidayBreakdownInfoIcon({ label, description, side, tooltipsEnabled }) {
    if (!description) {
        return null;
    }

    if (!tooltipsEnabled) {
        return (
            <span
                className="inline-flex shrink-0 items-center justify-center text-muted-foreground/60 pointer-events-none"
                aria-hidden="true"
            >
                <Info className="size-3" />
            </span>
        );
    }

    return (
        <HolidayInfoTooltip
            label={label}
            description={description}
            side={side}
            size="sm"
        />
    );
}

function HolidayTotalBreakdownRow({
    label,
    value,
    description,
    valueClassName,
    tooltipsEnabled = true,
}) {
    const displayValue = formatVacationDays(value);
    const isNegative = typeof value === 'number' && value < 0;

    return (
        <div className="flex items-center justify-between gap-4 py-1.5">
            <div className="flex items-center gap-1 min-w-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <HolidayBreakdownInfoIcon
                    label={label}
                    description={description}
                    side="top"
                    tooltipsEnabled={tooltipsEnabled}
                />
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
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [breakdownTooltipsEnabled, setBreakdownTooltipsEnabled] = useState(false);
    const closeTimeoutRef = useRef(null);
    const openMousePosRef = useRef(null);

    const clearCloseTimeout = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const scheduleClose = () => {
        clearCloseTimeout();
        closeTimeoutRef.current = setTimeout(() => {
            setOpen(false);
            setBreakdownTooltipsEnabled(false);
            openMousePosRef.current = null;
        }, 120);
    };

    const handleOpen = ({ enableTooltips = false, clientX, clientY } = {}) => {
        clearCloseTimeout();
        setOpen(true);
        setBreakdownTooltipsEnabled(enableTooltips);
        openMousePosRef.current =
            clientX != null && clientY != null ? { x: clientX, y: clientY } : null;
    };

    const enableBreakdownTooltips = (event) => {
        if (breakdownTooltipsEnabled) {
            return;
        }

        const { clientX, clientY } = event;
        if (!openMousePosRef.current) {
            openMousePosRef.current = { x: clientX, y: clientY };
            return;
        }

        const dx = Math.abs(clientX - openMousePosRef.current.x);
        const dy = Math.abs(clientY - openMousePosRef.current.y);
        if (dx + dy >= 4) {
            setBreakdownTooltipsEnabled(true);
        }
    };

    const keepOpen = () => {
        clearCloseTimeout();
        setOpen(true);
    };

    const handlePopoverOpenChange = (nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
            setBreakdownTooltipsEnabled(false);
            openMousePosRef.current = null;
        } else if (isMobile) {
            setBreakdownTooltipsEnabled(true);
        }
    };

    const toggleMobileBreakdown = (event) => {
        event.stopPropagation();
        clearCloseTimeout();
        setOpen((prev) => {
            const next = !prev;
            setBreakdownTooltipsEnabled(next);
            return next;
        });
    };

    const displayValue = formatVacationDays(totalDays);
    const isNegative = typeof totalDays === 'number' && totalDays < 0;
    const breakdownTooltipsActive = isMobile || breakdownTooltipsEnabled;

    return (
        <Popover open={open} onOpenChange={handlePopoverOpenChange}>
            <PopoverAnchor asChild>
                <div
                    className={cn(
                        'text-center min-w-0 px-1 w-full outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
                        showBorder && 'border-r border-border/50',
                        isMobile ? 'cursor-pointer active:bg-muted/30' : 'cursor-help'
                    )}
                    role="group"
                    aria-label={
                        isMobile
                            ? 'Total vacation days. Tap for earned, saved, and advance breakdown.'
                            : 'Total vacation days. Hover for earned, saved, and advance breakdown.'
                    }
                    aria-expanded={open}
                    tabIndex={0}
                    onMouseEnter={
                        !isMobile
                            ? (event) =>
                                  handleOpen({
                                      clientX: event.clientX,
                                      clientY: event.clientY,
                                  })
                            : undefined
                    }
                    onMouseLeave={!isMobile ? scheduleClose : undefined}
                    onFocus={!isMobile ? () => handleOpen({ enableTooltips: true }) : undefined}
                    onBlur={!isMobile ? scheduleClose : undefined}
                    onClick={isMobile ? toggleMobileBreakdown : undefined}
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
                </div>
            </PopoverAnchor>
            <PopoverContent
                className="w-56 p-3"
                align="center"
                side="bottom"
                sideOffset={8}
                onOpenAutoFocus={(event) => event.preventDefault()}
                onMouseEnter={!isMobile ? keepOpen : undefined}
                onMouseLeave={!isMobile ? scheduleClose : undefined}
                onMouseMove={!isMobile ? enableBreakdownTooltips : undefined}
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
                            tooltipsEnabled={breakdownTooltipsActive}
                        />
                    ))}
                </div>
                <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">Total</span>
                        <HolidayBreakdownInfoIcon
                            label="Total"
                            description={HOLIDAY_BALANCE_TOOLTIPS.total}
                            side="top"
                            tooltipsEnabled={breakdownTooltipsActive}
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
