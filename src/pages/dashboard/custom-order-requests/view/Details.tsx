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
  pending_pricing: 'border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300',
  waiting_approval: 'border-sky-500/30 bg-sky-500/15 text-sky-800 dark:text-sky-300',
  cancelled: 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400',
  approved: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  converted: 'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300',
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
  const statusClass =
    statusColors[status] ?? 'border-border bg-muted text-muted-foreground';

  const handleConvert = async (payload: ConvertCustomOrderPayload) => {
    if (!id) return;
    try {
      const res = await convertMutation.mutateAsync({ id, payload });
      const newOrderId =
        res?.data?.order_id ??
        res?.data?.order?.id ??
        res?.data?.id ??
        getLinkedOrderId(res?.data ?? {});
      const parsed =
        newOrderId != null && Number(newOrderId) > 0 ? Number(newOrderId) : null;
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

      <Box className="relative w-full min-h-screen overflow-hidden bg-background">
        <Box className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <Button
            variant="text"
            onClick={() => navigate('/custom-order-requests')}
            className="-ms-2 mb-6 text-muted-foreground hover:text-foreground"
          >
            <Iconify icon="solar:arrow-left-bold" width={20} className="me-2" />
            {t('form.backLabel')}
          </Button>

          <Box className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <Box>
              <Box className="mb-2 flex flex-wrap items-center gap-2">
                <Typography variant="h4" className="font-bold tracking-tight">
                  {t('form.customOrderRequestTitle', { id: item.id })}
                </Typography>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}
                >
                  {getCustomOrderRequestStatusLabel(
                    item,
                    t(`form.customOrderRequestStatus_${status}`, { defaultValue: status })
                  )}
                </span>
              </Box>
              <Typography variant="body2" className="text-muted-foreground">
                {[
                  getCustomOrderRequestUserName(item),
                  getCustomOrderRequestUserPhone(item),
                  customOrderDisplayText(item.user?.email),
                ]
                  .filter((part) => part && part !== '—')
                  .join(' · ')}
              </Typography>
              {getCustomOrderRequestCreatedAt(item) !== '—' && (
                <Typography variant="caption" className="mt-1 block text-muted-foreground">
                  {getCustomOrderRequestCreatedAt(item)}
                </Typography>
              )}
            </Box>

            <Box className="flex flex-wrap gap-2">
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
            <Box className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
              <Typography variant="subtitle2" className="font-semibold text-emerald-900 dark:text-emerald-200">
                {t('form.customOrderRequestConvertSuccess')}
              </Typography>
              <Typography variant="body2" className="text-muted-foreground">
                {t('form.customOrderRequestLinkedOrder', { id: convertedOrderId })}
              </Typography>
              <Link
                to={`/orders/details/${convertedOrderId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
              >
                <Iconify icon="solar:bag-5-bold" width={18} />
                {t('form.customOrderRequestOpenOrder', { id: convertedOrderId })}
              </Link>
            </Box>
          )}

          {showCancel && canUpdate && canCancelStatus && (
            <Box className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <Typography variant="subtitle2" className="font-semibold">
                {t('form.customOrderRequestCancelTitle')}
              </Typography>
              <textarea
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                rows={3}
                placeholder={t('form.customOrderRequestRejectionPlaceholder')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <Box className="flex gap-2">
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
            <Box className="mb-6 grid gap-3 sm:grid-cols-2">
              {item.rejection_reason && (
                <Box className="rounded-xl border border-border bg-card p-4">
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('form.customOrderRequestRejectionReason')}
                  </Typography>
                  <Typography variant="body2" className="mt-1">
                    {customOrderDisplayText(item.rejection_reason) || '—'}
                  </Typography>
                </Box>
              )}
              {item.admin_note && (
                <Box className="rounded-xl border border-border bg-card p-4">
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('form.customOrderRequestAdminNote')}
                  </Typography>
                  <Typography variant="body2" className="mt-1">
                    {customOrderDisplayText(item.admin_note) || '—'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          <Box className="grid gap-6 lg:grid-cols-2">
            {/* Customer request */}
            <Box className="space-y-4">
              <Box className="rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm">
                <Typography variant="subtitle2" className="mb-3 font-semibold">
                  {t('form.customOrderRequestCustomerText')}
                </Typography>
                <Typography variant="body1" className="whitespace-pre-wrap text-foreground/90">
                  {customerText}
                </Typography>
              </Box>

              <Box className="rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm space-y-3">
                <FieldRow label={t('form.customOrderRequestAddress')} value={address} />
                <FieldRow label={t('form.customOrderRequestExpectedTime')} value={expectedTime} />
                <FieldRow
                  label={t('columns.paymentMethod')}
                  value={getCustomOrderRequestPaymentMethodLabel(item)}
                />
              </Box>

              <Box className="rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm">
                <Typography variant="subtitle2" className="mb-3 font-semibold">
                  {t('form.customOrderRequestCustomerImages')}
                </Typography>
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
                        className="aspect-square overflow-hidden rounded-xl border border-border/50 bg-muted/30"
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Convert / status panel */}
            <Box className="rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm">
              {isPendingPricing && canUpdate ? (
                <ConvertCustomOrderForm
                  onSubmit={handleConvert}
                  isSubmitting={convertMutation.isPending}
                />
              ) : (
                <Box className="space-y-3">
                  <Typography variant="subtitle2" className="font-semibold">
                    {t('form.customOrderRequestStatusPanel')}
                  </Typography>
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
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" className="text-muted-foreground">
        {label}
      </Typography>
      <Typography variant="body2" className="mt-0.5 font-medium text-foreground">
        {value}
      </Typography>
    </Box>
  );
}
