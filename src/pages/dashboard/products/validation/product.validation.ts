import { z as zod } from 'zod';

import { issueIfPercentageDiscountOver100 } from 'src/utils/discount-percentage-zod';

import i18n from 'src/lib/i18n';

const t = (key: string) => i18n.t(key, { ns: 'validation' });

/** Empty input → `undefined`. Do not use `z.coerce.number().optional()` — coerce turns `undefined` into `NaN`. */
function optionalNonNegNumber(message?: string) {
  return zod.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, (message ? zod.number().min(0, { message }) : zod.number().min(0)).optional());
}

function optionalNonNegInt() {
  return zod.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : undefined;
  }, zod.number().int().min(0).optional());
}

/** Discount is optional integer 0–100 (percentage and fixed). Empty is omitted — never required. */
function optionalDiscountInt() {
  return zod.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return undefined;
    return Math.min(100, Math.max(0, Math.floor(n)));
  }, zod.number().int().min(0).max(100).optional());
}

// ----------------------------------------------------------------------

export const ProductSchema = zod
  .object({
    category_id: zod.coerce.number().min(1, { message: t('product.categoryRequired') }),
    brand_id: zod.coerce.number().min(0).optional(),
    /** internal = platform (vendor_id 1); external = pick vendor from list */
    vendor_scope: zod.enum(['internal', 'external']),
    vendor_id: zod.coerce.number().min(0).optional(),
    /**
     * `platform` = site (default); hide shops/vendor and omit shop_variants.
     * `shop` = must link at least one branch via shop_variants.
     */
    sale_channel: zod.enum(['platform', 'shop']).default('platform'),
    name: zod.object({
      en: zod.string().min(1, { message: t('product.nameEnRequired') }),
      ar: zod.string().min(1, { message: t('product.nameArRequired') }),
    }),
    description: zod.object({
      en: zod.string().optional().default(''),
      ar: zod.string().optional().default(''),
    }),
    full_description: zod
      .object({
        en: zod.string(),
        ar: zod.string(),
      })
      .optional(),
    country_id: zod.coerce.number().min(0).optional(),
    sale_country_id: zod.coerce.number().min(0).optional(),
    /** UI: amount in selected currency; `price` is always USD for the API. */
    price_currency_id: zod.coerce.number().min(0).optional().default(0),
    price_local: optionalNonNegNumber(),
    price: optionalNonNegNumber(t('product.pricePositive')),
    /** UI + API: SYP sale amount when USD `price` is empty. */
    price_syp: optionalNonNegNumber(),
    discount: optionalDiscountInt(),
    discount_type: zod.enum(['none', 'percentage', 'fixed']).default('none'),
    cost_price: optionalNonNegNumber(),
    cost_price_syp: optionalNonNegNumber(),
    /**
     * Product-level stock — optional on every product (with or without variants).
     * Never required; omit when empty. Do not toast “quantity must be positive”.
     */
    quantity: optionalNonNegInt(),
    /** From `/admin/units`; `0` = not selected. */
    unit_id: zod.coerce.number().min(0).optional().default(0),
    warranty_id: zod.coerce.number().min(0).optional().default(0),
    sku: zod.string().optional(),
    /** Admin product code — optional, unique on the backend when sent. */
    product_number: zod.string().optional(),
    model: zod.string().optional(),
    barcode: zod.string().optional(),
    time_prepare: zod.string().optional(),
    /** Product-level; used when vendor is external */
    delivery_time: zod.string().optional(),
    expiry_date: zod.preprocess(
      (v) => (v === '' || v === null || v === undefined ? '' : String(v).trim()),
      zod.string().optional()
    ),
    /** UI-only: filters vendor/category lists and drives restaurant form layout */
    is_restaurant: zod.boolean().default(false),
    is_instant_delivery: zod.coerce.number().min(0).max(1),
    is_visible: zod.coerce.number().min(0).max(1).default(1),
    thumbnail: zod.preprocess(
      (v) => (v instanceof File ? v : undefined),
      zod.instanceof(File).optional()
    ),
    images: zod.preprocess(
      (val) =>
        Array.isArray(val) ? val.filter((x): x is File => x instanceof File) : undefined,
      zod.array(zod.instanceof(File)).optional()
    ),
    existing_media_ids: zod.array(zod.coerce.number()).optional(),

    seo_title: zod
      .object({
        en: zod.string().optional(),
        ar: zod.string().optional(),
      })
      .optional(),
    seo_description: zod
      .object({
        en: zod.string().optional(),
        ar: zod.string().optional(),
      })
      .optional(),
    seo_keywords: zod
      .object({
        en: zod.string().optional(),
        ar: zod.string().optional(),
      })
      .optional(),
    seo_image: zod.preprocess(
      (v) => (v instanceof File ? v : undefined),
      zod.instanceof(File).optional()
    ),

    variants: zod
      .array(
        zod.object({
          id: zod.coerce.number().optional(),
          /** UI-only: which category attribute this card represents (not sent to the API). */
          category_attribute_id: zod.coerce.number().optional(),
          // Defaulted so the attribute-less restaurant row passes validation; the backend's own minimal variant also has [].
          attributes_values_ids: zod.array(zod.coerce.number()).default([]),
          images: zod.preprocess(
            (val) =>
              Array.isArray(val) ? val.filter((x): x is File => x instanceof File) : undefined,
            zod.array(zod.instanceof(File)).optional()
          ),
          existing_images_ids: zod.array(zod.coerce.number()).optional(),
          sku: zod.string().optional(),
          model: zod.string().optional(),
          barcode: zod.string().optional(),
          price: optionalNonNegNumber(t('product.pricePositive')),
          price_syp: optionalNonNegNumber(),
          quantity: optionalNonNegInt(),
          discount: optionalDiscountInt(),
          discount_type: zod.enum(['none', 'percentage', 'fixed']).optional().default('none'),
          max_purchase_quantity: optionalNonNegNumber(),
          is_trend: zod.coerce.number().min(0).max(1).optional().default(0),
          is_active: zod.coerce.number().min(0).max(1).optional().default(1),
        })
      )
      .optional(),

    category_details: zod
      .array(
        zod.object({
          id: zod.coerce.number().optional(),
          category_detail_id: zod.coerce.number(),
          detail_value: zod.object({
            en: zod.string(),
            ar: zod.string(),
          }),
        })
      )
      .optional(),

    extra_details: zod
      .array(
        zod.object({
          id: zod.coerce.number().optional(),
          product_extra_detail_id: zod.coerce.number(),
          quantity: zod.preprocess(
            (v) => (v === '' || v === null || v === undefined ? 1 : v),
            zod.coerce.number().min(1, { message: t('product.extraDetailQuantityMin') })
          ),
          price: zod.preprocess(
            (v) => {
              if (v === '' || v === null || v === undefined) return undefined;
              const n = typeof v === 'number' ? v : Number(v);
              return Number.isFinite(n) ? n : undefined;
            },
            zod
              .number({
                invalid_type_error: t('product.extraDetailPriceRequired'),
                required_error: t('product.extraDetailPriceRequired'),
              })
              .min(0, { message: t('product.pricePositive') })
              .optional()
          ),
        })
      )
      .optional()
      .superRefine((rows, ctx) => {
        const list = rows ?? [];
        list.forEach((row, i) => {
          if (!row.product_extra_detail_id || row.product_extra_detail_id <= 0) {
            ctx.addIssue({
              code: zod.ZodIssueCode.custom,
              message: t('product.extraDetailPresetRequired'),
              path: [i, 'product_extra_detail_id'],
            });
          } else if (row.price == null || Number.isNaN(Number(row.price))) {
            ctx.addIssue({
              code: zod.ZodIssueCode.custom,
              message: t('product.extraDetailPriceRequired'),
              path: [i, 'price'],
            });
          }
        });
        const ids = list
          .map((r) => Number(r.product_extra_detail_id))
          .filter((n) => n > 0);
        if (ids.length !== new Set(ids).size) {
          ctx.addIssue({
            code: zod.ZodIssueCode.custom,
            message: t('product.extraDetailDuplicate'),
            path: ['extra_details'],
          });
        }
      }),

    bought_with: zod.preprocess(
      (val) => {
        if (!Array.isArray(val)) return [];
        return val
          .map((v) => (typeof v === 'object' && v != null && 'id' in v ? (v as any).id : v))
          .filter((v) => v !== '' && v != null && !Number.isNaN(Number(v)))
          .map((v) => Number(v));
      },
      zod.array(zod.number()).optional()
    ),

    shop_variants: zod
      .array(
        zod.object({
          id: zod.coerce.number().optional(),
          shop_id: zod.coerce.number(),
          variant_index: zod.coerce.number(),
          cost_price: optionalNonNegNumber(),
        })
      )
      .optional(),

    badges: zod
      .array(zod.number())
      .default([]),

    icon_ids: zod.array(zod.coerce.number()).default([]),
  })
  .superRefine((data, ctx) => {
    const isShopChannel = data.sale_channel === 'shop' || data.is_restaurant === true;
    // Vendor is optional (filter only). Branch via shop_variants is required for shop channel.
    if (isShopChannel) {
      const links = (data.shop_variants ?? []).filter(
        (sv) => sv != null && Number(sv.shop_id) > 0
      );
      if (links.length === 0) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          message: t('product.shopRequiredForShopChannel'),
          path: ['shop_variants'],
        });
      }
    }
    // media / images are optional — products can be created without gallery photos
    issueIfPercentageDiscountOver100(ctx, data.discount_type, data.discount, ['discount']);
    (data.variants ?? []).forEach((row, i) => {
      issueIfPercentageDiscountOver100(ctx, row.discount_type, row.discount, [
        'variants',
        i,
        'discount',
      ]);
    });
  });

export type ProductFormValues = zod.infer<typeof ProductSchema>;
