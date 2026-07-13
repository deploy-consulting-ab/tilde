import { db } from '@/lib/db';

/**
 * Get a user by email
 * @param {string} email
 * @returns {Promise<User>} User with allPermissions for their profile and permission sets
 * @throws {Error} If the user is not found
 */
export const getUserByEmail = async (email) => {
    try {
        const existingUser = await db.user.findUnique({
            where: {
                email,
            },
        });
        return existingUser;
    } catch (error) {
        throw error;
    }
};

/**
 * GET METHODS
 */

/**
 * Get a user by id
 * @param {string} id
 * @returns {Promise<User>} User with allPermissions for their profile and permission sets
 * @throws {Error} If the user is not found
 */
export const getUserById = async (id) => {
    try {
        const existingUser = await db.user.findUnique({
            where: {
                id,
            },
        });
        return existingUser;
    } catch (error) {
        throw error;
    }
};

/**
 * Get a user by id with allPermissions for their profile and permission sets
 * @param {*} id
 * @returns {Promise<User>} User with allPermissions for their profile and permission sets
 */
export const getUserByIdWithSystemPermissions = async (id) => {
    try {
        const existingUser = await db.user.findUnique({
            where: { id },
            include: {
                profile: {
                    include: {
                        systemPermissions: true, // Get system permissions from the profile
                    },
                },
                permissionSets: {
                    include: {
                        systemPermissions: true, // Get system permissions from all permission sets
                    },
                },
            },
        });

        const allPermissions = [
            ...existingUser.profile.systemPermissions.map(
                (systemPermission) => systemPermission.id
            ),
            ...existingUser.permissionSets.flatMap((set) =>
                set.systemPermissions.map((systemPermission) => systemPermission.id)
            ),
        ];

        existingUser.allPermissions = new Set(allPermissions);
        return existingUser;
    } catch (error) {
        throw error;
    }
};

/**
 * Get all users
 * @returns {Promise<User[]>} All users
 * @throws {Error} If the users are not found
 */
export async function getUsers() {
    try {
        const users = await db.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                employeeNumber: true,
                profileId: true,
                homeLayoutKey: true,
                isActive: true,
                yearlyHolidays: true,
                carriedOverHolidays: true,
            },
            orderBy: [
                {
                    isActive: 'desc',
                },
                {
                    name: 'desc',
                },
            ],
        });
        return users;
    } catch (error) {
        throw error;
    }
}

/**
 * Get all system permissions for a user
 * @param {string} id
 * @returns {Promise<string[]>} All system permissions for the user
 * @throws {Error} If the system permissions are not found
 */
/**
 * Get all system and field permissions for a user in a single DB query.
 * Used at login time and during impersonation to populate the session JWT.
 * @param {string} userId
 * @returns {Promise<{
 *   systemPermissions: string[],
 *   fieldPermissions: Array<{id: string, system: string, objectName: string, fieldName: string}>
 * }>}
 */
export async function getCombinedPermissionsForUser(userId) {
    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            include: {
                profile: {
                    include: {
                        systemPermissions: true,
                        fieldPermissions: true,
                    },
                },
                permissionSets: {
                    include: {
                        systemPermissions: true,
                        fieldPermissions: true,
                    },
                },
            },
        });

        if (!user) {
            return { systemPermissions: [], fieldPermissions: [] };
        }

        const systemPermissions = [
            ...(user.profile?.systemPermissions || []).map((sp) => sp.id),
            ...user.permissionSets.flatMap((set) => set.systemPermissions.map((sp) => sp.id)),
        ];

        const allFieldPermissions = [
            ...(user.profile?.fieldPermissions || []),
            ...user.permissionSets.flatMap((set) => set.fieldPermissions),
        ];

        const seen = new Set();
        const fieldPermissions = allFieldPermissions
            .filter((fp) => {
                const key = `${fp.system}:${fp.objectName}:${fp.fieldName}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map((fp) => ({
                id: fp.id,
                system: fp.system,
                objectName: fp.objectName,
                fieldName: fp.fieldName,
            }));

        return { systemPermissions, fieldPermissions };
    } catch (error) {
        throw error;
    }
}

/**
 * Get all users for a profile
 * @param {string} profileId
 * @returns {Promise<User[]>} All users for the profile
 * @throws {Error} If the users are not found
 */
export async function getUsersForProfile(profileId) {
    try {
        const users = await db.user.findMany({
            where: { profileId },
        });
        return users;
    } catch (error) {
        throw error;
    }
}

/**
 * CREATE METHODS
 */

/**
 * Create a user
 * @param {Object} data
 * @returns {Promise<User>} User created
 * @throws {Error} If the user is not created
 */
export const createUser = async (data) => {
    try {
        const user = await db.user.create({
            data: data,
        });

        return user;
    } catch (error) {
        throw error;
    }
};

/**
 * UPDATE METHODS
 */

export const updateUser = async (id, data) => {
    try {
        const updateData = { ...data };

        if (data.isActive === false) {
            const currentUser = await db.user.findUnique({
                where: { id },
                select: { isActive: true },
            });

            if (currentUser?.isActive) {
                updateData.sessionVersion = { increment: 1 };
            }
        }

        await db.user.update({
            where: { id },
            data: updateData,
        });
    } catch (error) {
        throw error;
    }
};

export async function incrementSessionVersion(userId) {
    try {
        return await db.user.update({
            where: { id: userId },
            data: { sessionVersion: { increment: 1 } },
        });
    } catch (error) {
        throw error;
    }
}

export async function incrementAllSessionVersions() {
    try {
        return await db.user.updateMany({
            data: { sessionVersion: { increment: 1 } },
        });
    } catch (error) {
        throw error;
    }
}

/**
 * Update a user's profile
 * @param {string} userId - The ID of the user to update
 * @param {string} profileId - The ID of the profile to assign
 * @returns {Promise<User>} The updated user
 * @throws {Error} If the update fails
 */
export const updateUserProfile = async (userId, profileId) => {
    try {
        const updatedUser = await db.user.update({
            where: { id: userId },
            data: { profileId },
            select: {
                id: true,
                name: true,
                email: true,
                employeeNumber: true,
                profileId: true,
                homeLayoutKey: true,
                yearlyHolidays: true,
                carriedOverHolidays: true,
            },
        });
        return updatedUser;
    } catch (error) {
        throw error;
    }
};

/**
 * Get a user's Flex employee ID by their employee number
 * @param {string} employeeNumber
 * @returns {Promise<{name: string, employeeNumber: string, flexEmployeeId: string|null}|null>}
 */
export async function getUserByEmployeeNumber(employeeNumber) {
    try {
        return await db.user.findUnique({
            where: { employeeNumber },
            select: {
                name: true,
                employeeNumber: true,
                flexEmployeeId: true,
            },
        });
    } catch (error) {
        throw error;
    }
}

/**
 * SEARCH METHODS
 */

/**
 * Search users by name or email. Raw query is used to apply unaccent function to the search term.
 * @param {string} searchTerm
 * @returns {Promise<User[]>} Users matching the search term
 * @throws {Error} If the search fails
 */
export async function searchUsers(searchTerm) {
    try {
        const normalizedTerm = `%${searchTerm}%`;
        const users = await db.$queryRaw`
            SELECT id, name, email, "employeeNumber", "profileId", "homeLayoutKey", "yearlyHolidays", "carriedOverHolidays"
            FROM "User"
            WHERE unaccent(name) ILIKE unaccent(${normalizedTerm})
               OR unaccent("employeeNumber") ILIKE unaccent(${normalizedTerm})
            ORDER BY name ASC
        `;
        return users;
    } catch (error) {
        throw error;
    }
}

/**
 * Add a permission set to a user
 * @param {string} id
 * @param {string} permissionSetId
 * @returns {Promise<User>} The updated user
 * @throws {Error} If the update fails
 */
export async function addPermissionSetToUser(id, permissionSetId) {
    try {
        const user = await db.user.update({
            where: { id },
            data: { permissionSets: { connect: { id: permissionSetId } } },
        });
        return user;
    } catch (error) {
        throw error;
    }
}

/**
 * Remove a permission set from a user
 * @param {string} id
 * @param {string} permissionSetId
 * @returns {Promise<User>} The updated user
 * @throws {Error} If the update fails
 */
export async function removePermissionSetFromUser(id, permissionSetId) {
    try {
        const user = await db.user.update({
            where: { id },
            data: { permissionSets: { disconnect: { id: permissionSetId } } },
        });
        return user;
    } catch (error) {
        throw error;
    }
}

/**
 * DELETE METHODS
 */

/**
 * Delete a user
 * @param {string} id
 * @returns {Promise<User>} The deleted user
 * @throws {Error} If the user is not deleted
 */
export async function deleteUser(id) {
    try {
        await db.user.delete({ where: { id } });
    } catch (error) {
        throw error;
    }
}
