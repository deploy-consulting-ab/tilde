import { signOut } from '@/auth';
import { LOGIN_ROUTE } from '@/menus/routes';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const callbackUrl = searchParams.get('callbackUrl') || LOGIN_ROUTE;

    await signOut({ redirect: false });

    return NextResponse.redirect(new URL(callbackUrl, request.url));
}
