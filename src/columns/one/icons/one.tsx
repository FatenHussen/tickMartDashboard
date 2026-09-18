import type { TFunction } from 'i18next';
import type { ColumnDef } from '@tanstack/react-table';
import type { IconItem } from '@/pages/dashboard/icons/types/icon.types';

import { z } from 'zod';
import { formatTranslated } from '@/utils/format-translated';
import { TableActiveBadge } from '@/shared/components/table-status-badges';
import { iconArtworkSrc } from '@/pages/dashboard/icons/utils/icon-artwork';
import { createToggleColumn } from '@/shared/ui/table-data/data-table-toggle-cell';
import { DataTableRowActions } from '@/shared/ui/table-data/data-table-row-actions';
import { DataTableColumnHeader } from '@/shared/ui/table-data/data-table-column-header';

const IconSchema = z.object({
  id: z.number(),
  name: z.any(),
  is_active: z.boolean(),
});

export const iconColumns = (
  permissions: { update: boolean; delete: boolean },
  t: TFunction<'table'>,
  onDelete?: (id: number) => void,
  isDeleting?: boolean,
  isDeleteDialogOpen?: boolean,
  onDeleteConfirm?: () => void,
  onDeleteCancel?: () => void,
  deletingId?: number | null,
  onEdit?: (row: any) => void
): ColumnDef<IconItem>[] => [
  {
    id: 'image',
    accessorKey: 'image',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.image')} />,
    cell: ({ row }) => {
      const src = iconArtworkSrc(row.original);
      return (
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30 p-1">
          {src ? (
            <img src={src} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="text-muted-foreground text-xs">—</div>
          )}
        </div>
      );
    },
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.name')} />,
    cell: ({ row }) => {
      const display = formatTranslated(row.original.name, '—');
      return <span className="font-semibold text-foreground">{display}</span>;
    },
  },
  {
    id: 'is_active',
    accessorKey: 'is_active',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.status')} />,
    cell: ({ row }) => (
      <TableActiveBadge
        isActive={row.original.is_active}
        activeLabel={t('active')}
        inactiveLabel={t('inactive')}
      />
    ),
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.createdAt')} />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{new Date(row.original.created_at).toLocaleDateString()}</span>
    ),
  },
  ...(permissions.update
    ? [createToggleColumn<IconItem>({ entityType: 'icon' })]
    : []),
  {
    id: 'actions',
    cell: ({ row }: any) => (
      <DataTableRowActions
        schema={IconSchema}
        row={row}
        viewDetails={`/icons/update/${row.original.id}`}
        editItem={onEdit ? undefined : `/icons/update/${row.original.id}`}
        onEdit={onEdit}
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
