import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CLEAR_SESSION_ROUTE, LOGIN_ROUTE } from '@/menus/routes';

/**
 * Verify the caller is authenticated before running a server action.
 * @returns {Promise<import('next-auth').Session>} The active session
 */
export async function requireAuth() {
    const session = await auth();

    if (!session?.user?.isActive) {
        const callbackUrl = encodeURIComponent(LOGIN_ROUTE);
        redirect(`${CLEAR_SESSION_ROUTE}?callbackUrl=${callbackUrl}`);
    }

    return session;
}
