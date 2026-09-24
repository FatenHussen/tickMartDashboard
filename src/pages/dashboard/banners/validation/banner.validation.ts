import { z as zod } from 'zod';
import { parseCouponDateTimeLocal } from '@/pages/dashboard/coupons/validation/coupon.validation';

import i18n from 'src/lib/i18n';

const t = (key: string) => i18n.t(key, { ns: 'validation' });

// ----------------------------------------------------------------------

/** Optional bilingual — empty strings allowed (no `.optional()` to keep RHF input/output aligned). */
const optionalBilingual = zod.object({
  en: zod.string(),
  ar: zod.string(),
});

const imageField = zod
  .custom<File | null>((v) => v === null || v instanceof File)
  .nullable();

/** Optional URL: empty OK; if provided must be a valid URL. */
const optionalLink = zod.string().refine(
  (v) => {
    const s = String(v ?? '').trim();
    if (!s) return true;
    return zod.string().url().safeParse(s).success;
  },
  { message: t('banner.linkInvalid') }
);

const bannerBaseSchema = zod.object({
  title: optionalBilingual,
  description: optionalBilingual,
  button_text: optionalBilingual,
  image: imageField,
  link: optionalLink,
  /** Empty = permanent banner (no auto-delete). */
  expires_at: zod.string(),
});

function expiresAtFutureRefine(
  data: { expires_at: string },
  ctx: zod.RefinementCtx
) {
  const raw = data.expires_at.trim();
  if (!raw) return; // empty = permanent

  const parsed = parseCouponDateTimeLocal(raw);
  if (!parsed) {
    ctx.addIssue({
      code: 'custom',
      message: t('banner.expiresAtFuture'),
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

/** Create: image required; all other fields optional. */
export const BannerCreateSchema = bannerBaseSchema
  .extend({
    image: zod
      .custom<File | null>((v) => v === null || v instanceof File)
      .nullable()
      .refine((v) => v instanceof File, { message: t('banner.imageRequired') }),
  })
  .superRefine(expiresAtFutureRefine);

/** Update: all fields optional (including image if unchanged). */
export const BannerUpdateSchema = bannerBaseSchema.superRefine(expiresAtFutureRefine);

/** @deprecated Prefer BannerCreateSchema / BannerUpdateSchema */
export const BannerSchema = BannerUpdateSchema;

export type BannerUpdateFormValues = zod.infer<typeof BannerUpdateSchema>;
export type BannerCreateFormValues = zod.infer<typeof BannerCreateSchema>;
export type BannerFormValues = BannerUpdateFormValues;
