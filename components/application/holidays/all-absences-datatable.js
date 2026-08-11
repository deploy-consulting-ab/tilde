'use client';

import { useMemo, useReducer } from 'react';
import { DatatableWrapperComponent } from '@/components/application/datatable-wrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { getAllAbsence } from '@/actions/flex/flex-actions';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import {
    countSwedishBusinessDaysLocalInclusive,
    formatDateToISOString,
    getAbsenceStatusColor,
    getAbsenceStatusText,
    parseToLocalDate,
} from '@/lib/utils';
import {
    ABSENCE_STATUS_CODE,
    HOLIDAY_TYPE_ID,
    SICK_LEAVE_TYPE_ID,
    PARENTAL_LEAVE_10_DAYS_TYPE_ID,
    ABSENCE_STATUS_TYPE_TEXT,
    PARENTAL_LEAVE_TYPE_ID,
} from '@/actions/flex/constants';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const absenceTypeViews = [
    { value: 'all', label: 'All Types' },
    { value: HOLIDAY_TYPE_ID, label: ABSENCE_STATUS_TYPE_TEXT[HOLIDAY_TYPE_ID] },
    { value: SICK_LEAVE_TYPE_ID, label: ABSENCE_STATUS_TYPE_TEXT[SICK_LEAVE_TYPE_ID] },
    {
        value: PARENTAL_LEAVE_10_DAYS_TYPE_ID,
        label: ABSENCE_STATUS_TYPE_TEXT[PARENTAL_LEAVE_10_DAYS_TYPE_ID],
    },
    { value: PARENTAL_LEAVE_TYPE_ID, label: ABSENCE_STATUS_TYPE_TEXT[PARENTAL_LEAVE_TYPE_ID] },
];

const columns = [
    {
        accessorKey: 'FromDate',
        header: 'Start Date',
        cell: ({ row }) => {
            const date = row.getValue('FromDate');
            return date ? formatDateToISOString(date) : '-';
        },
    },
    {
        accessorKey: 'ToDate',
        header: 'To Date',
        cell: ({ row }) => {
            const date = row.getValue('ToDate');
            return date ? formatDateToISOString(date) : '-';
        },
    },
    {
        id: 'Days',
        header: 'Days',
        cell: ({ row }) => {
            const fromDate = parseToLocalDate(row.original.FromDate);
            const toDate = parseToLocalDate(row.original.ToDate);
            if (!fromDate || !toDate) return '-';
            const days = countSwedishBusinessDaysLocalInclusive(fromDate, toDate);
            return days;
        },
    },
    {
        accessorKey: 'Hours',
        header: 'Hours',
        cell: ({ row }) => {
            const hours = row.getValue('Hours');
            return hours !== null && hours !== undefined ? hours : '-';
        },
    },
    {
        accessorKey: 'CurrentStatus',
        header: 'Status',
        cell: ({ row }) => {
            const currentStatus = row.getValue('CurrentStatus');
            const statusCode = currentStatus?.Status;
            const statusText = ABSENCE_STATUS_CODE[statusCode] || 'Unknown';
            const colorClass = getAbsenceStatusColor(statusText);

            return <Badge className={`${colorClass} text-white`}>{statusText}</Badge>;
        },
    },
    {
        accessorKey: 'AbsenceTypeId',
        header: 'Absence Type',
        cell: ({ row }) => {
            const absenceTypeId = row.getValue('AbsenceTypeId');
            return getAbsenceStatusText(absenceTypeId) || '-';
        },
    },
];

function applyAbsenceFilter(data, filterValue) {
    if (filterValue === 'all') {
        return data;
    }

    return data.filter((absence) => absence.AbsenceTypeId === filterValue);
}

function absencesListReducer(state, action) {
    switch (action.type) {
        case 'setView':
            return { ...state, selectedView: action.view };
        case 'refreshStart':
            return { ...state, isRefreshing: true };
        case 'refreshSuccess':
            return {
                ...state,
                isRefreshing: false,
                absencesOverride: action.data,
                refreshError: null,
            };
        case 'refreshError':
            return { ...state, isRefreshing: false, refreshError: action.error };
        default:
            return state;
    }
}

export function AllAbsencesDatatableComponent({ absences, employeeNumber }) {
    const [state, dispatch] = useReducer(absencesListReducer, {
        selectedView: null,
        absencesOverride: null,
        refreshError: null,
        isRefreshing: false,
    });

    const view = state.selectedView ?? 'all';
    const error = state.refreshError;
    const sourceAbsences = state.absencesOverride ?? absences;

    const absencesData = useMemo(
        () => applyAbsenceFilter(sourceAbsences, view),
        [sourceAbsences, view]
    );

    const handleRefresh = async () => {
        if (state.isRefreshing) {
            return;
        }

        dispatch({ type: 'refreshStart' });

        try {
            const response = await getAllAbsence(employeeNumber);
            dispatch({ type: 'refreshSuccess', data: response.Result });
        } catch (err) {
            dispatch({ type: 'refreshError', error: err });
        }
    };

    const handleFilterAbsences = (value) => {
        dispatch({ type: 'setView', view: value });
    };

    const viewByAbsenceType = (
        <Select value={view} onValueChange={handleFilterAbsences} key="view-by-absence-type">
            <SelectTrigger className="w-45 hover:cursor-pointer">
                <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
                {absenceTypeViews.map((viewOption) => (
                    <SelectItem key={viewOption.value} value={viewOption.value}>
                        {viewOption.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    const refreshAbsences = (
        <Button
            key="refresh-absences"
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={state.isRefreshing}
            className={`md:hover:cursor-pointer ${state.isRefreshing ? 'animate-spin' : ''}`}
        >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Refresh data</span>
        </Button>
    );

    const actions = [refreshAbsences];
    const views = [viewByAbsenceType];

    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    return (
        <div className="w-full">
            <DatatableWrapperComponent
                data={absencesData}
                columns={columns}
                placeholder="Search by date..."
                searchKey="FromDate"
                pageSize={10}
                views={views}
                actions={actions}
            />
        </div>
    );
}
