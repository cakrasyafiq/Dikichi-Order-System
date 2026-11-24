import { z } from 'zod';

export const outletSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
});
export const outletListSchema = z.array(outletSchema);

export type Outlet = z.infer<typeof outletSchema>;
