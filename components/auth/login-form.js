'use client';

import { LoginSchema } from '@/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/auth/form/form-error';
import { FormSuccess } from '@/components/auth/form/form-success';
import { CardWrapperComponent } from '@/components/auth/card-wrapper';

import { login } from '@/actions/login';
import { setClientType } from '@/actions/set-client-type';
import { getAuthClientTypeFromWindow } from '@/lib/auth-session';
import { useState, useTransition } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useSearchParams } from 'next/navigation';

export const LoginFormComponent = () => {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl');

    const form = useForm({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const [isPending, startTransition] = useTransition();
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const onSubmit = (values) => {
        setSuccess('');
        setError('');

        startTransition(async () => {
            await setClientType(getAuthClientTypeFromWindow());
            const response = await login(values, callbackUrl);
            setSuccess(response.success);
            setError(response.error);
        });
    };

    return (
        <CardWrapperComponent showSocial={true} showBackButton={false} showLogo={true}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-dark dark:text-white">
                                        Email
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            disabled={isPending}
                                            placeholder="john.doe@deployconsulting.se"
                                            {...field}
                                            className="input shadow-box input-focus-effect"
                                            suppressHydrationWarning
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-black dark:text-white">
                                        Password
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                disabled={isPending}
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="******"
                                                {...field}
                                                className="input shadow-box input-focus-effect"
                                                suppressHydrationWarning
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormError message={error} />
                    <FormSuccess message={success} />
                    <Button
                        type="submit"
                        variant="outline"
                        className="w-full bg-black text-white  dark:text-white
                                    hover:bg-black/80
                                    hover:text-white
                                    dark:bg-primary
                                    dark:hover:bg-primary/70 
                                    dark:hover:text-white font-medium transition-all duration-300
                                    border-none hover:cursor-pointer"
                        disabled={isPending}
                        suppressHydrationWarning
                    >
                        {isPending ? (
                            <Spinner size="sm" variant="white" label="Logging in..." />
                        ) : (
                            'Login'
                        )}
                    </Button>
                </form>
            </Form>
        </CardWrapperComponent>
    );
};
