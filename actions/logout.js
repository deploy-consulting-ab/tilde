'use server';

import { auth, signOut } from '@/auth';
import { incrementSessionVersion } from '@/data/user-db';
import { LOGIN_ROUTE } from '@/menus/routes';

function getAuthenticatedUserId(session) {
    if (!session?.user) {
        return null;
    }

    if (session.user.impersonating && session.user.originalUser?.id) {
        return session.user.originalUser.id;
    }

    return session.user.sessionId;
}

export const logout = async () => {
    const session = await auth();
    const userId = getAuthenticatedUserId(session);

    if (userId) {
        await incrementSessionVersion(userId);
    }

    await signOut({
        redirectTo: LOGIN_ROUTE, // This was not happening automatically, might be a bug
    });
};
