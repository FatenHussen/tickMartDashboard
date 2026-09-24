import type { TFunction } from 'i18next';

import { Iconify } from '@/shared/components/iconify';
import { formatDecimal, formatMoneyLine, normalizeFormattedMoneyText } from '@/utils/format-currency';
import {
  type OrderStatus,
  type OrderDetailItem,
  parseOrderStatus,
  ORDER_ITEM_STATUS_OPTIONS,
} from '@/pages/dashboard/orders/types/order.types';

import { toDisplayString } from 'src/utils/to-display-string';

import { CONFIG } from 'src/global-config';
import { Box, Typography } from 'src/shared/ui';

// ----------------------------------------------------------------------

function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = CONFIG.serverUrl?.replace(/\/$/, '') ?? '';
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : path;
}

function itemUnitLabel(item: OrderDetailItem): string {
  return formatMoneyLine(item.unit_price_formatted, item.unit_price ?? item.price);
}
 
function itemFinalUnitLabel(item: OrderDetailItem): string {
  return formatMoneyLine(item.final_price_formatted, item.final_price);
}

function itemSubtotalLabel(item: OrderDetailItem): string {
  return formatMoneyLine(item.subtotal_formatted, item.subtotal);
}

function itemLineTotalLabel(item: OrderDetailItem): string {
  return formatMoneyLine(item.total_formatted, item.total ?? item.subtotal);
}

function hasDistinctFinalUnit(item: OrderDetailItem): boolean {
  const u = item.unit_price ?? item.price;
  const f = item.final_price;
  if (u == null || f == null) return false;
  return Number(u) !== Number(f);
}

export type OrderLineItemCardProps = {
  item: OrderDetailItem;
  /** Zero-based index in the order (shown as #1, #2, …). */
  index: number;
  t: TFunction<'table'>;
  statusTone: Record<OrderStatus, string>;
  getStatusLabel: (statusRaw: string) => string;
  onItemStatusChange: (itemId: number, status: OrderStatus) => void;
  itemStatusPending: boolean;
};

function PricingRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/30 py-2.5 last:border-b-0 last:pb-0 first:pt-0">
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={`min-w-0 text-end text-sm tabular-nums ${emphasize ? 'font-bold text-primary' : 'font-medium text-foreground'}`}
      >
        {value}
      </span>
    </div>
  );
}

export function OrderLineItemCard({
  item,
  index,
  t,
  statusTone,
  getStatusLabel,
  onItemStatusChange,
  itemStatusPending,
}: OrderLineItemCardProps) {
  const imgSrc = resolveMediaUrl(item.product_image ?? undefined);
  const discount = item.discount ?? 0;
  const parsedItemStatus = parseOrderStatus(item.status);
  const st = parsedItemStatus ?? 'pending';
  const lineNum = index + 1;
  const itemStatusOptions: OrderStatus[] = parsedItemStatus
    ? ORDER_ITEM_STATUS_OPTIONS.includes(parsedItemStatus)
      ? ORDER_ITEM_STATUS_OPTIONS
      : [parsedItemStatus, ...ORDER_ITEM_STATUS_OPTIONS.filter((s) => s !== parsedItemStatus)]
    : ORDER_ITEM_STATUS_OPTIONS;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 hover:border-primary/25 hover:shadow-md dark:ring-white/[0.04]">
      {/* Top bar: line index + id + line total */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-gradient-to-l from-primary/[0.07] via-muted/20 to-transparent px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-primary px-2 text-xs font-bold tabular-nums text-primary-foreground shadow-sm">
            #{lineNum}
          </span>
          <span className="text-xs text-muted-foreground sm:text-sm">
            <span className="font-medium text-foreground/80">{t('orders.itemLineId')}</span>
            <span className="ms-1 font-mono text-foreground">{item.id}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{t('orders.itemLineTotalLabel')}</span>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-bold tabular-nums text-primary">
            {itemLineTotalLabel(item)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-stretch lg:gap-6">
        {/* Thumbnail */}
        <Box className="flex shrink-0 justify-center lg:justify-start">
          {imgSrc ? (
            <div className="relative overflow-hidden rounded-2xl ring-2 ring-border/50 transition-transform duration-300 group-hover:ring-primary/30">
              <img
                src={imgSrc}
                alt=""
                className="aspect-square h-28 w-28 object-cover sm:h-32 sm:w-32"
              />
            </div>
          ) : (
            <div className="flex aspect-square h-28 w-28 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-gradient-to-br from-muted/40 to-muted/10 sm:h-32 sm:w-32">
              <Iconify icon="solar:gallery-minimalistic-bold" width={32} className="text-muted-foreground/50" />
              <span className="mt-1 max-w-[5.5rem] text-center text-[10px] font-medium text-muted-foreground">
                {t('orders.itemNoImage')}
              </span>
            </div>
          )}
        </Box>

        {/* Main column */}
        <Box className="min-w-0 flex-1 space-y-4">
          <Box>
            <Typography variant="h6" className="text-lg font-bold leading-snug tracking-tight sm:text-xl">
              {item.product_name}
            </Typography>
          </Box>

          {/* Pricing breakdown */}
          <Box className="overflow-hidden rounded-xl border border-border/50 bg-muted/[0.12] dark:bg-muted/10">
            <div className="border-b border-border/40 bg-muted/25 px-4 py-2">
              <Typography variant="caption" className="font-semibold uppercase tracking-wider text-muted-foreground">
                {t('orders.itemPricingSection')}
              </Typography>
            </div>
            <div className="px-4 pb-1 pt-0">
              <PricingRow label={t('orders.itemUnitPriceLabel')} value={itemUnitLabel(item)} />
              {hasDistinctFinalUnit(item) ? (
                <PricingRow label={t('orders.itemFinalUnitLabel')} value={itemFinalUnitLabel(item)} />
              ) : null}
              <PricingRow
                label={t('orders.itemQtyLabel')}
                value={String(item.quantity)}
              />
              <PricingRow label={t('orders.itemLineSubtotal')} value={itemSubtotalLabel(item)} />
              {discount > 0 ? (
                <PricingRow
                  label={t('orders.itemDiscountLabel')}
                  value={`−${String(discount)}`}
                />
              ) : null}
              {item.extras && item.extras.length > 0 && item.extras_total_formatted ? (
                <PricingRow
                  label={t('orders.itemExtras')}
                  value={normalizeFormattedMoneyText(item.extras_total_formatted)}
                />
              ) : null}
              <PricingRow label={t('orders.itemLineTotalLabel')} value={itemLineTotalLabel(item)} emphasize />
            </div>
          </Box>

          {/* Meta: delivery + note */}
          {(item.delivery_time || item.note) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {item.delivery_time ? (
                <div className="flex items-start gap-3 rounded-xl border border-sky-500/400 bg-sky-500/[0.06] p-3 dark:bg-sky-500/10">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300">
                    <Iconify icon="solar:clock-circle-bold" width={20} />
                  </span>
                  <div className="min-w-0">
                    <Typography variant="caption" className="block font-semibold text-black-500 dark:text-black-500">
                      {t('orders.itemDeliveryWindow')}
                    </Typography> 
                    <Typography variant="body2" className="mt-0.5 font-medium leading-snug text-foreground">
                      {item.delivery_time}
                    </Typography>
                  </div>
                </div>
              ) : null}
              {item.note ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3 dark:bg-amber-500/10 sm:col-span-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200">
                    <Iconify icon="solar:notes-bold" width={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Typography variant="caption" className="block font-semibold text-amber-950 dark:text-amber-100">
                      {t('orders.itemCustomerNote')}
                    </Typography>
                    <Typography
                      variant="body2"
                      className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed text-foreground"
                    >
                      {item.note}
                    </Typography>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Variants / options */}
          {item.variant_attributes &&
            (Array.isArray(item.variant_attributes)
              ? item.variant_attributes.length > 0
              : Object.keys(item.variant_attributes).length > 0) && (
              <Box>
                <Typography variant="caption" className="mb-2 block font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('orders.itemSpecifications')}
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(item.variant_attributes)
                    ? item.variant_attributes.map((attr: any, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-xs font-medium text-foreground shadow-sm"
                        >
                          <span className="text-muted-foreground">{toDisplayString(attr.attribute)}</span>
                          <span className="hidden h-3 w-px shrink-0 bg-border sm:inline" aria-hidden />
                          {attr.type === 'color' ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="inline-block h-4 w-4 shrink-0 rounded-full border border-border/60 shadow-inner"
                                style={{ backgroundColor: attr.value }}
                              />
                              {toDisplayString(attr.value)}
                            </span>
                          ) : (
                            <span>{toDisplayString(attr.value)}</span>
                          )}
                        </span>
                      ))
                    : Object.entries(item.variant_attributes).map(([key, value]) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-xs font-medium text-foreground shadow-sm"
                        >
                          <span className="text-muted-foreground">{key}</span>
                          <span className="hidden h-3 w-px shrink-0 bg-border sm:inline" aria-hidden />
                          <span>{toDisplayString(value)}</span>
                        </span>
                      ))}
                </div>
              </Box>
            )}

          {/* Extras list */}
          {item.extras && item.extras.length > 0 ? (
            <Box className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-4 dark:bg-violet-500/[0.08]">
              <div className="mb-3 flex items-center gap-2">
                <Iconify icon="solar:add-circle-bold" className="text-violet-600 dark:text-violet-400" width={18} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('orders.itemExtras')}
                </Typography>
              </div>
              <ul className="space-y-2">
                {item.extras.map((ex, i) => (
                  <li
                    key={ex.id ?? i}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/70 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">{toDisplayString(ex.name ?? ex.label ?? '—')}</span>
                    {ex.price != null && (
                      <span className="shrink-0 tabular-nums text-xs font-semibold text-muted-foreground">
                        +{formatDecimal(ex.price)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {item.extras_total_formatted ? (
                <Typography variant="caption" className="mt-3 block border-t border-border/40 pt-3 font-medium text-muted-foreground">
                  {t('orders.itemExtrasSubtotal')}:{' '}
                  <span className="text-foreground">
                    {normalizeFormattedMoneyText(item.extras_total_formatted)}
                  </span>
                </Typography>
              ) : null}
            </Box>
          ) : null}
        </Box>

        {/* Status control — full width on mobile, column on large screens */}
        <Box className="flex w-full shrink-0 flex-col justify-start gap-2 rounded-xl border border-border/50 bg-muted/15 p-4 lg:w-[13.5rem] lg:border-s-2 lg:border-border/40 lg:ps-6">
          <div className="flex items-center justify-between gap-2">
            <Typography variant="caption" className="font-semibold uppercase tracking-wide text-muted-foreground">
              {t('orders.itemStatusSelect')}
            </Typography>
            <span
              className={`inline-flex max-w-[10rem] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone[st] ?? 'bg-muted text-muted-foreground'}`}
              title={getStatusLabel(item.status)}
            >
              {getStatusLabel(item.status)}
            </span>
          </div>
          <select
            value={st}
            onChange={(e) => onItemStatusChange(item.id, e.target.value as OrderStatus)}
            className="h-11 w-full cursor-pointer rounded-xl border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={itemStatusPending || !parsedItemStatus}
            aria-label={t('orders.itemStatusSelect')}
          >
            {itemStatusOptions.map((s) => (
              <option key={s} value={s}>
                {getStatusLabel(s)}
              </option>
            ))}
          </select>
          {itemStatusPending ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Iconify icon="solar:refresh-bold" className="h-3.5 w-3.5 animate-spin" />
              {t('orders.itemStatusSaving')}
            </div>
          ) : null}
        </Box>
      </div>
    </article>
  );
}
