'use client';

import { useState } from 'react';
import { PlusCircle, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FinancialsFormComponent } from '@/components/application/management/financials/financials-form';
import {
    FinancialsBarChartComponent,
    FinancialsLineChartComponent,
    FinancialsQuarterComparisonChartComponent,
    FinancialsCustomPeriodComparisonChartComponent,
} from '@/components/application/management/financials/financials-chart';
import { FinancialsPeriodCompareControls } from '@/components/application/management/financials/financials-period-compare-controls';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import {
    getFinancialsAction,
    createFinancialRecordAction,
    updateFinancialRecordAction,
    deleteFinancialRecordAction,
} from '@/actions/database/financials-actions';
import { toastRichSuccess, toastRichError } from '@/lib/toast-library';
import {
    getCurrentFiscalYear,
    buildComputedTotal,
    getFinancialFiscalYears,
    attachYearOverYearChanges,
    buildCustomPeriodComparison,
} from '@/lib/utils';
import { QUARTER_FILTER_OPTIONS, ALL_FY_VALUE, getQuarterComparisonConfig } from '../financials-constants';
import { FinancialCardPhoneComponent } from './financial-card-phone';

export function FinancialsListPhoneComponent({
    records: initialRecords,
    error: initialError,
    canManage,
}) {
    const [records, setRecords] = useState(initialRecords ?? []);
    const [error, setError] = useState(initialError);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const currentFY = getCurrentFiscalYear();
    const availableFYs = getFinancialFiscalYears(records);
    const defaultFY = availableFYs.length > 0 ? availableFYs[0] : currentFY;
    const defaultBaseFY =
        availableFYs.length > 0 ? availableFYs[availableFYs.length - 1] : currentFY;

    const [selectedFY, setSelectedFY] = useState(String(defaultFY));
    const [selectedQuarter, setSelectedQuarter] = useState('all');
    const [compareBaseFY, setCompareBaseFY] = useState(String(defaultBaseFY));
    const [compareBaseQuarter, setCompareBaseQuarter] = useState('1');
    const [compareTargetFY, setCompareTargetFY] = useState(String(defaultFY));
    const [compareTargetQuarter, setCompareTargetQuarter] = useState('4');
    const [showCompareSetup, setShowCompareSetup] = useState(false);
    const [isCompareActive, setIsCompareActive] = useState(false);
    const [appliedCompareBase, setAppliedCompareBase] = useState(null);
    const [appliedCompareTarget, setAppliedCompareTarget] = useState(null);

    const handleLaunchCompare = () => {
        setAppliedCompareBase({
            fiscalYear: parseInt(compareBaseFY, 10),
            quarter: parseInt(compareBaseQuarter, 10),
        });
        setAppliedCompareTarget({
            fiscalYear: parseInt(compareTargetFY, 10),
            quarter: parseInt(compareTargetQuarter, 10),
        });
        setIsCompareActive(true);
    };

    const handleCancelCompare = () => {
        setShowCompareSetup(false);
        setIsCompareActive(false);
        setAppliedCompareBase(null);
        setAppliedCompareTarget(null);
    };

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const fresh = await getFinancialsAction();
            setRecords(fresh);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleCreate = async (values) => {
        await createFinancialRecordAction(values);
        setIsCreateDialogOpen(false);
        toastRichSuccess({ message: 'Financial record created' });
        await handleRefresh();
    };

    const handleEdit = async (values) => {
        await updateFinancialRecordAction(editRecord.id, values);
        setIsEditDialogOpen(false);
        setEditRecord(null);
        toastRichSuccess({ message: 'Financial record updated' });
        await handleRefresh();
    };

    const handleDelete = async (id) => {
        try {
            await deleteFinancialRecordAction(id);
            toastRichSuccess({ message: 'Financial record deleted' });
            await handleRefresh();
        } catch (err) {
            toastRichError({ message: err.message });
        }
    };

    const openEditDialog = (record) => {
        setEditRecord(record);
        setIsEditDialogOpen(true);
    };

    const isAllFY = selectedFY === ALL_FY_VALUE;
    const fyNum = isAllFY ? defaultFY : parseInt(selectedFY, 10);
    const {
        isComparison: isQuarterComparison,
        quarters: comparisonQuarters,
        label: comparisonLabel,
    } = getQuarterComparisonConfig(selectedQuarter, selectedFY);

    const filteredRecords = (() => {
        if (isCompareActive && appliedCompareBase && appliedCompareTarget) {
            return buildCustomPeriodComparison(
                records,
                appliedCompareBase,
                appliedCompareTarget
            );
        }

        if (isQuarterComparison) {
            return attachYearOverYearChanges(records, comparisonQuarters);
        }

        let base = isAllFY ? records : records.filter((r) => r.fiscalYear === fyNum);

        if (selectedQuarter !== 'all') {
            const qNum = parseInt(selectedQuarter, 10);
            base = base.filter((r) => r.quarter === qNum);
        }

        const rows = [...base];

        if (canManage && !isAllFY) {
            if (selectedQuarter === 'all' || selectedQuarter === '-1') {
                const computed = buildComputedTotal(records, fyNum);
                if (computed) rows.push(computed);
            }
        }

        const sortKey = (q) => {
            if (q >= 1 && q <= 4) return q;
            if (q === 0) return 5;
            return 6;
        };
        return rows.sort((a, b) => {
            if (isAllFY && a.fiscalYear !== b.fiscalYear) {
                return b.fiscalYear - a.fiscalYear;
            }
            return sortKey(a.quarter) - sortKey(b.quarter);
        });
    })();

    const fyOptions = (() => {
        const all = [...availableFYs];
        if (!all.includes(currentFY)) all.unshift(currentFY);
        return all;
    })();

    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    return (
        <div className="space-y-4">
            {showCompareSetup ? (
                <FinancialsPeriodCompareControls
                    fyOptions={fyOptions}
                    baseFY={compareBaseFY}
                    baseQuarter={compareBaseQuarter}
                    compareFY={compareTargetFY}
                    compareQuarter={compareTargetQuarter}
                    onBaseFYChange={setCompareBaseFY}
                    onBaseQuarterChange={setCompareBaseQuarter}
                    onCompareFYChange={setCompareTargetFY}
                    onCompareQuarterChange={setCompareTargetQuarter}
                    onLaunchCompare={handleLaunchCompare}
                    onCancel={handleCancelCompare}
                    stacked
                />
            ) : (
                <div className="flex items-center gap-2">
                    <Select value={selectedFY} onValueChange={setSelectedFY}>
                        <SelectTrigger className="flex-1 hover:cursor-pointer">
                            <SelectValue placeholder="Fiscal Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_FY_VALUE}>All FY</SelectItem>
                            {fyOptions.map((fy) => (
                                <SelectItem key={fy} value={String(fy)}>
                                    FY{String(fy).slice(-2)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                        <SelectTrigger className="flex-1 hover:cursor-pointer">
                            <SelectValue placeholder="Quarter" />
                        </SelectTrigger>
                        <SelectContent>
                            {QUARTER_FILTER_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        size="sm"
                        variant="default"
                        className="shrink-0 hover:cursor-pointer"
                        onClick={() => setShowCompareSetup(true)}
                    >
                        <GitCompare className="h-4 w-4" />
                        <span className="sr-only">Compare quarters</span>
                    </Button>

                    {canManage && (
                        <Button
                            size="sm"
                            className="shrink-0 hover:cursor-pointer"
                            onClick={() => setIsCreateDialogOpen(true)}
                        >
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}

            <div className="space-y-3">
                {filteredRecords.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No records found
                    </div>
                )}
                {filteredRecords.map((record) => {
                    return (
                        <FinancialCardPhoneComponent
                            key={record.id}
                            record={record}
                            canManage={canManage}
                            openEditDialog={openEditDialog}
                            handleDelete={handleDelete}
                        />
                    );
                })}
            </div>

            <div className="space-y-6">
                <FinancialsBarChartComponent
                    records={records}
                    fiscalYear={
                        isCompareActive && appliedCompareTarget
                            ? appliedCompareTarget.fiscalYear
                            : isAllFY
                              ? defaultFY
                              : parseInt(selectedFY, 10)
                    }
                    compact
                />
                {isCompareActive && appliedCompareBase && appliedCompareTarget ? (
                    <FinancialsCustomPeriodComparisonChartComponent
                        records={records}
                        basePeriod={appliedCompareBase}
                        comparePeriod={appliedCompareTarget}
                        compact
                    />
                ) : isQuarterComparison ? (
                    <FinancialsQuarterComparisonChartComponent
                        records={records}
                        quarters={comparisonQuarters}
                        label={comparisonLabel}
                        compact
                    />
                ) : (
                    <FinancialsLineChartComponent records={records} compact />
                )}
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Financial Record</DialogTitle>
                        <DialogDescription>
                            Enter the financial figures for the selected fiscal year and quarter.
                        </DialogDescription>
                    </DialogHeader>
                    <FinancialsFormComponent onSubmit={handleCreate} />
                </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Financial Record</DialogTitle>
                        <DialogDescription>
                            Update the financial figures for this record.
                        </DialogDescription>
                    </DialogHeader>
                    {editRecord && (
                        <FinancialsFormComponent record={editRecord} onSubmit={handleEdit} />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
