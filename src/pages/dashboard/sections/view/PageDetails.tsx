import type { TFunction } from 'i18next';
import type { DragEndEvent } from '@dnd-kit/core';
import type { FilterConfig , PageSectionListItem } from '../types/page-section.types';
import type {
  PagePreviewPage,
  PagePreviewSection,
  PagePreviewQueryParams,
} from '../types/page-preview.types';

import { queryKeys } from '@/api';
import { toast } from 'react-toastify';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/shared/ui/button';
import { useTranslation } from 'react-i18next';
import { Iconify } from '@/shared/components/iconify';
import { useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/auth/hooks/use-permissions';
import { Dialog, DialogContent } from '@/shared/ui/dialogTable';
import { useAdminToggleStatus } from '@/hooks/use-admin-toggle-status';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router';
import { sectionTypeLabel } from '@/pages/dashboard/sections/utils/section-type-label';
import { useFetchPageBuilderPage } from '@/pages/dashboard/sections/hooks/usePageBuilder';
import { cmsPageSelectLabel } from '@/pages/dashboard/sections/utils/cms-page-select-label';
import { useSensor, DndContext, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { PagePreviewFilters } from '@/pages/dashboard/sections/components/page-preview-filters';
import { CategoryPageBanner } from '@/pages/dashboard/sections/components/category-page-banner';
import { isHomeCmsPage, isQuickOrderSection } from '@/pages/dashboard/sections/utils/content-type-config';
import { arrayMove , useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  isCategoryCmsPage,
  resolveLinkedCategoryId,
} from '@/pages/dashboard/sections/utils/category-page';
import {
  filtersToSearchParams,
  parsePagePreviewParams,
  buildPagePreviewFilters,
} from '@/pages/dashboard/sections/utils/page-preview-params';
import {
  useFetchPages,
  useFetchPagePreview,
  useDeletePageSection,
  useReorderPageSections,
} from '@/pages/dashboard/sections/hooks/usePageSections';

import {
  formatTranslated,
  type TranslatedValue,
  resolveItemDisplayLabel,
} from 'src/utils/format-translated';

import { CONFIG } from 'src/global-config';
import { Box, Typography } from 'src/shared/ui';
import { LoadingScreen } from 'src/shared/components/loading-screen';

// ----------------------------------------------------------------------

function resolveItemImageUrl(src: unknown): string | null {
  if (src == null || typeof src !== 'string') return null;
  const s = src.trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const base = CONFIG.serverUrl?.replace(/\/$/, '') ?? '';
  const path = s.replace(/^\//, '');
  return base ? `${base}/${path}` : s;
}

function getItemTitle(item: Record<string, unknown>): string {
  const nested =
    item.item && typeof item.item === 'object' && !Array.isArray(item.item)
      ? (item.item as Record<string, unknown>)
      : null;
  return (
    resolveItemDisplayLabel(
      item.title as TranslatedValue,
      item.name as TranslatedValue,
      nested?.title as TranslatedValue,
      nested?.name as TranslatedValue
    ) || '—'
  );
}

function getItemImage(item: Record<string, unknown>): string | null {
  const nested =
    item.item && typeof item.item === 'object' && !Array.isArray(item.item)
      ? (item.item as Record<string, unknown>)
      : null;
  return resolveItemImageUrl(
    item.image_url ??
      item.image ??
      item.icon ??
      nested?.image_url ??
      nested?.image ??
      nested?.icon
  );
}

function isBannerSection(section: PagePreviewSection): boolean {
  const fromSection = String(
    section.content_type ??
      section.manual_model ??
      (section as { manual?: { manual_model?: string } }).manual?.manual_model ??
      ''
  ).toLowerCase();
  if (fromSection === 'banner' || fromSection === 'gif') return true;
  return section.items.some((item) => {
    const type = String(item.item_type ?? item.type ?? '').toLowerCase();
    return type === 'banner' || type === 'gif';
  });
}

function variantLabel(t: TFunction<'table'>, variant?: string) {
  if (!variant) return '—';
  const key = `form.pageSectionVariant_${variant}` as const;
  const translated = t(key);
  return translated !== key ? translated : variant;
}

function layoutLabel(t: TFunction<'table'>, layout?: string) {
  if (!layout) return null;
  const key = `form.pageSectionLayout_${layout}` as const;
  const translated = t(key);
  return translated !== key ? translated : layout;
}

function resolveIsActive(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  return Boolean(value);
}

function mergePageSections(
  builderSections: PageSectionListItem[] | undefined,
  previewSections: PagePreviewSection[] | undefined
): PagePreviewSection[] {
  const previewById = new Map((previewSections ?? []).map((section) => [section.id, section]));
  const source = builderSections?.length ? builderSections : (previewSections ?? []);

  return [...source]
    .filter((section) => !isQuickOrderSection(section))
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map((section) => {
      const preview = previewById.get(section.id);
      const builder = builderSections?.length ? (section as PageSectionListItem) : null;
      const isActive = resolveIsActive(builder?.is_active ?? preview?.is_active);

      if (preview) {
        return { ...preview, is_active: isActive };
      }

      const row = section as PageSectionListItem;
      return {
        id: row.id,
        name: row.name as PagePreviewSection['name'],
        type: (row.type ?? 'manual') as PagePreviewSection['type'],
        position: (row.position as PagePreviewSection['position']) ?? 'after',
        order: row.order ?? 0,
        is_default: row.is_default,
        is_active: isActive,
        layout: row.layout,
        variant: row.variant,
        content_type: row.content_type,
        manual_model: row.manual_model as string | undefined,
        display_type_id: row.display_type_id,
        background_color: row.background_color,
        background_card_color: row.background_card_color,
        items: [],
      } satisfies PagePreviewSection;
    });
}

function sectionTypeStyles(type: PagePreviewSection['type']) {
  return type === 'api'
    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
    : 'bg-violet-500/10 text-violet-700 dark:text-violet-300';
}

function sectionAccentBorder(type: PagePreviewSection['type']) {
  return type === 'api' ? 'border-l-blue-500' : 'border-l-violet-500';
}

function ItemThumb({ item, wide }: { item: Record<string, unknown>; wide?: boolean }) {
  const imageSrc = getItemImage(item);
  const title = getItemTitle(item);

  return (
    <div
      className={`flex shrink-0 flex-col gap-1 overflow-hidden rounded-xl border border-border/40 bg-background ${
        wide ? 'w-44 sm:w-56' : 'w-28'
      }`}
    >
      <div
        className={`flex items-center justify-center overflow-hidden bg-muted/40 ${
          wide ? 'aspect-[16/6] w-full' : 'h-16'
        }`}
      >
        {imageSrc ? (
          <img src={imageSrc} alt={title} className="h-full w-full object-cover" />
        ) : (
          <Iconify icon="solar:gallery-minimalistic-bold" className="text-muted-foreground/30" width={18} />
        )}
      </div>
      {title && title !== '—' && (
        <span className="line-clamp-1 px-1.5 pb-1.5 text-center text-[10px] text-muted-foreground">
          {title}
        </span>
      )}
    </div>
  );
}

function PreviewItemCard({
  item,
  index,
  t,
  wide,
}: {
  item: Record<string, unknown>;
  index: number;
  t: TFunction<'table'>;
  wide?: boolean;
}) {
  const imageSrc = getItemImage(item);
  const title = getItemTitle(item);
  const price =
    item.price_formatted != null
      ? String(item.price_formatted)
      : item.price != null
        ? String(item.price)
        : null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3.5 transition-colors hover:border-border hover:bg-muted/20">
      {!wide && (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
          {imageSrc ? (
            <img src={imageSrc} alt={title} className="h-full w-full object-cover" />
          ) : (
            <Iconify icon="solar:box-minimalistic-bold" className="text-muted-foreground/40" width={20} />
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {wide && imageSrc && (
          <div className="mb-2 aspect-[16/6] w-full overflow-hidden rounded-md bg-muted/40">
            <img src={imageSrc} alt={title} className="h-full w-full object-cover" />
          </div>
        )}
        {(!wide || (title && title !== '—')) && (
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
        )}
        {!wide && (
          <p className="text-xs text-muted-foreground">
            {t('form.pagePreviewItemIndex', { index: index + 1 })}
            {item.id != null ? ` · #${String(item.id)}` : ''}
            {price ? ` · ${price}` : ''}
          </p>
        )}
        {!wide && typeof item.link === 'string' && item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1 text-xs text-primary hover:underline"
          >
            <Iconify icon="solar:link-bold" width={12} />
            <span className="truncate">{item.link}</span>
          </a>
        )}
      </div>
    </div>
  );
}

function SortablePreviewSection({
  section,
  index,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onToggleVisibility,
  isTogglingVisibility,
  t,
}: {
  section: PagePreviewSection;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleVisibility?: () => void;
  isTogglingVisibility?: boolean;
  t: TFunction<'table'>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const previewItems = section.items.slice(0, 8);
  const wideBanners = isBannerSection(section);
  const isActive = section.is_active !== false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-xl border border-border/60 bg-card transition-all ${
        isDragging
          ? 'z-10 border-primary/40 shadow-md ring-1 ring-primary/20'
          : 'hover:border-border hover:shadow-sm'
      } ${sectionAccentBorder(section.type)} border-l-[3px] ${!isActive ? 'opacity-60' : ''}`}
    >
      <div
        className="px-4 py-4 sm:px-5"
        style={{ backgroundColor: section.background_color ?? undefined }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label={t('form.pagePreviewDragHandle')}
          >
            <Iconify icon="lucide:grip-vertical" width={16} />
          </button>

          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
            {index + 1}
          </span>

          <button
            type="button"
            onClick={onToggle}
            className="min-w-0 flex-1 text-start"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-foreground">
                {formatTranslated(section.name as TranslatedValue) || '—'}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${sectionTypeStyles(section.type)}`}
              >
                {sectionTypeLabel(t, section.type)}
              </span>
              {!isActive && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t('form.pageSectionHiddenBadge')}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('form.pageSectionFormOrderLabel')} {section.order}
              {' · '}
              {section.position}
              {' · '}
              {[layoutLabel(t, section.layout), variantLabel(t, section.variant)]
                .filter(Boolean)
                .join(' · ') || '—'}
              {' · '}
              {section.items.length} {t('columns.items')}
              {section.is_default && ` · ${t('form.pageBuilderCategoryDefaultBadge')}`}
            </p>
          </button>

          <div className="flex shrink-0 items-center gap-0.5">
            {onToggleVisibility && (
              <button
                type="button"
                onClick={onToggleVisibility}
                disabled={isTogglingVisibility}
                title={isActive ? t('form.pageSectionHide') : t('form.pageSectionShow')}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label={isActive ? t('form.pageSectionHide') : t('form.pageSectionShow')}
              >
                <Iconify
                  icon={isActive ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                  width={15}
                />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={t('edit')}
              >
                <Iconify icon="solar:pen-bold" width={15} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={t('delete')}
              >
                <Iconify icon="solar:trash-bin-trash-bold" width={15} />
              </button>
            )}
            <button
              type="button"
              onClick={onToggle}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Iconify
                icon={expanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                width={16}
              />
            </button>
          </div>
        </div>

        {!expanded && previewItems.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 ps-[4.5rem]">
            {previewItems.map((item, itemIndex) => (
              <ItemThumb key={`${section.id}-thumb-${itemIndex}`} item={item} wide={wideBanners} />
            ))}
            {section.items.length > 8 && (
              <div className="flex w-16 shrink-0 items-center justify-center text-xs text-muted-foreground">
                +{section.items.length - 8}
              </div>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-border/40 px-4 py-4 sm:px-5">
          {(section.display_type_id != null ||
            section.action?.page_slug ||
            section.see_more?.page_slug ||
            section.background_card_color) && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {section.display_type_id != null && (
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    {t('form.pageSectionFormDisplayTypeLabel')}
                  </p>
                  <p className="text-sm font-medium text-foreground">{section.display_type_id}</p>
                </div>
              )}
              {section.action?.page_slug && (
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    {t('form.pagePreviewActionPage')}
                  </p>
                  <p className="text-sm font-medium text-foreground">{section.action.page_slug}</p>
                </div>
              )}
              {section.see_more?.page_slug && (
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    {t('form.pagePreviewSeeMorePage')}
                  </p>
                  <p className="text-sm font-medium text-foreground">{section.see_more.page_slug}</p>
                </div>
              )}
              {section.background_card_color && (
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    {t('form.pageSectionFormBackgroundCardColorOptional')}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded border border-border/60"
                      style={{ backgroundColor: section.background_card_color }}
                    />
                    <code className="text-xs text-muted-foreground">{section.background_card_color}</code>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('form.sectionItemsHeading')} ({section.items.length})
            </p>

            {section.items.length > 0 ? (
              <div className={`grid grid-cols-1 gap-3 ${wideBanners ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}`}>
                {section.items.map((item, itemIndex) => (
                  <PreviewItemCard
                    key={`${section.id}-item-${String(item.id ?? itemIndex)}`}
                    item={item}
                    index={itemIndex}
                    t={t}
                    wide={wideBanners}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
                <Typography variant="body2" className="text-muted-foreground">
                  {t('common.noItems')}
                </Typography>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PageDetails() {
  const { t } = useTranslation('table');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const numericId = id && /^\d+$/.test(String(id).trim()) ? String(id).trim() : '';

  const [activeFilters, setActiveFilters] = useState<PagePreviewQueryParams>(() =>
    parsePagePreviewParams(searchParams)
  );
  const prevPageIdRef = useRef(numericId);

  const { data: pagesData } = useFetchPages();
  const { data: previewResponse, isLoading, isFetching, error } = useFetchPagePreview(
    numericId,
    activeFilters
  );
  const { data: pageBuilderDetails } = useFetchPageBuilderPage(numericId);
  const reorderMutation = useReorderPageSections();
  const deleteSectionMutation = useDeletePageSection();
  const toggleVisibilityMutation = useAdminToggleStatus();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const [orderedSections, setOrderedSections] = useState<PagePreviewSection[]>([]);
  const [baselineIds, setBaselineIds] = useState<number[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [deletingSectionId, setDeletingSectionId] = useState<number | null>(null);
  const lastSyncedPageRef = useRef('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const orderedIds = useMemo(() => orderedSections.map((s) => s.id), [orderedSections]);
  const isDirty = useMemo(() => {
    if (orderedIds.length !== baselineIds.length) return true;
    return orderedIds.some((sectionId, idx) => sectionId !== baselineIds[idx]);
  }, [orderedIds, baselineIds]);

  useEffect(() => {
    const builderSections = pageBuilderDetails?.data?.sections;
    const previewSections = previewResponse?.data?.sections;
    const hasBuilder = Boolean(pageBuilderDetails?.data);
    const hasPreview = Boolean(previewResponse?.data);

    if (!hasBuilder && !hasPreview) return;
    if (isDirty) return;

    const merged = mergePageSections(builderSections, previewSections);
    setOrderedSections(merged);
    setBaselineIds(merged.map((section) => section.id));

    if (lastSyncedPageRef.current !== numericId) {
      setExpandedIds(new Set(merged.length > 0 ? [merged[0].id] : []));
      lastSyncedPageRef.current = numericId;
    }
  }, [pageBuilderDetails, previewResponse, numericId, isDirty]);

  const totalItems = useMemo(
    () => orderedSections.reduce((sum, section) => sum + section.items.length, 0),
    [orderedSections]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedSections((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === Number(active.id));
      const newIdx = prev.findIndex((s) => s.id === Number(over.id));
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleResetOrder = () => {
    const merged = mergePageSections(
      pageBuilderDetails?.data?.sections,
      previewResponse?.data?.sections
    );
    setOrderedSections(merged);
    setBaselineIds(merged.map((section) => section.id));
  };

  const handleSaveOrder = async () => {
    if (!numericId || !isDirty || reorderMutation.isPending) return;

    const sections = orderedSections.map((row, index) => ({
      id: row.id,
      order: index + 1,
      position: row.position,
    }));

    try {
      await reorderMutation.mutateAsync({
        pageId: numericId,
        sections,
      });
      setBaselineIds(orderedIds);
      toast.success(t('form.pagePreviewOrderSaved'));
    } catch (err) {
      console.error('Failed to reorder page sections:', err);
      toast.error(t('form.pagePreviewOrderFailed'));
    }
  };

  const toggleExpanded = (sectionId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleAddSection = () => {
    navigate(`/sections/pages/${numericId}/sections/create`);
  };

  const handleEditSection = (sectionId: number) => {
    navigate(`/sections/pages/${numericId}/sections/update/${sectionId}`);
  };

  const handleToggleSectionVisibility = async (section: PagePreviewSection) => {
    const previous = section.is_active !== false;
    const next = !previous;

    setOrderedSections((prev) =>
      prev.map((row) => (row.id === section.id ? { ...row, is_active: next } : row))
    );

    try {
      await toggleVisibilityMutation.mutateAsync({
        type: 'page_section',
        id: section.id,
        is_active: next,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pageBuilder.details(numericId) }),
        queryClient.invalidateQueries({ queryKey: ['pageSection', 'pagePreview', numericId] }),
      ]);
    } catch (err) {
      console.error('Failed to toggle page section visibility:', err);
      setOrderedSections((prev) =>
        prev.map((row) => (row.id === section.id ? { ...row, is_active: previous } : row))
      );
      toast.error(t('form.pageSectionVisibilityToggleFailed'));
    }
  };

  const handleDeleteSectionConfirm = async () => {
    if (!deletingSectionId) return;
    try {
      await deleteSectionMutation.mutateAsync(deletingSectionId);
      queryClient.invalidateQueries({ queryKey: ['pageSection', 'pagePreview'] });
      queryClient.invalidateQueries({ queryKey: ['pageBuilder'] });
      toast.success(t('deleteSuccess'));
      setDeletingSectionId(null);
    } catch (err) {
      console.error('Failed to delete page section:', err);
      toast.error(t('form.pageBuilderSectionDeleteFailed'));
    }
  };

  useEffect(() => {
    if (prevPageIdRef.current === numericId) return;
    prevPageIdRef.current = numericId;
    lastSyncedPageRef.current = '';
    setActiveFilters({});
    setSearchParams({}, { replace: true });
  }, [numericId, setSearchParams]);

  useEffect(() => {
    setSearchParams(filtersToSearchParams(activeFilters), { replace: true });
  }, [activeFilters, setSearchParams]);

  const handleFilterChange = useCallback((key: string, value: string | number | undefined) => {
    setActiveFilters((prev) => buildPagePreviewFilters(prev, key, value));
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  const pageFilterSchema = useMemo(() => {
    const fromPreview = previewResponse?.data?.page?.filters;
    if (fromPreview && typeof fromPreview === 'object' && !Array.isArray(fromPreview)) {
      return fromPreview as Record<string, FilterConfig>;
    }

    const pageFromList = (pagesData?.data ?? []).find((p) => String(p.id) === numericId);
    const fromList = pageFromList?.filters;
    if (fromList && typeof fromList === 'object' && !Array.isArray(fromList)) {
      return fromList as Record<string, FilterConfig>;
    }

    return null;
  }, [previewResponse?.data?.page?.filters, pagesData, numericId]);

  if (!numericId) {
    return (
      <Box className="flex min-h-[400px] items-center justify-center p-6">
        <Box className="w-full max-w-md rounded-2xl border border-border/50 bg-background p-6 shadow-lg">
          <Typography variant="h6" className="mb-2 text-destructive">
            {t('form.pagePreviewInvalidId')}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/sections/pages')}>
            {t('form.backToPages')}
          </Button>
        </Box>
      </Box>
    );
  }

  if (isLoading && !previewResponse) {
    return <LoadingScreen />;
  }

  if (error || !previewResponse?.data) {
    return (
      <Box className="flex min-h-[400px] items-center justify-center p-6">
        <Box className="w-full max-w-md rounded-2xl border border-border/50 bg-background p-6 shadow-lg">
          <Box className="mb-2 flex items-center gap-2">
            <Iconify icon="solar:danger-bold" className="h-5 w-5 text-destructive" />
            <Typography variant="h6" className="text-destructive">
              {t('form.pagePreviewErrorLoadingTitle')}
            </Typography>
          </Box>
          <Typography variant="body2" className="mb-4 text-muted-foreground">
            {error instanceof Error ? error.message : t('form.pagePreviewErrorLoadingFallback')}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/sections/pages')}>
            {t('form.backToPages')}
          </Button>
        </Box>
      </Box>
    );
  }

  const page: PagePreviewPage = previewResponse.data.page;
  const pageMeta = pageBuilderDetails?.data;
  const isCategoryPage = isCategoryCmsPage({
    is_category_page: page.is_category_page ?? pageMeta?.is_category_page,
    can_delete_page: page.can_delete_page ?? pageMeta?.can_delete_page,
    can_edit_metadata: page.can_edit_metadata ?? pageMeta?.can_edit_metadata,
    category_id: page.category_id ?? pageMeta?.category_id,
    delete_page_via: page.delete_page_via ?? pageMeta?.delete_page_via,
  });
  const linkedCategoryId = resolveLinkedCategoryId({
    category_id: page.category_id ?? pageMeta?.category_id,
    delete_page_via: page.delete_page_via ?? pageMeta?.delete_page_via,
  });
  const fromCategories = (location.state as { from?: string } | null)?.from === 'categories';
  const backToPagesPath = isCategoryPage ? '/sections/pages?tab=category' : '/sections/pages';
  const handleBack = () => navigate(fromCategories ? '/categories' : backToPagesPath);

  return (
    <>
      <title>{t('form.pagePreviewDocumentTitle', { appName: CONFIG.appName })}</title>

      <Box className="min-h-screen bg-background pb-20">
        <Box className="mx-auto w-full max-w-[1650px] space-y-5 px-3 py-4 sm:px-5 md:px-7">
          <Button
            variant="text"
            onClick={handleBack}
            className="-ms-2 text-muted-foreground hover:text-foreground"
          >
            <Iconify icon="solar:arrow-left-bold" width={18} className="me-1.5" />
            {fromCategories ? t('form.pageBuilderBackToCategories') : t('form.backToPages')}
          </Button>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
                  <Iconify icon="solar:widget-4-bold" width={24} />
                </div>
                <div className="min-w-0">
                  <Typography variant="h4" className="font-bold tracking-tight text-foreground">
                    {cmsPageSelectLabel(page)}
                  </Typography>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                      /{page.slug}
                    </code>
                    <span className="tabular-nums">ID {page.id}</span>
                    {isCategoryPage && (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {t('columns.categoryPageBadge')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex min-w-[5.5rem] flex-col rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5">
                  <p className="text-2xl font-semibold tabular-nums leading-none text-foreground">
                    {orderedSections.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('form.pagePreviewSectionsHeading')}</p>
                </div>
                <div className="flex min-w-[5.5rem] flex-col rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5">
                  <p className="text-2xl font-semibold tabular-nums leading-none text-foreground">{totalItems}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('columns.items')}</p>
                </div>
                {can('pagesection.create') && (
                  <Button variant="contained" onClick={handleAddSection} className="h-[3.35rem] gap-2 px-5">
                    <Iconify icon="solar:widget-add-bold" width={18} />
                    {t('form.pageBuilderAddSectionButton')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {isCategoryPage && (
            <CategoryPageBanner
              className="mb-4"
              page={{
                is_category_page: isCategoryPage,
                category_id: linkedCategoryId,
                can_delete_page: page.can_delete_page ?? pageMeta?.can_delete_page,
                can_edit_metadata: page.can_edit_metadata ?? pageMeta?.can_edit_metadata,
                delete_page_via: page.delete_page_via ?? pageMeta?.delete_page_via,
              }}
            />
          )}

          {isCategoryPage && (
            <p className="mb-4 text-sm text-muted-foreground">
              {t('form.pageBuilderCategoryDefaultSectionsNotice')}
            </p>
          )}

          {!isCategoryPage && isHomeCmsPage(page) && (
            <Box className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] px-4 py-3">
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

          {pageFilterSchema && Object.keys(pageFilterSchema).length > 0 && (
            <PagePreviewFilters
              filters={pageFilterSchema}
              values={activeFilters}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
              isFetching={isFetching}
            />
          )}

          <div>
            <Typography variant="subtitle1" className="font-semibold text-foreground">
              {t('form.pagePreviewSectionsHeading')}
            </Typography>
            {orderedSections.length > 1 && (
              <p className="mt-0.5 text-xs text-muted-foreground">{t('form.pagePreviewDragHint')}</p>
            )}
          </div>

          {orderedSections.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {orderedSections.map((section, index) => (
                    <SortablePreviewSection
                      key={section.id}
                      section={section}
                      index={index}
                      expanded={expandedIds.has(section.id)}
                      onToggle={() => toggleExpanded(section.id)}
                      onToggleVisibility={
                        can('pagesection.update')
                          ? () => handleToggleSectionVisibility(section)
                          : undefined
                      }
                      isTogglingVisibility={
                        toggleVisibilityMutation.isPending &&
                        toggleVisibilityMutation.variables?.type === 'page_section' &&
                        toggleVisibilityMutation.variables?.id === section.id
                      }
                      onEdit={
                        can('pagesection.update') ? () => handleEditSection(section.id) : undefined
                      }
                      onDelete={
                        can('pagesection.delete')
                          ? () => setDeletingSectionId(section.id)
                          : undefined
                      }
                      t={t}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
              <Typography variant="body2" className="text-muted-foreground">
                {t('form.pagePreviewNoSections')}
              </Typography>
              {can('pagesection.create') && (
                <Button variant="contained" onClick={handleAddSection} className="mt-3 gap-1.5">
                  <Iconify icon="solar:widget-add-bold" width={16} />
                  {t('form.pageBuilderAddSectionButton')}
                </Button>
              )}
            </div>
          )}
        </Box>

        {deletingSectionId !== null && (
          <Dialog
            open={deletingSectionId !== null}
            onOpenChange={(open) => !open && setDeletingSectionId(null)}
          >
            <DialogContent className="bg-background text-foreground p-6 rounded-lg shadow-lg z-[9999]">
              <h2 className="text-lg font-bold">{t('confirmDelete')}</h2>
              <p>{t('areYouSure')}</p>
              <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                {isCategoryPage
                  ? t('form.pageBuilderCategorySectionDeleteWarning')
                  : t('form.pageBuilderSectionDeleteWarning')}
              </p>
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="outlined"
                  onClick={() => setDeletingSectionId(null)}
                  disabled={deleteSectionMutation.isPending}
                >
                  {t('cancel')}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteSectionConfirm}
                  disabled={deleteSectionMutation.isPending}
                >
                  {deleteSectionMutation.isPending ? t('deleting') : t('delete')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {isDirty && (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/95 px-3 py-3 backdrop-blur-sm sm:px-5 md:px-7">
            <div className="mx-auto flex w-full max-w-[1650px] items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t('form.pagePreviewUnsavedChanges')}</p>
              <div className="flex gap-2">
                <Button variant="outlined" size="small" onClick={handleResetOrder} disabled={reorderMutation.isPending}>
                  {t('form.pagePreviewResetOrder')}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveOrder}
                  disabled={reorderMutation.isPending}
                  className="gap-1.5"
                >
                  <Iconify icon="solar:diskette-bold" width={16} />
                  {reorderMutation.isPending ? t('form.pagePreviewSavingOrder') : t('form.pagePreviewSaveOrder')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Box>
    </>
  );
}
