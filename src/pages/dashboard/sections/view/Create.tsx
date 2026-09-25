import type {
  ItemIdEntry,
  SectionCreateUpdatePayload,
} from '@/pages/dashboard/sections/types/section.types';

import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Iconify } from '@/shared/components/iconify';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { isCategoryCmsPage } from '@/pages/dashboard/sections/utils/category-page';
import { PRIMARY_API_FILTER_KEYS } from '@/pages/dashboard/sections/utils/api-method-config';
import { normalizeLayoutAndCardShape } from '@/pages/dashboard/sections/utils/section-layout';
import { CategoryPageBanner } from '@/pages/dashboard/sections/components/category-page-banner';
import { DynamicFilterField } from '@/pages/dashboard/sections/components/dynamic-filter-field';
import { useAddSectionToPage, useFetchPageBuilderPage } from '@/pages/dashboard/sections/hooks/usePageBuilder';
import {
  isGifManualModel,
  ManualItemsPicker,
} from '@/pages/dashboard/sections/components/manual-items-picker';
import {
  SectionSchema,
  type SectionFormValues,
} from '@/pages/dashboard/sections/validation/section.validation';
import {
  useCreateSection,
  useUpdateSection,
  useFetchSectionDetails,
} from '@/pages/dashboard/sections/hooks/useSections';
import {
  FormStep,
  ChoiceCard,
  CARD_SHAPES,
  LayoutPreview,
  SECTION_LAYOUTS,
  CardShapePreview,
} from '@/pages/dashboard/sections/components/section-form-ui';
import {
  isHomeCmsPage,
  autoFeedPreview,
  contentTypeLabel,
  CONTENT_TYPE_ICONS,
  isBannerContentType,
  isApiOnlyContentType,
  contentTypeToApiMethod,
  apiMethodToContentType,
  isQuickOrderContentType,
  CONTENT_TYPE_API_FILTERS,
  ALL_SECTION_CONTENT_TYPES,
  CONTENT_TYPE_ITEM_SOURCES,
  recommendedVariantForContentType,
} from '@/pages/dashboard/sections/utils/content-type-config';

import { bannerCardName } from 'src/utils/format-translated';

import { CONFIG } from 'src/global-config';
import { Button } from 'src/shared/ui/button';
import { Box, Typography } from 'src/shared/ui';
import { RHFTextField } from 'src/shared/components/hook-form/rhf-text-field';
import { RHFColorPicker } from 'src/shared/components/hook-form/rhf-color-picker';
import { CreateFormLayout } from 'src/shared/components/forms/create-form-layout';

// ----------------------------------------------------------------------

function extractCreatedId(response: unknown): number | undefined {
  if (!response || typeof response !== 'object') return undefined;
  const r = response as Record<string, any>;
  for (const candidate of [r.data?.id, r.data?.data?.id, r.id]) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

const NUMERIC_FILTER_KEYS = new Set([
  'category_id',
  'brand_id',
  'shop_id',
  'vendor_id',
  'schedule_days',
]);

function cleanFilters(values: Record<string, any>): Record<string, any> | undefined {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(values)) {
    if (val === undefined || val === null || val === '') continue;
    if (NUMERIC_FILTER_KEYS.has(key)) {
      const n = Number(val);
      if (Number.isFinite(n)) result[key] = n;
      continue;
    }
    result[key] = val;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export default function CreatePage() {
  const { t } = useTranslation('table');
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const returnPage = !isEditMode ? searchParams.get('returnPage')?.trim() || '' : '';

  const [orderedItems, setOrderedItems] = useState<ItemIdEntry[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [showColors, setShowColors] = useState(false);

  const { data: sectionData, isLoading: isLoadingSection } = useFetchSectionDetails(id || '');
  const createSectionMutation = useCreateSection();
  const updateSectionMutation = useUpdateSection();
  const addSectionToPageMutation = useAddSectionToPage();
  const { data: returnPageDetails } = useFetchPageBuilderPage(returnPage);

  const methods = useForm<SectionFormValues>({
    resolver: zodResolver(SectionSchema),
    defaultValues: {
      type: 'api',
      content_type: '',
      name: { ar: '', en: '' },
      layout: 'slider',
      variant: 'horizontal',
      background_color: '',
      background_card_color: '',
    },
  });

  const { handleSubmit, reset, watch, setValue } = methods;

  const watchedType = watch('type');
  const watchedContentType = watch('content_type') ?? '';
  const watchedLayout = watch('layout') ?? 'slider';
  const watchedVariant = watch('variant') ?? 'horizontal';
  const watchedBg = watch('background_color');
  const watchedCardBg = watch('background_card_color');

  const contentTypesToShow = useMemo(() => {
    const list = ALL_SECTION_CONTENT_TYPES.filter((type) => !isQuickOrderContentType(type));
    if (
      watchedContentType &&
      !list.includes(watchedContentType) &&
      !isQuickOrderContentType(watchedContentType)
    ) {
      list.unshift(watchedContentType);
    }
    return list;
  }, [watchedContentType]);

  const isBannerContent = isBannerContentType(watchedContentType);
  const isApiOnlyContent = isApiOnlyContentType(watchedContentType);
  const showFillStep = Boolean(watchedContentType) && !isBannerContent && !isApiOnlyContent;

  const isCategoryPage = isCategoryCmsPage(returnPageDetails?.data);
  const showQuickOrderSettingsHint =
    Boolean(returnPage) && !isCategoryPage && isHomeCmsPage(returnPageDetails?.data ?? { id: returnPage });
  const hasBannerSectionOnPage = useMemo(() => {
    const sections = returnPageDetails?.data?.sections ?? [];
    return sections.some((section) => isBannerContentType(section.content_type));
  }, [returnPageDetails]);

  useEffect(() => {
    if (isEditMode) return;
    setOrderedItems([]);
    setFilterValues({});
  }, [watchedContentType, isEditMode]);

  useEffect(() => {
    if (isEditMode || !isBannerContent) return;
    setValue('type', 'manual', { shouldValidate: true, shouldDirty: true });
    setValue('layout', 'slider', { shouldValidate: true, shouldDirty: true });
    setValue('variant', 'horizontal', { shouldValidate: true, shouldDirty: true });
  }, [isBannerContent, isEditMode, setValue]);

  useEffect(() => {
    if (isEditMode || !isApiOnlyContent) return;
    setValue('type', 'api', { shouldValidate: true, shouldDirty: true });
  }, [isApiOnlyContent, isEditMode, setValue]);

  const manualItemsSource =
    (CONTENT_TYPE_ITEM_SOURCES as Record<string, { url: string; params?: Record<string, unknown> }>)[
      watchedContentType
    ] ?? undefined;

  const apiFilterSchema = useMemo(
    () => CONTENT_TYPE_API_FILTERS[watchedContentType] ?? {},
    [watchedContentType]
  );

  const primaryApiFilters = useMemo(
    () =>
      Object.entries(apiFilterSchema).filter(([key]) =>
        (PRIMARY_API_FILTER_KEYS as readonly string[]).includes(key)
      ),
    [apiFilterSchema]
  );

  const optionalApiFilters = useMemo(
    () =>
      Object.entries(apiFilterSchema).filter(
        ([key]) => !(PRIMARY_API_FILTER_KEYS as readonly string[]).includes(key)
      ),
    [apiFilterSchema]
  );

  const previewText = useMemo(
    () => autoFeedPreview(t, watchedContentType, filterValues),
    [t, watchedContentType, filterValues]
  );

  const labelOverrides = useMemo(() => {
    const map = new Map<number, string>();
    if (isEditMode && sectionData?.data?.items) {
      for (const row of sectionData.data.items as any[]) {
        const rowId = row.item?.id ?? row.id;
        const label =
          bannerCardName(row.item?.title) ||
          bannerCardName(row.item?.name) ||
          bannerCardName(row.title) ||
          bannerCardName(row.name);
        if (label) map.set(rowId, label);
      }
    }
    return map;
  }, [isEditMode, sectionData?.data?.items]);

  useEffect(() => {
    if (isEditMode && sectionData?.data && !isLoadingSection) {
      const section = sectionData.data;
      const nameObj = section.admin_name || section.name;
      const nameEn =
        typeof nameObj === 'object' && nameObj !== null
          ? (nameObj as any).en || ''
          : String(nameObj || '');
      const nameAr =
        typeof nameObj === 'object' && nameObj !== null
          ? (nameObj as any).ar || ''
          : String(nameObj || '');

      const contentType =
        section.content_type ||
        section.manual?.manual_model ||
        apiMethodToContentType(section.api?.api_method) ||
        '';
      const sectionType = section.type === 'api' ? 'api' : 'manual';

      const { layout: sectionLayout, variant: sectionVariant } = normalizeLayoutAndCardShape({
        layout: section.layout,
        variant: section.variant,
      });

      reset({
        type: sectionType,
        content_type: contentType,
        name: { en: nameEn, ar: nameAr },
        layout: sectionLayout,
        variant: sectionVariant,
        background_color: section.background_color ?? '',
        background_card_color: section.background_card_color ?? '',
      });

      if (section.background_color || section.background_card_color) {
        setShowColors(true);
      }

      const savedFilters = section.filters ?? (section.api as any)?.filters;
      if (savedFilters && typeof savedFilters === 'object' && !Array.isArray(savedFilters)) {
        setFilterValues(savedFilters as Record<string, any>);
      }

      setOrderedItems(
        (section.items ?? []).map((item: any, index: number) => ({
          item_id: item.item?.id ?? item.id,
          order: item.order ?? index,
          ...(isGifManualModel(contentType) ? { link: item.link ?? '' } : {}),
        }))
      );
    }
  }, [sectionData, isEditMode, isLoadingSection, reset]);

  const isSubmitting =
    createSectionMutation.isPending ||
    updateSectionMutation.isPending ||
    addSectionToPageMutation.isPending;
  const errorMessage =
    createSectionMutation.error?.message ||
    updateSectionMutation.error?.message ||
    addSectionToPageMutation.error?.message ||
    null;

  const handleContentTypeChange = (type: string) => {
    if (isEditMode) return;
    setValue('content_type', type, { shouldValidate: true, shouldDirty: true });
    if (isBannerContentType(type)) {
      setValue('type', 'manual', { shouldValidate: true, shouldDirty: true });
      setValue('layout', 'slider', { shouldValidate: true, shouldDirty: true });
      setValue('variant', 'horizontal', { shouldValidate: true, shouldDirty: true });
    } else if (isApiOnlyContentType(type)) {
      setValue('type', 'api', { shouldValidate: true, shouldDirty: true });
    }
    const recommendedVariant = recommendedVariantForContentType(type);
    if (recommendedVariant) {
      setValue('variant', recommendedVariant, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleTypeChange = (type: 'manual' | 'api') => {
    if (isEditMode) return;
    setValue('type', type, { shouldValidate: true, shouldDirty: true });
    if (type === 'api' && isBannerContentType(watchedContentType)) {
      setValue('content_type', '', { shouldValidate: true, shouldDirty: true });
    }
    if (type === 'manual' && isApiOnlyContentType(watchedContentType)) {
      setValue('content_type', '', { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleFilterChange = (filterKey: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [filterKey]: value }));
  };

  const onSubmit = async (data: SectionFormValues) => {
    if (data.type === 'manual' && orderedItems.length === 0) {
      toast.error(t('form.sectionEasyPickItemsRequired'));
      return;
    }

    const apiMethod = contentTypeToApiMethod(data.content_type);
    const filters = cleanFilters(filterValues);

    const payload: SectionCreateUpdatePayload = {
      name: {
        en: data.name.en,
        ar: data.name.ar,
      },
      content_type: data.content_type,
      type: data.type,
      layout: data.layout ?? 'slider',
      variant: data.variant ?? 'horizontal',
      ...(data.background_color ? { background_color: data.background_color } : {}),
      ...(data.background_card_color
        ? { background_card_color: data.background_card_color }
        : {}),
      ...(data.type === 'manual'
        ? {
            manual_model: data.content_type,
            item_ids: orderedItems.map((entry, index) => {
              const base = { item_id: entry.item_id, order: index };
              if (!isGifManualModel(data.content_type)) return base;
              const trimmed = entry.link?.trim() ?? '';
              return { ...base, link: trimmed === '' ? null : trimmed };
            }),
          }
        : {
            ...(apiMethod ? { api_method: apiMethod } : {}),
            ...(filters ? { filters } : {}),
          }),
    };

    try {
      if (isEditMode && id) {
        await updateSectionMutation.mutateAsync({ id, data: payload });
        toast.success(t('form.sectionUpdatedSuccess'));
        navigate('/sections');
        return;
      }

      const created = await createSectionMutation.mutateAsync(payload);
      toast.success(t('form.sectionCreatedSuccess'));

      if (returnPage) {
        const newId = extractCreatedId(created);
        if (newId) {
          try {
            await addSectionToPageMutation.mutateAsync({
              pageId: returnPage,
              data: {
                section_id: newId,
                layout: data.layout ?? 'slider',
                variant: data.variant ?? 'horizontal',
              },
            });
            toast.success(t('form.pageBuilderSectionAddedSuccess'));
            navigate(`/sections/pages/details/${returnPage}`);
            return;
          } catch {
            navigate(`/sections/pages/${returnPage}/sections/create`);
            return;
          }
        }
        navigate(`/sections/pages/${returnPage}/sections/create`);
        return;
      }

      navigate('/sections');
    } catch (error: any) {
      console.error('Error saving section:', error);
    }
  };

  const handleCancel = () => {
    navigate(returnPage ? `/sections/pages/${returnPage}/sections/create` : '/sections');
  };

  const apiDisabled = isBannerContentType(watchedContentType);
  const hasColors = Boolean(watchedBg || watchedCardBg);
  const lookStepCount = isBannerContent ? 1 : 2;
  const afterLookStep = 2 + lookStepCount;
  const fillStepN = afterLookStep + 1;
  const itemsStepN = showFillStep ? fillStepN + 1 : afterLookStep + 1;

  return (
    <>
      <title>
        {isEditMode
          ? t('form.sectionEditDocumentTitle', { appName: CONFIG.appName })
          : t('form.sectionCreateDocumentTitle', { appName: CONFIG.appName })}
      </title>

      <CreateFormLayout
        methods={methods}
        onSubmit={handleSubmit(onSubmit, (errors) => {
          const firstError = Object.values(errors)[0] as any;
          const nested = firstError?.en || firstError?.ar || firstError;
          const message = nested?.message || firstError?.message || t('pleaseFixValidationErrors');
          toast.error(message);
        })}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        title={isEditMode ? t('form.editSection') : t('form.createSection')}
        description={isEditMode ? t('form.editSectionDesc') : isCategoryPage ? t('form.createSectionDescCategory') : t('form.createSectionDesc')}
        isEditMode={isEditMode}
        isLoading={isLoadingSection}
        loadingText={t('form.loadingSection')}
        submitLabel={isEditMode ? t('form.updateSectionSubmit') : t('form.createSectionSubmit')}
        submittingLabel={isEditMode ? t('form.updatingSection') : t('form.creatingSection')}
        maxWidth="xl"
        formInnerClassName="flex flex-col gap-8"
      >
        {returnPage && <CategoryPageBanner page={returnPageDetails?.data} />}

        {returnPage && showQuickOrderSettingsHint && (
          <Box className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] px-4 py-3">
            <Box className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Iconify
                icon="solar:info-circle-bold"
                className="mt-0.5 shrink-0 text-sky-700"
                width={18}
              />
              <Typography variant="body2" className="min-w-0 flex-1 text-muted-foreground">
                {t('form.pageBuilderQuickOrderNotASectionNotice')}
              </Typography>
              <Button
                type="button"
                variant="outlined"
                onClick={() => navigate('/settings?tab=quick_order')}
                className="shrink-0 gap-2 self-start whitespace-nowrap"
              >
                <Iconify icon="solar:bolt-bold" width={16} />
                {t('form.pageBuilderOpenQuickOrderSettings')}
              </Button>
            </Box>
          </Box>
        )}

        {returnPage && isBannerContent && hasBannerSectionOnPage && (
          <Box className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
            <Box className="flex items-start gap-3">
              <Iconify icon="solar:info-circle-bold" className="mt-0.5 shrink-0 text-amber-700" width={18} />
              <Typography variant="body2" className="min-w-0 flex-1 text-muted-foreground">
                {t('form.pageBuilderBannerExistingWarning')}
              </Typography>
            </Box>
          </Box>
        )}

        <FormStep n={1} title={t('form.sectionEasyNameTitle')} hint={t('form.sectionEasyNameHint')}>
          <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Box>
              <Typography variant="subtitle2" className="mb-1.5 font-semibold text-foreground">
                {t('form.sectionEasyNameAr')}
              </Typography>
              <RHFTextField
                name="name.ar"
                placeholder={t('form.sectionEasyNameArPlaceholder')}
                dir="rtl"
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" className="mb-1.5 font-semibold text-foreground">
                {t('form.sectionEasyNameEn')}
              </Typography>
              <RHFTextField name="name.en" placeholder={t('form.sectionEasyNameEnPlaceholder')} />
            </Box>
          </Box>
        </FormStep>

        <FormStep
          n={2}
          title={t('form.sectionEasyContentTitle')}
          hint={
            isEditMode
              ? t('form.sectionEasyContentLocked')
              : watchedType === 'api'
                ? t('form.sectionEasyContentHintAuto')
                : t('form.sectionEasyContentHint')
          }
        >
          <Box className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {contentTypesToShow.map((type) => {
              const active = watchedContentType === type;
              const icon = CONTENT_TYPE_ICONS[type] ?? 'solar:widget-bold';
              return (
                <ChoiceCard
                  key={type}
                  active={active}
                  disabled={isEditMode}
                  onClick={() => handleContentTypeChange(type)}
                >
                  <Box className="flex flex-col items-start gap-2">
                    <Box
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                        active
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border/50 bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <Iconify icon={icon} width={18} />
                    </Box>
                    <Typography variant="subtitle2" className="font-semibold leading-snug">
                      {t(`form.sectionEasyContent_${type}`, {
                        defaultValue: contentTypeLabel(t, type),
                      })}
                    </Typography>
                    <Typography variant="caption" className="text-muted-foreground leading-snug">
                      {t(`form.sectionEasyContentHint_${type}`, {
                        defaultValue: '',
                      })}
                    </Typography>
                  </Box>
                </ChoiceCard>
              );
            })}
          </Box>
        </FormStep>

        {!isBannerContent ? (
          <>
            <FormStep n={3} title={t('form.sectionEasyLayoutTitle')} hint={t('form.sectionEasyLayoutHint')}>
              <Box className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {SECTION_LAYOUTS.map((layout) => {
                  const active = watchedLayout === layout;
                  return (
                    <ChoiceCard
                      key={layout}
                      active={active}
                      onClick={() =>
                        setValue('layout', layout, { shouldValidate: true, shouldDirty: true })
                      }
                    >
                      <LayoutPreview layout={layout} />
                      <Typography variant="subtitle2" className="mt-2 font-bold">
                        {t(`form.sectionEasyLayout_${layout}`)}
                      </Typography>
                      <Typography variant="caption" className="mt-1 block text-muted-foreground">
                        {t(`form.sectionEasyLayoutHint_${layout}`)}
                      </Typography>
                    </ChoiceCard>
                  );
                })}
              </Box>
            </FormStep>

            <FormStep n={4} title={t('form.sectionEasyCardShapeTitle')} hint={t('form.sectionEasyCardShapeHint')}>
              <Box className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {CARD_SHAPES.map((shape) => {
                  const active = watchedVariant === shape;
                  return (
                    <ChoiceCard
                      key={shape}
                      active={active}
                      onClick={() =>
                        setValue('variant', shape, { shouldValidate: true, shouldDirty: true })
                      }
                    >
                      <CardShapePreview shape={shape} />
                      <Typography variant="subtitle2" className="mt-2 font-bold">
                        {t(`form.sectionEasyCardShape_${shape}`)}
                      </Typography>
                      <Typography variant="caption" className="mt-1 block text-muted-foreground">
                        {t(`form.sectionEasyCardShapeHint_${shape}`)}
                      </Typography>
                    </ChoiceCard>
                  );
                })}
              </Box>
            </FormStep>
          </>
        ) : (
          <FormStep n={3} title={t('form.sectionEasyLookTitle')} hint={t('form.sectionEasyLookBannerHint')}>
            <Box className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
              <Iconify icon="solar:gallery-bold" className="mt-0.5 shrink-0 text-amber-700" width={18} />
              <Typography variant="body2" className="min-w-0 flex-1 text-muted-foreground">
                {t('form.pageBuilderBannerPickHelper')}
              </Typography>
            </Box>
          </FormStep>
        )}

        {showFillStep && (
          <FormStep n={fillStepN} title={t('form.sectionEasyFillTitle')} hint={t('form.sectionEasyFillHint')}>
            <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ChoiceCard
                active={watchedType === 'api'}
                disabled={isEditMode || apiDisabled}
                onClick={() => handleTypeChange('api')}
              >
                <Box className="flex items-start gap-3">
                  <Box
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      watchedType === 'api'
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border/50 bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <Iconify icon="solar:magic-stick-3-bold" width={20} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" className="font-bold">
                      {t('form.sectionEasyFillAuto')}
                    </Typography>
                    <Typography variant="body2" className="mt-1 text-muted-foreground">
                      {apiDisabled
                        ? t('form.sectionEasyFillAutoBannerOff')
                        : t('form.sectionEasyFillAutoHint')}
                    </Typography>
                  </Box>
                </Box>
              </ChoiceCard>
              <ChoiceCard
                active={watchedType === 'manual'}
                disabled={isEditMode || isApiOnlyContent}
                onClick={() => handleTypeChange('manual')}
              >
                <Box className="flex items-start gap-3">
                  <Box
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      watchedType === 'manual'
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border/50 bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <Iconify icon="solar:hand-stars-bold" width={20} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" className="font-bold">
                      {t('form.sectionEasyFillManual')}
                    </Typography>
                    <Typography variant="body2" className="mt-1 text-muted-foreground">
                      {t('form.sectionEasyFillManualHint')}
                    </Typography>
                  </Box>
                </Box>
              </ChoiceCard>
            </Box>
          </FormStep>
        )}

        <FormStep
          n={itemsStepN}
          title={
            watchedType === 'api'
              ? t('form.sectionEasyFiltersTitle')
              : t('form.sectionEasyItemsTitle')
          }
          hint={
            !watchedContentType
              ? t('form.sectionEasyItemsNeedType')
              : watchedType === 'api'
                ? t('form.sectionEasyFiltersHint')
                : t('form.sectionEasyItemsHint', {
                    type: contentTypeLabel(t, watchedContentType),
                  })
          }
        >
          {watchedType === 'manual' &&
            (watchedContentType ? (
              <ManualItemsPicker
                manualModel={watchedContentType}
                orderedItems={orderedItems}
                setOrderedItems={setOrderedItems}
                source={manualItemsSource}
                labelOverrides={labelOverrides}
              />
            ) : (
              <Box className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
                <Iconify
                  icon="solar:widget-bold"
                  className="mx-auto mb-2 text-muted-foreground/50"
                  width={32}
                />
                <Typography variant="body2" className="text-muted-foreground">
                  {t('form.sectionEasyItemsNeedType')}
                </Typography>
              </Box>
            ))}

          {watchedType === 'api' &&
            (watchedContentType ? (
              <Box className="rounded-2xl border border-border/60 bg-card p-5">
                {primaryApiFilters.length > 0 && (
                  <Box className="flex flex-col gap-4">
                    {primaryApiFilters.map(([filterKey, filterConfig]) => (
                      <DynamicFilterField
                        key={`${watchedContentType}_${filterKey}`}
                        filterKey={filterKey}
                        filterConfig={filterConfig}
                        value={filterValues[filterKey]}
                        onChange={(value) => handleFilterChange(filterKey, value)}
                      />
                    ))}
                  </Box>
                )}

                {optionalApiFilters.length > 0 && (
                  <Box className={primaryApiFilters.length > 0 ? 'mt-5' : undefined}>
                    <Typography
                      variant="caption"
                      className="mb-3 block font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {t('form.sectionEasyFiltersOptional')}
                    </Typography>
                    <Box className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {optionalApiFilters.map(([filterKey, filterConfig]) => (
                        <DynamicFilterField
                          key={`${watchedContentType}_${filterKey}`}
                          filterKey={filterKey}
                          filterConfig={filterConfig}
                          value={filterValues[filterKey]}
                          onChange={(value) => handleFilterChange(filterKey, value)}
                          allowNullOption
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {primaryApiFilters.length === 0 && optionalApiFilters.length === 0 && (
                  <Typography variant="body2" className="text-muted-foreground">
                    {t('form.sectionEasyFiltersNone')}
                  </Typography>
                )}

                <Box className="mt-5 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <Iconify
                    icon="solar:lightbulb-bolt-bold"
                    width={18}
                    className="mt-0.5 shrink-0 text-primary"
                  />
                  <Typography variant="body2" className="text-foreground">
                    {previewText}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
                <Iconify
                  icon="solar:widget-bold"
                  className="mx-auto mb-2 text-muted-foreground/50"
                  width={32}
                />
                <Typography variant="body2" className="text-muted-foreground">
                  {t('form.sectionEasyItemsNeedType')}
                </Typography>
              </Box>
            ))}
        </FormStep>

        <Box>
          <button
            type="button"
            onClick={() => setShowColors((v) => !v)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-start hover:bg-muted/20"
          >
            <Iconify icon="solar:pallete-bold" className="text-muted-foreground" width={20} />
            <Box className="min-w-0 flex-1">
              <Typography variant="subtitle2" className="font-semibold">
                {t('form.sectionEasyColorsTitle')}
              </Typography>
              <Typography variant="caption" className="text-muted-foreground">
                {t('form.sectionEasyColorsHint')}
              </Typography>
            </Box>
            {hasColors && !showColors && (
              <span className="flex gap-1">
                {watchedBg && (
                  <span
                    className="h-5 w-5 rounded-md border border-border/60"
                    style={{ backgroundColor: watchedBg }}
                  />
                )}
                {watchedCardBg && (
                  <span
                    className="h-5 w-5 rounded-md border border-border/60"
                    style={{ backgroundColor: watchedCardBg }}
                  />
                )}
              </span>
            )}
            <Iconify
              icon={showColors ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
              width={18}
              className="text-muted-foreground"
            />
          </button>
          {showColors && (
            <Box className="mt-3 grid grid-cols-1 gap-4 rounded-2xl border border-border/60 bg-card p-5 md:grid-cols-2">
              <Box>
                <Typography variant="subtitle2" className="mb-1.5 font-semibold">
                  {t('form.sectionEasyColorBg')}
                </Typography>
                <RHFColorPicker name="background_color" />
              </Box>
              <Box>
                <Typography variant="subtitle2" className="mb-1.5 font-semibold">
                  {t('form.sectionEasyColorCard')}
                </Typography>
                <RHFColorPicker name="background_card_color" />
              </Box>
            </Box>
          )}
        </Box>
      </CreateFormLayout>
    </>
  );
}
