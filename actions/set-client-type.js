'use server';

import { cookies } from 'next/headers';
import { CLIENT_TYPE_COOKIE, resolveClientType } from '@/lib/auth-session';

export async function setClientType(clientType) {
    const cookieStore = await cookies();
    const resolvedClientType = resolveClientType(clientType);

    cookieStore.set(CLIENT_TYPE_COOKIE, resolvedClientType, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 365 * 24 * 60 * 60,
    });
}
