'use client';

import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
    ALL_QUARTERS_VALUE,
    QUARTER_FILTER_OPTIONS,
    getQuarterFilterLabel,
    isAllQuartersSelection,
    toggleQuarterFilter,
} from '@/components/application/management/financials/financials-constants';

const ALL_QUARTERS_OPTION = QUARTER_FILTER_OPTIONS[0];
const SELECTABLE_QUARTER_OPTIONS = QUARTER_FILTER_OPTIONS.slice(1);

export function FinancialsQuarterFilter({
    selectedQuarters,
    onSelectedQuartersChange,
    className,
}) {
    const isAllSelected = isAllQuartersSelection(selectedQuarters);
    const label = getQuarterFilterLabel(selectedQuarters);

    const handleToggle = (value) => {
        onSelectedQuartersChange(toggleQuarterFilter(selectedQuarters, value));
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'h-9 justify-between font-normal hover:cursor-pointer',
                        className
                    )}
                    aria-label="Filter quarters"
                >
                    <span className="truncate">{label}</span>
                    <ChevronDown className="size-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuCheckboxItem
                    checked={isAllSelected}
                    onCheckedChange={() => handleToggle(ALL_QUARTERS_VALUE)}
                    onSelect={(event) => event.preventDefault()}
                    className="hover:cursor-pointer"
                >
                    {ALL_QUARTERS_OPTION.label}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {SELECTABLE_QUARTER_OPTIONS.map((opt) => (
                    <DropdownMenuCheckboxItem
                        key={opt.value}
                        checked={!isAllSelected && selectedQuarters.includes(opt.value)}
                        onCheckedChange={() => handleToggle(opt.value)}
                        onSelect={(event) => event.preventDefault()}
                        className="hover:cursor-pointer"
                    >
                        {opt.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
