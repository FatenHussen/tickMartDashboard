import type { Page, FilterConfig } from '../types/page-section.types';
import type { SliderLibraryItem, UnifiedSectionCreatePayload } from '../types/page-builder.types';

import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate } from 'react-router';
import { Iconify } from '@/shared/components/iconify';
import { formatTranslated } from '@/utils/format-translated';
import { useFetchPages } from '@/pages/dashboard/sections/hooks/usePageSections';
import { isCategoryCmsPage } from '@/pages/dashboard/sections/utils/category-page';
import { isBannerContentType } from '@/pages/dashboard/sections/utils/content-type-config';
import { cmsPageSelectLabel } from '@/pages/dashboard/sections/utils/cms-page-select-label';
import { normalizeLayoutAndCardShape } from '@/pages/dashboard/sections/utils/section-layout';
import { DynamicFilterField } from '@/pages/dashboard/sections/components/dynamic-filter-field';
import { CategoryPageBanner } from '@/pages/dashboard/sections/components/category-page-banner';
import { normalizeFilterSchema } from '@/pages/dashboard/sections/utils/filter-config-normalize';
import { SliderLibraryPicker } from '@/pages/dashboard/sections/components/slider-library-picker';
import {
  useAddSectionToPage,
  useFetchPageBuilderPage,
} from '@/pages/dashboard/sections/hooks/usePageBuilder';
import {
  visiblePageShowWhenFilters,
  shouldShowPageVisibilityStep,
} from '@/pages/dashboard/sections/utils/page-visibility-filters';
import {
  UnifiedSectionSchema,
  type UnifiedSectionFormValues,
} from '@/pages/dashboard/sections/validation/page-builder.validation';
import {
  FormStep,
  ChoiceCard,
  CARD_SHAPES,
  LayoutPreview,
  SECTION_LAYOUTS,
  CardShapePreview,
} from '@/pages/dashboard/sections/components/section-form-ui';

import { CONFIG } from 'src/global-config';
import { Box, Typography } from 'src/shared/ui';
import { RHFTextField } from 'src/shared/components/hook-form/rhf-text-field';
import { RHFColorPicker } from 'src/shared/components/hook-form/rhf-color-picker';
import { CreateFormLayout } from 'src/shared/components/forms/create-form-layout';

// ----------------------------------------------------------------------

const VISIBILITY_NULL_FILTER_KEYS = new Set(['type', 'shop_id', 'category_id', 'brand_id']);

function buildShowWhenPayload(
  schema: Record<string, FilterConfig>,
  values: Record<string, any>
): Record<string, any> | undefined {
  const keys = Object.keys(schema);
  if (keys.length === 0) return undefined;

  const result: Record<string, any> = {};
  for (const key of keys) {
    const val = values[key];
    if (val === null) {
      result[key] = null;
    } else if (val !== undefined && val !== '') {
      result[key] = val;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function sectionDisplayName(item: SliderLibraryItem): string {
  if (typeof item.name === 'string') return item.name;
  return formatTranslated(item.name as { en?: string; ar?: string }) || `#${item.id}`;
}

/** Section name copied from the current banner title. Empty title still needs a pair for create. */
function bannerSectionName(name: SliderLibraryItem['name']): { ar: string; en: string } {
  if (typeof name === 'string') {
    const text = name.trim();
    return text ? { ar: text, en: text } : { ar: 'بانر', en: 'Banner' };
  }
  const ar = (name?.ar || '').trim();
  const en = (name?.en || '').trim();
  if (!ar && !en) return { ar: 'بانر', en: 'Banner' };
  return { ar: ar || en, en: en || ar };
}

export default function PageAddSection() {
  const { t } = useTranslation('table');
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();

  const [showWhenValues, setShowWhenValues] = useState<Record<string, any>>({});
  const [selectedSection, setSelectedSection] = useState<SliderLibraryItem | null>(null);
  /** Multiple banners selected for one new banner section (slider). */
  const [selectedBanners, setSelectedBanners] = useState<SliderLibraryItem[]>([]);
  const [filterContentType, setFilterContentType] = useState('');
  const [showColors, setShowColors] = useState(false);

  const { data: pagesData } = useFetchPages();
  const { data: pageDetailsData } = useFetchPageBuilderPage(pageId || '');
  const addSectionMutation = useAddSectionToPage();

  const page = useMemo(
    () =>
      (pageDetailsData?.data as Page | undefined) ??
      (pagesData?.data ?? []).find((p: Page) => String(p.id) === String(pageId ?? '')),
    [pageDetailsData, pagesData, pageId]
  );

  const pageFilters = useMemo(() => {
    const filters = page?.filters;
    if (filters && typeof filters === 'object' && !Array.isArray(filters)) {
      return normalizeFilterSchema(filters as Record<string, FilterConfig>);
    }
    return {};
  }, [page]);

  const isCategoryPage = isCategoryCmsPage(pageDetailsData?.data ?? page);
  const visibleShowWhenFilters = useMemo(
    () => visiblePageShowWhenFilters(pageFilters, isCategoryPage),
    [pageFilters, isCategoryPage]
  );
  const hasVisibilityStep = shouldShowPageVisibilityStep(pageFilters, isCategoryPage);

  const hasBannerSectionOnPage = useMemo(() => {
    const sections = (pageDetailsData?.data as any)?.sections ?? [];
    return Array.isArray(sections)
      ? sections.some((s: any) => isBannerContentType(s?.content_type))
      : false;
  }, [pageDetailsData]);

  const isBannerContent = isBannerContentType(filterContentType);
  const isBannerSection = isBannerContent || selectedBanners.length > 0;
  const hasLibrarySelection = isBannerContent
    ? selectedBanners.length > 0
    : Boolean(selectedSection);

  const methods = useForm<UnifiedSectionFormValues>({
    resolver: zodResolver(UnifiedSectionSchema),
    defaultValues: {
      position: 'after',
      layout: 'slider',
      variant: 'horizontal',
      order: '',
      background_color: '',
      background_card_color: '',
    },
  });

  const { handleSubmit, setValue, watch } = methods;

  const watchedPosition = watch('position') ?? 'after';
  const watchedLayout = watch('layout') ?? 'slider';
  const watchedVariant = watch('variant') ?? 'horizontal';
  const watchedBg = watch('background_color');
  const watchedCardBg = watch('background_card_color');

  useEffect(() => {
    if (isBannerContent) {
      // New banner sections default to a swipeable slider.
      setValue('layout', 'slider', { shouldValidate: true });
      setValue('variant', 'horizontal', { shouldValidate: true });
      return;
    }
    if (!selectedSection) return;
    if (selectedSection.content_type) {
      setFilterContentType(selectedSection.content_type);
    }
    setValue('background_color', selectedSection.background_color ?? '');
    setValue('background_card_color', selectedSection.background_card_color ?? '');
    if (selectedSection.background_color || selectedSection.background_card_color) {
      setShowColors(true);
    }
    const { layout, variant } = normalizeLayoutAndCardShape({
      layout: selectedSection.layout,
      variant: selectedSection.variant,
    });
    setValue('layout', layout, { shouldValidate: true });
    setValue('variant', variant, { shouldValidate: true });
  }, [selectedSection, isBannerContent, setValue]);

  const handleShowWhenChange = (filterKey: string, value: any) => {
    setShowWhenValues((prev) => ({ ...prev, [filterKey]: value }));
  };

  const handleContentTypeChange = (type: string) => {
    setFilterContentType(type);
    setSelectedSection(null);
    setSelectedBanners([]);
  };

  const handleToggleBanner = (item: SliderLibraryItem) => {
    setSelectedBanners((prev) => {
      const exists = prev.some((b) => b.id === item.id);
      if (exists) return prev.filter((b) => b.id !== item.id);
      return [...prev, item];
    });
    setSelectedSection(null);
  };

  const handleSelectSection = (item: SliderLibraryItem | null) => {
    setSelectedSection(item);
    setSelectedBanners([]);
  };

  const onSubmit = async (data: UnifiedSectionFormValues) => {
    if (!pageId) return;

    if (isBannerContent) {
      if (selectedBanners.length === 0) {
        toast.error(t('form.pageBuilderLibraryRequired'));
        return;
      }
    } else if (!selectedSection) {
      toast.error(t('form.pageBuilderLibraryRequired'));
      return;
    }

    const orderNumber = data.order === '' || data.order == null ? undefined : Number(data.order);
    const layout = data.layout ?? 'slider';
    const variant = data.variant ?? 'horizontal';

    const sharedPlacement = {
      position: data.position,
      // layout = slider|list|grid · variant = horizontal|vertical|square
      // Never send display_type_id — backend sets it from the section content type.
      layout,
      variant,
      ...(data.background_color ? { background_color: data.background_color } : {}),
      ...(data.background_card_color ? { background_card_color: data.background_card_color } : {}),
      ...(orderNumber != null && Number.isFinite(orderNumber) && orderNumber >= 1
        ? { order: orderNumber }
        : {}),
      ...(buildShowWhenPayload(visibleShowWhenFilters, showWhenValues)
        ? { show_when: buildShowWhenPayload(visibleShowWhenFilters, showWhenValues) }
        : {}),
    };

    const payload: UnifiedSectionCreatePayload = isBannerContent
      ? {
          ...sharedPlacement,
          type: 'manual',
          content_type: 'banner',
          name: bannerSectionName(selectedBanners[0]?.name),
          item_ids: selectedBanners.map((banner, index) => ({
            item_id: banner.banner_id ?? banner.id,
            order: index,
          })),
        }
      : {
          ...sharedPlacement,
          section_id: selectedSection!.id,
        };

    try {
      await addSectionMutation.mutateAsync({ pageId, data: payload });
      toast.success(t('form.pageBuilderSectionAddedSuccess'));
      navigate(`/sections/pages/details/${pageId}`);
    } catch (error) {
      console.error('Error linking section to page:', error);
    }
  };

  const handleCancel = () => {
    navigate(pageId ? `/sections/pages/details/${pageId}` : '/sections/pages');
  };

  const pageLabel = page ? cmsPageSelectLabel(page) : (pageId ?? '');
  const hasColors = Boolean(watchedBg || watchedCardBg);
  const showLookSteps = Boolean(filterContentType || selectedSection || selectedBanners.length);
  const positionStep = showLookSteps ? 4 : 2;
  const visibilityStep = hasVisibilityStep ? positionStep + 1 : positionStep;
  const selectionSummary = isBannerContent
    ? selectedBanners.length > 0
      ? t('form.itemsSelectedCount', { count: selectedBanners.length })
      : null
    : selectedSection
      ? sectionDisplayName(selectedSection)
      : null;

  return (
    <>
      <title>{t('form.pageBuilderAddSectionDocumentTitle', { appName: CONFIG.appName })}</title>

      <CreateFormLayout
        methods={methods}
        onSubmit={handleSubmit(onSubmit, (errors) => {
          const firstError = Object.values(errors)[0] as any;
          const message = firstError?.message || t('pleaseFixValidationErrors');
          toast.error(message);
        })}
        onCancel={handleCancel}
        isSubmitting={addSectionMutation.isPending}
        errorMessage={addSectionMutation.error?.message || null}
        title={t('form.pageBuilderAddSectionTitle', { page: pageLabel })}
        description={t('form.pageBuilderAddSectionDesc')}
        isEditMode={false}
        isLoading={false}
        loadingText=""
        submitLabel={t('form.pageBuilderAddSectionSubmit')}
        submittingLabel={t('form.creatingPageSection')}
        maxWidth="xl"
        formInnerClassName="flex flex-col gap-8"
      >
        <CategoryPageBanner page={pageDetailsData?.data} />

        <FormStep n={1} title={t('form.pageBuilderAddStep1Title')}>
          <SliderLibraryPicker
            pageId={pageId ?? ''}
            selectedId={selectedSection?.id ?? null}
            selectedIds={isBannerContent ? selectedBanners.map((b) => b.id) : undefined}
            selectedContentType={selectedSection?.content_type ?? filterContentType}
            onSelect={handleSelectSection}
            onToggleSelect={handleToggleBanner}
            onContentTypeChange={handleContentTypeChange}
          />

          {selectionSummary && (
            <Box className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.05] px-4 py-3">
              <Iconify icon="solar:check-circle-bold" className="shrink-0 text-primary" width={22} />
              <Box className="min-w-0 flex-1">
                <Typography variant="caption" className="text-muted-foreground">
                  {t('form.pageBuilderSelectedSection')}
                </Typography>
                <Typography variant="subtitle2" className="font-bold text-foreground truncate">
                  {selectionSummary}
                </Typography>
              </Box>
              <button
                type="button"
                onClick={() => {
                  setSelectedSection(null);
                  setSelectedBanners([]);
                }}
                className="shrink-0 text-sm font-medium text-primary hover:underline"
              >
                {t('form.pageBuilderChangeSection')}
              </button>
            </Box>
          )}

          {isBannerSection && hasBannerSectionOnPage && (
            <Box className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
              <Box className="flex items-start gap-3">
                <Iconify icon="solar:info-circle-bold" className="mt-0.5 shrink-0 text-amber-700" width={18} />
                <Typography variant="body2" className="min-w-0 flex-1 text-muted-foreground">
                  {t('form.pageBuilderBannerExistingWarning')}
                </Typography>
              </Box>
            </Box>
          )}
        </FormStep>

        {showLookSteps && (
          <>
            <FormStep n={2} title={t('form.pageBuilderLayoutTitle')} hint={t('form.pageBuilderLayoutHint')}>
              <Box className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {SECTION_LAYOUTS.map((layout) => {
                  const active = watchedLayout === layout;
                  return (
                    <ChoiceCard
                      key={layout}
                      active={active}
                      onClick={() =>
                        setValue('layout', layout, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    >
                      <LayoutPreview layout={layout} />
                      <Typography variant="subtitle2" className="mt-2 font-bold">
                        {t(`form.pageBuilderLayout_${layout}`)}
                      </Typography>
                      <Typography variant="caption" className="mt-1 block text-muted-foreground">
                        {t(`form.pageBuilderLayoutHint_${layout}`)}
                      </Typography>
                    </ChoiceCard>
                  );
                })}
              </Box>
            </FormStep>

            <FormStep n={3} title={t('form.pageBuilderCardShapeTitle')} hint={t('form.pageBuilderCardShapeHint')}>
              <Box className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {CARD_SHAPES.map((shape) => {
                  const active = watchedVariant === shape;
                  return (
                    <ChoiceCard
                      key={shape}
                      active={active}
                      onClick={() =>
                        setValue('variant', shape, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    >
                      <CardShapePreview shape={shape} />
                      <Typography variant="subtitle2" className="mt-2 font-bold">
                        {t(`form.pageBuilderCardShape_${shape}`)}
                      </Typography>
                      <Typography variant="caption" className="mt-1 block text-muted-foreground">
                        {t(`form.pageBuilderCardShapeHint_${shape}`)}
                      </Typography>
                    </ChoiceCard>
                  );
                })}
              </Box>
            </FormStep>
          </>
        )}

        {hasLibrarySelection && (
          <>
        <FormStep n={positionStep} title={t('form.pageBuilderAddStep2Title')} hint={t('form.pageBuilderAddStep2Hint')}>
          <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ChoiceCard
              active={watchedPosition === 'before'}
              onClick={() => setValue('position', 'before', { shouldValidate: true, shouldDirty: true })}
            >
              <Box className="flex items-start gap-3">
                <Box
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    watchedPosition === 'before'
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <Iconify icon="solar:arrow-up-bold" width={20} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" className="font-bold">
                    {t('form.positionBefore')}
                  </Typography>
                  <Typography variant="body2" className="mt-1 text-muted-foreground">
                    {t('form.pageBuilderPositionBeforeHint')}
                  </Typography>
                </Box>
              </Box>
            </ChoiceCard>
            <ChoiceCard
              active={watchedPosition === 'after'}
              onClick={() => setValue('position', 'after', { shouldValidate: true, shouldDirty: true })}
            >
              <Box className="flex items-start gap-3">
                <Box
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    watchedPosition === 'after'
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <Iconify icon="solar:arrow-down-bold" width={20} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" className="font-bold">
                    {t('form.positionAfter')}
                  </Typography>
                  <Typography variant="body2" className="mt-1 text-muted-foreground">
                    {t('form.pageBuilderPositionAfterHint')}
                  </Typography>
                </Box>
              </Box>
            </ChoiceCard>
          </Box>

          <Box className="mt-4 rounded-2xl border border-border/60 bg-card p-5">
            <Typography variant="subtitle2" className="mb-1.5 font-semibold text-foreground">
              {t('form.pageSectionFormOrderLabel')}
            </Typography>
            <Typography variant="body2" className="mb-3 text-muted-foreground">
              {t('form.pageBuilderOrderOptionalHelper')}
            </Typography>
            <RHFTextField
              name="order"
              type="number"
              placeholder={t('form.displayOrderPlaceholder')}
              className="max-w-xs"
            />
          </Box>
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
                  <RHFColorPicker name="background_color" helperText={t('form.bgColorHelper')} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" className="mb-1.5 font-semibold">
                    {t('form.sectionEasyColorCard')}
                  </Typography>
                  <RHFColorPicker
                    name="background_card_color"
                    helperText={t('form.bgCardColorHelper')}
                  />
                </Box>
              </Box>
            )}
        </Box>

        {hasVisibilityStep && (
          <FormStep
            n={visibilityStep}
            title={t('form.pageBuilderAddStep4Title')}
            hint={
              isCategoryPage
                ? t('form.pageBuilderAddStep4HintCategory')
                : t('form.pageBuilderAddStep4Hint')
            }
          >
            <Box className="rounded-2xl border border-border/60 bg-card p-5">
              <Box className="mb-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <Iconify
                  icon="solar:eye-bold"
                  width={18}
                  className="mt-0.5 shrink-0 text-primary"
                />
                <Typography variant="body2" className="text-foreground">
                  {isCategoryPage
                    ? t('form.pageSectionEditVisibilityCategoryNotice')
                    : t('form.pageSliderVisibilityFiltersNotice')}
                </Typography>
              </Box>
              <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Object.entries(visibleShowWhenFilters).map(([filterKey, filterConfig]) => (
                  <DynamicFilterField
                    key={`show_when_${filterKey}`}
                    filterKey={filterKey}
                    filterConfig={filterConfig}
                    value={showWhenValues[filterKey]}
                    onChange={(value) => handleShowWhenChange(filterKey, value)}
                    allowNullOption={VISIBILITY_NULL_FILTER_KEYS.has(filterKey)}
                  />
                ))}
              </Box>
            </Box>
          </FormStep>
        )}
          </>
        )}
      </CreateFormLayout>
    </>
  );
}
