import { z } from 'zod';

export const emailSchema = z.string().email('Email inválido');
export const passwordSchema = z.string().min(8, 'Mínimo 8 caracteres');
export const phoneSchema = z.string().regex(/^\+?\d{7,15}$/, 'Teléfono inválido');
export const nameSchema = z
  .string()
  .min(2, 'Mínimo 2 caracteres')
  .max(100, 'Máximo 100 caracteres');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  businessName: z.string().min(3, 'Mínimo 3 caracteres').max(255, 'Máximo 255 caracteres'),
});

export const serviceSchema = z.object({
  name: z.string().min(2).max(255),
  duration_minutes: z.number().int().min(5).max(480),
  price: z.number().int().min(0),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export const employeeSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ServiceForm = z.infer<typeof serviceSchema>;
export type EmployeeForm = z.infer<typeof employeeSchema>;
