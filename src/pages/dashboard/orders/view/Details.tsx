import type { ReactNode } from 'react';
import type { OrderFormValues } from '@/columns/one/orders/one';

import { toast } from 'react-toastify';
import { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { useTranslation } from 'react-i18next';
import { Iconify } from '@/shared/components/iconify';
import { useParams, useNavigate } from 'react-router';
import { useForm, FormProvider } from 'react-hook-form';
import { formatMoneyLine } from '@/utils/format-currency';
import { _DriverApi } from '@/pages/dashboard/driver/api/driver.services';
import { joinOrderRoom, leaveOrderRoom, useOrderLocation } from '@/lib/socket';
import { RHFInfiniteSelect } from '@/shared/components/hook-form/rhf-infinite-select';
import { RejectOrderModal } from '@/pages/dashboard/orders/components/RejectOrderModal';
import { OrderLineItemCard } from '@/pages/dashboard/orders/components/OrderLineItemCard';
import {
  useAssignDriver,
  useFetchOrderById,
  useChangeItemStatus,
  useChangeOrderStatus,
} from '@/pages/dashboard/orders/hooks/order';
import {
  type OrderStatus,
  parseOrderStatus,
  orderStatusBlocksAssignDriver,
  getAllowedOrderStatusTransitions,
} from '@/pages/dashboard/orders/types/order.types';

import { CONFIG } from 'src/global-config';
import { Box, Typography } from 'src/shared/ui';

import OrderTrackingMap from '../components/OrderTrackingMap';

// ----------------------------------------------------------------------

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  waiting_approval: 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
  preparing: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  out_delivery: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  delivered: 'bg-green-500/20 text-green-600 dark:text-green-400',
  cancelled: 'bg-muted text-muted-foreground',
  cancelled_by_admin: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  rejected_by_delivery: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  faild_deliver: 'bg-orange-500/15 text-orange-800 dark:text-orange-300',
  returned_by_user: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300',
};

const ORDER_STATUS_I18N: Record<OrderStatus, string> = {
  pending: 'statusPending',
  waiting_approval: 'statusWaitingApproval',
  preparing: 'statusPreparing',
  out_delivery: 'statusOutDelivery',
  delivered: 'statusDelivered',
  cancelled: 'statusCancelled',
  cancelled_by_admin: 'statusCancelledByAdmin',
  rejected_by_delivery: 'statusRejectedByDelivery',
  faild_deliver: 'statusFaildDeliver',
  returned_by_user: 'statusReturnedByUser',
};

/** Prefer API `status_label`; never map unknown keys to pending for display. */
function getOrderStatusLabel(
  statusRaw: string | undefined | null,
  t: (key: string) => string,
  statusLabel?: string | null
): string {
  if (statusLabel?.trim()) return statusLabel.trim();
  const parsed = parseOrderStatus(statusRaw);
  if (parsed) return t(ORDER_STATUS_I18N[parsed]);
  if (statusRaw != null && String(statusRaw).trim() !== '') {
    return String(statusRaw).replace(/_/g, ' ');
  }
  return t('statusPending');
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
};

const driverFetcher = (page: number, limit: number) =>
  _DriverApi.getListDrivers({ page, per_page: limit }).then((r) => ({
    data: {
      items: (r.data?.items ?? []).map((d: { id: number; name?: string; phone: string }) => ({
        id: d.id,
        label: d.name || d.phone,
      })),
      pagination:
        r.data?.pagination ?? { current_page: 1, last_page: 1, per_page: limit, total: 0 },
    },
  }));

type OrderSectionProps = {
  title: string;
  children: ReactNode;
  icon?: string;
  className?: string;
  headerRight?: ReactNode;
};

function OrderSection({ title, children, icon, className, headerRight }: OrderSectionProps) {
  return (
    <Box
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/80 shadow-sm backdrop-blur-sm ${className ?? ''}`}
    >
      <Box className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/15 px-4 py-3.5 sm:px-5">
        <Box className="flex min-w-0 items-center gap-3">
          {icon && (
            <Box className="flex-shrink-0 rounded-lg border border-primary/10 bg-primary/10 p-2">
              <Iconify icon={icon} className="text-primary" width={20} />
            </Box>
          )}
          <Typography variant="subtitle1" className="truncate font-semibold">
            {title}
          </Typography>
        </Box>
        {headerRight}
      </Box>
      <Box className="flex-1 p-4 sm:p-5 md:p-6">{children}</Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

export default function DetailsPage() {
  const { t } = useTranslation('table');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: orderResponse, isLoading, isError } = useFetchOrderById(id!);
  const changeStatusMutation = useChangeOrderStatus();
  const assignDriverMutation = useAssignDriver();
  const changeItemStatusMutation = useChangeItemStatus();

  const assignDriverForm = useForm<{ driver_id: number }>({
    defaultValues: { driver_id: 0 },
  });

  const { watch: watchDriverId, reset: resetDriverForm, setValue: setDriverId } = assignDriverForm;
  const selectedDriverId = watchDriverId('driver_id');
  const order = orderResponse?.data;

  const [statusDraft, setStatusDraft] = useState<OrderStatus>('pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  useEffect(() => {
    if (!order) return;
    const parsed = parseOrderStatus(order.status);
    if (parsed) setStatusDraft(parsed);
  }, [order?.id, order?.status]);

  // Live order tracking via socket
  const isTrackable = order ? parseOrderStatus(order.status) === 'out_delivery' : false;
  const liveLocation = useOrderLocation(isTrackable ? order?.id ?? null : null);

  useEffect(() => {
    if (!isTrackable || !order?.id) return undefined;
    joinOrderRoom(order.id);
    return () => leaveOrderRoom(order.id);
  }, [isTrackable, order?.id]);

  useEffect(() => {
    if (order?.driver?.id) {
      setDriverId('driver_id', order.driver.id);
    }
  }, [order?.driver?.id, setDriverId]);

  if (isLoading) {
    return (
      <Box className="flex items-center justify-center min-h-[400px] p-6">
        <Box className="flex flex-col items-center gap-3">
          <Iconify icon="solar:refresh-bold" className="w-8 h-8 text-primary animate-spin" />
          <Typography variant="body2" className="text-muted-foreground">
            {t('orders.loadingOrderDetails')}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (isError || !order) {
    return (
      <Box className="flex items-center justify-center min-h-[400px] p-6">
        <Box className="w-full max-w-md rounded-xl border border-border/50 shadow-lg bg-background p-6">
          <Box className="flex items-center gap-2 mb-2">
            <Iconify icon="solar:danger-bold" className="w-5 h-5 text-destructive" />
            <Typography variant="h6" className="text-destructive">
              {t('orders.orderNotFound')}
            </Typography>
          </Box>
          <Typography variant="body2" className="text-muted-foreground mb-4">
            {t('orders.failedToLoadOrderDetails')}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/orders')}>
            {t('orders.backToOrders')}
          </Button>
        </Box>
      </Box>
    );
  }

  const parsedOrderStatus = parseOrderStatus(order.status);
  const normalizedOrderStatus = parsedOrderStatus ?? 'pending';
  const canAssignDriver =
    parsedOrderStatus != null && !orderStatusBlocksAssignDriver(parsedOrderStatus);
  const allowedNextStatuses =
    parsedOrderStatus != null ? getAllowedOrderStatusTransitions(parsedOrderStatus) : [];
  const statusSelectOptions: OrderStatus[] =
    parsedOrderStatus != null
      ? [parsedOrderStatus, ...allowedNextStatuses.filter((s) => s !== parsedOrderStatus)]
      : [];

  const handleChangeStatus = async (status: OrderStatus) => {
    if (!parsedOrderStatus) return;
    const previous = parsedOrderStatus;
    try {
      // Always send the canonical API key (e.g. out_delivery, never out_for_delivery / Arabic).
      await changeStatusMutation.mutateAsync({
        id: order.id,
        data: { status },
        queryId: id,
      });
      toast.success(t('statusChangedSuccess'));
    } catch {
      // On 400/422 keep the previous status — do not fall back to pending.
      setStatusDraft(previous);
    }
  };

  const handleApplyOrderStatus = () => {
    if (!parsedOrderStatus) return;
    if (statusDraft === parsedOrderStatus) {
      toast.info(t('orders.sameOrderStatus'));
      return;
    }
    if (!allowedNextStatuses.includes(statusDraft)) {
      setStatusDraft(parsedOrderStatus);
      return;
    }
    if (statusDraft === 'cancelled_by_admin') {
      setRejectModalOpen(true);
      return;
    }
    void handleChangeStatus(statusDraft);
  };

  const handleAssignDriver = async (data: { driver_id: number }) => {
    if (!canAssignDriver) return;
    const driverId = data.driver_id;
    if (!driverId || driverId === 0) return;
    try {
      await assignDriverMutation.mutateAsync({
        id: order.id,
        data: { driver_id: Number(driverId) },
        queryId: id,
      });
      toast.success(t('form.driverAssignedSuccess'));
      resetDriverForm({ driver_id: 0 });
    } catch { return; }
  };

  const handleChangeItemStatus = async (itemId: number, status: OrderStatus) => {
    try {
      await changeItemStatusMutation.mutateAsync({
        itemId,
        data: { status },
        orderId: order.id,
        queryId: id,
      });
      toast.success(t('form.itemStatusUpdated'));
    } catch { return; }
  };

  return (
    <>
      <title>{t('form.orderDetailsDocumentTitle', { appName: CONFIG.appName })}</title>

      <RejectOrderModal
        open={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setStatusDraft(normalizedOrderStatus);
        }}
        order={order as unknown as OrderFormValues}
        t={t}
        queryId={id}
      />
      <Box className="relative min-h-screen overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Box className="pointer-events-none fixed inset-0 bg-gradient-to-br from-background via-background to-muted/30" />

        <Box className="relative mx-auto w-full max-w-7xl">
          {/* Header */}
          <Box className="mb-6 lg:mb-8">
            <Button
              variant="text"
              onClick={() => navigate('/orders')}
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <Iconify icon="solar:arrow-left-bold" width={20} className="mr-2" />
              {t('orders.backToOrders')}
            </Button>

            <Box className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <Box className="flex items-center gap-4">
                <Box className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 sm:h-16 sm:w-16">
                  <Iconify icon="solar:bag-bold" className="text-primary" width={28} height={28} />
                </Box>
                <Box className="min-w-0">
                  <Typography
                    variant="overline"
                    className="mb-0.5 block text-muted-foreground"
                  >
                    {t('orders.orderOverview')}
                  </Typography>
                  <Typography variant="h4" className="mb-1 font-bold text-foreground">
                    {order.order_code}
                  </Typography>
                  <Typography variant="body2" className="text-muted-foreground">
                    {formatDate(order.created_at)}
                  </Typography>
                </Box>
              </Box>
              <span
                className={`inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1.5 text-sm font-medium capitalize ${statusColors[normalizedOrderStatus] ?? 'bg-muted text-muted-foreground'}`}
              >
                {getOrderStatusLabel(order.status, t, order.status_label)}
              </span>
            </Box>
          </Box>

          {/* Actions: status + driver */}
          <Box className="mb-4 grid gap-4 lg:mb-5 lg:grid-cols-2 lg:gap-5">
            <OrderSection title={t('orders.changeOrderStatus')} icon="solar:transfer-horizontal-bold">
              <Box className="flex flex-col gap-4">
                <Box className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColors[normalizedOrderStatus] ?? 'bg-muted text-muted-foreground'}`}
                  >
                    {getOrderStatusLabel(order.status, t, order.status_label)}
                  </span>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.changeOrderStatusHint')}
                  </Typography>
                </Box>
                <Box className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Box className="min-w-0 flex-1 space-y-1.5">
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.selectOrderStatus')}
                    </Typography>
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value as OrderStatus)}
                      disabled={
                        changeStatusMutation.isPending ||
                        !parsedOrderStatus ||
                        allowedNextStatuses.length === 0
                      }
                      className="h-10 w-full max-w-md rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
                    >
                      {statusSelectOptions.map((s) => (
                        <option key={s} value={s}>
                          {getOrderStatusLabel(s, t)}
                        </option>
                      ))}
                    </select>
                  </Box>
                  <Button
                    type="button"
                    variant="contained"
                    onClick={handleApplyOrderStatus}
                    disabled={
                      changeStatusMutation.isPending ||
                      !parsedOrderStatus ||
                      statusDraft === parsedOrderStatus ||
                      allowedNextStatuses.length === 0
                    }
                    className="w-full shrink-0 sm:w-auto"
                  >
                    {changeStatusMutation.isPending ? t('orders.updatingStatus') : t('orders.applyOrderStatus')}
                  </Button>
                </Box>
              </Box>
            </OrderSection>

            <OrderSection title={t('orders.assignDriver')} icon="solar:user-id-bold">
              {order.driver && (
                <Typography variant="body2" className="mb-3 text-muted-foreground">
                  {t('orders.currentDriver')}{' '}
                  <span className="font-medium text-foreground">{order.driver.name}</span>{' '}
                  <span className="text-muted-foreground">({order.driver.phone})</span>
                </Typography>
              )}
              {!canAssignDriver ? (
                <Typography variant="caption" className="mb-3 block text-muted-foreground">
                  {t('orders.assignDriverDisabledDeliveredOrOut')}
                </Typography>
              ) : null}
              <FormProvider {...assignDriverForm}>
                <form
                  onSubmit={assignDriverForm.handleSubmit(handleAssignDriver)}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <Box className="min-w-0 flex-1">
                    <RHFInfiniteSelect
                      name="driver_id"
                      queryKey={['order', 'assign-driver', id]}
                      fetcher={driverFetcher}
                      placeholder={t('form.selectDriver')}
                      initialLabel={order.driver?.name}
                      pageSize={10}
                      disabled={!canAssignDriver}
                    />
                  </Box>
                  <Button
                    type="submit"
                    variant="contained"
                    className="w-full shrink-0 sm:w-auto"
                    disabled={
                      !canAssignDriver ||
                      !selectedDriverId ||
                      selectedDriverId === 0 ||
                      assignDriverMutation.isPending
                    }
                  >
                    {t('orders.assign')}
                  </Button>
                </form>
              </FormProvider>
            </OrderSection>
          </Box>

          {/* Order info + customer */}
          <Box className="mb-4 grid gap-4 lg:mb-5 lg:grid-cols-2 lg:gap-5">
            <OrderSection title={t('orders.orderInformation')} icon="solar:clipboard-list-bold">
              <Box className="grid gap-4 sm:grid-cols-2">
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.orderCode')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {order.order_code}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.cartType')}
                  </Typography>
                  <Typography variant="body1" className="font-medium capitalize">
                    {order.cart_type}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.instantDelivery')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {order.is_instant_delivery ? t('common.yes') : t('common.no')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.isPaid')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {order.is_paid ? t('common.yes') : t('common.no')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.assignedBy')}
                  </Typography>
                  <Typography variant="body1" className="font-medium capitalize">
                    {order.assigned_by || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.totalQuantity')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {order.total_quantity}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.createdAt')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {formatDate(order.created_at)}
                  </Typography>
                </Box>
                {order.rejection_reason ? (
                  <Box className="sm:col-span-2">
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('rejectionReason')}
                    </Typography>
                    <Typography variant="body2" className="mt-1 rounded-lg border border-border/60 bg-muted/30 p-3 text-foreground">
                      {order.rejection_reason}
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            </OrderSection>

            <OrderSection title={t('orders.customer')} icon="solar:user-bold">
              <Box className="grid gap-4 sm:grid-cols-2">
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.name')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {order.user?.name || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.email')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {order.user?.email || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.phone')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {order.user?.phone || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.memberSince')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {formatDate(order.user?.created_at)}
                  </Typography>
                </Box>
                {order.user?.affiliate?.is_affiliate && (
                  <Box className="sm:col-span-2">
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.affiliateId')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.user.affiliate.affiliate_id}
                    </Typography>
                  </Box>
                )}
              </Box>
            </OrderSection>
          </Box>

          {/* Delivery Address */}
          {order.user_address && (
            <Box className="mb-4 lg:mb-5">
              <OrderSection title={t('orders.deliveryAddress')} icon="solar:delivery-bold">
                <Box className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.label')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.user_address.label || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.area')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.user_address.area || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.streetName')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.user_address.street_name || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.buildingNumber')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.user_address.building_number || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.floorApartment')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.user_address.floor_apartment || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.nearestLandmark')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.user_address.nearest_landmark || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.contactPhone')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.user_address.contact_phone || '-'}
                    </Typography>
                  </Box>
                  {(order.user_address.lat != null || order.user_address.lng != null) && (
                    <Box>
                      <Typography variant="caption" className="text-muted-foreground">
                        {t('orders.coordinates')}
                      </Typography>
                      <Typography variant="body1" className="font-medium">
                        {order.user_address.lat}, {order.user_address.lng}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </OrderSection>
            </Box>
          )}

          {/* Live Order Tracking Map */}
          {isTrackable && order.user_address?.lat != null && order.user_address?.lng != null && (
            <Box className="mb-4 lg:mb-5">
              <OrderSection
                title={t('orders.liveTracking')}
                icon="solar:map-bold"
                headerRight={
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                  </span>
                }
              >
                <OrderTrackingMap
                  destinationLat={Number(order.user_address.lat)}
                  destinationLng={Number(order.user_address.lng)}
                  destinationLabel={order.user_address.label}
                  driverLocation={liveLocation}
                  driverName={order.driver?.name}
                  height="450px"
                />
              </OrderSection>
            </Box>
          )}

          {/* Pricing + timeline */}
          <Box className="mb-4 grid gap-4 lg:mb-5 lg:grid-cols-2 lg:gap-5">
            <OrderSection title={t('orders.pricing')} icon="solar:wallet-money-bold">
              <Box className="grid gap-4 sm:grid-cols-2">
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.subtotal')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {formatMoneyLine(order.subtotal_formatted, order.subtotal)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.deliveryPrice')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {formatMoneyLine(order.delivery_price_formatted, order.delivery_price)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.totalWithDelivery')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {formatMoneyLine(
                      order.total_formatted,
                      order.total_with_delivery ?? order.total
                    )}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.basketDiscount')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {formatMoneyLine(order.basket_discount_formatted, order.basket_discount)}
                  </Typography>
                </Box>
                {order.coupon_discount != null && order.coupon_discount !== 0 && (
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.couponDiscount')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.coupon_discount}
                    </Typography>
                  </Box>
                )}
                {order.coupon_discount_from_points != null &&
                  order.coupon_discount_from_points !== '0' &&
                  order.coupon_discount_from_points !== '0.00' && (
                    <Box>
                      <Typography variant="caption" className="text-muted-foreground">
                        {t('orders.couponDiscountFromPoints')}
                      </Typography>
                      <Typography variant="body1" className="font-medium">
                        {order.coupon_discount_from_points}
                      </Typography>
                    </Box>
                  )}
                {order.free_delivery_from_points != null &&
                  order.free_delivery_from_points !== 0 && (
                    <Box>
                      <Typography variant="caption" className="text-muted-foreground">
                        {t('orders.freeDeliveryFromPoints')}
                      </Typography>
                      <Typography variant="body1" className="font-medium">
                        {order.free_delivery_from_points}
                      </Typography>
                    </Box>
                  )}
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.total')}
                  </Typography>
                  <Typography variant="body1" className="font-bold text-primary">
                    {formatMoneyLine(order.total_formatted, order.total)}
                  </Typography>
                </Box>
              </Box>
            </OrderSection>

            <OrderSection title={t('orders.statusTimeline')} icon="solar:history-bold">
              <Box className="grid gap-4 sm:grid-cols-2">
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.pendingAt')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {formatDate(order.timestamps.pending_at)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.preparingAt')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {formatDate(order.timestamps.preparing_at)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.outForDeliveryAt')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {formatDate(order.timestamps.out_delivery_at)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.deliveredAt')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {formatDate(order.timestamps.delivered_at)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('orders.returnedByUserAt')}
                  </Typography>
                  <Typography variant="body1" className="font-medium">
                    {formatDate(order.timestamps.returned_by_user_at)}
                  </Typography>
                </Box>
              </Box>
            </OrderSection>
          </Box>

          {/* Affiliate + driver details */}
          {(order.affiliate || order.driver) && (
            <Box
              className={`mb-4 grid gap-4 lg:mb-5 lg:gap-5 ${order.affiliate && order.driver ? 'lg:grid-cols-2' : ''}`}
            >
              {order.affiliate && (
                <OrderSection title={t('orders.affiliate')} icon="solar:users-group-rounded-bold">
                  <Box className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.rate')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.affiliate.affiliate_rate}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.source')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.affiliate.affiliate_source}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.commission')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.affiliate.affiliate_commission}
                    </Typography>
                  </Box>
                  {order.affiliate.affiliate_commission_type && (
                    <Box>
                      <Typography variant="caption" className="text-muted-foreground">
                        {t('orders.affiliateCommissionType')}
                      </Typography>
                      <Typography variant="body1" className="font-medium">
                        {order.affiliate.affiliate_commission_type}
                      </Typography>
                    </Box>
                  )}
                  {order.affiliate.affiliate_fixed_commission != null &&
                    order.affiliate.affiliate_fixed_commission !== '' && (
                      <Box>
                        <Typography variant="caption" className="text-muted-foreground">
                          {t('orders.affiliateFixedCommission')}
                        </Typography>
                        <Typography variant="body1" className="font-medium">
                          {String(order.affiliate.affiliate_fixed_commission)}
                        </Typography>
                      </Box>
                    )}
                  {order.affiliate.affiliate_commission_amount != null && (
                    <Box>
                      <Typography variant="caption" className="text-muted-foreground">
                        {t('orders.affiliateCommissionAmount')}
                      </Typography>
                      <Typography variant="body1" className="font-medium">
                        {order.affiliate.affiliate_commission_amount}
                      </Typography>
                    </Box>
                  )}
                </Box>
                </OrderSection>
              )}

              {order.driver && (
                <OrderSection title={t('orders.driver')} icon="solar:scooter-bold">
                  <Box className="grid gap-4 sm:grid-cols-2">
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.name')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.driver.name}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.phone')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.driver.phone}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.status')}
                    </Typography>
                    <Typography variant="body1" className="font-medium capitalize">
                      {order.driver.status}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.averageRating')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.driver.average_rating}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.totalOrders')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.driver.total_orders}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.completedOrders')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.driver.completed_orders}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.totalEarnings')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.driver.total_earnings}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('orders.ratePerOrder')}
                    </Typography>
                    <Typography variant="body1" className="font-medium">
                      {order.driver.rate_per_order}
                    </Typography>
                  </Box>
                </Box>
                </OrderSection>
              )}
            </Box>
          )}

          {/* Order Items */}
          <OrderSection
            title={t('orders.orderItems')}
            icon="solar:cart-large-2-bold"
            headerRight={
              order.items?.length ? (
                <span className="shrink-0 rounded-full border border-border/50 bg-muted/40 px-3 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
                  {t('orders.itemsCountBadge', { count: order.items.length })}
                </span>
              ) : undefined
            }
          >
            <Box className="space-y-5">
              {!order.items?.length ? (
                <Box className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/10 py-14">
                  <Iconify icon="solar:cart-cross-bold" width={48} className="text-muted-foreground/40" />
                  <Typography variant="body2" className="text-muted-foreground">
                    {t('orders.noOrderItems')}
                  </Typography>
                </Box>
              ) : (
                order.items.map((item, index) => (
                  <OrderLineItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    t={t}
                    statusTone={statusColors}
                    getStatusLabel={(s) => getOrderStatusLabel(s, t, undefined)}
                    onItemStatusChange={handleChangeItemStatus}
                    itemStatusPending={changeItemStatusMutation.isPending}
                  />
                ))
              )}
            </Box>
          </OrderSection>
        </Box>
      </Box>
    </>
  );
}
