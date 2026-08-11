'use client';

import { DatatableWrapperComponent } from '@/components/application/datatable-wrapper';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, RefreshCw, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import Link from 'next/link';
import {
    ADMIN_PROFILE,
    SALES_PROFILE,
    CONSULTANT_PROFILE,
    MANAGEMENT_PROFILE,
    SUBCONTRACTOR_PROFILE,
} from '@/lib/rba-constants';
import { CreateUserComponent } from '@/components/application/setup/users/create-user';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { getUsersAction, deleteUserAction } from '@/actions/database/user-actions';
import { HOME_ROUTE, USERS_ROUTE } from '@/menus/routes';
import { toastRichSuccess, toastRichError } from '@/lib/toast-library';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useImpersonation } from '@/hooks/use-impersonation';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';

export function UsersListComponent({ users, error: initialError }) {
    const [usersData, setUsersData] = useState(users);
    const [error, setError] = useState(initialError);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [view, setView] = useState('all');

    const { startImpersonation } = useImpersonation();
    const router = useRouter();

    const handleRefresh = async () => {
        if (isRefreshing) {
            return;
        }
        setIsRefreshing(true);

        let freshData = null;
        try {
            freshData = await getUsersAction();
            setUsersData(freshData);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleFilterProfiles = (value) => {
        let filteredData = null;

        if (value === 'all') {
            filteredData = users;
        } else {
            filteredData = users.filter(
                (item) => item['profileId'].toLowerCase() === value.toLowerCase()
            );
        }

        setUsersData(filteredData);
        setView(value);
    };

    const handleSuccess = () => {
        setIsDialogOpen(false);
        handleRefresh();
        toastRichSuccess({
            message: 'User created',
        });
    };

    const deleteUser = async (id) => {
        try {
            await deleteUserAction(id);
            await handleRefresh();
            toastRichSuccess({
                message: 'User deleted!',
            });
        } catch (error) {
            toastRichError({
                message: error.message,
            });
        }
    };

    const handleImpersonation = async (id, name) => {
        try {
            await startImpersonation(id);
            toastRichSuccess({
                message: `Viewing as ${name}`,
            });
            router.push(HOME_ROUTE);
        } catch (error) {
            toastRichError({
                message: error.message,
            });
        }
    };

    const profileViews = [
        { value: 'all', label: 'All Users' },
        { value: ADMIN_PROFILE, label: 'Admin Users' },
        { value: SALES_PROFILE, label: 'Sales Users' },
        { value: CONSULTANT_PROFILE, label: 'Consultant Users' },
        { value: MANAGEMENT_PROFILE, label: 'Manager Users' },
        { value: SUBCONTRACTOR_PROFILE, label: 'Subcontractor Users' },
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
                return (
                    <Link
                        href={`${USERS_ROUTE}/${id}`}
                        className="cursor-pointer font-medium dark:text-deploy-ocean text-deploy-blue hover:underline truncate transition-colors"
                        title={row.getValue('name')}
                    >
                        {row.getValue('name')}
                    </Link>
                );
            },
        },
        {
            accessorKey: 'email',
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
                        Email
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="truncate text-foreground/80" title={row.getValue('email')}>
                    {row.getValue('email')}
                </div>
            ),
        },
        {
            accessorKey: 'employeeNumber',
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
                        Employee Number
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div
                    className="truncate text-foreground/70 tabular-nums"
                    title={row.getValue('employeeNumber')}
                >
                    {row.getValue('employeeNumber')}
                </div>
            ),
        },
        {
            accessorKey: 'profileId',
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
                        Profile
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                return (
                    <div className="truncate text-foreground/80" title={row.getValue('profileId')}>
                        {row.getValue('profileId')}
                    </div>
                );
            },
        },
        {
            accessorKey: 'isActive',
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
            id: 'actions',
            enableSorting: false,
            enableHiding: false,
            maxSize: 10,
            cell: ({ row }) => {
                const user = row.original;
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
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => deleteUser(row.original.id)}
                            >
                                Delete User
                            </DropdownMenuItem>
                            {user.isActive && (
                                <DropdownMenuItem
                                    onClick={() => handleImpersonation(user.id, user.name)}
                                >
                                    View As
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const createUserAction = (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} key="create-user">
            <DialogTrigger asChild>
                <Button size="sm" className="hover:cursor-pointer" variant="default">
                    <UserPlus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create new user</DialogTitle>
                    <DialogDescription>
                        Fill in the details to create a new user account.
                    </DialogDescription>
                </DialogHeader>
                <CreateUserComponent fireSuccess={handleSuccess} />
            </DialogContent>
        </Dialog>
    );

    const refreshUsers = (
        <Button
            key="refresh-users"
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

    const viewByProfiles = (
        <Select value={view} onValueChange={handleFilterProfiles} key="view-by-profiles">
            <SelectTrigger className="w-45 hover:cursor-pointer">
                <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
                {profileViews.map((view) => (
                    <SelectItem key={view.value} value={view.value}>
                        {view.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    const actions = [createUserAction, refreshUsers];
    const views = [viewByProfiles];

    return (
        <DatatableWrapperComponent
            data={usersData}
            columns={columns}
            placeholder="Filter Users..."
            views={views}
            view={view}
            searchKey="name"
            actions={actions}
        />
    );
}
