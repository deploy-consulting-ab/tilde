'use client';

import { useState } from 'react';
import { ArrowUpDown, MoreHorizontal, RefreshCw, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DatatableWrapperComponent } from '@/components/application/datatable-wrapper';
import { FinancialsFormComponent } from '@/components/application/management/financials/financials-form';
import {
    FinancialsBarChartComponent,
    FinancialsLineChartComponent,
    FinancialsQuarterComparisonChartComponent,
    FinancialsCustomPeriodComparisonChartComponent,
} from '@/components/application/management/financials/financials-chart';
import { FinancialMetricCell } from '@/components/application/management/financials/financial-yoy-badge';
import {
    FinancialsPeriodCompareControls,
    FinancialsCompareQuartersButton,
} from '@/components/application/management/financials/financials-period-compare-controls';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import {
    getFinancialsAction,
    createFinancialRecordAction,
    updateFinancialRecordAction,
    deleteFinancialRecordAction,
} from '@/actions/database/financials-actions';
import { toastRichSuccess, toastRichError } from '@/lib/toast-library';
import {
    formatSEK,
    getCurrentFiscalYear,
    buildComputedTotal,
    getFinancialFiscalYears,
    attachYearOverYearChanges,
    buildCustomPeriodComparison,
} from '@/lib/utils';
import {
    QUARTER_FILTER_OPTIONS,
    ALL_FY_VALUE,
    getQuarterComparisonConfig,
    formatFinancialQuarterLabel,
} from '@/components/application/management/financials/financials-constants';

export function FinancialsListDesktopComponent({
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
            return buildCustomPeriodComparison(records, appliedCompareBase, appliedCompareTarget);
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

    const renderMetricCell = (row, key, invertColors = false) => {
        const value = row.getValue(key);
        if (isCompareActive && row.original._yoy) {
            return (
                <FinancialMetricCell
                    value={value}
                    yoyPercent={row.original._yoy[key]}
                    invertColors={invertColors}
                />
            );
        }
        return <div className="tabular-nums text-foreground/80">{formatSEK(value)}</div>;
    };

    const columns = [
        {
            accessorKey: 'fiscalYear',
            size: 130,
            minSize: 100,
            maxSize: 160,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Fiscal Year
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => {
                const fy = row.getValue('fiscalYear');
                return <div className="font-medium tabular-nums">FY{String(fy).slice(-2)}</div>;
            },
        },
        {
            accessorKey: 'quarter',
            size: 120,
            minSize: 100,
            maxSize: 150,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Quarter
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => {
                const isComputed = row.original._isComputed;
                return (
                    <div className="flex items-center gap-1.5">
                        <span>{formatFinancialQuarterLabel(row.original)}</span>
                        {isComputed && (
                            <span className="text-xs text-muted-foreground">(computed)</span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'revenue',
            size: 150,
            minSize: 120,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Revenue
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => renderMetricCell(row, 'revenue'),
        },
        {
            accessorKey: 'cost',
            size: 150,
            minSize: 120,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Cost
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => renderMetricCell(row, 'cost', true),
        },
        {
            accessorKey: 'profit',
            size: 150,
            minSize: 120,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Profit
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => renderMetricCell(row, 'profit'),
        },
        {
            accessorKey: 'taxes',
            size: 150,
            minSize: 120,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Taxes
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => renderMetricCell(row, 'taxes', true),
        },
        ...(canManage
            ? [
                  {
                      id: 'actions',
                      enableSorting: false,
                      enableHiding: false,
                      maxSize: 10,
                      cell: ({ row }) => {
                          const record = row.original;
                          if (record._isComputed || record._isAggregated) return null;
                          return (
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button
                                          variant="ghost"
                                          className="h-8 w-8 p-0 opacity-50 hover:opacity-100 hover:cursor-pointer"
                                      >
                                          <span className="sr-only">Open menu</span>
                                          <MoreHorizontal />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEditDialog(record)}>
                                          Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() => handleDelete(record.id)}
                                      >
                                          Delete
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          );
                      },
                  },
              ]
            : []),
    ];

    const fyOptions = (() => {
        const all = [...availableFYs];
        if (!all.includes(currentFY)) all.unshift(currentFY);
        return all;
    })();

    const compareView = showCompareSetup ? (
        <FinancialsPeriodCompareControls
            key="compare-controls"
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
        />
    ) : null;

    const fyFilterView = !showCompareSetup ? (
        <Select value={selectedFY} onValueChange={setSelectedFY} key="fy-filter">
            <SelectTrigger className="w-40 hover:cursor-pointer">
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
    ) : null;

    const quarterFilterView = !showCompareSetup ? (
        <Select value={selectedQuarter} onValueChange={setSelectedQuarter} key="quarter-filter">
            <SelectTrigger className="w-60 hover:cursor-pointer">
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
    ) : null;

    const compareAction = (
        <FinancialsCompareQuartersButton
            key="compare-quarters"
            isActive={showCompareSetup}
            onClick={() => (showCompareSetup ? handleCancelCompare() : setShowCompareSetup(true))}
        />
    );

    const createAction = canManage ? (
        <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            key="create-financial"
        >
            <DialogTrigger asChild>
                <Button size="sm" className="hover:cursor-pointer">
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </DialogTrigger>
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
    ) : null;

    const refreshAction = (
        <Button
            key="refresh-financials"
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`hover:cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`}
        >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Refresh data</span>
        </Button>
    );

    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    const views = [compareView, fyFilterView, quarterFilterView].filter(Boolean);
    const actions = [compareAction, createAction, refreshAction].filter(Boolean);

    return (
        <div className="space-y-6">
            <DatatableWrapperComponent
                data={filteredRecords}
                columns={columns}
                pageSize={10}
                views={views}
                actions={actions}
                showPagination={false}
                showSearch={false}
                getRowClassName={(row) =>
                    row.original._isComputed
                        ? 'bg-muted/80 hover:bg-muted/80 dark:bg-muted/100 dark:hover:bg-muted/100'
                        : ''
                }
            />

            <div className="grid grid-cols-2 gap-6">
                <FinancialsBarChartComponent
                    records={records}
                    fiscalYear={
                        isCompareActive && appliedCompareTarget
                            ? appliedCompareTarget.fiscalYear
                            : isAllFY
                              ? defaultFY
                              : parseInt(selectedFY, 10)
                    }
                />
                {isCompareActive && appliedCompareBase && appliedCompareTarget ? (
                    <FinancialsCustomPeriodComparisonChartComponent
                        records={records}
                        basePeriod={appliedCompareBase}
                        comparePeriod={appliedCompareTarget}
                    />
                ) : isQuarterComparison ? (
                    <FinancialsQuarterComparisonChartComponent
                        records={records}
                        quarters={comparisonQuarters}
                        label={comparisonLabel}
                    />
                ) : (
                    <FinancialsLineChartComponent records={records} />
                )}
            </div>

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
