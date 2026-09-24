import { z as zod } from 'zod';

import i18n from 'src/lib/i18n';
import { parseCouponDateTimeLocal } from '@/pages/dashboard/coupons/validation/coupon.validation';

const t = (key: string) => i18n.t(key, { ns: 'validation' });

// ----------------------------------------------------------------------

const titleShape = zod.object({
  en: zod.string().min(1, { message: t('banner.titleEnRequired') }),
  ar: zod.string().min(1, { message: t('banner.titleArRequired') }),
});

const descriptionShape = zod.object({
  en: zod.string().min(1, { message: t('banner.descriptionEnRequired') }),
  ar: zod.string().min(1, { message: t('banner.descriptionArRequired') }),
});

const buttonTextShape = zod.object({
  en: zod.string().min(1, { message: t('banner.buttonTextEnRequired') }),
  ar: zod.string().min(1, { message: t('banner.buttonTextArRequired') }),
});

const imageField = zod
  .custom<File | null>((v) => v === null || v instanceof File)
  .optional()
  .nullable();

const bannerBaseSchema = zod.object({
  title: titleShape,
  description: descriptionShape,
  button_text: buttonTextShape,
  image: imageField,
  link: zod
    .string()
    .min(1, { message: t('banner.linkRequired') })
    .url({ message: t('banner.linkInvalid') }),
  expires_at: zod.string().min(1, { message: t('banner.expiresAtRequired') }),
});

function expiresAtFutureRefine(
  data: { expires_at: string },
  ctx: zod.RefinementCtx
) {
  const parsed = parseCouponDateTimeLocal(data.expires_at);
  if (!parsed) {
    ctx.addIssue({
      code: 'custom',
      message: t('banner.expiresAtRequired'),
      path: ['expires_at'],
    });
    return;
  }
  if (parsed.getTime() <= Date.now()) {
    ctx.addIssue({
      code: 'custom',
      message: t('banner.expiresAtFuture'),
      path: ['expires_at'],
    });
  }
}

/** Create: all text fields + link + expires_at + image required. */
export const BannerCreateSchema = bannerBaseSchema
  .extend({
    image: zod
      .custom<File | null>((v) => v === null || v instanceof File)
      .refine((v) => v instanceof File, { message: t('banner.imageRequired') }),
  })
  .superRefine(expiresAtFutureRefine);

/** Update: same required fields; image optional if unchanged. */
export const BannerUpdateSchema = bannerBaseSchema.superRefine(expiresAtFutureRefine);

/** @deprecated Prefer BannerCreateSchema / BannerUpdateSchema */
export const BannerSchema = BannerUpdateSchema;

export type BannerUpdateFormValues = zod.infer<typeof BannerUpdateSchema>;
export type BannerCreateFormValues = zod.infer<typeof BannerCreateSchema>;
export type BannerFormValues = BannerUpdateFormValues;
