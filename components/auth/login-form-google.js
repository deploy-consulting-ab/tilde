'use client';

import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { CardWrapperComponent } from '@/components/auth/card-wrapper';
import { loginGoogle } from '@/actions/login-google';
import { setClientType } from '@/actions/set-client-type';
import { getAuthClientTypeFromWindow } from '@/lib/auth-session';
import { useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';

export const LoginFormGoogleComponent = () => {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl');

    const [isPending, startTransition] = useTransition();

    const handleGoogleLogin = () => {
        startTransition(async () => {
            await setClientType(getAuthClientTypeFromWindow());
            await loginGoogle(callbackUrl);
        });
    };

    return (
        <CardWrapperComponent showSocial={false} showBackButton={false} showLogo={true}>
            <div className="flex flex-col items-center space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Sign in with your Deploy account to continue
                </p>
                <Button
                    size="lg"
                    className="w-full shadow-box dark:bg-white dark:hover:bg-white/60 flex items-center justify-center gap-x-2 hover:cursor-pointer"
                    variant="outline"
                    onClick={handleGoogleLogin}
                    disabled={isPending}
                >
                    {isPending ? (
                        <>
                            <Spinner size="sm" variant="primary" />
                            <FcGoogle className="h-5 w-5" />
                            <span className="dark:text-black">Continue with Google</span>
                        </>
                    ) : (
                        <>
                            <FcGoogle className="h-5 w-5" />
                            <span className="dark:text-black">Continue with Google</span>
                        </>
                    )}
                </Button>
            </div>
        </CardWrapperComponent>
    );
};
