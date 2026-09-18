import type { ProductCreateUpdatePayload } from '../types/product.types';

import { resolveStorageImageUrl } from '@/utils/shop-variant-image';

export type VariantPayloadRow = NonNullable<ProductCreateUpdatePayload['variants']>[number];
export type ShopVariantPayloadRow = NonNullable<ProductCreateUpdatePayload['shop_variants']>[number];

export type VariantExistingImage = { id: number; url: string };

function toFiniteNumber(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toFlag01(value: unknown, fallback?: 0 | 1): 0 | 1 | undefined {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  return fallback;
}

function toIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(Number).filter((n) => Number.isFinite(n) && n > 0);
}

function sameIdSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((id, i) => id === right[i]);
}

/** Admin GET uses `url`; user GET uses `path`. Either is a full URL (or storage path). */
export function normalizeVariantExistingImages(raw: unknown): VariantExistingImage[] {
  if (!Array.isArray(raw)) return [];
  const out: VariantExistingImage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const id = Number(rec.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const rawUrl = rec.url ?? rec.path;
    const url = resolveStorageImageUrl(typeof rawUrl === 'string' ? rawUrl : null);
    if (!url) continue;
    out.push({ id, url });
  }
  return out;
}

export function variantExistingImageFormState(images: unknown): {
  existing_images: VariantExistingImage[];
  existing_images_ids: number[];
  original_existing_images_ids: number[];
} {
  const existing_images = normalizeVariantExistingImages(images);
  const existing_images_ids = existing_images.map((img) => img.id);
  return {
    existing_images,
    existing_images_ids,
    original_existing_images_ids: [...existing_images_ids],
  };
}

/**
 * Multipart image keys for a variant row.
 *
 * - untouched → omit both keys (backend keeps current media)
 * - add on top of saved → `existing_images_ids` + new `images`
 * - replace all → `images` only
 * - delete all → `existing_images_ids: []`
 */
export function variantImageFieldsFromRow(
  row: Record<string, unknown> | null | undefined,
  options?: { omitImages?: boolean }
): Pick<VariantPayloadRow, 'images' | 'existing_images_ids'> {
  if (!row || options?.omitImages) return {};

  const files = Array.isArray(row.images)
    ? (row.images as unknown[]).filter((f): f is File => f instanceof File)
    : [];
  const currentIds = toIdList(row.existing_images_ids ?? row.existingImageIds);
  const hasOriginal =
    Array.isArray(row.original_existing_images_ids) ||
    Array.isArray(row.originalExistingImageIds);
  const originalIds = toIdList(row.original_existing_images_ids ?? row.originalExistingImageIds);

  if (files.length > 0) {
    if (currentIds.length > 0) {
      return { images: files, existing_images_ids: currentIds };
    }
    return { images: files };
  }

  if (hasOriginal && !sameIdSet(currentIds, originalIds)) {
    return { existing_images_ids: currentIds };
  }

  return {};
}

/** `existing_images_ids[]` — empty array is sent so Laravel sees the key (clear-all). */
export function appendExistingImageIdList(formData: FormData, key: string, ids: number[]): void {
  if (ids.length === 0) {
    formData.append(`${key}[]`, '');
    return;
  }
  ids.forEach((id) => formData.append(`${key}[]`, String(id)));
}

/**
 * Backend whitelist for `variants[]`. Extra GET fields (`shops`, `price_currencies`,
 * `attributes`, `stock`, …) are ignored by the API and must not be forwarded.
 */
export function toVariantPayload(
  row: Record<string, unknown> | VariantPayloadRow | null | undefined,
  options?: { omitImages?: boolean }
): VariantPayloadRow | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = toFiniteNumber(r.id);
  const imageFields = variantImageFieldsFromRow(r, options);

  const payload: VariantPayloadRow = {
    attributes_values_ids: toIdList(r.attributes_values_ids ?? r.attributeValueIds),
    ...imageFields,
  };

  if (id != null && id > 0) payload.id = id;

  if (r.sku !== undefined && r.sku !== null && String(r.sku).trim() !== '') {
    payload.sku = String(r.sku).trim();
  }
  if (r.model !== undefined && r.model !== null && String(r.model).trim() !== '') {
    payload.model = String(r.model).trim();
  }
  if (r.barcode !== undefined && r.barcode !== null && String(r.barcode).trim() !== '') {
    payload.barcode = String(r.barcode).trim();
  }

  const price = toFiniteNumber(r.price);
  const priceSyp = toFiniteNumber(r.price_syp);
  if (price !== undefined) {
    payload.price = price;
  } else if (priceSyp !== undefined) {
    payload.price_syp = priceSyp;
  }
  const quantity = toFiniteNumber(r.quantity);
  if (quantity !== undefined) payload.quantity = Math.max(0, Math.floor(quantity));

  const discountTypeRaw = r.discount_type ?? r.discountType;
  const discountType =
    discountTypeRaw === 'percentage' || discountTypeRaw === 'fixed' || discountTypeRaw === 'none'
      ? discountTypeRaw
      : undefined;
  const discount = toFiniteNumber(r.discount);
  if (discountType !== undefined) {
    payload.discount_type = discountType;
    payload.discount = discountType === 'none' ? 0 : (discount ?? 0);
  } else if (discount !== undefined) {
    payload.discount = discount;
  }

  const isTrend = toFlag01(r.is_trend ?? r.isTrend, 0);
  if (isTrend !== undefined) payload.is_trend = isTrend;
  const isActive = toFlag01(r.is_active ?? r.isActive, 1);
  if (isActive !== undefined) payload.is_active = isActive;

  return payload;
}

/** `shop_variants[]` whitelist: shop_id + variant_index + optional cost_price. Never price/quantity. */
export function toShopVariantPayload(
  row: Record<string, unknown> | ShopVariantPayloadRow | null | undefined
): ShopVariantPayloadRow | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const shopId = toFiniteNumber(r.shop_id);
  const variantIndex = toFiniteNumber(r.variant_index);
  if (shopId == null || shopId <= 0 || variantIndex == null || variantIndex < 0) return null;
  const id = toFiniteNumber(r.id);
  const costPrice = toFiniteNumber(r.cost_price);
  return {
    ...(id != null && id > 0 ? { id } : {}),
    shop_id: shopId,
    variant_index: variantIndex,
    ...(costPrice !== undefined ? { cost_price: costPrice } : {}),
  };
}

export function toVariantPayloadList(
  rows: unknown,
  options?: { omitImages?: boolean }
): VariantPayloadRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => toVariantPayload(row as Record<string, unknown>, options))
    .filter((row): row is VariantPayloadRow => row != null);
}

export function toShopVariantPayloadList(rows: unknown): ShopVariantPayloadRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => toShopVariantPayload(row as Record<string, unknown>))
    .filter((row): row is ShopVariantPayloadRow => row != null);
}

function unwrapProduct(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    const inner = root.data as Record<string, unknown>;
    if (Array.isArray(inner.variants) || inner.id != null) return inner;
  }
  return root;
}

function shopLinksOfVariant(variant: unknown): unknown[] {
  if (!variant || typeof variant !== 'object') return [];
  const v = variant as Record<string, unknown>;
  if (Array.isArray(v.shops)) return v.shops;
  if (Array.isArray(v.shop_variants)) return v.shop_variants;
  return [];
}

/** True when the payload/body actually includes a `variants` array we can inspect. */
export function responseIncludesVariants(body: unknown): boolean {
  const product = unwrapProduct(body);
  return Array.isArray(product?.variants);
}

/** Product can be added to the cart only when at least one variant is linked to a shop. */
export function savedProductHasShopLink(body: unknown): boolean {
  const product = unwrapProduct(body);
  const variants = product?.variants;
  if (!Array.isArray(variants) || variants.length === 0) return false;
  return variants.some((v) => shopLinksOfVariant(v).length > 0);
}

/**
 * List-row heuristic: flag only when the row carries explicit evidence of missing
 * shop links. Rows without variant/shop embeddings are left unflagged.
 */
export function productRowHasNoShopLink(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false;
  const variants = row.variants;
  if (Array.isArray(variants)) {
    if (variants.length === 0) return true;
    return variants.every((v) => shopLinksOfVariant(v).length === 0);
  }
  const shops = row.shops;
  if (Array.isArray(shops)) return shops.length === 0 && row.shop == null;
  return false;
}
