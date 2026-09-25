import type { DragEndEvent } from '@dnd-kit/core';
import type { ManualItemsSource } from '@/pages/dashboard/sections/hooks/useManualItems';
import type { ItemIdEntry } from '../types/section.types';

import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Iconify } from '@/shared/components/iconify';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useInfiniteManualItems } from '@/pages/dashboard/sections/hooks/useManualItems';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSensor, DndContext, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { DynamicFilterField } from '@/pages/dashboard/sections/components/dynamic-filter-field';
import { MANUAL_ITEM_PICKER_FILTERS } from '@/pages/dashboard/sections/utils/content-type-config';

import { paths } from 'src/routes/paths';

import { type TranslatedValue, resolveItemDisplayLabel } from 'src/utils/format-translated';

import { CONFIG } from 'src/global-config';
import { Box, Input, Button, Typography } from 'src/shared/ui';
import { SortableItem } from 'src/shared/ui/table-data/sortable-item';

// ----------------------------------------------------------------------

/** Backend `manual_model` key for GIF sections (compare case-insensitively). */
function isGifManualModel(manualModel: string | undefined | null): boolean {
  return (manualModel ?? '').trim().toLowerCase() === 'gif';
}

/** Banners (and GIFs) are wide images — previewed at a horizontal ratio, not as squares. */
function isWideImageManualModel(manualModel: string | undefined | null): boolean {
  const model = (manualModel ?? '').trim().toLowerCase();
  return model === 'banner' || model === 'gif';
}

function resolveItemImageUrl(item: Record<string, any>): string | null {
  const src = item.image_url ?? item.image ?? item.icon;
  if (typeof src !== 'string' || !src.trim()) return null;
  const s = src.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const base = CONFIG.serverUrl?.replace(/\/$/, '') ?? '';
  return base ? `${base}/${s.replace(/^\//, '')}` : s;
}

function defaultLinkForManualItem(manualModel: string, itemId: number): string {
  if (isWideImageManualModel(manualModel)) return '';
  return `/item/${itemId}`;
}

/**
 * Search + infinite list + checkbox selection + drag ordering + per-item link
 * for a manual section's items. Selection state lives in the parent.
 */
export function ManualItemsPicker({
  manualModel,
  orderedItems,
  setOrderedItems,
  source,
  labelOverrides,
}: {
  manualModel: string;
  orderedItems: ItemIdEntry[];
  setOrderedItems: React.Dispatch<React.SetStateAction<ItemIdEntry[]>>;
  /** Explicit items feed (e.g. shops split by `is_restaurant`) — bypasses the `item-types` map. */
  source?: ManualItemsSource;
  /** Known labels for selected items not yet present in the fetched pages (edit mode). */
  labelOverrides?: Map<number, string>;
}) {
  const { t } = useTranslation('table');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [listFilters, setListFilters] = useState<Record<string, unknown>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isWide = isWideImageManualModel(manualModel);
  const hideItemLinks = !isGifManualModel(manualModel);

  const pickerFilterSchema = MANUAL_ITEM_PICKER_FILTERS[manualModel as keyof typeof MANUAL_ITEM_PICKER_FILTERS];
  const pickerFilterEntries = useMemo(
    () => Object.entries(pickerFilterSchema ?? {}),
    [pickerFilterSchema]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const listFilterParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(listFilters)) {
      if (value === null || value === undefined || value === '') continue;
      params[key] = value;
    }
    return params;
  }, [listFilters]);

  const handleListFilterChange = useCallback((key: string, value: unknown) => {
    setListFilters((prev) => {
      const next = { ...prev };
      if (value === null || value === undefined || value === '') {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  // Pointer only: KeyboardSensor steals keys for inputs inside sortables.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { infiniteQuery, allItems } = useInfiniteManualItems(
    manualModel || null,
    {
      limit: 10,
      search: debouncedSearch || undefined,
      listFilters: listFilterParams,
    },
    source
  );

  const selectedIds = useMemo(() => new Set(orderedItems.map((e) => e.item_id)), [orderedItems]);

  const itemLabelById = useMemo(() => {
    const map = new Map<number, string>(labelOverrides ?? []);
    for (const row of allItems as { id: number; name?: TranslatedValue; title?: TranslatedValue }[]) {
      map.set(
        row.id,
        resolveItemDisplayLabel(row.name, row.title)
      );
    }
    return map;
  }, [allItems, labelOverrides]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          infiniteQuery.hasNextPage &&
          !infiniteQuery.isFetchingNextPage
        ) {
          infiniteQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [infiniteQuery]);

  const handleItemsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedItems((prev) => {
      const oldIndex = prev.findIndex((x) => x.item_id === active.id);
      const newIndex = prev.findIndex((x) => x.item_id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((entry, idx) => ({
        ...entry,
        order: idx,
      }));
    });
  };

  const handleToggleItem = (itemId: number) => {
    setOrderedItems((prev) => {
      const exists = prev.some((p) => p.item_id === itemId);
      if (exists) {
        return prev.filter((p) => p.item_id !== itemId).map((e, idx) => ({ ...e, order: idx }));
      }
      return [
        ...prev,
        {
          item_id: itemId,
          order: prev.length,
          ...(isGifManualModel(manualModel)
            ? { link: defaultLinkForManualItem(manualModel, itemId) }
            : {}),
        },
      ];
    });
  };

  const handleSelectAll = () => {
    if (!allItems.length) return;
    setOrderedItems(
      (allItems as { id: number }[]).map((item, index) => ({
        item_id: item.id,
        order: index,
        ...(isGifManualModel(manualModel)
          ? { link: defaultLinkForManualItem(manualModel, item.id) }
          : {}),
      }))
    );
  };

  const handleItemLinkChange = (itemId: number, link: string) => {
    setOrderedItems((prev) => prev.map((e) => (e.item_id === itemId ? { ...e, link } : e)));
  };

  const handleClearAll = () => {
    setOrderedItems([]);
  };

  return (
    <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
      <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-amber-500/[0.06] via-amber-500/[0.02] to-transparent">
        <Box className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Iconify icon="solar:checklist-bold" className="text-amber-500" width={15} />
        </Box>
        <Typography variant="subtitle2" className="font-semibold text-foreground flex-1">
          {t('form.selectItemsHeading')}
          {orderedItems.length > 0 && (
            <Typography component="span" variant="body2" className="text-muted-foreground ml-2">
              {t('form.itemsSelectedCount', { count: orderedItems.length })}
            </Typography>
          )}
        </Typography>
        <Box className="flex gap-2 shrink-0">
          <Button
            type="button"
            onClick={handleSelectAll}
            variant="outlined"
            size="small"
            disabled={!allItems.length}
          >
            {t('form.selectAllItems')}
          </Button>
          <Button
            type="button"
            onClick={handleClearAll}
            variant="outlined"
            size="small"
            disabled={orderedItems.length === 0}
          >
            {t('form.clearAllItems')}
          </Button>
        </Box>
      </Box>
      <Box className="p-6">
        {isWide && (
          <Box className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 sm:flex-row sm:items-start">
            <Iconify
              icon="solar:info-circle-bold"
              className="mt-0.5 shrink-0 text-amber-600"
              width={18}
            />
            <Typography variant="body2" className="min-w-0 flex-1 text-muted-foreground">
              {t('form.pageBuilderBannerPickHelper')}
            </Typography>
            <Button
              type="button"
              variant="outlined"
              size="small"
              className="shrink-0 self-start"
              onClick={() => navigate(paths.dashboard.banners)}
            >
              {t('form.pageBuilderBannerManageLibrary')}
            </Button>
          </Box>
        )}
        {orderedItems.length > 0 && (
          <Box className="mb-4 p-4 border rounded-lg bg-muted/20 space-y-2">
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.sectionItemsOrderHeading')}
            </Typography>
            <Typography variant="body2" className="text-muted-foreground text-sm">
              {t('form.sectionItemsOrderHelper')}
            </Typography>
            {!hideItemLinks && (
              <Typography variant="body2" className="text-muted-foreground text-sm">
                {t('form.sectionItemLinkHint')}
              </Typography>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleItemsDragEnd}
            >
              <SortableContext
                items={orderedItems.map((e) => e.item_id)}
                strategy={verticalListSortingStrategy}
              >
                <Box className="flex flex-col gap-2 mt-2">
                  {orderedItems.map((entry, index) => {
                    const resolvedLabel = itemLabelById.get(entry.item_id)?.trim() || '';
                    const label = isWide
                      ? resolvedLabel
                      : resolvedLabel || t('form.itemNumberFallback', { id: entry.item_id });
                    const selectedRow = (allItems as Record<string, any>[]).find(
                      (row) => row.id === entry.item_id
                    );
                    const selectedImage = selectedRow ? resolveItemImageUrl(selectedRow) : null;
                    return (
                      <SortableItem key={entry.item_id} id={entry.item_id}>
                        <Box className="flex min-w-0 flex-1 flex-col gap-2">
                          <Box className="flex min-w-0 flex-1 items-center gap-3">
                            <Box className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                              {index + 1}
                            </Box>
                            {selectedImage && (
                              <Box
                                className={`shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40 ${
                                  isWide ? 'aspect-[16/6] w-28 sm:w-36' : 'h-10 w-10'
                                }`}
                              >
                                <img
                                  src={selectedImage}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              </Box>
                            )}
                            {(!isWide || label) && (
                              <Box className="min-w-0 flex-1">
                                <Typography variant="body2" className="font-medium truncate">
                                  {label}
                                </Typography>
                                {!isWide && (
                                  <Typography variant="caption" className="text-muted-foreground">
                                    {t('form.itemIdBadgeShort', { id: entry.item_id })}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                          {!hideItemLinks && (
                            <Box
                              className="relative z-10 w-full max-w-full"
                              onPointerDownCapture={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClickCapture={(e) => e.stopPropagation()}
                              onKeyDownCapture={(e) => e.stopPropagation()}
                            >
                              <Typography
                                variant="caption"
                                className="mb-1 block text-muted-foreground"
                              >
                                {t('form.sectionItemLinkLabel')}
                              </Typography>
                              <Input
                                type="text"
                                inputMode="url"
                                autoComplete="off"
                                floatingLabel={false}
                                fullWidth
                                value={entry.link ?? ''}
                                onChange={(e) =>
                                  handleItemLinkChange(entry.item_id, e.target.value)
                                }
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder={t('form.sectionItemLinkPlaceholder')}
                                className="w-full"
                              />
                            </Box>
                          )}
                        </Box>
                      </SortableItem>
                    );
                  })}
                </Box>
              </SortableContext>
            </DndContext>
          </Box>
        )}

        {/* Search + optional list filters (products: category / brand / shop) */}
        <Box className="mb-4 space-y-4">
          <Input
            type="text"
            autoComplete="off"
            floatingLabel={false}
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('form.searchItems')}
            className="w-full"
          />
          {pickerFilterEntries.length > 0 && (
            <Box className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {pickerFilterEntries.map(([filterKey, filterConfig]) => (
                <DynamicFilterField
                  key={`manual_${manualModel}_${filterKey}`}
                  filterKey={filterKey}
                  filterConfig={filterConfig}
                  value={listFilters[filterKey]}
                  onChange={(value) => handleListFilterChange(filterKey, value)}
                  allowNullOption
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Loading State */}
        {infiniteQuery.isLoading && (
          <Box className="text-center p-8 border border-dashed rounded-lg">
            <Iconify
              icon="solar:refresh-circle-bold"
              className="w-12 h-12 text-primary mx-auto mb-2 animate-spin"
            />
            <Typography variant="body2" className="text-muted-foreground">
              {t('form.loadingItems')}
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {infiniteQuery.isError && (
          <Box className="text-center p-8 border border-destructive/50 rounded-lg bg-destructive/5">
            <Iconify icon="solar:danger-bold" className="w-12 h-12 text-destructive mx-auto mb-2" />
            <Typography variant="body2" className="text-destructive">
              {t('form.itemsLoadError')}
            </Typography>
          </Box>
        )}

        {/* Items List */}
        {!infiniteQuery.isLoading && !infiniteQuery.isError && (
          <Box className="border rounded-lg overflow-hidden">
            {allItems.length === 0 ? (
              <Box className="text-center p-8">
                <Iconify
                  icon="solar:inbox-line-bold"
                  className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2"
                />
                <Typography variant="body2" className="text-muted-foreground">
                  {t('form.noItemsFoundShort')}
                </Typography>
              </Box>
            ) : (
              <Box className={isWide ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 p-3' : 'divide-y divide-border'}>
                {allItems.map((item: any) => {
                  const isSelected = selectedIds.has(item.id);
                  const imageSrc = resolveItemImageUrl(item);
                  const itemLabel = resolveItemDisplayLabel(
                    item.name as TranslatedValue,
                    item.title as TranslatedValue
                  );
                  return (
                    <Box
                      key={item.id}
                      onClick={() => handleToggleItem(item.id)}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        isWide
                          ? 'flex flex-col gap-3 rounded-xl border border-border/50 p-3'
                          : 'flex items-center gap-4 p-4'
                      } ${
                        isSelected
                          ? isWide
                            ? 'bg-primary/5 ring-2 ring-primary/30'
                            : 'bg-primary/5 border-l-4 border-l-primary'
                          : ''
                      }`}
                    >
                      {isWide && imageSrc && (
                        <Box className="aspect-[16/6] w-full overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                          <img
                            src={imageSrc}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </Box>
                      )}
                      <Box className={`flex min-w-0 items-center gap-4 ${isWide ? 'w-full' : 'flex-1'}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                      {!isWide && imageSrc && (
                        <Box className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                          <img
                            src={imageSrc}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </Box>
                      )}
                      {(!isWide || itemLabel) && (
                        <Box className="flex-1 min-w-0">
                          <Box className="flex items-center gap-2 mb-1">
                            <Typography variant="body1" className="font-semibold text-foreground">
                              {itemLabel || t('form.itemNumberFallback', { id: item.id })}
                            </Typography>
                            {!isWide && (
                              <Box className="px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground">
                                {t('form.itemIdBadgeShort', { id: item.id })}
                              </Box>
                            )}
                          </Box>
                          {!isWide && item.desc && (
                            <Typography
                              variant="body2"
                              className="text-muted-foreground text-sm line-clamp-1"
                            >
                              {item.desc}
                            </Typography>
                          )}
                        </Box>
                      )}
                      {isSelected && (
                        <Iconify
                          icon="solar:check-circle-bold"
                          className="text-primary shrink-0"
                          width={24}
                          height={24}
                        />
                      )}
                      </Box>
                    </Box>
                  );
                })}
                {/* Sentinel for infinite scroll */}
                <div
                  ref={sentinelRef}
                  className={`py-2 text-center ${isWide ? 'sm:col-span-2' : ''}`}
                >
                  {infiniteQuery.isFetchingNextPage && (
                    <Typography variant="body2" className="text-muted-foreground">
                      {t('form.loadingMoreItems')}
                    </Typography>
                  )}
                </div>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export { isGifManualModel, isWideImageManualModel };
