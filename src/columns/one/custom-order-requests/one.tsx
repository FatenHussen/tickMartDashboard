import type { TFunction } from 'i18next';
import type { ColumnDef } from '@tanstack/react-table';
import type { CustomOrderRequestListItem } from '@/pages/dashboard/custom-order-requests/types/custom-order-request.types';

import { z } from 'zod';
import { TableTonedStatusPill } from '@/shared/components/table-status-badges';
import { DataTableRowActions } from '@/shared/ui/table-data/data-table-row-actions';
import { DataTableColumnHeader } from '@/shared/ui/table-data/data-table-column-header';
import {
  getCustomOrderRequestText,
  getCustomOrderRequestAddress,
  getCustomOrderRequestUserName,
  getCustomOrderRequestUserPhone,
  getCustomOrderRequestCreatedAt,
  getCustomOrderRequestStatusKey,
  getCustomOrderRequestStatusLabel,
  getCustomOrderRequestPaymentMethodLabel,
} from '@/pages/dashboard/custom-order-requests/utils/display';

const CustomOrderRequestSchema = z.object({
  id: z.number(),
  status: z.string(),
  created_at: z.string().optional(),
});

const statusPill: Record<string, { icon: string; className: string }> = {
  pending_pricing: { icon: 'solar:hourglass-bold', className: 'border-amber-700 bg-amber-500' },
  waiting_approval: {
    icon: 'solar:hand-heart-bold',
    className: 'border-sky-800 bg-sky-600',
  },
  cancelled: { icon: 'solar:close-circle-bold', className: 'border-red-800 bg-red-600' },
  approved: { icon: 'solar:check-circle-bold', className: 'border-emerald-800 bg-emerald-600' },
  converted: { icon: 'solar:transfer-horizontal-bold', className: 'border-violet-800 bg-violet-600' },
};

function fallbackStatusLabel(t: TFunction<'table'>, status: string): string {
  return t(`form.customOrderRequestStatus_${status}`, { defaultValue: status });
}

export const customOrderRequestColumns = (
  t: TFunction<'table'>,
  permissions: { update?: boolean; delete?: boolean } = {}
): ColumnDef<CustomOrderRequestListItem>[] => [
  {
    id: 'id',
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.id')} />,
    cell: ({ row }) => <span className="font-mono text-sm">#{row.original.id}</span>,
  },
  {
    id: 'user_name',
    accessorFn: (row) => getCustomOrderRequestUserName(row),
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.user')} />,
    cell: ({ row }) => {
      const name = getCustomOrderRequestUserName(row.original);
      const phone = getCustomOrderRequestUserPhone(row.original);
      return (
        <div>
          <span className="font-semibold text-foreground">{name}</span>
          {phone ? (
            <>
              <br />
              <span className="text-xs text-muted-foreground">{phone}</span>
            </>
          ) : null}
        </div>
      );
    },
  },
  {
    id: 'description',
    accessorFn: (row) => getCustomOrderRequestText(row),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('form.customOrderRequestCustomerText')} />
    ),
    cell: ({ row }) => {
      const text = getCustomOrderRequestText(row.original);
      return (
        <span className="line-clamp-2 max-w-[280px] text-sm text-foreground/90" title={text}>
          {text}
        </span>
      );
    },
  },
  {
    id: 'address_label',
    accessorFn: (row) => getCustomOrderRequestAddress(row),
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.address')} />,
    cell: ({ row }) => {
      const address = getCustomOrderRequestAddress(row.original);
      return (
        <span className="line-clamp-2 max-w-[240px] text-sm text-muted-foreground" title={address}>
          {address}
        </span>
      );
    },
  },
  {
    id: 'status_label',
    accessorFn: (row) => getCustomOrderRequestStatusLabel(row),
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.status')} />,
    cell: ({ row }) => {
      const key = getCustomOrderRequestStatusKey(row.original);
      const label = getCustomOrderRequestStatusLabel(row.original, fallbackStatusLabel(t, key));
      const cfg = statusPill[key] ?? {
        icon: 'solar:info-circle-bold',
        className: 'border-slate-600 bg-slate-500',
      };
      return (
        <TableTonedStatusPill icon={cfg.icon} className={cfg.className}>
          {label}
        </TableTonedStatusPill>
      );
    },
  },
  {
    id: 'payment_method_name',
    accessorFn: (row) => getCustomOrderRequestPaymentMethodLabel(row),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('columns.paymentMethod')} />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {getCustomOrderRequestPaymentMethodLabel(row.original)}
      </span>
    ),
  },
  {
    id: 'created_at',
    accessorFn: (row) => getCustomOrderRequestCreatedAt(row),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('columns.createdAt')} />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {getCustomOrderRequestCreatedAt(row.original)}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DataTableRowActions
        schema={CustomOrderRequestSchema}
        row={row}
        viewDetails={`/custom-order-requests/details/${row.original.id}`}
        permissions={{ update: permissions.update ?? false, delete: false }}
      />
    ),
  },
];
