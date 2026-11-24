import { z } from 'zod';
import { STAFF_ROLES } from '@/constants/auth';

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.string(),
  expiresIn: z.number().positive(),
  user: z.object({
    username: z.string(),
    role: z.enum(STAFF_ROLES),
    outletId: z.string().nullish(),
  }),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
