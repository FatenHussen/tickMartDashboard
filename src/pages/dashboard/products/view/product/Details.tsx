import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { CurrencyData } from '@/pages/dashboard/currencies/types/currency.types';
import type { ProductDetailData } from '@/pages/dashboard/products/types/product.types';

import { toast } from 'react-toastify';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router';
import { Iconify } from '@/shared/components/iconify';
import { compressImages } from '@/utils/compress-image';
import { useRef, useMemo, useState, useEffect } from 'react';
import { formatTranslated } from '@/utils/format-translated';
import { getApiErrorMessage } from '@/lib/get-api-error-message';
import { iconArtworkSrc } from '@/pages/dashboard/icons/utils/icon-artwork';
import { useFetchProductById } from '@/pages/dashboard/products/hooks/product';
import { useRootCategoryId } from '@/pages/dashboard/categories/hooks/category';
import { useFetchCurrencies } from '@/pages/dashboard/currencies/hooks/currency';
import { useUpdateProductVariant } from '@/pages/dashboard/products/hooks/product-variant';
import { useVariantDeleteFlow } from '@/pages/dashboard/products/hooks/use-variant-delete-flow';
import { useFetchCategoryAttributes } from '@/pages/dashboard/categories/hooks/category-attribute';
import { VariantAttributeSelects } from '@/pages/dashboard/products/components/VariantAttributeSelects';
import { VariantDeleteImpactDialog } from '@/pages/dashboard/products/components/VariantDeleteImpactDialog';
import { formatDecimal, normalizeFormattedMoneyText, formatApiCurrencyAmountForLanguage } from '@/utils/format-currency';
import {
  isHiddenDefaultVariant,
  variantImageFieldsFromRow,
  normalizeVariantExistingImages,
  extractVariantAttributeValueIds,
} from '@/pages/dashboard/products/utils/variant-payload';
import {
  priceAfterDiscount,
  attributeValueLabel,
  sanitizeEnglishSkuInput,
  resolveAttributeValueId,
  generateRandomVariantSku,
  mergeVariantAttributeValueIds,
  toCategoryAttributePickerRows,
  type CategoryAttributePickerRow,
  ensureCategoryAttributesFromVariants,
} from '@/pages/dashboard/products/utils/variant-combinations';
import {
  ProductDetailsTag,
  ProductDetailsChip,
  ProductDetailsField,
  ProductDetailsSection,
  ProductDetailsDenseRow,
  ProductDetailsFieldGrid,
  ProductDetailsPageShell,
  ProductDetailsMetricCell,
  ProductDetailsVariantCard,
  ProductDetailsPricingPanel,
  ProductDetailsPricingSummary,
  ProductDetailsDualCurrencyInline,
} from '@/pages/dashboard/products/components/product-details-ui';

import { paths } from 'src/routes/paths';

import { toDisplayString } from 'src/utils/to-display-string';

import { CONFIG } from 'src/global-config';
import { Box, Typography } from 'src/shared/ui';
import { LoadingScreen } from 'src/shared/components/loading-screen';

// ----------------------------------------------------------------------

function productCountryOriginDisplay(product: Record<string, unknown>): ReactNode {
  const oc = product.origin_country as { name?: unknown } | null | undefined;
  if (oc && typeof oc === 'object' && oc.name != null) {
    return typeof oc.name === 'string' ? oc.name : formatTranslated(oc.name as any);
  }
  const c = product.country as Record<string, unknown> | null | undefined;
  if (c && typeof c === 'object') {
    if ('name' in c && c.name != null) {
      return formatTranslated(c.name as any);
    }
    const en = c.en as string | undefined;
    const ar = c.ar as string | undefined;
    if (en || ar) {
      return [en, ar].filter(Boolean).join(' / ') || '—';
    }
  }
  return '—';
}

function productCountrySaleDisplay(product: Record<string, unknown>): ReactNode {
  const c = product.sale_country as { name?: unknown } | null | undefined;
  if (c && typeof c === 'object' && c.name != null) {
    return typeof c.name === 'string' ? c.name : formatTranslated(c.name as any);
  }
  return '—';
}

function seoKeywordsLines(kw: ProductDetailData['seo_keywords']): { en?: string; ar?: string } {
  if (!kw || typeof kw !== 'object') {
    return {};
  }
  const rec = kw as Record<string, unknown>;
  const part = (v: unknown): string | undefined => {
    if (v == null) return undefined;
    if (Array.isArray(v)) {
      const s = v.map((x) => String(x).trim()).filter(Boolean).join(', ');
      return s || undefined;
    }
    if (typeof v === 'string') {
      const s = v.trim();
      return s || undefined;
    }
    return undefined;
  };
  return {
    en: part(rec.en),
    ar: part(rec.ar),
  };
}

function boughtWithItemLabel(
  item: number | { id: number; name?: string | { en?: string; ar?: string } },
  t: TFunction<'table'>
): ReactNode {
  if (typeof item === 'object' && item !== null && 'id' in item) {
    if (item.name != null) {
      return typeof item.name === 'string' ? item.name : formatTranslated(item.name as any);
    }
    return t('form.productDetailsProductId', { id: item.id });
  }
  return t('form.productDetailsProductId', { id: item });
}

/** Renders TipTap / rich-text HTML stored in full_description. */
function ProductRichDescriptionHtml({
  html,
  dir,
}: {
  html: string | null | undefined;
  dir?: 'ltr' | 'rtl';
}) {
  const trimmed = typeof html === 'string' ? html.trim() : '';
  if (!trimmed) {
    return (
      <Typography variant="body1" className="text-muted-foreground">
        —
      </Typography>
    );
  }
  return (
    <Box
      dir={dir}
      className="product-rich-html text-foreground text-sm leading-relaxed max-w-none [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:ps-5 [&_ol]:my-2 [&_ol]:ps-5 [&_li]:my-0.5 [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-3 [&_blockquote]:text-muted-foreground"
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  );
}

function DetailRow({ label, value, emptyLabel }: { label: string; value: ReactNode; emptyLabel: string }) {
  return <ProductDetailsField label={label} value={value} emptyLabel={emptyLabel} />;
}

/** Renders `*_currencies` maps, then `*_formatted`, then legacy amount + label. */
function productMoneyDisplay(args: {
  currencies?: Record<
    string,
    { amount?: number; currency?: string; symbol?: string; formatted?: string } | null
  > | null | undefined;
  singleFormatted?: string | null | undefined;
  amount?: number | null | undefined;
  legacyAmountPrefix: string;
  emphasis?: boolean;
}): ReactNode {
  const { currencies, singleFormatted, amount, legacyAmountPrefix, emphasis } = args;
  const valueCls = emphasis ? 'text-xl font-bold tabular-nums' : 'tabular-nums';
  const entries = currencies ? Object.entries(currencies).filter(([, v]) => v && typeof v === 'object') : [];
  if (entries.length > 0) {
    entries.sort(([a], [b]) => a.localeCompare(b));
    return (
      <Box className="flex flex-col gap-0.5">
        {entries.map(([code, row]) => (
          <Typography key={code} variant={emphasis ? 'h6' : 'body1'} className={valueCls}>
            {row != null &&
            typeof row.amount === 'number' &&
            Number.isFinite(row.amount) &&
            (row.currency != null || code)
              ? formatApiCurrencyAmountForLanguage({
                  amount: row.amount,
                  currency: (row.currency ?? code) as string,
                  symbol: row.symbol,
                })
              : normalizeFormattedMoneyText(row?.formatted ?? '—')}
          </Typography>
        ))}
      </Box>
    );
  }
  if (singleFormatted) {
    const text = normalizeFormattedMoneyText(singleFormatted);
    return emphasis ? (
      <Typography variant="h6" className={valueCls}>
        {text}
      </Typography>
    ) : (
      text
    );
  }
  if (amount != null && !Number.isNaN(Number(amount))) {
    const text = `${legacyAmountPrefix} ${formatDecimal(amount)}`;
    return emphasis ? (
      <Typography variant="h6" className={valueCls}>
        {text}
      </Typography>
    ) : (
      text
    );
  }
  return '—';
}


function formatDiscountTypeLabel(dt: string | null | undefined, tr: TFunction<'table'>): string {
  const v = String(dt ?? '').toLowerCase().trim();
  if (v === 'percentage') return tr('form.discountTypePercentage');
  if (v === 'fixed') return tr('form.discountTypeFixed');
  if (v === 'none' || v === '') return tr('form.discountTypeNone');
  return String(dt ?? '—');
}

function badgeAdminLabel(
  badge: { id: number; name?: unknown },
  tr: TFunction<'table'>
): string {
  const n = badge.name;
  if (n != null && typeof n === 'object' && !Array.isArray(n)) {
    const s = formatTranslated(n as { en?: string; ar?: string })?.trim();
    if (s) return s;
  }
  if (typeof n === 'string' && n.trim()) return n.trim();
  return tr('form.productDetailsBadgeNumber', { id: badge.id });
}

function boolFromApi(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return Boolean(v);
}

// ----------------------------------------------------------------------
// Product Variant Edit Modal

interface EditVariantModalProps {
  open: boolean;
  variant: any;
  /** When product category is restaurant, variant model/barcode are not used. */
  isRestaurant?: boolean;
  categoryAttributes?: CategoryAttributePickerRow[];
  onClose: () => void;
  onSuccess: () => void;
}

function EditVariantModal({
  open,
  variant,
  isRestaurant = false,
  categoryAttributes = [],
  onClose,
  onSuccess,
}: EditVariantModalProps) {
  const { t } = useTranslation('table');
  const { mutate: updateVariant, isPending } = useUpdateProductVariant();
  const { data: currenciesResponse } = useFetchCurrencies(1, 100);

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

  const dualPriceReady = Boolean(usdCurrency && sypCurrency);
  const sypRate = sypCurrency ? parseShopVariantCurrencyRate(sypCurrency) : 1;

  const [isTrend, setIsTrend] = useState<number>(variant?.is_trend ?? 0);
  const [isActive, setIsActive] = useState<number>(variant?.is_active ?? 1);
  const [sku, setSku] = useState<string>(variant?.sku ?? '');
  const [model, setModel] = useState<string>(variant?.model ?? '');
  const [barcode, setBarcode] = useState<string>(variant?.barcode ?? '');
  const [price, setPrice] = useState<string>('');
  const [priceSyp, setPriceSyp] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discount, setDiscount] = useState<string>('');
  const [newImages, setNewImages] = useState<File[]>([]);
  const [attrIds, setAttrIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && variant) {
      setIsTrend(variant.is_trend ?? 0);
      setIsActive(variant.is_active ?? 1);
      setSku(variant.sku != null ? String(variant.sku) : '');
      setModel(variant.model != null ? String(variant.model) : '');
      setBarcode(variant.barcode != null ? String(variant.barcode) : '');
      setPrice(variant.price != null ? String(variant.price) : '');
      const sypFromApi =
        variant.price_currencies?.SYP?.amount ??
        (variant.price_syp != null ? variant.price_syp : undefined);
      if (sypFromApi != null && Number(sypFromApi) > 0) {
        setPriceSyp(String(sypFromApi));
      } else if (variant.price != null && dualPriceReady) {
        setPriceSyp(String(Math.round(Number(variant.price) * sypRate)));
      } else {
        setPriceSyp('');
      }
      setQuantity(variant.quantity != null ? String(variant.quantity) : '');
      const dt = String(variant.discount_type ?? 'none').toLowerCase();
      setDiscountType(
        dt === 'percentage' || dt === 'fixed' ? dt : 'none'
      );
      setDiscount(
        variant.discount != null && Number(variant.discount) > 0
          ? String(variant.discount)
          : ''
      );
      setNewImages([]);
      setAttrIds(extractVariantAttributeValueIds(variant));
    }
  }, [open, variant, dualPriceReady, sypRate]);

  const existingImages = normalizeVariantExistingImages(variant?.images);
  const [keptImageIds, setKeptImageIds] = useState<number[]>([]);

  useEffect(() => {
    if (open && variant) {
      setKeptImageIds(normalizeVariantExistingImages(variant.images).map((img) => img.id));
    }
  }, [open, variant]);

  const handleSubmit = async () => {
    if (!variant?.id) return;
    const nextAttrIds = mergeVariantAttributeValueIds(
      attrIds,
      extractVariantAttributeValueIds(variant),
      categoryAttributes,
      variant?.attributes
    );
    const originalIds = normalizeVariantExistingImages(variant.images).map((img) => img.id);
    const imageFields = variantImageFieldsFromRow({
      images: newImages,
      existing_images_ids: keptImageIds,
      original_existing_images_ids: originalIds,
    });
    const images =
      imageFields.images && imageFields.images.length > 0
        ? await compressImages(imageFields.images)
        : undefined;
    const priceNum = price !== '' ? Number(price) : undefined;
    const priceSypNum = priceSyp !== '' ? Number(priceSyp) : undefined;
    const priceUsd =
      priceNum != null && Number.isFinite(priceNum)
        ? priceNum
        : priceSypNum != null && Number.isFinite(priceSypNum) && sypRate > 0
          ? Math.round((priceSypNum / sypRate) * 100) / 100
          : undefined;
    const discountNum = discount !== '' ? Number(discount) : undefined;
    if (discountType !== 'none') {
      if (discountNum == null || !Number.isFinite(discountNum) || discountNum < 0) {
        toast.error(t('productVariantsModalInvalidDiscount'));
        return;
      }
      if (discountType === 'percentage' && discountNum > 100) {
        toast.error(t('productVariantsModalInvalidDiscountPercent'));
        return;
      }
    }
    const skuVal = sanitizeEnglishSkuInput(sku).trim();
    updateVariant(
      {
        id: variant.id,
        data: {
          is_trend: isTrend,
          is_active: isActive,
          attributes_values_ids: nextAttrIds,
          ...(imageFields.existing_images_ids !== undefined
            ? { existing_images_ids: imageFields.existing_images_ids }
            : {}),
          ...(images ? { images } : {}),
          ...(skuVal ? { sku: skuVal } : {}),
          ...(isRestaurant ? { model: '', barcode: '' } : { model, barcode }),
          ...(priceUsd != null ? { price: priceUsd } : {}),
          quantity: quantity !== '' ? Math.max(0, Math.floor(Number(quantity))) : undefined,
          discount_type: discountType,
          discount: discountType === 'none' ? 0 : discountNum,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('form.variantSaveSuccess'));
          onSuccess();
          onClose();
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      title={t('form.productDetailsEditVariantTitle', { id: variant?.id ?? '' })}
      content={
        <Box className="space-y-4">
          {categoryAttributes.length > 0 ? (
            <VariantAttributeSelects
              categoryAttributes={categoryAttributes}
              selectedIds={attrIds}
              variantAttributes={variant?.attributes}
              formatAttributeLabel={(name) =>
                formatTranslated(name as Parameters<typeof formatTranslated>[0], '')
              }
              t={t}
              onChange={setAttrIds}
            />
          ) : null}

          {/* is_trend */}
          <Box>
            <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
              {t('form.productDetailsVariantIsTrendLabel')}
            </Typography>
            <Box className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsTrend(1)}
                className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors ${isTrend === 1 ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/60'}`}
              >
                {t('yes')}
              </button>
              <button
                type="button"
                onClick={() => setIsTrend(0)}
                className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors ${isTrend === 0 ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/60'}`}
              >
                {t('no')}
              </button>
            </Box>
          </Box>

          {/* is_active */}
          <Box>
            <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
              {t('form.productDetailsVariantIsActiveLabel')}
            </Typography>
            <Box className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsActive(1)}
                className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors ${isActive === 1 ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/60'}`}
              >
                {t('yes')}
              </button>
              <button
                type="button"
                onClick={() => setIsActive(0)}
                className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors ${isActive === 0 ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/60'}`}
              >
                {t('no')}
              </button>
            </Box>
          </Box>

          <Box>
            <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
              {t('form.variantSku')}
            </Typography>
            <div className="flex gap-2">
              <input
                type="text"
                value={sku}
                placeholder={t('form.variantSkuPlaceholder')}
                onChange={(e) => setSku(sanitizeEnglishSkuInput(e.target.value))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                title={t('form.generateSku')}
                onClick={() => setSku(generateRandomVariantSku())}
                className="flex items-center justify-center rounded-md border border-border bg-muted px-2 hover:bg-muted/80 transition-colors"
              >
                <Iconify icon="solar:shuffle-bold" width={18} />
              </button>
            </div>
          </Box>
          {!isRestaurant && (
            <>
              <Box>
                <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
                  {t('form.productModel')}
                </Typography>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </Box>
              <Box>
                <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
                  {t('form.productBarcode')}
                </Typography>
                <input
                  type="text"
                  value={barcode}
                  placeholder={t('form.variantBarcodePlaceholder')}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </Box>
            </>
          )}
          {dualPriceReady ? (
            <>
              <Box>
                <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
                  {t('form.variantPriceUsdLabel')}
                  {usdCurrency?.symbol ? (
                    <span className="ms-1 opacity-80">({usdCurrency.symbol})</span>
                  ) : null}
                </Typography>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={price}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPrice(next);
                    if (dualPriceReady && next !== '') {
                      const n = Number(next);
                      if (Number.isFinite(n)) {
                        setPriceSyp(String(Math.round(n * sypRate)));
                      }
                    } else if (next === '') {
                      setPriceSyp('');
                    }
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </Box>
              <Box>
                <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
                  {t('form.variantPriceSypLabel')}
                  {sypCurrency?.symbol ? (
                    <span className="ms-1 opacity-80">({sypCurrency.symbol})</span>
                  ) : null}
                </Typography>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={priceSyp}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setPriceSyp(raw);
                    if (raw === '') {
                      setPrice('');
                      return;
                    }
                    const v = Number(raw);
                    if (Number.isFinite(v)) {
                      setPrice(String(Math.round((v / sypRate) * 100) / 100));
                    }
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </Box>
            </>
          ) : (
            <Box>
              <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
                {t('form.variantPriceLabel')}
              </Typography>
              <input
                type="number"
                step="0.01"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </Box>
          )}
          <Box>
            <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
              {t('form.variantQuantityLabel')}
            </Typography>
            <input
              type="number"
              step="1"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Typography variant="caption" className="text-muted-foreground mt-1 block">
              {t('form.variantPriceQuantityHint')}
            </Typography>
          </Box>

          <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Box>
              <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
                {t('form.productDiscountType')}
              </Typography>
              <select
                value={discountType}
                onChange={(e) => {
                  const next = e.target.value as 'none' | 'percentage' | 'fixed';
                  setDiscountType(next);
                  if (next === 'none') {
                    setDiscount('');
                    return;
                  }
                  if (next === 'percentage') {
                    const n = Number(discount);
                    if (Number.isFinite(n) && n > 100) setDiscount('100');
                  }
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="none">{t('form.discountTypeNone')}</option>
                <option value="percentage">{t('form.discountTypePercentage')}</option>
                <option value="fixed">{t('form.discountTypeFixed')}</option>
              </select>
            </Box>
            {discountType !== 'none' ? (
            <Box>
              <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
                {t('form.productDiscountValue')}
              </Typography>
              <input
                type="number"
                min={0}
                max={discountType === 'percentage' ? 100 : undefined}
                step="any"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </Box>
            ) : null}
          </Box>
          {price !== '' ? (
            <Box>
              <Typography variant="body2" className="text-muted-foreground mb-1 font-medium">
                {t('form.variantPriceAfterDiscount')}
              </Typography>
              <input
                type="text"
                readOnly
                value={(() => {
                  const p = Number(price);
                  if (!Number.isFinite(p)) return '';
                  const after = priceAfterDiscount(
                    p,
                    discountType,
                    discount !== '' ? Number(discount) : undefined
                  );
                  const parts = [`$${after}`];
                  if (dualPriceReady) {
                    parts.push(`${Math.round(after * sypRate)} SYP`);
                  }
                  return parts.join(' · ');
                })()}
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
              />
            </Box>
          ) : null}

          {/* existing images */}
          {existingImages.length > 0 && (
            <Box>
              <Typography variant="body2" className="text-muted-foreground mb-2 font-medium">
                {t('form.productDetailsVariantExistingImagesLabel')}
              </Typography>
              <Box className="flex flex-wrap gap-2">
                {existingImages.map((img) => {
                  const kept = keptImageIds.includes(img.id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() =>
                        setKeptImageIds((prev) =>
                          kept ? prev.filter((x) => x !== img.id) : [...prev, img.id]
                        )
                      }
                      className={`relative rounded-lg border-2 transition-all overflow-hidden ${kept ? 'border-primary' : 'border-border opacity-40'}`}
                    >
                      <img src={img.url} alt="" className="w-14 h-14 object-cover" />
                      {!kept && (
                        <Box className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Iconify icon="solar:trash-bin-minimalistic-bold" className="text-white" width={18} />
                        </Box>
                      )}
                    </button>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* new images */}
          <Box>
            <Typography variant="body2" className="text-muted-foreground mb-2 font-medium">
              {t('form.productDetailsVariantUploadNewLabel')}
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) setNewImages(Array.from(e.target.files));
              }}
            />
            <Button variant="outlined" size="small" onClick={() => fileInputRef.current?.click()}>
              <Iconify icon="solar:upload-bold" width={16} className="mr-1" />
              {newImages.length > 0
                ? t('form.productDetailsVariantFilesSelected', { count: newImages.length })
                : t('form.chooseFiles')}
            </Button>
          </Box>
        </Box>
      }
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={isPending}>
            {t('cancel')}
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isPending}>
            {isPending ? t('form.savingVariant') : t('save')}
          </Button>
        </>
      }
    />
  );
}

// ----------------------------------------------------------------------
// Shop product variant edit — currency helpers (same convention as product price: API stores USD)

function parseShopVariantCurrencyRate(c: CurrencyData): number {
  const r = Number((c as { exchange_rate?: string | number }).exchange_rate);
  return r > 0 ? r : 1;
}

export default function DetailsPage() {
  const { t, i18n } = useTranslation('table');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: productResponse, isLoading, error, refetch } = useFetchProductById(id || '');
  const productCategoryId = Number((productResponse as { category?: { id?: number } } | undefined)?.category?.id) || 0;
  const { data: rootCategoryId } = useRootCategoryId(productCategoryId || undefined);
  const { data: categoryAttributesAll } = useFetchCategoryAttributes(
    {
      page: 1,
      per_page: 100,
      category_id: rootCategoryId,
    },
    { requireCategoryId: true }
  );
  const categoryAttributes = useMemo(
    () =>
      ensureCategoryAttributesFromVariants(
        toCategoryAttributePickerRows(
          (categoryAttributesAll?.data as { items?: unknown[]; data?: unknown[] } | undefined)
            ?.items ??
            (categoryAttributesAll?.data as { data?: unknown[] } | undefined)?.data ??
            []
        ),
        (productResponse as { variants?: Array<{ attributes?: Array<{ category_attribute_id?: number }> }> } | undefined)
          ?.variants ?? []
      ),
    [categoryAttributesAll, productResponse]
  );

  const [editVariant, setEditVariant] = useState<any>(null);
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  // Both deletes preview their impact first, so the user sees what is removed (basket /
  // recipe rows) and what is kept (order history) before committing.
  const variantDeleteFlow = useVariantDeleteFlow({
    target: 'product_variant',
    onDeleted: () => {
      toast.success(t('form.variantDeleteSuccess'));
      refetch();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t('form.variantDeleteFailed'))),
  });

  useEffect(() => {
    setHeroImageIndex(0);
  }, [id]);

  const na = t('form.productDetailsNotAvailable');

  useEffect(() => {
    const suffix = id ? ` #${id}` : '';
    document.title = `${t('form.productDetailsMetaTitle')}${suffix} | ${CONFIG.appName}`;
  }, [t, i18n.language, id]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !productResponse) {
    return (
      <Box className="flex items-center justify-center min-h-[400px] p-6">
        <Box className="w-full max-w-md rounded-xl border border-border/50 shadow-lg bg-background p-6">
          <Box className="flex items-center gap-2 mb-2">
            <Iconify icon="solar:danger-bold" className="w-5 h-5 text-destructive" />
            <Typography variant="h6" className="text-destructive">
              {t('form.productDetailsErrorTitle')}
            </Typography>
          </Box>
          <Typography variant="body2" className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : t('form.productDetailsErrorMessage')}
          </Typography>
          <Button variant="outlined" onClick={() => navigate(paths.dashboard.products)}>
            {t('form.productDetailsBack')}
          </Button>
        </Box>
      </Box>
    );
  }

  const product = productResponse as any;
  const isRestaurant = Boolean(product?.is_restaurant ?? product?.category?.is_restaurant);

  const gallery: Array<{ id?: number; url: string }> = Array.isArray(product.images) ? product.images : [];
  const heroSrc =
    gallery[heroImageIndex]?.url ?? (typeof product.thumbnail === 'string' ? product.thumbnail : undefined);
  const visibleVariants = (Array.isArray(product.variants) ? product.variants : []).filter(
    (variant: unknown) => !isHiddenDefaultVariant(variant, categoryAttributes.length)
  );
  const variantCount = visibleVariants.length;

  const seoKw = seoKeywordsLines(product.seo_keywords);
  const seoImageAlt =
    [product.seo_title?.en, product.seo_title?.ar].filter(Boolean).join(' — ') ||
    t('form.productDetailsSeoImage');

  const approvalChipTone = (
    statusRaw: string | null | undefined
  ): 'success' | 'warning' | 'danger' | 'neutral' => {
    const s = String(statusRaw ?? '').toLowerCase();
    if (s.includes('reject')) return 'danger';
    if (s.includes('pending') || s.includes('draft') || s.includes('review')) return 'warning';
    if (s.includes('approv')) return 'success';
    return 'neutral';
  };

  return (
    <ProductDetailsPageShell>
        {/* Hero */}
        <Box className="relative mb-5 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <Box className="border-b border-border/50 bg-muted/20 px-4 py-2.5">
          <Button
            variant="text"
            onClick={() => navigate(paths.dashboard.products)}
            className="-ml-2 h-8 text-muted-foreground hover:text-foreground"
          >
            <Iconify icon="solar:arrow-left-bold" width={18} className="mr-2 rtl:rotate-180" />
            {t('form.productDetailsBack')}
          </Button>
          </Box>

          <Box className="p-4 md:p-5">
          <Box className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
            <Box className="flex w-full shrink-0 flex-col gap-3 lg:w-[220px] xl:w-[260px]">
              <Box className="relative aspect-[4/5] w-full max-h-[280px] overflow-hidden rounded-xl border border-border/60 bg-muted/20">
                {heroSrc ? (
                  <img
                    src={heroSrc}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                  />
                ) : (
                  <Box className="flex h-full w-full items-center justify-center">
                    <Iconify icon="solar:gallery-bold" className="text-muted-foreground/40" width={80} height={80} />
                  </Box>
                )}
                <Box className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent px-3 py-3 pt-10">
                  <Typography variant="caption" className="font-mono text-muted-foreground">
                    ID · {product.id}
                  </Typography>
                </Box>
              </Box>
              {gallery.length > 1 ? (
                <Box className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                  {gallery.map((img: any, i: number) => (
                    <button
                      key={img.id ?? i}
                      type="button"
                      onClick={() => setHeroImageIndex(i)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        i === heroImageIndex
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-border/60 opacity-80 hover:border-primary/50 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </Box>
              ) : null}
            </Box>

            <Box className="flex min-w-0 flex-1 flex-col gap-4">
              <Box>
                <Box className="mb-2 flex flex-wrap items-center gap-1.5">
                  <ProductDetailsChip tone="neutral">
                    {formatTranslated(product.category?.name) ?? product.category_id}
                  </ProductDetailsChip>
                  {(product.approval_status_label ?? product.approval_status) ? (
                    <ProductDetailsChip tone={approvalChipTone(product.approval_status ?? product.approval_status_label)}>
                      {product.approval_status_label ?? product.approval_status}
                    </ProductDetailsChip>
                  ) : null}
                  <ProductDetailsChip
                    tone={
                      product.is_visible !== false && product.is_visible !== 0 ? 'info' : 'neutral'
                    }
                  >
                    {product.is_visible !== false && product.is_visible !== 0
                      ? t('form.productDetailsVisible')
                      : t('form.productDetailsHidden')}
                  </ProductDetailsChip>
                  <ProductDetailsChip tone={boolFromApi(product.is_active ?? true) ? 'primary' : 'neutral'}>
                    {boolFromApi(product.is_active ?? true)
                      ? t('form.productDetailsListingActive')
                      : t('form.productDetailsListingInactive')}
                  </ProductDetailsChip>
                </Box>
                <Typography variant="h4" className="mb-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {formatTranslated(product.name)}
                </Typography>
                <Typography variant="caption" className="text-muted-foreground">
                  {t('form.productDetailsIdLabel')} · {product.id}
                  {product.product_number ? (
                    <>
                      {' · '}
                      {t('form.productDetailsProductNumber')}: {product.product_number}
                    </>
                  ) : null}
                  {product.vendor ? (
                    <>
                      {' · '}
                      {formatTranslated(product.vendor.name as any)}
                    </>
                  ) : null}
                </Typography>
                <Box className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {t('form.productDetailsCatalogQty')}:{' '}
                    <span className="font-semibold text-foreground">{product.quantity ?? '—'}</span>
                  </span>
                  <span>
                    {t('form.productDetailsStock')}:{' '}
                    <span className="font-semibold text-foreground">
                      {product.stock != null ? product.stock : '—'}
                    </span>
                  </span>
                  <span>
                    {t('form.productDetailsVariants')}:{' '}
                    <span className="font-semibold text-foreground">{variantCount}</span>
                  </span>
                </Box>
                {product.rating_count != null && Number(product.rating_count) > 0 ? (
                  <Typography variant="caption" className="mt-2 block text-muted-foreground">
                    {t('form.productDetailsRatingLine', {
                      rating: Number(product.rating ?? 0).toFixed(1),
                      count: product.rating_count,
                    })}
                  </Typography>
                ) : null}
                {product.rejection_reason ? (
                  <Box className="mt-4 rounded-xl border border-rose-500/35 bg-rose-500/[0.08] px-4 py-3">
                    <Typography variant="caption" className="font-semibold text-rose-800 dark:text-rose-300">
                      {t('form.productDetailsRejectionReason')}
                    </Typography>
                    <Typography variant="body2" className="mt-1 text-foreground">
                      {product.rejection_reason}
                    </Typography>
                  </Box>
                ) : null}
              </Box>

              <Box className="flex flex-wrap gap-2">
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => id && navigate(paths.dashboard.product.update(id))}
                  className="gap-2"
                >
                  <Iconify icon="solar:pen-bold" width={18} />
                  {t('form.productDetailsEdit')}
                </Button>
              </Box>
            </Box>
          </Box>
          </Box>
        </Box>

        <Box className="flex flex-col gap-4 xl:grid xl:grid-cols-12 xl:items-start xl:gap-4">
          <Box className="order-2 space-y-4 xl:order-1 xl:col-span-9">
            <ProductDetailsSection
              title={t('form.productDetailsSectionEssentials')}
              icon="solar:info-circle-bold"
            >
              <ProductDetailsFieldGrid cols={2}>
                <DetailRow label={t('form.nameEn')} value={product.name?.en} emptyLabel={na} />
                <DetailRow label={t('form.nameAr')} value={product.name?.ar} emptyLabel={na} />
                {product.product_number ? (
                  <DetailRow
                    label={t('form.productDetailsProductNumber')}
                    value={product.product_number}
                    emptyLabel={na}
                  />
                ) : null}
                <DetailRow
                  label={t('columns.category')}
                  value={formatTranslated(product.category?.name) ?? product.category_id}
                  emptyLabel={na}
                />
                {!isRestaurant && (
                  <DetailRow
                    label={t('form.brand')}
                    value={product.brand?.name ?? '—'}
                    emptyLabel={na}
                  />
                )}
                <DetailRow
                  label={t('form.productVendor')}
                  value={product.vendor ? formatTranslated(product.vendor.name as any) : '—'}
                  emptyLabel={na}
                />
                {!isRestaurant && (
                  <>
                    <DetailRow
                      label={t('form.countryOriginSelect')}
                      value={productCountryOriginDisplay(product)}
                      emptyLabel={na}
                    />
                    <DetailRow
                      label={t('form.countrySaleSelect')}
                      value={productCountrySaleDisplay(product)}
                      emptyLabel={na}
                    />
                    <DetailRow label={t('columns.sku')} value={product.sku} emptyLabel={na} />
                    <DetailRow label={t('form.model')} value={product.model} emptyLabel={na} />
                    <DetailRow label={t('form.barcode')} value={product.barcode} emptyLabel={na} />
                  </>
                )}
                <DetailRow
                  label={t('form.timeToPrepare')}
                  value={product.time_prepare}
                  emptyLabel={na}
                />
                <DetailRow
                  label={t('form.productDetailsDeliveryTime')}
                  value={product.delivery_time}
                  emptyLabel={na}
                />
                <DetailRow
                  label={t('form.productDetailsExpiryDate')}
                  value={
                    product.expiry_date
                      ? String(product.expiry_date).slice(0, 10)
                      : undefined
                  }
                  emptyLabel={na}
                />
              </ProductDetailsFieldGrid>
            </ProductDetailsSection>

            {/* Description */}
            <ProductDetailsSection
              title={t('form.productDetailsSectionDescription')}
              icon="solar:document-text-bold"
            >
              <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ProductDetailsField label={t('form.productDetailsDescriptionShortEn')} value={product.description?.en || '—'} />
                <ProductDetailsField label={t('form.productDetailsDescriptionShortAr')} value={product.description?.ar || '—'} />
                <Box className="rounded-xl border border-border/45 bg-muted/15 px-4 py-3 md:col-span-1">
                  <Typography variant="caption" className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('form.productFullDescEn')}
                  </Typography>
                  <ProductRichDescriptionHtml html={product.full_description?.en} dir="ltr" />
                </Box>
                <Box className="rounded-xl border border-border/45 bg-muted/15 px-4 py-3 md:col-span-1">
                  <Typography variant="caption" className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('form.productFullDescAr')}
                  </Typography>
                  <ProductRichDescriptionHtml html={product.full_description?.ar} dir="rtl" />
                </Box>
              </Box>
            </ProductDetailsSection>

            {/* Icons */}
            {product.icons?.length ? (
              <ProductDetailsSection title={t('form.productDetailsIcons')} icon="solar:star-bold">
                <Box className="flex flex-wrap gap-3">
                  {product.icons.map((ic: NonNullable<ProductDetailData['icons']>[number]) => {
                    const src = iconArtworkSrc(ic);
                    const name = formatTranslated(ic.name, '') || `#${ic.id}`;
                    const description = formatTranslated(ic.description, '');
                    return (
                      <Box
                        key={ic.id}
                        title={description || undefined}
                        className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5"
                      >
                        {src ? (
                          <img src={src} alt={name} className="h-8 w-8 object-contain" />
                        ) : null}
                        <Typography variant="body2" className="font-medium">
                          {name}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </ProductDetailsSection>
            ) : null}

            {/* Badges (product merchandising) */}
            {product.badges?.length > 0 && (
              <ProductDetailsSection title={t('form.productDetailsBadges')} icon="solar:medal-ribbon-star-bold">
                <Box className="flex flex-wrap gap-2">
                  {product.badges.map((bd: any) => (
                    <Box
                      key={bd.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-muted/25 px-3 py-2"
                    >
                      {bd.icon ? (
                        <img src={bd.icon} alt="" className="h-7 w-7 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Iconify icon="solar:medal-ribbon-bold" width={16} />
                        </span>
                      )}
                      <Typography variant="body2" className="font-medium">
                        {badgeAdminLabel(bd, t)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </ProductDetailsSection>
            )}

            {/* Variants */}
            {visibleVariants.length > 0 && (
              <ProductDetailsSection
                title={`${t('form.productDetailsVariants')} (${visibleVariants.length})`}
                icon="solar:widget-bold"
              >
                <Box className="space-y-4">
                  {visibleVariants.map((variant: any, i: number) => (
                    <ProductDetailsVariantCard
                      key={variant.id ?? i}
                      header={
                        <>
                          <Typography variant="subtitle1" className="font-semibold leading-snug text-foreground">
                            {variant.name
                              ? formatTranslated(variant.name)
                              : t('form.productDetailsVariantHeader', {
                                  n: i + 1,
                                  id: variant.id,
                                })}
                          </Typography>
                          <Typography variant="caption" className="font-mono text-muted-foreground">
                            ID #{variant.id}
                          </Typography>
                          <Box className="mt-2 flex flex-wrap gap-1.5">
                            {boolFromApi(variant.is_trend) ? (
                              <ProductDetailsChip tone="warning">
                                {t('form.productDetailsVariantIsTrendLabel')}
                              </ProductDetailsChip>
                            ) : null}
                            <ProductDetailsChip
                              tone={boolFromApi(variant.is_active ?? true) ? 'success' : 'neutral'}
                            >
                              {boolFromApi(variant.is_active ?? true)
                                ? t('form.productDetailsVariantIsActiveLabel')
                                : t('inactive')}
                            </ProductDetailsChip>
                          </Box>
                        </>
                      }
                      actions={
                        <>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => setEditVariant(variant)}
                            className="text-primary hover:bg-primary/10 min-w-0 px-2"
                          >
                            <Iconify icon="solar:pen-bold" width={16} />
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            disabled={variantDeleteFlow.isDeleting}
                            onClick={() => variantDeleteFlow.requestDelete(variant.id, undefined)}
                            className="text-destructive hover:bg-destructive/10 min-w-0 px-2"
                          >
                            <Iconify icon="solar:trash-bin-minimalistic-bold" width={16} />
                          </Button>
                        </>
                      }
                    >
                      <Box className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {t('form.productSku')}:{' '}
                          <span className="font-mono text-foreground">{variant.sku ?? na}</span>
                        </span>
                        {!isRestaurant && (
                          <>
                            <span>
                              {t('form.productModel')}:{' '}
                              <span className="font-mono text-foreground">{variant.model ?? na}</span>
                            </span>
                            <span>
                              {t('form.productBarcode')}:{' '}
                              <span className="font-mono text-foreground">{variant.barcode ?? na}</span>
                            </span>
                          </>
                        )}
                      </Box>

                      {/* One tag per attribute — never join values into a single "Red XS" label. */}
                      {(categoryAttributes.length > 0 || variant.attributes?.length > 0) && (
                        <Box>
                          <Typography variant="caption" className="text-muted-foreground mb-2 block">
                            {t('form.productDetailsAttributes')}
                          </Typography>
                          <Box className="flex flex-wrap gap-2">
                            {categoryAttributes.length > 0
                              ? categoryAttributes.map((attr) => {
                                  const selectedIds = extractVariantAttributeValueIds(variant);
                                  const selectedId = resolveAttributeValueId(
                                    selectedIds,
                                    attr,
                                    variant.attributes
                                  );
                                  const val = (attr.values ?? []).find(
                                    (item) => Number(item.id) === selectedId
                                  );
                                  const valueLabel =
                                    attributeValueLabel(val?.name) ||
                                    toDisplayString(
                                      variant.attributes?.find(
                                        (a: { category_attribute_id?: number }) =>
                                          Number(a.category_attribute_id) === Number(attr.id)
                                      )?.value
                                    ) ||
                                    '—';
                                  const isColor = String(attr.type ?? '').toLowerCase() === 'color';
                                  return (
                                    <ProductDetailsTag
                                      key={attr.id}
                                      label={formatTranslated(
                                        attr.name as Parameters<typeof formatTranslated>[0],
                                        ''
                                      )}
                                      value={valueLabel}
                                      colorDot={isColor ? valueLabel : undefined}
                                    />
                                  );
                                })
                              : variant.attributes.map((attr: any, ai: number) => {
                                  const attrValue = toDisplayString(attr.value);
                                  const isColor = attr.type === 'color';
                                  return (
                                    <ProductDetailsTag
                                      key={attr.id ?? ai}
                                      label={toDisplayString(attr.attribute)}
                                      value={attrValue}
                                      colorDot={isColor ? attrValue : undefined}
                                    />
                                  );
                                })}
                          </Box>
                        </Box>
                      )}

                      {normalizeVariantExistingImages(variant.images).length > 0 && (
                        <Box>
                          <Typography variant="caption" className="mb-2 block text-muted-foreground">
                            {t('form.productDetailsVariantImages')}
                          </Typography>
                          <Box className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                            {normalizeVariantExistingImages(variant.images).map((img) => (
                              <a
                                key={img.id}
                                href={img.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted/30 ring-offset-2 hover:ring-2 hover:ring-primary/30"
                              >
                                <img src={img.url} alt="" className="h-full w-full object-cover" />
                              </a>
                            ))}
                          </Box>
                        </Box>
                      )}

                      <Box>
                        <Typography variant="caption" className="mb-2 block text-muted-foreground">
                          {t('form.productDetailsVariantPriceStockTitle')}
                        </Typography>
                        <Box className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                          <ProductDetailsMetricCell label={t('form.priceLabel')}>
                            {productMoneyDisplay({
                              currencies: variant.price_currencies,
                              amount: variant.price,
                              legacyAmountPrefix: t('currencySyrianPound'),
                            })}
                          </ProductDetailsMetricCell>
                          <ProductDetailsMetricCell label={t('columns.discount')}>
                            {productMoneyDisplay({
                              currencies: variant.discount_currencies,
                              amount: variant.discount,
                              legacyAmountPrefix: t('currencySyrianPound'),
                            })}
                          </ProductDetailsMetricCell>
                          <ProductDetailsMetricCell label={t('columns.priceAfterDiscount')}>
                            {productMoneyDisplay({
                              currencies: variant.price_after_discount_currencies,
                              amount: variant.price_after_discount,
                              legacyAmountPrefix: t('currencySyrianPound'),
                            })}
                          </ProductDetailsMetricCell>
                          <ProductDetailsMetricCell label={t('form.variantQuantityLabel')}>
                            {variant.quantity ?? na}
                          </ProductDetailsMetricCell>
                        </Box>
                      </Box>

                    </ProductDetailsVariantCard>
                  ))}
                </Box>
              </ProductDetailsSection>
            )}

            {/* Edit Variant Modal */}
            {editVariant && (
              <EditVariantModal
                open={!!editVariant}
                variant={editVariant}
                isRestaurant={isRestaurant}
                categoryAttributes={categoryAttributes}
                onClose={() => setEditVariant(null)}
                onSuccess={() => refetch()}
              />
            )}

            {/* Delete Variant Confirm — lists what the delete touches before committing */}
            <VariantDeleteImpactDialog {...variantDeleteFlow.dialogProps} />

            {/* Category Details */}
            {product.category_details?.length > 0 && (
              <ProductDetailsSection
                title={t('form.productDetailsCategoryDetailsSection')}
                icon="solar:list-bold"
              >
                <ProductDetailsFieldGrid>
                  {product.category_details.map((cd: any) => (
                    <ProductDetailsField
                      key={cd.id}
                      label={cd.name}
                      value={
                        <Box className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          <span>
                            <span className="text-muted-foreground">{t('form.productDetailsLangEn')}: </span>
                            {cd.value?.en}
                          </span>
                          <span>
                            <span className="text-muted-foreground">{t('form.productDetailsLangAr')}: </span>
                            {cd.value?.ar}
                          </span>
                        </Box>
                      }
                    />
                  ))}
                </ProductDetailsFieldGrid>
              </ProductDetailsSection>
            )}

            {/* Extra Details */}
            {product.extra_details?.length > 0 && (
              <ProductDetailsSection
                title={t('form.productDetailsExtraDetailsSection')}
                icon="solar:notes-bold"
              >
                <Box className="space-y-3">
                  {product.extra_details.map((ed: any) => (
                    <Box key={ed.id} className="rounded-lg border border-border/40 bg-muted/20 p-3">
                      {ed.category?.name ? (
                        <Typography variant="caption" className="mb-2 block font-semibold text-primary">
                          {ed.category.name}
                        </Typography>
                      ) : null}
                      <Box className="grid grid-cols-2 gap-2 text-sm">
                        <Box>
                          <Typography variant="caption" className="text-muted-foreground">
                            {t('form.productDetailsKeyEn')}
                          </Typography>
                          <Typography variant="body2">{ed.key?.en}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" className="text-muted-foreground">
                            {t('form.productDetailsKeyAr')}
                          </Typography>
                          <Typography variant="body2">{ed.key?.ar}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" className="text-muted-foreground">
                            {t('form.productDetailsValueEn')}
                          </Typography>
                          <Typography variant="body2">{ed.value?.en}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" className="text-muted-foreground">
                            {t('form.productDetailsValueAr')}
                          </Typography>
                          <Typography variant="body2">{ed.value?.ar}</Typography>
                        </Box>
                        {ed.price != null || ed.price_currencies ? (
                          <Box className="col-span-2">
                            <Typography variant="caption" className="text-muted-foreground">
                              {t('form.productDetailsExtraPrice')}
                            </Typography>
                            <Typography variant="body2" component="div">
                              {productMoneyDisplay({
                                currencies: ed.price_currencies,
                                amount: ed.price,
                                legacyAmountPrefix: t('currencySyrianPound'),
                              })}
                            </Typography>
                          </Box>
                        ) : null}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </ProductDetailsSection>
            )}

            {/* Bought With */}
            {product.bought_with?.length > 0 && (
              <ProductDetailsSection
                title={t('form.productDetailsBoughtWithSection')}
                icon="solar:cart-bold"
              >
                <Box className="flex flex-wrap gap-2">
                  {product.bought_with.map((item: number | { id: number; name?: string }) => {
                    const boughtWithId =
                      typeof item === 'object' && item !== null && 'id' in item ? item.id : Number(item);
                    return (
                      <Box
                        key={boughtWithId}
                        className="rounded-md border border-border/50 bg-muted/30 px-3 py-1 text-sm"
                      >
                        {boughtWithItemLabel(item, t)}
                      </Box>
                    );
                  })}
                </Box>
              </ProductDetailsSection>
            )}
          </Box>

          <Box className="order-1 space-y-4 xl:order-2 xl:col-span-3 xl:sticky xl:top-4 xl:self-start">
            <ProductDetailsSection
              title={t('form.productDetailsSectionPricing')}
              icon="solar:tag-price-bold"
              accent="primary"
            >
              <ProductDetailsPricingPanel
                summary={
                  <ProductDetailsPricingSummary
                    afterDiscountLabel={t('columns.priceAfterDiscount')}
                    beforeDiscountLabel={t('columns.price')}
                    afterDiscount={{
                      currencies: product.price_after_discount_currencies,
                      singleFormatted: product.price_after_discount_formatted,
                      amount: product.price_after_discount,
                      legacySypPrefix: t('currencySyrianPound'),
                    }}
                    beforeDiscount={{
                      currencies: product.price_currencies,
                      singleFormatted: product.price_formatted,
                      amount: product.price,
                      legacySypPrefix: t('currencySyrianPound'),
                    }}
                  />
                }
              >
                <ProductDetailsDenseRow
                  label={t('form.productDetailsCostPrice')}
                  value={
                    <ProductDetailsDualCurrencyInline
                      input={{
                        currencies: product.cost_price_currencies,
                        singleFormatted: product.cost_price_formatted,
                        amount: product.cost_price,
                        legacySypPrefix: t('currencySyrianPound'),
                      }}
                    />
                  }
                  emptyLabel={na}
                />
                <ProductDetailsDenseRow
                  label={t('form.productDetailsDiscount')}
                  value={
                    product.discount != null
                      ? `${product.discount}${
                          String(product.discount_type ?? '').toLowerCase() === 'percentage'
                            ? '%'
                            : ''
                        }`
                      : undefined
                  }
                  emptyLabel={na}
                />
                <ProductDetailsDenseRow
                  label={t('form.productDetailsDiscountType')}
                  value={formatDiscountTypeLabel(product.discount_type, t)}
                  emptyLabel={na}
                />
                <ProductDetailsDenseRow
                  label={t('form.productDetailsCatalogQty')}
                  value={product.quantity}
                  emptyLabel={na}
                />
                <ProductDetailsDenseRow
                  label={t('form.productDetailsStock')}
                  value={product.stock != null ? String(product.stock) : undefined}
                  emptyLabel={na}
                />
                <ProductDetailsDenseRow
                  label={t('form.productDetailsMaxPurchase')}
                  value={
                    product.max_purchase_quantity != null
                      ? String(product.max_purchase_quantity)
                      : undefined
                  }
                  emptyLabel={na}
                />
                <ProductDetailsDenseRow
                  label={t('form.productDetailsUnit')}
                  value={(() => {
                    const u = product as ProductDetailData & {
                      unit?: string | null | { id?: number; name?: { en?: string; ar?: string } };
                    };
                    const raw = u.unit;
                    if (raw && typeof raw === 'object' && raw.name) {
                      return formatTranslated(raw.name as { en?: string; ar?: string });
                    }
                    if (typeof raw === 'string' && raw.trim()) return raw;
                    return undefined;
                  })()}
                  emptyLabel={na}
                />
                <ProductDetailsDenseRow
                  label={t('form.productDetailsWarranty')}
                  value={(() => {
                    const w = product.warranty;
                    if (w?.name) return formatTranslated(w.name as any);
                    return undefined;
                  })()}
                  emptyLabel={na}
                />
              </ProductDetailsPricingPanel>
            </ProductDetailsSection>

            {(product.seo_title ||
              product.seo_description ||
              product.seo_keywords ||
              product.seo_image) && (
              <ProductDetailsSection title={t('form.seoTitle')} icon="solar:globe-bold">
                <Box className="space-y-2">
                  <DetailRow
                    label={t('form.productDetailsSeoTitleEn')}
                    value={product.seo_title?.en}
                    emptyLabel={na}
                  />
                  <DetailRow
                    label={t('form.productDetailsSeoTitleAr')}
                    value={product.seo_title?.ar}
                    emptyLabel={na}
                  />
                  <DetailRow
                    label={t('form.productDetailsSeoDescEn')}
                    value={product.seo_description?.en}
                    emptyLabel={na}
                  />
                  <DetailRow
                    label={t('form.productDetailsSeoDescAr')}
                    value={product.seo_description?.ar}
                    emptyLabel={na}
                  />
                  <DetailRow
                    label={t('form.productDetailsSeoKeywordsEn')}
                    value={seoKw.en}
                    emptyLabel={na}
                  />
                  <DetailRow
                    label={t('form.productDetailsSeoKeywordsAr')}
                    value={seoKw.ar}
                    emptyLabel={na}
                  />
                  {product.seo_image ? (
                    <Box className="w-full">
                      <Typography variant="caption" className="mb-1.5 block text-muted-foreground">
                        {t('form.productDetailsSeoImage')}
                      </Typography>
                      <a
                        href={product.seo_image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-lg border border-border/60 bg-muted/20"
                      >
                        <img
                          src={product.seo_image}
                          alt={seoImageAlt}
                          className="mx-auto max-h-40 w-full object-contain"
                        />
                      </a>
                      <Typography variant="caption" className="mt-1.5 block">
                        <a
                          href={product.seo_image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {t('form.productDetailsSeoImageOpenFull')}
                        </a>
                      </Typography>
                    </Box>
                  ) : null}
                </Box>
              </ProductDetailsSection>
            )}
          </Box>
        </Box>
    </ProductDetailsPageShell>
  );
}
