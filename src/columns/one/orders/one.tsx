import type { TFunction } from 'i18next';
import type { NavigateFunction } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';

import { z } from 'zod';
import { Iconify } from '@/shared/components/iconify';
import { formatDecimal } from '@/utils/format-currency';
import { TableTonedStatusPill } from '@/shared/components/table-status-badges';
import { DataTableColumnHeader } from '@/shared/ui/table-data/data-table-column-header';
import {
  type OrderData,
  type OrderStatus,
  parseOrderStatus,
  normalizeOrderStatus,
} from '@/pages/dashboard/orders/types/order.types';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/shared/ui/dropdown-menu';

import { CONFIG } from 'src/global-config';

const OrderSchema = z.object({
  id: z.number(),
  order_code: z.string().optional(),
  order_number: z.string().optional(),
  status: z.string(),
  total: z.number(),
  created_at: z.string(),
});

export interface OrderFormValues extends OrderData {
  [key: string]: any;
}

const ORDER_STATUS_BADGE: Record<
  OrderStatus,
  { icon: string; className: string }
> = {
  pending: {
    icon: 'solar:hourglass-bold',
    className: 'border-amber-700 bg-amber-500',
  },
  waiting_approval: {
    icon: 'solar:hand-heart-bold',
    className: 'border-sky-800 bg-sky-600',
  },
  preparing: {
    icon: 'solar:chef-hat-bold',
    className: 'border-sky-800 bg-sky-600',
  },
  out_delivery: {
    icon: 'solar:delivery-bold',
    className: 'border-violet-800 bg-violet-600',
  },
  delivered: {
    icon: 'solar:check-circle-bold',
    className: 'border-emerald-800 bg-emerald-600',
  },
  cancelled: {
    icon: 'solar:close-circle-bold',
    className: 'border-slate-700 bg-slate-600',
  },
  cancelled_by_admin: {
    icon: 'solar:shield-cross-bold',
    className: 'border-rose-800 bg-rose-600',
  },
  rejected_by_delivery: {
    icon: 'solar:delivery-bold',
    className: 'border-orange-800 bg-orange-600',
  },
  faild_deliver: {
    icon: 'solar:danger-triangle-bold',
    className: 'border-orange-800 bg-orange-600',
  },
  returned_by_user: {
    icon: 'solar:undo-left-bold',
    className: 'border-cyan-800 bg-cyan-600',
  },
};

function getOrderStatusLabel(
  status: OrderStatus,
  t: TFunction<'table'>,
  statusLabel?: string | null
): string {
  if (statusLabel?.trim()) return statusLabel.trim();
  const labels: Record<OrderStatus, string> = {
    pending: t('statusPending'),
    waiting_approval: t('statusWaitingApproval'),
    preparing: t('statusPreparing'),
    out_delivery: t('statusOutDelivery'),
    delivered: t('statusDelivered'),
    cancelled: t('statusCancelled'),
    cancelled_by_admin: t('statusCancelledByAdmin'),
    rejected_by_delivery: t('statusRejectedByDelivery'),
    faild_deliver: t('statusFaildDeliver'),
    returned_by_user: t('statusReturnedByUser'),
  };

  return labels[status] ?? status.replace(/_/g, ' ');
}

function toNum(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const ORDER_CANCELLED_STATES: OrderStatus[] = [
  'cancelled',
  'cancelled_by_admin',
  'rejected_by_delivery',
  'faild_deliver',
  'returned_by_user',
];

/** Total discount from list/detail payload (basket + coupon + subscription). */
function sumOrderDiscounts(row: OrderFormValues): number {
  const legacy = toNum(row.discount);
  if (legacy > 0) return legacy;
  return (
    toNum(row.basket_discount) +
    toNum(row.coupon_discount) +
    toNum(row.subscription_discount)
  );
}

/** Items total after discounts, excluding delivery (matches list API shape). */
function priceAfterDiscountValue(o: OrderFormValues): number | undefined {
  if (o.price_after_discount != null) return toNum(o.price_after_discount);
  if (o.total != null) return toNum(o.total) - toNum(o.delivery_price);
  if (o.subtotal != null) return toNum(o.subtotal);
  return undefined;
}

export const orderColumns = (
  permissions: { update: boolean; delete: boolean },
  t: TFunction<'table'>,
  navigate: NavigateFunction,
  options?: {
    onOpenAssignDriverModal?: (order: OrderFormValues) => void;
    onOpenRejectModal?: (order: OrderFormValues) => void;
  }
): ColumnDef<OrderFormValues>[] => [
  {
    id: 'order_code',
    accessorFn: (row) => row.order_code ?? row.order_number ?? '',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.orderNumber')} />,
    cell: ({ row }) => {
      const ref = row.original.order_code ?? row.original.order_number;
      return (
        <code className="min-w-0 max-w-[14rem] truncate px-2 py-1 rounded bg-muted text-sm font-mono">
          {ref != null && String(ref).trim() !== '' ? String(ref) : '-'}
        </code>
      );
    },
  },
  {
    id: 'user',
    accessorKey: 'user',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('customer')} />,
    cell: ({ row }) => (
      <div className="font-medium text-foreground truncate">
        {row.original.user?.name || '-'}
      </div>
    ),
  },
  // {
  //   id: 'total',
  //   accessorKey: 'total',
  //   header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.total')} />,
  //   cell: ({ row }) => (
  //     <span className="font-semibold text-sm">{row.original.total}</span>
  //   ),
  // },
  // {
  //   id: 'discount',
  //   accessorFn: (row) => sumOrderDiscounts(row),
  //   header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.discount')} />,
  //   cell: ({ row }) => {
  //     const d = sumOrderDiscounts(row.original);
  //     return <span className="text-sm">{d > 0 ? d : d === 0 ? 0 : '-'}</span>;
  //   },
  // },
  // {
  //   id: 'delivery_price',
  //   accessorKey: 'delivery_price',
  //   header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.delivery')} />,
  //   cell: ({ row }) => (
  //     <span className="text-sm">{row.original.delivery_price != null ? row.original.delivery_price : '-'}</span>
  //   ),
  // },
  {
    id: 'price_after_discount',
    accessorFn: (row) => priceAfterDiscountValue(row),
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.priceAfterDiscount')} />,
    cell: ({ row }) => {
      const v = priceAfterDiscountValue(row.original);
      return (
        <span className="text-sm">
          {v != null && Number.isFinite(v) ? formatDecimal(v) : '-'}
        </span>
      );
    },
  },
  {
    id: 'payment_method',
    accessorFn: (row) => row.payment_method?.name ?? '',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('columns.paymentMethod')} />
    ),
    cell: ({ row }) => {
      const pm = row.original.payment_method;
      if (!pm?.name) {
        return <span className="text-sm text-muted-foreground">—</span>;
      }
      const raw = pm.icon;
      const iconSrc =
        raw &&
        (String(raw).startsWith('http')
          ? raw
          : `${(CONFIG.serverUrl || '').replace(/\/$/, '')}/${String(raw).replace(/^\//, '')}`);
      return (
        <div className="flex min-w-0 max-w-[12rem] items-center gap-2">
          {iconSrc ? (
            <img
              src={iconSrc}
              alt=""
              className="h-7 w-7 shrink-0 rounded-md border border-border/50 bg-muted/40 object-contain p-0.5"
            />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
              <Iconify icon="solar:wallet-money-bold" width={16} height={16} />
            </span>
          )}
          <span className="truncate text-sm font-medium">{pm.name}</span>
        </div>
      );
    },
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.status')} />,
    cell: ({ row }) => {
      const raw = row.original.status;
      const labelFromApi = row.original.status_label;
      const parsed = parseOrderStatus(raw);
      if (!parsed) {
        return (
          <TableTonedStatusPill
            icon="solar:info-circle-bold"
            className="border-slate-600 bg-slate-500"
          >
            {labelFromApi?.trim() || (raw != null && String(raw).trim() !== ''
              ? String(raw).replace(/_/g, ' ')
              : t('statusPending'))}
          </TableTonedStatusPill>
        );
      }
      const cfg = ORDER_STATUS_BADGE[parsed];
      return (
        <TableTonedStatusPill icon={cfg.icon} className={cfg.className}>
          {getOrderStatusLabel(parsed, t, labelFromApi)}
        </TableTonedStatusPill>
      );
    },
  },
  {
    id: 'driver',
    accessorFn: (row) => row.driver?.name ?? row.driver?.phone ?? '',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.driver')} />,
    cell: ({ row }) => {
      const label = row.original.driver?.name?.trim() || row.original.driver?.phone?.trim();
      return <span className="text-sm text-muted-foreground">{label || t('columns.notAssigned')}</span>;
    },
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.date')} />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.created_at).toLocaleDateString()}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const order = row.original;
      const st = normalizeOrderStatus(order.status);
      const canOpenAssignDriver =
        permissions.update &&
        st !== 'delivered' &&
        st !== 'out_delivery' &&
        !ORDER_CANCELLED_STATES.includes(st);
      const canRejectOrder =
        permissions.update && st !== 'delivered' && !ORDER_CANCELLED_STATES.includes(st);


      return (
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-border/70 bg-card/90 p-2 text-muted-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-primary/8 hover:text-primary hover:shadow-md active:scale-95 sm:min-h-10 sm:min-w-10"
                title={t('orderRowActions')}
                aria-label={t('orderRowActions')}
              >
                <Iconify icon="solar:menu-dots-bold" width={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  navigate(`/orders/details/${order.id}`, { state: { order } });
                }}
                className="gap-2"
              >
                <Iconify icon="solar:eye-bold" width={18} className="text-muted-foreground" />
                {t('viewDetails')}
              </DropdownMenuItem>
              {permissions.update ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={!canOpenAssignDriver}
                    onSelect={(e) => {
                      e.preventDefault();
                      if (!canOpenAssignDriver) return;
                      options?.onOpenAssignDriverModal?.(order);
                    }}
                    className="gap-2"
                  >
                    <Iconify icon="solar:user-id-bold" width={18} className="text-muted-foreground" />
                    {t('assignOrderToDriver')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canRejectOrder}
                    onSelect={(e) => {
                      e.preventDefault();
                      if (!canRejectOrder) return;
                      options?.onOpenRejectModal?.(order);
                    }}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Iconify icon="solar:close-circle-bold" width={18} />
                    {t('cancelOrder')}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
