'use client';

import { useEffect } from 'react';

/**
 * Removes the static #boot-splash once the app shell has hydrated.
 * Keeps the logo visible through auth + JS download on PWA cold start.
 */
export function BootSplashHider() {
    useEffect(() => {
        const splash = document.getElementById('boot-splash');
        if (!splash) return undefined;

        splash.style.transition = 'opacity 200ms ease';
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';

        const timeoutId = window.setTimeout(() => {
            splash.remove();
        }, 200);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, []);

    return null;
}
