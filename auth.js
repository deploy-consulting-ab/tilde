import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { CredentialsSignin } from 'next-auth';
import bcryptjs from 'bcryptjs';
import { cookies } from 'next/headers';
import authConfig from '@/auth.config';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import { getUserById, getUserByEmail, getCombinedPermissionsForUser } from '@/data/user-db';
import { LoginSchema } from '@/schemas';
import { CLIENT_TYPE, CLIENT_TYPE_COOKIE, resolveClientType, SESSION_REVOKED_ERROR, createRevokedSessionToken, isSessionVersionValid } from '@/lib/auth-session';

/**
 * Custom error class for credentials sign in
 */
class CustomCredentialsSigninError extends CredentialsSignin {
    constructor(message) {
        super();
        this.message = message;
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(db),
    // Add Credentials provider here (not in auth.config.js) because it needs bcrypt/Prisma
    providers: [
        ...authConfig.providers,
        Credentials({
            async authorize(credentials) {
                const validatedFields = LoginSchema.safeParse(credentials);

                if (validatedFields.success) {
                    const { email, password } = validatedFields.data;

                    const user = await getUserByEmail(email);

                    // No user
                    if (!user) {
                        throw new CustomCredentialsSigninError('User not found');
                    }

                    // Inactive user
                    if (!user.isActive) {
                        throw new CustomCredentialsSigninError('User is inactive');
                    }

                    // User does not have password (Google auth)
                    if (!user.password) {
                        throw new CustomCredentialsSigninError('Please login with Google');
                    }

                    const passwordMatch = await bcryptjs.compare(password, user.password);

                    if (passwordMatch) {
                        return user;
                    }

                    throw new CustomCredentialsSigninError('Invalid password');
                }

                throw new CustomCredentialsSigninError('Invalid credentials');
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider !== 'credentials') {
                if (process.env.ENABLE_AUTO_REGISTRATION === 'true') {
                    return true;
                }

                const existingUser = await getUserByEmail(user.email);

                // Add isActive check
                if (!existingUser || !existingUser.isActive) {
                    return false;
                }

                return true;
            }

            const existingUser = await getUserById(user.id);

            // Add isActive check
            if (!existingUser || !existingUser.isActive) {
                return false;
            }

            return true;
        },
        async session({ session, token }) {
            if (!session.user) {
                return session;
            }

            if (token.error === SESSION_REVOKED_ERROR) {
                return null;
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

            session.user.yearlyHolidays = token.yearlyHolidays ?? 30;
            session.user.carriedOverHolidays = token.carriedOverHolidays ?? 0;
            session.user.vacationEarnedDays = token.vacationEarnedDays ?? 0;
            session.user.vacationAdvanceDays = token.vacationAdvanceDays ?? 0;

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
                session.user.yearlyHolidays = token.impersonatedUser.yearlyHolidays ?? 30;
                session.user.carriedOverHolidays = token.impersonatedUser.carriedOverHolidays ?? 0;
                session.user.vacationEarnedDays = token.impersonatedUser.vacationEarnedDays ?? 0;
                session.user.vacationAdvanceDays = token.impersonatedUser.vacationAdvanceDays ?? 0;
            }
            return session;
        },
        async jwt({ token, user, trigger, session }) {
            if (trigger === 'update' && session) {
                if (session.clientType === CLIENT_TYPE.PWA) {
                    token.clientType = CLIENT_TYPE.PWA;
                }

                // START IMPERSONATING
                if (session.impersonating) {
                    token.originalUser = session.originalUser; // Save original user
                    token.impersonatedUser = session.impersonatedUser; // Save impersonated user details
                    token.impersonating = true;
                }

                // STOP IMPERSONATING
                if (!session.impersonating) {
                    token.impersonating = false;
                    token.originalUser = undefined;
                    token.impersonatedUser = undefined;
                }
            }
            // Only populated on sign in
            if (user) {
                const cookieStore = await cookies();
                token.clientType = resolveClientType(
                    cookieStore.get(CLIENT_TYPE_COOKIE)?.value
                );

                const { systemPermissions, fieldPermissions } = await getCombinedPermissionsForUser(
                    user.id
                );
                token.systemPermissions = systemPermissions;
                token.fieldPermissions = fieldPermissions;
                token.employeeNumber = user.employeeNumber;
                token.flexEmployeeId = user.flexEmployeeId;
                token.sub = user.id;
                token.profileId = user.profileId;
                token.homeLayoutKey = user.homeLayoutKey;
                token.isActive = user.isActive;
                token.sessionVersion = user.sessionVersion ?? 0;
                token.yearlyHolidays = user.yearlyHolidays ?? 30;
                token.carriedOverHolidays = user.carriedOverHolidays ?? 0;
                token.vacationEarnedDays = user.vacationEarnedDays ?? 0;
                token.vacationAdvanceDays = user.vacationAdvanceDays ?? 0;
            } else if (token.sub && token.error !== SESSION_REVOKED_ERROR) {
                const dbUser = await getUserById(token.sub);

                if (!isSessionVersionValid(dbUser, token)) {
                    return createRevokedSessionToken(token.sub);
                }

                token.isActive = dbUser.isActive;
            }

            return token;
        },
    },
});
