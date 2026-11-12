import { z } from 'zod';

import { issueIfPercentageDiscountOver100 } from 'src/utils/discount-percentage-zod';

import i18n from 'src/lib/i18n';

const t = (key: string) => i18n.t(key, { ns: 'validation' });

const translationField = z.object({
  ar: z.string().optional().default(''),
  en: z.string().optional().default(''),
});

export const BasketSchema = z
  .object({
    category_ids: z
      .array(z.coerce.number().int().positive())
      .min(1, t('basket.categoryRequired')),
    name: z.object({
      en: z.string().min(1, t('basket.nameEnRequired')),
      ar: z.string().min(1, t('basket.nameArRequired')),
    }),
    description: translationField.optional(),
    offer_ends_at: z.string().optional(),
    discount: z.coerce.number().min(0).optional(),
    discount_type: z.enum(['fixed', 'percentage']),
    delivery_price: z.coerce.number().min(0).optional(),
    image: z.instanceof(File).optional().or(z.literal('')).or(z.null()),
    images: z.array(z.instanceof(File)).optional().default([]),
    items: z
      .array(
        z.object({
          shop_product_variant_id: z.coerce.number().int(t('basket.productVariantRequired')).min(1, t('basket.productVariantRequired')),
          quantity: z.coerce.number().int(t('basket.quantityMin')).min(1, t('basket.quantityMin')),
        })
      )
      .min(1, t('basket.atLeastOneItem')),
    badges: z
      .array(z.number())
      .default([]),
  })
  .superRefine((data, ctx) => {
    issueIfPercentageDiscountOver100(ctx, data.discount_type, data.discount, ['discount']);
  });

export type BasketFormValues = z.infer<typeof BasketSchema>;
