'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MONTHS, WEEK_DAYS } from '@/actions/flex/constants';

export function HolidaysCalendarComponent({ holidays, error }) {
    const today = useMemo(() => new Date(), []);
    const [currentDate, setCurrentDate] = useState(today);

    // Extract holiday dates from the passed data
    const holidayDates = useMemo(() => {
        if (!holidays?.allHolidaysRange) return [];
        return holidays.allHolidaysRange.map((date) => {
            const d = new Date(date);
            return {
                year: d.getFullYear(),
                month: d.getMonth(),
                day: d.getDate(),
            };
        });
    }, [holidays]);

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Memoize calendar data to prevent flickering
    const calendarData = useMemo(() => {
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        // Adjust for Monday start (0 = Monday, 6 = Sunday)
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        return { daysInMonth, startDay };
    }, [currentYear, currentMonth]);

    const { daysInMonth, startDay } = calendarData;

    const goToPreviousMonth = useCallback(() => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    }, [currentYear, currentMonth]);

    const goToNextMonth = useCallback(() => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    }, [currentYear, currentMonth]);

    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;

    const isHoliday = useCallback(
        (day) => {
            return holidayDates.some(
                (h) => h.year === currentYear && h.month === currentMonth && h.day === day
            );
        },
        [holidayDates, currentYear, currentMonth]
    );

    const isToday = useCallback(
        (day) => {
            return (
                today.getDate() === day &&
                today.getMonth() === currentMonth &&
                today.getFullYear() === currentYear
            );
        },
        [today, currentMonth, currentYear]
    );

    const isWeekend = useCallback(
        (day) => {
            const date = new Date(currentYear, currentMonth, day);
            const dayOfWeek = date.getDay();
            return dayOfWeek === 0 || dayOfWeek === 6;
        },
        [currentYear, currentMonth]
    );

    const isPast = useCallback(
        (day) => {
            const date = new Date(currentYear, currentMonth, day);
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            return date < todayStart;
        },
        [currentYear, currentMonth, today]
    );

    // Count holidays in current month
    const holidaysThisMonth = useMemo(() => {
        return holidayDates.filter((h) => h.year === currentYear && h.month === currentMonth)
            .length;
    }, [holidayDates, currentYear, currentMonth]);

    if (error) {
        return (
            <Card className="p-6 border-border/50">
                <h3 className="text-base font-semibold text-foreground mb-2">Your Holidays</h3>
                <p className="text-sm text-destructive">{error}</p>
            </Card>
        );
    }

    return (
        <Card className="p-6 border-border/50">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <h3 className="text-base font-semibold text-foreground">Your Holidays</h3>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToPreviousMonth}
                            aria-label="Previous month"
                            className="h-8 w-8 shrink-0 hover:cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-foreground min-w-27.5 text-center">
                            {MONTHS[currentMonth]} {currentYear}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToNextMonth}
                            aria-label="Next month"
                            className="h-8 w-8 shrink-0 hover:cursor-pointer"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Week Days Header */}
                <div className="grid grid-cols-7 gap-2">
                    {WEEK_DAYS.map((day) => (
                        <div
                            key={day}
                            className="text-center text-xs font-medium text-muted-foreground py-1"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid - key forces clean re-render on month change */}
                <div key={`${currentYear}-${currentMonth}`} className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before the first of the month */}
                    {Array.from({ length: startDay }).map((_, index) => (
                        <div key={`empty-${index}`} className="h-10" />
                    ))}

                    {/* Days of the month */}
                    {Array.from({ length: daysInMonth }).map((_, index) => {
                        const day = index + 1;
                        const holiday = isHoliday(day);
                        const todayDay = isToday(day);
                        const weekend = isWeekend(day);
                        const past = isPast(day);

                        return (
                            <div
                                key={day}
                                className={cn(
                                    'h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                                    // Holiday styling - lime to yellow gradient
                                    holiday &&
                                        'bg-gradient-to-r from-deploy-accent-lime to-deploy-accent-yellow text-gray-900 font-bold',
                                    // Today styling
                                    todayDay &&
                                        !holiday &&
                                        'bg-deploy-accent-silver/20 text-foreground font-bold',
                                    // Weekend styling (not holiday)
                                    weekend &&
                                        !holiday &&
                                        !todayDay &&
                                        'bg-muted/50 text-muted-foreground',
                                    // Past days (not holiday, not today, not weekend)
                                    past &&
                                        !holiday &&
                                        !todayDay &&
                                        !weekend &&
                                        'text-muted-foreground/60',
                                    // Future days
                                    !past &&
                                        !holiday &&
                                        !todayDay &&
                                        !weekend &&
                                        'text-foreground hover:bg-muted/50'
                                )}
                            >
                                {day}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        <span className="font-bold text-foreground">{holidaysThisMonth}</span>{' '}
                        holiday
                        {holidaysThisMonth !== 1 ? 's' : ''} this month
                    </p>
                    {!isCurrentMonth && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToToday}
                            className="text-xs h-7 px-2 hover:cursor-pointer"
                        >
                            Today
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
