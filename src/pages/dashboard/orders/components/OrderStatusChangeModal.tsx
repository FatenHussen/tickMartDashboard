import type { TFunction } from 'i18next';
import type { OrderStatus } from '@/pages/dashboard/orders/types/order.types';

import { Modal } from '@/shared/ui/modal';
import { Button } from '@/shared/ui/button';
import { SimpleSelect } from '@/shared/ui/select';
import { Iconify } from '@/shared/components/iconify';
import {
  normalizeOrderStatus,
  ORDER_STATUS_PIPELINE,
  getUpcomingOrderStatuses,
  getAllowedOrderStatusTransitions,
} from '@/pages/dashboard/orders/types/order.types';

const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: 'solar:hourglass-bold',
  waiting_approval: 'solar:hand-heart-bold',
  preparing: 'solar:chef-hat-bold',
  out_delivery: 'solar:delivery-bold',
  delivered: 'solar:check-circle-bold',
  cancelled: 'solar:close-circle-bold',
  cancelled_by_admin: 'solar:shield-cross-bold',
  rejected_by_delivery: 'solar:delivery-bold',
  faild_deliver: 'solar:danger-triangle-bold',
  returned_by_user: 'solar:undo-left-bold',
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Raw order ref string */
  orderRef: string;
  /** Current status from API */
  currentStatusRaw: string | undefined;
  chosenStatus: OrderStatus;
  onChosenStatus: (s: OrderStatus) => void;
  onApply: () => void;
  isBusy: boolean;
  t: TFunction<'table'>;
  orderStatusLabel: (s: OrderStatus) => string;
};

export function OrderStatusChangeModal({
  open,
  onClose,
  orderRef,
  currentStatusRaw,
  chosenStatus,
  onChosenStatus,
  onApply,
  isBusy,
  t,
  orderStatusLabel,
}: Props) {
  const current = normalizeOrderStatus(currentStatusRaw);
  const upcoming = getUpcomingOrderStatuses(current);
  const transitionOptions = getAllowedOrderStatusTransitions(current);
  const selectOptions = upcoming.length > 0 ? upcoming : transitionOptions;
  const pipelineIdx = ORDER_STATUS_PIPELINE.indexOf(current);
  const inPipeline = pipelineIdx >= 0;

  return (
    <Modal
      open={open}
      onClose={isBusy ? undefined : onClose}
      maxWidth="md"
      disableBackdropClick={isBusy}
      disableEscapeKeyDown={isBusy}
      className="overflow-hidden rounded-2xl border border-border/60 shadow-2xl shadow-primary/10"
    >
      <div className="relative flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-violet-600 px-6 pb-12 pt-7 text-primary-foreground">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 left-1/4 h-32 w-32 rounded-full bg-violet-400/30 blur-3xl"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_40%,rgba(255,255,255,0.06)_50%,transparent_60%)]" />

          <div className="relative flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-md">
              <Iconify icon="solar:bag-smile-bold" width={36} height={36} className="text-white" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                {t('changeOrderStatusModalKicker')}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                {t('changeOrderStatusModalTitle')}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="max-w-full truncate rounded-lg bg-black/20 px-2.5 py-1 text-xs font-mono text-white/95 ring-1 ring-white/15">
                  {orderRef}
                </code>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="absolute end-0 top-0 rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label={t('back')}
            >
              <Iconify icon="solar:close-circle-bold" width={22} height={22} />
            </button>
          </div>
        </div>

        {/* Overlapping card */}
        <div className="relative -mt-8 flex flex-1 flex-col rounded-t-3xl border-x border-t border-border/60 bg-background px-5 pb-5 pt-6 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.35)] sm:px-7">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('changeOrderStatusModalHint')}
          </p>

          {/* Mini pipeline */}
          <div className="mt-5 rounded-2xl border border-border/50 bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('orderStatusPipelineLabel')}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {inPipeline
                ? ORDER_STATUS_PIPELINE.map((s, i) => {
                    const isPast = i < pipelineIdx;
                    const isCurrent = i === pipelineIdx;
                    const isFuture = i > pipelineIdx;
                    return (
                      <div key={s} className="flex items-center gap-1.5">
                        {i > 0 ? (
                          <Iconify
                            icon="solar:alt-arrow-right-linear"
                            width={14}
                            className="shrink-0 text-muted-foreground/50"
                          />
                        ) : null}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${
                            isCurrent
                              ? 'bg-primary text-primary-foreground ring-primary/30'
                              : isPast
                                ? 'bg-emerald-500/10 text-emerald-800 ring-emerald-500/20 dark:text-emerald-300'
                                : isFuture
                                  ? 'bg-muted/80 text-muted-foreground ring-border/60'
                                  : 'bg-muted/50 text-muted-foreground ring-border/40'
                          }`}
                        >
                          <Iconify icon={STATUS_ICONS[s]} width={14} className="shrink-0 opacity-90" />
                          {orderStatusLabel(s)}
                        </span>
                      </div>
                    );
                  })
                : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border/60">
                      <Iconify icon={STATUS_ICONS[current]} width={16} />
                      {orderStatusLabel(current)}
                    </span>
                  )}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <span className="text-xs font-medium text-muted-foreground">{t('columns.status')}</span>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-border/70 bg-card"
              >
                <Iconify icon={STATUS_ICONS[current]} width={18} />
                {orderStatusLabel(current)}
              </span>
            </div>
          </div>

          {selectOptions.length > 0 ? (
            <div className="mt-6">
              <SimpleSelect
                label={t('newOrderStatusLabel')}
                fullWidth
                value={chosenStatus}
                onChange={(v) => onChosenStatus(v as OrderStatus)}
                options={selectOptions.map((s) => ({
                  value: s,
                  label: orderStatusLabel(s),
                }))}
                disabled={isBusy}
              />
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
              <Iconify icon="solar:info-circle-bold" width={22} className="shrink-0 text-amber-500/90" />
              {t('noUpcomingOrderStatus')}
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-5">
            <Button type="button" variant="outlined" onClick={onClose} disabled={isBusy}>
              {t('back')}
            </Button>
            <Button
              type="button"
              onClick={() => void onApply()}
              disabled={
                isBusy ||
                selectOptions.length === 0 ||
                !selectOptions.includes(chosenStatus) ||
                chosenStatus === current
              }
            >
              {isBusy ? t('updating') : t('save')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
