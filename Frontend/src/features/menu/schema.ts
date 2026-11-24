import { z } from 'zod';

export const menuItemSchema = z.object({
  id: z.string(),
  outletId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  price: z.number().int(),
  category: z.string(),
  available: z.boolean(),
});
export const menuListSchema = z.array(menuItemSchema);

export type MenuItem = z.infer<typeof menuItemSchema>;
