import type { TFunction } from 'i18next';
import type { ColumnDef } from '@tanstack/react-table';

import { z } from 'zod';
import { Iconify } from '@/shared/components/iconify';
import { formatTranslated } from '@/utils/format-translated';
import { TableActiveBadge } from '@/shared/components/table-status-badges';
import { DataTableRowActions } from '@/shared/ui/table-data/data-table-row-actions';
import { DataTableColumnHeader } from '@/shared/ui/table-data/data-table-column-header';

const RowSchema = z.object({
  id: z.number(),
  detail_key: z.string(),
  detail_value: z.string(),
  price: z.number(),
  category: z.string(),
  is_active: z.boolean(),
});

export interface ProductExtraDetailTableRow {
  id: number;
  detail_key: string;
  detail_value: string;
  price: number;
  category: string;
  is_active: boolean;
  [key: string]: unknown;
}

export const productExtraDetailColumns = (
  permissions: {
    update: boolean;
    delete: boolean;
  },
  t: TFunction<'table'>,
  onDelete?: (id: number) => void,
  isDeleting?: boolean,
  isDeleteDialogOpen?: boolean,
  onDeleteConfirm?: () => void,
  onDeleteCancel?: () => void,
  deletingId?: number | null
): ColumnDef<ProductExtraDetailTableRow>[] => [
  {
    id: 'detail_key',
    accessorKey: 'detail_key',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('columns.addOnName')} />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Iconify icon="solar:tag-price-bold" className="text-primary" width={18} height={18} />
        </div>
        <span className="font-semibold text-foreground truncate">
          {formatTranslated(row.original.detail_key)}
        </span>
      </div>
    ),
  },
  {
    id: 'price',
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('columns.price')} />
    ),
    cell: ({ row }) => (
      <span className="text-sm font-medium text-foreground tabular-nums">
        {Number.isFinite(row.original.price) ? row.original.price : '—'}
      </span>
    ),
  },
  {
    id: 'detail_value',
    accessorKey: 'detail_value',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('columns.description')} />
    ),
    cell: ({ row }) => {
      const value = formatTranslated(row.original.detail_value);
      return (
        <span className="text-sm text-muted-foreground truncate block max-w-[240px]">
          {value || '—'}
        </span>
      );
    },
  },
  {
    id: 'category',
    accessorKey: 'category',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('columns.category')} />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-0">
        <Iconify
          icon="solar:diagram-bold"
          className="text-muted-foreground shrink-0"
          width={16}
          height={16}
        />
        <span className="text-sm text-muted-foreground truncate">{row.original.category}</span>
      </div>
    ),
  },
  {
    id: 'status',
    accessorKey: 'is_active',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('columns.status')} />
    ),
    cell: ({ row }) => (
      <TableActiveBadge
        isActive={row.original.is_active}
        activeLabel={t('active')}
        inactiveLabel={t('inactive')}
      />
    ),
  },
  {
    id: 'actions',
    cell: ({ row }: { row: { original: ProductExtraDetailTableRow } }) => (
      <DataTableRowActions
        schema={RowSchema}
        row={row as any}
        viewDetails={`/categories/extra-details/update/${row.original.id}`}
        editItem={`/categories/extra-details/update/${row.original.id}`}
        onDelete={onDelete}
        isDeleting={isDeleting}
        isDeleteDialogOpen={isDeleteDialogOpen}
        onDeleteConfirm={onDeleteConfirm}
        onDeleteCancel={onDeleteCancel}
        deletingId={deletingId}
        permissions={permissions}
      />
    ),
  },
];
