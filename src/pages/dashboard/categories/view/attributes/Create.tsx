import type { CategoryData } from '@/pages/dashboard/categories/types/category.types';

import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate } from 'react-router';
import { Iconify } from '@/shared/components/iconify';
import { useMemo, useEffect, useCallback } from 'react';
import { formatTranslated } from '@/utils/format-translated';
import { useForm, useWatch, Controller, useFieldArray } from 'react-hook-form';
import { _CategoryApi } from '@/pages/dashboard/categories/api/category.services';
import { RHFInfiniteSelect } from '@/shared/components/hook-form/rhf-infinite-select';
import { isRootCategory } from '@/pages/dashboard/categories/utils/category-cascade-shared';
import { paginateSelectRowsLocal } from '@/pages/dashboard/categories/utils/build-parent-picker-options';
import {
  toCategoryAttributeValueFormRow,
  toCategoryAttributeValuePayload,
} from '@/pages/dashboard/categories/utils/category-attribute-values';
import {
  CategoryAttributeSchema,
  type CategoryAttributeFormValues,
} from '@/pages/dashboard/categories/validation/category-attribute.validation';
import {
  useCreateCategoryAttribute,
  useUpdateCategoryAttribute,
  useFetchCategoryAttributeById,
} from '@/pages/dashboard/categories/hooks/category-attribute';

import { CONFIG } from 'src/global-config';
import { Box, Button, Typography, SimpleSelect } from 'src/shared/ui';
import { RHFTextField } from 'src/shared/components/hook-form/rhf-text-field';
import { CreateFormLayout } from 'src/shared/components/forms/create-form-layout';

// ----------------------------------------------------------------------

function categoryListLabel(cat: Pick<CategoryData, 'name'>): string {
  return typeof cat.name === 'object' && cat.name !== null
    ? formatTranslated(cat.name as { en?: string; ar?: string })
    : String(cat.name ?? '');
}

function hexForDisplay(value: string | undefined) {
  const raw = value?.trim().replace(/\s/g, '') ?? '';
  if (!raw) return '';
  return raw.startsWith('#') ? raw : `#${raw}`;
}

export default function CreatePage() {
  const { t } = useTranslation('table');
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const typeOptions = useMemo(
    () => [
      { value: 'color', label: t('form.attributeTypeColor') },
      { value: 'square', label: t('form.attributeTypeSquare') },
      { value: 'circle', label: t('form.attributeTypeCircle') },
    ],
    [t]
  );

  const { data: flatForParent, dataUpdatedAt: flatParentDataUpdatedAt } = useQuery({
    queryKey: ['categories', 'attribute-form-roots'],
    queryFn: () =>
      _CategoryApi.getListCategoriesPaginated({ page: 1, per_page: 500, parent_id: null }),
  });

  const flatItems = flatForParent?.data?.items ?? [];

  // Hooks for fetching and mutations
  const { data: categoryAttributeData, isLoading: isLoadingAttribute } =
    useFetchCategoryAttributeById(id || '');
  const createCategoryAttributeMutation = useCreateCategoryAttribute();
  const updateCategoryAttributeMutation = useUpdateCategoryAttribute();

  const defaultValues: CategoryAttributeFormValues = {
    category_id: 0,
    name: {
      en: '',
      ar: '',
    },
    type: '',
    values: [{ name: { en: '', ar: '' } }],
  };

  const methods = useForm<CategoryAttributeFormValues>({
    resolver: zodResolver(CategoryAttributeSchema),
    defaultValues,
  });

  const { handleSubmit, reset, control, setValue } = methods;
  const attributeType = useWatch({ control, name: 'type' });
  const watchedValues = useWatch({ control, name: 'values' });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'values',
    // Keep API `id` on the row — default keyName "id" would overwrite it.
    keyName: 'fieldKey',
  });

  const rootCategoryFetcher = useCallback(
    (page: number, limit: number) => {
      const rows = flatItems
        .filter((cat) => isRootCategory(cat))
        .map((cat) => ({ id: cat.id, label: categoryListLabel(cat) }));
      return Promise.resolve(paginateSelectRowsLocal(rows, page, limit));
    },
    [flatItems]
  );

  // Fetch category attribute data if in edit mode
  useEffect(() => {
    if (isEditMode && categoryAttributeData?.data && !isLoadingAttribute && flatItems.length > 0) {
      const attribute = categoryAttributeData.data;
      const directId = attribute.category_id ?? attribute.root_category_id;
      let categoryId = directId != null && directId > 0 ? directId : 0;
      if (!categoryId) {
        const target = attribute.category?.trim() ?? '';
        const found = flatItems.find((cat) => categoryListLabel(cat).trim() === target);
        categoryId = found?.id ?? 0;
      }
      reset({
        category_id: categoryId,
        name: attribute.name,
        type: attribute.type,
        values:
          attribute.type === 'color'
            ? []
            : attribute.values?.length > 0
              ? attribute.values.map(toCategoryAttributeValueFormRow)
              : [{ name: { en: '', ar: '' } }],
      });
    }
  }, [
    categoryAttributeData,
    isEditMode,
    isLoadingAttribute,
    reset,
    flatItems,
  ]);

  useEffect(() => {
    if (attributeType === 'color') {
      if (!isEditMode && watchedValues.length > 0) {
        setValue('values', [], { shouldValidate: true, shouldDirty: true });
      }
      return;
    }

    if (watchedValues.length === 0) {
      setValue('values', [{ name: { en: '', ar: '' } }], { shouldValidate: true });
    }
  }, [attributeType, watchedValues, setValue, isEditMode]);

  const isSubmitting =
    createCategoryAttributeMutation.isPending || updateCategoryAttributeMutation.isPending;
  const errorMessage =
    createCategoryAttributeMutation.error?.message ||
    updateCategoryAttributeMutation.error?.message ||
    null;

  const onSubmit = async (data: CategoryAttributeFormValues) => {
    try {
      const selected = flatItems.find((cat) => cat.id === data.category_id);
      if (selected && !isRootCategory(selected)) {
        toast.error(t('form.attributeMustBeOnRoot'));
        return;
      }

      const payload = {
        category_id: data.category_id,
        name: {
          en: data.name.en,
          ar: data.name.ar,
        },
        type: data.type,
        ...(data.type !== 'color'
          ? {
              values: data.values.map(toCategoryAttributeValuePayload),
            }
          : {}),
      };

      if (isEditMode && id) {
        await updateCategoryAttributeMutation.mutateAsync({ id, data: payload });
        toast.success(t('form.categoryAttributeUpdatedSuccess'));
        navigate('/categories/attributes');
      } else {
        await createCategoryAttributeMutation.mutateAsync(payload);
        toast.success(t('form.categoryAttributeCreatedSuccess'));
        navigate('/categories/attributes');
      }
    } catch (error: any) {
      console.error('Error saving category attribute:', error);
    }
  };

  const handleCancel = () => {
    navigate('/categories/attributes');
  };

  const infoText = isEditMode
    ? t('form.categoryAttributeFormInfoEdit')
    : t('form.categoryAttributeFormInfoCreate');

  return (
    <>
      <title>
        {`${isEditMode ? t('form.editCategoryAttribute') : t('form.createCategoryAttribute')} | ${t('form.categoryAttributeBrandedTitle', { app: CONFIG.appName })}`}
      </title>

      <CreateFormLayout
        methods={methods}
        onSubmit={handleSubmit(onSubmit)}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        title={isEditMode ? t('form.editCategoryAttribute') : t('form.createCategoryAttribute')}
        description={
          isEditMode ? t('form.editCategoryAttributeDesc') : t('form.createCategoryAttributeDesc')
        }
        isEditMode={isEditMode}
        isLoading={isLoadingAttribute}
        loadingText={t('form.loadingCategoryAttribute')}
        infoText={infoText}
        submitLabel={
          isEditMode ? t('form.updateCategoryAttributeSubmit') : t('form.createCategoryAttributeSubmit')
        }
        submittingLabel={
          isEditMode ? t('form.updatingCategoryAttribute') : t('form.creatingCategoryAttribute')
        }
      >
        {/* ── Section: Configuration ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-violet-500/[0.06] via-violet-500/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:settings-bold" className="text-violet-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.categoryLabel')} & {t('form.attributeTypeLabel')}
            </Typography>
          </Box>
          <Box className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Box className="group md:col-span-2">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:diagram-bold" className="text-violet-500" width={20} height={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.categoryLabel')}
                </Typography>
              </Box>
              <Typography variant="caption" className="text-muted-foreground block mb-3">
                {t('form.attributeCategoryHelper')}
              </Typography>
              <RHFInfiniteSelect
                name="category_id"
                queryKey={[
                  'categories',
                  'infinite',
                  'attribute-form',
                  'roots',
                  flatParentDataUpdatedAt ?? 0,
                ]}
                fetcher={rootCategoryFetcher}
                placeholder={t('form.selectMainCategory')}
                initialLabel={categoryAttributeData?.data?.category}
              />
            </Box>

            <Box className="group">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:settings-bold" className="text-violet-500" width={20} height={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.attributeTypeLabel')}
                </Typography>
              </Box>
              <Controller
                name="type"
                control={control}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <SimpleSelect
                    value={value || ''}
                    onChange={onChange}
                    options={typeOptions}
                    placeholder={t('form.selectAttributeType')}
                    error={!!error}
                    helperText={error?.message || t('form.attributeTypeHelperText')}
                    fullWidth
                    className="transition-all duration-200"
                  />
                )}
              />
            </Box>
          </Box>
        </Box>

        {/* ── Section: Names ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-primary/[0.06] via-primary/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:tag-bold" className="text-primary" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.nameAr')} / {t('form.nameEn')}
            </Typography>
          </Box>
          <Box className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Box className="group">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:tag-bold" className="text-primary" width={20} height={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.nameAr')}
                </Typography>
              </Box>
              <RHFTextField
                name="name.ar"
                placeholder={t('form.colorNameAr')}
                helperText={t('form.attributeNameArHelper')}
                className="transition-all duration-200"
                dir="rtl"
              />
            </Box>

            <Box className="group">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:tag-bold" className="text-primary" width={20} height={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.nameEn')}
                </Typography>
              </Box>
              <RHFTextField
                name="name.en"
                placeholder={t('form.colorNameEn')}
                helperText={t('form.attributeNameEnHelper')}
                className="transition-all duration-200"
              />
            </Box>
          </Box>
        </Box>

        {/* ── Section: Color Values (edit mode only) ── */}
        {isEditMode && attributeType === 'color' && (
          <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
            <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-rose-500/[0.06] via-rose-500/[0.02] to-transparent">
              <Box className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Iconify icon="solar:palette-bold" className="text-rose-500" width={15} />
              </Box>
              <Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('form.attributeValuesSection')}
              </Typography>
            </Box>
            <Box className="p-6">
              <Typography variant="caption" className="text-muted-foreground block mb-4">
                {t('form.attributeColorValuesReadOnlyHint')}
              </Typography>
              <Box className="flex flex-wrap gap-3 p-4 border border-border/60 rounded-xl bg-muted/20">
                {(categoryAttributeData?.data?.values ?? []).map((val) => {
                  const enName = typeof val.name === 'string' ? val.name : val.name?.en;
                  const arName = typeof val.name === 'string' ? val.name : val.name?.ar;
                  const hex = hexForDisplay(enName || arName);
                  return (
                    <Box
                      key={val.id ?? `${hex}-${enName}-${arName}`}
                      className="flex flex-col items-center gap-1"
                      title={hex}
                    >
                      <Box
                        className="h-10 w-10 shrink-0 rounded-full border border-border shadow-sm"
                        style={{ backgroundColor: hex || undefined }}
                      />
                      <Typography variant="caption" className="text-muted-foreground max-w-[4.5rem] truncate">
                        {hex || '—'}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}

        {/* ── Section: Attribute Values ── */}
        {attributeType !== 'color' && (
          <Box className="rounded-2xl border border-amber-500/25 bg-card/50 shadow-sm overflow-hidden">
            <Box className="border-b border-border/40 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.03] to-transparent px-6 py-5">
              <Box className="flex flex-col gap-4">
                <Box className="flex items-center gap-3">
                  <Box className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                    <Iconify icon="solar:list-bold" className="text-amber-600" width={18} />
                  </Box>
                  <Box className="min-w-0 flex-1">
                    <Typography variant="subtitle1" className="font-semibold text-foreground leading-snug">
                      {t('form.attributeValuesSection')}
                    </Typography>
                    <Typography variant="caption" className="text-muted-foreground mt-1 block">
                      {t('form.attributeValuesSectionHint')}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  type="button"
                  variant="outlined"
                  color="warning"
                  size="small"
                  onClick={() => append({ name: { en: '', ar: '' } })}
                  className="w-full sm:w-auto sm:self-end inline-flex items-center justify-center gap-2"
                >
                  <Iconify icon="solar:add-circle-bold" width={18} height={18} />
                  {t('form.addAttributeValue')}
                </Button>
              </Box>
            </Box>
            <Box className="p-6 space-y-4">
              {fields.map((field, index) => {
                const canRemove = fields.length > 1;
                return (
                  <Box
                    key={field.id ?? field.fieldKey}
                    className="p-4 rounded-xl border border-border/60 bg-muted/25 space-y-3"
                  >
                    <Box className="flex flex-wrap items-center justify-between gap-3">
                      <Typography variant="subtitle2" className="font-semibold text-foreground">
                        {t('form.attributeValueIndex', { n: index + 1 })}
                      </Typography>
                      <Button
                        type="button"
                        variant="soft"
                        color="error"
                        size="small"
                        disabled={!canRemove}
                        title={
                          canRemove ? t('form.removeAttributeValue') : t('form.attributeValueRemoveDisabledHint')
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!canRemove) return;
                          remove(index);
                        }}
                        className="inline-flex shrink-0 items-center gap-1.5"
                      >
                        <Iconify icon="solar:trash-bin-bold" width={16} />
                        {t('form.removeAttributeValue')}
                      </Button>
                    </Box>
                    <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <RHFTextField
                        name={`values.${index}.name.en`}
                        placeholder={t('form.valueEn')}
                        label={t('form.nameEn')}
                        className="transition-all duration-200"
                      />
                      <RHFTextField
                        name={`values.${index}.name.ar`}
                        placeholder={t('form.valueAr')}
                        label={t('form.nameAr')}
                        className="transition-all duration-200"
                        dir="rtl"
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </CreateFormLayout>
    </>
  );
}
