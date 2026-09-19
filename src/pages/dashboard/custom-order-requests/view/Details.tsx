import type { ReactNode } from 'react';
import type { ConvertCustomOrderPayload } from '@/pages/dashboard/custom-order-requests/types/custom-order-request.types';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Iconify } from '@/shared/components/iconify';
import { Link, useParams, useNavigate } from 'react-router';
import { usePermissions } from '@/auth/hooks/use-permissions';
import { ConvertCustomOrderForm } from '@/pages/dashboard/custom-order-requests/components/ConvertCustomOrderForm';
import {
  useCancelCustomOrderRequest,
  useConvertCustomOrderRequest,
  useFetchCustomOrderRequestById,
} from '@/pages/dashboard/custom-order-requests/hooks/custom-order-request';
import {
  getLinkedOrderId,
  customOrderDisplayText,
  getCustomOrderRequestText,
  getCustomOrderRequestAddress,
  getCustomOrderRequestUserName,
  getCustomOrderRequestUserPhone,
  getCustomOrderRequestImageUrls,
  getCustomOrderRequestCreatedAt,
  getCustomOrderRequestStatusKey,
  getCustomOrderRequestStatusLabel,
  getCustomOrderRequestExpectedTime,
  getCustomOrderRequestPaymentMethodLabel,
} from '@/pages/dashboard/custom-order-requests/utils/display';

import { CONFIG } from 'src/global-config';
import { Box, Button, Typography } from 'src/shared/ui';
import { LoadingScreen } from 'src/shared/components/loading-screen';

const statusColors: Record<string, string> = {
  pending_pricing: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  waiting_approval: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
  cancelled: 'bg-muted text-muted-foreground',
  approved: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  converted: 'bg-violet-500/15 text-violet-800 dark:text-violet-300',
};

export default function DetailsPage() {
  const { t } = useTranslation('table');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canAny } = usePermissions();
  const canUpdate = canAny([
    'customorderrequest.update',
    'custom_order_request.update',
    'order.update',
  ]);

  const [rejectionReason, setRejectionReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [convertedOrderId, setConvertedOrderId] = useState<number | null>(null);

  const { data: response, isLoading } = useFetchCustomOrderRequestById(id || '');
  const convertMutation = useConvertCustomOrderRequest();
  const cancelMutation = useCancelCustomOrderRequest();

  const item = response?.data;

  if (isLoading) return <LoadingScreen />;

  if (!item) {
    return (
      <Box className="flex min-h-[400px] items-center justify-center p-6">
        <Typography variant="h6" className="text-destructive">
          {t('form.requestNotFound')}
        </Typography>
      </Box>
    );
  }

  const status = getCustomOrderRequestStatusKey(item);
  const isPendingPricing = status === 'pending_pricing';
  const canCancelStatus = status === 'pending_pricing' || status === 'waiting_approval';
  const customerText = getCustomOrderRequestText(item);
  const address = getCustomOrderRequestAddress(item);
  const expectedTime = getCustomOrderRequestExpectedTime(item);
  const images = getCustomOrderRequestImageUrls(item);
  const orderId = convertedOrderId ?? getLinkedOrderId(item);
  const statusClass = statusColors[status] ?? 'bg-muted text-muted-foreground';
  const customerName = getCustomOrderRequestUserName(item);
  const customerPhone = getCustomOrderRequestUserPhone(item);
  const customerEmail = customOrderDisplayText(item.user?.email);
  const createdAt = getCustomOrderRequestCreatedAt(item);
  const paymentMethod = getCustomOrderRequestPaymentMethodLabel(item);
  const statusLabel = getCustomOrderRequestStatusLabel(
    item,
    t(`form.customOrderRequestStatus_${status}`, { defaultValue: status })
  );

  const handleConvert = async (payload: ConvertCustomOrderPayload) => {
    if (!id) return;
    try {
      const res = await convertMutation.mutateAsync({ id, payload });
      const newOrderId =
        res?.data?.order_id ??
        res?.data?.order?.id ??
        res?.data?.id ??
        getLinkedOrderId(res?.data ?? {});
      const parsed = newOrderId != null && Number(newOrderId) > 0 ? Number(newOrderId) : null;
      if (parsed) {
        setConvertedOrderId(parsed);
      }
      toast.success(t('form.customOrderRequestConvertSuccess'));
      if (parsed) {
        toast.info(t('form.customOrderRequestLinkedOrder', { id: parsed }));
      }
    } catch {
      // axios interceptor toasts API errors
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!rejectionReason.trim()) {
      toast.error(t('form.customOrderRequestRejectionRequired'));
      return;
    }
    try {
      await cancelMutation.mutateAsync({
        id,
        payload: { rejection_reason: rejectionReason.trim() },
      });
      toast.success(t('form.customOrderRequestCancelSuccess'));
      setShowCancel(false);
      setRejectionReason('');
    } catch {
      // axios interceptor toasts API errors
    }
  };

  return (
    <>
      <title>
        {t('form.customOrderRequestDetailsDocumentTitle', { id: item.id, appName: CONFIG.appName })}
      </title>

      {lightboxUrl && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
          />
        </button>
      )}

      <Box className="relative min-h-screen overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Box className="pointer-events-none fixed inset-0 bg-gradient-to-br from-background via-background to-muted/30" />

        <Box className="relative mx-auto w-full max-w-7xl">
          <Button
            variant="text"
            onClick={() => navigate('/custom-order-requests')}
            className="-ms-2 mb-4 text-muted-foreground hover:text-foreground"
          >
            <Iconify icon="solar:arrow-left-bold" width={20} className="me-2" />
            {t('form.backLabel')}
          </Button>

          <Box className="mb-6 flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:mb-8">
            <Box className="flex min-w-0 items-start gap-4">
              <Box className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 sm:h-16 sm:w-16">
                <Iconify icon="solar:clipboard-list-bold" className="text-primary" width={28} />
              </Box>
              <Box className="min-w-0">
                <Typography variant="overline" className="mb-0.5 block text-muted-foreground">
                  {t('form.customOrderRequestKicker')}
                </Typography>
                <Box className="mb-1 flex flex-wrap items-center gap-2">
                  <Typography variant="h4" className="font-bold tracking-tight text-foreground">
                    {t('form.customOrderRequestTitle', { id: item.id })}
                  </Typography>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}
                  >
                    {statusLabel}
                  </span>
                </Box>
                <Typography variant="body2" className="text-muted-foreground">
                  {[customerName, customerPhone, customerEmail].filter((part) => part && part !== '—').join(' · ')}
                </Typography>
                {createdAt !== '—' && (
                  <Typography variant="caption" className="mt-1 block text-muted-foreground">
                    {createdAt}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box className="flex shrink-0 flex-wrap gap-2">
              {orderId != null && (
                <Link
                  to={`/orders/details/${orderId}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  <Iconify icon="solar:bag-5-bold" width={18} />
                  {t('form.customOrderRequestOpenOrder', { id: orderId })}
                </Link>
              )}
              {canUpdate && canCancelStatus && (
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => setShowCancel((v) => !v)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Iconify icon="solar:close-circle-bold" width={18} className="me-1" />
                  {t('form.customOrderRequestCancelAction')}
                </Button>
              )}
            </Box>
          </Box>

          {convertedOrderId != null && (
            <Box className="mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <Box>
                <Typography variant="subtitle2" className="font-semibold text-emerald-900 dark:text-emerald-200">
                  {t('form.customOrderRequestConvertSuccess')}
                </Typography>
                <Typography variant="body2" className="text-muted-foreground">
                  {t('form.customOrderRequestLinkedOrder', { id: convertedOrderId })}
                </Typography>
              </Box>
              <Link
                to={`/orders/details/${convertedOrderId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-background/70 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
              >
                <Iconify icon="solar:bag-5-bold" width={18} />
                {t('form.customOrderRequestOpenOrder', { id: convertedOrderId })}
              </Link>
            </Box>
          )}

          {showCancel && canUpdate && canCancelStatus && (
            <Box className="mb-6 rounded-2xl border border-destructive/25 bg-destructive/5 p-5">
              <Typography variant="subtitle2" className="mb-3 font-semibold">
                {t('form.customOrderRequestCancelTitle')}
              </Typography>
              <textarea
                className="mb-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                rows={3}
                placeholder={t('form.customOrderRequestRejectionPlaceholder')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <Box className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {cancelMutation.isPending
                    ? t('form.customOrderRequestCancelling')
                    : t('form.customOrderRequestConfirmCancel')}
                </Button>
                <Button type="button" variant="outlined" onClick={() => setShowCancel(false)}>
                  {t('form.backLabel')}
                </Button>
              </Box>
            </Box>
          )}

          {(item.rejection_reason || item.admin_note) && (
            <Box className="mb-6 grid gap-4 sm:grid-cols-2">
              {item.rejection_reason ? (
                <Section title={t('form.customOrderRequestRejectionReason')} icon="solar:danger-triangle-bold">
                  <Typography variant="body2">{customOrderDisplayText(item.rejection_reason) || '—'}</Typography>
                </Section>
              ) : null}
              {item.admin_note ? (
                <Section title={t('form.customOrderRequestAdminNote')} icon="solar:document-text-bold">
                  <Typography variant="body2">{customOrderDisplayText(item.admin_note) || '—'}</Typography>
                </Section>
              ) : null}
            </Box>
          )}

          <Box className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
            <Box className="space-y-5 lg:col-span-5">
              <Section title={t('form.customOrderRequestCustomerText')} icon="solar:chat-round-dots-bold">
                <Typography variant="body1" className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {customerText}
                </Typography>
              </Section>

              <Section title={t('form.customOrderRequestAddress')} icon="solar:map-point-bold">
                <dl className="space-y-3">
                  <MetaRow label={t('form.customOrderRequestAddress')} value={address} />
                  <MetaRow label={t('form.customOrderRequestExpectedTime')} value={expectedTime} />
                  <MetaRow label={t('columns.paymentMethod')} value={paymentMethod} />
                </dl>
              </Section>

              <Section title={t('form.customOrderRequestCustomerImages')} icon="solar:gallery-bold">
                {images.length === 0 ? (
                  <Typography variant="body2" className="text-muted-foreground">
                    {t('form.customOrderRequestNoImages')}
                  </Typography>
                ) : (
                  <Box className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {images.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setLightboxUrl(url)}
                        className="aspect-square overflow-hidden rounded-xl border border-border/50 bg-muted/30 transition hover:ring-2 hover:ring-primary/30"
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </Box>
                )}
              </Section>
            </Box>

            <Box className="lg:sticky lg:top-6 lg:col-span-7">
              <Section
                title={
                  isPendingPricing
                    ? t('form.customOrderRequestBuildItems')
                    : t('form.customOrderRequestStatusPanel')
                }
                icon="solar:wallet-money-bold"
              >
                {isPendingPricing && canUpdate ? (
                  <ConvertCustomOrderForm
                    onSubmit={handleConvert}
                    isSubmitting={convertMutation.isPending}
                  />
                ) : (
                  <Box className="space-y-3">
                    <Typography variant="body2" className="text-muted-foreground">
                      {isPendingPricing
                        ? t('form.customOrderRequestNoUpdatePermission')
                        : t('form.customOrderRequestNotPendingPricing')}
                    </Typography>
                    {orderId != null && (
                      <Link
                        to={`/orders/details/${orderId}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                        <Iconify icon="solar:arrow-right-up-bold" width={16} />
                        {t('form.customOrderRequestOpenOrder', { id: orderId })}
                      </Link>
                    )}
                  </Box>
                )}
              </Section>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <Box className="overflow-hidden rounded-2xl border border-border/50 bg-card/80 shadow-sm backdrop-blur-sm">
      <Box className="flex items-center gap-3 border-b border-border/40 bg-muted/15 px-4 py-3.5 sm:px-5">
        <Box className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/10">
          <Iconify icon={icon} className="text-primary" width={18} />
        </Box>
        <Typography variant="subtitle1" className="font-semibold">
          {title}
        </Typography>
      </Box>
      <Box className="p-4 sm:p-5">{children}</Box>
    </Box>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
