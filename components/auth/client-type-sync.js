'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setClientType } from '@/actions/set-client-type';
import { CLIENT_TYPE, getAuthClientTypeFromWindow } from '@/lib/auth-session';

export function ClientTypeSync() {
    const { data: session, update } = useSession();
    const hasUpgradedSession = useRef(false);

    useEffect(() => {
        const syncClientType = async () => {
            const clientType = getAuthClientTypeFromWindow();
            await setClientType(clientType);

            if (
                clientType === CLIENT_TYPE.PWA &&
                session?.user &&
                !hasUpgradedSession.current
            ) {
                hasUpgradedSession.current = true;
                await update({ clientType: CLIENT_TYPE.PWA });
            }
        };

        void syncClientType();
    }, [session?.user, update]);

    return null;
}
