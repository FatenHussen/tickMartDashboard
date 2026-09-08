import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { CurrencyData } from '@/pages/dashboard/currencies/types/currency.types';
import type { ProductFormValues } from '@/pages/dashboard/products/validation/product.validation';
import type {
  Control,
  FieldPath,
  UseFormWatch,
  UseFormSetValue,
} from 'react-hook-form';

import { Controller } from 'react-hook-form';
import { Iconify } from '@/shared/components/iconify';

import { Box, Typography } from 'src/shared/ui';

import { sanitizeEnglishSkuInput } from '../utils/variant-combinations';
import { VariantFieldLabel, variantFieldInputClass } from './variant-field-ui';
import {
  toOptionalInt,
  localAmountToUsd,
  toOptionalNumber,
  usdToLocalAmount,
  parseCurrencyRate,
  toTwoDecimalNumber,
  toOptionalDiscountInt,
  optionalNumberInputDisplay,
  formatLiveAfterDiscountPreview,
} from './variant-field-helpers';

// ----------------------------------------------------------------------

export type ProductPricingFieldPrefix = '' | `variants.${number}`;

export type ProductPricingFieldsProps = {
  prefix: ProductPricingFieldPrefix;
  control: Control<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  usdLabel: string;
  sypLabel: string;
  skuLabel: string;
  productDualPriceReady: boolean;
  sypCurrency?: CurrencyData;
  sypRate: number | null;
  hideSku?: boolean;
  hideBarcode?: boolean;
  englishSkuOnly?: boolean;
  skuAction?: 'generate' | 'regenerate';
  onSkuAction?: () => void;
  /** Product-info tab only (§11): cost USD/SYP with the same FX sync. */
  showCost?: boolean;
  /** Product-info tab: product number + model on the same row as SKU. */
  showIdentityFields?: boolean;
  title?: string;
  t: TFunction;
};

function pricingPath(
  prefix: ProductPricingFieldPrefix,
  key:
    | 'price'
    | 'price_syp'
    | 'discount_type'
    | 'discount'
    | 'quantity'
    | 'barcode'
    | 'sku'
): FieldPath<ProductFormValues> {
  return (prefix ? `${prefix}.${key}` : key) as FieldPath<ProductFormValues>;
}

function FieldErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Typography variant="caption" className="text-destructive mt-0.5 block">
      {message}
    </Typography>
  );
}

function fieldInputClass(error?: boolean) {
  return variantFieldInputClass(error);
}

function FieldCell({ children }: { children: ReactNode }) {
  return <Box className="min-w-0">{children}</Box>;
}

const FIELD_GRID =
  'grid grid-cols-2 gap-x-3 gap-y-2.5 md:grid-cols-4';

/**
 * Shared compact grid on the product-info tab and each variant card.
 * Identity (product # · model · SKU) · price/discount · cost/qty/barcode.
 */
export function ProductPricingFields({
  prefix,
  control,
  watch,
  setValue,
  usdLabel,
  sypLabel,
  skuLabel,
  productDualPriceReady,
  sypCurrency,
  sypRate,
  hideSku = false,
  hideBarcode = false,
  englishSkuOnly = false,
  skuAction,
  onSkuAction,
  showCost = false,
  showIdentityFields = false,
  title,
  t,
}: ProductPricingFieldsProps) {
  const pricePath = pricingPath(prefix, 'price');
  const priceSypPath = pricingPath(prefix, 'price_syp');
  const discountTypePath = pricingPath(prefix, 'discount_type');
  const discountPath = pricingPath(prefix, 'discount');
  const quantityPath = pricingPath(prefix, 'quantity');
  const barcodePath = pricingPath(prefix, 'barcode');
  const skuPath = pricingPath(prefix, 'sku');

  const discountType = (watch(discountTypePath) as string | undefined) ?? 'none';
  const discountDisabled = discountType === 'none';
  const showCostFields = showCost && prefix === '' && productDualPriceReady;

  const syncPair = (
    usdPath: FieldPath<ProductFormValues>,
    sypPath: FieldPath<ProductFormValues>,
    next: number | undefined,
    from: 'usd' | 'syp'
  ) => {
    if (!sypCurrency) return;
    const rate = parseCurrencyRate(sypCurrency);
    if (from === 'usd') {
      setValue(
        sypPath,
        next == null ? (undefined as unknown as number) : usdToLocalAmount(next, rate),
        { shouldDirty: true }
      );
    } else {
      setValue(
        usdPath,
        next == null ? (undefined as unknown as number) : localAmountToUsd(next, rate),
        { shouldValidate: true, shouldDirty: true }
      );
    }
  };

  const afterDiscountValue = (() => {
    const p = toOptionalNumber(watch(pricePath));
    const dt = (watch(discountTypePath) as string | undefined) ?? 'none';
    const d = toOptionalNumber(watch(discountPath));
    if (p == null) return '';
    return formatLiveAfterDiscountPreview(p, dt, d, sypRate);
  })();

  return (
    <Box className="space-y-2.5">
      {title ? (
        <Typography variant="subtitle2" className="font-semibold text-foreground">
          {title}
        </Typography>
      ) : null}

      {showIdentityFields || !hideSku || !hideBarcode ? (
        <Box className={FIELD_GRID}>
          {showIdentityFields && prefix === '' ? (
            <>
              <FieldCell>
                <VariantFieldLabel>{t('form.productDetailsProductNumber')}</VariantFieldLabel>
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
              </FieldCell>
              <FieldCell>
                <VariantFieldLabel>{t('form.productModel')}</VariantFieldLabel>
                <Controller
                  name="model"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <div>
                      <input
                        {...field}
                        value={field.value ?? ''}
                        type="text"
                        placeholder={t('form.modelPlaceholder')}
                        className={fieldInputClass(!!error)}
                      />
                      <FieldErrorText message={error?.message} />
                    </div>
                  )}
                />
              </FieldCell>
            </>
          ) : null}

          {!hideSku ? (
            <FieldCell>
              <VariantFieldLabel>{skuLabel}</VariantFieldLabel>
              <Controller
                name={skuPath}
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <Box className="relative">
                      <input
                        {...field}
                        value={field.value == null ? '' : String(field.value)}
                        type="text"
                        placeholder={t('form.variantSkuPlaceholder')}
                        className={`${fieldInputClass(!!error)} ${
                          skuAction && onSkuAction ? 'pe-9' : ''
                        }`}
                        onChange={(e) => {
                          const next = englishSkuOnly
                            ? sanitizeEnglishSkuInput(e.target.value)
                            : e.target.value;
                          field.onChange(next);
                        }}
                      />
                      {skuAction && onSkuAction ? (
                        <button
                          type="button"
                          className="absolute end-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={
                            skuAction === 'regenerate'
                              ? t('form.regenerateSku')
                              : t('form.generateSku')
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSkuAction();
                          }}
                        >
                          <Iconify
                            icon={
                              skuAction === 'regenerate'
                                ? 'solar:refresh-bold'
                                : 'solar:shuffle-bold'
                            }
                            width={14}
                          />
                          <span className="sr-only">{t('form.generateSkuShort')}</span>
                        </button>
                      ) : null}
                    </Box>
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </FieldCell>
          ) : null}

          {!hideBarcode ? (
            <FieldCell>
              <VariantFieldLabel>{t('form.variantBarcode')}</VariantFieldLabel>
              <Controller
                name={barcodePath}
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <input
                      {...field}
                      value={field.value == null ? '' : String(field.value)}
                      type="text"
                      placeholder={t('form.variantBarcodePlaceholder')}
                      className={fieldInputClass(!!error)}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </FieldCell>
          ) : null}
        </Box>
      ) : null}

      <Box className={FIELD_GRID}>
        {productDualPriceReady ? (
          <>
            <FieldCell>
              <VariantFieldLabel>{usdLabel}</VariantFieldLabel>
              <Controller
                name={pricePath}
                control={control}
                render={({ field: f, fieldState: { error } }) => (
                  <div>
                    <input
                      type="number"
                      placeholder="—"
                      name={f.name}
                      ref={f.ref}
                      onBlur={f.onBlur}
                      value={optionalNumberInputDisplay(f.value)}
                      onChange={(e) => {
                        const next = toTwoDecimalNumber(e.target.value);
                        f.onChange(next);
                        syncPair(pricePath, priceSypPath, next, 'usd');
                      }}
                      className={fieldInputClass(!!error)}
                      step="any"
                      min={0}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </FieldCell>
            <FieldCell>
              <VariantFieldLabel>{sypLabel}</VariantFieldLabel>
              <Controller
                name={priceSypPath}
                control={control}
                render={({ field: f, fieldState: { error } }) => (
                  <div>
                    <input
                      type="number"
                      placeholder="—"
                      step="any"
                      min={0}
                      name={f.name}
                      ref={f.ref}
                      onBlur={f.onBlur}
                      value={optionalNumberInputDisplay(f.value)}
                      onChange={(e) => {
                        const next = toTwoDecimalNumber(e.target.value);
                        f.onChange(next);
                        syncPair(pricePath, priceSypPath, next, 'syp');
                      }}
                      className={fieldInputClass(!!error)}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </FieldCell>
          </>
        ) : (
          <FieldCell>
            <VariantFieldLabel>{usdLabel}</VariantFieldLabel>
            <Controller
              name={pricePath}
              control={control}
              render={({ field: f, fieldState: { error } }) => (
                <div>
                  <input
                    type="number"
                    placeholder="—"
                    name={f.name}
                    ref={f.ref}
                    onBlur={f.onBlur}
                    value={optionalNumberInputDisplay(f.value)}
                    onChange={(e) => f.onChange(toTwoDecimalNumber(e.target.value))}
                    className={fieldInputClass(!!error)}
                    step="0.01"
                    min={0}
                  />
                  <FieldErrorText message={error?.message} />
                </div>
              )}
            />
          </FieldCell>
        )}

        <FieldCell>
          <VariantFieldLabel>{t('form.productDiscountType')}</VariantFieldLabel>
          <Controller
            name={discountTypePath}
            control={control}
            render={({ field: f }) => (
              <select
                className={variantFieldInputClass()}
                value={(f.value as string | undefined) ?? 'none'}
                onChange={(e) => {
                  const next = e.target.value;
                  f.onChange(next);
                  if (next === 'none') {
                    setValue(discountPath, undefined as unknown as number, { shouldDirty: true });
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
        </FieldCell>

        <FieldCell>
          <VariantFieldLabel>{t('form.productDiscountValue')}</VariantFieldLabel>
          <Controller
            name={discountPath}
            control={control}
            render={({ field: f, fieldState: { error } }) => (
              <div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="—"
                  disabled={discountDisabled}
                  name={f.name}
                  ref={f.ref}
                  onBlur={f.onBlur}
                  value={optionalNumberInputDisplay(f.value)}
                  onChange={(e) => f.onChange(toOptionalDiscountInt(e.target.value))}
                  className={fieldInputClass(!!error)}
                />
                <FieldErrorText message={error?.message} />
              </div>
            )}
          />
        </FieldCell>
      </Box>

      <Box className={FIELD_GRID}>
        <FieldCell>
          <VariantFieldLabel>{t('form.productPriceAfterDiscountReadonly')}</VariantFieldLabel>
          <input
            type="text"
            readOnly
            placeholder="—"
            className={`${variantFieldInputClass()} bg-muted/25 text-muted-foreground cursor-default`}
            value={afterDiscountValue}
          />
        </FieldCell>

        {showCostFields ? (
          <>
            <FieldCell>
              <VariantFieldLabel>{t('form.productCostPriceUsdLabel')}</VariantFieldLabel>
              <Controller
                name="cost_price"
                control={control}
                render={({ field: f, fieldState: { error } }) => (
                  <div>
                    <input
                      type="number"
                      placeholder="—"
                      name={f.name}
                      ref={f.ref}
                      onBlur={f.onBlur}
                      value={optionalNumberInputDisplay(f.value)}
                      onChange={(e) => {
                        const next = toTwoDecimalNumber(e.target.value);
                        f.onChange(next);
                        syncPair('cost_price', 'cost_price_syp', next, 'usd');
                      }}
                      className={fieldInputClass(!!error)}
                      step="any"
                      min={0}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </FieldCell>
            <FieldCell>
              <VariantFieldLabel>{t('form.productCostPriceSypLabel')}</VariantFieldLabel>
              <Controller
                name="cost_price_syp"
                control={control}
                render={({ field: f, fieldState: { error } }) => (
                  <div>
                    <input
                      type="number"
                      placeholder="—"
                      name={f.name}
                      ref={f.ref}
                      onBlur={f.onBlur}
                      value={optionalNumberInputDisplay(f.value)}
                      onChange={(e) => {
                        const next = toTwoDecimalNumber(e.target.value);
                        f.onChange(next);
                        syncPair('cost_price', 'cost_price_syp', next, 'syp');
                      }}
                      className={fieldInputClass(!!error)}
                      step="any"
                      min={0}
                    />
                    <FieldErrorText message={error?.message} />
                  </div>
                )}
              />
            </FieldCell>
          </>
        ) : null}

        <FieldCell>
          <VariantFieldLabel>{t('form.variantQuantityLabel')}</VariantFieldLabel>
          <Controller
            name={quantityPath}
            control={control}
            render={({ field: f, fieldState: { error } }) => (
              <div>
                <input
                  type="number"
                  placeholder="—"
                  name={f.name}
                  ref={f.ref}
                  onBlur={f.onBlur}
                  value={optionalNumberInputDisplay(f.value)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      f.onChange(undefined as unknown as number);
                      return;
                    }
                    f.onChange(toOptionalInt(raw));
                  }}
                  className={fieldInputClass(!!error)}
                  step={1}
                  min={0}
                />
                <FieldErrorText message={error?.message} />
              </div>
            )}
          />
        </FieldCell>
      </Box>
    </Box>
  );
}
