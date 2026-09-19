import type { ReactNode } from 'react';
import type {
  ConvertItemInput,
  ConvertCatalogItem,
  ConvertExternalItem,
  ConvertCustomOrderPayload,
} from '../types/custom-order-request.types';

import { toast } from 'react-toastify';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Iconify } from '@/shared/components/iconify';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/utils/format-currency';
import { InfiniteScrollSelect } from '@/shared/components/infinite-scroll-select';
import { shopVariantOptionImage, shopVariantOptionColorHex } from '@/utils/shop-variant-image';
import {
  _ShopProductVariantApi,
  type ShopProductVariantItem,
  resolveShopVariantSaleFields,
} from '@/shared/api/shop-product-variant.services';

import { Box, Button, Typography } from 'src/shared/ui';

const VARIANT_SELECT_QUERY_KEY = ['shopProductVariant', 'list', 'custom-order-convert'] as const;

type DraftCatalog = ConvertCatalogItem & { localId: string };
type DraftExternal = ConvertExternalItem & { localId: string };
type DraftItem = DraftCatalog | DraftExternal;

type Props = {
  onSubmit: (payload: ConvertCustomOrderPayload) => Promise<void>;
  isSubmitting?: boolean;
};

function newLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ConvertCustomOrderForm({ onSubmit, isSubmitting }: Props) {
  const { t } = useTranslation('table');
  const queryClient = useQueryClient();
  const [items, setItems] = useState<DraftItem[]>([]);
  const [deliveryPrice, setDeliveryPrice] = useState('0');
  const [adminNote, setAdminNote] = useState('');
  const [isInstantDelivery, setIsInstantDelivery] = useState(false);
  const [varianceType, setVarianceType] = useState<'percent' | 'fixed'>('percent');
  const [varianceValue, setVarianceValue] = useState('0');

  const hasExternal = items.some((item) => item.type === 'external');

  const itemsSubtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const unit = Number(item.unit_price ?? 0);
        return sum + unit * Number(item.quantity || 0);
      }, 0),
    [items]
  );

  const delivery = Number(deliveryPrice) || 0;
  const grandTotal = itemsSubtotal + delivery;

  const addCatalogItem = () => {
    setItems((prev) => [
      ...prev,
      {
        localId: newLocalId(),
        type: 'catalog',
        shop_product_variant_id: 0,
        quantity: 1,
        unit_price: 0,
        label: '',
        note: '',
      },
    ]);
  };

  const addExternalItem = () => {
    setItems((prev) => [
      ...prev,
      {
        localId: newLocalId(),
        type: 'external',
        product_name: '',
        unit_price: 0,
        quantity: 1,
        note: '',
        invoice_image: null,
      },
    ]);
  };

  const updateItem = (localId: string, patch: Partial<DraftItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? ({ ...item, ...patch } as DraftItem) : item))
    );
  };

  const removeItem = (localId: string) => {
    setItems((prev) => prev.filter((item) => item.localId !== localId));
  };

  const handleSubmit = async () => {
    if (items.length < 1) {
      toast.error(t('form.customOrderRequestItemsRequired'));
      return;
    }

    for (const item of items) {
      if (item.type === 'catalog') {
        if (!item.shop_product_variant_id || item.shop_product_variant_id < 1) {
          toast.error(t('form.customOrderRequestCatalogVariantRequired'));
          return;
        }
        if (!item.quantity || item.quantity < 1) {
          toast.error(t('form.customOrderRequestQuantityRequired'));
          return;
        }
      } else {
        if (!item.product_name.trim()) {
          toast.error(t('form.customOrderRequestExternalNameRequired'));
          return;
        }
        if (item.unit_price == null || Number(item.unit_price) < 0) {
          toast.error(t('form.customOrderRequestExternalPriceRequired'));
          return;
        }
        if (!item.quantity || item.quantity < 1) {
          toast.error(t('form.customOrderRequestQuantityRequired'));
          return;
        }
      }
    }

    if (hasExternal) {
      if (!varianceType || (varianceType !== 'percent' && varianceType !== 'fixed')) {
        toast.error(t('form.customOrderRequestVarianceRequired'));
        return;
      }
      if (varianceValue === '' || Number(varianceValue) < 0) {
        toast.error(t('form.customOrderRequestVarianceRequired'));
        return;
      }
    }

    const payloadItems: ConvertItemInput[] = items.map((item) => {
      if (item.type === 'catalog') {
        const { localId: _id, unit_price: _p, label: _l, ...rest } = item;
        return {
          type: 'catalog',
          shop_product_variant_id: rest.shop_product_variant_id,
          quantity: rest.quantity,
          note: rest.note?.trim() || undefined,
        };
      }
      const { localId: _id, ...rest } = item;
      return {
        type: 'external',
        product_name: rest.product_name.trim(),
        unit_price: Number(rest.unit_price),
        quantity: rest.quantity,
        note: rest.note?.trim() || undefined,
        invoice_image: rest.invoice_image ?? null,
      };
    });

    const payload: ConvertCustomOrderPayload = {
      items: payloadItems,
      delivery_price: delivery,
      approximate_total: Math.round(grandTotal * 100) / 100,
      admin_note: adminNote.trim() || undefined,
      is_instant_delivery: isInstantDelivery,
    };

    if (hasExternal) {
      payload.price_variance_type = varianceType;
      payload.price_variance_value = Number(varianceValue);
    }

    await onSubmit(payload);
  };

  const variantFetcher = (page: number, limit: number) =>
    _ShopProductVariantApi.getList({ page, per_page: limit });

  return (
    <Box className="space-y-6">
      <Typography variant="body2" className="leading-relaxed text-muted-foreground">
        {t('form.customOrderRequestQuoteHint')}
      </Typography>

      {items.length === 0 ? (
        <Box className="space-y-3">
          <Typography variant="subtitle2" className="font-semibold text-foreground">
            {t('form.customOrderRequestEmptyTitle')}
          </Typography>
          <Box className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              icon="solar:shop-bold"
              title={t('form.customOrderRequestAddCatalog')}
              hint={t('form.customOrderRequestAddCatalogHint')}
              onClick={addCatalogItem}
            />
            <ChoiceCard
              icon="solar:cart-large-4-bold"
              title={t('form.customOrderRequestAddExternal')}
              hint={t('form.customOrderRequestAddExternalHint')}
              onClick={addExternalItem}
            />
          </Box>
        </Box>
      ) : (
        <Box className="space-y-3">
          <Box className="flex flex-wrap items-center justify-between gap-2">
            <Typography variant="subtitle2" className="font-semibold">
              {t('form.customOrderRequestItemsHeading')}
              <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {items.length}
              </span>
            </Typography>
            <Box className="flex flex-wrap gap-2">
              <Button type="button" variant="outlined" size="small" onClick={addCatalogItem}>
                <Iconify icon="solar:shop-bold" width={16} className="me-1" />
                {t('form.customOrderRequestAddCatalog')}
              </Button>
              <Button type="button" variant="outlined" size="small" onClick={addExternalItem}>
                <Iconify icon="solar:cart-large-4-bold" width={16} className="me-1" />
                {t('form.customOrderRequestAddExternal')}
              </Button>
            </Box>
          </Box>

          {items.map((item, index) => (
            <Box
              key={item.localId}
              className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-4"
            >
              <Box className="flex items-center justify-between gap-2">
                <Box className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.type === 'catalog'
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-500/15 text-amber-900 dark:text-amber-300'
                    }`}
                  >
                    {item.type === 'catalog'
                      ? t('form.customOrderRequestTypeCatalog')
                      : t('form.customOrderRequestTypeExternal')}
                  </span>
                </Box>
                <button
                  type="button"
                  onClick={() => removeItem(item.localId)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t('form.remove')}
                >
                  <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                </button>
              </Box>

              {item.type === 'catalog' ? (
                <>
                  <Field label={t('form.customOrderRequestVariant')}>
                    <InfiniteScrollSelect
                      value={item.shop_product_variant_id || 0}
                      onChange={(variantId) => {
                        const id = Number(variantId) || 0;
                        const cached = queryClient.getQueryData(VARIANT_SELECT_QUERY_KEY) as
                          | { pages?: Array<{ data?: { items?: ShopProductVariantItem[] } }> }
                          | undefined;
                        const option = cached?.pages
                          ?.flatMap((p) => p?.data?.items ?? [])
                          .find((row) => Number(row.id) === id);
                        const sale = option ? resolveShopVariantSaleFields(option) : {};
                        const after = sale.price_after_discount;
                        const unit =
                          after != null && Number(after) > 0
                            ? Number(after)
                            : Number(sale.price ?? 0);
                        updateItem(item.localId, {
                          shop_product_variant_id: id,
                          unit_price: unit,
                          label: option?.label ?? '',
                        });
                      }}
                      queryKey={[...VARIANT_SELECT_QUERY_KEY]}
                      fetcher={variantFetcher}
                      placeholder={t('form.customOrderRequestSelectVariant')}
                      getOptionImage={(opt) => shopVariantOptionImage(opt)}
                      getOptionColorHex={(opt) => shopVariantOptionColorHex(opt)}
                    />
                  </Field>
                  <Box className="grid grid-cols-2 gap-3">
                    <Field label={t('columns.quantity')}>
                      <input
                        type="number"
                        min={1}
                        className={fieldInputClass}
                        value={item.quantity || ''}
                        onChange={(e) =>
                          updateItem(item.localId, { quantity: Number(e.target.value) || 0 })
                        }
                        onBlur={() => {
                          if (!item.quantity || item.quantity < 1) {
                            updateItem(item.localId, { quantity: 1 });
                          }
                        }}
                      />
                    </Field>
                    <Field label={t('form.customOrderRequestUnitPriceSystem')}>
                      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-medium">
                        {formatCurrency(item.unit_price ?? 0)}
                      </div>
                    </Field>
                  </Box>
                </>
              ) : (
                <>
                  <Field label={t('form.customOrderRequestProductName')}>
                    <input
                      type="text"
                      className={fieldInputClass}
                      value={item.product_name}
                      onChange={(e) => updateItem(item.localId, { product_name: e.target.value })}
                      placeholder={t('form.customOrderRequestProductNamePlaceholder')}
                    />
                  </Field>
                  <Box className="grid grid-cols-2 gap-3">
                    <Field label={t('form.customOrderRequestUnitPrice')}>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className={fieldInputClass}
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(item.localId, { unit_price: Number(e.target.value) || 0 })
                        }
                      />
                    </Field>
                    <Field label={t('columns.quantity')}>
                      <input
                        type="number"
                        min={1}
                        className={fieldInputClass}
                        value={item.quantity || ''}
                        onChange={(e) =>
                          updateItem(item.localId, { quantity: Number(e.target.value) || 0 })
                        }
                        onBlur={() => {
                          if (!item.quantity || item.quantity < 1) {
                            updateItem(item.localId, { quantity: 1 });
                          }
                        }}
                      />
                    </Field>
                  </Box>
                  <Field label={t('form.customOrderRequestInvoiceOptional')}>
                    <input
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
                      onChange={(e) =>
                        updateItem(item.localId, {
                          invoice_image: e.target.files?.[0] ?? null,
                        })
                      }
                    />
                  </Field>
                </>
              )}

              <Field label={t('form.customOrderRequestLineNote')}>
                <input
                  type="text"
                  className={fieldInputClass}
                  value={item.note ?? ''}
                  onChange={(e) => updateItem(item.localId, { note: e.target.value })}
                />
              </Field>

              <div className="flex justify-between border-t border-border/50 pt-2 text-sm">
                <span className="text-muted-foreground">{t('form.customOrderRequestLineTotal')}</span>
                <span className="font-semibold">
                  {formatCurrency((Number(item.unit_price) || 0) * (Number(item.quantity) || 0))}
                </span>
              </div>
            </Box>
          ))}
        </Box>
      )}

      {hasExternal && (
        <Box className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <Box>
            <Typography variant="subtitle2" className="font-semibold text-amber-950 dark:text-amber-200">
              {t('form.customOrderRequestVarianceTitle')}
            </Typography>
            <Typography variant="caption" className="mt-1 block text-muted-foreground">
              {t('form.customOrderRequestVarianceHint')}
            </Typography>
          </Box>
          <Box className="grid grid-cols-2 gap-3">
            <Field label={t('form.customOrderRequestVarianceType')}>
              <select
                className={fieldInputClass}
                value={varianceType}
                onChange={(e) => setVarianceType(e.target.value as 'percent' | 'fixed')}
              >
                <option value="percent">{t('form.customOrderRequestVariancePercent')}</option>
                <option value="fixed">{t('form.customOrderRequestVarianceFixed')}</option>
              </select>
            </Field>
            <Field label={t('form.customOrderRequestVarianceValue')}>
              <input
                type="number"
                min={0}
                step="any"
                className={fieldInputClass}
                value={varianceValue}
                onChange={(e) => setVarianceValue(e.target.value)}
              />
            </Field>
          </Box>
        </Box>
      )}

      <Box className="grid gap-3 sm:grid-cols-2">
        <Field label={t('form.customOrderRequestDeliveryPrice')}>
          <input
            type="number"
            min={0}
            step="any"
            className={fieldInputClass}
            value={deliveryPrice}
            onChange={(e) => setDeliveryPrice(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={isInstantDelivery}
            onChange={(e) => setIsInstantDelivery(e.target.checked)}
            className="size-4 rounded border-border"
          />
          {t('form.customOrderRequestInstantDelivery')}
        </label>
      </Box>

      <Field label={t('form.customOrderRequestAdminNote')}>
        <textarea
          className={`${fieldInputClass} resize-none`}
          rows={2}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
        />
      </Field>

      <Box className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
        <Typography variant="subtitle2" className="font-semibold">
          {t('form.customOrderRequestPriceSummary')}
        </Typography>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('form.customOrderRequestItemsSubtotal')}</span>
          <span className="font-medium">{formatCurrency(itemsSubtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('form.customOrderRequestDeliveryPrice')}</span>
          <span className="font-medium">{formatCurrency(delivery)}</span>
        </div>
        <div className="flex justify-between border-t border-border/60 pt-2 text-base font-semibold">
          <span>{t('form.customOrderRequestGrandTotal')}</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
      </Box>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || items.length === 0}
        className="w-full"
      >
        <Iconify icon="solar:plain-2-bold" width={18} className="me-2" />
        {isSubmitting
          ? t('form.customOrderRequestConverting')
          : t('form.customOrderRequestSendForApproval')}
      </Button>
    </Box>
  );
}

const fieldInputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" className="mb-1.5 block text-muted-foreground">
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function ChoiceCard({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: string;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full flex-col items-start gap-3 rounded-xl border border-border/70 bg-background/80 p-4 text-start transition hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-sm"
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Iconify icon={icon} width={20} />
      </span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
