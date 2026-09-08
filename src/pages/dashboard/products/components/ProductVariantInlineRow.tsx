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

import { Box, Button, Typography } from 'src/shared/ui';

import { ProductPricingFields } from './ProductPricingFields';
import { ProductShopVariantsSection } from '../view/product/ProductShopVariantsSection';
import {
  toTwoDecimalNumber,
  optionalNumberInputDisplay,
} from './variant-field-helpers';
import {
  VariantFieldLabel,
  VariantStatusBadge,
  VariantAttributeChain,
  variantFieldInputClass,
} from './variant-field-ui';
import {
  regenerateVariantSku,
  type ColorsHexLookup,
  type CategoryAttributeValueRef,
} from '../utils/variant-combinations';

// ----------------------------------------------------------------------

function fieldInputClass(error?: boolean) {
  return variantFieldInputClass(error);
}

function FieldErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Typography variant="caption" className="text-destructive mt-0.5 block">
      {message}
    </Typography>
  );
}

function RemovableLocalVariantImageThumb({
  file,
  onRemove,
  removeAriaLabel,
}: {
  file: File;
  onRemove: () => void;
  removeAriaLabel: string;
}) {
  const [previewUrl, setPreviewUrl] = React.useState('');

  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <Box className="relative">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className="h-16 w-16 object-cover rounded-lg border border-border/60"
        />
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -start-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-base font-bold leading-none text-white shadow-md ring-2 ring-white hover:bg-red-700"
        aria-label={removeAriaLabel}
      >
        ×
      </button>
    </Box>
  );
}

export type ProductVariantInlineRowProps = {
  variantIndex: number;
  variantFieldId: string;
  control: Control<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  valueRefs: CategoryAttributeValueRef[];
  colorsHexLookup: ColorsHexLookup;
  productDualPriceReady: boolean;
  usdCurrency?: CurrencyData;
  sypCurrency?: CurrencyData;
  sypRate: number | null;
  watchedProductSku: string;
  restaurantMode: boolean;
  isEditMode: boolean;
  isShopSaleChannel: boolean;
  productId?: string;
  productResponse?: { variants?: Array<{ id: number; images?: Array<{ id: number; url: string }> }> };
  shops: unknown[];
  shopVariantsFields: unknown[];
  watchedShopVariants: ProductFormValues['shop_variants'];
  appendShopVariant: (row: NonNullable<ProductFormValues['shop_variants']>[number]) => void;
  removeShopVariant: (index: number) => void;
  shopVariantCreateBusyIdx: number | null;
  setShopVariantCreateBusyIdx: (v: number | null) => void;
  updateShopVariantMutation: { isPending: boolean; mutateAsync: (args: any) => Promise<any> };
  createSingleShopVariantOnProduct: (args: {
    productId: number | string;
    parentVariantId: number;
    parentVariantIndex: number;
    shopId: number;
    costPrice: number | undefined;
  }) => Promise<number>;
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
  colorsHexLookup,
  productDualPriceReady,
  usdCurrency: _usdCurrency,
  sypCurrency,
  sypRate,
  watchedProductSku,
  restaurantMode,
  isEditMode,
  isShopSaleChannel,
  productId,
  productResponse,
  shops,
  shopVariantsFields,
  watchedShopVariants,
  appendShopVariant,
  removeShopVariant,
  shopVariantCreateBusyIdx,
  setShopVariantCreateBusyIdx,
  updateShopVariantMutation,
  createSingleShopVariantOnProduct,
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
  const shopSvIndex = React.useMemo(() => {
    const rows = watchedShopVariants ?? [];
    return rows.findIndex((sv) => Number(sv?.variant_index) === variantIndex);
  }, [watchedShopVariants, variantIndex]);

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
        <Box className="space-y-3">
          <ProductPricingFields
            prefix={`variants.${variantIndex}`}
            control={control}
            watch={watch}
            setValue={setValue}
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

          {isShopSaleChannel && shopSvIndex >= 0 ? (
            <Box className="max-w-xs">
              <VariantFieldLabel>
                {t('form.productCostPriceOptional')}
              </VariantFieldLabel>
              <Controller
                name={`shop_variants.${shopSvIndex}.cost_price`}
                control={control}
                render={({ field: f, fieldState: { error } }) => (
                  <div>
                    <input
                      type="number"
                      name={f.name}
                      ref={f.ref}
                      onBlur={f.onBlur}
                      value={optionalNumberInputDisplay(f.value)}
                      placeholder="—"
                      onChange={(e) => f.onChange(toTwoDecimalNumber(e.target.value))}
                      className={fieldInputClass(!!error)}
                      step="0.01"
                      min={0}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </Box>
          ) : null}
        </Box>

        <Box>
          <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground">
            {t('form.variantImagesOptional')}
          </Typography>
        <Controller
          name={`variants.${variantIndex}.images`}
          control={control}
          render={({ field: { onChange, value, ref, name, onBlur }, fieldState: { error } }) => {
            const variantFileInputId = `variant-images-${variantIndex}-${variantFieldId}`;
            return (
              <div>
                <input
                  id={variantFileInputId}
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
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor={variantFileInputId}
                    className={`inline-flex cursor-pointer rounded-lg border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted ${
                      error ? 'border-destructive' : 'border-border'
                    }`}
                  >
                    {t('form.chooseFiles')}
                  </label>
                  <Typography component="span" variant="caption" color="secondary">
                    {Array.isArray(value) && value.length > 0
                      ? t('form.filesSelectedCount', { count: value.length })
                      : t('form.noFileChosen')}
                  </Typography>
                </div>
                <FieldErrorText message={error?.message} />
                {(() => {
                  const files = (Array.isArray(value) ? value : []).filter(
                    (f): f is File => f instanceof File
                  );
                  if (!files.length) return null;
                  return (
                    <Box className="mt-2 flex flex-wrap gap-2">
                      {files.map((file, i) => (
                        <RemovableLocalVariantImageThumb
                          key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
                          file={file}
                          removeAriaLabel={t('form.removeVariantImageAria')}
                          onRemove={() => onChange(files.filter((_, idx) => idx !== i))}
                        />
                      ))}
                    </Box>
                  );
                })()}
              </div>
            );
          }}
        />
        {(() => {
          const vRowId = watch(`variants.${variantIndex}.id`);
          const keepVIds = watch(`variants.${variantIndex}.existing_images_ids`) ?? [];
          const fromApi =
            isEditMode && vRowId && productResponse?.variants
              ? productResponse.variants
                  .find((x) => Number(x.id) === Number(vRowId))
                  ?.images?.filter((im) => keepVIds.includes(Number(im.id))) ?? []
              : [];
          if (!fromApi.length) return null;
          return (
            <Box className="mt-2 flex flex-wrap gap-2">
              {fromApi.map((im) => (
                <Box key={im.id} className="relative">
                  <img
                    src={im.url}
                    alt=""
                    className="h-16 w-16 object-cover rounded-lg border border-border/60"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setValue(
                        `variants.${variantIndex}.existing_images_ids`,
                        keepVIds.filter((x) => x !== Number(im.id)),
                        { shouldDirty: true }
                      )
                    }
                    className="absolute -top-1.5 -start-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-base font-bold leading-none text-white shadow-md ring-2 ring-white hover:bg-red-700"
                    aria-label={t('form.removeVariantImageAria')}
                  >
                    ×
                  </button>
                </Box>
              ))}
            </Box>
          );
        })()}
        </Box>

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

      {isShopSaleChannel ? (
        <Box className="px-5 pb-5">
        <ProductShopVariantsSection
          variantIndex={variantIndex}
          hideCostPrice
          shops={shops as Parameters<typeof ProductShopVariantsSection>[0]['shops']}
          shopVariantsFields={shopVariantsFields as Parameters<typeof ProductShopVariantsSection>[0]['shopVariantsFields']}
          watchedShopVariants={watchedShopVariants ?? []}
          control={control}
          watch={watch}
          setValue={setValue}
          appendShopVariant={appendShopVariant}
          removeShopVariant={removeShopVariant}
          isEditMode={isEditMode}
          productId={productId}
          shopVariantCreateBusyIdx={shopVariantCreateBusyIdx}
          setShopVariantCreateBusyIdx={setShopVariantCreateBusyIdx}
          updateShopVariantMutation={updateShopVariantMutation}
          createSingleShopVariantOnProduct={createSingleShopVariantOnProduct}
        />
        </Box>
      ) : null}

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
