import type { TFunction } from 'i18next';
import type { CurrencyData } from '@/pages/dashboard/currencies/types/currency.types';
import type { ProductFormValues } from '@/pages/dashboard/products/validation/product.validation';
import type {
  Control,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
} from 'react-hook-form';

import React from 'react';
import { queryKeys } from '@/api/queryKeys';
import { Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Iconify } from '@/shared/components/iconify';
import { _ColorApi } from '@/pages/dashboard/colors/api/color.services';

import { Box, Button, Typography } from 'src/shared/ui';

import { VariantImagesField } from './VariantImagesField';
import { toOptionalDiscount } from './variant-field-helpers';
import {
  generateVariantSku,
  priceAfterDiscount,
  attributeValueLabel,
  buildColorsHexLookup,
  type ColorsHexLookup,
  type CategoryAttributeValueRef,
  resolveCategoryAttributeValueHex,
} from '../utils/variant-combinations';

// ----------------------------------------------------------------------

const cellInputCls =
  'w-full min-w-[3.5rem] px-1.5 py-1 text-xs border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

function fieldInputClass(error?: boolean) {
  return error ? `${cellInputCls} border-destructive` : cellInputCls;
}

function optionalNumberInputDisplay(v: unknown): string | number {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '';
  return n;
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

function parseCurrencyRate(c: CurrencyData): number {
  const r = Number((c as { exchange_rate?: string | number }).exchange_rate);
  return r > 0 ? r : 1;
}

function usdToLocalAmount(usd: number, rate: number): number {
  return Math.round(usd * rate);
}

function localAmountToUsd(local: number, rate: number): number {
  return Math.round((local / rate) * 100) / 100;
}

function formatLiveAfterDiscountPreview(
  priceUsd: number | null | undefined,
  discountType: string | null | undefined,
  discount: number | null | undefined,
  sypRate: number | null | undefined
): string {
  const usd = Number(priceUsd);
  if (!Number.isFinite(usd) || (usd === 0 && (priceUsd == null || priceUsd === undefined))) {
    return '';
  }
  const afterUsd = priceAfterDiscount(usd, discountType, discount);
  const parts: string[] = [`$${afterUsd}`];
  if (sypRate != null && sypRate > 0) {
    parts.push(`${usdToLocalAmount(afterUsd, sypRate)} SYP`);
  }
  return parts.join(' · ');
}

function discountLabel(
  discountType: string | null | undefined,
  discount: number | null | undefined,
  t: TFunction
): string {
  const d = Number(discount);
  if (!discountType || discountType === 'none' || !Number.isFinite(d) || d <= 0) {
    return '—';
  }
  if (discountType === 'percentage') return `${d}%`;
  if (discountType === 'fixed') return `$${d}`;
  return String(d);
}

type VariantRowProps = {
  variantIndex: number;
  variantFieldId: string;
  control: Control<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  valueRefs: CategoryAttributeValueRef[];
  productDualPriceReady: boolean;
  sypCurrency?: CurrencyData;
  sypRate: number | null;
  watchedProductSku: string;
  restaurantMode: boolean;
  isEditMode: boolean;
  productId?: string;
  productResponse?: { variants?: Array<{ id: number; images?: Array<{ id: number; url: string }> }> };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onSave: () => void | Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
  detailColSpan: number;
  colorsHexLookup: ColorsHexLookup;
  t: TFunction;
};

function VariantTableRow({
  variantIndex,
  variantFieldId,
  control,
  watch,
  setValue,
  errors,
  valueRefs,
  productDualPriceReady,
  sypCurrency,
  sypRate,
  watchedProductSku,
  restaurantMode,
  isEditMode,
  productId: _productId,
  productResponse: _productResponse,
  isExpanded,
  onToggleExpand,
  onRemove,
  onSave,
  isSaving,
  isDeleting,
  detailColSpan,
  colorsHexLookup,
  t,
}: VariantRowProps) {
  const variantRowErrors = errors.variants?.[variantIndex];
  const discountType = watch(`variants.${variantIndex}.discount_type`) ?? 'none';
  const priceVal = watch(`variants.${variantIndex}.price`);
  const discountVal = watch(`variants.${variantIndex}.discount`);

  return (
    <>
      <tr className="border-b border-border/60 hover:bg-muted/20">
        <td className="px-2 py-1.5 align-middle">
          <Box className="flex flex-wrap gap-0.5 max-w-[8rem]">
            {valueRefs.length > 0 ? (
              valueRefs.map((val) => {
                const valHex = resolveCategoryAttributeValueHex(val, colorsHexLookup);
                return (
                <span
                  key={val.id}
                  className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/30 px-1 py-0.5 text-[10px]"
                >
                  {valHex ? (
                    <span
                      className="inline-block h-2 w-2 rounded-full border border-border/50"
                      style={{ backgroundColor: valHex }}
                    />
                  ) : null}
                  {attributeValueLabel(val.name) || val.id}
                </span>
                );
              })
            ) : (
              <span className="text-[10px] text-muted-foreground">—</span>
            )}
          </Box>
        </td>
        <td className="px-2 py-1.5 align-middle min-w-[7rem]">
          <Box className="flex items-center gap-0.5">
            <Controller
              name={`variants.${variantIndex}.sku`}
              control={control}
              render={({ field, fieldState: { error } }) => (
                <input
                  {...field}
                  value={field.value ?? ''}
                  type="text"
                  placeholder={t('form.variantSkuPlaceholder')}
                  className={fieldInputClass(!!error)}
                />
              )}
            />
            <button
              type="button"
              className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
              title={t('form.regenerateSku')}
              onClick={() =>
                setValue(
                  `variants.${variantIndex}.sku`,
                  generateVariantSku(watchedProductSku, valueRefs),
                  { shouldDirty: true }
                )
              }
            >
              <Iconify icon="solar:refresh-bold" width={14} />
            </button>
          </Box>
        </td>
        {productDualPriceReady ? (
          <>
            <td className="px-2 py-1.5 align-middle">
              <Controller
                name={`variants.${variantIndex}.price`}
                control={control}
                render={({ field: f, fieldState: { error } }) => (
                  <input
                    type="number"
                    placeholder="0"
                    step="any"
                    min={0}
                    name={f.name}
                    ref={f.ref}
                    onBlur={f.onBlur}
                    value={optionalNumberInputDisplay(f.value)}
                    onChange={(e) => {
                      const next = toTwoDecimalNumber(e.target.value);
                      f.onChange(next);
                      if (sypCurrency) {
                        setValue(
                          `variants.${variantIndex}.price_syp`,
                          next == null
                            ? (undefined as unknown as number)
                            : usdToLocalAmount(next, parseCurrencyRate(sypCurrency)),
                          { shouldDirty: true }
                        );
                      }
                    }}
                    className={fieldInputClass(!!error)}
                  />
                )}
              />
            </td>
            <td className="px-2 py-1.5 align-middle">
              <Controller
                name={`variants.${variantIndex}.price_syp`}
                control={control}
                render={({ field: f, fieldState: { error } }) => (
                  <input
                    type="number"
                    placeholder="0"
                    step="any"
                    min={0}
                    name={f.name}
                    ref={f.ref}
                    onBlur={f.onBlur}
                    value={optionalNumberInputDisplay(f.value)}
                    onChange={(e) => {
                      const next = toTwoDecimalNumber(e.target.value);
                      f.onChange(next);
                      if (sypCurrency) {
                        setValue(
                          `variants.${variantIndex}.price`,
                          next == null
                            ? (undefined as unknown as number)
                            : localAmountToUsd(next, parseCurrencyRate(sypCurrency)),
                          { shouldValidate: true, shouldDirty: true }
                        );
                      }
                    }}
                    className={fieldInputClass(!!error)}
                  />
                )}
              />
            </td>
          </>
        ) : (
          <td className="px-2 py-1.5 align-middle">
            <Controller
              name={`variants.${variantIndex}.price`}
              control={control}
              render={({ field: f, fieldState: { error } }) => (
                <input
                  type="number"
                  placeholder="0"
                  step="0.01"
                  min={0}
                  name={f.name}
                  ref={f.ref}
                  onBlur={f.onBlur}
                  value={optionalNumberInputDisplay(f.value)}
                  onChange={(e) => f.onChange(toTwoDecimalNumber(e.target.value))}
                  className={fieldInputClass(!!error)}
                />
              )}
            />
          </td>
        )}
        <td className="px-2 py-1.5 align-middle text-xs text-muted-foreground whitespace-nowrap">
          {discountLabel(discountType, discountVal, t)}
        </td>
        <td className="px-2 py-1.5 align-middle text-xs whitespace-nowrap">
          {priceVal != null
            ? formatLiveAfterDiscountPreview(priceVal, discountType, discountVal, sypRate)
            : '—'}
        </td>
        <td className="px-2 py-1.5 align-middle">
          <Controller
            name={`variants.${variantIndex}.quantity`}
            control={control}
            render={({ field: f, fieldState: { error } }) => (
              <input
                type="number"
                placeholder=""
                step={1}
                min={0}
                name={f.name}
                ref={f.ref}
                onBlur={f.onBlur}
                value={optionalNumberInputDisplay(f.value)}
                onChange={(e) => {
                  const raw = e.target.value;
                  f.onChange(raw === '' ? (undefined as unknown as number) : toOptionalInt(raw));
                }}
                className={fieldInputClass(!!error)}
              />
            )}
          />
        </td>
        {!restaurantMode ? (
          <td className="px-2 py-1.5 align-middle min-w-[6rem]">
            <Controller
              name={`variants.${variantIndex}.barcode`}
              control={control}
              render={({ field, fieldState: { error } }) => (
                <input
                  {...field}
                  value={field.value ?? ''}
                  type="text"
                  placeholder={t('form.variantBarcodePlaceholder')}
                  className={fieldInputClass(!!error)}
                />
              )}
            />
          </td>
        ) : null}
        <td className="px-2 py-1.5 align-middle whitespace-nowrap">
          <Box className="flex items-center gap-0.5">
            <button
              type="button"
              className={`p-1 rounded ${isExpanded ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
              title={t('form.variantExpandDetails')}
              onClick={onToggleExpand}
            >
              <Iconify icon={isExpanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} width={16} />
            </button>
            <button
              type="button"
              className="p-1 text-destructive hover:bg-destructive/10 rounded disabled:opacity-50"
              disabled={isDeleting}
              onClick={onRemove}
            >
              <Iconify icon="solar:trash-bin-bold" width={16} />
            </button>
          </Box>
        </td>
      </tr>
      {isExpanded ? (
        <tr className="border-b border-border/60 bg-muted/10">
          <td colSpan={detailColSpan} className="px-3 py-3">
            <Box className="space-y-3">
              <Box className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                <Box>
                  <Typography variant="caption" className="text-muted-foreground mb-0.5 block text-[11px]">
                    {t('form.productDiscountType')}
                  </Typography>
                  <Controller
                    name={`variants.${variantIndex}.discount_type`}
                    control={control}
                    render={({ field: f }) => (
                      <select
                        className={cellInputCls}
                        value={f.value ?? 'none'}
                        onChange={(e) => {
                          const next = e.target.value;
                          f.onChange(next);
                          if (next === 'none') {
                            setValue(
                              `variants.${variantIndex}.discount`,
                              undefined as unknown as number,
                              { shouldDirty: true }
                            );
                            return;
                          }
                          if (next === 'percentage') {
                            const current = Number(watch(`variants.${variantIndex}.discount`));
                            if (Number.isFinite(current) && current > 100) {
                              setValue(`variants.${variantIndex}.discount`, 100, {
                                shouldDirty: true,
                              });
                            }
                          }
                        }}
                        onBlur={f.onBlur}
                        name={f.name}
                        ref={f.ref}
                      >
                        <option value="none">{t('form.discountTypeNone')}</option>
                        <option value="percentage">{t('form.discountTypePercentage')}</option>
                        <option value="fixed">{t('form.discountTypeFixed')}</option>
                      </select>
                    )}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground mb-0.5 block text-[11px]">
                    {t('form.productDiscountValue')}
                  </Typography>
                  <Controller
                    name={`variants.${variantIndex}.discount`}
                    control={control}
                    render={({ field: f }) => (
                      <input
                        type="number"
                        min={0}
                        max={discountType === 'percentage' ? 100 : undefined}
                        step="any"
                        disabled={discountType === 'none'}
                        name={f.name}
                        ref={f.ref}
                        onBlur={f.onBlur}
                        value={optionalNumberInputDisplay(f.value)}
                        onChange={(e) =>
                          f.onChange(toOptionalDiscount(e.target.value, discountType))
                        }
                        className={cellInputCls}
                      />
                    )}
                  />
                </Box>
                <Box className="flex flex-wrap items-end gap-3 col-span-2">
                  <Controller
                    name={`variants.${variantIndex}.is_trend`}
                    control={control}
                    render={({ field: f }) => (
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary"
                          checked={Number(f.value) === 1}
                          onChange={(e) => f.onChange(e.target.checked ? 1 : 0)}
                          onBlur={f.onBlur}
                          name={f.name}
                          ref={f.ref}
                        />
                        <Typography variant="caption">{t('form.variantIsTrend')}</Typography>
                      </label>
                    )}
                  />
                  <Controller
                    name={`variants.${variantIndex}.is_active`}
                    control={control}
                    render={({ field: f }) => (
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary"
                          checked={Number(f.value ?? 1) === 1}
                          onChange={(e) => f.onChange(e.target.checked ? 1 : 0)}
                          onBlur={f.onBlur}
                          name={f.name}
                          ref={f.ref}
                        />
                        <Typography variant="caption">{t('form.variantIsActive')}</Typography>
                      </label>
                    )}
                  />
                </Box>
                {isEditMode ? (
                  <Box className="flex items-end">
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      disabled={isSaving}
                      onClick={() => void onSave()}
                    >
                      <Iconify icon="solar:diskette-bold" width={14} className="mr-1" />
                      {watch(`variants.${variantIndex}.id`) ? t('form.saveVariant') : t('form.createVariant')}
                    </Button>
                  </Box>
                ) : null}
              </Box>

              <VariantImagesField
                variantIndex={variantIndex}
                variantFieldId={variantFieldId}
                control={control}
                watch={watch}
                setValue={setValue}
                t={t}
                compact
              />

              {variantRowErrors ? (
                <Typography variant="caption" className="text-destructive">
                  {Object.values(variantRowErrors)
                    .map((e) =>
                      typeof e === 'object' && e && 'message' in e ? String(e.message) : ''
                    )
                    .filter(Boolean)
                    .join(' · ')}
                </Typography>
              ) : null}
            </Box>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export type ProductVariantsCompactTableProps = Omit<
  VariantRowProps,
  | 'isExpanded'
  | 'onToggleExpand'
  | 'detailColSpan'
  | 'valueRefs'
  | 'variantFieldId'
  | 'variantIndex'
  | 'onRemove'
  | 'onSave'
  | 'isSaving'
  | 'colorsHexLookup'
> & {
  variants: Array<{ id: string }>;
  categoryAttributes: Array<{ id?: number; values?: CategoryAttributeValueRef[] }>;
  resolveValueRefs: (valueIds: number[]) => CategoryAttributeValueRef[];
  onRemove: (variantIndex: number) => void;
  onSave: (variantIndex: number) => void | Promise<void>;
  isSavingIndex?: number | null;
  updatePending?: boolean;
};

export function ProductVariantsCompactTable({
  variants,
  categoryAttributes: _categoryAttributes,
  resolveValueRefs,
  productDualPriceReady,
  restaurantMode,
  onRemove,
  onSave,
  isSavingIndex = null,
  updatePending = false,
  ...rowProps
}: ProductVariantsCompactTableProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const { data: colorsResp } = useQuery({
    queryKey: queryKeys.color.list({ per_page: 500, is_active: true, picker: 'variant-table' }),
    queryFn: () => _ColorApi.getListColors({ page: 1, per_page: 500, is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const colorsHexLookup = React.useMemo(
    () => buildColorsHexLookup(colorsResp?.data?.items ?? []),
    [colorsResp?.data?.items]
  );

  const detailColSpan =
    1 + // attributes
    1 + // sku
    (productDualPriceReady ? 2 : 1) + // price
    1 + // discount summary
    1 + // after discount
    1 + // qty
    (restaurantMode ? 0 : 1) + // barcode
    1; // actions

  return (
    <Box className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left">
            <th className="px-2 py-2 text-xs font-medium text-muted-foreground">
              {rowProps.t('form.variantsTableAttributes')}
            </th>
            <th className="px-2 py-2 text-xs font-medium text-muted-foreground">
              {rowProps.t('form.variantsTableSku')}
            </th>
            <th className="px-2 py-2 text-xs font-medium text-muted-foreground">
              {rowProps.t('form.variantsTablePriceUsd')}
            </th>
            {productDualPriceReady ? (
              <th className="px-2 py-2 text-xs font-medium text-muted-foreground">
                {rowProps.t('form.variantsTablePriceSyp')}
              </th>
            ) : null}
            <th className="px-2 py-2 text-xs font-medium text-muted-foreground">
              {rowProps.t('form.variantsTableDiscount')}
            </th>
            <th className="px-2 py-2 text-xs font-medium text-muted-foreground">
              {rowProps.t('form.variantsTablePriceAfterDiscount')}
            </th>
            <th className="px-2 py-2 text-xs font-medium text-muted-foreground">
              {rowProps.t('form.variantsTableQuantity')}
            </th>
            {!restaurantMode ? (
              <th className="px-2 py-2 text-xs font-medium text-muted-foreground">
                {rowProps.t('form.variantBarcode')}
              </th>
            ) : null}
            <th className="px-2 py-2 text-xs font-medium text-muted-foreground w-16" />
          </tr>
        </thead>
        <tbody>
          {variants.map((variant, variantIndex) => {
            const rowSelectedIds = (rowProps.watch(`variants.${variantIndex}.attributes_values_ids`) ||
              []) as number[];
            const valueRefs = resolveValueRefs(rowSelectedIds);
            return (
              <VariantTableRow
                key={variant.id}
                variantIndex={variantIndex}
                variantFieldId={variant.id}
                valueRefs={valueRefs}
                productDualPriceReady={productDualPriceReady}
                restaurantMode={restaurantMode}
                isExpanded={openIndex === variantIndex}
                onToggleExpand={() =>
                  setOpenIndex((prev) => (prev === variantIndex ? null : variantIndex))
                }
                detailColSpan={detailColSpan}
                colorsHexLookup={colorsHexLookup}
                onRemove={() => onRemove(variantIndex)}
                onSave={() => onSave(variantIndex)}
                isSaving={isSavingIndex === variantIndex || updatePending}
                {...rowProps}
              />
            );
          })}
        </tbody>
      </table>
    </Box>
  );
}
