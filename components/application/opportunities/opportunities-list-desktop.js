'use client';

import { DatatableWrapperComponent } from '@/components/application/datatable-wrapper';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import { formatDateToSwedish } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getOpportunities } from '@/actions/salesforce/salesforce-actions';
import { useState } from 'react';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getOpportunityStageColor } from '@/lib/utils';
import Link from 'next/link';
import { OPPORTUNITIES_ROUTE } from '@/menus/routes';

export function OpportunitiesListDesktopComponent({
    opportunities,
    error: initialError,
    opportunityViews,
}) {
    const [opportunitiesData, setOpportunitiesData] = useState(opportunities);
    const [error, setError] = useState(initialError);

    const [view, setView] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (isRefreshing) {
            return;
        }
        setIsRefreshing(true);

        let freshData = null;
        try {
            freshData = await getOpportunities();
            setOpportunitiesData(freshData);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleFilterOpportunities = (value) => {
        let filteredData = null;

        if (value === 'all') {
            filteredData = opportunities;
        } else {
            filteredData = opportunities.filter((opp) => opp.stage === value);
        }

        setOpportunitiesData(filteredData);
        setView(value);
    };

    const columns = [
        {
            accessorKey: 'name',
            size: 250,
            minSize: 200,
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
                return (
                    <Link
                        href={`${OPPORTUNITIES_ROUTE}/${id}`}
                        className="cursor-pointer font-medium dark:text-deploy-ocean text-deploy-blue hover:underline truncate transition-colors"
                        title={row.getValue('name')}
                    >
                        {row.getValue('name')}
                    </Link>
                );
            },
        },
        {
            accessorKey: 'accountName',
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
                        Account Name
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="truncate text-foreground/80" title={row.getValue('accountName')}>
                    {row.getValue('accountName')}
                </div>
            ),
        },
        {
            accessorKey: 'stage',
            size: 150,
            minSize: 120,
            maxSize: 200,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Stage
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const stage = row.getValue('stage');
                return (
                    <Badge className={`${getOpportunityStageColor(stage)} text-white shadow-sm`}>
                        {stage}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'closeDate',
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
                        Close Date
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="text-foreground/70 tabular-nums">
                    {row.getValue('closeDate')
                        ? formatDateToSwedish(row.getValue('closeDate'))
                        : '-'}
                </div>
            ),
        },
        {
            accessorKey: 'amount',
            header: ({ column }) => {
                return (
                    <div className="text-right">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 -mr-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent hover:cursor-pointer"
                            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        >
                            Amount
                            <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                        </Button>
                    </div>
                );
            },
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue('amount'));
                const currency = row.original.currency;

                if (!amount) {
                    return <div className="text-right font-medium text-foreground/70">-</div>;
                }

                const formatted = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency,
                }).format(amount);

                return <div className="text-right font-medium tabular-nums">{formatted}</div>;
            },
        },
    ];

    const refreshOpportunities = (
        <Button
            key="refresh-opportunities"
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

    const viewByOpportunities = (
        <Select value={view} onValueChange={handleFilterOpportunities} key="view-by-opportunities">
            <SelectTrigger className="w-45 hover:cursor-pointer">
                <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
                {opportunityViews.map((view) => (
                    <SelectItem key={view.value} value={view.value}>
                        {view.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    const actions = [refreshOpportunities];
    const views = [viewByOpportunities];

    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    return (
        <DatatableWrapperComponent
            data={opportunitiesData}
            columns={columns}
            placeholder="Filter Opportunities..."
            views={views}
            view={view}
            searchKey="name"
            actions={actions}
        />
    );
}
