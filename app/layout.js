import { Suspense } from 'react';
import { Nunito_Sans } from 'next/font/google';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'sonner';
import Script from 'next/script';
import { AppSessionShell } from '@/components/auth/app-session-shell';
import LoadingLogo from '@/components/application/loading-logo/loading-logo';
import { BootSplash } from '@/components/application/loading-logo/boot-splash';
import { APPLE_STARTUP_IMAGES } from '@/lib/pwa-splash';

const nunitoSans = Nunito_Sans({ subsets: ['latin'] });

export const metadata = {
    title: 'Tilde',
    description: 'Tilde App',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Tilde',
        startupImage: APPLE_STARTUP_IMAGES,
    },
    // Next.js 15 maps appleWebApp.capable to mobile-web-app-capable only;
    // iOS still needs the apple- prefixed tag for startup images to show.
    other: {
        'apple-mobile-web-app-capable': 'yes',
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        icon: [
            {
                media: '(prefers-color-scheme: light)',
                url: '/images/tilde-black.png',
                sizes: '64x64',
                type: 'image/png',
            },
            {
                media: '(prefers-color-scheme: dark)',
                url: '/images/tilde-white.png',
                sizes: '64x64',
                type: 'image/png',
            },
        ],
        apple: '/splash/pwa-icon-192.png',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning className="h-full">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                {process.env.NODE_ENV === 'development' && (
                    <Script
                        src="//unpkg.com/react-grab/dist/index.global.js"
                        crossOrigin="anonymous"
                        strategy="beforeInteractive"
                    />
                )}
            </head>
            <body className={`${nunitoSans.className} antialiased h-full`} suppressHydrationWarning>
                <BootSplash />
                <Suspense fallback={<LoadingLogo />}>
                    <AppSessionShell>{children}</AppSessionShell>
                </Suspense>
                <Analytics />
                <Toaster />
            </body>
        </html>
    );
}
