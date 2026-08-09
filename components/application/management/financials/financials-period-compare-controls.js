'use client';

import { GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SINGLE_QUARTER_OPTIONS } from '@/components/application/management/financials/financials-constants';

function PeriodSelectGroup({
    label,
    fiscalYear,
    quarter,
    fyOptions,
    onFiscalYearChange,
    onQuarterChange,
    fillWidth = false,
}) {
    return (
        <div className={`flex items-center gap-2 ${fillWidth ? 'w-full' : 'shrink-0'}`}>
            <span
                className={`text-xs font-medium text-muted-foreground whitespace-nowrap ${fillWidth ? 'w-9 shrink-0' : ''}`}
            >
                {label}
            </span>
            <Select value={fiscalYear} onValueChange={onFiscalYearChange}>
                <SelectTrigger
                    className={`h-8 hover:cursor-pointer ${fillWidth ? 'flex-1' : 'w-[88px]'}`}
                >
                    <SelectValue placeholder="FY" />
                </SelectTrigger>
                <SelectContent>
                    {fyOptions.map((fy) => (
                        <SelectItem key={fy} value={String(fy)}>
                            FY{String(fy).slice(-2)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={quarter} onValueChange={onQuarterChange}>
                <SelectTrigger
                    className={`h-8 hover:cursor-pointer ${fillWidth ? 'flex-1' : 'w-[72px]'}`}
                >
                    <SelectValue placeholder="Q" />
                </SelectTrigger>
                <SelectContent>
                    {SINGLE_QUARTER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export function FinancialsPeriodCompareControls({
    fyOptions,
    baseFY,
    baseQuarter,
    compareFY,
    compareQuarter,
    onBaseFYChange,
    onBaseQuarterChange,
    onCompareFYChange,
    onCompareQuarterChange,
    onLaunchCompare,
    onCancel,
    stacked = false,
}) {
    if (stacked) {
        return (
            <div className="space-y-2 w-full">
                <PeriodSelectGroup
                    label="From"
                    fiscalYear={baseFY}
                    quarter={baseQuarter}
                    fyOptions={fyOptions}
                    onFiscalYearChange={onBaseFYChange}
                    onQuarterChange={onBaseQuarterChange}
                    fillWidth
                />
                <PeriodSelectGroup
                    label="To"
                    fiscalYear={compareFY}
                    quarter={compareQuarter}
                    fyOptions={fyOptions}
                    onFiscalYearChange={onCompareFYChange}
                    onQuarterChange={onCompareQuarterChange}
                    fillWidth
                />
                <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" className="flex-1 hover:cursor-pointer" onClick={onLaunchCompare}>
                        Compare
                    </Button>
                    {onCancel && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="hover:cursor-pointer"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
            <PeriodSelectGroup
                label="From"
                fiscalYear={baseFY}
                quarter={baseQuarter}
                fyOptions={fyOptions}
                onFiscalYearChange={onBaseFYChange}
                onQuarterChange={onBaseQuarterChange}
            />
            <span className="text-muted-foreground text-sm shrink-0">vs</span>
            <PeriodSelectGroup
                label="To"
                fiscalYear={compareFY}
                quarter={compareQuarter}
                fyOptions={fyOptions}
                onFiscalYearChange={onCompareFYChange}
                onQuarterChange={onCompareQuarterChange}
            />
            <Button size="sm" className="shrink-0 hover:cursor-pointer" onClick={onLaunchCompare}>
                Compare
            </Button>
            {onCancel && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 hover:cursor-pointer"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
            )}
        </div>
    );
}

export function FinancialsCompareQuartersButton({ onClick, isActive = false }) {
    return (
        <Button
            size="sm"
            variant={isActive ? 'secondary' : 'default'}
            className="hover:cursor-pointer"
            onClick={onClick}
        >
            <GitCompare className="h-4 w-4" />
            <span className="sr-only">Compare quarters</span>
        </Button>
    );
}
