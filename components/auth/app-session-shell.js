import { Suspense } from 'react';
import { auth } from '@/auth';
import { SessionProvider } from 'next-auth/react';
import { ClientTypeSync } from '@/components/auth/client-type-sync';
import { ThemeProvider } from '@/components/auth/form/theme-provider';
import LoadingLogo from '@/components/application/loading-logo/loading-logo';
import { BootSplashHider } from '@/components/application/loading-logo/boot-splash-hider';

/**
 * Async shell that resolves the session before mounting providers.
 * Kept out of the root layout so the static BootSplash can paint
 * while auth() is in flight (critical for PWA cold starts).
 */
export async function AppSessionShell({ children }) {
    const session = await auth();

    return (
        <SessionProvider session={session}>
            <ClientTypeSync />
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <div className="h-full bg-background">
                    <Suspense fallback={<LoadingLogo />}>
                        <BootSplashHider />
                        {children}
                    </Suspense>
                </div>
            </ThemeProvider>
        </SessionProvider>
    );
}
