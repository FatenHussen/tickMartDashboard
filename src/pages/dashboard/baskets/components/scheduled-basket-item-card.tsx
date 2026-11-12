import type { TFunction } from 'i18next';
import type { Control } from 'react-hook-form';
import type { ScheduledBasketItem } from '@/pages/dashboard/baskets/types/scheduled-basket.types';
import type { ScheduledBasketFormValues } from '@/pages/dashboard/baskets/validation/scheduled-basket.validation';

import { Button } from '@/shared/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { Iconify } from '@/shared/components/iconify';
import { MultiSelect } from '@/shared/ui/multi-select';
import { useWatch, Controller } from 'react-hook-form';
import { formatTranslated } from '@/utils/format-translated';
import { _ShopApi } from '@/pages/dashboard/vendor/api/shop.services';
import { _BrandApi } from '@/pages/dashboard/products/api/brand.services';
import { InfiniteScrollSelect } from '@/shared/components/infinite-scroll-select';
import { _ShopProductVariantApi } from '@/shared/api/shop-product-variant.services';
import { resolveStorageImageUrl, shopVariantOptionImage, shopVariantOptionColorHex } from '@/utils/shop-variant-image';

import { Box, Switch, Typography } from 'src/shared/ui';
import { RHFTextField } from 'src/shared/components/hook-form/rhf-text-field';

// ----------------------------------------------------------------------

export function emptyScheduledBasketLineItem() {
  return {
    shop_product_variant_id: 0,
    quantity: 1,
    shop_product_variant_ids: [] as number[],
    is_required: false,
    is_extra: false,
    min_quantity: undefined as number | undefined,
    max_quantity: undefined as number | undefined,
  };
}

function brandFetcher(page: number, limit: number) {
  return _BrandApi.getListBrands({ page, per_page: limit }).then((r) => ({
    data: {
      items: r.data.items.map((b) => ({
        id: b.id,
        label: formatTranslated(b.name as Parameters<typeof formatTranslated>[0]),
      })),
      pagination: r.data.pagination,
    },
  }));
}

function shopFetcher(page: number, limit: number) {
  return _ShopApi.getListShop({ page, per_page: limit }).then((r) => ({
    data: {
      items: r.data.items.map((s) => ({
        id: s.id,
        label: formatTranslated(s.name as Parameters<typeof formatTranslated>[0]),
      })),
      pagination: r.data.pagination,
    },
  }));
}

function variantListParams(opts: {
  page: number;
  perPage: number;
  categoryIds: number[];
  brandId?: number;
  shopId?: number;
  search?: string;
  priceMin?: string;
  priceMax?: string;
}) {
  const params: Parameters<typeof _ShopProductVariantApi.getList>[0] = {
    page: opts.page,
    per_page: opts.perPage,
    include_pricing_in_label: false,
  };
  if (opts.categoryIds.length === 1) params.category_id = opts.categoryIds[0];
  if (opts.categoryIds.length > 1) params.category_ids = opts.categoryIds;
  if (opts.brandId) params.brand_id = opts.brandId;
  if (opts.shopId) params.shop_id = opts.shopId;
  if (opts.search?.trim()) params.search = opts.search.trim();
  const min = Number(opts.priceMin);
  const max = Number(opts.priceMax);
  if (opts.priceMin !== undefined && opts.priceMin !== '' && Number.isFinite(min)) {
    params.price_min = min;
  }
  if (opts.priceMax !== undefined && opts.priceMax !== '' && Number.isFinite(max)) {
    params.price_max = max;
  }
  return params;
}

export function scheduledBasketLineVariantInitialLabel(
  row: ScheduledBasketItem | undefined
): string | undefined {
  if (!row) return undefined;
  if (typeof row.product?.name === 'string' || row.product?.name) {
    const productName =
      row.product?.name != null
        ? typeof row.product.name === 'string'
          ? row.product.name
          : formatTranslated(row.product.name as Parameters<typeof formatTranslated>[0])
        : '';
    const variantStr = Array.isArray(row.variant)
      ? row.variant.map((value) => String(value)).filter(Boolean).join(' · ')
      : '';
    const parts = [productName, variantStr].filter(Boolean);
    if (parts.length) return parts.join(' — ');
  }
  const spvid = row.shop_product_variant_id;
  if (spvid != null && Number(spvid) > 0) return `#${spvid}`;
  return undefined;
}

type Props = {
  index: number;
  control: Control<ScheduledBasketFormValues>;
  categoryIds: number[];
  lineFromApi?: ScheduledBasketItem;
  canRemove: boolean;
  onRemove: () => void;
  t: TFunction<'table'>;
};

export function ScheduledBasketItemCard({
  index,
  control,
  categoryIds,
  lineFromApi,
  canRemove,
  onRemove,
  t,
}: Props) {
  const [brandId, setBrandId] = useState(0);
  const [shopId, setShopId] = useState(0);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [altSearch, setAltSearch] = useState('');
  const [debouncedAltSearch, setDebouncedAltSearch] = useState('');
  const hasCategory = categoryIds.length > 0;
  const primaryId = Number(useWatch({ control, name: `items.${index}.shop_product_variant_id` })) || 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedAltSearch(altSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [altSearch]);

  const filterKey = [
    categoryIds.join(','),
    brandId || '',
    shopId || '',
    priceMin,
    priceMax,
  ].join('|');

  const { data: altListResponse } = useQuery({
    queryKey: ['shopProductVariant', 'scheduled-basket', 'alts', index, filterKey, debouncedAltSearch],
    queryFn: () =>
      _ShopProductVariantApi.getList(
        variantListParams({
          page: 1,
          perPage: 50,
          categoryIds,
          brandId: brandId || undefined,
          shopId: shopId || undefined,
          search: debouncedAltSearch,
          priceMin,
          priceMax,
        })
      ),
    enabled: hasCategory,
  });

  const shopVariantMultiOptions = useMemo(() => {
    const items = altListResponse?.data?.items ?? [];
    return items.map((v) => ({
      value: v.id,
      label: typeof v.label === 'string' ? v.label : formatTranslated(v.label as Parameters<typeof formatTranslated>[0]),
      imageUrl: shopVariantOptionImage(v),
      colorHex: shopVariantOptionColorHex(v),
    }));
  }, [altListResponse?.data?.items]);

  const fetchVariants = (page: number, limit: number, search?: string) => {
    if (!hasCategory) {
      return Promise.resolve({
        data: {
          items: [],
          pagination: { current_page: page, last_page: page, per_page: limit, total: 0 },
        },
      });
    }
    return _ShopProductVariantApi.getList(
      variantListParams({
        page,
        perPage: limit,
        categoryIds,
        brandId: brandId || undefined,
        shopId: shopId || undefined,
        search,
        priceMin,
        priceMax,
      })
    );
  };

  return (
    <Box className="rounded-xl border border-border/40 bg-background/60 overflow-hidden">
      <Box className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/30">
        <Typography variant="subtitle2" className="font-semibold text-foreground">
          {t('form.scheduledBasketItemHeading', { number: index + 1 })}
        </Typography>
        {canRemove && (
          <Button type="button" variant="text" onClick={onRemove} className="text-destructive">
            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
          </Button>
        )}
      </Box>
      <Box className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Box className="md:col-span-2">
          <Typography variant="caption" className="mb-2 block text-muted-foreground">
            {t('form.shopProductVariantHelper')}
          </Typography>
          <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <Box>
              <Typography variant="caption" className="mb-1 text-muted-foreground">
                {t('form.brand')}
              </Typography>
              <InfiniteScrollSelect
                value={brandId}
                onChange={setBrandId}
                queryKey={['brands', 'infinite', 'scheduled-basket-item', index]}
                fetcher={brandFetcher}
                placeholder={t('form.selectBrandPlaceholder')}
                clearable
                disabled={!hasCategory}
              />
            </Box>
            <Box>
              <Typography variant="caption" className="mb-1 text-muted-foreground">
                {t('columns.shop')}
              </Typography>
              <InfiniteScrollSelect
                value={shopId}
                onChange={setShopId}
                queryKey={['shops', 'infinite', 'scheduled-basket-item', index]}
                fetcher={shopFetcher}
                placeholder={t('form.selectShop')}
                clearable
                disabled={!hasCategory}
              />
            </Box>
            <Box>
              <Typography variant="caption" className="mb-1 text-muted-foreground">
                {t('form.pageSectionFilterKeys.price_min')}
              </Typography>
              <input
                type="number"
                min={0}
                value={priceMin}
                disabled={!hasCategory}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-full h-10 rounded-xl border border-border/70 bg-background/30 px-3 text-sm disabled:opacity-60"
              />
            </Box>
            <Box>
              <Typography variant="caption" className="mb-1 text-muted-foreground">
                {t('form.pageSectionFilterKeys.price_max')}
              </Typography>
              <input
                type="number"
                min={0}
                value={priceMax}
                disabled={!hasCategory}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-full h-10 rounded-xl border border-border/70 bg-background/30 px-3 text-sm disabled:opacity-60"
              />
            </Box>
          </Box>
        </Box>

        <Box className="md:col-span-2">
          <Typography variant="caption" className="mb-1 text-muted-foreground">
            {t('form.primaryVariant')}
          </Typography>
          <Controller
            name={`items.${index}.shop_product_variant_id`}
            control={control}
            render={({ field: f, fieldState: { error } }) => (
              <>
              <InfiniteScrollSelect
                value={Number(f.value) || 0}
                onChange={(variantId) => f.onChange(Number(variantId) || 0)}
                queryKey={['shopProductVariant', 'scheduled-basket', 'line', index, filterKey]}
                fetcher={fetchVariants}
                placeholder={t('form.variantId')}
                initialLabel={scheduledBasketLineVariantInitialLabel(lineFromApi)}
                initialImage={resolveStorageImageUrl(lineFromApi?.variant_image ?? lineFromApi?.product?.image)}
                getOptionImage={(item) => shopVariantOptionImage(item)}
                getOptionColorHex={(item) => shopVariantOptionColorHex(item)}
                disabled={!hasCategory}
                serverSearch
                pageSize={50}
              />
              {error?.message && (
                <Typography variant="caption" className="text-destructive mt-1 block" role="alert">
                  {error.message}
                </Typography>
              )}
              </>
            )}
          />
        </Box>

        <Box className="grid grid-cols-3 gap-3 md:col-span-2">
          <Box>
            <Typography variant="caption" className="mb-1 text-muted-foreground">
              {t('form.quantity')}
            </Typography>
            <RHFTextField name={`items.${index}.quantity`} placeholder={t('form.placeholderOne')} type="number" fullWidth />
          </Box>
          <Box>
            <Typography variant="caption" className="mb-1 text-muted-foreground">
              {t('form.minQuantity')}
            </Typography>
            <RHFTextField name={`items.${index}.min_quantity`} placeholder={t('form.optional')} type="number" fullWidth />
          </Box>
          <Box>
            <Typography variant="caption" className="mb-1 text-muted-foreground">
              {t('form.maxQuantity')}
            </Typography>
            <RHFTextField name={`items.${index}.max_quantity`} placeholder={t('form.optional')} type="number" fullWidth />
          </Box>
        </Box>

        <Box className="md:col-span-2">
          <Typography variant="caption" className="mb-1 text-muted-foreground">
            {t('form.productAlternatives')}
          </Typography>
          <input
            type="search"
            value={altSearch}
            disabled={!hasCategory}
            onChange={(e) => setAltSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="mb-2 w-full h-9 rounded-xl border border-border/70 bg-background/30 px-3 text-sm disabled:opacity-60"
          />
          <Controller
            name={`items.${index}.shop_product_variant_ids`}
            control={control}
            render={({ field: f }) => {
              const ids = Array.isArray(f.value)
                ? f.value.filter((id) => Number(id) > 0 && Number(id) !== primaryId).map(Number)
                : [];
              const extraOpts = ids
                .filter((v) => !shopVariantMultiOptions.some((o) => Number(o.value) === v))
                .map((v) => ({ value: v, label: `#${v}` }));
              const options = [...extraOpts, ...shopVariantMultiOptions].filter(
                (o) => Number(o.value) !== primaryId
              );
              return (
                <MultiSelect
                  options={options}
                  value={ids}
                  onChange={(vals) =>
                    f.onChange(
                      (vals as (string | number)[])
                        .map((x) => Number(x))
                        .filter((id) => id > 0 && id !== primaryId)
                    )
                  }
                  placeholder={t('form.productAlternativesPlaceholder')}
                  noOptionsMessage={t('noOptionsFound')}
                  fullWidth
                  isDisabled={!hasCategory}
                  showOptionImages
                />
              );
            }}
          />
        </Box>

        <Box className="md:col-span-2 flex flex-wrap gap-4">
          <Controller
            name={`items.${index}.is_required`}
            control={control}
            render={({ field: f }) => (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 flex-1 min-w-[140px]">
                <Switch checked={f.value} onChange={(e) => f.onChange((e.target as HTMLInputElement).checked)} />
                <Typography variant="body2">{t('form.isRequired')}</Typography>
              </div>
            )}
          />
          <Controller
            name={`items.${index}.is_extra`}
            control={control}
            render={({ field: f }) => (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 flex-1 min-w-[140px]">
                <Switch checked={f.value} onChange={(e) => f.onChange((e.target as HTMLInputElement).checked)} />
                <Typography variant="body2">{t('form.isExtra')}</Typography>
              </div>
            )}
          />
        </Box>
      </Box>
    </Box>
  );
}
