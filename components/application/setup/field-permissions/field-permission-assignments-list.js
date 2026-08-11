'use client';

import { DatatableWrapperComponent } from '@/components/application/datatable-wrapper';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import { getFieldPermissionByIdAction } from '@/actions/database/field-permission-actions';
import { PERMISSION_SETS_ROUTE, PROFILES_ROUTE } from '@/menus/routes';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';

export function FieldPermissionAssignmentsListComponent({
    allAssignments,
    error: initialError,
    fieldPermissionId,
}) {
    const [assignmentsData, setAssignmentsData] = useState(allAssignments);
    const [error, setError] = useState(initialError);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [view, setView] = useState('all');

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const result = await getFieldPermissionByIdAction(fieldPermissionId);
            setAssignmentsData(result.allAssignments);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleFilterView = (value) => {
        if (value === 'all') {
            setAssignmentsData(allAssignments);
        } else {
            setAssignmentsData(allAssignments.filter((item) => item.entityName === value));
        }
        setView(value);
    };

    const columns = [
        {
            accessorKey: 'name',
            size: 150,
            minSize: 100,
            maxSize: 400,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Name
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => {
                const id = row.original.id;
                const entityName = row.original.entityName;
                const route = entityName === 'Profile' ? PROFILES_ROUTE : PERMISSION_SETS_ROUTE;
                return (
                    <Link
                        href={`${route}/${id}`}
                        className="cursor-pointer font-medium dark:text-deploy-ocean text-deploy-blue hover:underline truncate transition-colors"
                        title={row.getValue('name')}
                    >
                        {row.getValue('name')}
                    </Link>
                );
            },
        },
        {
            accessorKey: 'id',
            size: 150,
            minSize: 100,
            maxSize: 400,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Entity ID
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => (
                <div
                    className="truncate text-foreground/70 font-mono text-xs"
                    title={row.getValue('id')}
                >
                    {row.getValue('id')}
                </div>
            ),
        },
        {
            accessorKey: 'description',
            size: 200,
            minSize: 150,
            maxSize: 300,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Description
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="truncate text-foreground/80" title={row.getValue('description')}>
                    {row.getValue('description')}
                </div>
            ),
        },
        {
            accessorKey: 'entityName',
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
                    Entity Type
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="truncate text-foreground/80" title={row.getValue('entityName')}>
                    {row.getValue('entityName')}
                </div>
            ),
        },
    ];

    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    const viewFilter = (
        <Select value={view} onValueChange={handleFilterView} key="view-filter">
            <SelectTrigger className="w-45 hover:cursor-pointer">
                <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
                {[
                    { value: 'all', label: 'All' },
                    { value: 'Profile', label: 'Profiles' },
                    { value: 'Permission Set', label: 'Permission Sets' },
                ].map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                        {v.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    const refreshButton = (
        <Button
            key="refresh-assignments"
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

    return (
        <DatatableWrapperComponent
            data={assignmentsData}
            columns={columns}
            placeholder="Filter assignments..."
            searchKey="name"
            actions={[refreshButton]}
            views={[viewFilter]}
            view={view}
        />
    );
}
