/**
 * Validation schema for the index file.
 * This schema defines the structure and types of the properties expected in the index file.
 */

import * as z from 'zod';
import { PROFILES } from '@/lib/rba-constants';

export const LoginSchema = z.object({
    email: z.email({ message: 'Email is required' }),
    password: z.string().min(1, {
        message: 'Password should not be empty',
    }),
});

export const CreateUserSchema = z.object({
    email: z.email({ message: 'Email is required' }),
    password: z.string().min(6, {
        message: 'Minimum 6 characters required',
    }),
    name: z.string().min(1, {
        message: 'Name is required',
    }),
    employeeNumber: z.string().min(4, {
        message: 'Employee number is required',
    }),
    flexEmployeeId: z.string().min(1, {
        message: 'Flex Employee ID is required',
    }),
    profileId: z.enum(PROFILES, {
        required_error: 'Profile is required',
    }),
    carriedOverHolidays: z.coerce
        .number()
        .min(0, {
            message: 'Saved vacation days must be zero or greater',
        })
        .default(0),
    vacationEarnedDays: z.coerce.number().default(0),
    vacationAdvanceDays: z.coerce
        .number()
        .min(0, {
            message: 'Advance vacation days must be zero or greater',
        })
        .default(0),
});

export const UpdateUserSchema = z.object({
    employeeNumber: z.string().min(4, {
        message: 'Employee number is required',
    }),
    flexEmployeeId: z.string().min(1, {
        message: 'Flex Employee ID is required',
    }),
    profileId: z.enum(PROFILES, {
        required_error: 'Profile is required',
    }),
    isActive: z.boolean().default(true),
    carriedOverHolidays: z.coerce.number().min(0, {
        message: 'Saved vacation days must be zero or greater',
    }),
    vacationEarnedDays: z.coerce.number(),
    vacationAdvanceDays: z.coerce.number().min(0, {
        message: 'Advance vacation days must be zero or greater',
    }),
    homeLayoutKey: z.preprocess(
        (val) => (val === 'none' || val === '' ? null : val),
        z.enum(PROFILES).nullable().optional()
    ),
});

export const UpdateProfileSchema = z.object({
    name: z.string().min(1, {
        message: 'Name is required',
    }),
    id: z.string().min(1, {
        message: 'ID is required',
    }),
    description: z.string().min(1, {
        message: 'Description is required',
    }),
});

export const UpdateSystemPermissionSchema = z.object({
    name: z.string().min(1, {
        message: 'Name is required',
    }),
    id: z.string().min(1, {
        message: 'ID is required',
    }),
    description: z.string().min(1, {
        message: 'Description is required',
    }),
});

export const UpdatePermissionSetSchema = z.object({
    name: z.string().min(1, {
        message: 'Name is required',
    }),
    id: z.string().min(1, {
        message: 'ID is required',
    }),
    description: z.string().min(1, {
        message: 'Description is required',
    }),
});

export const CreateSystemPermissionSchema = z.object({
    name: z.string().min(1, {
        message: 'Name is required',
    }),
    id: z.string().min(1, {
        message: 'ID is required',
    }),
    description: z.string().min(1, {
        message: 'Description is required',
    }),
});

export const CreateFieldPermissionSchema = z.object({
    system: z.string().min(1, { message: 'System is required' }),
    objectName: z.string().min(1, { message: 'Object name is required' }),
    fieldName: z.string().min(1, { message: 'Field name is required' }),
    label: z.string().min(1, { message: 'Label is required' }),
    description: z.string().optional(),
});

export const UpdateFieldPermissionSchema = z.object({
    system: z.string().min(1, { message: 'System is required' }),
    objectName: z.string().min(1, { message: 'Object name is required' }),
    fieldName: z.string().min(1, { message: 'Field name is required' }),
    label: z.string().min(1, { message: 'Label is required' }),
    description: z.string().optional(),
});

const financialAmountField = z.coerce
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, { message: 'Must be 0 or greater' });

const profitAmountField = z.coerce.number({ invalid_type_error: 'Must be a number' });

export const CreateFinancialRecordSchema = z.object({
    fiscalYear: z.coerce.number().int().min(2000, { message: 'Fiscal year must be 2000 or later' }),
    quarter: z.coerce
        .number()
        .int()
        .min(0, { message: 'Quarter must be 0 (Total Year) or 1–4' })
        .max(4, { message: 'Quarter must be 0 (Total Year) or 1–4' }),
    revenue: financialAmountField,
    cost: financialAmountField,
    profit: profitAmountField,
    taxes: financialAmountField,
});

export const UpdateFinancialRecordSchema = CreateFinancialRecordSchema;
