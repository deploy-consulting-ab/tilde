'use server';

import { auth } from '@/auth';
import { getUserById, getCombinedPermissionsForUser } from '@/data/user-db';
import { revalidatePath } from 'next/cache';
import { toPermissionSet } from '@/lib/utils';
import { VIEW_SETUP_PERMISSION } from '@/lib/rba-constants';

export async function startImpersonation(userId) {
    try {
        const session = await auth();
        const systemPermissions = toPermissionSet(session.user.systemPermissions);

        // Check if user is authenticated and is an admin
        if (!session || !systemPermissions.has(VIEW_SETUP_PERMISSION)) {
            return { error: 'Unauthorized access' };
        }

        if (!userId) {
            return { error: 'User ID is required' };
        }

        // Get the target user and their system permissions
        const targetUser = await getUserById(userId);

        if (!targetUser) {
            return { error: 'User not found' };
        }

        const {
            systemPermissions: targetSystemPermissions,
            fieldPermissions: targetFieldPermissions,
        } = await getCombinedPermissionsForUser(userId);

        // Store the current session data for later restoration
        const impersonationData = {
            success: true,
            impersonatedUser: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                profileId: targetUser.profileId,
                homeLayoutKey: targetUser.homeLayoutKey,
                employeeNumber: targetUser.employeeNumber,
                flexEmployeeId: targetUser.flexEmployeeId,
                systemPermissions: targetSystemPermissions,
                fieldPermissions: targetFieldPermissions,
                image: targetUser.image,
                isActive: targetUser.isActive,
                yearlyHolidays: targetUser.yearlyHolidays,
                carriedOverHolidays: targetUser.carriedOverHolidays,
                vacationEarnedDays: targetUser.vacationEarnedDays,
                vacationAdvanceDays: targetUser.vacationAdvanceDays,
            },
            originalUser: {
                id: session.user.sessionId,
                name: session.user.name,
                email: session.user.email,
                profileId: session.user.profileId,
                homeLayoutKey: session.user.homeLayoutKey,
                employeeNumber: session.user.employeeNumber,
                flexEmployeeId: session.user.flexEmployeeId,
                systemPermissions: session.user.systemPermissions,
                fieldPermissions: session.user.fieldPermissions,
                image: session.user.image,
                isActive: session.user.isActive,
                yearlyHolidays: session.user.yearlyHolidays,
                carriedOverHolidays: session.user.carriedOverHolidays,
                vacationEarnedDays: session.user.vacationEarnedDays,
                vacationAdvanceDays: session.user.vacationAdvanceDays,
            },
        };

        revalidatePath('/');
        return impersonationData;
    } catch (error) {
        console.error('[IMPERSONATION_ERROR]', error);
        return { error: 'Something went wrong' };
    }
}

export async function endImpersonation() {
    try {
        const session = await auth();

        if (!session) {
            return { error: 'Unauthorized access' };
        }

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('[END_IMPERSONATION_ERROR]', error);
        return { error: 'Something went wrong' };
    }
}
