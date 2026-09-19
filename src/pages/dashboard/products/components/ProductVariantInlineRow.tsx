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
import { Controller } from 'react-hook-form';
import { Iconify } from '@/shared/components/iconify';
import { formatTranslated } from '@/utils/format-translated';

import { Box, Button, Typography } from 'src/shared/ui';

import { VariantImagesField } from './VariantImagesField';
import { ProductPricingFields } from './ProductPricingFields';
import { VariantAttributeSelects } from './VariantAttributeSelects';
import {
  VariantStatusBadge,
  VariantAttributeChain,
} from './variant-field-ui';
import {
  sortedComboKey,
  regenerateVariantSku,
  type ColorsHexLookup,
  type VariantAttributeRow,
  type CategoryAttributeValueRef,
  type CategoryAttributePickerRow,
} from '../utils/variant-combinations';

export type ProductVariantInlineRowProps = {
  variantIndex: number;
  variantFieldId: string;
  control: Control<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  valueRefs: CategoryAttributeValueRef[];
  categoryAttributes: CategoryAttributePickerRow[];
  variantAttributes?: VariantAttributeRow[] | null;
  colorsHexLookup: ColorsHexLookup;
  productDualPriceReady: boolean;
  usdCurrency?: CurrencyData;
  sypCurrency?: CurrencyData;
  sypRate: number | null;
  watchedProductSku: string;
  restaurantMode: boolean;
  isEditMode: boolean;
  productId?: string;
  productResponse?: { variants?: Array<{ id: number; images?: Array<{ id: number; url: string }> }> };
  onRemove: () => void;
  onSave: () => void | Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  t: TFunction;
};

export function ProductVariantInlineRow({
  variantIndex,
  variantFieldId,
  control,
  watch,
  setValue,
  errors,
  valueRefs,
  categoryAttributes,
  variantAttributes,
  colorsHexLookup,
  productDualPriceReady,
  usdCurrency: _usdCurrency,
  sypCurrency,
  sypRate,
  watchedProductSku,
  restaurantMode,
  isEditMode,
  productId: _productId,
  productResponse: _productResponse,
  onRemove,
  onSave,
  isSaving,
  isDeleting,
  isExpanded,
  onToggle,
  t,
}: ProductVariantInlineRowProps) {
  const variantRowErrors = errors.variants?.[variantIndex];
  const variantId = watch(`variants.${variantIndex}.id`);
  const isActive = Number(watch(`variants.${variantIndex}.is_active`) ?? 1) === 1;
  const selectedIds = (watch(`variants.${variantIndex}.attributes_values_ids`) ?? []) as number[];
  const existingComboKeys = new Set(
    (watch('variants') ?? []).flatMap((row, index) => {
      if (index === variantIndex) return [];
      const ids = (row?.attributes_values_ids ?? []).map(Number).filter((n) => n > 0);
      return ids.length > 0 ? [sortedComboKey(ids)] : [];
    })
  );
  return (
    <Box className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <Box
        className={`flex flex-wrap items-center justify-between gap-3 bg-muted/15 px-5 py-3 ${
          isExpanded ? 'border-b border-border/40' : ''
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-start"
          aria-expanded={isExpanded}
        >
          <Iconify
            icon={isExpanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
            width={18}
            className="shrink-0 text-muted-foreground"
          />
          <Box className="min-w-0 flex-1">
            {valueRefs.length > 0 ? (
              <VariantAttributeChain valueRefs={valueRefs} />
            ) : (
              <Typography variant="body2" className="font-medium text-foreground">
                {t('form.variantOption', { n: variantIndex + 1 })}
              </Typography>
            )}
          </Box>
        </button>
        <Box className="flex items-center gap-2 shrink-0">
          <VariantStatusBadge
            active={isActive}
            activeLabel={t('form.variantStatusAvailable')}
            inactiveLabel={t('form.variantStatusInactive')}
          />
          <Button
            type="button"
            variant="text"
            size="small"
            className="h-8 w-8 min-w-0 p-0 text-destructive hover:bg-destructive/10"
            disabled={isDeleting}
            onClick={onRemove}
            title={t('form.remove')}
          >
            <Iconify icon="solar:trash-bin-bold" width={18} />
          </Button>
        </Box>
      </Box>

      {isExpanded ? (
        <>
      <Box className="space-y-4 p-5">
        {categoryAttributes.length > 0 ? (
          <Box className="space-y-2">
            <VariantAttributeSelects
              categoryAttributes={categoryAttributes}
              selectedIds={selectedIds}
              variantAttributes={variantAttributes}
              existingComboKeys={existingComboKeys}
              formatAttributeLabel={(name) =>
                formatTranslated(name as Parameters<typeof formatTranslated>[0], '')
              }
              t={t}
              onChange={(nextIds) =>
                setValue(`variants.${variantIndex}.attributes_values_ids`, nextIds, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </Box>
        ) : null}
        <Box className="space-y-3">
          <ProductPricingFields
            prefix={`variants.${variantIndex}`}
            control={control}
            watch={watch}
            setValue={setValue}
            title={t('form.variantBasicInfoSectionTitle')}
            usdLabel={t('form.variantPriceUsdLabel')}
            sypLabel={t('form.variantPriceSypLabel')}
            skuLabel={t('form.variantSku')}
            productDualPriceReady={productDualPriceReady}
            sypCurrency={sypCurrency}
            sypRate={sypRate}
            hideBarcode={restaurantMode}
            englishSkuOnly
            skuAction="regenerate"
            onSkuAction={() =>
              setValue(
                `variants.${variantIndex}.sku`,
                regenerateVariantSku(watchedProductSku, valueRefs, colorsHexLookup),
                { shouldDirty: true }
              )
            }
            t={t}
          />
        </Box>

        <VariantImagesField
          variantIndex={variantIndex}
          variantFieldId={variantFieldId}
          control={control}
          watch={watch}
          setValue={setValue}
          t={t}
        />

        <Box className="flex flex-wrap items-center gap-4 pt-1">
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
              <Typography variant="caption" className="text-foreground">
                {t('form.variantIsTrend')}
              </Typography>
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
              <Typography variant="caption" className="text-foreground">
                {t('form.variantIsActive')}
              </Typography>
            </label>
          )}
        />
        </Box>
      </Box>

      {variantRowErrors ? (
        <Typography variant="caption" className="text-destructive px-5 pb-3">
          {Object.values(variantRowErrors)
            .map((e) => (typeof e === 'object' && e && 'message' in e ? String(e.message) : ''))
            .filter(Boolean)
            .join(' · ')}
        </Typography>
      ) : null}

      <Box className="flex flex-wrap items-center justify-end gap-2 border-t border-border/40 bg-muted/15 px-5 py-3.5">
        {isEditMode && !variantId ? (
          <Button type="button" variant="outlined" size="medium" disabled={isDeleting} onClick={onRemove}>
            {t('form.cancel')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="contained"
          size="medium"
          disabled={isSaving}
          onClick={() => void onSave()}
        >
          <Iconify icon="solar:diskette-bold" width={16} className="me-1.5" />
          {variantId || !isEditMode
            ? t('form.saveChanges')
            : t('form.createVariant')}
        </Button>
      </Box>
        </>
      ) : null}
    </Box>
  );
}
