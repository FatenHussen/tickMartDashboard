import type { ReactNode } from 'react';
import type { CustomOrderRequestStatus } from '@/pages/dashboard/custom-order-requests/types/custom-order-request.types';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Iconify } from '@/shared/components/iconify';
import { DataTable } from '@/shared/ui/table-data/table-data';
import { usePermissions } from '@/auth/hooks/use-permissions';
import { customOrderRequestColumns } from '@/columns/one/custom-order-requests/one';
import { useFetchCustomOrderRequests } from '@/pages/dashboard/custom-order-requests/hooks/custom-order-request';
import { CUSTOM_ORDER_REQUEST_STATUS_OPTIONS } from '@/pages/dashboard/custom-order-requests/types/custom-order-request.types';

import { CONFIG } from 'src/global-config';

const DEFAULT_STATUS_FILTER = 'pending_pricing';

const statusChipIcons: Record<CustomOrderRequestStatus, string> = {
  pending_pricing: 'solar:hourglass-bold',
  waiting_approval: 'solar:hand-heart-bold',
  cancelled: 'solar:close-circle-bold',
  approved: 'solar:check-circle-bold',
  converted: 'solar:transfer-horizontal-bold',
};

export default function Page() {
  const { t } = useTranslation('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(DEFAULT_STATUS_FILTER);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [search, setSearch] = useState('');

  const parsedUserId = userIdFilter.trim() ? Number(userIdFilter.trim()) : undefined;
  const userId =
    parsedUserId !== undefined && Number.isFinite(parsedUserId) && parsedUserId > 0
      ? parsedUserId
      : undefined;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, userId]);

  const { data: response, isLoading } = useFetchCustomOrderRequests({
    page: currentPage,
    per_page: pageSize,
    status: statusFilter,
    user_id: userId,
    search: search.trim() || undefined,
  });

  const rawItems = Array.isArray(response?.data?.items) ? response.data.items : [];
  const apiPagination = response?.data?.pagination;
  const pagination = apiPagination
    ? {
        current_page: apiPagination.current_page,
        last_page: apiPagination.last_page,
        per_page: apiPagination.per_page,
        total: apiPagination.total,
        from: (apiPagination.current_page - 1) * apiPagination.per_page + 1,
        to: Math.min(apiPagination.current_page * apiPagination.per_page, apiPagination.total),
      }
    : { current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 };

  const { canAny } = usePermissions();
  const canUpdate = canAny([
    'customorderrequest.update',
    'custom_order_request.update',
    'order.update',
  ]);

  const statusChips = [
    { key: 'all' as const, label: t('all'), icon: 'solar:list-bold' },
    ...CUSTOM_ORDER_REQUEST_STATUS_OPTIONS.map((key) => ({
      key,
      label: t(`form.customOrderRequestStatus_${key}`, { defaultValue: key }),
      icon: statusChipIcons[key],
    })),
  ];

  const activeFilterCount =
    (statusFilter && statusFilter !== DEFAULT_STATUS_FILTER ? 1 : 0) +
    (statusFilter === undefined ? 1 : 0) +
    (userId ? 1 : 0);

  const sidebarContent = (
    <div className="flex flex-col gap-4">
      <FilterGroup label={t('columns.user')}>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder={t('form.customOrderRequestUserIdPlaceholder')}
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
        />
      </FilterGroup>

      <FilterGroup label={t('columns.status')}>
        <div className="flex max-h-[min(70vh,26rem)] flex-col gap-2 overflow-y-auto pe-1">
          {statusChips.map(({ key: s, label, icon }) => {
            const active = (s === 'all' && !statusFilter) || statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s === 'all' ? undefined : s);
                  setCurrentPage(1);
                }}
                className={`inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
                    : 'border-border/60 bg-background text-muted-foreground hover:border-primary/25 hover:bg-primary/5 hover:text-foreground'
                }`}
              >
                <Iconify icon={icon} width={16} height={16} className="shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <>
      <title>{t('form.customOrderRequestsIndexDocumentTitle', { appName: CONFIG.appName })}</title>
      <DataTable
        tableName={t('tableNames.customOrderRequest')}
        columns={customOrderRequestColumns(t, { update: canUpdate })}
        data={rawItems}
        hasDetails
        detailsLink="/custom-order-requests/details"
        filterSidebar={sidebarContent}
        activeFilterCount={activeFilterCount}
        onFilterReset={() => {
          setStatusFilter(DEFAULT_STATUS_FILTER);
          setUserIdFilter('');
          setCurrentPage(1);
        }}
        permissions={{
          create: false,
          update: canUpdate,
          delete: false,
        }}
        isLoading={isLoading}
        pagination={pagination}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        onSearchChange={setSearch}
        searchPlaceholder={t('form.customOrderRequestSearchPlaceholder')}
        columnTranslations={{
          id: t('columns.id'),
          user_name: t('columns.user'),
          description: t('form.customOrderRequestCustomerText'),
          address_label: t('columns.address'),
          status_label: t('columns.status'),
          payment_method_name: t('columns.paymentMethod'),
          created_at: t('columns.createdAt'),
        }}
      />
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
