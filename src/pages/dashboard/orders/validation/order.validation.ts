import { z } from 'zod';

import i18n from 'src/lib/i18n';

const t = (key: string) => i18n.t(key, { ns: 'validation' });

export const ChangeOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'waiting_approval',
    'preparing',
    'out_delivery',
    'delivered',
    'cancelled',
    'cancelled_by_admin',
    'rejected_by_delivery',
    'faild_deliver',
    'returned_by_user',
  ]),
});

export const AssignDriverSchema = z.object({
  driver_id: z.coerce.number().min(1, t('order.driverRequired')),
});

export type ChangeOrderStatusFormValues = z.infer<typeof ChangeOrderStatusSchema>;
export type AssignDriverFormValues = z.infer<typeof AssignDriverSchema>;
