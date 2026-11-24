import { z } from 'zod';

export const tableSchema = z.object({
  id: z.string(),
  outletId: z.string(),
  code: z.string(),
});
export const tableListSchema = z.array(tableSchema);

export type DiningTable = z.infer<typeof tableSchema>;
