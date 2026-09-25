import type { TFunction } from 'i18next';
import type { ColumnDef } from '@tanstack/react-table';

import { z } from 'zod';
import { Iconify } from '@/shared/components/iconify';
import { createToggleColumn } from '@/shared/ui/table-data/data-table-toggle-cell';
import { DataTableRowActions } from '@/shared/ui/table-data/data-table-row-actions';
import { DataTableColumnHeader } from '@/shared/ui/table-data/data-table-column-header';

import { paths } from 'src/routes/paths';

import { isActiveLanguageArabic } from 'src/lib/language-code';

/** List text is a localized string or null. `null` is an empty cell, not the other language. */
function bannerCellText(value: unknown): string {
  if (value == null || Array.isArray(value)) return '-';
  if (typeof value === 'string') return value.trim() || '-';
  if (typeof value === 'object') {
    const locale = value as { ar?: string | null; en?: string | null };
    const text = isActiveLanguageArabic() ? locale.ar : locale.en;
    return text?.trim() || '-';
  }
  return '-';
}

const BannerSchema = z.object({
  id: z.number(),
  title: z.string().nullable(),
  description: z.string().nullable().optional(),
  image_url: z.string(),
  link: z.string().nullable().optional(),
  is_active: z.number(),
  order: z.number(),
  created_at: z.string(),
  expires_at: z.string().nullable().optional(),
});

export interface BannerFormValues {
  id: number;
  title: string | null;
  description?: string | null;
  image_url: string;
  link?: string | null;
  is_active: number;
  order: number;
  created_at: string;
  expires_at?: string | null;
  [key: string]: any;
}

export const bannerColumns = (
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
  deletingId?: number | null,
  onEdit?: (row: any) => void
): ColumnDef<BannerFormValues>[] => [
  {
    id: 'image_url',
    accessorKey: 'image_url',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.image')} />,
    cell: ({ row }) => {
      const imageUrl = row.original.image_url;
      return (
        <div className="flex items-center gap-2">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={bannerCellText(row.original.title)}
              className="w-12 h-12 rounded-lg object-cover border border-border/60"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Iconify
                icon="solar:gallery-add-bold"
                className="text-primary"
                width={20}
                height={20}
              />
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.title')} />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="font-semibold text-foreground truncate">{bannerCellText(row.original.title)}</div>
      </div>
    ),
  },
  {
    id: 'description',
    accessorKey: 'description',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.description')} />,
    cell: ({ row }) => {
      const text = bannerCellText(row.original.description);
      return (
        <div className="max-w-[200px]">
          <span className="text-sm text-muted-foreground truncate block" title={text}>
            {text}
          </span>
        </div>
      );
    },
  },
  {
    id: 'link',
    accessorKey: 'link',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.link')} />,
    cell: ({ row }) => {
      const link = row.original.link;
      if (!link) return <span className="text-sm text-muted-foreground">-</span>;
      return (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline truncate block max-w-[180px]"
        >
          {link}
        </a>
      );
    },
  },
  {
    id: 'expires_at',
    accessorKey: 'expires_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.expires')} />,
    cell: ({ row }) => {
      const v = row.original.expires_at;
      if (!v) return <span className="text-sm text-muted-foreground">-</span>;
      return (
        <span className="text-sm text-muted-foreground">
          {new Date(v).toLocaleString()}
        </span>
      );
    },
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.createdAt')} />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Iconify
          icon="solar:calendar-date-bold"
          className="text-muted-foreground flex-shrink-0"
          width={16}
          height={16}
        />
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      </div>
    ),
  },
  ...(permissions.update
    ? [createToggleColumn<BannerFormValues>({ entityType: 'banner' })]
    : []),
  {
    id: 'actions',
    cell: ({ row }: any) => (
      <DataTableRowActions
        schema={BannerSchema}
        row={row}
        viewDetails={`${paths.dashboard.banners}/update/${row.original.id}`}
        editItem={onEdit ? undefined : `${paths.dashboard.banners}/update/${row.original.id}`}
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
