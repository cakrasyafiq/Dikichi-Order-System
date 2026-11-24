import { z } from 'zod';

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.string(),
  expiresIn: z.number().positive(),
  user: z.object({
    outletId: z.string().min(1),
  }),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
