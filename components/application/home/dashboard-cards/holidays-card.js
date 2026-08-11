'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { RefreshCw, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTransition } from 'react';
import { formatDateToEnUSWithOptions } from '@/lib/utils';
import Link from 'next/link';
import { HOLIDAYS_ROUTE } from '@/menus/routes';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
    HolidayBalanceStat,
    HolidayInfoTooltip,
    HolidayTotalBreakdownStat,
    HOLIDAY_BALANCE_TOOLTIPS,
} from '@/components/application/holidays/holiday-balance-ui';

export function HolidaysCardComponent({
    holidays,
    refreshAction,
    error,
    isNavigationDisabled = false,
}) {
    const isMobile = useIsMobile();
    const [isPending, startTransition] = useTransition();

    function handleRefresh() {
        startTransition(async () => {
            await refreshAction();
        });
    }

    const upcomingHolidays = holidays?.upcomingHolidays || [];
    const totalDays = holidays?.totalDays ?? 0;
    const usagePercent =
        totalDays > 0 ? Math.round(((holidays?.usedDays ?? 0) / totalDays) * 100) : 0;

    if (error) {
        return (
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
                <h3 className="text-lg font-semibold mb-4">Holidays</h3>
                <p className="text-sm text-destructive">{error}</p>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5 min-w-0">
                    <CardTitle className={`${isMobile ? 'text-sm' : 'text-xl'} truncate`}>
                        Upcoming Time Off
                    </CardTitle>
                    {holidays?.isBalanceManual && (
                        <HolidayInfoTooltip
                            label="Vacation balances"
                            description={HOLIDAY_BALANCE_TOOLTIPS.manual}
                            side="bottom"
                        />
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {refreshAction && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={isPending}
                            className={cn(isPending ? 'animate-spin' : '', 'hover:cursor-pointer')}
                        >
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    )}
                    {!isNavigationDisabled && (
                        <Link href={HOLIDAYS_ROUTE} className="md:block hover:cursor-pointer">
                            <ArrowUpRight className="h-5 w-5 text-muted-foreground hover:text-deploy-accent-lime transition-colors" />
                        </Link>
                    )}
                </div>
            </div>

            {holidays && (
                <div className="grid grid-cols-3 mb-6 p-4 rounded-lg bg-background/50 border border-border/50">
                    <HolidayBalanceStat
                        label="Available"
                        value={holidays.availableDays ?? 0}
                        description={HOLIDAY_BALANCE_TOOLTIPS.available}
                        valueClassName="text-deploy-accent-lime"
                    />
                    <HolidayBalanceStat
                        label="Used"
                        value={holidays.usedDays ?? 0}
                        description={HOLIDAY_BALANCE_TOOLTIPS.used}
                        valueClassName="text-deploy-accent-orange"
                    />
                    <HolidayTotalBreakdownStat
                        totalDays={holidays.totalDays ?? 0}
                        earnedDays={holidays.earnedDays ?? 0}
                        savedDays={holidays.savedDays ?? 0}
                        advanceDays={holidays.advanceDays ?? 0}
                        showBorder={false}
                    />
                </div>
            )}

            {holidays && totalDays > 0 && (
                <div className="mb-6">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>Holiday Usage</span>
                        <span>{usagePercent}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-linear-to-r from-deploy-accent-lime to-deploy-accent-yellow transition-[width] duration-500"
                            style={{ width: `${Math.min(100, usagePercent)}%` }}
                        />
                    </div>
                    {holidays.nextResetDate && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            Resets on {formatDateToEnUSWithOptions(holidays.nextResetDate)}
                            <HolidayInfoTooltip
                                label="Semester reset"
                                description={HOLIDAY_BALANCE_TOOLTIPS.reset}
                                side="top"
                                size="sm"
                            />
                        </p>
                    )}
                </div>
            )}

            <div className="space-y-3">
                {upcomingHolidays.length > 0 ? (
                    upcomingHolidays.slice(0, 3).map((holiday) => (
                        <div
                            key={holiday.id}
                            className="p-3 rounded-lg bg-background/50 border border-border/50 hover:border-border transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="font-medium text-sm">
                                        {holiday.name || 'Time Off'}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {holiday.date && formatDateToEnUSWithOptions(holiday.date)}
                                        {holiday.endDate && holiday.days > 1 && (
                                            <> - {formatDateToEnUSWithOptions(holiday.endDate)}</>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs font-medium text-deploy-accent-lime">
                                    {holiday.days || 1} day
                                    {(holiday.days || 1) !== 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                        No upcoming time off scheduled
                    </div>
                )}
            </div>
        </Card>
    );
}
