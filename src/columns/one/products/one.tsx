import type { TFunction } from 'i18next';
import type { ColumnDef } from '@tanstack/react-table';

import { z } from 'zod';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Iconify } from '@/shared/components/iconify';
import { useState, useEffect, type MouseEvent } from 'react';
import { formatTranslated } from '@/utils/format-translated';
import { normalizeFormattedMoneyText } from '@/utils/format-currency';
import { createToggleColumn } from '@/shared/ui/table-data/data-table-toggle-cell';
import { DataTableRowActions } from '@/shared/ui/table-data/data-table-row-actions';
import { DataTableColumnHeader } from '@/shared/ui/table-data/data-table-column-header';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

// Schema for brand validation
const BrandSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    image: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

// Type for brand data
export interface BrandFormValues {
  id: number;
  name: string;
  image: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

// Schema for product validation
export const ProductSchema = z
  .object({
    id: z.number(),
    category_id: z.union([z.string(), z.number()]),
    name: z.string(),
    description: z.string(),
    price: z.number(),
    quantity: z.number().nullable(),
    image: z.string().nullable(),
    sku: z.string().nullable(),
    barcode: z.string().nullable(),
    created_at: z.string(),
    approval_status: z.string().optional().nullable(),
    approval_status_label: z.string().optional().nullable(),
  })
  .passthrough();

// Type for product data
export interface ProductFormValues {
  id: number;
  category_id: string | number;
  name: string;
  description: string;
  price: number;
  quantity: number | null;
  image: string | null;
  thumbnail?: string | null;
  sku: string | null;
  barcode: string | null;
  created_at: string;
  approval_status?: string | null;
  approval_status_label?: string | null;
  is_active?: boolean | number;
  [key: string]: any;
}

export const brandColumns = (
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
): ColumnDef<BrandFormValues>[] => [
  {
    id: 'image',
    accessorKey: 'image',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.image')} />,
    cell: ({ row }) => {
      const img = row.original.image;
      const imageUrl = img
        ? (String(img).startsWith('http') ? img : `${CONFIG.serverUrl}/${img}`)
        : null;
      return (
        <div className="flex items-center gap-2">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={formatTranslated(row.original.name)}
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
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.name')} />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">{formatTranslated(row.original.name)}</div>
        </div>
      </div>
    ),
  },
  {
    id: 'category',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('form.categoryLabel')} />
    ),
    cell: ({ row }) => {
      const r = row.original as {
        categories?: { name?: unknown }[];
        category?: { name?: unknown } | null;
      };
      const labels =
        r.categories?.length
          ? r.categories.map((c) =>
              c?.name != null
                ? formatTranslated(c.name as Parameters<typeof formatTranslated>[0])
                : ''
            )
          : r.category?.name != null
            ? [formatTranslated(r.category.name as Parameters<typeof formatTranslated>[0])]
            : [];
      const label = labels.filter(Boolean).join(', ');
      return (
        <span className="block max-w-[140px] truncate text-start text-sm text-muted-foreground">
          {label || '—'}
        </span>
      );
    },
  },
  {
    id: 'governorate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('columns.governorate')} />
    ),
    cell: ({ row }) => {
      const g = (row.original as { governorate?: { name?: string } | null }).governorate;
      const label = g?.name?.trim() ?? '';
      return (
        <span className="block max-w-[120px] truncate text-start text-sm text-muted-foreground">
          {label || '—'}
        </span>
      );
    },
  },
  {
    id: 'city',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.city')} />,
    cell: ({ row }) => {
      const city = (row.original as { city?: { name?: unknown } | null }).city;
      const label =
        city?.name != null
          ? formatTranslated(city.name as Parameters<typeof formatTranslated>[0])
          : '';
      return (
        <span className="block max-w-[120px] truncate text-start text-sm text-muted-foreground">
          {label || '—'}
        </span>
      );
    },
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.createdAt')} />,
    cell: ({ row }) => (
      <div className="flex items-center justify-start gap-2 text-start">
        <Iconify
          icon="solar:calendar-date-bold"
          className="shrink-0 text-muted-foreground"
          width={16}
          height={16}
        />
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      </div>
    ),
  },
  {
    id: 'updated_at',
    accessorKey: 'updated_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.updatedAt')} />,
    cell: ({ row }) => (
      <div className="flex items-center justify-start gap-2 text-start">
        <Iconify
          icon="solar:calendar-date-bold"
          className="shrink-0 text-muted-foreground"
          width={16}
          height={16}
        />
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.updated_at).toLocaleDateString()}
        </span>
      </div>
    ),
  },
  ...(permissions.update
    ? [createToggleColumn<BrandFormValues>({ entityType: 'brand' })]
    : []),
  {
    id: 'actions',
    cell: ({ row }: any) => (
      <DataTableRowActions
        schema={BrandSchema}
        row={row}
        viewDetails={`/products/brands/details/${row.original.id}`}
        editItem={`/products/brands/update/${row.original.id}`}
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

function ProductPriceCell({
  productId,
  currentPrice,
  priceFormatted,
  currency,
  currencySymbol,
  onOpenVariantsModal,
}: {
  productId: number;
  currentPrice: number;
  priceFormatted?: string | null;
  currency?: string | null;
  currencySymbol?: string | null;
  onOpenVariantsModal: (id: number, listRowPrice: number) => void;
}) {
  const displayPrice = (() => {
    const apiFormatted = String(priceFormatted ?? '').trim();
    if (apiFormatted) return normalizeFormattedMoneyText(apiFormatted);
    const amount = Number(currentPrice);
    if (!Number.isFinite(amount)) return '—';
    const locale = navigator.language || 'en-US';
    if (currency && currency.length === 3) {
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        // Fallback to a manual symbol + number string when currency code is not supported.
      }
    }
    const compact = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${currencySymbol ?? '$'} ${compact}`;
  })();

  return (
    <button
      type="button"
      className="flex max-w-full items-center gap-2 rounded-md -m-1 p-1 text-left transition-colors hover:bg-muted/50 group cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onOpenVariantsModal(productId, currentPrice);
      }}
    >
      <Iconify
        icon="solar:dollar-bold"
        className="text-green-500 flex-shrink-0"
        width={16}
        height={16}
      />
      <span className="text-sm font-semibold text-foreground" dir="ltr">
        {displayPrice}
      </span>
      <Iconify
        icon="solar:layers-minimalistic-bold"
        className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        width={14}
        height={14}
      />
    </button>
  );
}

export type ProductApprovalActions = {
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  approvingId: number | string | null;
  rejectingId: number | string | null;
};

function saleChannelBadge(
  row: ProductFormValues,
  t: TFunction<'table'>
): { label: string; className: string } | null {
  const channel = String(row.sale_channel ?? 'platform');
  if (channel === 'shop') {
    return {
      label: t('columns.saleChannelShop'),
      className:
        'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300',
    };
  }
  return {
    label: t('columns.saleChannelPlatform'),
    className:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  };
}

export const productColumns = (
  permissions: {
    update: boolean;
    delete: boolean;
  },
  t: TFunction<'table'>,
  onOpenVariantsModal: (id: number, listRowPrice: number) => void,
  onDelete?: (id: number) => void,
  isDeleting?: boolean,
  isDeleteDialogOpen?: boolean,
  onDeleteConfirm?: () => void,
  onDeleteCancel?: () => void,
  deletingId?: number | null,
  approvalActions?: ProductApprovalActions | null
): ColumnDef<ProductFormValues>[] => [
  {
    id: 'image',
    accessorKey: 'image',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.image')} />,
    cell: ({ row }) => {
      const img = row.original.image ?? row.original.thumbnail;
      const imageUrl = img
        ? (String(img).startsWith('http') ? img : `${CONFIG.serverUrl}/${img}`)
        : null;
      return (
        <div className="flex items-center gap-2">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={formatTranslated(row.original.name)}
              className="w-12 h-12 rounded-lg object-cover border border-border/60"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Iconify icon="solar:box-bold" className="text-primary" width={20} height={20} />
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: 'id',
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.id')} />,
    cell: ({ row }) => (
      <span className="tabular-nums text-sm font-medium text-foreground" dir="ltr">
        {row.original.id}
      </span>
    ),
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.name')} />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">{formatTranslated(row.original.name)}</div>
          <div className="text-xs text-muted-foreground truncate">
            {formatTranslated(row.original.description)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {(() => {
              const badge = saleChannelBadge(row.original, t);
              if (!badge) return null;
              return (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              );
            })()}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'category_id',
    accessorKey: 'category_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.category')} />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Iconify
          icon="solar:folder-bold"
          className="text-muted-foreground flex-shrink-0"
          width={16}
          height={16}
        />
        <span className="text-sm text-foreground">{row.original.category_id}</span>
      </div>
    ),
  },
  {
    id: 'price',
    accessorKey: 'price',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.price')} />,
    cell: ({ row }) => (
      <ProductPriceCell
        productId={row.original.id}
        currentPrice={row.original.price}
        priceFormatted={row.original.price_formatted}
        currency={row.original.currency}
        currencySymbol={row.original.currency_symbol}
        onOpenVariantsModal={onOpenVariantsModal}
      />
    ),
  },
  {
    id: 'quantity',
    accessorKey: 'quantity',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.stock')} />,
    cell: ({ row }) => {
      const quantity = row.original.quantity ?? 0;
      const isLowStock = quantity < 10 && quantity > 0;
      const isOutOfStock = quantity === 0;

      return (
        <div className="flex items-center gap-2">
          <Iconify
            icon="solar:box-bold"
            className={`flex-shrink-0 ${
              isOutOfStock
                ? 'text-destructive'
                : isLowStock
                  ? 'text-yellow-500'
                  : 'text-green-500'
            }`}
            width={16}
            height={16}
          />
          <span
            className={`text-sm font-medium ${
              isOutOfStock
                ? 'text-destructive'
                : isLowStock
                  ? 'text-yellow-600'
                  : 'text-foreground'
            }`}
          >
            {quantity}
          </span>
        </div>
      );
    },
  },
  ...(permissions.update
    ? [createToggleColumn<ProductFormValues>({ entityType: 'product' })]
    : []),
  {
    id: 'actions',
    cell: ({ row }: any) => (
      <DataTableRowActions
        schema={ProductSchema}
        row={row}
        viewDetails={paths.dashboard.product.details(row.original.id)}
        editItem={paths.dashboard.product.update(row.original.id)}
        onDelete={onDelete}
        isDeleting={isDeleting}
        isDeleteDialogOpen={isDeleteDialogOpen}
        onDeleteConfirm={onDeleteConfirm}
        onDeleteCancel={onDeleteCancel}
        deletingId={deletingId}
        permissions={permissions}
        approvalStatus={row.original.approval_status}
        onApprove={approvalActions?.onApprove}
        onReject={approvalActions?.onReject}
        approvingId={approvalActions?.approvingId}
        rejectingId={approvalActions?.rejectingId}
      />
    ),
  },
];

// ---------------------------------------------------------------------------
// Inventory list (warehouse view): name, category, qty, shop, vendor, SKU, expiry
// ---------------------------------------------------------------------------

function inventoryCategoryLabel(row: ProductFormValues): string {
  const r = row as Record<string, unknown>;
  const cat = r.category as { name?: unknown } | null | undefined;
  if (cat?.name != null) return formatTranslated(cat.name as any);
  const cn = r.category_name;
  if (cn != null) return formatTranslated(cn as any);
  if (r.category_id != null && r.category_id !== '') return String(r.category_id);
  return '—';
}

function inventoryShopLabel(row: ProductFormValues): string {
  const r = row as Record<string, unknown>;
  const shop = r.shop as { name?: unknown } | null | undefined;
  if (shop?.name != null) return formatTranslated(shop.name as any);
  const shops = r.shops as Array<{ name?: string; shop_name?: string }> | undefined;
  if (Array.isArray(shops) && shops.length > 0) {
    const parts = shops
      .map((s) => formatTranslated((s.name ?? s.shop_name) as any))
      .filter((x) => x && x !== '—');
    if (parts.length) return parts.join(', ');
  }
  const variants = r.variants as Array<{ shops?: Array<{ shop_name?: string }> }> | undefined;
  if (Array.isArray(variants)) {
    const names = new Set<string>();
    variants.forEach((v) => {
      v.shops?.forEach((sh) => {
        if (sh.shop_name) names.add(sh.shop_name);
      });
    });
    if (names.size) return [...names].join(', ');
  }
  return '—';
}

function inventoryVendorLabel(row: ProductFormValues): string {
  const r = row as Record<string, unknown>;
  const vendor = r.vendor as { name?: unknown } | null | undefined;
  if (vendor?.name != null) return formatTranslated(vendor.name as any);
  const vn = r.vendor_name;
  if (vn != null) return formatTranslated(vn as any);
  return '—';
}

function inventoryExpiryLabel(value: unknown): string {
  if (value == null || value === '') return '—';
  const s = String(value);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  return s;
}

function EditableInventoryStockCell({
  productId,
  currentQuantity,
  listRowPrice,
  onOpenVariantsModal,
  onQuantityUpdate,
  canEdit,
  t,
}: {
  productId: number;
  currentQuantity: number;
  /** Passed to `ProductVariantsPriceModal` as `fallbackListPrice`. */
  listRowPrice?: number;
  /** Opens variants modal (uses `GET .../products/:id/variants`). When set, the simple quantity dialog is not used. */
  onOpenVariantsModal?: (
    productId: number,
    listRowPrice: number,
    productQuantity: number
  ) => void;
  onQuantityUpdate?: (id: number, quantity: number) => Promise<void>;
  canEdit: boolean;
  t: TFunction<'table'>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const quantity = currentQuantity ?? 0;
  const isLowStock = quantity < 10 && quantity > 0;
  const isOutOfStock = quantity === 0;

  useEffect(() => {
    if (open) setValue(String(quantity));
  }, [open, quantity]);

  const handleOpen = () => {
    if (!canEdit || !onQuantityUpdate) return;
    setValue(String(quantity));
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    if (!onQuantityUpdate) return;
    const n = Number(value);
    if (Number.isNaN(n) || n < 0 || !Number.isFinite(n)) return;
    const rounded = Math.floor(n);
    if (rounded === quantity) {
      handleClose();
      return;
    }
    setIsSaving(true);
    try {
      await onQuantityUpdate(productId, rounded);
      handleClose();
    } catch {
      /* error toast from page / axios */
    } finally {
      setIsSaving(false);
    }
  };

  const openStockUi = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (onOpenVariantsModal) {
      onOpenVariantsModal(productId, listRowPrice ?? 0, quantity);
      return;
    }
    handleOpen();
  };

  const clickable = Boolean(onOpenVariantsModal) || (canEdit && Boolean(onQuantityUpdate));

  return (
    <>
      <div
        className={`flex items-center gap-2 group ${clickable ? 'cursor-pointer' : ''}`}
        onClick={openStockUi}
      >
        <Iconify
          icon="solar:box-bold"
          className={`flex-shrink-0 ${
            isOutOfStock ? 'text-destructive' : isLowStock ? 'text-yellow-500' : 'text-green-500'
          }`}
          width={16}
          height={16}
        />
        <span
          className={`text-sm font-medium ${
            isOutOfStock ? 'text-destructive' : isLowStock ? 'text-yellow-600' : 'text-foreground'
          }`}
        >
          {quantity}
        </span>
        {clickable && (
          <Iconify
            icon={onOpenVariantsModal ? 'solar:layers-minimalistic-bold' : 'solar:pen-bold'}
            className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            width={14}
            height={14}
          />
        )}
      </div>

      {!onOpenVariantsModal && (
        <Dialog
          open={open}
          onClose={handleClose}
          title={t('columns.stock')}
          maxWidth="sm"
          content={
            <div className="space-y-2">
              <label className="text-muted-foreground text-sm block">{t('form.quantity')}</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave();
                }}
                disabled={isSaving}
                className="h-10"
              />
            </div>
          }
          actions={
            <>
              <Button variant="text" onClick={handleClose} disabled={isSaving}>
                {t('cancel')}
              </Button>
              <Button variant="contained" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? t('updating') : t('save')}
              </Button>
            </>
          }
        />
      )}
    </>
  );
}

export const inventoryProductColumns = (
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
  onQuantityUpdate?: (id: number, quantity: number) => Promise<void>,
  onOpenInventoryVariantsModal?: (
    productId: number,
    listRowPrice: number,
    productQuantity: number
  ) => void
): ColumnDef<ProductFormValues>[] => [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.name')} />,
    cell: ({ row }) => (
      <div className="min-w-0 max-w-[280px]">
        <div className="font-semibold text-foreground truncate">{formatTranslated(row.original.name)}</div>
      </div>
    ),
  },
  {
    id: 'category',
    accessorFn: (row) => inventoryCategoryLabel(row),
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.category')} />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-0 max-w-[220px]">
        <Iconify icon="solar:folder-bold" className="text-muted-foreground flex-shrink-0" width={16} height={16} />
        <span className="text-sm text-foreground truncate">{inventoryCategoryLabel(row.original)}</span>
      </div>
    ),
  },
  {
    id: 'quantity',
    accessorKey: 'quantity',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.stock')} />,
    cell: ({ row }) => (
      <EditableInventoryStockCell
        productId={row.original.id}
        currentQuantity={row.original.quantity ?? 0}
        listRowPrice={row.original.price}
        onOpenVariantsModal={onOpenInventoryVariantsModal}
        onQuantityUpdate={onQuantityUpdate}
        canEdit={permissions.update}
        t={t}
      />
    ),
  },
  {
    id: 'shop',
    accessorFn: (row) => inventoryShopLabel(row),
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.shop')} />,
    cell: ({ row }) => (
      <span className="text-sm text-foreground line-clamp-2 max-w-[220px]">{inventoryShopLabel(row.original)}</span>
    ),
  },
  {
    id: 'vendor',
    accessorFn: (row) => inventoryVendorLabel(row),
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.seller')} />,
    cell: ({ row }) => (
      <span className="text-sm text-foreground truncate max-w-[200px] block">
        {inventoryVendorLabel(row.original)}
      </span>
    ),
  },
  {
    id: 'sku',
    accessorKey: 'sku',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.sku')} />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground font-mono">{row.original.sku || '—'}</span>
    ),
  },
  {
    id: 'expiry_date',
    accessorKey: 'expiry_date',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.expiryDate')} />,
    cell: ({ row }) => {
      const v = (row.original as Record<string, unknown>).expiry_date;
      return (
        <div className="flex items-center gap-2">
          <Iconify icon="solar:calendar-mark-bold" className="text-muted-foreground flex-shrink-0" width={16} height={16} />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{inventoryExpiryLabel(v)}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }: any) => (
      <DataTableRowActions
        schema={ProductSchema}
        row={row}
        viewDetails={paths.dashboard.product.details(row.original.id)}
        editItem={
          permissions.update ? paths.dashboard.product.update(row.original.id) : undefined
        }
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
