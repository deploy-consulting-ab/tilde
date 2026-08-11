'use client';

import { DatatableWrapperComponent } from '@/components/application/datatable-wrapper';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import { getSystemPermissionByIdAction } from '@/actions/database/system-permission-actions';
import { PERMISSION_SETS_ROUTE, PROFILES_ROUTE } from '@/menus/routes';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';

export function SystemPermissionAssignmentsListComponent({
    allSystemPermissionAssignments,
    error: initialError,
    systemPermissionId,
}) {
    const [systemPermissionAssignmentsData, setSystemPermissionAssignmentsData] = useState(
        allSystemPermissionAssignments
    );
    const [error, setError] = useState(initialError);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [view, setView] = useState('all');

    const handleRefresh = async () => {
        if (isRefreshing) {
            return;
        }
        setIsRefreshing(true);
        let freshData = null;
        try {
            const systemPermissionAssignments =
                await getSystemPermissionByIdAction(systemPermissionId);
            freshData = systemPermissionAssignments.allSystemPermissionAssignments;
            setSystemPermissionAssignmentsData(freshData);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleFilterSystemPermissionAssignments = (value) => {
        let filteredData = null;
        if (value === 'all') {
            filteredData = allSystemPermissionAssignments;
        } else {
            filteredData = allSystemPermissionAssignments.filter(
                (item) => item.entityName === value
            );
        }
        setSystemPermissionAssignmentsData(filteredData);
        setView(value);
    };

    const refreshSystemPermissionAssignments = (
        <Button
            key="refresh-system-permission-assignments"
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

    const viewBySystemPermissionAssignmentsViews = [
        { value: 'all', label: 'All' },
        { value: 'Profile', label: 'Profiles' },
        { value: 'Permission Set', label: 'Permission Sets' },
    ];

    const columns = [
        {
            accessorKey: 'name',
            size: 150,
            minSize: 100,
            maxSize: 400,
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
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Entity ID
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
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
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Description
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
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
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Entity Name
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
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

    const viewBySystemPermissionAssignments = (
        <Select
            value={view}
            onValueChange={handleFilterSystemPermissionAssignments}
            key="view-by-system-permission-assignments"
        >
            <SelectTrigger className="w-45 hover:cursor-pointer">
                <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
                {viewBySystemPermissionAssignmentsViews.map((view) => (
                    <SelectItem key={view.value} value={view.value}>
                        {view.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    const actions = [refreshSystemPermissionAssignments];
    const views = [viewBySystemPermissionAssignments];

    return (
        <DatatableWrapperComponent
            data={systemPermissionAssignmentsData}
            columns={columns}
            placeholder="Filter System Permission Assignments..."
            searchKey="name"
            actions={actions}
            views={views}
            view={view}
        />
    );
}
