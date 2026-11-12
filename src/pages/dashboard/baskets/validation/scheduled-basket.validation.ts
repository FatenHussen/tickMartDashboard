import { z } from 'zod';

import { issueIfPercentageDiscountOver100 } from 'src/utils/discount-percentage-zod';

import i18n from 'src/lib/i18n';

const t = (key: string) => i18n.t(key, { ns: 'validation' });

const translationField = z.object({
  ar: z.string().optional().default(''),
  en: z.string().optional().default(''),
});

export const ScheduledBasketSchema = z
  .object({
    category_ids: z
      .array(z.coerce.number().int().positive())
      .min(1, t('scheduledBasket.categoryRequired')),
    name: z.object({
      en: z.string().min(1, t('scheduledBasket.nameEnRequired')),
      ar: z.string().min(1, t('scheduledBasket.nameArRequired')),
    }),
    description: translationField.optional(),
    schedule_id: z.coerce.number().min(1, t('scheduledBasket.scheduleRequired')),
    has_custom_discount: z.boolean().default(false),
    discount: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.coerce.number().min(0).optional()
    ),
    discount_type: z.enum(['fixed', 'percentage']).optional(),
    delivery_price: z.coerce.number().min(0).optional(),
    image: z.instanceof(File).optional().or(z.literal('')).or(z.null()),
    images: z.array(z.instanceof(File)).optional().default([]),
    items: z
      .array(
        z.object({
          shop_product_variant_id: z.coerce.number().int(t('scheduledBasket.productVariantRequired')).min(1, t('scheduledBasket.productVariantRequired')),
          shop_product_variant_ids: z.array(z.coerce.number().int().positive()).optional().default([]),
          quantity: z.coerce.number().int(t('scheduledBasket.quantityMin')).min(1, t('scheduledBasket.quantityMin')),
          is_required: z.boolean().default(false),
          is_extra: z.boolean().default(false),
          min_quantity: z.preprocess(
            (v) => (v === '' || v === null || v === undefined || Number(v) === 0 ? undefined : v),
            z.coerce.number().int().min(1).optional()
          ),
          max_quantity: z.preprocess(
            (v) => (v === '' || v === null || v === undefined || Number(v) === 0 ? undefined : v),
            z.coerce.number().int().min(1).optional()
          ),
        })
      )
      .min(1, t('scheduledBasket.atLeastOneItem')),
    is_active: z.boolean(),
    badges: z.array(z.number()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.has_custom_discount && data.discount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('scheduledBasket.customDiscountRequired'),
        path: ['discount'],
      });
    }
    if (data.has_custom_discount && !data.discount_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('scheduledBasket.customDiscountRequired'),
        path: ['discount_type'],
      });
    }
    if (data.has_custom_discount) {
      issueIfPercentageDiscountOver100(ctx, data.discount_type, data.discount, ['discount']);
    }
    data.items.forEach((item, index) => {
      if (item.min_quantity != null && item.max_quantity != null && item.max_quantity < item.min_quantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('scheduledBasket.maxQuantityGteMin'),
          path: ['items', index, 'max_quantity'],
        });
      }
    });
  });

export type ScheduledBasketFormValues = z.infer<typeof ScheduledBasketSchema>;
