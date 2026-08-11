'use client';

import { DatatableWrapperComponent } from '@/components/application/datatable-wrapper';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import { getEmployees } from '@/actions/salesforce/salesforce-actions';
import { useState } from 'react';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import Link from 'next/link';
import { EMPLOYEES_LIST_ROUTE } from '@/menus/routes';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateToSwedish } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export function EmployeesListDesktopComponent({ employees, error: initialError }) {
    const [employeesData, setEmployeesData] = useState(employees);
    const [error, setError] = useState(initialError);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [employmentType, setEmploymentType] = useState('all');

    const employmentTypeViews = [
        { value: 'all', label: 'All Types' },
        { value: 'Full-Time', label: 'Full-Time' },
        { value: 'Part-Time', label: 'Part-Time' },
        { value: 'Subcontractor', label: 'Subcontractor' },
        { value: 'Intern', label: 'Intern' },
        { value: 'Non-Hired', label: 'Non-Hired' },
    ];

    const handleFilterEmploymentType = (value) => {
        let filteredData = null;
        if (value === 'all') {
            filteredData = employees;
        } else {
            filteredData = employees.filter((item) => item.employmentType === value);
        }
        setEmployeesData(filteredData);
        setEmploymentType(value);
    };

    const handleRefresh = async () => {
        if (isRefreshing) {
            return;
        }
        setIsRefreshing(true);

        try {
            const freshData = await getEmployees();
            setEmployeesData(freshData);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setIsRefreshing(false);
        }
    };

    const columns = [
        {
            accessorKey: 'name',
            size: 300,
            minSize: 200,
            maxSize: 500,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Name
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const id = row.original.id;
                return (
                    <Link
                        href={`${EMPLOYEES_LIST_ROUTE}/${id}`}
                        className="cursor-pointer font-medium dark:text-deploy-ocean text-deploy-blue hover:underline truncate transition-colors"
                        title={row.getValue('name')}
                    >
                        {row.getValue('name')}
                    </Link>
                );
            },
        },
        {
            accessorKey: 'employeeId',
            size: 150,
            minSize: 100,
            maxSize: 200,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Employee ID
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="text-foreground/70 tabular-nums">
                    {row.getValue('employeeId') ?? '-'}
                </div>
            ),
        },
        {
            accessorKey: 'isActive',
            size: 100,
            minSize: 100,
            maxSize: 100,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Active
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const isActive = row.original.isActive;
                return (
                    <div className="flex items-start gap-3">
                        <Checkbox id="toggle" checked={isActive} disabled={!isActive} />
                    </div>
                );
            },
        },
        {
            accessorKey: 'employmentType',
            size: 100,
            minSize: 100,
            maxSize: 100,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Employment Type
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="text-foreground/70 tabular-nums">
                    {row.getValue('employmentType') ?? '-'}
                </div>
            ),
        },
        {
            accessorKey: 'employmentStartDate',
            size: 100,
            minSize: 100,
            maxSize: 100,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Employment Start Date
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="text-foreground/70 tabular-nums">
                    {row.getValue('employmentStartDate')
                        ? formatDateToSwedish(row.getValue('employmentStartDate'))
                        : '-'}
                </div>
            ),
        },
        {
            accessorKey: 'employmentEndDate',
            size: 100,
            minSize: 100,
            maxSize: 100,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Employment End Date
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="text-foreground/70 tabular-nums">
                    {row.getValue('employmentEndDate')
                        ? formatDateToSwedish(row.getValue('employmentEndDate'))
                        : '-'}
                </div>
            ),
        },
    ];

    const refreshEmployees = (
        <Button
            key="refresh-employees"
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`md:hover:cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`}
        >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Refresh data</span>
        </Button>
    );

    const viewByEmploymentType = (
        <Select
            value={employmentType}
            onValueChange={handleFilterEmploymentType}
            key="view-by-employment-type"
        >
            <SelectTrigger className="w-45 hover:cursor-pointer">
                <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
                {employmentTypeViews.map((view) => (
                    <SelectItem key={view.value} value={view.value}>
                        {view.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    const actions = [refreshEmployees];
    const views = [viewByEmploymentType];

    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    return (
        <DatatableWrapperComponent
            data={employeesData}
            columns={columns}
            placeholder="Filter Employees..."
            searchKey="name"
            actions={actions}
            views={views}
            view={employmentType}
        />
    );
}
