import {
    LOGIN_ROUTE,
    HOME_ROUTE,
    API_AUTH_PREFIX,
    AUTH_ROUTES,
    PUBLIC_ROUTES,
    PROTECTED_ROUTES,
    API_CRON_PREFIX,
    API_AGENT_PREFIX,
} from '@/menus/routes';

import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { getToken } from 'next-auth/jwt';
import authConfig from '@/auth.config';
import { SESSION_REVOKED_ERROR } from '@/lib/auth-session';
import { toPermissionSet } from '@/lib/utils';

/**
 * Edge-compatible auth instance for middleware
 * Uses only authConfig (no Prisma, bcrypt, or heavy Node.js libraries)
 */
const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
    const { nextUrl } = req;
    const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
        secureCookie: process.env.NODE_ENV === 'production',
    });
    const isSessionRevoked = token?.error === SESSION_REVOKED_ERROR;

    const isLoggedIn = !!req.auth?.user && !isSessionRevoked;
    const user = isSessionRevoked ? undefined : req.auth?.user;

    const isPublicRoute = PUBLIC_ROUTES.includes(nextUrl.pathname);
    const isAuthRoute = AUTH_ROUTES.includes(nextUrl.pathname);
    const isApiAuthRoute = nextUrl.pathname.startsWith(API_AUTH_PREFIX);
    const isApiCronRoute = nextUrl.pathname.startsWith(API_CRON_PREFIX);
    const isApiAgentRoute = nextUrl.pathname.startsWith(API_AGENT_PREFIX);

    // API auth routes
    if (isApiAuthRoute || isApiCronRoute || isApiAgentRoute) {
        return NextResponse.next();
    }

    // Auth routes — login page validates sessions server-side (needs DB access)
    if (isAuthRoute) {
        return NextResponse.next();
    }

    // Check if user is not logged in or not active
    if (!isPublicRoute && (!isLoggedIn || !user?.isActive)) {
        let callbackUrl = nextUrl.pathname;

        if (nextUrl.search) {
            callbackUrl += nextUrl.search;
        }

        const encodedCallbackUrl = encodeURIComponent(callbackUrl);

        return Response.redirect(
            new URL(`${LOGIN_ROUTE}?callbackUrl=${encodedCallbackUrl}`, nextUrl)
        );
    }

    const allSystemPermissions = toPermissionSet(user?.systemPermissions);
    return handleLoggedInUsers(nextUrl, allSystemPermissions);
});

const handleLoggedInUsers = (nextUrl, allSystemPermissions) => {
    const pathname = nextUrl.pathname;

    if (!pathname) {
        return Response.redirect(new URL(HOME_ROUTE, nextUrl));
    }

    const protectedRoute = PROTECTED_ROUTES.find((route) => pathname.includes(route.path));

    if (protectedRoute) {
        if (allSystemPermissions.has(protectedRoute.systemPermission)) {
            return NextResponse.next();
        }
        return Response.redirect(new URL(HOME_ROUTE, nextUrl));
    }

    return Response.redirect(new URL(HOME_ROUTE, nextUrl));
};

/**
 * Every path matching the regex will invoke the middleware
 */
export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)?|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json|mp4|mov|webm)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
