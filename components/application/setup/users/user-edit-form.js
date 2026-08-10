'use client';

import { useForm } from 'react-hook-form';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PROFILES, PROFILE_LABELS } from '@/lib/rba-constants';
import { FormError } from '@/components/auth/form/form-error';
import { FormSuccess } from '@/components/auth/form/form-success';
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';

export function UserEditForm({ user, onEditingChange, onSubmit }) {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        defaultValues: {
            employeeNumber: user.employeeNumber || '',
            flexEmployeeId: user.flexEmployeeId || '',
            profileId: user.profileId || '',
            homeLayoutKey: user.homeLayoutKey || 'none',
            isActive: user.isActive || true,
            carriedOverHolidays: user.carriedOverHolidays || 0,
            vacationEarnedDays: user.vacationEarnedDays ?? 0,
            vacationAdvanceDays: user.vacationAdvanceDays ?? 0,
        },
    });

    // Effect to handle fade out animation
    useEffect(() => {
        let fadeOutTimer;
        let removeTimer;

        if (success) {
            setIsVisible(true);
            // Start fade out after 1 second
            fadeOutTimer = setTimeout(() => {
                setIsVisible(false);
                // Remove message after animation completes (0.5s)
                removeTimer = setTimeout(() => {
                    setSuccess('');
                }, 500);
            }, 1000);
        }

        return () => {
            clearTimeout(fadeOutTimer);
            clearTimeout(removeTimer);
        };
    }, [success]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = form.getValues();
        setSuccess('');
        setError('');
        setIsSubmitting(true);
        try {
            await onSubmit(data);
            form.reset(data);
            setSuccess('User updated successfully');
        } catch (err) {
            setError(err.message || 'An error occurred while updating the user');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Employee Number */}
                    <FormField
                        control={form.control}
                        name="employeeNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Employee Number</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Enter employee number" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Flex Employee ID */}
                    <FormField
                        control={form.control}
                        name="flexEmployeeId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Flex Employee ID</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Enter Flex Employee ID" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Profile */}
                    <FormField
                        control={form.control}
                        name="profileId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Profile</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="hover:cursor-pointer w-full">
                                            <SelectValue placeholder="Select a profile" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {PROFILES.map((profile) => (
                                            <SelectItem key={profile} value={profile}>
                                                {PROFILE_LABELS[profile]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Home Layout Override */}
                    <FormField
                        control={form.control}
                        name="homeLayoutKey"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Home Layout</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="hover:cursor-pointer w-full">
                                            <SelectValue placeholder="Default (from profile)" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">Default (from profile)</SelectItem>
                                        {PROFILES.map((profile) => (
                                            <SelectItem key={profile} value={profile}>
                                                {PROFILE_LABELS[profile]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/** Is Active */}
                    <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Active</FormLabel>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <p className="text-sm font-medium pt-2">Flex vacation balances (ingoing)</p>
                    <p className="text-xs text-muted-foreground -mt-2 mb-2">
                        Enter ingoing values at semester start (1 April) from Flex Period Information.
                        Used days are calculated automatically from Flex absences; Available = Total − Used.
                    </p>

                    <FormField
                        control={form.control}
                        name="vacationEarnedDays"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Earned Vacation Days</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="number"
                                        step="0.5"
                                        placeholder="0"
                                    />
                                </FormControl>
                                <FormDescription>
                                    Flex: Ingoing Vacation Days at semester start.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Saved vacation days (Flex: sparad semester) */}
                    <FormField
                        control={form.control}
                        name="carriedOverHolidays"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Saved Vacation Days</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="number"
                                        step="0.5"
                                        placeholder="0"
                                    />
                                </FormControl>
                                <FormDescription>
                                    Flex: Ingoing Vacation, saved days at semester start.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="vacationAdvanceDays"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Advance Vacation Days</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="number"
                                        step="0.5"
                                        placeholder="0"
                                    />
                                </FormControl>
                                <FormDescription>
                                    Flex: Ingoing Vacation (advance) at semester start.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-end gap-4 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onEditingChange(false)}
                            className="hover:cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="hover:cursor-pointer"
                        >
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </form>
            </Form>
            <div className="mt-4">
                <FormError message={error} />
                <div
                    className={`transition-opacity duration-500 ease-in-out ${
                        isVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    <FormSuccess message={success} />
                </div>
            </div>
        </>
    );
}
