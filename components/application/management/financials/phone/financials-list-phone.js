'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
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
} from '@/components/application/management/financials/financials-chart';
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
} from '@/lib/utils';
import { QUARTER_FILTER_OPTIONS, getQuarterComparisonConfig } from '../financials-constants';
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

    const [selectedFY, setSelectedFY] = useState(String(defaultFY));
    const [selectedQuarter, setSelectedQuarter] = useState('all');

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

    const fyNum = parseInt(selectedFY, 10);
    const { isComparison: isQuarterComparison, quarters: comparisonQuarters, label: comparisonLabel } =
        getQuarterComparisonConfig(selectedQuarter);

    const filteredRecords = (() => {
        if (isQuarterComparison) {
            return attachYearOverYearChanges(records, comparisonQuarters);
        }

        let base = records.filter((r) => r.fiscalYear === fyNum);

        if (selectedQuarter !== 'all') {
            const qNum = parseInt(selectedQuarter, 10);
            base = base.filter((r) => r.quarter === qNum);
        }

        const rows = [...base];

        if (canManage) {
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
        return rows.sort((a, b) => sortKey(a.quarter) - sortKey(b.quarter));
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
            <div className="flex items-center gap-2">
                <Select value={selectedFY} onValueChange={setSelectedFY}>
                    <SelectTrigger className="flex-1 hover:cursor-pointer">
                        <SelectValue placeholder="Fiscal Year" />
                    </SelectTrigger>
                    <SelectContent>
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
                            comparisonLabel={comparisonLabel}
                            canManage={canManage}
                            openEditDialog={openEditDialog}
                            handleDelete={handleDelete}
                        />
                    );
                })}
            </div>

            <div className="space-y-6">
                <FinancialsBarChartComponent records={records} fiscalYear={fyNum} compact />
                {isQuarterComparison ? (
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
