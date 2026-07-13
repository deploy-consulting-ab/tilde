import Google from 'next-auth/providers/google';
import { encode as defaultEncode } from '@auth/core/jwt';
import {
    BROWSER_SESSION_MAX_AGE,
    getSessionMaxAge,
    SESSION_UPDATE_AGE,
} from '@/lib/auth-session';

/**
 * Edge-compatible auth configuration
 * This file should NOT import Prisma, bcrypt, or any heavy Node.js libraries
 * as it's used by the middleware which runs on Edge Functions
 *
 * The callbacks here only READ from the JWT token (no DB access)
 */
const authConfig = {
    trustHost: true,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    jwt: {
        maxAge: BROWSER_SESSION_MAX_AGE,
        encode: async (params) => {
            const maxAge = getSessionMaxAge(params.token?.clientType);

            return defaultEncode({
                ...params,
                maxAge,
            });
        },
    },
    session: {
        strategy: 'jwt',
        maxAge: BROWSER_SESSION_MAX_AGE,
        updateAge: SESSION_UPDATE_AGE,
    },
    pages: {
        signIn: '/auth/login',
    },
    callbacks: {
        // This callback only READS from the token - no DB access needed
        // It's safe for Edge runtime
        async session({ session, token }) {
            if (!session.user) {
                return session;
            }

            if (token.sub) {
                session.user.sessionId = token.sub;
            }

            if (token.employeeNumber) {
                session.user.employeeNumber = token.employeeNumber;
            }

            if (token.flexEmployeeId) {
                session.user.flexEmployeeId = token.flexEmployeeId;
            }

            if (token.systemPermissions) {
                session.user.systemPermissions = token.systemPermissions;
            }

            if (token.fieldPermissions) {
                session.user.fieldPermissions = token.fieldPermissions;
            }

            if (token.profileId) {
                session.user.profileId = token.profileId;
            }

            if (token.homeLayoutKey) {
                session.user.homeLayoutKey = token.homeLayoutKey;
            }

            if (token.isActive) {
                session.user.isActive = token.isActive;
            }

            // Add impersonation data if present
            if (token.impersonating) {
                session.user.impersonating = true;
                session.user.originalUser = token.originalUser;
                // Override session with impersonated user data
                session.user.sessionId = token.impersonatedUser.id;
                session.user.name = token.impersonatedUser.name;
                session.user.email = token.impersonatedUser.email;
                session.user.profileId = token.impersonatedUser.profileId;
                session.user.homeLayoutKey = token.impersonatedUser.homeLayoutKey;
                session.user.flexEmployeeId = token.impersonatedUser.flexEmployeeId;
                session.user.employeeNumber = token.impersonatedUser.employeeNumber;
                session.user.systemPermissions = token.impersonatedUser.systemPermissions;
                session.user.fieldPermissions = token.impersonatedUser.fieldPermissions;
                session.user.image = token.impersonatedUser.image;
                session.user.isActive = token.impersonatedUser.isActive;
            }

            return session;
        },
        // Middleware needs authorized callback to check auth status
        authorized({ auth, request: { nextUrl } }) {
            // Return true to allow the middleware to handle the logic
            // The actual redirect logic is in middleware.js
            return true;
        },
    },
};

export default authConfig;
