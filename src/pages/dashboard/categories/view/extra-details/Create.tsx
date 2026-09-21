import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate } from 'react-router';
import { Iconify } from '@/shared/components/iconify';
import { useForm, Controller } from 'react-hook-form';
import { formatTranslated } from '@/utils/format-translated';
import { useRef, useMemo, useEffect, useCallback } from 'react';
import { _CategoryApi } from '@/pages/dashboard/categories/api/category.services';
import { MAX_CATEGORY_SUB_LEVELS } from '@/pages/dashboard/categories/utils/category-cascade-shared';
import { CategoryLeafCascadeFields } from '@/pages/dashboard/categories/components/category-leaf-cascade-fields';
import {
  ProductExtraDetailSchema,
  type ProductExtraDetailFormValues,
} from '@/pages/dashboard/categories/validation/product-extra-detail.validation';
import {
  ancestorsChainFromFlat,
  buildCategorySelectRows,
  paginateSelectRowsLocal,
} from '@/pages/dashboard/categories/utils/build-parent-picker-options';
import {
  useCreateProductExtraDetail,
  useUpdateProductExtraDetail,
  useFetchProductExtraDetailById,
} from '@/pages/dashboard/categories/hooks/product-extra-detail';

import { CONFIG } from 'src/global-config';
import { Box, Switch, Typography } from 'src/shared/ui';
import { RHFTextField } from 'src/shared/components/hook-form/rhf-text-field';
import { CreateFormLayout } from 'src/shared/components/forms/create-form-layout';
import { RHFInfiniteSelect } from 'src/shared/components/hook-form/rhf-infinite-select';

// ----------------------------------------------------------------------

type SubmitAction = 'back' | 'stay';

function langPair(v: unknown): { en: string; ar: string } {
  if (v && typeof v === 'object' && ('en' in (v as object) || 'ar' in (v as object))) {
    const o = v as { en?: string; ar?: string };
    return { en: o.en ?? '', ar: o.ar ?? '' };
  }
  return { en: '', ar: '' };
}

export default function CreatePage() {
  const { t } = useTranslation('table');
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const submitActionRef = useRef<SubmitAction>('back');
  const isEditMode = !!id;

  const {
    data: flatForParent,
    dataUpdatedAt: flatParentDataUpdatedAt,
    isFetched: flatParentFetched,
  } = useQuery({
    queryKey: ['categories', 'flat-parent-picker'],
    queryFn: () => _CategoryApi.getListCategoriesPaginated({ page: 1, per_page: 500 }),
  });

  const flatItems = flatForParent?.data?.items ?? [];

  const { data: detailResponse, isLoading: isLoadingDetail } = useFetchProductExtraDetailById(
    id || ''
  );
  const createMutation = useCreateProductExtraDetail();
  const updateMutation = useUpdateProductExtraDetail();

  const hydrateLeafCategoryId = useMemo(() => {
    const cid = detailResponse?.data?.category?.id;
    if (!isEditMode || cid == null) return null;
    const n = Number(cid);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [isEditMode, detailResponse?.data?.category?.id]);

  const legacyCategoryCascade = useMemo(() => {
    if (!flatParentFetched || flatItems.length === 0) return false;
    if (hydrateLeafCategoryId == null || hydrateLeafCategoryId <= 0) return false;
    const chain = ancestorsChainFromFlat(flatItems, hydrateLeafCategoryId);
    return chain.length > MAX_CATEGORY_SUB_LEVELS + 1;
  }, [flatParentFetched, flatItems, hydrateLeafCategoryId]);

  const legacyFlatRows = useMemo(() => buildCategorySelectRows(flatItems), [flatItems]);

  const legacyCategoryFetcher = useCallback(
    (page: number, limit: number) => {
      const rows = legacyFlatRows.map((r) => ({
        id: r.id,
        label: r.label,
        depth: r.depth,
        hasChildren: r.hasChildren,
      }));
      return Promise.resolve(paginateSelectRowsLocal(rows, page, limit));
    },
    [legacyFlatRows]
  );

  const defaultValues: ProductExtraDetailFormValues = {
    category_id: 0,
    detail_key: { en: '', ar: '' },
    price: 0,
    detail_value: { en: '', ar: '' },
    is_active: true,
  };

  const methods = useForm<ProductExtraDetailFormValues>({
    resolver: zodResolver(ProductExtraDetailSchema),
    defaultValues,
  });

  const { handleSubmit, reset, control, setValue } = methods;

  const syncLeafCategory = useCallback(
    (leafId: number) => {
      setValue('category_id', leafId, { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  useEffect(() => {
    if (isEditMode && detailResponse?.data && !isLoadingDetail) {
      const d = detailResponse.data;
      reset({
        category_id: d.category.id,
        detail_key: langPair(d.detail_key),
        price: Number(d.price) || 0,
        detail_value: langPair(d.detail_value),
        is_active: Boolean(d.is_active),
      });
    }
  }, [detailResponse, isEditMode, isLoadingDetail, reset]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const errorMessage =
    createMutation.error?.message || updateMutation.error?.message || null;

  const onSubmit = async (data: ProductExtraDetailFormValues) => {
    try {
      const valueEn = (data.detail_value?.en ?? '').trim();
      const valueAr = (data.detail_value?.ar ?? '').trim();
      const payload = {
        category_id: data.category_id,
        detail_key: { en: data.detail_key.en.trim(), ar: data.detail_key.ar.trim() },
        price: Number(data.price),
        ...(valueEn || valueAr ? { detail_value: { en: valueEn, ar: valueAr } } : {}),
        is_active: data.is_active,
      };

      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        toast.success(t('form.productExtraDetailUpdatedSuccess'));
        if (submitActionRef.current === 'back') {
          navigate('/categories/extra-details');
        }
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('form.productExtraDetailCreatedSuccess'));
        if (submitActionRef.current === 'back') {
          navigate('/categories/extra-details');
        }
      }
    } catch (e) {
      console.error('Error saving product extra detail:', e);
    }
  };

  const handleCancel = () => {
    navigate('/categories/extra-details');
  };

  const infoText = isEditMode
    ? t('form.productExtraDetailFormInfoEdit')
    : t('form.productExtraDetailFormInfoCreate');

  const categoryNameLabel = detailResponse?.data?.category?.name
    ? formatTranslated(detailResponse.data.category.name)
    : undefined;

  return (
    <>
      <title>
        {`${isEditMode ? t('form.editProductExtraDetail') : t('form.createProductExtraDetail')} | ${t('form.productExtraDetailBrandedTitle', { app: CONFIG.appName })}`}
      </title>

      <CreateFormLayout
        methods={methods}
        onSubmit={handleSubmit(onSubmit)}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        title={isEditMode ? t('form.editProductExtraDetail') : t('form.createProductExtraDetail')}
        description={
          isEditMode
            ? t('form.editProductExtraDetailDesc')
            : t('form.createProductExtraDetailDesc')
        }
        isEditMode={isEditMode}
        isLoading={isLoadingDetail}
        loadingText={t('form.loadingProductExtraDetail')}
        infoText={infoText}
        submitLabel={
          isEditMode ? t('form.updateProductExtraDetailSubmit') : t('form.createProductExtraDetailSubmit')
        }
        secondarySubmitLabel={t('save')}
        submittingLabel={
          isEditMode ? t('form.updatingProductExtraDetail') : t('form.creatingProductExtraDetail')
        }
        secondarySubmittingLabel={
          isEditMode ? t('form.updatingProductExtraDetail') : t('form.creatingProductExtraDetail')
        }
        onSubmitButtonClick={() => {
          submitActionRef.current = 'back';
        }}
        onSecondarySubmitButtonClick={() => {
          submitActionRef.current = 'stay';
        }}
      >
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-violet-500/[0.06] via-violet-500/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:diagram-bold" className="text-violet-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.categoryLabel')}
            </Typography>
          </Box>
          <Box className="p-6">
            {legacyCategoryCascade ? (
              <Box className="space-y-2">
                <Typography variant="caption" className="text-muted-foreground block">
                  {t('form.selectParentCategoryHelper')}
                </Typography>
                <RHFInfiniteSelect
                  name="category_id"
                  queryKey={[
                    'categories',
                    'infinite',
                    'product-extra-detail-form',
                    'legacy-flat',
                    flatParentDataUpdatedAt ?? 0,
                    id ?? '',
                  ]}
                  fetcher={legacyCategoryFetcher}
                  placeholder={t('form.selectCategory')}
                  helperText={t('form.categoryDeepParentHint')}
                  initialLabel={categoryNameLabel}
                />
              </Box>
            ) : (
              <CategoryLeafCascadeFields
                t={t}
                legacyMode={false}
                flatItems={flatItems}
                flatParentFetched={flatParentFetched}
                flatParentDataUpdatedAt={flatParentDataUpdatedAt ?? 0}
                hydrateLeafCategoryId={hydrateLeafCategoryId}
                hydrationKey={id ?? 'new-extra-detail'}
                onEffectiveLeafChange={syncLeafCategory}
              />
            )}
          </Box>
        </Box>

        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex flex-col gap-1 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-primary/[0.06] via-primary/[0.02] to-transparent sm:flex-row sm:items-start sm:gap-4">
            <Box className="flex items-start gap-3 min-w-0">
              <Box className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Iconify icon="solar:tag-bold" className="text-primary" width={17} />
              </Box>
              <Box className="min-w-0">
                <Typography variant="subtitle1" className="font-bold text-foreground tracking-tight">
                  {t('form.productExtraDetailKeySection')}
                </Typography>
                <Typography variant="caption" className="text-muted-foreground block mt-1 leading-relaxed">
                  {t('form.productExtraDetailKeySectionHint')}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Box className="group">
              <Typography variant="subtitle2" className="font-semibold text-foreground mb-2">
                {t('form.productExtraDetailTitleFieldAr')}
              </Typography>
              <RHFTextField
                name="detail_key.ar"
                placeholder={t('form.productExtraDetailKeyArPlaceholder')}
                className="transition-all duration-200"
                dir="rtl"
              />
            </Box>
            <Box className="group">
              <Typography variant="subtitle2" className="font-semibold text-foreground mb-2">
                {t('form.productExtraDetailTitleFieldEn')}
              </Typography>
              <RHFTextField
                name="detail_key.en"
                placeholder={t('form.productExtraDetailKeyEnPlaceholder')}
                className="transition-all duration-200"
              />
            </Box>
          </Box>
        </Box>

        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-amber-500/[0.06] via-amber-500/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:tag-price-bold" className="text-amber-600" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.productExtraDetailPriceSection')}
            </Typography>
          </Box>
          <Box className="p-6 max-w-md">
            <Typography variant="subtitle2" className="font-semibold text-foreground mb-2">
              {t('form.productExtraDetailPriceField')}
            </Typography>
            <RHFTextField
              name="price"
              type="number"
              placeholder={t('form.productExtraDetailPricePlaceholder')}
              className="transition-all duration-200"
            />
            <Typography variant="caption" className="text-muted-foreground block mt-2">
              {t('form.productExtraDetailPriceHint')}
            </Typography>
          </Box>
        </Box>

        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex flex-col gap-1 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-sky-500/[0.06] via-sky-500/[0.02] to-transparent sm:flex-row sm:items-start sm:gap-4">
            <Box className="flex items-start gap-3 min-w-0">
              <Box className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Iconify icon="solar:text-bold" className="text-sky-600" width={17} />
              </Box>
              <Box className="min-w-0">
                <Typography variant="subtitle1" className="font-bold text-foreground tracking-tight">
                  {t('form.productExtraDetailValueSection')}
                </Typography>
                <Typography variant="caption" className="text-muted-foreground block mt-1 leading-relaxed">
                  {t('form.productExtraDetailValueSectionHint')}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Box className="group">
              <Typography variant="subtitle2" className="font-semibold text-foreground mb-2">
                {t('form.productExtraDetailValueFieldAr')}
              </Typography>
              <RHFTextField
                name="detail_value.ar"
                placeholder={t('form.productExtraDetailValueArPlaceholder')}
                className="transition-all duration-200"
                dir="rtl"
              />
            </Box>
            <Box className="group">
              <Typography variant="subtitle2" className="font-semibold text-foreground mb-2">
                {t('form.productExtraDetailValueFieldEn')}
              </Typography>
              <RHFTextField
                name="detail_value.en"
                placeholder={t('form.productExtraDetailValueEnPlaceholder')}
                className="transition-all duration-200"
              />
            </Box>
          </Box>
        </Box>

        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-emerald-500/[0.06] via-emerald-500/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:shield-check-bold" className="text-emerald-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('statusLabel')}
            </Typography>
          </Box>
          <Box className="p-6">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-background/60 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] transition-colors max-w-lg">
                  <Switch
                    checked={field.value}
                    onChange={(e) => field.onChange((e.target as HTMLInputElement).checked)}
                  />
                  <Box>
                    <Typography variant="subtitle2" className="font-semibold text-foreground">
                      {t('active')}
                    </Typography>
                    <Typography variant="caption" className="text-muted-foreground">
                      {t('form.productExtraDetailActiveHelper')}
                    </Typography>
                  </Box>
                </div>
              )}
            />
          </Box>
        </Box>
      </CreateFormLayout>
    </>
  );
}
