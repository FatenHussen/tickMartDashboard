import type { NavMenuItem, NavMenuItemType } from '../types';

import { queryKeys } from '@/api';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { Iconify } from '@/shared/components/iconify';
import { useParams, useNavigate } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { compressImage } from '@/utils/compress-image';
import { formatTranslated } from '@/utils/format-translated';
import { _BrandApi } from '@/pages/dashboard/products/api/brand.services';
import { _CategoryApi } from '@/pages/dashboard/categories/api/category.services';
import { _PageBuilderApi } from '@/pages/dashboard/sections/api/page-builder.services';
import { cmsPageSelectLabel } from '@/pages/dashboard/sections/utils/cms-page-select-label';
import {
  buildCategorySelectRows,
  nativeSelectCategoryLabel,
} from '@/pages/dashboard/categories/utils/build-parent-picker-options';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';
import { Box, Input, Switch, Typography } from 'src/shared/ui';
import { LoadingScreen } from 'src/shared/components/loading-screen';
import { RHFSelect } from 'src/shared/components/hook-form/rhf-select';
import { RHFTextField } from 'src/shared/components/hook-form/rhf-text-field';
import { CreateFormLayout } from 'src/shared/components/forms/create-form-layout';

import { NAV_MENU_TARGET_FIELD } from '../types';
import {
  navMenuTypeOptions,
  navMenuRouteKeyLabel,
  navMenuRouteKeySelectOptions,
} from '../utils/nav-menu-labels';
import {
  NavMenuItemCreateSchema,
  NavMenuItemUpdateSchema,
  type NavMenuItemFormValues,
} from '../validation';
import {
  useCreateNavMenuItem,
  useUpdateNavMenuItem,
  useFetchNavMenuItems,
  useFetchNavMenuItemById,
  useFetchNavMenuRouteKeys,
} from '../hooks';

// ----------------------------------------------------------------------

const DEFAULT_VALUES: NavMenuItemFormValues = {
  title: { en: '', ar: '' },
  type: 'route',
  route_key: '',
  category_id: '',
  brand_id: '',
  page_id: '',
  url: '',
  icon: null,
  order: 0,
  is_active: true,
  open_in_new_tab: false,
};

/** Details payload may carry `{ ar, en }`, a JSON string, or a single-language string. */
function toLoc(value: unknown): { en: string; ar: string } {
  if (value && typeof value === 'object') {
    const o = value as { en?: unknown; ar?: unknown };
    if ('en' in o || 'ar' in o) {
      return { en: o.en != null ? String(o.en) : '', ar: o.ar != null ? String(o.ar) : '' };
    }
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as { en?: string; ar?: string };
      if (parsed && typeof parsed === 'object' && ('en' in parsed || 'ar' in parsed)) {
        return {
          en: parsed.en != null ? String(parsed.en) : '',
          ar: parsed.ar != null ? String(parsed.ar) : '',
        };
      }
    } catch {
      /* plain string */
    }
    return { en: value, ar: value };
  }
  return { en: '', ar: '' };
}

function toIdString(value: unknown): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? String(n) : '';
}

/** Only the target field that matches `type` is submitted, so stale picks never leak. */
function buildFormData(data: NavMenuItemFormValues, nextOrder?: number): FormData {
  const fd = new FormData();
  fd.append('title[en]', data.title.en.trim());
  fd.append('title[ar]', data.title.ar.trim());
  fd.append('type', data.type);

  const targetField = NAV_MENU_TARGET_FIELD[data.type];
  const targetValue = String(data[targetField] ?? '').trim();
  fd.append(targetField, targetValue);

  // Create: append after the last item. Edit: keep the stored order (reorder is drag-and-drop).
  const orderValue = nextOrder ?? data.order;
  if (orderValue !== undefined && orderValue !== null) {
    fd.append('order', String(orderValue));
  }
  fd.append('is_active', data.is_active ? '1' : '0');
  fd.append('open_in_new_tab', data.type === 'url' && data.open_in_new_tab ? '1' : '0');
  if (data.icon instanceof File) {
    fd.append('icon', data.icon);
  }
  return fd;
}

// ----------------------------------------------------------------------

export default function CreatePage() {
  const { t } = useTranslation('table');
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [previewIcon, setPreviewIcon] = useState<string | null>(null);

  const { data: detailResponse, isLoading: isLoadingDetail } = useFetchNavMenuItemById(id || '');
  const { data: listResponse } = useFetchNavMenuItems();
  const createMutation = useCreateNavMenuItem();
  const updateMutation = useUpdateNavMenuItem();

  const methods = useForm<NavMenuItemFormValues>({
    resolver: zodResolver(isEditMode ? NavMenuItemUpdateSchema : NavMenuItemCreateSchema) as any,
    defaultValues: DEFAULT_VALUES,
  });

  const { handleSubmit, reset, control, watch } = methods;
  const type = watch('type') as NavMenuItemType;
  const iconFile = watch('icon');
  const selectedRouteKey = watch('route_key');
  const selectedCategoryId = watch('category_id');
  const selectedBrandId = watch('brand_id');
  const selectedPageId = watch('page_id');

  // Target sources load only for the destination kind the admin actually picked.
  const { data: categories } = useQuery({
    queryKey: ['category', 'nav-menu-picker'],
    queryFn: () => _CategoryApi.getListAllCategoriesFlat({ per_page: 500 }),
    enabled: type === 'category',
  });

  const { data: brandsResp } = useQuery({
    queryKey: ['brand', 'nav-menu-picker'],
    queryFn: () =>
      _BrandApi.getListBrands({ page: 1, per_page: 500, sort_field: 'order', sort_order: 'asc' }),
    enabled: type === 'brand',
  });

  // Page Builder pages (`/admin/pages`). This picker needs every page in one list to resolve the
  // saved target, so it keeps the merge-all feed the Pages screen no longer uses.
  const { data: pagesResp } = useQuery({
    queryKey: queryKeys.pageBuilder.listAll(),
    queryFn: () => _PageBuilderApi.getListAllPagesFlat(),
    enabled: type === 'page',
  });

  /** Keeps the saved target selectable even when it falls outside the fetched page. */
  const withSelectedFallback = (
    options: Array<{ value: string; label: string }>,
    selected: string,
    fallbackLabel?: string
  ) => {
    if (!selected || options.some((o) => o.value === selected)) return options;
    return [{ value: selected, label: fallbackLabel || `#${selected}` }, ...options];
  };

  const { data: routeKeysFromApi } = useFetchNavMenuRouteKeys(type === 'route');
  const routeKeyOptions = useMemo(
    () =>
      withSelectedFallback(
        navMenuRouteKeySelectOptions(t, routeKeysFromApi),
        selectedRouteKey ?? '',
        navMenuRouteKeyLabel(selectedRouteKey, t)
      ),
    [t, routeKeysFromApi, selectedRouteKey]
  );
  const typeOptions = useMemo(() => navMenuTypeOptions(t), [t]);

  const categoryOptions = useMemo(
    () =>
      withSelectedFallback(
        buildCategorySelectRows(categories ?? []).map((row) => ({
          value: String(row.id),
          label: nativeSelectCategoryLabel(row.label, row.depth, row.hasChildren),
        })),
        selectedCategoryId ?? ''
      ),
    [categories, selectedCategoryId]
  );

  const brandOptions = useMemo(
    () =>
      withSelectedFallback(
        (brandsResp?.data?.items ?? []).map((brand) => ({
          value: String(brand.id),
          label:
            formatTranslated(brand.name as Parameters<typeof formatTranslated>[0], '') ||
            `#${brand.id}`,
        })),
        selectedBrandId ?? ''
      ),
    [brandsResp, selectedBrandId]
  );

  const pageOptions = useMemo(
    () =>
      withSelectedFallback(
        // Manually built pages first; category pages are better reached via `type=category`.
        [...(pagesResp ?? [])]
          .sort((a, b) => Number(Boolean(a.is_category_page)) - Number(Boolean(b.is_category_page)))
          .map((page) => ({
            value: String(page.id),
            label: cmsPageSelectLabel(page) || `#${page.id}`,
          })),
        selectedPageId ?? ''
      ),
    [pagesResp, selectedPageId]
  );

  useEffect(() => {
    if (!isEditMode || !detailResponse?.data) return;
    const d = detailResponse.data as NavMenuItem;
    const target = d.target ?? {};
    reset({
      title: toLoc(d.title),
      type: (d.type ?? 'route') as NavMenuItemType,
      route_key: String(d.route_key ?? target.route_key ?? ''),
      category_id: toIdString(d.category_id ?? target.category_id),
      brand_id: toIdString(d.brand_id ?? target.brand_id),
      page_id: toIdString(d.page_id ?? target.page_id),
      url: String(d.url ?? target.url ?? ''),
      icon: null,
      order: d.order ?? 0,
      is_active: d.is_active ?? true,
      open_in_new_tab: Boolean(d.open_in_new_tab),
    });
    setPreviewIcon(d.icon || null);
  }, [isEditMode, detailResponse, reset]);

  useEffect(() => {
    if (iconFile instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewIcon(reader.result as string);
      reader.readAsDataURL(iconFile);
      return;
    }
    setPreviewIcon(isEditMode ? (detailResponse?.data?.icon ?? null) : null);
  }, [iconFile, isEditMode, detailResponse?.data?.icon]);

  if (isEditMode && isLoadingDetail) return <LoadingScreen />;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const errorMessage = createMutation.error?.message || updateMutation.error?.message || null;

  const onSubmit = async (data: NavMenuItemFormValues) => {
    try {
      const icon = data.icon instanceof File ? await compressImage(data.icon) : data.icon;
      const nextOrder = isEditMode
        ? undefined
        : Math.max(0, ...(listResponse?.data?.items ?? []).map((item) => Number(item.order) || 0)) +
          1;
      const formData = buildFormData({ ...data, icon }, nextOrder);
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, formData });
        toast.success(t('form.navMenuItemUpdatedSuccess'));
      } else {
        await createMutation.mutateAsync(formData);
        toast.success(t('form.navMenuItemCreatedSuccess'));
      }
      navigate(paths.dashboard.navMenuItems.root);
    } catch {
      /* axios interceptor already surfaced the failure */
    }
  };

  const handleCancel = () => navigate(paths.dashboard.navMenuItems.root);

  return (
    <>
      <title>
        {isEditMode
          ? `${t('form.navMenuFormTitleEdit')} | ${CONFIG.appName}`
          : `${t('form.navMenuFormTitleCreate')} | ${CONFIG.appName}`}
      </title>

      <CreateFormLayout
        methods={methods as any}
        onSubmit={handleSubmit(onSubmit as any)}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        title={isEditMode ? t('form.navMenuFormTitleEdit') : t('form.navMenuFormTitleCreate')}
        description={isEditMode ? t('form.navMenuFormDescEdit') : t('form.navMenuFormDescCreate')}
        isEditMode={isEditMode}
        submitLabel={isEditMode ? t('edit') : t('create')}
        submittingLabel={isEditMode ? t('updating') : t('form.creating')}
      >
        {/* ── Section: item label ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 border-b border-border/40 bg-gradient-to-r from-primary/[0.06] via-primary/[0.02] to-transparent px-6 py-4">
            <Box className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Iconify icon="solar:letter-bold" className="text-primary" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.navMenuTitlesSectionHeading')}
            </Typography>
          </Box>
          <Box className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <Box>
              <Box className="mb-2 flex items-center gap-2">
                <Iconify icon="solar:letter-bold" className="text-primary" width={20} height={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.bannerEnglishTitleLabel')}
                </Typography>
              </Box>
              <RHFTextField name="title.en" placeholder={t('form.navMenuTitleEnPlaceholder')} />
            </Box>

            <Box>
              <Box className="mb-2 flex items-center gap-2">
                <Iconify icon="solar:letter-bold" className="text-primary" width={20} height={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.bannerArabicTitleLabel')}
                </Typography>
              </Box>
              <RHFTextField
                name="title.ar"
                placeholder={t('form.navMenuTitleArPlaceholder')}
                dir="rtl"
              />
            </Box>
          </Box>
        </Box>

        {/* ── Section: destination (type + the one field it needs) ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 border-b border-border/40 bg-gradient-to-r from-violet-500/[0.06] via-violet-500/[0.02] to-transparent px-6 py-4">
            <Box className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
              <Iconify icon="solar:link-bold" className="text-violet-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.navMenuDestinationSectionHeading')}
            </Typography>
          </Box>
          <Box className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <Box>
              <Box className="mb-2 flex items-center gap-2">
                <Iconify
                  icon="solar:routing-2-bold"
                  className="text-violet-500"
                  width={20}
                  height={20}
                />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.navMenuTypeLabel')}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                className="mb-2 block leading-relaxed text-muted-foreground"
              >
                {t('form.navMenuTypeHelper')}
              </Typography>
              <RHFSelect
                name="type"
                options={typeOptions}
                placeholder={t('form.navMenuTypeLabel')}
              />
            </Box>

            {type === 'route' ? (
              <Box>
                <Box className="mb-2 flex items-center gap-2">
                  <Iconify
                    icon="solar:smartphone-2-bold"
                    className="text-violet-500"
                    width={20}
                    height={20}
                  />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('form.navMenuRouteKeyLabel')}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  className="mb-2 block leading-relaxed text-muted-foreground"
                >
                  {t('form.navMenuRouteKeyHelper')}
                </Typography>
                <RHFSelect
                  name="route_key"
                  options={routeKeyOptions}
                  placeholder={t('form.navMenuSelectRouteKey')}
                />
              </Box>
            ) : null}

            {type === 'category' ? (
              <Box>
                <Box className="mb-2 flex items-center gap-2">
                  <Iconify
                    icon="solar:widget-4-bold"
                    className="text-violet-500"
                    width={20}
                    height={20}
                  />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('columns.category')}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  className="mb-2 block leading-relaxed text-muted-foreground"
                >
                  {t('form.navMenuCategoryHelper')}
                </Typography>
                <RHFSelect
                  name="category_id"
                  options={categoryOptions}
                  placeholder={t('form.navMenuSelectCategory')}
                />
              </Box>
            ) : null}

            {type === 'brand' ? (
              <Box>
                <Box className="mb-2 flex items-center gap-2">
                  <Iconify
                    icon="solar:tag-bold"
                    className="text-violet-500"
                    width={20}
                    height={20}
                  />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('form.navMenuBrandLabel')}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  className="mb-2 block leading-relaxed text-muted-foreground"
                >
                  {t('form.navMenuBrandHelper')}
                </Typography>
                <RHFSelect
                  name="brand_id"
                  options={brandOptions}
                  placeholder={t('form.navMenuSelectBrand')}
                />
              </Box>
            ) : null}

            {type === 'page' ? (
              <Box>
                <Box className="mb-2 flex items-center gap-2">
                  <Iconify
                    icon="solar:document-text-bold"
                    className="text-violet-500"
                    width={20}
                    height={20}
                  />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('columns.page')}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  className="mb-2 block leading-relaxed text-muted-foreground"
                >
                  {t('form.navMenuPageHelper')}
                </Typography>
                <RHFSelect
                  name="page_id"
                  options={pageOptions}
                  placeholder={t('form.selectPage')}
                />
              </Box>
            ) : null}

            {type === 'url' ? (
              <>
                <Box>
                  <Box className="mb-2 flex items-center gap-2">
                    <Iconify
                      icon="solar:link-bold"
                      className="text-violet-500"
                      width={20}
                      height={20}
                    />
                    <Typography variant="subtitle2" className="font-semibold text-foreground">
                      {t('form.navMenuUrlLabel')}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    className="mb-2 block leading-relaxed text-muted-foreground"
                  >
                    {t('form.navMenuUrlHelper')}
                  </Typography>
                  <RHFTextField name="url" dir="ltr" placeholder="https://example.com/blog" />
                </Box>

                <Box className="flex items-start pt-7">
                  <Controller
                    name="open_in_new_tab"
                    control={control}
                    render={({ field }) => (
                      <div className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-4 transition-colors hover:border-violet-500/40 hover:bg-violet-500/[0.02]">
                        <Switch
                          checked={Boolean(field.value)}
                          onChange={(e) => field.onChange((e.target as HTMLInputElement).checked)}
                        />
                        <Box>
                          <Typography variant="subtitle2" className="font-semibold text-foreground">
                            {t('form.navMenuOpenInNewTabLabel')}
                          </Typography>
                          <Typography variant="caption" className="text-muted-foreground">
                            {t('form.navMenuOpenInNewTabHelper')}
                          </Typography>
                        </Box>
                      </div>
                    )}
                  />
                </Box>
              </>
            ) : null}
          </Box>
        </Box>

        {/* ── Section: icon & visibility ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 border-b border-border/40 bg-gradient-to-r from-amber-500/[0.06] via-amber-500/[0.02] to-transparent px-6 py-4">
            <Box className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
              <Iconify icon="solar:wallpaper-bold" className="text-amber-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.navMenuAppearanceSectionHeading')}
            </Typography>
          </Box>
          <Box className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <Box>
              <Box className="mb-2 flex items-center gap-2">
                <Iconify
                  icon="solar:wallpaper-bold"
                  className="text-amber-500"
                  width={20}
                  height={20}
                />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.navMenuIconLabel')}
                </Typography>
              </Box>
              <Controller
                name="icon"
                control={control}
                render={({
                  field: { onChange, value: _value, ...field },
                  fieldState: { error },
                }) => (
                  <div className="w-full">
                    <Input
                      {...field}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                      onChange={(e) => onChange(e.target.files?.[0] || null)}
                      error={!!error}
                      helperText={error?.message || t('form.navMenuIconHelper')}
                      fullWidth
                    />
                    {previewIcon ? (
                      <Box className="mt-4 flex items-center gap-3">
                        <img
                          src={previewIcon}
                          alt=""
                          className="h-16 w-16 rounded-xl border border-border/60 object-cover shadow-sm"
                        />
                      </Box>
                    ) : null}
                  </div>
                )}
              />
            </Box>

            <Box className="flex items-start">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <div className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-4 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/[0.02]">
                    <Switch
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange((e.target as HTMLInputElement).checked)}
                    />
                    <Box>
                      <Typography variant="subtitle2" className="font-semibold text-foreground">
                        {t('columns.status')}
                      </Typography>
                      <Typography variant="caption" className="text-muted-foreground">
                        {t('form.navMenuActiveHelper')}
                      </Typography>
                    </Box>
                  </div>
                )}
              />
            </Box>
          </Box>
        </Box>
      </CreateFormLayout>
    </>
  );
}
