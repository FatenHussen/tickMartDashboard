import type { CategoryData } from '@/pages/dashboard/categories/types/category.types';
import type { ProductExtraDetailRowApi } from '@/pages/dashboard/categories/types/product-extra-detail.types';

import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { formatTranslated } from '@/utils/format-translated';
import { DataTable } from '@/shared/ui/table-data/table-data';
import { usePermissions } from '@/auth/hooks/use-permissions';
import { getApiErrorMessage } from '@/lib/get-api-error-message';
import { _CategoryApi } from '@/pages/dashboard/categories/api/category.services';
import {
  productExtraDetailColumns,
  type ProductExtraDetailTableRow,
} from '@/columns/one/categories/product-extra-detail';
import {
  useFetchProductExtraDetails,
  useDeleteProductExtraDetail,
} from '@/pages/dashboard/categories/hooks/product-extra-detail';
import {
  buildCategorySelectRows,
  nativeSelectCategoryLabel,
} from '@/pages/dashboard/categories/utils/build-parent-picker-options';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

const filterSelectClass =
  'h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15';

function normalizeRows(items: ProductExtraDetailRowApi[]): ProductExtraDetailTableRow[] {
  return items.map((item) => ({
    id: item.id,
    detail_key: formatTranslated(item.detail_key),
    detail_value: item.detail_value ? formatTranslated(item.detail_value) : '',
    price: Number(item.price) || 0,
    category: item.category ? formatTranslated(item.category.name) : '-',
    is_active: Boolean(item.is_active),
  }));
}

export default function Page() {
  const { t } = useTranslation(['table', 'nav']);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<'' | '1' | '0'>('');

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, isActiveFilter]);

  const { data: categoriesResp } = useQuery({
    queryKey: ['categories', 'product-extra-details-filter'],
    queryFn: () => _CategoryApi.getListCategoriesPaginated({ page: 1, per_page: 500 }),
  });
  const filterCategoryOptions = useMemo(
    () => buildCategorySelectRows((categoriesResp?.data?.items ?? []) as CategoryData[]),
    [categoriesResp?.data?.items]
  );

  const {
    data: listResponse,
    isLoading,
    isError,
    error,
  } = useFetchProductExtraDetails({
    page: currentPage,
    per_page: pageSize,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(categoryFilter ? { category_id: Number(categoryFilter) } : {}),
    ...(isActiveFilter === '' ? {} : { is_active: isActiveFilter === '1' }),
  });

  const deleteMutation = useDeleteProductExtraDetail();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const onDelete = (id: number) => {
    setDeletingId(id);
  };

  const onDeleteConfirm = async () => {
    if (deletingId) {
      try {
        await deleteMutation.mutateAsync(deletingId);
        toast.success(t('deleteSuccess'));
        setDeletingId(null);
      } catch {
        return;
      }
    }
  };

  const onDeleteCancel = () => {
    setDeletingId(null);
  };

  const rawItems = listResponse?.data?.items ?? [];
  const tableData = normalizeRows(rawItems);
  const apiPagination = listResponse?.data?.pagination;
  const pagination = apiPagination
    ? {
        current_page: apiPagination.current_page,
        last_page: apiPagination.last_page,
        per_page: apiPagination.per_page,
        total: apiPagination.total,
        from: (apiPagination.current_page - 1) * apiPagination.per_page + 1,
        to: Math.min(apiPagination.current_page * apiPagination.per_page, apiPagination.total),
      }
    : {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
        from: 0,
        to: 0,
      };

  const { canAny } = usePermissions();
  /** Fallback to category-detail permissions until backend exposes `productextradetail.*` */
  const hasExtraPermission = (action: 'create' | 'update' | 'delete') =>
    canAny([`productextradetail.${action}`, `categorydetail.${action}`]);

  const activeFilterCount = (categoryFilter ? 1 : 0) + (isActiveFilter ? 1 : 0);

  const onFilterReset = () => {
    setCategoryFilter('');
    setIsActiveFilter('');
    setCurrentPage(1);
  };

  return (
    <>
      <title>{t('form.productExtraDetailsIndexDocumentTitle', { appName: CONFIG.appName })}</title>

      {isError ? (
        <div className="mx-3 mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:mx-4 md:mx-6">
          {getApiErrorMessage(error, t('form.productExtraDetailsLoadErrorFallback'))}
        </div>
      ) : null}

      <DataTable
        tableName={t('nav:categoryAddOns')}
        columns={productExtraDetailColumns(
          {
            update: hasExtraPermission('update'),
            delete: hasExtraPermission('delete'),
          },
          t,
          onDelete,
          deleteMutation.isPending,
          deletingId !== null,
          onDeleteConfirm,
          onDeleteCancel,
          deletingId
        )}
        data={tableData}
        createPath="/categories/extra-details/create"
        hasDetails
        detailsLink="/categories/extra-details/update"
        permissions={{
          create: hasExtraPermission('create'),
          update: hasExtraPermission('update'),
          delete: hasExtraPermission('delete'),
        }}
        isLoading={isLoading}
        filterSidebar={
          <div className="flex flex-col gap-5">
            <FilterGroup label={t('columns.category')}>
              <select
                className={filterSelectClass}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">{t('all')}</option>
                {filterCategoryOptions.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {nativeSelectCategoryLabel(c.label, c.depth, c.hasChildren)}
                  </option>
                ))}
              </select>
            </FilterGroup>

            <FilterGroup label={t('statusLabel')}>
              <select
                className={filterSelectClass}
                value={isActiveFilter}
                onChange={(e) => setIsActiveFilter(e.target.value as '' | '1' | '0')}
              >
                <option value="">{t('all')}</option>
                <option value="1">{t('active')}</option>
                <option value="0">{t('inactive')}</option>
              </select>
            </FilterGroup>
          </div>
        }
        activeFilterCount={activeFilterCount}
        onFilterReset={onFilterReset}
        columnTranslations={{
          id: t('columns.id'),
          detail_key: t('columns.addOnName'),
          price: t('columns.price'),
          detail_value: t('columns.description'),
          category: t('columns.category'),
          status: t('columns.status'),
          actions: t('columns.action'),
        }}
        pagination={pagination}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearchChange={setSearch}
      />
    </>
  );
}
