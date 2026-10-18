import type { Row, ColumnDef, HeaderContext } from '@tanstack/react-table';
import type { AdminToggleEntityType } from '@/api/admin-toggle-status.types';

import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Iconify } from '@/shared/components/iconify';
import { readRecordActiveFlag } from '@/utils/parse-record-is-active';
import { useAdminToggleStatus } from '@/hooks/use-admin-toggle-status';

import { DataTableColumnHeader } from './data-table-column-header';

function ToggleVisibilityColumnHeader<TData>({
  column,
}: HeaderContext<TData, unknown>) {
  const { t } = useTranslation('table');
  return (
    <DataTableColumnHeader
      column={column}
      title={t('columns.visibility')}
      className="text-center"
    />
  );
}

type ToggleAppearance = 'switch' | 'eye';

interface ToggleCellProps {
  id: number;
  isActive: boolean;
  entityType: AdminToggleEntityType;
  appearance?: ToggleAppearance;
}

function ToggleCell({ id, isActive, entityType, appearance = 'switch' }: ToggleCellProps) {
  const { t } = useTranslation('table');
  const toggleMutation = useAdminToggleStatus();

  const isPending =
    toggleMutation.isPending &&
    toggleMutation.variables?.id != null &&
    String(toggleMutation.variables.id) === String(id) &&
    toggleMutation.variables.type === entityType;

  const handleToggle = async () => {
    try {
      await toggleMutation.mutateAsync({
        type: entityType,
        id,
        is_active: !isActive,
      });
      toast.success(
        appearance === 'eye'
          ? isActive
            ? t('productHiddenFromStorefront')
            : t('productShownOnStorefront')
          : t('toggleVisibilitySuccess')
      );
    } catch {
      /* error toast handled by axios interceptor */
    }
  };

  if (appearance === 'eye') {
    const label = isActive ? t('hideFromStorefront') : t('showOnStorefront');
    return (
      <div className="flex w-full items-center justify-center">
        <button
          type="button"
          aria-pressed={isActive}
          aria-label={label}
          title={label}
          disabled={isPending}
          onClick={(e) => {
            e.stopPropagation();
            void handleToggle();
          }}
          className={[
            'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            isActive
              ? 'border-primary/25 bg-primary/10 text-primary hover:bg-primary/15'
              : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
            isPending ? 'cursor-wait opacity-50' : 'cursor-pointer',
          ].join(' ')}
        >
          <Iconify
            icon={isActive ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
            width={18}
            height={18}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-start">
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        disabled={isPending}
        onClick={(e) => {
          e.stopPropagation();
          void handleToggle();
        }}
        className={[
          'relative h-7 w-12 shrink-0 cursor-pointer rounded-full border border-border/40 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          isActive ? 'bg-primary' : 'bg-muted-foreground/35',
          isPending ? 'cursor-wait opacity-50' : '',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-all duration-200',
            isActive ? 'end-0.5' : 'start-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

function resolveIsActive(
  original: unknown,
  getIsActive?: (row: any) => boolean | undefined
): boolean {
  if (getIsActive) return getIsActive(original) ?? false;
  if (!original || typeof original !== 'object') return false;
  const record = original as Record<string, unknown>;
  const parsed = readRecordActiveFlag(record);
  if (parsed !== undefined) return parsed;
  const legacy = record.is_active;
  if (typeof legacy === 'boolean') return legacy;
  if (legacy === 1 || legacy === '1') return true;
  return false;
}

interface CreateToggleColumnOptions<TData> {
  entityType: AdminToggleEntityType;
  getIsActive?: (row: TData) => boolean | undefined;
  appearance?: ToggleAppearance;
}

export function createToggleColumn<TData>({
  entityType,
  getIsActive,
  appearance = 'switch',
}: CreateToggleColumnOptions<TData>): ColumnDef<TData> {
  return {
    id: 'toggle_active',
    accessorKey: appearance === 'eye' ? 'is_visible' : 'is_active',
    header: ToggleVisibilityColumnHeader,
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
    cell: ({ row }: { row: Row<TData> }) => {
      const original = row.original as any;
      const id = original?.id as number;
      const isActive = resolveIsActive(original, getIsActive);

      if (id == null) return null;

      return (
        <ToggleCell
          id={id}
          isActive={isActive}
          entityType={entityType}
          appearance={appearance}
        />
      );
    },
    enableSorting: false,
  };
}
