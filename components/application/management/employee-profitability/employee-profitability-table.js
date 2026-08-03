'use client';

import { useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import { NoDataComponent } from '@/components/errors/no-data';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { getEmployeeProfitabilityData } from '@/actions/salesforce/salesforce-actions';
import { EMPLOYEES_LIST_ROUTE } from '@/menus/routes';
import { EmployeeFinancialMetrics } from '@/components/application/management/employees/employee-financial-metrics';
import {
    BreakEvenBadge,
    CURRENCY_VALUE_PROMINENT_CLASS,
    EMPLOYEE_FINANCIAL_TOOLTIPS,
    InfoTooltip,
    MetricLabel,
    ProfitBadge,
} from '@/components/application/management/employees/employee-financial-metric-ui';

const SEK = 'SEK';
const fmt = (v) => formatCurrency(v, SEK);

const METRIC_TOOLTIPS = {
    ...EMPLOYEE_FINANCIAL_TOOLTIPS,
    employees: 'Active Full-Time and Part-Time employees with FY assignment data.',
    profitable: 'Employees whose invoiced amount exceeds adjusted cost FYTD.',
    unprofitable: 'Employees whose invoiced amount is below adjusted cost FYTD.',
    totalProfitFYTD: 'Sum of invoiced amount minus adjusted cost FYTD across all employees.',
    project: 'External assignment project name for the current fiscal year.',
    breakEvenFY: 'Invoiced Amount minus Adjusted Cost FY for the full fiscal year.',
};

const PROJECT_COLUMNS = [
    {
        accessorKey: 'projectName',
        header: () => <MetricLabel label="Project" description={METRIC_TOOLTIPS.project} />,
        size: 300,
        minSize: 120,
        maxSize: 500,
        cell: ({ row, getValue }) => {
            const name = getValue();
            if (row.original.isSubtotal) {
                return (
                    <span className="block truncate text-xs font-semibold uppercase tracking-wider text-foreground/80">
                        {name}
                    </span>
                );
            }

            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="block truncate text-sm text-foreground/80 cursor-default">
                            {name}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                        {name}
                    </TooltipContent>
                </Tooltip>
            );
        },
    },
    {
        accessorKey: 'projectedAmountFY',
        header: () => (
            <MetricLabel
                label="Proj. Invoiced FY"
                description={METRIC_TOOLTIPS.projectedInvoicedFY}
                align="right"
            />
        ),
        size: 150,
        minSize: 110,
        maxSize: 280,
        cell: ({ row, getValue }) => (
            <span
                className={`block text-right tabular-nums ${
                    row.original.isSubtotal ? 'text-sm font-semibold' : 'text-sm text-foreground/80'
                }`}
            >
                {fmt(getValue())}
            </span>
        ),
    },
    {
        accessorKey: 'timecardAmount',
        header: () => (
            <MetricLabel
                label="Invoiced FY"
                description={METRIC_TOOLTIPS.invoicedAmount}
                align="right"
            />
        ),
        size: 130,
        minSize: 100,
        maxSize: 240,
        cell: ({ row, getValue }) => (
            <span
                className={`block text-right tabular-nums ${
                    row.original.isSubtotal ? 'text-sm font-semibold' : 'text-sm text-foreground/80'
                }`}
            >
                {fmt(getValue())}
            </span>
        ),
    },
];

function ProjectBreakdownTable({ assignments, totalProjected, totalInvoiced }) {
    const [columnSizing, setColumnSizing] = useState({});

    const data = useMemo(() => {
        const rows = assignments.map((asgn, i) => ({
            id: `project-${i}`,
            projectName: asgn.projectName,
            projectedAmountFY: asgn.projectedAmountFY,
            timecardAmount: asgn.timecardAmount,
            isSubtotal: false,
        }));

        rows.push({
            id: 'subtotal',
            projectName: 'Subtotal',
            projectedAmountFY: totalProjected,
            timecardAmount: totalInvoiced,
            isSubtotal: true,
        });

        return rows;
    }, [assignments, totalProjected, totalInvoiced]);

    const table = useReactTable({
        data,
        columns: PROJECT_COLUMNS,
        getCoreRowModel: getCoreRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onChange',
        state: { columnSizing },
        onColumnSizingChange: setColumnSizing,
    });

    return (
        <div className="mt-2 rounded-lg border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
                <table
                    className="caption-bottom text-sm border-separate border-spacing-0 table-fixed"
                    style={{ width: table.getCenterTotalSize() }}
                >
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                                className="hover:bg-transparent bg-muted/30"
                            >
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="relative text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder ? null : (
                                            <>
                                                <span
                                                    className={
                                                        header.column.id === 'projectName'
                                                            ? 'block truncate pr-3'
                                                            : 'block text-right truncate pr-3'
                                                    }
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                </span>
                                                <div
                                                    role="separator"
                                                    aria-orientation="vertical"
                                                    onMouseDown={header.getResizeHandler()}
                                                    onTouchStart={header.getResizeHandler()}
                                                    onDoubleClick={() => header.column.resetSize()}
                                                    className={`absolute right-0 top-0 z-10 h-full w-3 -mr-1.5 cursor-col-resize select-none touch-none flex items-center justify-center ${
                                                        header.column.getIsResizing()
                                                            ? 'bg-primary/20'
                                                            : ''
                                                    }`}
                                                >
                                                    <div
                                                        className={`h-full w-0.5 rounded-full transition-opacity ${
                                                            header.column.getIsResizing()
                                                                ? 'bg-primary opacity-100'
                                                                : 'bg-border opacity-60 hover:opacity-100'
                                                        }`}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                className={
                                    row.original.isSubtotal
                                        ? 'bg-muted/40 hover:bg-muted/50 border-t border-border/50'
                                        : 'hover:bg-muted/20'
                                }
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        style={{ width: cell.column.getSize() }}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </table>
            </div>
        </div>
    );
}

function EmployeeCard({ employee }) {
    const [expanded, setExpanded] = useState(false);
    const { id, employeeName, adjustedCostFY, adjustedCostFYTD, assignments } = employee;

    const totalProjected = assignments.reduce((s, a) => s + a.projectedAmountFY, 0);
    const totalInvoiced = assignments.reduce((s, a) => s + a.timecardAmount, 0);

    const projProfitFY = totalProjected - adjustedCostFY;
    const profitFY = totalInvoiced - adjustedCostFY;
    const profitFYTD = totalInvoiced - adjustedCostFYTD;

    const isProfitableFYTD = profitFYTD >= 0;
    const hasBreakEvenFY = profitFY > 0;

    return (
        <Card
            className={`relative overflow-hidden transition-all hover:shadow-md border-l-4 ${
                isProfitableFYTD ? 'border-l-deploy-blue' : 'border-l-deploy-accent-orange'
            }`}
        >
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                        {id ? (
                            <Link
                                href={`${EMPLOYEES_LIST_ROUTE}/${id}`}
                                className="font-semibold text-base leading-snug dark:text-deploy-ocean text-deploy-blue hover:underline transition-colors"
                            >
                                {employeeName}
                            </Link>
                        ) : (
                            <h3 className="font-semibold text-base leading-snug">{employeeName}</h3>
                        )}
                        {hasBreakEvenFY && (
                            <BreakEvenBadge description={METRIC_TOOLTIPS.breakEvenFY} />
                        )}
                    </div>
                    <ProfitBadge
                        value={profitFYTD}
                        description={METRIC_TOOLTIPS.profitabilityFYTD}
                    />
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 space-y-4">
                <EmployeeFinancialMetrics
                    adjustedCostFY={adjustedCostFY}
                    adjustedCostFYTD={adjustedCostFYTD}
                    projectedAmountFY={totalProjected}
                    invoicedAmount={totalInvoiced}
                    projectedProfitabilityFY={projProfitFY}
                    profitabilityFY={profitFY}
                    profitabilityFYTD={profitFYTD}
                />

                {/* Expandable project list */}
                {assignments.length > 0 && (
                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                        >
                            {expanded ? (
                                <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                                <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                            <span>
                                {assignments.length} project{assignments.length !== 1 ? 's' : ''}
                            </span>
                        </button>

                        {expanded && (
                            <ProjectBreakdownTable
                                assignments={assignments}
                                totalProjected={totalProjected}
                                totalInvoiced={totalInvoiced}
                            />
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function SummaryStrip({ employees }) {
    const total = employees.length;
    const profitable = employees.filter((e) => {
        const inv = e.assignments.reduce((s, a) => s + a.timecardAmount, 0);
        return inv - e.adjustedCostFYTD >= 0;
    }).length;

    const totals = employees.reduce(
        (acc, e) => {
            const inv = e.assignments.reduce((s, a) => s + a.timecardAmount, 0);
            acc.invoiced += inv;
            acc.costFYTD += e.adjustedCostFYTD;
            return acc;
        },
        { invoiced: 0, costFYTD: 0 }
    );
    const totalProfitFYTD = totals.invoiced - totals.costFYTD;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 min-w-0">
            {[
                {
                    label: 'Employees',
                    value: total,
                    isCount: true,
                    description: METRIC_TOOLTIPS.employees,
                },
                {
                    label: 'Profitable',
                    value: profitable,
                    isCount: true,
                    positive: true,
                    description: METRIC_TOOLTIPS.profitable,
                },
                {
                    label: 'Unprofitable',
                    value: total - profitable,
                    isCount: true,
                    negative: true,
                    description: METRIC_TOOLTIPS.unprofitable,
                },
                {
                    label: 'Total Profit FYTD',
                    value: fmt(totalProfitFYTD),
                    profit: totalProfitFYTD,
                    description: METRIC_TOOLTIPS.totalProfitFYTD,
                },
            ].map((item) => (
                <div
                    key={item.label}
                    className="min-w-0 rounded-xl border border-border/30 bg-card px-4 py-3 shadow-sm"
                >
                    <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 min-w-0">
                        <span className="wrap-anywhere">{item.label}</span>
                        <InfoTooltip label={item.label} description={item.description} />
                    </p>
                    <p
                        className={`font-bold ${
                            item.isCount ? 'text-xl tabular-nums' : CURRENCY_VALUE_PROMINENT_CLASS
                        } ${
                            item.profit !== undefined
                                ? item.profit >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-500 dark:text-red-400'
                                : item.positive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : item.negative
                                    ? 'text-red-500 dark:text-red-400'
                                    : 'text-foreground'
                        }`}
                    >
                        {item.value}
                    </p>
                </div>
            ))}
        </div>
    );
}

export function EmployeeProfitabilityTableComponent({
    employees: initialEmployees,
    error: initialError,
}) {
    const [employees, setEmployees] = useState(initialEmployees ?? []);
    const [error, setError] = useState(initialError ?? null);
    const [search, setSearch] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const fresh = await getEmployeeProfitabilityData();
            setEmployees(fresh);
            setError(null);
        } catch (err) {
            setError(err?.message ?? 'Failed to load profitability data.');
        } finally {
            setIsRefreshing(false);
        }
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return employees;
        const q = search.toLowerCase();
        return employees.filter((e) => e.employeeName.toLowerCase().includes(q));
    }, [employees, search]);

    if (error) return <ErrorDisplayComponent error={error} />;

    return (
        <>
            <SummaryStrip employees={filtered} />

            <div className="flex items-center justify-between mb-4">
                <Input
                    placeholder="Filter by employee name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm bg-card border-border/50 focus-visible:ring-0 focus-visible:border-border transition-[border-color] duration-300 ease-in-out"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`md:hover:cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`}
                >
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Refresh data</span>
                </Button>
            </div>

            {filtered.length === 0 ? (
                <div className="rounded-xl border border-border/30 bg-card shadow-sm">
                    <NoDataComponent text="No profitability data found" />
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {filtered.map((emp) => (
                        <EmployeeCard key={emp.employeeId} employee={emp} />
                    ))}
                </div>
            )}
        </>
    );
}
