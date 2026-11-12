import { toast } from 'react-toastify';
import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/shared/ui/table-data/table-data';
import { usePermissions } from '@/auth/hooks/use-permissions';
import { currencyColumns, type CurrencyFormValues } from '@/columns/one/currencies/one';
import { useDeleteCurrency, useFetchCurrencies } from '@/pages/dashboard/currencies/hooks/currency';

import { CONFIG } from 'src/global-config';

export default function Page() {
  const { t } = useTranslation('table');
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const params: { search?: string } = {};
  if (search.trim()) params.search = search.trim();

  const { data: response, isLoading, error } = useFetchCurrencies(currentPage, pageSize, params);
  const deleteMutation = useDeleteCurrency();

  if (error) console.error('Error fetching currencies:', error);

  const onDelete = (id: number) => {
    if (response?.data.items.some((currency) => currency.id === id && currency.is_default)) return;
    setDeletingId(id);
  };
  const onDeleteConfirm = async () => {
    if (deletingId) {
      if (response?.data.items.some((currency) => currency.id === deletingId && currency.is_default)) return;
      try {
        await deleteMutation.mutateAsync(deletingId);
        toast.success(t('deleteSuccess'));
        setDeletingId(null);
      } catch { return; }
    }
  };
  const onDeleteCancel = () => setDeletingId(null);
  const handleEdit = (row: { original: CurrencyFormValues }) => {
    navigate(`/currencies/update/${row.original.id}`, { state: { currency: row.original } });
  };

  const items: CurrencyFormValues[] = response?.data?.items || [];
  const apiPagination = response?.data?.pagination;
  const pagination = apiPagination
    ? { current_page: apiPagination.current_page, last_page: apiPagination.last_page, per_page: apiPagination.per_page, total: apiPagination.total, from: (apiPagination.current_page - 1) * apiPagination.per_page + 1, to: Math.min(apiPagination.current_page * apiPagination.per_page, apiPagination.total) }
    : { current_page: 1, last_page: 1, per_page: items.length || pageSize, total: items.length, from: items.length ? 1 : 0, to: items.length };

  const { can } = usePermissions();
  const hasPermission = (action: string, resource: string) => can(`${resource}.${action}`);

  return (
    <>
      <title>{t('form.currenciesIndexDocumentTitle', { appName: CONFIG.appName })}</title>
      <DataTable
        tableName={t("tableNames.currency")}
        columns={currencyColumns(
          { update: hasPermission('update', 'currency'), delete: hasPermission('delete', 'currency') },
          t, onDelete, deleteMutation.isPending, deletingId !== null, onDeleteConfirm, onDeleteCancel, deletingId, handleEdit
        )}
        data={items}
        createPath="/currencies/create"
        hasDetails
        detailsLink="/currencies/details"
        permissions={{ create: hasPermission('create', 'currency'), update: hasPermission('update', 'currency'), delete: hasPermission('delete', 'currency') }}
        isLoading={isLoading}
        columnTranslations={{ id: t('columns.id'), code: t('columns.code'), name: t('columns.name'), symbol: t('columns.symbol'), exchange_rate: t('columns.rate'), is_default: t('columns.default'), is_active: t('columns.status'), actions: t('columns.action') }}
        pagination={pagination}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={(page: number) => setCurrentPage(page)}
        onPageSizeChange={(size: number) => { setPageSize(size); setCurrentPage(1); }}
        onSearchChange={setSearch}
      />
    </>
  );
}
