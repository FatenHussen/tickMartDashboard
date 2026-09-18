import type { ReactNode } from 'react';
import type { IconItem } from '@/pages/dashboard/icons/types/icon.types';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Iconify } from '@/shared/components/iconify';
import { formatTranslated } from '@/utils/format-translated';
import { iconArtworkSrc } from '@/pages/dashboard/icons/utils/icon-artwork';

import { Box, Typography } from 'src/shared/ui';
import { RHFBadgeSelector } from 'src/shared/components/hook-form/rhf-badge-selector';

type ProductFormIconOption = Pick<IconItem, 'id'> & {
  name?: IconItem['name'] | null;
  image?: string | null;
  icon?: string | null;
  description?: IconItem['description'];
};

type ProductFormExtrasTabProps = {
  iconOptions: ProductFormIconOption[];
  selectedIconIds: number[];
  onToggleIcon: (iconId: number) => void;
  isLoadingIcons?: boolean;
};

function iconLabel(icon: ProductFormIconOption): string {
  return formatTranslated(icon.name as Parameters<typeof formatTranslated>[0], '') || `#${icon.id}`;
}

function IconArtwork({ src }: { src?: string | null }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <Box className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
        <Iconify icon="solar:star-bold" width={18} />
      </Box>
    );
  }

  return (
    <Box className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/20 p-1.5">
      <img src={src} alt="" className="h-full w-full object-contain" onError={() => setBroken(true)} />
    </Box>
  );
}

function SectionCard({
  icon,
  title,
  helper,
  headerRight,
  children,
}: {
  icon: string;
  title: string;
  helper?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box className="overflow-hidden rounded-xl border border-border bg-card">
      <Box className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
        <Box className="flex min-w-0 items-start gap-3">
          <Box className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Iconify icon={icon} width={18} />
          </Box>
          <Box className="min-w-0">
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {title}
            </Typography>
            {helper ? (
              <Typography variant="caption" className="mt-0.5 block text-muted-foreground">
                {helper}
              </Typography>
            ) : null}
          </Box>
        </Box>
        {headerRight}
      </Box>
      <Box className="p-4 sm:p-5">{children}</Box>
    </Box>
  );
}

export function ProductFormExtrasTab({
  iconOptions,
  selectedIconIds,
  onToggleIcon,
  isLoadingIcons = false,
}: ProductFormExtrasTabProps) {
  const { t } = useTranslation('table');

  return (
    <Box className="space-y-5">
      <Typography variant="body2" className="text-muted-foreground">
        {t('form.extrasTabIntro')}
      </Typography>
      <SectionCard
        icon="solar:medal-ribbons-star-bold"
        title={t('form.badgesTitle')}
        helper={t('form.extrasTabBadgesHelper')}
      >
        <RHFBadgeSelector name="badges" />
      </SectionCard>

      <SectionCard
        icon="solar:shield-check-bold"
        title={t('form.iconsTitle')}
        helper={t('form.extrasTabIconsHelper')}
      >
        {isLoadingIcons ? (
          <Box className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Box
                key={i}
                className="h-[68px] animate-pulse rounded-xl border border-border/60 bg-muted/40"
              />
            ))}
          </Box>
        ) : iconOptions.length === 0 ? (
          <Box className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-muted-foreground">
            <Iconify icon="solar:star-line-duotone" width={28} className="opacity-40" />
            <span className="text-sm">{t('form.noIconsLoaded')}</span>
          </Box>
        ) : (
          <Box className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {iconOptions.map((ic) => {
              const iid = Number(ic.id);
              const selected = selectedIconIds.includes(iid);
              const description = formatTranslated(
                ic.description as Parameters<typeof formatTranslated>[0],
                ''
              );

              return (
                <button
                  key={iid}
                  type="button"
                  onClick={() => onToggleIcon(iid)}
                  aria-pressed={selected}
                  className={`group flex items-center gap-3 rounded-xl border p-3 text-start transition-colors ${
                    selected
                      ? 'border-primary bg-primary/[0.07] shadow-sm'
                      : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <IconArtwork src={iconArtworkSrc(ic)} />
                  <Box className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {iconLabel(ic)}
                    </span>
                    {description ? (
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {description}
                      </span>
                    ) : null}
                  </Box>
                  <Box
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                      selected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30 bg-background group-hover:border-primary/50'
                    }`}
                    aria-hidden
                  >
                    {selected ? (
                      <Iconify
                        icon="solar:check-read-linear"
                        width={12}
                        className="text-primary-foreground"
                      />
                    ) : null}
                  </Box>
                </button>
              );
            })}
          </Box>
        )}
      </SectionCard>
    </Box>
  );
}
