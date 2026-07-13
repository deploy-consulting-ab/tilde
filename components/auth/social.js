'use client';

import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { ModeToggleComponent } from '@/components/application/mode-toggle';
import { loginGoogle } from '@/actions/login-google';
import { setClientType } from '@/actions/set-client-type';
import { getAuthClientTypeFromWindow } from '@/lib/auth-session';
import { useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export const SocialComponent = () => {
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
        <div className="flex items-center w-full gap-x-2">
            <Button
                size="lg"
                className="shadow-box dark:bg-white dark:hover:bg-white/60 flex-1 hover:cursor-pointer"
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isPending}
            >
                <FcGoogle className="h-5 w-5" />
            </Button>

            <ModeToggleComponent className="flex-1" />
        </div>
    );
};
