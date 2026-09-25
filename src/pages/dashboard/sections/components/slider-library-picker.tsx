import type { SliderLibraryItem } from '../types/page-builder.types';

import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useRef, useState, useEffect } from 'react';
import { Iconify } from '@/shared/components/iconify';
import { bannerCardName } from '@/utils/format-translated';
import { ChoiceCard } from '@/pages/dashboard/sections/components/section-form-ui';
import { useInfinitePageSliders } from '@/pages/dashboard/sections/hooks/usePageBuilder';
import { normalizeLayoutAndCardShape } from '@/pages/dashboard/sections/utils/section-layout';
import {
  contentTypeLabel,
  CONTENT_TYPE_ICONS,
  isBannerContentType,
  isQuickOrderContentType,
  ALL_SECTION_CONTENT_TYPES,
} from '@/pages/dashboard/sections/utils/content-type-config';

import { Box, Input, Button, Typography } from 'src/shared/ui';

// ----------------------------------------------------------------------

function sectionName(item: SliderLibraryItem, imageOnlyFallback: boolean): string {
  const name = bannerCardName(item.name);
  if (name) return name;
  return imageOnlyFallback ? '' : `#${item.id}`;
}

function sectionPreviewImage(item: SliderLibraryItem): string | null {
  const row = item as SliderLibraryItem & {
    image?: unknown;
    image_url?: unknown;
    items?: Array<{ image?: unknown; image_url?: unknown; item?: { image?: unknown; image_url?: unknown } }>;
  };
  const candidates = [row.image_url, row.image];
  const first = row.items?.[0];
  if (first) {
    candidates.push(first.image, first.image_url, first.item?.image, first.item?.image_url);
  }
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

/**
 * Pick content type first, then browse matching sections from the library.
 */
export function SliderLibraryPicker({
  pageId,
  selectedId,
  selectedContentType,
  onSelect,
  onContentTypeChange,
}: {
  pageId: number | string;
  selectedId: number | null;
  selectedContentType?: string | null;
  onSelect: (item: SliderLibraryItem | null) => void;
  onContentTypeChange?: (contentType: string) => void;
}) {
  const { t } = useTranslation('table');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [contentType, setContentType] = useState(selectedContentType ?? '');
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedContentType) {
      setContentType(selectedContentType);
    }
  }, [selectedContentType]);

  const { infiniteQuery, allSliders } = useInfinitePageSliders(
    pageId,
    {
      per_page: 10,
      content_type: contentType,
      ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
    },
    { enabled: Boolean(contentType) }
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !contentType) return undefined;
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
  }, [infiniteQuery, contentType]);

  const handleContentTypeChange = (type: string) => {
    const next = contentType === type ? '' : type;
    setContentType(next);
    setSearchTerm('');
    onSelect(null);
    onContentTypeChange?.(next);
  };

  const createPath = pageId
    ? `/sections/create?returnPage=${encodeURIComponent(String(pageId))}`
    : '/sections/create';

  return (
    <Box className="space-y-4">
      <Box className="flex justify-end">
        <Button
          type="button"
          variant="outlined"
          size="small"
          onClick={() => navigate(createPath)}
          className="gap-2"
        >
          <Iconify icon="solar:add-circle-bold" width={16} />
          {t('form.pageBuilderLibraryCreateNew')}
        </Button>
      </Box>

      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ALL_SECTION_CONTENT_TYPES.filter((type) => !isQuickOrderContentType(type)).map((type) => {
          const active = contentType === type;
          const icon = CONTENT_TYPE_ICONS[type] ?? 'solar:widget-bold';
          return (
            <ChoiceCard key={type} active={active} onClick={() => handleContentTypeChange(type)}>
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
              </Box>
            </ChoiceCard>
          );
        })}
      </Box>

      {contentType && (
        <Box className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <Typography variant="subtitle2" className="font-semibold text-foreground">
            {t('form.pageBuilderLibraryListHeading', {
              type: contentTypeLabel(t, contentType),
            })}
          </Typography>

          <Box className="relative">
            <Iconify
              icon="solar:magnifer-linear"
              width={18}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              autoComplete="off"
              floatingLabel={false}
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('form.pageBuilderLibrarySearch')}
              className="w-full ps-10"
            />
          </Box>

          {infiniteQuery.isLoading && (
            <Box className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
              <Iconify
                icon="solar:refresh-circle-bold"
                className="mx-auto mb-2 h-10 w-10 animate-spin text-primary"
              />
              <Typography variant="body2" className="text-muted-foreground">
                {t('form.loadingItems')}
              </Typography>
            </Box>
          )}

          {infiniteQuery.isError && (
            <Box className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center">
              <Iconify icon="solar:danger-bold" className="mx-auto mb-2 h-10 w-10 text-destructive" />
              <Typography variant="body2" className="text-destructive">
                {t('form.pageBuilderLibraryError')}
              </Typography>
            </Box>
          )}

          {!infiniteQuery.isLoading && !infiniteQuery.isError && (
            <Box className="overflow-hidden rounded-2xl border border-border/60">
              {allSliders.length === 0 ? (
                <Box className="p-10 text-center">
                  <Iconify
                    icon="solar:inbox-line-bold"
                    className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40"
                  />
                  <Typography variant="body2" className="mb-4 text-muted-foreground">
                    {t('form.pageBuilderLibraryEmptyForType', {
                      type: contentTypeLabel(t, contentType),
                    })}
                  </Typography>
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(createPath)}
                    className="gap-2"
                  >
                    <Iconify icon="solar:add-circle-bold" width={16} />
                    {t('form.pageBuilderLibraryCreateNew')}
                  </Button>
                </Box>
              ) : (
                <Box className="divide-y divide-border/60">
                  {allSliders.map((section) => {
                    const isSelected = selectedId === section.id;
                    const bannerCard = isBannerContentType(contentType) || contentType === 'gif';
                    const name = sectionName(section, bannerCard);
                    const previewImage = bannerCard ? sectionPreviewImage(section) : null;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => onSelect(section)}
                        className={`flex w-full items-center gap-4 p-4 text-start transition-colors hover:bg-muted/40 ${
                          isSelected ? 'bg-primary/[0.06] ring-2 ring-inset ring-primary/30' : ''
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border/80 bg-background'
                          }`}
                        >
                          {isSelected && <Iconify icon="solar:check-read-bold" width={12} />}
                        </span>
                        {previewImage && (
                          <Box className="aspect-[16/6] w-28 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40 sm:w-36">
                            <img src={previewImage} alt="" className="h-full w-full object-cover" />
                          </Box>
                        )}
                        {(!bannerCard || name) && (
                          <Box className="min-w-0 flex-1">
                            <Typography
                              variant="body1"
                              className="truncate font-semibold text-foreground"
                            >
                              {name}
                            </Typography>
                            {!bannerCard &&
                              (() => {
                                const { layout, variant } = normalizeLayoutAndCardShape({
                                  layout: section.layout,
                                  variant: section.variant,
                                });
                                return (
                                  <Typography variant="caption" className="mt-0.5 text-muted-foreground">
                                    {t(`form.sectionEasyLayout_${layout}`)}
                                    {' · '}
                                    {t(`form.sectionEasyCardShape_${variant}`)}
                                  </Typography>
                                );
                              })()}
                          </Box>
                        )}
                        {isSelected && (
                          <Iconify
                            icon="solar:check-circle-bold"
                            className="shrink-0 text-primary"
                            width={22}
                          />
                        )}
                      </button>
                    );
                  })}
                  <div ref={sentinelRef} className="py-2 text-center">
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
      )}
    </Box>
  );
}
