'use client';

import { DatatableWrapperComponent } from '@/components/application/datatable-wrapper';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import { formatDateToSwedish, getAssignmentStageColor } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { getAssignmentsByEmployeeNumber } from '@/actions/salesforce/salesforce-actions';
import { useMemo, useReducer } from 'react';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';

function filterAssignmentsByView(assignments, view) {
    if (view === 'all') {
        return assignments;
    }

    return assignments.filter((item) => item.projectStatus.toLowerCase() === view.toLowerCase());
}

function assignmentsListReducer(state, action) {
    switch (action.type) {
        case 'setView':
            return { ...state, selectedView: action.view };
        case 'syncViewParam':
            return { ...state, selectedView: null, prevViewParam: action.viewParam };
        case 'refreshStart':
            return { ...state, isRefreshing: true };
        case 'refreshSuccess':
            return {
                ...state,
                isRefreshing: false,
                assignmentsOverride: action.data,
                refreshError: null,
            };
        case 'refreshError':
            return { ...state, isRefreshing: false, refreshError: action.error };
        default:
            return state;
    }
}

export function AssignmentsListDesktopComponent({
    assignments,
    employeeNumber,
    error: initialError,
    projectViews,
    assignmentRoute,
}) {
    const searchParams = useSearchParams();
    const viewParam = searchParams.get('view') || 'all';

    const [state, dispatch] = useReducer(assignmentsListReducer, {
        selectedView: null,
        prevViewParam: viewParam,
        assignmentsOverride: null,
        refreshError: null,
        isRefreshing: false,
    });

    if (viewParam !== state.prevViewParam) {
        dispatch({ type: 'syncViewParam', viewParam });
    }

    const view = state.selectedView ?? viewParam;
    const error = state.refreshError ?? initialError;
    const sourceAssignments = state.assignmentsOverride ?? assignments;

    const assignmentData = useMemo(
        () => filterAssignmentsByView(sourceAssignments, view),
        [sourceAssignments, view]
    );

    const handleRefresh = async () => {
        if (state.isRefreshing) {
            return;
        }

        dispatch({ type: 'refreshStart' });

        try {
            const freshData = await getAssignmentsByEmployeeNumber(employeeNumber);
            dispatch({ type: 'refreshSuccess', data: freshData });
        } catch (err) {
            dispatch({ type: 'refreshError', error: err });
        }
    };

    const handleFilterAssignment = (value) => {
        dispatch({ type: 'setView', view: value });
    };

    const columns = [
        {
            accessorKey: 'name',
            size: 80,
            minSize: 80,
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
                        href={`${assignmentRoute}/${id}`}
                        className="cursor-pointer font-medium dark:text-deploy-ocean text-deploy-blue hover:underline truncate transition-colors"
                        title={row.getValue('name')}
                    >
                        {row.getValue('name')}
                    </Link>
                );
            },
        },
        {
            accessorKey: 'projectName',
            size: 300,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Project Name
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="truncate text-foreground/80" title={row.getValue('projectName')}>
                    {row.getValue('projectName')}
                </div>
            ),
        },
        {
            accessorKey: 'projectStatus',
            size: 150,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Project Status
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const projectStatus = row.getValue('projectStatus');
                return (
                    <Badge
                        className={`${getAssignmentStageColor(projectStatus)} text-white shadow-sm`}
                    >
                        {projectStatus}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'startDate',
            size: 120,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Start Date
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="text-foreground/70 tabular-nums">
                    {row.getValue('startDate')
                        ? formatDateToSwedish(row.getValue('startDate'))
                        : '-'}
                </div>
            ),
        },
        {
            accessorKey: 'endDate',
            size: 120,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        End Date
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="text-foreground/70 tabular-nums">
                    {row.getValue('endDate') ? formatDateToSwedish(row.getValue('endDate')) : '-'}
                </div>
            ),
        },
    ];

    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    const refreshAssignments = (
        <Button
            key="refresh-assignments"
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={state.isRefreshing}
            className="hover:cursor-pointer"
        >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Refresh data</span>
        </Button>
    );

    const viewByProjects = (
        <Select value={view} onValueChange={handleFilterAssignment} key="view-by-projects">
            <SelectTrigger className="w-45 hover:cursor-pointer">
                <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
                {projectViews.map((view) => (
                    <SelectItem key={view.value} value={view.value}>
                        {view.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    const actions = [refreshAssignments];
    const views = [viewByProjects];

    return (
        <DatatableWrapperComponent
            data={assignmentData}
            columns={columns}
            placeholder="Filter Assignments..."
            views={views}
            view={view}
            searchKey="projectName"
            actions={actions}
        />
    );
}
