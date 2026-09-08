import type { CurrencyData } from '@/pages/dashboard/currencies/types/currency.types';
import type { ProductExtraDetailRowApi } from '@/pages/dashboard/categories/types/product-extra-detail.types';
import type {
  ProductDetailData,
  ProductCreateUpdatePayload,
} from '@/pages/dashboard/products/types/product.types';

import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { apiRoutes, axiosInstance } from '@/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate } from 'react-router';
import { Iconify } from '@/shared/components/iconify';
import { useQuery, useQueries } from '@tanstack/react-query';
import { formatTranslated } from '@/utils/format-translated';
import { getApiErrorMessage } from '@/lib/get-api-error-message';
import { useFetchUnits } from '@/pages/dashboard/units/hooks/unit';
import { useFetchShops } from '@/pages/dashboard/vendor/hooks/shop';
import { _ShopApi } from '@/pages/dashboard/vendor/api/shop.services';
import { compressImage, compressImages } from '@/utils/compress-image';
import { _VendorApi } from '@/pages/dashboard/vendor/api/vendor.services';
import { _BrandApi } from '@/pages/dashboard/products/api/brand.services';
import { _ProductApi } from '@/pages/dashboard/products/api/product.services';
import { useForm, useWatch, Controller, useFieldArray } from 'react-hook-form';
import { _CountryApi } from '@/pages/dashboard/countries/api/country.services';
import { useId, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFetchCurrencies } from '@/pages/dashboard/currencies/hooks/currency';
import { useFetchWarranties } from '@/pages/dashboard/warranties/hooks/warranty';
import { InfiniteScrollSelect } from '@/shared/components/infinite-scroll-select';
import { _CategoryApi } from '@/pages/dashboard/categories/api/category.services';
import { useFetchCategoryById } from '@/pages/dashboard/categories/hooks/category';
import { TinyMCEEditorField } from '@/shared/components/tinymce-editor/tinymce-editor';
import { _SaleCountryApi } from '@/pages/dashboard/sale-countries/api/sale-country.services';
import { useVariantDeleteFlow } from '@/pages/dashboard/products/hooks/use-variant-delete-flow';
import { ProductFormExtrasTab } from '@/pages/dashboard/products/components/ProductFormExtrasTab';
import { ProductPricingFields } from '@/pages/dashboard/products/components/ProductPricingFields';
import { useFetchCategoryAttributes } from '@/pages/dashboard/categories/hooks/category-attribute';
import { useFetchProductExtraDetails } from '@/pages/dashboard/categories/hooks/product-extra-detail';
import { ProductVariantsCardList } from '@/pages/dashboard/products/components/ProductVariantsCardList';
import { VariantDeleteImpactDialog } from '@/pages/dashboard/products/components/VariantDeleteImpactDialog';
import { CategoryLeafCascadeFields } from '@/pages/dashboard/categories/components/category-leaf-cascade-fields';
import { ProductFormBoughtWithSection } from '@/pages/dashboard/products/components/ProductFormBoughtWithSection';
import {
  ProductSchema,
  type ProductFormValues,
} from '@/pages/dashboard/products/validation/product.validation';
import {
  sortedComboKey,
  resolveAttributeValuesByIds,
} from '@/pages/dashboard/products/utils/variant-combinations';
import {
  useCreateProduct,
  useUpdateProduct,
  useFetchProductById,
} from '@/pages/dashboard/products/hooks/product';
import {
  useUpdateProductVariant,
  useUpdateShopProductVariant,
} from '@/pages/dashboard/products/hooks/product-variant';
import {
  VariantGeneratorPanel,
  type GeneratedVariantRow,
} from '@/pages/dashboard/products/components/VariantGeneratorPanel';
import {
  toVariantPayload,
  toShopVariantPayload,
  savedProductHasShopLink,
  responseIncludesVariants,
} from '@/pages/dashboard/products/utils/variant-payload';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';
import { Label } from 'src/shared/components/label';
import { Box, Tab, Tabs, Button, Typography } from 'src/shared/ui';
import { CreateFormLayout } from 'src/shared/components/forms/create-form-layout';
import { RHFInfiniteSelect } from 'src/shared/components/hook-form/rhf-infinite-select';

import { ProductShopVariantsSection } from './ProductShopVariantsSection';

// ----------------------------------------------------------------------

const brandFetcher = (page: number, limit: number) =>
  _BrandApi.getListBrands({ page, per_page: limit }).then((r) => ({
    data: {
      items: r.data.items.map((b) => ({ id: b.id, label: b.name })),
      pagination: r.data.pagination,
    },
  }));

const countryFetcher = (page: number, limit: number) =>
  _CountryApi.getListCountries({ page, per_page: limit }).then((r) => {
    const items = r.data.items.map((c) => ({
      id: c.id,
      label: formatTranslated(c.name as Parameters<typeof formatTranslated>[0]),
    }));
    const pagination = r.data.pagination ?? {
      current_page: page,
      last_page: page,
      per_page: limit,
      total: items.length,
    };
    return { data: { items, pagination } };
  });

const saleCountryFetcher = (page: number, limit: number) =>
  _SaleCountryApi.getListSaleCountries({ page, per_page: limit }).then((r) => ({
    data: {
      items: r.data.items.map((c) => {
        const icon = typeof c.icon === 'string' ? c.icon.trim() : '';
        const isUrl = /^https?:\/\//i.test(icon);
        const label = icon && !isUrl ? `${icon} ${c.name}` : c.name;
        return { id: c.id, label };
      }),
      pagination: r.data.pagination,
    },
  }));

function isSyriaSaleCountry(item: { name?: string | null; icon?: string | null }): boolean {
  const name = String(item.name ?? '').toLowerCase();
  const icon = String(item.icon ?? '').trim();
  return (
    icon === '🇸🇾' ||
    name.includes('syria') ||
    name.includes('سوريا') ||
    name.includes('سوریة')
  );
}

function isDeepDirty(value: unknown): boolean {
  if (value === true) return true;
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => isDeepDirty(item));
  return Object.values(value as Record<string, unknown>).some((item) => isDeepDirty(item));
}

function generateRandomSku(): string {
  return 'SKU-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function makeBlankVariantRow(): GeneratedVariantRow {
  return {
    attributes_values_ids: [],
    sku: '',
    discount_type: 'none',
    images: [],
    existing_images_ids: [],
    model: '',
    barcode: '',
    is_trend: 0,
    is_active: 1,
  };
}

type CategoryDetailValueOption = { en: string; ar: string };

function normalizeCategoryDetailValueOptions(raw: unknown): CategoryDetailValueOption[] {
  if (!Array.isArray(raw)) return [];
  const out: CategoryDetailValueOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const en = o.en != null ? String(o.en) : '';
    const ar = o.ar != null ? String(o.ar) : '';
    if (en.trim() === '' && ar.trim() === '') continue;
    out.push({ en, ar });
  }
  return out;
}

function categoryDetailOptionKey(opt: CategoryDetailValueOption): string {
  return JSON.stringify({ en: opt.en, ar: opt.ar });
}

function findCategoryDetailOptionKey(
  detailValue: { en: string; ar: string } | undefined,
  opts: CategoryDetailValueOption[]
): string {
  if (!detailValue || opts.length === 0) return '';
  const found = opts.find((o) => o.en === detailValue.en && o.ar === detailValue.ar);
  return found ? categoryDetailOptionKey(found) : '';
}

/** Bilingual label helper for category attributes. */
function attributeLabel(name: unknown, fallback = ''): string {
  if (name == null) return fallback;
  if (typeof name === 'object') {
    return formatTranslated(name as Parameters<typeof formatTranslated>[0]) || fallback;
  }
  return String(name);
}

const inputCls =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

function fieldInputClass(error?: boolean) {
  return error
    ? `${inputCls} border-destructive focus:ring-destructive/40`
    : inputCls;
}

function toTwoDecimalNumber(raw: string): number | undefined {
  if (raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  return Math.round(value * 100) / 100;
}

function toOptionalInt(raw: unknown): number | undefined {
  if (raw === '' || raw === null || raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.floor(n));
}

function toOptionalNumber(raw: unknown): number | undefined {
  if (raw === '' || raw === null || raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Hide `0` in optional / numeric variant & shop fields (show empty like cleared input). */
function optionalNumberInputDisplay(v: unknown): string | number {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '';
  return n;
}

function FieldErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Typography variant="caption" className="text-destructive mt-1 block">
      {message}
    </Typography>
  );
}

function parseCurrencyRate(c: CurrencyData): number {
  const r = Number((c as { exchange_rate?: string | number }).exchange_rate);
  return r > 0 ? r : 1;
}

/**
 * `exchange_rate` is units of this currency per 1 USD → USD = local / rate.
 * USD keeps 6 decimal places (not 2) because rates like 13000 SYP/USD make a cent
 * worth ~130 SYP — rounding to cents here would collapse small local amounts to 0.
 */
function localAmountToUsd(local: number, exchangeRate: number): number {
  const r = exchangeRate > 0 ? exchangeRate : 1;
  return Math.round((local / r) * 1e6) / 1e6;
}

function usdToLocalAmount(usd: number, exchangeRate: number): number {
  const r = exchangeRate > 0 ? exchangeRate : 1;
  return Math.round((usd * r) * 100) / 100;
}

/** Prefer API `*_currencies[CODE].amount`, else convert USD with the local rate. */
function currencyMapAmount(
  currencies: ProductDetailData['price_currencies'] | null | undefined,
  code: string
): number | undefined {
  if (!currencies) return undefined;
  const upper = code.toUpperCase();
  const row = currencies[upper] ?? currencies[code];
  if (!row || row.amount == null || Number.isNaN(Number(row.amount))) return undefined;
  return Number(row.amount);
}

/**
 * Send USD when known (after local sync both fields are usually filled); otherwise SYP
 * for server-side conversion. Never send both — API prefers USD and ignores SYP.
 */
function resolveUsdOrSyp(
  usd: number | null | undefined,
  syp: number | null | undefined
): { usd?: number; syp?: number } {
  const hasUsd = usd != null && !Number.isNaN(Number(usd));
  const hasSyp = syp != null && !Number.isNaN(Number(syp));
  return {
    usd: hasUsd ? Number(usd) : undefined,
    syp: !hasUsd && hasSyp ? Number(syp) : undefined,
  };
}

function priceAfterDiscount(
  price: number | null | undefined,
  discountType: string | null | undefined,
  discount: number | null | undefined
): number {
  const p = Number(price) || 0;
  const d = Number(discount) || 0;
  if (!p || !discountType || discountType === 'none' || d <= 0) return p;
  if (discountType === 'percentage') return Math.round((p - p * (d / 100)) * 100) / 100;
  if (discountType === 'fixed') return Math.max(0, Math.round((p - d) * 100) / 100);
  return p;
}

function formatProductAfterDiscountPreview(
  priceUsd: number | null | undefined,
  discountType: string | null | undefined,
  discount: number | null | undefined,
  sypRate: number | null | undefined
): string {
  if (priceUsd == null || priceUsd === undefined) return '';
  const usd = Number(priceUsd);
  if (!Number.isFinite(usd)) return '';
  const afterUsd = priceAfterDiscount(usd, discountType, discount);
  const parts: string[] = [`$${afterUsd}`];
  if (sypRate != null && sypRate > 0) {
    parts.push(`${usdToLocalAmount(afterUsd, sypRate)} SYP`);
  }
  return parts.join(' · ');
}

function numberInputDisplayKeepZero(v: unknown): string | number {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n;
}

/** Platform vendor id sent when "For me" is selected. */
const INTERNAL_VENDOR_ID = 1;

/** Collapse double slashes in the URL path (e.g. `/storage//tmp/...`) so `<img src>` loads reliably. */
function normalizeMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace(/\/+/g, '/');
    return u.toString();
  } catch {
    return url;
  }
}

/** Absolute URL for API media (handles relative paths and fixes `/storage//…`). */
function resolveProductMediaUrl(url: string): string {
  const t = url.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) {
    return normalizeMediaUrl(t);
  }
  const base = (CONFIG.serverUrl || '').replace(/\/$/, '');
  return normalizeMediaUrl(`${base}/${t.replace(/^\//, '')}`);
}

/** RHF + zod sometimes drop `File` refs from parsed `data`; always prefer `getValues()` for uploads. */
function filterFileList(v: unknown): File[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is File => x instanceof File);
}

/** Sorted attribute-value ids for matching a created variant back to a form variant row. */
function extractVariantAttributeValueIds(variant: any): number[] {
  if (!variant || typeof variant !== 'object') return [];
  const directIds = (variant as { attributes_values_ids?: unknown }).attributes_values_ids;
  if (Array.isArray(directIds)) {
    return directIds
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
  }
  const attrs = (variant as { attributes?: unknown }).attributes;
  if (Array.isArray(attrs)) {
    return attrs
      .map((a: any) => Number(a?.id ?? a?.attribute_value_id ?? a?.value_id))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
  }
  return [];
}

/** Created shop variants live under `shop_variants` (new API) or `shops` (legacy detail shape). */
function extractCreatedShopVariants(variant: any): any[] {
  if (!variant || typeof variant !== 'object') return [];
  if (Array.isArray(variant.shop_variants)) return variant.shop_variants;
  if (Array.isArray(variant.shops)) return variant.shops;
  return [];
}

function getShopIdFromCreatedShopVariant(csv: any): number {
  if (!csv) return 0;
  const fromShop = Number(csv?.shop?.id);
  if (Number.isFinite(fromShop) && fromShop > 0) return fromShop;
  const direct = Number(csv?.shop_id);
  return Number.isFinite(direct) && direct > 0 ? direct : 0;
}

/**
 * Many backends sync gallery media: if `existing_media_ids[]` is missing, all images are removed.
 * Prefer live → parsed data → last-known API ids (edit only) when the form state was lost.
 */
function resolveExistingMediaIdsForPayload(
  live: { existing_media_ids?: number[] },
  data: { existing_media_ids?: number[] },
  isEditMode: boolean,
  product: ProductDetailData | null | undefined
): number[] {
  if (Array.isArray(live.existing_media_ids)) {
    return live.existing_media_ids.map(Number).filter((x) => !Number.isNaN(x));
  }
  if (Array.isArray(data.existing_media_ids)) {
    return data.existing_media_ids.map(Number).filter((x) => !Number.isNaN(x));
  }
  if (isEditMode && product?.images?.length) {
    return product.images.map((img) => Number(img.id)).filter((x) => !Number.isNaN(x));
  }
  return [];
}

function resolveVariantExistingImageIds(
  lv: { existing_images_ids?: number[] } | undefined,
  dv: { existing_images_ids?: number[] },
  variantId: number | undefined,
  isEditMode: boolean,
  product: ProductDetailData | null | undefined
): number[] {
  const fromLv = lv?.existing_images_ids;
  // Non-empty array from the form (getValues) is authoritative.
  if (Array.isArray(fromLv) && fromLv.length > 0) {
    return fromLv.map(Number).filter((x) => !Number.isNaN(x));
  }
  // Explicit empty [] = user removed all variant images for this row.
  if (Array.isArray(fromLv) && fromLv.length === 0) {
    return [];
  }
  if (Array.isArray(dv.existing_images_ids) && dv.existing_images_ids.length > 0) {
    return dv.existing_images_ids.map(Number).filter((x) => !Number.isNaN(x));
  }
  if (isEditMode && variantId != null && product?.variants?.length) {
    const apiV = product.variants.find((x) => Number(x.id) === Number(variantId));
    if (apiV?.images?.length) {
      return apiV.images.map((img) => Number(img.id)).filter((x) => !Number.isNaN(x));
    }
  }
  return [];
}

/**
 * Preview server image on edit: `<img src>` only (no XHR — cross-origin blob fetches need CORS on storage URLs).
 * Optional `fallbackUrl` (e.g. first gallery image) when primary URL fails to load.
 */
function ExistingImagePreview({
  url,
  label,
  active,
  fallbackUrl,
}: {
  url: string | null | undefined;
  label: string;
  active: boolean;
  /** e.g. first gallery `images[0].url` when `thumbnail` tmp URL fails */
  fallbackUrl?: string | null;
}) {
  const { t } = useTranslation('table');
  const raw = typeof url === 'string' ? url.trim() : '';
  const fb = typeof fallbackUrl === 'string' ? fallbackUrl.trim() : '';

  const [usedGalleryFallback, setUsedGalleryFallback] = useState(false);
  const [directIdx, setDirectIdx] = useState(0);

  const directCandidates = (() => {
    const list: string[] = [];
    if (raw) {
      list.push(resolveProductMediaUrl(raw), raw);
    }
    if (fb) {
      list.push(resolveProductMediaUrl(fb), fb);
    }
    return Array.from(new Set(list.filter(Boolean)));
  })();

  const primaryUrlSet = new Set(
    raw ? [resolveProductMediaUrl(raw), raw].filter(Boolean) : []
  );

  useEffect(() => {
    setDirectIdx(0);
    setUsedGalleryFallback(false);
  }, [raw, fb, active]);

  if (!active || (!raw && !fb)) return null;

  const hrefPrimary =
    raw &&
    (raw.startsWith('http://') || raw.startsWith('https://')
      ? raw
      : `${(CONFIG.serverUrl || '').replace(/\/$/, '')}/${raw.replace(/^\//, '')}`);

  const hrefFallback =
    fb &&
    (fb.startsWith('http://') || fb.startsWith('https://')
      ? fb
      : `${(CONFIG.serverUrl || '').replace(/\/$/, '')}/${fb.replace(/^\//, '')}`);

  const exhaustedDirect =
    directCandidates.length > 0 && directIdx >= directCandidates.length;

  return (
    <Box className="mt-3 flex flex-col gap-2">
      {directIdx < directCandidates.length ? (
        <img
          key={`${directCandidates[directIdx]}-${directIdx}`}
          src={directCandidates[directIdx]}
          alt=""
          referrerPolicy="no-referrer"
          className="max-h-32 max-w-[280px] rounded-lg border border-border/60 object-contain bg-muted"
          onError={() => setDirectIdx((i) => i + 1)}
          onLoad={() => {
            const u = directCandidates[directIdx];
            setUsedGalleryFallback(!!(raw && fb && u && !primaryUrlSet.has(u)));
          }}
        />
      ) : exhaustedDirect ? (
        <Typography variant="caption" className="text-destructive">
          {t('form.productImagePreviewUnavailable')}
        </Typography>
      ) : null}
      {usedGalleryFallback && fb ? (
        <Typography variant="caption" className="text-muted-foreground">
          {t('form.productImagePreviewGalleryFallback')}
        </Typography>
      ) : null}
      <Typography variant="caption" className="text-muted-foreground">
        {label}
      </Typography>
      {hrefPrimary ? (
        <a
          href={hrefPrimary}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary break-all hover:underline"
        >
          {t('form.productImageOpenSavedUrl')}
        </a>
      ) : null}
      {hrefFallback && hrefFallback !== hrefPrimary ? (
        <a
          href={hrefFallback}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground break-all hover:underline"
        >
          {t('form.productImageOpenFallbackUrl')}
        </a>
      ) : null}
    </Box>
  );
}

function LocalFilePreview({
  file,
  label,
}: {
  file: File | null;
  label: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (!(file instanceof File)) {
      setPreviewUrl('');
      return () => {};
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!(file instanceof File)) return null;

  return (
    <Box className="mt-3 flex flex-col gap-2">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name || label}
          className="max-h-32 max-w-[280px] rounded-lg border border-border/60 object-contain bg-muted"
        />
      ) : null}
      <Typography variant="caption" className="text-muted-foreground">
        {label}
      </Typography>
      <Typography variant="caption" className="text-muted-foreground break-all">
        {file.name}
      </Typography>
    </Box>
  );
}

function RemovableLocalImageThumb({
  file,
  onRemove,
  removeAriaLabel,
  alt,
}: {
  file: File;
  onRemove: () => void;
  removeAriaLabel: string;
  alt?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <Box className="relative overflow-hidden rounded-lg group">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={alt || file.name}
          className="w-full h-32 object-cover rounded-lg border-2 border-primary/40"
        />
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 start-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-xl font-bold leading-none text-white shadow-lg ring-2 ring-white hover:bg-red-700"
        aria-label={removeAriaLabel}
      >
        ×
      </button>
    </Box>
  );
}

/** API returns `attribute` in one locale (often AR); category `name` may be {en, ar} — match any. */
function categoryAttrLabelMatches(attr: any, apiAttributeLabel: string): boolean {
  const api = String(apiAttributeLabel ?? '').trim().toLowerCase();
  if (!api) return false;
  if (typeof attr?.name === 'object' && attr.name) {
    const en = String(attr.name.en ?? '').trim().toLowerCase();
    const ar = String(attr.name.ar ?? '').trim().toLowerCase();
    if (api === en || api === ar) return true;
  }
  return api === String(attr?.name ?? '').trim().toLowerCase();
}

function normalizeHexForCompare(s: string) {
  const t = String(s).trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(t) ? t.toLowerCase() : t;
}

/** Resolve category attribute value id from API string (value or hex color, any locale). */
function findAttributeValueId(attr: any, rawVal: string): number | undefined {
  const vals = attr?.values ?? [];
  const target = String(rawVal ?? '').trim();
  const targetNorm = normalizeHexForCompare(target);
  const targetIsHex = /^#[0-9a-fA-F]{3,8}$/.test(target);

  for (const x of vals) {
    const candidates: string[] = [];
    if (typeof x?.value === 'string') candidates.push(x.value);
    else if (x?.value && typeof x.value === 'object') {
      if (x.value.en != null) candidates.push(String(x.value.en));
      if (x.value.ar != null) candidates.push(String(x.value.ar));
    }
    if (typeof x?.name === 'string') candidates.push(x.name);
    else if (x?.name && typeof x.name === 'object') {
      if (x.name.en != null) candidates.push(String(x.name.en));
      if (x.name.ar != null) candidates.push(String(x.name.ar));
    }
    for (const c of candidates) {
      const cTrim = String(c).trim();
      if (targetIsHex && /^#[0-9a-fA-F]{3,8}$/.test(cTrim)) {
        if (normalizeHexForCompare(cTrim) === targetNorm && x.id != null) return Number(x.id);
      } else if (cTrim.toLowerCase() === target.toLowerCase() && x.id != null) {
        return Number(x.id);
      }
    }
  }
  return undefined;
}

/**
 * Build `attributes_values_ids` from the variant's own `attributes` rows (one value per attribute type).
 * Prefers `value_id` (or `id`) on each attribute row — the same field the API returns and Details.tsx uses.
 * Falls back to string-label matching against categoryAttributes only when those direct IDs are absent.
 */
function resolveVariantAttributeValueIds(
  v: { attributes?: Array<{ attribute: string; value: string }> },
  categoryAttrs: any[]
): number[] {
  const attrs = (v.attributes ?? []) as any[];

  // Fast path: every row already has a resolved value ID — use them directly.
  const directIds = attrs
    .map((a: any) => {
      const vid = a.value_id ?? a.id;
      return vid != null && !Number.isNaN(Number(vid)) ? Number(vid) : null;
    })
    .filter((id): id is number => id !== null);

  if (directIds.length > 0 && directIds.length === attrs.length) {
    return [...new Set(directIds)];
  }

  // Slow path: string-label matching (fallback for rows without value_id).
  // Last row wins per attribute label (API sometimes repeats the same attribute many times).
  const lastRowByLabel = new Map<string, any>();
  for (const row of attrs) {
    const rawLabel = (row as any).attribute;
    const label =
      typeof rawLabel === 'object' && rawLabel !== null
        ? String(rawLabel.en ?? rawLabel.ar ?? '').trim()
        : String(rawLabel ?? '').trim();
    if (!label) continue;
    lastRowByLabel.set(label.toLowerCase(), row);
  }

  const ids: number[] = [];
  for (const row of lastRowByLabel.values()) {
    // Direct ID available on this row — use it.
    const vid = (row as any).value_id ?? null;
    if (vid != null && !Number.isNaN(Number(vid))) {
      ids.push(Number(vid));
      continue;
    }

    const rawLabel = (row as any).attribute;
    const label =
      typeof rawLabel === 'object' && rawLabel !== null
        ? String(rawLabel.en ?? rawLabel.ar ?? '').trim()
        : String(rawLabel ?? '').trim();
    const attr = categoryAttrs.find((ca: any) => categoryAttrLabelMatches(ca, label));
    if (!attr) continue;

    const rawValSrc = (row as any).value;
    const rawVal =
      typeof rawValSrc === 'object' && rawValSrc !== null
        ? String(rawValSrc.en ?? rawValSrc.ar ?? '').trim()
        : String(rawValSrc ?? '').trim();
    const idFound = findAttributeValueId(attr, rawVal);
    if (idFound != null && !Number.isNaN(idFound)) {
      ids.push(idFound);
    }
  }

  return ids;
}

function normalizeProductExtraLang(v: unknown): { en: string; ar: string } {
  if (typeof v === 'string') return { en: v.trim(), ar: v.trim() };
  if (v && typeof v === 'object') {
    const o = v as { en?: string; ar?: string };
    return { en: (o.en ?? '').trim(), ar: (o.ar ?? '').trim() };
  }
  return { en: '', ar: '' };
}

function findPresetIdForProductExtraPivot(
  pivot: { key?: { en?: string; ar?: string }; value?: { en?: string; ar?: string } },
  presets: ProductExtraDetailRowApi[]
): number {
  const ke = pivot.key?.en?.trim() ?? '';
  const ka = pivot.key?.ar?.trim() ?? '';
  const ve = pivot.value?.en?.trim() ?? '';
  const va = pivot.value?.ar?.trim() ?? '';
  for (const pr of presets) {
    const pk = normalizeProductExtraLang(pr.detail_key);
    const pv = normalizeProductExtraLang(pr.detail_value);
    if (pk.en === ke && pk.ar === ka && pv.en === ve && pv.ar === va) return pr.id;
  }
  return 0;
}

function labelProductExtraPreset(pr: ProductExtraDetailRowApi): string {
  const kt = formatTranslated(pr.detail_key as Parameters<typeof formatTranslated>[0]);
  const vt = formatTranslated(pr.detail_value as Parameters<typeof formatTranslated>[0]);
  return `${kt} — ${vt}`;
}

function toDateInputLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CreatePage() {
  const { t, i18n } = useTranslation('table');
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [mainCategoryId, setMainCategoryId] = useState(0);
  /** Create mode: gate form until user picks retail vs restaurant. Edit mode: true once product loads. */
  const [hasSelectedProductType, setHasSelectedProductType] = useState(isEditMode);
  const restaurantShopMetaRef = useRef<Map<number, { vendorId: number }>>(new Map());
  const prevIsRestaurantToggleRef = useRef<boolean | null>(null);
  /** Detect genuine (non-hydration) category changes to clear dependent state. */
  const prevMainCategoryIdRef = useRef<number | null>(null);
  const prevCategoryIdRef = useRef<number | null>(null);
  /** Extra categories to load "bought with" suggestions (merged with main product category). */
  const [boughtWithExtraCategoryIds, setBoughtWithExtraCategoryIds] = useState<number[]>([]);
  /** Create-mode default: Syria sale country label for the infinite select. */
  const [defaultSaleCountryLabel, setDefaultSaleCountryLabel] = useState<string | undefined>();
  const productImagesInputId = useId();
  const thumbnailInputId = useId();
  const seoImageInputId = useId();

  // Fetch dependencies
  const { data: productResponse, isLoading: isLoadingProduct } = useFetchProductById(id || '');

  const { data: currenciesResponse, isSuccess: currenciesReady } = useFetchCurrencies(1, 100);
  const activeCurrencies = useMemo(() => {
    const raw = currenciesResponse?.data?.items ?? [];
    return raw.filter((c) => {
      const active = c.is_active as boolean | number | undefined;
      return active === true || active === 1;
    });
  }, [currenciesResponse]);

  const usdCurrency = useMemo(
    () =>
      activeCurrencies.find((c) => String(c.code).toUpperCase() === 'USD') ??
      activeCurrencies.find((c) => c.is_default) ??
      activeCurrencies[0],
    [activeCurrencies]
  );

  const sypCurrency = useMemo(
    () => activeCurrencies.find((c) => String(c.code).toUpperCase() === 'SYP'),
    [activeCurrencies]
  );

  const productDualPriceReady = Boolean(usdCurrency && sypCurrency);

  const { data: unitsListResponse } = useFetchUnits({ page: 1, per_page: 500, is_active: 1 });
  const unitSelectOptions = useMemo(() => {
    const items = unitsListResponse?.data?.items ?? [];
    return items.map((u) => ({
      id: u.id,
      label: formatTranslated(u.name as { en?: string; ar?: string }),
    }));
  }, [unitsListResponse?.data?.items]);

  const { data: warrantiesListResponse } = useFetchWarranties({ page: 1, per_page: 500, is_active: 1 });
  const warrantySelectOptions = useMemo(() => {
    const items = warrantiesListResponse?.data?.items ?? [];
    return items.map((w) => ({
      id: w.id,
      label: formatTranslated(w.name_translations ?? w.name),
    }));
  }, [warrantiesListResponse?.data?.items]);

  const { data: iconsListResponse, isLoading: isLoadingIcons } = useQuery({
    queryKey: ['icons', 'product-form'],
    queryFn: () =>
      axiosInstance.get(apiRoutes.icon.list, { params: { per_page: 200 } }).then((r) => r.data),
  });
  const iconOptions: any[] = (() => {
    const raw = iconsListResponse as any;
    if (!raw) return [];
    return raw.data?.data ?? raw.data?.items ?? (Array.isArray(raw.data) ? raw.data : []) ?? [];
  })();

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const updateVariantMutation = useUpdateProductVariant();
  const updateShopVariantMutation = useUpdateShopProductVariant();

  const todayDateInputMin = useMemo(() => toDateInputLocalYMD(new Date()), []);

  const defaultValues: ProductFormValues = {
    category_id: 0,
    brand_id: 0,
    vendor_scope: 'internal',
    vendor_id: INTERNAL_VENDOR_ID,
    sale_channel: 'platform',
    name: { en: '', ar: '' },
    description: { en: '', ar: '' },
    full_description: { en: '', ar: '' },
    country_id: 0,
    sale_country_id: 0,
    price_currency_id: 0,
    price_local: undefined,
    price: undefined,
    price_syp: undefined,
    discount: undefined,
    discount_type: 'none',
    cost_price: undefined,
    cost_price_syp: undefined,
    quantity: undefined,
    product_number: '',
    unit_id: 0,
    warranty_id: 0,
    sku: '',
    model: '',
    barcode: '',
    time_prepare: '',
    delivery_time: '',
    expiry_date: '',
    is_restaurant: false,
    is_instant_delivery: 0,
    is_visible: 1,
    thumbnail: undefined,
    images: [],
    existing_media_ids: [],
    seo_title: { en: '', ar: '' },
    seo_description: { en: '', ar: '' },
    seo_keywords: { en: '', ar: '' },
    seo_image: undefined,
    badges: [],
    icon_ids: [],
    variants: [],
    category_details: [],
    extra_details: [],
    bought_with: [],
    shop_variants: [],
  };

  const methods = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema) as any,
    defaultValues,
  });

  const { handleSubmit, reset, control, watch, setValue, getValues, formState: { errors, dirtyFields } } = methods;

  const priceWatch = watch('price');

  /** Keep UI-only `price_currency_id` / `price_local` aligned with canonical USD `price`. */
  useEffect(() => {
    if (!currenciesReady || !usdCurrency) return;
    setValue('price_currency_id', usdCurrency.id, { shouldDirty: false });
    const raw = priceWatch as number | string | null | undefined;
    if (
      raw == null ||
      (typeof raw === 'string' && raw.trim() === '') ||
      Number.isNaN(Number(raw))
    ) {
      setValue('price_local', undefined, { shouldDirty: false });
      return;
    }
    const usd = Number(raw);
    setValue('price_local', usdToLocalAmount(usd, parseCurrencyRate(usdCurrency)), {
      shouldDirty: false,
    });
  }, [currenciesReady, usdCurrency, priceWatch, setValue]);

  useEffect(() => {
    setMainCategoryId(0);
    prevMainCategoryIdRef.current = null;
    prevCategoryIdRef.current = null;
  }, [id]);

  const categoryId = watch('category_id');
  const isRestaurantToggle = watch('is_restaurant');

  // ─── Restaurant mode detection ────────────────────────────────────────
  const { data: selectedCategoryResp } = useFetchCategoryById(
    categoryId && categoryId > 0 ? categoryId : ''
  );
  const categoryIsRestaurant = Boolean(
    selectedCategoryResp?.data?.is_restaurant ??
    (isEditMode && (productResponse?.is_restaurant ?? productResponse?.category?.is_restaurant))
  );
  const restaurantMode = isRestaurantToggle || categoryIsRestaurant;
  const categoryRestaurantFilter = isRestaurantToggle ? 1 : 0;

  /** Full flat category list (current restaurant/retail mode) — used to hydrate the cascade in edit mode. */
  const {
    data: flatCategoryItems = [],
    dataUpdatedAt: flatCategoriesUpdatedAt,
    isFetched: flatCategoriesFetched,
  } = useQuery({
    queryKey: ['categories', 'flat-all', 'product-form', categoryRestaurantFilter],
    queryFn: () =>
      _CategoryApi.getListAllCategoriesFlat({ per_page: 500, is_restaurant: categoryRestaurantFilter }),
    enabled: hasSelectedProductType,
  });

  const hydrateLeafCategoryId = useMemo(() => {
    const fromForm = categoryId ? Number(categoryId) : 0;
    if (fromForm > 0) return fromForm;
    if (!isEditMode || !productResponse?.category?.id) return null;
    const savedIsRestaurant = Boolean(
      productResponse.is_restaurant ?? productResponse.category?.is_restaurant
    );
    if (Boolean(isRestaurantToggle) !== savedIsRestaurant) return null;
    return Number(productResponse.category.id) || null;
  }, [categoryId, isEditMode, productResponse, isRestaurantToggle]);

  const categoryHydrationKey = `${id ?? 'new-product'}|${isRestaurantToggle ? 'restaurant' : 'retail'}`;

  const vendorFetcher = useCallback(
    (page: number, limit: number) =>
      _VendorApi.getListVendor({
        page,
        limit,
        ...(isRestaurantToggle ? { is_restaurant: 1 } : {}),
      }).then((r) => ({
        data: {
          items: r.data.items.map((v) => ({ id: v.id, label: formatTranslated(v.name) })),
          pagination: r.data.pagination,
        },
      })),
    [isRestaurantToggle]
  );

  // Null out restricted fields whenever restaurantMode becomes true
  useEffect(() => {
    if (!restaurantMode) return;
    setValue('brand_id', 0);
    setValue('sku', '');
    setValue('model', '');
    setValue('barcode', '');
    setValue('country_id', 0);
    setValue('sale_country_id', 0);
    const vars = getValues('variants') ?? [];
    vars.forEach((_, i) => {
      setValue(`variants.${i}.model`, '');
      setValue(`variants.${i}.barcode`, '');
    });
  }, [restaurantMode, setValue, getValues]);

  // Create mode: default sale country to Syria (backend also defaults if omitted).
  useEffect(() => {
    if (isEditMode || restaurantMode) return undefined;
    let cancelled = false;
    _SaleCountryApi
      .getListSaleCountries({ page: 1, per_page: 100, is_active: 1 })
      .then((r) => {
        if (cancelled) return;
        const items = r.data.items ?? [];
        const syria = items.find(isSyriaSaleCountry);
        if (!syria) return;
        const current = Number(getValues('sale_country_id') || 0);
        if (current > 0 && current !== syria.id) return;
        const icon = typeof syria.icon === 'string' ? syria.icon.trim() : '';
        const isUrl = /^https?:\/\//i.test(icon);
        const label = icon && !isUrl ? `${icon} ${syria.name}` : syria.name;
        setDefaultSaleCountryLabel(label);
        setValue('sale_country_id', syria.id, { shouldDirty: false });
      })
      .catch(() => {
        /* optional default — backend still falls back to Syria */
      });
    return () => {
      cancelled = true;
    };
  }, [isEditMode, restaurantMode, getValues, setValue]);

  const skipRestaurantToggleReset = useRef(false);
  useEffect(() => {
    if (skipRestaurantToggleReset.current) {
      skipRestaurantToggleReset.current = false;
      prevIsRestaurantToggleRef.current = isRestaurantToggle;
      return;
    }
    if (prevIsRestaurantToggleRef.current === null) {
      prevIsRestaurantToggleRef.current = isRestaurantToggle;
      return;
    }
    if (prevIsRestaurantToggleRef.current === isRestaurantToggle) return;
    prevIsRestaurantToggleRef.current = isRestaurantToggle;
    setMainCategoryId(0);
    setValue('category_id', 0);
    setValue('variants', []);
    setValue('shop_variants', []);
    restaurantShopMetaRef.current.clear();
    if (isRestaurantToggle) {
      setValue('sale_channel', 'shop');
    } else {
      setValue('sale_channel', 'platform');
      setValue('vendor_scope', 'internal');
      setValue('vendor_id', INTERNAL_VENDOR_ID);
    }
  }, [isRestaurantToggle, setValue, getValues]);

  // ──────────────────────────────────────────────────────────────────────

  const existingMediaIds = watch('existing_media_ids') ?? [];
  const watchedVariants = watch('variants') || [];
  const watchedShopVariants = watch('shop_variants') || [];
  const watchedProductSku = watch('sku') ?? '';
  const existingVariantComboKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of watchedVariants) {
      const ids = Array.isArray(row?.attributes_values_ids)
        ? row.attributes_values_ids.map(Number).filter((n) => n > 0)
        : [];
      if (ids.length > 0) keys.add(sortedComboKey(ids));
    }
    return keys;
  }, [watchedVariants]);
  const watchedBoughtWith = watch('bought_with') || [];
  const watchedVendorId = watch('vendor_id');
  const saleChannelWatch = watch('sale_channel');
  const isShopSaleChannel =
    saleChannelWatch === 'shop' || isRestaurantToggle === true;
  const sypRate = sypCurrency ? parseCurrencyRate(sypCurrency) : null;
  /** Optional vendor filter for shop-channel branch list (0 = all vendors). */
  const shopVendorFilterId = Number(watchedVendorId) || 0;
  const { data: shopsResponse } = useFetchShops(1, 100, {
    vendorId: shopVendorFilterId > 0 ? shopVendorFilterId : undefined,
    enabled: isShopSaleChannel,
  });
  const shops = (shopsResponse as any)?.data?.items ?? [];

  /** When the vendor filter changes, clear shop rows (list is per-vendor). */
  const skipInitialVendorFilterEffect = useRef(true);
  useEffect(() => {
    if (!isShopSaleChannel) return;
    if (skipInitialVendorFilterEffect.current) {
      skipInitialVendorFilterEffect.current = false;
      return;
    }
    setValue('shop_variants', []);
  }, [watchedVendorId, isShopSaleChannel, setValue]);

  /** Restaurant products are always branch-linked. */
  useEffect(() => {
    if (isRestaurantToggle) {
      setValue('sale_channel', 'shop', { shouldDirty: false });
    }
  }, [isRestaurantToggle, setValue]);

  const selectedRestaurantShopId = useMemo(() => {
    if (!isRestaurantToggle || !categoryId || categoryId <= 0) return 0;
    const row = watchedShopVariants.find((sv) => Number(sv.variant_index) === 0);
    return Number(row?.shop_id) > 0 ? Number(row!.shop_id) : 0;
  }, [isRestaurantToggle, categoryId, watchedShopVariants]);

  const selectedRestaurantShopInitialLabel = useMemo(() => {
    if (selectedRestaurantShopId <= 0) return undefined;
    for (const v of productResponse?.variants ?? []) {
      for (const s of v.shops ?? []) {
        if (Number(s.shop_id) === selectedRestaurantShopId) {
          return typeof s.shop_name === 'string' ? s.shop_name : formatTranslated(s.shop_name as any);
        }
      }
    }
    return undefined;
  }, [selectedRestaurantShopId, productResponse?.variants]);

  /**
   * Warn only for shop-channel products missing branch links. Platform products are
   * auto-linked on the backend — never show this for `sale_channel=platform`.
   */
  const productMissingShopLink = useMemo(() => {
    if (!isEditMode || !productResponse) return false;
    const channel = productResponse.sale_channel ?? 'platform';
    if (channel !== 'shop' && !productResponse.is_restaurant) return false;
    const vars = productResponse.variants ?? [];
    if (vars.length === 0) return true;
    return !vars.some((v) => {
      const links = v.shops ?? (v as { shop_variants?: unknown[] }).shop_variants ?? [];
      return Array.isArray(links) && links.length > 0;
    });
  }, [isEditMode, productResponse]);

  const restaurantShopFetcher = useCallback(
    (page: number, limit: number) => {
      if (!categoryId || categoryId <= 0) {
        return Promise.resolve({
          data: { items: [], pagination: { current_page: 1, last_page: 1, per_page: limit, total: 0 } },
        });
      }
      return _ShopApi.getListShop({
        page,
        per_page: limit,
        category_id: categoryId,
        shop_type: 'restaurant',
      }).then((r) => ({
        data: {
          items: r.data.items.map((shop) => {
            const vendorId = Number(shop.vendor_id ?? shop.vendor?.id ?? 0);
            restaurantShopMetaRef.current.set(shop.id, { vendorId });
            return {
              id: shop.id,
              label: formatTranslated(shop.name as any),
            };
          }),
          pagination: r.data.pagination,
        },
      }));
    },
    [categoryId]
  );

  const handleRestaurantShopSelect = useCallback(
    (shopId: number) => {
      if (shopId <= 0) {
        setValue('shop_variants', []);
        return;
      }
      const meta = restaurantShopMetaRef.current.get(shopId);
      const vendorId = meta?.vendorId ?? 0;
      setValue('vendor_scope', 'external');
      if (vendorId > 0)       setValue('vendor_id', vendorId);

      const existing = getValues('shop_variants') ?? [];
      const idx = existing.findIndex((sv) => Number(sv.variant_index) === 0);
      if (idx >= 0) {
        const next = [...existing];
        next[idx] = { ...next[idx], shop_id: shopId };
        setValue('shop_variants', next);
      } else {
        setValue('shop_variants', [...existing, { shop_id: shopId, variant_index: 0 }]);
      }
    },
    [getValues, setValue]
  );

  /** Root category changed (not the initial edit-mode hydration) — its attributes no longer match existing variants. */
  useEffect(() => {
    const prev = prevMainCategoryIdRef.current;
    if (prev !== null && prev !== 0 && prev !== mainCategoryId) {
      setValue('variants', []);
    }
    prevMainCategoryIdRef.current = mainCategoryId;
  }, [mainCategoryId, setValue]);

  /** Effective category (any level) changed (not the initial edit-mode hydration) — clear category-specific state. */
  useEffect(() => {
    const prev = prevCategoryIdRef.current;
    if (prev !== null && prev !== 0 && prev !== categoryId) {
      setValue('category_details', []);
      if (isRestaurantToggle) {
        setValue('shop_variants', []);
        setValue('vendor_id', 0);
        restaurantShopMetaRef.current.clear();
      }
    }
    prevCategoryIdRef.current = categoryId;
  }, [categoryId, isRestaurantToggle, setValue]);

  const syncSelectedCategory = useCallback(
    (selectedCategoryId: number) => {
      setValue('category_id', selectedCategoryId, { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  // Attributes always come from the root (level 1), even if the product is saved on a parent or leaf.
  const { data: categoryAttributesAll, isLoading: isLoadingAttributes } =
    useFetchCategoryAttributes(
      {
        page: 1,
        per_page: 100,
        category_id: mainCategoryId ? Number(mainCategoryId) : undefined,
      },
      { requireCategoryId: true }
    );
  const categoryAttributes =
    (categoryAttributesAll?.data as { items?: unknown[]; data?: unknown[] } | undefined)?.items ??
    (categoryAttributesAll?.data as { data?: unknown[] } | undefined)?.data ??
    [];

  const { data: originCountriesRaw } = useQuery({
    queryKey: ['countries', 'all', 'product-origin'],
    queryFn: async () => {
      const r = await _CountryApi.getListCountries({ per_page: 1000 });
      const nested = r.data as
        | { items?: Array<{ id: number; name?: string | { en?: string; ar?: string } }> }
        | Array<{ id: number; name?: string | { en?: string; ar?: string } }>
        | undefined;
      if (Array.isArray(nested)) return nested;
      if (nested && Array.isArray(nested.items)) return nested.items;
      return [];
    },
  });
  const originCountryOptions = useMemo(() => {
    const items = originCountriesRaw ?? [];
    return items
      .map((c) => ({
        id: c.id,
        label: typeof c.name === 'string' ? c.name : formatTranslated(c.name as { en?: string; ar?: string }),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [originCountriesRaw]);

  // Fetch category details filtered by category_id
  const { data: categoryDetailsResponse } = useQuery({
    queryKey: ['categorydetail', 'by-category', categoryId],
    queryFn: () =>
      axiosInstance
        .get(apiRoutes.categoryDetail.list, { params: { category_id: categoryId, per_page: 100 } })
        .then((r) => r.data),
    enabled: !!categoryId && categoryId > 0,
  });
  const availableCategoryDetails: any[] =
    categoryDetailsResponse?.data?.data ??
    categoryDetailsResponse?.data?.items ??
    [];

  const categoryIdNum = categoryId ? Number(categoryId) : 0;

  const { data: productExtraDetailsResp, isFetching: isFetchingProductExtraPresets } =
    useFetchProductExtraDetails(
      { page: 1, per_page: 500, category_id: categoryIdNum, is_active: true },
      { enabled: categoryIdNum > 0 }
    );
  const productExtraPresets: ProductExtraDetailRowApi[] =
    productExtraDetailsResp?.data?.items ?? [];

  const prevCategoryForExtrasRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      prevCategoryForExtrasRef.current !== null &&
      prevCategoryForExtrasRef.current !== categoryIdNum
    ) {
      setValue('extra_details', []);
    }
    prevCategoryForExtrasRef.current = categoryIdNum;
  }, [categoryIdNum, setValue]);

  const { data: boughtWithCategoriesResp } = useQuery({
    queryKey: ['categories', 'product-form-bought-with'],
    queryFn: () => _CategoryApi.getListCategoriesPaginated({ page: 1, per_page: 500 }),
    enabled: categoryIdNum > 0,
  });
  const boughtWithCategoryOptions = useMemo(
    () =>
      (boughtWithCategoriesResp?.data?.items ?? []).map((c: { id: number; name: unknown }) => ({
        value: c.id,
        label: formatTranslated(c.name as Parameters<typeof formatTranslated>[0]),
      })),
    [boughtWithCategoriesResp?.data?.items]
  );

  const boughtWithCategoryIds = useMemo(() => {
    const ids: number[] = [];
    if (categoryIdNum > 0) ids.push(categoryIdNum);
    for (const x of boughtWithExtraCategoryIds) {
      const n = Number(x);
      if (n > 0 && !ids.includes(n)) ids.push(n);
    }
    return ids;
  }, [categoryIdNum, boughtWithExtraCategoryIds]);

  useEffect(() => {
    setBoughtWithExtraCategoryIds((prev) => prev.filter((x) => x !== categoryIdNum));
  }, [categoryIdNum]);

  const boughtWithProductQueries = useQueries({
    queries: boughtWithCategoryIds.map((cid) => ({
      queryKey: ['product', 'list-for-select', cid],
      queryFn: () =>
        axiosInstance
          .get(apiRoutes.product.list, {
            params: { per_page: 200, category_id: cid },
          })
          .then((r) => r.data),
      enabled: cid > 0,
    })),
  });

  const allProducts: any[] = useMemo(() => {
    const map = new Map<number, any>();
    for (const q of boughtWithProductQueries) {
      const raw = q.data as any;
      const items = raw?.data?.data ?? raw?.data?.items ?? [];
      for (const p of items) {
        const pid = Number(p.id);
        if (!map.has(pid)) map.set(pid, p);
      }
    }
    return [...map.values()];
  }, [boughtWithProductQueries]);

  const boughtWithListReady =
    boughtWithCategoryIds.length > 0 &&
    boughtWithProductQueries.every((q) => q.isFetched);
  const isFetchingBoughtWithList = boughtWithProductQueries.some((q) => q.isFetching);

  useEffect(() => {
    if (categoryIdNum <= 0 || !boughtWithListReady || isFetchingBoughtWithList) return;
    const allowed = new Set(allProducts.map((p: any) => Number(p.id)));
    const current = getValues('bought_with') ?? [];
    const next = current.filter((pid: number) => allowed.has(Number(pid)));
    if (next.length !== current.length) {
      setValue('bought_with', next, { shouldDirty: true });
    }
  }, [
    categoryIdNum,
    boughtWithListReady,
    isFetchingBoughtWithList,
    allProducts,
    getValues,
    setValue,
  ]);

  // Field Arrays
  const { fields: variantsFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants',
  });
  const { fields: extraDetailsFields, append: appendExtraDetail, remove: removeExtraDetail } =
    useFieldArray({ control, name: 'extra_details' });
  const { fields: categoryDetailsFields, append: appendCategoryDetail, remove: removeCategoryDetail } =
    useFieldArray({ control, name: 'category_details' });
  const watchedCategoryDetailRows = useWatch({ control, name: 'category_details' }) ?? [];
  const watchedExtraDetailsRows = useWatch({ control, name: 'extra_details' }) ?? [];
  const { fields: shopVariantsFields, append: appendShopVariant, remove: removeShopVariant } =
    useFieldArray({ control, name: 'shop_variants' });

  const handleRemoveVariant = useCallback(
    (variantIndex: number) => {
      const sv = getValues('shop_variants') ?? [];
      const nextSv = sv
        .filter((row) => Number(row?.variant_index) !== variantIndex)
        .map((row) => ({
          ...row,
          variant_index:
            Number(row?.variant_index) > variantIndex
              ? Number(row.variant_index) - 1
              : Number(row?.variant_index),
        }));
      setValue('shop_variants', nextSv, { shouldDirty: true });
      removeVariant(variantIndex);
    },
    [getValues, setValue, removeVariant]
  );

  /**
   * Server-side delete for variants that already exist. The form row is dropped only after
   * the API confirms, so a card can never silently disappear while still existing on the
   * backend. The dialog lists the delete's impact (baskets, recipes, order history) first.
   */
  const variantDeleteFlow = useVariantDeleteFlow<number>({
    target: 'product_variant',
    onDeleted: (_id, variantIndex) => {
      handleRemoveVariant(variantIndex);
      toast.success(t('form.variantDeleteSuccess'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t('form.variantDeleteFailed'))),
  });

  /**
   * Single entry point for every "remove variant" control (collapsed-row trash icon,
   * open-card remove button). Rows that were never saved are just dropped from the form.
   */
  const requestVariantDelete = variantDeleteFlow.requestDelete;
  const confirmAndRemoveVariant = useCallback(
    async (variantIndex: number) => {
      const variantId = getValues(`variants.${variantIndex}.id`);
      if (variantId && isEditMode) {
        await requestVariantDelete(variantId, variantIndex);
        return;
      }
      if (!window.confirm(t('form.variantRemoveConfirm'))) return;
      handleRemoveVariant(variantIndex);
    },
    [getValues, isEditMode, requestVariantDelete, handleRemoveVariant, t]
  );

  /**
   * Add ONE new variant to an existing product without disturbing the others.
   * Sends PUT /products/{id} with `variants[]` containing existing rows (id-only)
   * plus the new variant (full data). Matches the new variant back from the
   * response by sorted `attributes_values_ids` and returns its id.
   */
  const createSingleVariantOnProduct = useCallback(
    async (args: {
      productId: number | string;
      variantIndex: number;
      attrIds: number[];
      images: File[] | undefined;
      sku: string;
      model: string;
      barcode: string;
      price: number | undefined;
      price_syp?: number | undefined;
      quantity: number | undefined;
      discount_type?: 'none' | 'percentage' | 'fixed';
      discount?: number | undefined;
    }): Promise<number> => {
      const {
        productId,
        variantIndex,
        attrIds,
        images,
        sku,
        model,
        barcode,
        price,
        price_syp,
        quantity,
        discount_type,
        discount,
      } = args;
      const allVariants = getValues('variants') ?? [];
      const apiVariantsPayload: NonNullable<ProductCreateUpdatePayload['variants']> = [];
      allVariants.forEach((row, idx) => {
        if (idx === variantIndex) {
          const cleaned = toVariantPayload({
            ...row,
            attributes_values_ids: attrIds,
            images,
            sku,
            model,
            barcode,
            price,
            price_syp,
            quantity,
            discount_type,
            discount,
          });
          if (cleaned) apiVariantsPayload.push(cleaned);
        } else if (row?.id) {
          // Full whitelist for existing rows: a replace without price/quantity/images
          // would reset those fields to product defaults / delete media.
          const cleaned = toVariantPayload(row as Record<string, unknown>, { omitImages: true });
          if (cleaned) apiVariantsPayload.push(cleaned);
        }
      });
      const resp = await _ProductApi.updateProductVariantsOnly(productId, {
        variants: apiVariantsPayload,
      });
      const updatedVariants: any[] = Array.isArray(resp?.data?.variants)
        ? resp.data.variants
        : [];
      const sortedTarget = [...attrIds].sort((a, b) => a - b);
      const match = updatedVariants.find((cv) => {
        const cvIds = extractVariantAttributeValueIds(cv);
        if (cvIds.length !== sortedTarget.length) return false;
        return cvIds.every((vid, i) => vid === sortedTarget[i]);
      });
      return match?.id ? Number(match.id) : 0;
    },
    [getValues]
  );

  /**
   * Add ONE new shop variant to an existing product/variant pair without disturbing other rows.
   * Returns the newly-created shop_variant id (or 0 if not matched in response).
   */
  const createSingleShopVariantOnProduct = useCallback(
    async (args: {
      productId: number | string;
      parentVariantId: number;
      parentVariantIndex: number;
      shopId: number;
      costPrice: number | undefined;
    }): Promise<number> => {
      const { productId, parentVariantId, parentVariantIndex, shopId, costPrice } = args;
      const allVariants = getValues('variants') ?? [];
      const allShopVariants = getValues('shop_variants') ?? [];

      // Map original variant index -> remapped index in the payload (we send only variants with id).
      const variantsPayload: NonNullable<ProductCreateUpdatePayload['variants']> = [];
      const remap = new Map<number, number>();
      allVariants.forEach((row, idx) => {
        if (row?.id) {
          remap.set(idx, variantsPayload.length);
          const cleaned = toVariantPayload(row as Record<string, unknown>, { omitImages: true });
          if (cleaned) variantsPayload.push(cleaned);
        }
      });

      const shopVariantsPayload: NonNullable<ProductCreateUpdatePayload['shop_variants']> = [];
      // shop_variants is a full replace: send the complete kept list (not only the new row).
      allShopVariants.forEach((sv) => {
        if (!sv?.id) return;
        const remappedIdx = remap.get(Number(sv.variant_index));
        if (remappedIdx == null) return;
        const cleaned = toShopVariantPayload({ ...sv, variant_index: remappedIdx });
        if (cleaned) shopVariantsPayload.push(cleaned);
      });
      const parentRemapped = remap.get(parentVariantIndex);
      if (parentRemapped == null) {
        return 0;
      }
      const newShopRow = toShopVariantPayload({
        shop_id: shopId,
        variant_index: parentRemapped,
        cost_price: costPrice,
      });
      if (newShopRow) shopVariantsPayload.push(newShopRow);

      const resp = await _ProductApi.updateProductVariantsOnly(productId, {
        variants: variantsPayload,
        shop_variants: shopVariantsPayload,
      });
      const updatedVariants: any[] = Array.isArray(resp?.data?.variants)
        ? resp.data.variants
        : [];
      // The backend wipes and recreates EVERY shop-variant row of the variants it receives
      // (ProductService::syncVariantsAndShopLinks), so the `id`s the other rows still hold in
      // form state are dead the moment this call returns. Re-sync them all from the response,
      // keyed by (parent variant id, shop id) — otherwise the per-row save/delete buttons hit
      // shop-product-variants/{staleId}.
      const freshShopVariantIds = new Map<string, number>();
      updatedVariants.forEach((uv) => {
        const uvId = Number(uv?.id);
        if (!uvId) return;
        extractCreatedShopVariants(uv).forEach((csv) => {
          const csvShopId = getShopIdFromCreatedShopVariant(csv);
          const csvId = Number(csv?.id);
          if (csvShopId > 0 && csvId > 0) {
            freshShopVariantIds.set(`${uvId}:${csvShopId}`, csvId);
          }
        });
      });
      if (freshShopVariantIds.size > 0) {
        const variantRowsAfterSave = getValues('variants') ?? [];
        const currentShopVariants = getValues('shop_variants') ?? [];
        let anyIdChanged = false;
        const resyncedShopVariants = currentShopVariants.map((sv) => {
          const parentId = Number(variantRowsAfterSave[Number(sv?.variant_index)]?.id ?? 0);
          const svShopId = Number(sv?.shop_id);
          if (!parentId || !svShopId) return sv;
          const fresh = freshShopVariantIds.get(`${parentId}:${svShopId}`);
          if (!fresh || fresh === Number(sv?.id)) return sv;
          anyIdChanged = true;
          return { ...sv, id: fresh };
        });
        if (anyIdChanged) {
          setValue('shop_variants', resyncedShopVariants, { shouldDirty: false });
        }
      }
      const parentRow = updatedVariants.find((v) => Number(v?.id) === Number(parentVariantId));
      const created = extractCreatedShopVariants(parentRow).find(
        (csv) => getShopIdFromCreatedShopVariant(csv) === shopId
      );
      return created?.id ? Number(created.id) : 0;
    },
    [getValues, setValue]
  );

  // Populate form in edit mode
  useEffect(() => {
    if (isEditMode && productResponse && !isLoadingProduct) {
      const p = productResponse;
      const sk = p.seo_keywords as { en?: string[]; ar?: string[] } | null | undefined;
      skipRestaurantToggleReset.current = true;
      setHasSelectedProductType(true);
      reset({
        category_id: Number(p.category?.id) || 0,
        brand_id: Number(p.brand?.id) || 0,
        vendor_scope:
          Number(p.vendor?.id) === INTERNAL_VENDOR_ID ? 'internal' : 'external',
        vendor_id: Number(p.vendor?.id) || 0,
        sale_channel: p.sale_channel === 'shop' || p.is_restaurant ? 'shop' : 'platform',
        name: { en: p.name?.en ?? '', ar: p.name?.ar ?? '' },
        description: { en: p.description?.en ?? '', ar: p.description?.ar ?? '' },
        full_description: { en: p.full_description?.en ?? '', ar: p.full_description?.ar ?? '' },
        country_id:
          p.country_id != null && String(p.country_id) !== ''
            ? Number(p.country_id)
            : p.origin_country?.id != null
              ? Number(p.origin_country.id)
              : p.country && typeof p.country === 'object' && 'id' in p.country && (p.country as { id?: number }).id != null
                ? Number((p.country as { id: number }).id)
                : 0,
        sale_country_id:
          p.sale_country_id != null && String(p.sale_country_id) !== ''
            ? Number(p.sale_country_id)
            : p.sale_country?.id != null
              ? Number(p.sale_country.id)
              : 0,
        price_currency_id: 0,
        /** Synced from `price` in useEffect once USD/SYP rates are ready */
        price_local: undefined,
        price:
          p.price != null && !Number.isNaN(Number(p.price))
            ? Number(p.price)
            : currencyMapAmount(p.price_currencies, 'USD'),
        price_syp:
          currencyMapAmount(p.price_currencies, 'SYP') ??
          (p.price != null && !Number.isNaN(Number(p.price)) && sypCurrency
            ? usdToLocalAmount(Number(p.price), parseCurrencyRate(sypCurrency))
            : undefined),
        discount:
          p.discount != null && String(p.discount).trim() !== ''
            ? Math.min(100, Math.max(0, Math.floor(Number(p.discount))))
            : undefined,
        discount_type: (p.discount_type as 'none' | 'percentage' | 'fixed') || 'none',
        cost_price: p.cost_price != null ? Number(p.cost_price) : undefined,
        cost_price_syp:
          currencyMapAmount(p.cost_price_currencies, 'SYP') ??
          (p.cost_price != null && !Number.isNaN(Number(p.cost_price)) && sypCurrency
            ? usdToLocalAmount(Number(p.cost_price), parseCurrencyRate(sypCurrency))
            : undefined),
        quantity:
          p.quantity != null && !Number.isNaN(Number(p.quantity)) ? Number(p.quantity) : undefined,
        product_number: p.product_number != null ? String(p.product_number) : '',
        unit_id: p.unit_id != null && Number(p.unit_id) > 0 ? Number(p.unit_id) : 0,
        warranty_id:
          Number((p as ProductDetailData).warranty_id ?? (p as ProductDetailData).warranty?.id) || 0,
        sku: p.sku ?? '',
        model: p.model ?? '',
        barcode: p.barcode ?? '',
        time_prepare: p.time_prepare ?? '',
        delivery_time: p.delivery_time ?? '',
        expiry_date:
          p.expiry_date && typeof p.expiry_date === 'string'
            ? p.expiry_date.slice(0, 10)
            : '',
        is_restaurant: Boolean(p.is_restaurant ?? p.category?.is_restaurant),
        is_instant_delivery: p.is_instant_delivery ? 1 : 0,
        is_visible: p.is_visible === false || p.is_visible === 0 ? 0 : 1,
        thumbnail: undefined,
        images: [],
        existing_media_ids:
          p.images?.map((img: any) => Number(img.id)).filter((mediaId) => !Number.isNaN(mediaId)) ?? [],
        seo_title: { en: p.seo_title?.en ?? '', ar: p.seo_title?.ar ?? '' },
        seo_description: { en: p.seo_description?.en ?? '', ar: p.seo_description?.ar ?? '' },
        seo_keywords: {
          en: Array.isArray(sk?.en) ? sk!.en!.join(', ') : '',
          ar: Array.isArray(sk?.ar) ? sk!.ar!.join(', ') : '',
        },
        seo_image: undefined,
        variants:
          p.variants?.map((v) => ({
            id: v.id,
            attributes_values_ids: [],
            images: [],
            existing_images_ids:
              (v.images ?? []).map((img: any) => Number(img.id)).filter((mediaId) => !Number.isNaN(mediaId)) ?? [],
            sku: (v as any).sku ?? '',
            model: (v as any).model ?? '',
            barcode: (v as any).barcode ?? '',
            price:
              (v as any).price != null && !Number.isNaN(Number((v as any).price))
                ? Number((v as any).price)
                : currencyMapAmount((v as any).price_currencies, 'USD'),
            price_syp:
              currencyMapAmount((v as any).price_currencies, 'SYP') ??
              ((v as any).price != null &&
              !Number.isNaN(Number((v as any).price)) &&
              sypCurrency
                ? usdToLocalAmount(Number((v as any).price), parseCurrencyRate(sypCurrency))
                : undefined),
            quantity: (v as any).quantity != null ? Number((v as any).quantity) : undefined,
            discount:
              (v as any).discount != null
                ? Math.min(100, Math.max(0, Math.floor(Number((v as any).discount))))
                : undefined,
            discount_type:
              ((v as any).discount_type as 'none' | 'percentage' | 'fixed' | undefined) ?? 'none',
            max_purchase_quantity: (v as any).max_purchase_quantity != null ? Number((v as any).max_purchase_quantity) : undefined,
            is_trend: Number((v as any).is_trend) === 1 ? 1 : 0,
            is_active: (v as any).is_active === false || Number((v as any).is_active) === 0 ? 0 : 1,
          })) ?? [],
        category_details:
          p.category_details?.map((cd) => ({
            id: cd.id,
            category_detail_id: 0,
            detail_value: { en: cd.value?.en ?? '', ar: cd.value?.ar ?? '' },
          })) ?? [],
        extra_details:
          p.extra_details?.map((ed: any) => ({
            id: ed.id,
            product_extra_detail_id: Number(ed.product_extra_detail_id) || 0,
            quantity: ed.quantity != null ? Number(ed.quantity) : 1,
            price:
              ed.price !== '' && ed.price != null && !Number.isNaN(Number(ed.price))
                ? Number(ed.price)
                : 0,
          })) ?? [],
        bought_with: (p.bought_with ?? [])
          .map((v: any) => (typeof v === 'object' && v?.id != null ? v.id : v))
          .filter((v) => v != null && v !== '' && !Number.isNaN(Number(v)))
          .map((v) => Number(v)),
        shop_variants:
          p.variants?.flatMap((v, vIndex) => {
            const shopLinks =
              Array.isArray(v.shops) && v.shops.length > 0
                ? v.shops
                : ((v as { shop_variants?: unknown[] }).shop_variants ?? []);
            return shopLinks.map((s: any) => ({
              id: s.id != null ? Number(s.id) : undefined,
              shop_id: Number(s.shop_id ?? s.shop?.id),
              variant_index: vIndex,
              cost_price: s.cost_price != null ? Number(s.cost_price) : undefined,
            }));
          }) ?? [],
        badges: p.badges?.length
          ? p.badges.map((b: any) => (typeof b === 'number' ? b : b.id))
          : [],
        icon_ids: (p.icons ?? []).map((ic) => ic.id),
      });
    }
  }, [productResponse, isEditMode, isLoadingProduct, reset, sypCurrency]);

  const categoryDetailsFixedRef = useRef<string | null>(null);

  // Fix category_detail_id when availableCategoryDetails loads (match by name - API returns pivot id, we need definition id)
  useEffect(() => {
    if (
      !isEditMode ||
      !productResponse?.category_details?.length ||
      !availableCategoryDetails.length ||
      !id
    )
      return;
    if (categoryDetailsFixedRef.current === id) return;
    const p = productResponse;
    const fixed = p.category_details!.map((cd) => {
      const cdAny = cd as any;
      const defId = cdAny.category_detail_id ?? cdAny.category_detail?.id;
      let categoryDetailId = defId ? Number(defId) : 0;
      if (!categoryDetailId) {
        const nameToMatch = typeof cd.name === 'string' ? cd.name : cdAny.name?.en ?? cdAny.name?.ar;
        const matched = availableCategoryDetails.find((ad: any) => {
          const adName = typeof ad.name === 'object' ? ad.name?.en ?? ad.name?.ar : ad.name;
          return adName && nameToMatch && String(adName).trim() === String(nameToMatch).trim();
        });
        categoryDetailId = matched?.id ?? 0;
      }
      return {
        id: cd.id,
        category_detail_id: categoryDetailId,
        detail_value: { en: cd.value?.en ?? '', ar: cd.value?.ar ?? '' },
      };
    });
    const valid = fixed.filter((d) => d.category_detail_id > 0);
    if (valid.length > 0) {
      setValue('category_details', valid);
      categoryDetailsFixedRef.current = id;
    }
  }, [isEditMode, productResponse, availableCategoryDetails, setValue, id]);

  // Resolve product_extra_detail_id when editing (API may only return key/value on the pivot).
  useEffect(() => {
    if (!isEditMode || !productResponse?.extra_details?.length || !id || categoryIdNum <= 0) {
      return;
    }
    const presets = productExtraPresets;
    if (!presets.length) return;

    const rows = (getValues('extra_details') ?? []) as Array<{
      id?: number;
      product_extra_detail_id?: number;
      quantity?: number;
      price?: number;
    }>;
    if (!rows.length) return;

    const normalizeExtraLinePrice = (v: unknown) =>
      v !== '' && v != null && !Number.isNaN(Number(v)) ? Number(v) : 0;

    let changed = false;
    const next = rows.map((row) => {
      const qty =
        row.quantity != null && !Number.isNaN(Number(row.quantity)) ? Number(row.quantity) : 1;
      const linePrice = normalizeExtraLinePrice(row.price);
      const productExtraDetailId = Number(row.product_extra_detail_id) || 0;

      if (productExtraDetailId > 0) {
        return {
          id: row.id,
          product_extra_detail_id: productExtraDetailId,
          quantity: qty,
          price: linePrice,
        };
      }

      const pivot = productResponse.extra_details!.find((e: any) => Number(e.id) === Number(row.id));
      if (!pivot) {
        return {
          id: row.id,
          product_extra_detail_id: 0,
          quantity: qty,
          price: linePrice,
        };
      }

      const directId = Number((pivot as any).product_extra_detail_id);
      if (directId > 0) {
        changed = true;
        return {
          id: row.id,
          product_extra_detail_id: directId,
          quantity: qty,
          price: linePrice,
        };
      }

      const matched = findPresetIdForProductExtraPivot(
        { key: pivot.key, value: pivot.value },
        presets
      );
      if (!matched) {
        return {
          id: row.id,
          product_extra_detail_id: 0,
          quantity: qty,
          price: linePrice,
        };
      }

      changed = true;
      return {
        id: row.id,
        product_extra_detail_id: matched,
        quantity: qty,
        price: linePrice,
      };
    });

    if (changed) {
      setValue('extra_details', next, { shouldValidate: false });
    }
  }, [
    isEditMode,
    id,
    categoryIdNum,
    productExtraPresets,
    productResponse?.extra_details,
    getValues,
    setValue,
  ]);

  const variantsFixedRef = useRef<string | null>(null);

  // Map variant.attributes to attributes_values_ids when categoryAttributes loads (match by attr name + value)
  useEffect(() => {
    if (
      !isEditMode ||
      !productResponse?.variants?.length ||
      !categoryAttributes.length ||
      !id
    )
      return;
    if (variantsFixedRef.current === id) return;
    const p = productResponse;
    const currentVariants = getValues('variants') ?? [];
    const mappedVariants = p.variants!.map((v) => {
      const ids = resolveVariantAttributeValueIds(v, categoryAttributes);
      const prev = currentVariants.find((c: any) => Number(c?.id) === Number(v.id));
      const prevFiles = Array.isArray(prev?.images)
        ? (prev!.images as unknown[]).filter((f): f is File => f instanceof File)
        : [];
      const matchedAttr = (categoryAttributes as any[]).find((a: any) =>
        (a.values || []).some((val: any) => ids.includes(Number(val.id)))
      );
      return {
        id: v.id,
        category_attribute_id: matchedAttr?.id ?? (prev as any)?.category_attribute_id,
        attributes_values_ids: ids,
        images: prevFiles,
        existing_images_ids:
          prev && Array.isArray(prev.existing_images_ids)
            ? prev.existing_images_ids
            : (v.images ?? []).map((img: any) => Number(img.id)).filter((mediaId) => !Number.isNaN(mediaId)) ?? [],
        sku: (prev as any)?.sku ?? (v as any).sku ?? '',
        model: (prev as any)?.model ?? (v as any).model ?? '',
        barcode: (prev as any)?.barcode ?? (v as any).barcode ?? '',
        price:
          (prev as any)?.price ??
          ((v as any).price != null ? Number((v as any).price) : undefined),
        price_syp:
          (prev as any)?.price_syp ??
          currencyMapAmount((v as any).price_currencies, 'SYP') ??
          ((v as any).price != null &&
          !Number.isNaN(Number((v as any).price)) &&
          sypCurrency
            ? usdToLocalAmount(Number((v as any).price), parseCurrencyRate(sypCurrency))
            : undefined),
        quantity:
          (prev as any)?.quantity ??
          ((v as any).quantity != null ? toOptionalInt((v as any).quantity) : undefined),
        discount:
          (prev as any)?.discount ??
          ((v as any).discount != null ? Number((v as any).discount) : undefined),
        discount_type:
          (prev as any)?.discount_type ??
          ((v as any).discount_type as 'none' | 'percentage' | 'fixed' | undefined) ??
          'none',
        max_purchase_quantity: (prev as any)?.max_purchase_quantity ?? ((v as any).max_purchase_quantity != null ? Number((v as any).max_purchase_quantity) : undefined),
        is_trend:
          (prev as any)?.is_trend ??
          (Number((v as any).is_trend) === 1 ? 1 : 0),
        is_active:
          (prev as any)?.is_active ??
          ((v as any).is_active === false || Number((v as any).is_active) === 0 ? 0 : 1),
      };
    });
    // Only lock the guard if ALL variants got at least one attribute id resolved.
    // If mapping partially failed, keep the door open to retry when categoryAttributes refreshes.
    const allMapped = mappedVariants.every((mv) => mv.attributes_values_ids.length > 0);
    setValue('variants', mappedVariants);
    if (allMapped) {
      variantsFixedRef.current = id;
    }
  }, [isEditMode, productResponse, categoryAttributes, setValue, id, sypCurrency]);

  const isSubmitting = createProductMutation.isPending || updateProductMutation.isPending;
  const errorMessage =
    createProductMutation.error?.message || updateProductMutation.error?.message || null;

  // Map product variant.attributes → value IDs (one per attribute type; same rules as resolveVariantAttributeValueIds).
  const mapVariantsToAttributeIds = (
    variants: Array<{ id?: number; attributes?: Array<{ attribute: string; value: string }>; images?: File[] }>,
    attrs: any[]
  ) =>
    variants.map((v) => ({
      id: v.id,
      attributes_values_ids: resolveVariantAttributeValueIds(v, attrs),
      images: (v as any).images ?? [],
    }));

  const onSubmit = async (data: ProductFormValues) => {
    try {
      const live = getValues();
      const imagesFromForm = filterFileList(getValues('images'));
      const imagesFromParsed = filterFileList(data.images);
      // Edit mode: validation can pass via existing_media_ids while zod omits new Files from `data`
      const mergedProductImages =
        imagesFromForm.length > 0 ? imagesFromForm : imagesFromParsed;

      const liveVariantsFull = getValues('variants') ?? [];
      // Nested File[] in field arrays is sometimes missing from `data` — use live state for uploads
      let payload: ProductFormValues = {
        ...data,
        images: mergedProductImages,
        existing_media_ids: resolveExistingMediaIdsForPayload(
          live,
          data,
          isEditMode,
          productResponse
        ),
        thumbnail: live.thumbnail ?? data.thumbnail,
        seo_image: live.seo_image ?? data.seo_image,
        icon_ids: live.icon_ids ?? data.icon_ids,
        variants: (data.variants ?? []).map((dv, i) => {
          const dvId = (dv as { id?: number }).id;
          const lv =
            dvId != null && liveVariantsFull.length
              ? liveVariantsFull.find((x) => Number((x as { id?: number }).id) === Number(dvId))
              : liveVariantsFull[i];
          if (!lv) {
            return {
              ...dv,
              images: filterFileList((dv as { images?: unknown }).images),
              existing_images_ids: resolveVariantExistingImageIds(
                undefined,
                dv as { existing_images_ids?: number[] },
                dvId,
                isEditMode,
                productResponse
              ),
            };
          }
          const lvFiles = filterFileList(lv.images);
          const dvFiles = filterFileList(dv.images);
          const mergedVariantImages = lvFiles.length > 0 ? lvFiles : dvFiles;
          return {
            ...dv,
            ...lv,
            images: mergedVariantImages,
            existing_images_ids: resolveVariantExistingImageIds(
              lv as { existing_images_ids?: number[] },
              dv as { existing_images_ids?: number[] },
              dvId,
              isEditMode,
              productResponse
            ),
          };
        }),
      };

      console.log('[Product Form] Validation passed, submitting:', payload);

      // In edit mode: ensure variants have attributes_values_ids (full payload - changed + unchanged)
      if (isEditMode && productResponse && (payload.variants?.length ?? 0) > 0) {
        const enrichedFromApi = categoryAttributes.length > 0
          ? mapVariantsToAttributeIds(
              productResponse.variants?.map((v) => ({
                id: v.id,
                attributes: v.attributes,
              })) ?? [],
              categoryAttributes
            )
          : [];
        payload = {
          ...payload,
          variants: payload.variants!.map((fv) => {
            if (fv.attributes_values_ids?.length) {
              return fv; // User already selected - use form values
            }
            const mapped =
              fv.id && productResponse.variants
                ? enrichedFromApi.find((e) => e.id === fv.id)
                : null;
            return {
              ...fv,
              attributes_values_ids:
                mapped?.attributes_values_ids ?? fv.attributes_values_ids ?? [],
            };
          }),
        };
      }

      // Ensure category_details have category_detail_id (merge with productResponse if needed)
      if (
        isEditMode &&
        productResponse?.category_details?.length &&
        availableCategoryDetails.length > 0 &&
        payload.category_details?.some((cd) => !cd.category_detail_id || cd.category_detail_id === 0)
      ) {
        payload = {
          ...payload,
          category_details: payload.category_details!.map((cd) => {
            if (cd.category_detail_id && cd.category_detail_id > 0) return cd;
            const orig = productResponse!.category_details!.find((o: any) => o.id === cd.id);
            if (!orig) return cd;
            const cdAny = orig as any;
            let defId = cdAny.category_detail_id ?? cdAny.category_detail?.id;
            if (!defId) {
              const nameToMatch =
                typeof orig.name === 'string' ? orig.name : cdAny.name?.en ?? cdAny.name?.ar;
              const matched = availableCategoryDetails.find((ad: any) => {
                const adName =
                  typeof ad.name === 'object' ? ad.name?.en ?? ad.name?.ar : ad.name;
                return adName && nameToMatch && String(adName).trim() === String(nameToMatch).trim();
              });
              defId = matched?.id;
            }
            return {
              ...cd,
              category_detail_id: defId ? Number(defId) : cd.category_detail_id,
            };
          }),
        };
      }

      // Keep every card the admin added. Do not inject a default empty row on create.
      const rawVariantRows = payload.variants ?? [];
      const keepVariantRow = (v: (typeof rawVariantRows)[number], origIdx: number) => {
        const hasId = v.id != null && Number(v.id) > 0;
        if (restaurantMode) return origIdx === 0 || hasId;
        return true;
      };
      const validVariantEntries = rawVariantRows
        .map((v, origIdx) => ({ row: v, origIdx }))
        .filter(({ row: v, origIdx }) => keepVariantRow(v, origIdx));
      const validVariants = validVariantEntries.map(({ row }) => row);
      const validVariantOrigIndices = validVariantEntries.map(({ origIdx }) => origIdx);

      const variantIndexMap = new Map<number, number>();
      validVariantEntries.forEach(({ origIdx }, nextIdx) => {
        variantIndexMap.set(origIdx, nextIdx);
      });
      const remappedShopVariants = (payload.shop_variants ?? [])
        .filter((sv) => Number(sv.shop_id) > 0 && variantIndexMap.has(Number(sv.variant_index)))
        .map((sv) => ({
          ...sv,
          variant_index: variantIndexMap.get(Number(sv.variant_index))!,
        }));

      let variantsForPayload = restaurantMode
        ? validVariants.map((v) => ({ ...v, model: '', barcode: '' }))
        : validVariants;
      let shopVariantsForPayload = remappedShopVariants;

      // Restaurant products have no attribute-based variants. If the shop SKU row
      // is missing after a branch was selected, send one minimal variant.
      const hasShopLink = (payload.shop_variants ?? []).some((sv) => Number(sv.shop_id) > 0);
      if (restaurantMode && variantsForPayload.length === 0 && hasShopLink) {
        const row0 = rawVariantRows[0] as
          | {
              id?: number;
              price?: number | string;
              price_syp?: number | string;
              quantity?: number | string;
              existing_images_ids?: number[];
            }
          | undefined;
        const toNum = (v: unknown) =>
          v == null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v);
        const rowSale = resolveUsdOrSyp(
          toNum(row0?.price) ?? toNum(payload.price),
          toNum(row0?.price_syp) ?? toNum((payload as { price_syp?: number }).price_syp)
        );
        const rowQty =
          toNum(row0?.quantity) ?? toNum((payload as { quantity?: number }).quantity);
        variantsForPayload = [
          {
            ...(row0?.id ? { id: row0.id } : {}),
            attributes_values_ids: [],
            ...(rowSale.usd !== undefined ? { price: rowSale.usd } : {}),
            ...(rowSale.syp !== undefined ? { price_syp: rowSale.syp } : {}),
            ...(rowQty != null ? { quantity: rowQty } : {}),
            existing_images_ids: Array.isArray(row0?.existing_images_ids)
              ? row0!.existing_images_ids
              : [],
            is_active: 1,
            is_trend: 0,
            discount_type: 'none' as const,
          },
        ];
        shopVariantsForPayload = (payload.shop_variants ?? [])
          .filter((sv) => Number(sv.shop_id) > 0)
          .map((sv) => ({ ...sv, variant_index: 0 }));
      }

      const saleChannel: 'platform' | 'shop' =
        restaurantMode || payload.sale_channel === 'shop' ? 'shop' : 'platform';

      const saleMoney = resolveUsdOrSyp(
        payload.price as number | undefined,
        (payload as { price_syp?: number }).price_syp
      );
      const costMoney = resolveUsdOrSyp(
        payload.cost_price as number | undefined,
        (payload as { cost_price_syp?: number }).cost_price_syp
      );

      const finalPayload = {
        ...payload,
        brand_id:
          payload.brand_id && payload.brand_id > 0
            ? payload.brand_id
            : isEditMode && !restaurantMode
              ? null
              : undefined,
        country_id: payload.country_id && payload.country_id > 0 ? payload.country_id : undefined,
        sale_country_id: payload.sale_country_id && payload.sale_country_id > 0 ? payload.sale_country_id : undefined,
        price: saleMoney.usd,
        price_syp: saleMoney.syp,
        cost_price: costMoney.usd,
        cost_price_syp: costMoney.syp,
        discount:
          payload.discount_type === 'none' ? 0 : (payload.discount ?? 0),
        discount_type: payload.discount_type ?? 'none',
        sale_channel: saleChannel,
        // Platform: backend sets Tikmool vendor + default branch — omit vendor_id / shop_variants.
        vendor_id:
          saleChannel === 'shop' && payload.vendor_id && payload.vendor_id > 0
            ? payload.vendor_id
            : undefined,
        variants: variantsForPayload,
        shop_variants: saleChannel === 'shop' ? shopVariantsForPayload : undefined,
        category_details: payload.category_details?.filter(
          (cd) => cd.category_detail_id && cd.category_detail_id > 0
        ),
        unit_id: payload.unit_id && payload.unit_id > 0 ? payload.unit_id : undefined,
        // Empty optional FKs: omit the key (or null). Never send "".
        warranty_id: payload.warranty_id && payload.warranty_id > 0 ? payload.warranty_id : undefined,
        ...(restaurantMode && {
          brand_id: undefined,
          sku: null,
          model: null,
          barcode: null,
          country_id: undefined,
          sale_country_id: undefined,
        }),
      };

      const productImagesCompressed = finalPayload.images?.length
        ? await compressImages(finalPayload.images)
        : finalPayload.images;
      const variantsCompressed = (
        await Promise.all(
          (finalPayload.variants ?? []).map(async (v, k) => {
            const imgs = v.images?.length ? await compressImages(v.images) : v.images;
            const origIdx = validVariantOrigIndices[k] ?? k;
            const liveRow = (getValues('variants') ?? [])[origIdx];
            return toVariantPayload({
              ...(liveRow as Record<string, unknown> | undefined),
              ...(v as Record<string, unknown>),
              images: imgs,
            });
          })
        )
      ).filter((row): row is NonNullable<typeof row> => row != null);
      const shopVariantsCleaned = (finalPayload.shop_variants ?? [])
        .map((sv) => toShopVariantPayload(sv as Record<string, unknown>))
        .filter((sv): sv is NonNullable<typeof sv> => sv != null);
      let thumb = finalPayload.thumbnail;
      if (thumb instanceof File) thumb = await compressImage(thumb);
      let seoImg = finalPayload.seo_image;
      if (seoImg instanceof File) seoImg = await compressImage(seoImg);
      const uploadPayload = {
        ...finalPayload,
        images: productImagesCompressed,
        variants: variantsCompressed,
        shop_variants: shopVariantsCleaned,
        thumbnail: thumb,
        seo_image: seoImg,
      };
      const {
        vendor_scope: _omitVendorScope,
        price_currency_id: _omitPriceCurrencyId,
        price_local: _omitPriceLocal,
        is_restaurant: _omitIsRestaurant,
        ...apiPayload
      } = uploadPayload as typeof uploadPayload & { quantity?: number };

      const qtyRaw = (apiPayload as { quantity?: number }).quantity;
      if (qtyRaw === undefined || qtyRaw === null || Number.isNaN(Number(qtyRaw))) {
        delete (apiPayload as { quantity?: number }).quantity;
      }

      const stripSeoIfNoFile = (p: Record<string, unknown>) => {
        if (!(p.seo_image instanceof File)) {
          delete p.seo_image;
        }
      };
      // Never send empty arrays: `[]` wipes all variants / branch links on the backend.
      const stripEmptyNestedArrays = (p: Record<string, unknown>) => {
        if (!Array.isArray(p.variants) || p.variants.length === 0) delete p.variants;
        if (!Array.isArray(p.shop_variants) || p.shop_variants.length === 0) {
          delete p.shop_variants;
        }
      };
      const notifySaved = (resp: unknown) => {
        toast.success(
          isEditMode ? t('form.productUpdatedSuccess') : t('form.productCreatedSuccess')
        );
        // Platform products are auto-linked; only warn when shop channel still has no branch.
        const channel =
          (getValues('sale_channel') as string) === 'shop' || restaurantMode ? 'shop' : 'platform';
        if (
          channel === 'shop' &&
          responseIncludesVariants(resp) &&
          !savedProductHasShopLink(resp)
        ) {
          toast.warning(t('form.productSavedWithoutShopLink'));
        }
      };

      if (isEditMode && id) {
        const editApiPayload = { ...(apiPayload as object) } as Record<string, unknown>;
        stripSeoIfNoFile(editApiPayload);
        stripEmptyNestedArrays(editApiPayload);

        // Edit rules for sale_channel / shop_variants:
        // - name-only (channel + shops unchanged) → omit both
        // - convert to platform → sale_channel=platform, omit shop_variants
        // - convert to shop / shops edited → sale_channel=shop + full shop_variants
        // Variants: omit unless the Variants tab changed them (full replace otherwise).
        const originalChannel: 'platform' | 'shop' =
          productResponse?.sale_channel === 'shop' || productResponse?.is_restaurant
            ? 'shop'
            : 'platform';
        const channelChanged = saleChannel !== originalChannel;
        const shopsDirty = isDeepDirty(dirtyFields.shop_variants);
        const variantsDirty = isDeepDirty(dirtyFields.variants);

        if (!variantsDirty) {
          delete editApiPayload.variants;
        }

        if (!channelChanged && !shopsDirty) {
          delete editApiPayload.sale_channel;
          delete editApiPayload.shop_variants;
          delete editApiPayload.vendor_id;
        } else if (saleChannel === 'platform') {
          editApiPayload.sale_channel = 'platform';
          delete editApiPayload.shop_variants;
          delete editApiPayload.vendor_id;
        } else {
          editApiPayload.sale_channel = 'shop';
          // shop_variants kept (full replace when linking to a shop)
        }

        console.log('[Product Form] Sending update payload:', { id, data: editApiPayload });
        const updateResponse = await updateProductMutation.mutateAsync({
          id,
          data: editApiPayload as unknown as ProductCreateUpdatePayload,
        });
        notifySaved(updateResponse);
      } else {
        const createPayload = { ...(apiPayload as object) } as Record<string, unknown>;
        stripSeoIfNoFile(createPayload);
        stripEmptyNestedArrays(createPayload);
        console.log('[Product Form] Sending create payload:', createPayload);
        const createResponse = await createProductMutation.mutateAsync(
          createPayload as unknown as ProductCreateUpdatePayload
        );
        const newProductId = Number(createResponse?.data?.id ?? createResponse?.id ?? 0);
        notifySaved(createResponse);
        if (newProductId > 0) {
          navigate(paths.dashboard.product.update(newProductId));
          return;
        }
      }
      navigate(paths.dashboard.products);
    } catch (error: any) {
      console.error('[Product Form] Submit error:', error);
      console.error('[Product Form] Error response:', error?.response?.data);
      console.error('[Product Form] Error message:', error?.message);
      toast.error(error?.message || t('form.productSaveFailed'));
    }
  };

  const toggleBoughtWith = (productId: number) => {
    const current = watchedBoughtWith;
    const next = current.includes(productId)
      ? current.filter((pid) => pid !== productId)
      : [...current, productId];
    setValue('bought_with', next, { shouldDirty: true });
  };

  const clearBoughtWith = () => {
    setValue('bought_with', [], { shouldDirty: true });
  };

  const watchedIconIds = watch('icon_ids') ?? [];
  const toggleIcon = (iconId: number) => {
    const current = watchedIconIds;
    const next = current.includes(iconId)
      ? current.filter((x) => x !== iconId)
      : [...current, iconId];
    setValue('icon_ids', next, { shouldDirty: true });
  };

  const [productFormTab, setProductFormTab] = useState<string>('basic');

  /** Index of the variant row currently being created via PUT /products/{id}. */
  const [variantCreateBusyIdx, setVariantCreateBusyIdx] = useState<number | null>(null);
  /** Field-array index of the shop-variant row currently being created via PUT /products/{id}. */
  const [shopVariantCreateBusyIdx, setShopVariantCreateBusyIdx] = useState<number | null>(null);

  const saveVariantRow = useCallback(
    async (variantIndex: number) => {
      const variantId = getValues(`variants.${variantIndex}.id`);
      const isTrendChecked = Number(getValues(`variants.${variantIndex}.is_trend`)) === 1;
      const isActiveChecked = Number(getValues(`variants.${variantIndex}.is_active`) ?? 1) === 1;

      // Create product: variants stay in form state until POST /products (spec §2).
      if (!id) {
        toast.success(t('form.variantLocalSaveSuccess'));
        return;
      }

      const newImgs = getValues(`variants.${variantIndex}.images`);
      const rawImages = Array.isArray(newImgs) && newImgs.length > 0 ? newImgs : undefined;
      const images = rawImages?.length
        ? await Promise.all(rawImages.map((f) => (f instanceof File ? compressImage(f) : f)))
        : undefined;
      const saveSkuVal = String(getValues(`variants.${variantIndex}.sku`) ?? '').trim();
      const modelVal = restaurantMode ? '' : getValues(`variants.${variantIndex}.model`) ?? '';
      const barcodeVal = restaurantMode
        ? ''
        : String(getValues(`variants.${variantIndex}.barcode`) ?? '').trim();
      const savePriceRaw = getValues(`variants.${variantIndex}.price`);
      const savePriceDirect =
        savePriceRaw == null || savePriceRaw === ('' as any) ? undefined : Number(savePriceRaw);
      const savePriceSypRaw = getValues(`variants.${variantIndex}.price_syp`);
      const savePriceSypVal =
        savePriceSypRaw == null || savePriceSypRaw === ('' as any)
          ? undefined
          : Number(savePriceSypRaw);
      // PUT /product-variants/{id} does not accept price_syp — convert SYP → USD in the UI.
      const savePriceVal =
        savePriceDirect != null && !Number.isNaN(savePriceDirect)
          ? savePriceDirect
          : savePriceSypVal != null &&
              !Number.isNaN(savePriceSypVal) &&
              sypRate != null &&
              sypRate > 0
            ? localAmountToUsd(savePriceSypVal, sypRate)
            : undefined;
      const savePriceSypForProductPut =
        savePriceVal != null ? undefined : savePriceSypVal;
      const quantityVal = toOptionalInt(getValues(`variants.${variantIndex}.quantity`));
      const vDiscType =
        (getValues(`variants.${variantIndex}.discount_type`) as
          | 'none'
          | 'percentage'
          | 'fixed'
          | undefined) ?? 'none';
      const vDiscRaw = getValues(`variants.${variantIndex}.discount`);
      const vDiscVal =
        vDiscRaw == null || vDiscRaw === ('' as any) ? undefined : Number(vDiscRaw);
      const attrIds = (getValues(`variants.${variantIndex}.attributes_values_ids`) ?? [])
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0);

      if (variantId) {
        try {
          await updateVariantMutation.mutateAsync({
            id: variantId,
            data: {
              attributes_values_ids: attrIds,
              existing_images_ids: getValues(`variants.${variantIndex}.existing_images_ids`) || [],
              images,
              ...(saveSkuVal ? { sku: saveSkuVal } : {}),
              model: modelVal,
              ...(barcodeVal ? { barcode: barcodeVal } : {}),
              is_trend: isTrendChecked ? 1 : 0,
              is_active: isActiveChecked ? 1 : 0,
              price: savePriceVal,
              ...(quantityVal != null ? { quantity: quantityVal } : {}),
              discount_type: vDiscType,
              discount: vDiscType === 'none' ? 0 : vDiscVal,
            },
          });
          toast.success(t('form.variantSaveSuccess'));
        } catch {
          toast.error(t('form.variantSaveFailed'));
        }
        return;
      }

      try {
        setVariantCreateBusyIdx(variantIndex);
        const newId = await createSingleVariantOnProduct({
          productId: id,
          variantIndex,
          attrIds,
          images,
          sku: saveSkuVal,
          model: modelVal,
          barcode: barcodeVal,
          price: savePriceVal,
          price_syp: savePriceSypForProductPut,
          quantity: quantityVal,
          discount_type: vDiscType,
          discount: vDiscType === 'none' ? 0 : vDiscVal,
        });
        if (newId > 0) {
          setValue(`variants.${variantIndex}.id`, newId, { shouldDirty: false });
          setValue(`variants.${variantIndex}.images`, [], { shouldDirty: false });
          toast.success(t('form.variantCreateSuccess'));
        } else {
          toast.error(t('form.variantCreateFailed'));
        }
      } catch {
        toast.error(t('form.variantCreateFailed'));
      } finally {
        setVariantCreateBusyIdx(null);
      }
    },
    [
      getValues,
      restaurantMode,
      updateVariantMutation,
      id,
      createSingleVariantOnProduct,
      setValue,
      sypRate,
      t,
    ]
  );

  useEffect(() => {
    if (isEditMode && id) {
      document.title = `${t('form.productEditMetaTitle')} #${id} | ${CONFIG.appName}`;
    } else {
      document.title = `${t('form.productCreateMetaTitle')} | ${CONFIG.appName}`;
    }
  }, [isEditMode, id, t, i18n.language]);

  return (
    <CreateFormLayout
        methods={methods as any}
        onSubmit={handleSubmit(onSubmit as any, (formErrors) => {
          console.error('[Product Form] Validation errors:', formErrors);
          const getFirstMessage = (obj: any): string | null => {
            if (!obj) return null;
            if (typeof obj.message === 'string') return obj.message;
            if (typeof obj === 'object') {
              for (const v of Object.values(obj)) {
                const m = getFirstMessage(v);
                if (m) return m;
              }
            }
            return null;
          };
          const msg = getFirstMessage(formErrors);
          console.error('[Product Form] First error message:', msg);
          toast.error(msg || t('form.formValidationErrorGeneric'));
        })}
        onCancel={() => navigate(paths.dashboard.products)}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        title={isEditMode ? t('form.productEditTitle') : t('form.productCreateTitle')}
        description={
          isEditMode ? t('form.productEditDescription') : t('form.productCreateDescription')
        }
        isEditMode={isEditMode}
        isLoading={isLoadingProduct}
        loadingText={t('form.loadingProduct')}
        maxWidth="6xl"
        infoText={
          isEditMode ? t('form.productEditInfo') : t('form.productCreateInfo')
        }
        submitLabel={isEditMode ? t('form.productSubmitUpdate') : t('form.productSubmitCreate')}
        submittingLabel={
          isEditMode ? t('form.productSubmittingUpdate') : t('form.productSubmittingCreate')
        }
      >
        <Tabs
          value={productFormTab}
          onChange={(v) => setProductFormTab(String(v))}
          variant="scrollable"
          className="mb-6 w-full gap-1 rounded-xl border border-border/60 bg-muted/60 p-1.5"
        >
          <Tab
            value="basic"
            icon={<Iconify icon="solar:box-minimalistic-bold" width={16} />}
            label={t('form.productFormTabBasic')}
          />
          <Tab
            value="variants"
            icon={<Iconify icon="solar:layers-bold" width={16} />}
            label={t('form.productFormTabVariants')}
          />
          <Tab
            value="seo"
            icon={<Iconify icon="solar:graph-up-bold" width={16} />}
            label={t('form.productFormTabSeo')}
          />
          <Tab
            value="extras"
            icon={<Iconify icon="solar:medal-ribbons-star-bold" width={16} />}
            label={t('form.productFormTabExtras')}
          />
        </Tabs>

        {hasSelectedProductType && productFormTab === 'basic' && (
          <Box className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4">
            <Typography variant="subtitle1" className="font-bold text-foreground">
              {t('form.productCategorySection')}
            </Typography>

            <CategoryLeafCascadeFields
              t={t}
              legacyMode={false}
              flatItems={flatCategoryItems}
              flatParentFetched={flatCategoriesFetched}
              flatParentDataUpdatedAt={flatCategoriesUpdatedAt ?? 0}
              hydrateLeafCategoryId={hydrateLeafCategoryId}
              hydrationKey={categoryHydrationKey}
              onEffectiveLeafChange={syncSelectedCategory}
              isRestaurant={categoryRestaurantFilter}
              onMainCategoryChange={setMainCategoryId}
              allowAnyLevel
            />

            {isRestaurantToggle && categoryId > 0 ? (
              <Box className="group">
                <Box className="flex items-center gap-2 mb-2">
                  <Iconify icon="solar:shop-2-bold" className="text-orange-500" width={20} />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('form.selectRestaurant')}
                  </Typography>
                </Box>
                <Typography variant="caption" className="text-muted-foreground mb-2 block">
                  {t('form.selectRestaurantHelper')}
                </Typography>
                <InfiniteScrollSelect
                  value={selectedRestaurantShopId}
                  onChange={(shopId) => handleRestaurantShopSelect(shopId)}
                  queryKey={[
                    'shops',
                    'infinite',
                    'product-form',
                    'restaurant-by-category',
                    categoryId,
                  ]}
                  fetcher={restaurantShopFetcher}
                  placeholder={t('form.selectRestaurantPlaceholder')}
                  initialLabel={selectedRestaurantShopInitialLabel}
                  clearable
                />
              </Box>
            ) : null}

            {isRestaurantToggle && selectedRestaurantShopId > 0 ? (
              <ProductShopVariantsSection
                variantIndex={0}
                shops={
                  shops.length > 0
                    ? shops
                    : [{ id: selectedRestaurantShopId, name: selectedRestaurantShopInitialLabel ?? '' }]
                }
                shopVariantsFields={shopVariantsFields}
                watchedShopVariants={watchedShopVariants}
                control={control}
                watch={watch}
                setValue={setValue}
                appendShopVariant={appendShopVariant}
                removeShopVariant={removeShopVariant}
                isEditMode={isEditMode}
                productId={id}
                shopVariantCreateBusyIdx={shopVariantCreateBusyIdx}
                setShopVariantCreateBusyIdx={setShopVariantCreateBusyIdx}
                updateShopVariantMutation={updateShopVariantMutation}
                createSingleShopVariantOnProduct={createSingleShopVariantOnProduct}
                embedded
                hideShopSelect
                hideAddButton
                requireParentVariantId={false}
              />
            ) : null}
          </Box>
        )}

        {(errors.category_id || errors.vendor_id) && (
          <Box className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 space-y-1">
            {errors.category_id?.message ? (
              <Typography variant="caption" className="text-destructive block">
                {errors.category_id.message}
              </Typography>
            ) : null}
            {errors.vendor_id?.message ? (
              <Typography variant="caption" className="text-destructive block">
                {errors.vendor_id.message}
              </Typography>
            ) : null}
          </Box>
        )}

        {productFormTab === 'basic' && (
          <Box className="space-y-6">

        {/* ─── Product type (first input) ───────────────────────── */}
        <Controller
          name="is_restaurant"
          control={control}
          render={({ field }) => (
            <Box className="p-4 rounded-xl border border-border/60 bg-background/60 space-y-3">
              <Box className="flex items-center gap-2">
                <Iconify icon="solar:shop-bold" className="text-primary" width={18} height={18} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.productTypeSection')}
                </Typography>
              </Box>
              <Typography variant="caption" className="text-muted-foreground block">
                {t('form.productTypeSectionHelper')}
              </Typography>
              <Box className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    className="w-4 h-4"
                    checked={hasSelectedProductType && field.value === false}
                    onChange={() => {
                      field.onChange(false);
                      setHasSelectedProductType(true);
                    }}
                  />
                  {t('form.productTypeRetail')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    className="w-4 h-4"
                    checked={hasSelectedProductType && field.value === true}
                    onChange={() => {
                      field.onChange(true);
                      setHasSelectedProductType(true);
                    }}
                  />
                  {t('form.productTypeRestaurant')}
                </label>
              </Box>
            </Box>
          )}
        />

        {!hasSelectedProductType && (
          <Box className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-6 text-center">
            <Typography variant="body2" className="text-muted-foreground">
              {t('form.selectProductTypeFirst')}
            </Typography>
          </Box>
        )}

        {hasSelectedProductType && (
          <>

        {/* ─── Restaurant mode banner ───────────────────────────── */}
        {restaurantMode && (
          <Box className="flex items-start gap-3 p-4 rounded-lg border border-orange-500/30 bg-orange-500/10">
            <Iconify icon="solar:shop-bold" className="text-orange-500 shrink-0 mt-0.5" width={20} />
            <div>
              <Typography variant="subtitle2" className="font-semibold text-orange-600">
                {t('form.restaurantModeTitle')}
              </Typography>
              <Typography variant="caption" className="text-orange-600/80">
                {t('form.restaurantModeHelper')}
              </Typography>
            </div>
          </Box>
        )}

        {/* ─── Missing branch link warning ──────────────────────── */}
        {productMissingShopLink && (
          <Box className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10">
            <Iconify
              icon="solar:danger-triangle-bold"
              className="text-destructive shrink-0 mt-0.5"
              width={20}
            />
            <div>
              <Typography variant="subtitle2" className="font-semibold text-destructive">
                {t('form.productNoShopLinkTitle')}
              </Typography>
              <Typography variant="caption" className="text-destructive/80">
                {t('form.productNoShopLinkHelper')}
              </Typography>
            </div>
          </Box>
        )}

        {/* ════════════════════════════════════════════════════════
            Card: General Info (المعلومات العامة)
           ════════════════════════════════════════════════════════ */}
        <Box className="rounded-xl border border-border bg-card p-6 space-y-5">
          {/* <Typography variant="subtitle1" className="font-bold text-foreground">
            {t('form.productGeneralInfoSection')}
          </Typography> */}

          {/* Name Arabic & English — two columns */}
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Box className="group">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:letter-bold" className="text-primary" width={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.productNameArRequired')}
                </Typography>
              </Box>
              <Controller
                name="name.ar"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <input
                      {...field}
                      type="text"
                      dir="rtl"
                      placeholder={t('form.productNameArPlaceholder')}
                      className={fieldInputClass(!!error)}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </Box>

            <Box className="group">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:letter-bold" className="text-primary" width={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.productNameEnRequired')}
                </Typography>
              </Box>
              <Controller
                name="name.en"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <input
                      {...field}
                      type="text"
                      placeholder={t('form.productNamePlaceholder')}
                      className={fieldInputClass(!!error)}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </Box>
          </Box>

          {/* Product number, Model — SKU / barcode live in ProductPricingFields */}
          {!restaurantMode && (
            <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Box className="group">
                <Box className="flex items-center gap-2 mb-2">
                  <Iconify icon="solar:hashtag-bold" className="text-primary" width={20} />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('form.productDetailsProductNumber')}
                  </Typography>
                </Box>
                <Controller
                  name="product_number"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <div>
                      <input
                        {...field}
                        value={field.value ?? ''}
                        type="text"
                        placeholder={t('form.productNumberPlaceholder')}
                        className={fieldInputClass(!!error)}
                      />
                      <FieldErrorText message={error?.message} />
                    </div>
                  )}
                />
              </Box>

              <Box className="group">
                <Box className="flex items-center gap-2 mb-2">
                  <Iconify icon="solar:widget-bold" className="text-primary" width={20} />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('form.productModel')}
                  </Typography>
                </Box>
                <Controller
                  name="model"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <div>
                      <input
                        {...field}
                        type="text"
                        placeholder={t('form.modelPlaceholder')}
                        className={fieldInputClass(!!error)}
                      />
                      <FieldErrorText message={error?.message} />
                    </div>
                  )}
                />
              </Box>
            </Box>
          )}

          <Box className="rounded-lg border border-border/50 bg-muted/10 p-4">
            <ProductPricingFields
              prefix=""
              control={control}
              watch={watch}
              setValue={setValue}
              usdLabel={t('form.productInfoPriceUsd')}
              sypLabel={t('form.productInfoPriceSyp')}
              skuLabel={t('form.productSku')}
              productDualPriceReady={productDualPriceReady}
              sypCurrency={sypCurrency}
              sypRate={sypRate}
              hideSku={restaurantMode}
              hideBarcode={restaurantMode}
              showCost
              skuAction="generate"
              onSkuAction={() =>
                setValue('sku', generateRandomSku(), { shouldDirty: true })
              }
              t={t}
            />
          </Box>

          {/* Brand (hidden for restaurant categories) */}
          {!restaurantMode && (
            <Box className="group">
              <Box className="flex items-center justify-between gap-2 mb-2">
                <Box className="flex items-center gap-2">
                  <Iconify icon="solar:medal-ribbons-star-bold" className="text-primary" width={20} />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('form.productBrand')}
                  </Typography>
                </Box>
                <Button
                  type="button"
                  variant="text"
                  size="small"
                  onClick={() =>
                    window.open(paths.dashboard.brand.create, '_blank')
                  }
                  className="text-primary -mr-2"
                >
                  <Iconify icon="solar:add-circle-bold" width={16} className="mr-1" />
                  {t('form.productCreateBrand')}
                </Button>
              </Box>
              <RHFInfiniteSelect
                name="brand_id"
                queryKey={['brands', 'infinite', 'product-form']}
                fetcher={brandFetcher}
                placeholder={t('form.selectBrandOptional')}
                initialLabel={productResponse?.brand ? formatTranslated(productResponse.brand.name as any) : undefined}
                clearable
              />
            </Box>
          )}

          {/* Sale channel: site (platform) vs branch-linked shop — no warehouse/external radios */}
          {!isRestaurantToggle && (
          <Box className="group">
            <Box className="flex items-center gap-2 mb-2">
              <Iconify icon="solar:shop-bold" className="text-primary" width={20} />
              <Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('form.productSaleChannel')}
              </Typography>
            </Box>
            <Controller
              name="sale_channel"
              control={control}
              render={({ field }) => (
                <Box className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      className="w-4 h-4"
                      checked={field.value === 'platform'}
                      onChange={() => {
                        field.onChange('platform');
                        setValue('vendor_scope', 'internal');
                        setValue('vendor_id', INTERNAL_VENDOR_ID);
                        setValue('shop_variants', []);
                        setValue('delivery_time', '');
                      }}
                    />
                    {t('form.saleChannelPlatform')}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      className="w-4 h-4"
                      checked={field.value === 'shop'}
                      onChange={() => {
                        field.onChange('shop');
                        setValue('vendor_scope', 'external');
                        setValue('vendor_id', 0);
                        setValue('shop_variants', []);
                      }}
                    />
                    {t('form.saleChannelShop')}
                  </label>
                </Box>
              )}
            />
            {saleChannelWatch === 'platform' ? (
              <Box className="mt-3 space-y-2">
                <Box>
                  <Typography variant="caption" className="text-muted-foreground mb-1 block">
                    {t('form.productDeliveryTime')}
                  </Typography>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    className={`${inputCls} bg-muted/40 text-muted-foreground cursor-default`}
                    value={t('form.variantDeliveryTimeAuto')}
                  />
                </Box>
              </Box>
            ) : null}
            {saleChannelWatch === 'shop' ? (
              <Box className="mt-3 space-y-4">
                <Typography variant="caption" className="text-muted-foreground block">
                  {t('form.saleChannelShopHint')}
                </Typography>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground mb-1 block">
                    {t('form.selectVendorOptional')}
                  </Typography>
                  <RHFInfiniteSelect
                    name="vendor_id"
                    queryKey={['vendors', 'infinite', 'product-form', 'sale-channel-shop']}
                    fetcher={vendorFetcher}
                    placeholder={t('form.selectVendorOptional')}
                    clearable
                    initialLabel={
                      productResponse?.vendor
                        ? formatTranslated(productResponse.vendor.name as any)
                        : undefined
                    }
                  />
                </Box>
                <Box>
                  <Box className="flex items-center gap-2 mb-2">
                    <Iconify icon="solar:clock-circle-bold" className="text-primary" width={20} />
                    <Typography variant="subtitle2" className="font-semibold text-foreground">
                      {t('form.productDeliveryTime')}
                    </Typography>
                  </Box>
                  <Controller
                    name="delivery_time"
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <div>
                        <input
                          {...f}
                          type="text"
                          value={f.value ?? ''}
                          placeholder={t('form.variantDeliveryTimePlaceholder')}
                          className={fieldInputClass(!!error)}
                        />
                        <FieldErrorText message={error?.message} />
                      </div>
                    )}
                  />
                </Box>
                {errors.shop_variants?.message ||
                (errors.shop_variants as { root?: { message?: string } })?.root?.message ? (
                  <FieldErrorText
                    message={
                      (errors.shop_variants as { message?: string })?.message ||
                      (errors.shop_variants as { root?: { message?: string } })?.root?.message
                    }
                  />
                ) : null}
              </Box>
            ) : null}
          </Box>
          )}
        </Box>

        {/* ════════════════════════════════════════════════════════
            Card: Description (الوصف)
           ════════════════════════════════════════════════════════ */}
        <Box className="rounded-xl border border-border bg-card p-6 space-y-5">
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Box className="group">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:document-text-bold" className="text-primary" width={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.productDescAr')}
                </Typography>
              </Box>
              <Controller
                name="description.ar"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <textarea
                      {...field}
                      rows={3}
                      dir="rtl"
                      placeholder={t('form.productDescArPlaceholder')}
                      className={fieldInputClass(!!error)}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </Box>

            <Box className="group">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:document-text-bold" className="text-primary" width={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.productDescEn')}
                </Typography>
              </Box>
              <Controller
                name="description.en"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <textarea
                      {...field}
                      rows={3}
                      placeholder={t('form.productDescPlaceholder')}
                      className={fieldInputClass(!!error)}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </Box>
          </Box>

          {/* Full Description */}
          <Box className="border-t border-border pt-5 mt-2 space-y-5">
            <Box className="group">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:document-bold" className="text-primary" width={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.productFullDescAr')}
                </Typography>
              </Box>
              <Controller
                name="full_description.ar"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <TinyMCEEditorField
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder={t('form.fullDescArPlaceholder')}
                      dir="rtl"
                      menubar
                      toolsMenuWordCount
                      height={320}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </Box>

            <Box className="group">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:document-bold" className="text-primary" width={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.productFullDescEn')}
                </Typography>
              </Box>
              <Controller
                name="full_description.en"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <TinyMCEEditorField
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder={t('form.fullDescPlaceholder')}
                      dir="ltr"
                      menubar
                      toolsMenuWordCount
                      height={320}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </Box>
          </Box>
        </Box>

        {/* ════════════════════════════════════════════════════════
            Card: Countries (البلاد)
           ════════════════════════════════════════════════════════ */}
        {!restaurantMode && (
        <Box className="rounded-xl border border-border bg-card p-6">
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Box className="group">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:globe-bold" className="text-primary" width={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.countryOriginSelect')}
                </Typography>
              </Box>
              <RHFInfiniteSelect
                name="country_id"
                queryKey={['countries', 'infinite', 'product-form', 'origin']}
                fetcher={countryFetcher}
                placeholder={t('form.selectCountryOriginOptional')}
                pageSize={20}
                clearable
                initialLabel={(() => {
                  const oc = productResponse?.origin_country;
                  if (oc?.name != null) {
                    return typeof oc.name === 'string' ? oc.name : formatTranslated(oc.name as any);
                  }
                  const c = productResponse?.country;
                  if (
                    c &&
                    typeof c === 'object' &&
                    'name' in c &&
                    (c as { name?: string | { en: string; ar: string } }).name != null
                  ) {
                    return formatTranslated(
                      (c as { name: string | { en: string; ar: string } }).name as any
                    );
                  }
                  return undefined;
                })()}
              />
            </Box>

            <Box className="group">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:map-point-bold" className="text-primary" width={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.countrySaleSelect')}
                </Typography>
              </Box>
              <RHFInfiniteSelect
                name="sale_country_id"
                queryKey={['sale-countries', 'infinite', 'product-form']}
                fetcher={saleCountryFetcher}
                placeholder={t('form.selectCountrySaleOptional')}
                pageSize={20}
                initialLabel={
                  productResponse?.sale_country?.name
                    ? typeof productResponse.sale_country.name === 'string'
                      ? productResponse.sale_country.name
                      : formatTranslated(productResponse.sale_country.name as any)
                    : defaultSaleCountryLabel
                }
              />
            </Box>
          </Box>
        </Box>
        )}

        {/* ─── Unit · warranty · expiry ─ */}
        <Box className="rounded-xl border border-border bg-card p-6 space-y-4">
          {/* unit · warranty · expiry */}
          <Box className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-start">
            <Box className="group min-w-0">
              <Typography variant="caption" className="text-muted-foreground mb-1 block">
                {t('form.unitSelectLabel')}
              </Typography>
              <Controller
                name="unit_id"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <select
                      className={fieldInputClass(!!error)}
                      value={!field.value ? '' : String(field.value)}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v ? Number(v) : 0);
                      }}
                    >
                      <option value="">{t('form.unitSelectPlaceholder')}</option>
                      {unitSelectOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </Box>
            <Box className="group min-w-0">
              <Typography variant="caption" className="text-muted-foreground mb-1 block">
                {t('form.warrantySelectLabel')}
              </Typography>
              <Controller
                name="warranty_id"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <select
                      name="warranty_id"
                      className={fieldInputClass(!!error)}
                      value={!field.value ? '' : String(field.value)}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v ? Number(v) : 0);
                      }}
                    >
                      <option value="">{t('form.warrantySelectPlaceholder')}</option>
                      {warrantySelectOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </Box>
            <Box className="group min-w-0">
              <Typography variant="caption" className="text-muted-foreground mb-1 block">
                {t('form.productExpiryDate')}
              </Typography>
              <Controller
                name="expiry_date"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <input
                      {...field}
                      type="date"
                      value={field.value ?? ''}
                      min={
                        field.value && field.value < todayDateInputMin
                          ? field.value
                          : todayDateInputMin
                      }
                      className={fieldInputClass(!!error)}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </Box>
          </Box>
        </Box>

        {/* ─── Product Images ───────────────────────────────────── */}
        <Box className="group">
          <Box className="flex items-center gap-2 mb-2">
            <Iconify icon="solar:gallery-add-bold" className="text-primary" width={20} />
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.productImagesSection')}
            </Typography>
          </Box>
          <Controller
            name="images"
            control={control}
            render={({ field: { onChange, value, ref, name, onBlur }, fieldState: { error } }) => (
              <div className="w-full">
                {/* Native file inputs are unreliable when styled as text fields; use label + sr-only input */}
                <input
                  id={productImagesInputId}
                  ref={ref}
                  name={name}
                  onBlur={onBlur}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    const picked = e.target.files ? Array.from(e.target.files) : [];
                    const prev = Array.isArray(value) ? value : [];
                    onChange([...prev, ...picked]);
                    e.currentTarget.value = '';
                  }}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor={productImagesInputId}
                    className="inline-flex cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {t('form.chooseFiles')}
                  </label>
                  <Typography component="span" variant="body2" color="secondary">
                    {Array.isArray(value) && value.length > 0
                      ? t('form.filesSelectedCount', { count: value.length })
                      : t('form.noFileChosen')}
                  </Typography>
                </div>
                <FieldErrorText message={error?.message} />
                {(isEditMode && existingMediaIds.length > 0) ||
                (Array.isArray(value) && value.some((f) => f instanceof File)) ? (
                  <Box className="mt-4 grid grid-cols-4 gap-4">
                    {isEditMode &&
                      productResponse?.images
                        ?.filter((img: any) => existingMediaIds.includes(Number(img.id)))
                        .map((img: any) => (
                          <Box key={`ex-${img.id}`} className="relative overflow-hidden rounded-lg group">
                            <img
                              src={img.url ?? img}
                              alt=""
                              className="w-full h-32 object-cover rounded-lg border border-border/60"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setValue(
                                  'existing_media_ids',
                                  existingMediaIds.filter((mid) => mid !== Number(img.id)),
                                  { shouldDirty: true }
                                )
                              }
                              className="absolute top-2 start-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-xl font-bold leading-none text-white shadow-lg ring-2 ring-white hover:bg-red-700"
                              aria-label={t('form.removeImageAria')}
                            >
                              ×
                            </button>
                          </Box>
                        ))}
                    {(Array.isArray(value) ? value : [])
                      .filter((f): f is File => f instanceof File)
                      .map((file, i, files) => (
                        <RemovableLocalImageThumb
                          key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
                          file={file}
                          alt={t('form.productGalleryPreviewAlt', { n: i + 1 })}
                          removeAriaLabel={t('form.removeImageAria')}
                          onRemove={() => onChange(files.filter((_, idx) => idx !== i))}
                        />
                      ))}
                  </Box>
                ) : null}
              </div>
            )}
          />
        </Box>

        {/* ─── Thumbnail (optional) ─────────────────────────────── */}
        <Box className="group">
          <label className="flex items-center gap-2 mb-2">
            <Iconify icon="solar:gallery-bold" className="text-primary" width={20} />
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.thumbnailOptional')}
            </Typography>
          </label>
          <Controller
            name="thumbnail"
            control={control}
            render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
              <div>
                <input
                  id={thumbnailInputId}
                  ref={ref}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    onChange(f ?? undefined);
                    e.target.value = '';
                  }}
                />
                <label
                  htmlFor={thumbnailInputId}
                  className={`inline-flex cursor-pointer rounded-lg border bg-background px-3 py-2 text-sm ${
                    error ? 'border-destructive' : 'border-border'
                  }`}
                >
                  {t('form.chooseThumbnail')}
                </label>
                <FieldErrorText message={error?.message} />
                <LocalFilePreview
                  file={value instanceof File ? value : null}
                  label={t('form.thumbnailOptional')}
                />
                <ExistingImagePreview
                  url={productResponse?.thumbnail}
                  label={t('form.currentThumbnailServer')}
                  active={isEditMode && !(value instanceof File)}
                  fallbackUrl={productResponse?.images?.[0]?.url}
                />
              </div>
            )}
          />
        </Box>

        {/* ─── Instant Delivery + visibility ─────────────────────── */}
        <Box className="flex flex-wrap gap-6">
          <Controller
            name="is_instant_delivery"
            control={control}
            render={({ field: { onChange, value } }) => (
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value === 1}
                  onChange={(e) => onChange(e.target.checked ? 1 : 0)}
                  className="w-4 h-4 rounded border-border"
                />
                <Typography variant="body2" className="text-foreground">
                  {t('form.productInstantDeliveryLabel')}
                </Typography>
              </Label>
            )}
          />
          <Controller
            name="is_visible"
            control={control}
            render={({ field: { onChange, value } }) => (
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value !== 0}
                  onChange={(e) => onChange(e.target.checked ? 1 : 0)}
                  className="w-4 h-4 rounded border-border"
                />
                <Typography variant="body2" className="text-foreground">
                  {t('form.productVisibleInStore')}
                </Typography>
              </Label>
            )}
          />
        </Box>

        <ProductFormBoughtWithSection
          currentProductId={id}
          products={allProducts}
          selectedIds={watchedBoughtWith}
          onToggle={toggleBoughtWith}
          onClear={clearBoughtWith}
          isLoading={isFetchingBoughtWithList && allProducts.length === 0}
          hasCategory={categoryIdNum > 0}
          categoryOptions={boughtWithCategoryOptions.filter((o) => Number(o.value) !== categoryIdNum)}
          extraCategoryIds={boughtWithExtraCategoryIds}
          onExtraCategoriesChange={setBoughtWithExtraCategoryIds}
        />

        {/* ─── Category Details ─────────────────────────────────── */}
        <Box className="border-t border-border pt-6">
          <Box className="flex items-center justify-between mb-4">
            <Box className="flex items-center gap-2">
              <Iconify icon="solar:list-check-bold" className="text-primary" width={20} />
              <Typography variant="h6" className="font-semibold text-foreground">
                {t('form.categoryDetailsTitle')}
              </Typography>
            </Box>
            {availableCategoryDetails.length > 0 && (
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={() =>
                  appendCategoryDetail({
                    category_detail_id: availableCategoryDetails[0]?.id ?? 0,
                    detail_value: { en: '', ar: '' },
                  })
                }
              >
                <Iconify icon="solar:add-circle-bold" width={16} className="mr-1" />
                {t('form.addDetail')}
              </Button>
            )}
          </Box>

          {!categoryId || categoryId === 0 ? (
            <Typography variant="body2" className="text-muted-foreground">
              {t('form.selectCategoryFirstDetails')}
            </Typography>
          ) : availableCategoryDetails.length === 0 ? (
            <Typography variant="body2" className="text-muted-foreground">
              {t('form.noCategoryDetailsForCategory')}
            </Typography>
          ) : (
            <Box className="space-y-4">
              {categoryDetailsFields.map((field, index) => {
                const row = watchedCategoryDetailRows[index] as
                  | { category_detail_id?: number; detail_value?: { en: string; ar: string } }
                  | undefined;
                const detailId = row?.category_detail_id;
                const selectedDef = availableCategoryDetails.find(
                  (cd: any) => Number(cd.id) === Number(detailId)
                );
                const valueOpts = normalizeCategoryDetailValueOptions(selectedDef?.value_options);
                const dv = row?.detail_value ?? { en: '', ar: '' };
                const matchedKey = findCategoryDetailOptionKey(dv, valueOpts);
                const hasPresets = valueOpts.length > 0;
                const hasOrphanSaved =
                  hasPresets &&
                  !matchedKey &&
                  ((dv.en ?? '').trim() !== '' || (dv.ar ?? '').trim() !== '');

                return (
                  <Box key={field.id} className="p-4 border border-border rounded-lg space-y-3">
                    <Box className="flex items-center gap-3">
                      <Controller
                        name={`category_details.${index}.category_detail_id`}
                        control={control}
                        render={({ field: f, fieldState: { error } }) => (
                          <div className="flex-1 min-w-0">
                            <select
                              {...f}
                              value={f.value}
                              onChange={(e) => {
                                f.onChange(Number(e.target.value));
                                setValue(
                                  `category_details.${index}.detail_value`,
                                  { en: '', ar: '' },
                                  { shouldDirty: true, shouldValidate: true }
                                );
                              }}
                              className={fieldInputClass(!!error)}
                            >
                              {availableCategoryDetails.map((cd: any) => (
                                <option key={cd.id} value={cd.id}>
                                  {typeof cd.name === 'object'
                                    ? cd.name?.en ?? cd.name?.ar
                                    : cd.name}
                                </option>
                              ))}
                            </select>
                            <FieldErrorText message={error?.message} />
                          </div>
                        )}
                      />
                      <Button
                        type="button"
                        variant="text"
                        size="small"
                        onClick={() => removeCategoryDetail(index)}
                        className="text-destructive shrink-0"
                      >
                        <Iconify icon="solar:trash-bin-bold" width={16} />
                      </Button>
                    </Box>

                    {hasPresets ? (
                      <Box className="space-y-2">
                        <Typography variant="caption" className="text-muted-foreground font-medium block">
                          {t('form.categoryDetailPredefinedValueLabel')}
                        </Typography>
                        <select
                          className={fieldInputClass(false)}
                          value={matchedKey}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!v) {
                              setValue(
                                `category_details.${index}.detail_value`,
                                { en: '', ar: '' },
                                { shouldDirty: true, shouldValidate: true }
                              );
                              return;
                            }
                            try {
                              const parsed = JSON.parse(v) as { en?: string; ar?: string };
                              setValue(
                                `category_details.${index}.detail_value`,
                                { en: parsed.en ?? '', ar: parsed.ar ?? '' },
                                { shouldDirty: true, shouldValidate: true }
                              );
                            } catch {
                              /* ignore malformed */
                            }
                          }}
                        >
                          <option value="">{t('form.selectCategoryDetailValue')}</option>
                          {valueOpts.map((opt, optIdx) => (
                            <option key={optIdx} value={categoryDetailOptionKey(opt)}>
                              {`${opt.en} / ${opt.ar}`}
                            </option>
                          ))}
                        </select>
                        {hasOrphanSaved ? (
                          <Typography variant="caption" className="text-amber-600 dark:text-amber-500 block">
                            {t('form.categoryDetailValueNotInList', {
                              en: dv.en ?? '',
                              ar: dv.ar ?? '',
                            })}
                          </Typography>
                        ) : null}
                      </Box>
                    ) : (
                      <Typography variant="caption" className="text-muted-foreground block">
                        {t('form.noPredefinedDetailValues')}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* ─── Extra Details (presets from category add-ons) ───── */}
        <Box className="border-t border-border pt-6">
          <Box className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
            <Box className="flex items-center gap-2">
              <Iconify icon="solar:add-circle-bold" className="text-primary" width={20} />
              <Typography variant="h6" className="font-semibold text-foreground">
                {t('form.extraDetailsTitle')}
              </Typography>
            </Box>
            <Button
              type="button"
              variant="outlined"
              size="small"
              disabled={categoryIdNum <= 0 || productExtraPresets.length === 0}
              onClick={() =>
                appendExtraDetail({
                  product_extra_detail_id: 0,
                  quantity: 1,
                  price: 0,
                })
              }
            >
              <Iconify icon="solar:add-circle-bold" width={16} className="mr-1" />
              {t('form.addDetail')}
            </Button>
          </Box>

          {categoryIdNum <= 0 ? (
            <Typography variant="caption" className="text-muted-foreground block mb-3">
              {t('form.selectCategoryFirstExtraDetails')}
            </Typography>
          ) : isFetchingProductExtraPresets && productExtraPresets.length === 0 ? (
            <Typography variant="caption" className="text-muted-foreground block mb-3">
              {t('form.loadingProductExtraPresets')}
            </Typography>
          ) : productExtraPresets.length === 0 ? (
            <Typography variant="caption" className="text-muted-foreground block mb-3">
              {t('form.noProductExtraDetailsForCategory')}
            </Typography>
          ) : null}

          {typeof errors.extra_details?.message === 'string' && errors.extra_details.message ? (
            <Typography variant="caption" className="text-destructive block mb-3">
              {errors.extra_details.message}
            </Typography>
          ) : null}

          <Box className="space-y-4">
            {extraDetailsFields.map((field, index) => {
              const rowValues = watchedExtraDetailsRows as Array<{
                product_extra_detail_id?: number;
              }>;
              const currentPid = Number(rowValues[index]?.product_extra_detail_id) || 0;
              const takenIds = new Set(
                rowValues
                  .map((r, j) => (j !== index ? Number(r?.product_extra_detail_id) || 0 : 0))
                  .filter((n) => n > 0)
              );
              const rowOptions = productExtraPresets.filter(
                (p) => p.id === currentPid || !takenIds.has(p.id)
              );
              return (
                <Box key={field.id} className="p-4 border border-border rounded-lg space-y-3">
                  <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <Controller
                        name={`extra_details.${index}.product_extra_detail_id`}
                        control={control}
                        render={({ field: f, fieldState: { error } }) => (
                          <div>
                            <select
                              value={f.value ? String(f.value) : ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                f.onChange(v ? Number(v) : 0);
                              }}
                              onBlur={f.onBlur}
                              ref={f.ref}
                              className={fieldInputClass(!!error)}
                              disabled={
                                categoryIdNum <= 0 || rowOptions.length === 0 || !productExtraPresets.length
                              }
                            >
                              <option value="">{t('form.productExtraDetailSelectPlaceholder')}</option>
                              {rowOptions.map((pr) => (
                                <option key={pr.id} value={String(pr.id)}>
                                  {labelProductExtraPreset(pr)}
                                </option>
                              ))}
                            </select>
                            <FieldErrorText message={error?.message} />
                          </div>
                        )}
                      />
                    </div>
                    <Controller
                      name={`extra_details.${index}.quantity`}
                      control={control}
                      render={({ field: f, fieldState: { error } }) => (
                        <div>
                          <Typography
                            variant="subtitle2"
                            component="div"
                            className="font-semibold text-foreground mb-2"
                          >
                            {t('form.extraDetailQuantityLabel')}
                          </Typography>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            placeholder={t('form.extraQuantityOptional')}
                            value={
                              f.value === undefined || f.value === null ? '' : String(f.value)
                            }
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              if (raw === '') {
                                f.onChange(undefined);
                                return;
                              }
                              const n = Number.parseInt(raw, 10);
                              f.onChange(Number.isNaN(n) ? undefined : n);
                            }}
                            onBlur={f.onBlur}
                            name={f.name}
                            ref={f.ref}
                            className={fieldInputClass(!!error)}
                          />
                          <FieldErrorText message={error?.message} />
                        </div>
                      )}
                    />
                    <div>
                      <Typography
                        variant="subtitle2"
                        component="div"
                        className="font-semibold text-foreground mb-2"
                      >
                        {t('form.extraDetailPriceLabel')}
                      </Typography>
                      {currenciesReady && activeCurrencies.length > 0 ? (
                        productDualPriceReady ? (
                          <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                            <Controller
                              name={`extra_details.${index}.price`}
                              control={control}
                              render={({ field: f, fieldState: { error } }) => (
                                <div>
                                  <Typography
                                    variant="caption"
                                    className="text-muted-foreground mb-1 block"
                                  >
                                    {t('form.productPriceUsdLabel')}
                                    {usdCurrency?.symbol ? (
                                      <span className="ms-1 opacity-80">({usdCurrency.symbol})</span>
                                    ) : null}
                                  </Typography>
                                  <input
                                    type="number"
                                    placeholder=""
                                    value={
                                      f.value === undefined || f.value === null ? '' : String(f.value)
                                    }
                                    onChange={(e) => f.onChange(toTwoDecimalNumber(e.target.value))}
                                    onBlur={f.onBlur}
                                    name={f.name}
                                    ref={f.ref}
                                    className={fieldInputClass(!!error)}
                                    step="0.01"
                                    min={0}
                                  />
                                  <FieldErrorText message={error?.message} />
                                </div>
                              )}
                            />
                            <div>
                              <Typography
                                variant="caption"
                                className="text-muted-foreground mb-1 block"
                              >
                                {t('form.productPriceSypLabel')}
                                {sypCurrency?.symbol ? (
                                  <span className="ms-1 opacity-80">({sypCurrency.symbol})</span>
                                ) : null}
                              </Typography>
                              <input
                                type="number"
                                placeholder=""
                                value={(() => {
                                  const pw = watchedExtraDetailsRows[index]?.price;
                                  if (pw == null || Number.isNaN(Number(pw))) return '';
                                  return usdToLocalAmount(Number(pw), parseCurrencyRate(sypCurrency!));
                                })()}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const rate = parseCurrencyRate(sypCurrency!);
                                  if (raw === '') {
                                    setValue(`extra_details.${index}.price`, undefined, {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    });
                                    return;
                                  }
                                  const v = toTwoDecimalNumber(raw);
                                  if (v == null) {
                                    setValue(`extra_details.${index}.price`, undefined, {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    });
                                    return;
                                  }
                                  setValue(
                                    `extra_details.${index}.price`,
                                    localAmountToUsd(v, rate),
                                    {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    }
                                  );
                                }}
                                className={fieldInputClass(
                                  !!(errors.extra_details as any)?.[index]?.price
                                )}
                                step="0.01"
                                min={0}
                              />
                            </div>
                          </Box>
                        ) : (
                          <Box className="space-y-2">
                            <Typography variant="caption" className="text-destructive block">
                              {t('form.productPriceSypMissing')}
                            </Typography>
                            <Controller
                              name={`extra_details.${index}.price`}
                              control={control}
                              render={({ field: f, fieldState: { error } }) => (
                                <div>
                                  <Typography
                                    variant="caption"
                                    className="text-muted-foreground mb-1 block"
                                  >
                                    {t('form.productPriceUsdLabel')}
                                  </Typography>
                                  <input
                                    type="number"
                                    placeholder=""
                                    value={
                                      f.value === undefined || f.value === null ? '' : String(f.value)
                                    }
                                    onChange={(e) => f.onChange(toTwoDecimalNumber(e.target.value))}
                                    onBlur={f.onBlur}
                                    name={f.name}
                                    ref={f.ref}
                                    className={fieldInputClass(!!error)}
                                    step="0.01"
                                    min={0}
                                  />
                                  <FieldErrorText message={error?.message} />
                                </div>
                              )}
                            />
                          </Box>
                        )
                      ) : (
                        <Box className="space-y-2">
                          {!currenciesReady ? (
                            <Typography
                              variant="caption"
                              className="text-muted-foreground block"
                            >
                              {t('form.productPriceCurrenciesLoading')}
                            </Typography>
                          ) : null}
                          <Controller
                            name={`extra_details.${index}.price`}
                            control={control}
                            render={({ field: f, fieldState: { error } }) => (
                              <div>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={
                                    f.value === undefined || f.value === null ? '' : String(f.value)
                                  }
                                  onChange={(e) => f.onChange(toTwoDecimalNumber(e.target.value))}
                                  onBlur={f.onBlur}
                                  name={f.name}
                                  ref={f.ref}
                                  className={fieldInputClass(!!error)}
                                  step="0.01"
                                  min={0}
                                />
                                <FieldErrorText message={error?.message} />
                              </div>
                            )}
                          />
                        </Box>
                      )}
                    </div>
                  </Box>
                  <Box className="flex justify-end">
                    <Button
                      type="button"
                      variant="text"
                      size="small"
                      onClick={() => removeExtraDetail(index)}
                      className="text-destructive"
                    >
                      <Iconify icon="solar:trash-bin-bold" width={16} className="mr-1" />
                      {t('form.remove')}
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
          </>
        )}
          </Box>
        )}

        {productFormTab === 'variants' && (
          <Box className="space-y-6">
        <Box className="space-y-5">
          <Box className="flex items-center gap-2">
            <Iconify icon="solar:settings-bold" className="text-primary" width={20} />
            <Typography variant="h6" className="font-semibold text-foreground">
              {t('form.variantsAttributesTitle')}
            </Typography>
          </Box>

          {!mainCategoryId || mainCategoryId === 0 ? (
            <Typography variant="body2" className="text-muted-foreground">
              {t('form.selectCategoryFirstAttributes')}
            </Typography>
          ) : isLoadingAttributes ? (
            <Typography variant="body2" className="text-muted-foreground">
              {t('form.loadingAttributes')}
            </Typography>
          ) : (
            <>
              {!restaurantMode && categoryAttributes.length > 0 ? (
              <VariantGeneratorPanel
                categoryAttributes={categoryAttributes as Array<{
                  id: number;
                  name?: { ar?: string; en?: string } | string;
                  type?: string;
                  values?: Array<{
                    id: number;
                    name?: { ar?: string; en?: string } | string;
                    color?: { hex?: string } | null;
                  }>;
                }>}
                productSku={String(watchedProductSku ?? '')}
                existingComboKeys={existingVariantComboKeys}
                onAdd={(row: GeneratedVariantRow) => appendVariant(row)}
                t={t}
                formatAttributeLabel={attributeLabel}
              />
              ) : !restaurantMode ? (
                <Box className="flex justify-end">
                  <Button
                    type="button"
                    variant="contained"
                    size="medium"
                    onClick={() => appendVariant(makeBlankVariantRow())}
                  >
                    <Iconify icon="solar:add-circle-bold" width={18} className="me-1.5" />
                    {t('form.addVariant')}
                  </Button>
                </Box>
              ) : null}

              <ProductVariantsCardList
                  variants={variantsFields}
                  categoryAttributes={categoryAttributes as Parameters<typeof resolveAttributeValuesByIds>[0]}
                  resolveValueRefs={(valueIds) =>
                    resolveAttributeValuesByIds(
                      categoryAttributes as Parameters<typeof resolveAttributeValuesByIds>[0],
                      valueIds
                    )
                  }
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  errors={errors}
                  productDualPriceReady={productDualPriceReady}
                  sypCurrency={sypCurrency}
                  sypRate={sypRate}
                  watchedProductSku={String(watchedProductSku ?? '')}
                  restaurantMode={restaurantMode}
                  isEditMode={isEditMode}
                  isShopSaleChannel={isShopSaleChannel}
                  productId={id}
                  productResponse={productResponse}
                  shops={shops}
                  shopVariantsFields={shopVariantsFields}
                  watchedShopVariants={watchedShopVariants}
                  appendShopVariant={appendShopVariant}
                  removeShopVariant={removeShopVariant}
                  shopVariantCreateBusyIdx={shopVariantCreateBusyIdx}
                  setShopVariantCreateBusyIdx={setShopVariantCreateBusyIdx}
                  updateShopVariantMutation={updateShopVariantMutation}
                  createSingleShopVariantOnProduct={createSingleShopVariantOnProduct}
                  onRemove={(variantIndex) => void confirmAndRemoveVariant(variantIndex)}
                  onSave={(variantIndex) => saveVariantRow(variantIndex)}
                  isSavingIndex={variantCreateBusyIdx}
                  updatePending={updateVariantMutation.isPending}
                  isDeleting={variantDeleteFlow.isDeleting}
                  t={t}
                />
            </>
          )}
        </Box>
        </Box>
        )}

        {productFormTab === 'seo' && (
          <Box className="space-y-6">
        {/* ─── SEO ──────────────────────────────────────────────── */}
        <Box>
          <Typography variant="h6" className="font-semibold text-foreground mb-4">
            {t('form.seoTitle')}
          </Typography>
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Controller
              name="seo_title.en"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <input
                    {...field}
                    placeholder={t('form.seoTitleEnPlaceholder')}
                    className={fieldInputClass(!!error)}
                  />
                  <FieldErrorText message={error?.message} />
                </div>
              )}
            />
            <Controller
              name="seo_title.ar"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <input
                    {...field}
                    dir="rtl"
                    placeholder={t('form.seoTitleArPlaceholder')}
                    className={fieldInputClass(!!error)}
                  />
                  <FieldErrorText message={error?.message} />
                </div>
              )}
            />
            <Controller
              name="seo_description.en"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <textarea
                    {...field}
                    placeholder={t('form.seoDescEnPlaceholder')}
                    className={`${fieldInputClass(!!error)} min-h-[80px]`}
                  />
                  <FieldErrorText message={error?.message} />
                </div>
              )}
            />
            <Controller
              name="seo_description.ar"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <textarea
                    {...field}
                    dir="rtl"
                    placeholder={t('form.seoDescArPlaceholder')}
                    className={`${fieldInputClass(!!error)} min-h-[80px]`}
                  />
                  <FieldErrorText message={error?.message} />
                </div>
              )}
            />
            <Controller
              name="seo_keywords.en"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <input
                    {...field}
                    placeholder={t('form.seoKeywordsEnPlaceholder')}
                    className={fieldInputClass(!!error)}
                  />
                  <FieldErrorText message={error?.message} />
                </div>
              )}
            />
            <Controller
              name="seo_keywords.ar"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <input
                    {...field}
                    dir="rtl"
                    placeholder={t('form.seoKeywordsArPlaceholder')}
                    className={fieldInputClass(!!error)}
                  />
                  <FieldErrorText message={error?.message} />
                </div>
              )}
            />
          </Box>
          <Box className="group">
            <Typography variant="subtitle2" className="mb-2">
              {t('form.seoImageOptional')}
            </Typography>
            <Controller
              name="seo_image"
              control={control}
              render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
                <div>
                  <input
                    id={seoImageInputId}
                    ref={ref}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      onChange(f ?? undefined);
                      e.target.value = '';
                    }}
                  />
                  <label
                    htmlFor={seoImageInputId}
                    className={`inline-flex cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                      error ? 'border-destructive' : 'border-border'
                    }`}
                  >
                    {t('form.chooseSeoImage')}
                  </label>
                  <FieldErrorText message={error?.message} />
                  <LocalFilePreview
                    file={value instanceof File ? value : null}
                    label={t('form.seoImageOptional')}
                  />
                  <ExistingImagePreview
                    url={productResponse?.seo_image}
                    label={t('form.currentSeoImage')}
                    active={isEditMode && !(value instanceof File)}
                    fallbackUrl={productResponse?.images?.[0]?.url}
                  />
                </div>
              )}
            />
          </Box>
        </Box>
          </Box>
        )}

        {productFormTab === 'extras' && (
          <ProductFormExtrasTab
            iconOptions={iconOptions}
            selectedIconIds={watchedIconIds}
            onToggleIcon={toggleIcon}
            isLoadingIcons={isLoadingIcons}
          />
        )}

        {/* Shown before any saved variant is deleted — lists what the delete touches. */}
        <VariantDeleteImpactDialog {...variantDeleteFlow.dialogProps} />
      </CreateFormLayout>
  );
}
