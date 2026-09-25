import { toast } from 'react-toastify';
import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
// import type { BannerItem } from '@/pages/dashboard/banners/types/banner.types';
import { DataTable } from '@/shared/ui/table-data/table-data';
import { usePermissions } from '@/auth/hooks/use-permissions';
import { bannerColumns, type BannerFormValues } from '@/columns/one/banners/one';
import { useFetchBanners, useDeleteBanner } from '@/pages/dashboard/banners/hooks/banner';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

export default function Page() {
  const { t } = useTranslation('table');
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const params = search.trim() ? { search: search.trim() } : undefined;

  const { data: bannersResponse, isLoading, error } = useFetchBanners(currentPage, pageSize, params);
  const deleteBannerMutation = useDeleteBanner();

  if (error) {
    console.error('Error fetching banners:', error);
  }

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
        await deleteBannerMutation.mutateAsync(deletingId);
        toast.success(t('deleteSuccess'));
        setDeletingId(null);
      } catch { return; }
    }
  };

  const onDeleteCancel = () => {
    setDeletingId(null);
  };

  const handleEdit = (row: { original: BannerFormValues }) => {
    navigate(`${paths.dashboard.banners}/update/${row.original.id}`);
  };

  const bannerData = (bannersResponse?.data?.items ?? []) as BannerFormValues[];
  const apiPagination = bannersResponse?.data?.pagination;
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

  const { can } = usePermissions();

  const hasPermission = (action: string, resource: string) => can(`${resource}.${action}`);

  return (
    <>
      <title>{t('form.bannersIndexDocumentTitle', { appName: CONFIG.appName })}</title>

      <DataTable
        tableName={t("tableNames.banner")}
        columns={bannerColumns(
          {
            update: hasPermission('update', 'banner'),
            delete: hasPermission('delete', 'banner'),
          },
          t,
          onDelete,
          deleteBannerMutation.isPending,
          deletingId !== null,
          onDeleteConfirm,
          onDeleteCancel,
          deletingId,
          handleEdit
        )}
        data={bannerData}
        createPath={`${paths.dashboard.banners}/create`}
        hasDetails
        detailsLink={`${paths.dashboard.banners}/update`}
        permissions={{
          create: hasPermission('create', 'banner'),
          update: hasPermission('update', 'banner'),
          delete: hasPermission('delete', 'banner'),
        }}
        isLoading={isLoading}
        columnTranslations={{
          id: t('columns.id'),
          image_url: t('columns.image'),
          title: t('columns.title'),
          description: t('columns.description'),
          link: t('columns.link'),
          created_at: t('columns.createdAt'),
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
