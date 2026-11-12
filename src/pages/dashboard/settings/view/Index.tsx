import type { TFunction } from 'i18next';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Iconify } from '@/shared/components/iconify';
import { usePermissions } from '@/auth/hooks/use-permissions';
import { useAdminToggleStatus } from '@/hooks/use-admin-toggle-status';
import { useFetchSettings } from '@/pages/dashboard/settings/hooks/setting';
import { settingKeyLabel } from '@/pages/dashboard/settings/utils/setting-key-label';
import { SettingEditModal } from '@/pages/dashboard/settings/components/setting-edit-modal';
import { ShopDeliveryLimitsPanel } from '@/pages/dashboard/settings/components/ShopDeliveryLimitsPanel';
import { type SettingItem, settingsItemsFromListData } from '@/pages/dashboard/settings/types/setting.types';
import {
  DeliverySettingsPanel,
  DELIVERY_SETTING_KEYS,
} from '@/pages/dashboard/settings/components/DeliverySettingsPanel';
import {
  QuickOrderSettingsPanel,
  QUICK_ORDER_SETTING_KEYS,
} from '@/pages/dashboard/settings/components/QuickOrderSettingsPanel';
import {
  LocalizationDefaultsPanel,
  LOCALIZATION_SETTING_KEYS,
} from '@/pages/dashboard/settings/components/LocalizationDefaultsPanel';

import { CONFIG } from 'src/global-config';
import { Button } from 'src/shared/ui/button';
import { Box, Typography } from 'src/shared/ui';
import { LoadingScreen } from 'src/shared/components/loading-screen';

type SettingsTab = 'general' | 'quick_order' | 'delivery' | 'localization';

function parseSettingsTab(raw: string | null): SettingsTab {
  if (raw === 'quick_order') return 'quick_order';
  if (raw === 'delivery') return 'delivery';
  if (raw === 'localization') return 'localization';
  return 'general';
}

function formatTypeLabel(type: SettingItem['type'], t: TFunction<'table'>): string {
  const dash = t('form.emptyEmDash');
  if (typeof type === 'string') return type;
  if (type !== null && typeof type === 'object') {
    try {
      return JSON.stringify(type);
    } catch {
      return dash;
    }
  }
  return String(type ?? dash);
}

function settingRowIsActive(item: SettingItem): boolean | undefined {
  const v = item.is_active;
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') {
    if (v === 1) return true;
    if (v === 0) return false;
  }
  return Boolean(v);
}

function isQuickOrderKey(key: string): boolean {
  return (QUICK_ORDER_SETTING_KEYS as readonly string[]).includes(key);
}

function isDeliverySettingKey(key: string): boolean {
  return (DELIVERY_SETTING_KEYS as readonly string[]).includes(key);
}

function isLocalizationSettingKey(key: string): boolean {
  return (LOCALIZATION_SETTING_KEYS as readonly string[]).includes(key);
}

function SettingRow({
  item,
  onEdit,
}: {
  item: SettingItem;
  onEdit: (item: SettingItem) => void;
}) {
  const { t } = useTranslation('table');
  const { can } = usePermissions();
  const toggleMutation = useAdminToggleStatus();
  const active = settingRowIsActive(item);
  const canToggle = active !== undefined && can('setting.update');
  const keyLabel = settingKeyLabel(t, item.key);

  return (
    <tr className="border-b border-border/40 transition-colors hover:bg-muted/30">
      <td className="px-4 py-3">
        <Typography variant="body2" className="font-medium text-foreground">
          {keyLabel}
        </Typography>
        <Typography variant="caption" className="font-mono text-muted-foreground">
          {typeof item.key === 'string' ? item.key : JSON.stringify(item.key)}
        </Typography>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {formatTypeLabel(item.type, t)}
        </span>
      </td>
      <td className="max-w-md px-4 py-3 text-sm">
        {item.type === 'file' && typeof item.value === 'string' && item.value ? (
          <a
            href={item.value}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline"
          >
            {t('form.viewFile')}
          </a>
        ) : item.type === 'file' ? (
          t('form.emptyEmDash')
        ) : item.value !== null && typeof item.value === 'object' ? (
          <span className="inline-block max-w-md whitespace-pre-wrap break-all align-top font-mono text-xs text-foreground">
            {JSON.stringify(item.value)}
          </span>
        ) : (
          <span className="text-foreground">{String(item.value ?? t('form.emptyEmDash'))}</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{item.updated_at}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1">
          {canToggle && (
            <Button
              type="button"
              variant="text"
              size="small"
              disabled={toggleMutation.isPending}
              onClick={async () => {
                try {
                  await toggleMutation.mutateAsync({
                    type: 'system_setting',
                    id: item.id,
                    is_active: !active,
                  });
                  toast.success(t('toggleVisibilitySuccess'));
                } catch {
                  /* toast from axios */
                }
              }}
              className="gap-1.5 text-muted-foreground hover:bg-muted/60 -ms-2"
            >
              <Iconify icon={active ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={16} />
              {active ? t('toggleHide') : t('toggleShow')}
            </Button>
          )}
          <Button
            type="button"
            variant="text"
            size="small"
            onClick={() => onEdit(item)}
            className="gap-1.5 text-primary hover:bg-primary/5 -ms-2"
          >
            <Iconify icon="solar:pen-bold" width={16} />
            {t('editDetails')}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function Page() {
  const { t } = useTranslation('table');
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, error } = useFetchSettings(1, 200);
  const [editingItem, setEditingItem] = useState<SettingItem | null>(null);
  const tab = parseSettingsTab(searchParams.get('tab'));

  const setTab = (next: SettingsTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'general') {
      params.delete('tab');
    } else {
      params.set('tab', next);
    }
    setSearchParams(params, { replace: true });
  };

  if (isLoading) return <LoadingScreen />;
  if (error)
    return (
      <Box className="flex min-h-[400px] items-center justify-center">
        <Typography variant="body1" className="text-destructive">
          {t('form.settingsFailedToLoad')}
        </Typography>
      </Box>
    );

  const items = settingsItemsFromListData(data?.data);
  const generalItems = items.filter(
    (item) =>
      !isQuickOrderKey(item.key) &&
      !isDeliverySettingKey(item.key) &&
      !isLocalizationSettingKey(item.key)
  );

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'general', label: t('form.settingsTabGeneral'), icon: 'solar:settings-minimalistic-bold' },
    {
      id: 'localization',
      label: t('form.settingsTabLocalization'),
      icon: 'solar:global-bold',
    },
    { id: 'delivery', label: t('form.settingsTabDelivery'), icon: 'solar:delivery-bold' },
    { id: 'quick_order', label: t('form.settingsTabQuickOrder'), icon: 'solar:bolt-bold' },
  ];

  return (
    <>
      <title>{t('form.settingsIndexDocumentTitle', { appName: CONFIG.appName })}</title>
      <Box className="p-6">
        <Box className="mb-6 flex items-center gap-3">
          <Iconify icon="solar:settings-minimalistic-bold" width={28} className="text-primary" />
          <Box>
            <Typography variant="h5" className="font-bold">
              {t('form.settingsTitle')}
            </Typography>
            <Typography variant="body2" className="text-muted-foreground">
              {t('form.settingsDesc')}
            </Typography>
          </Box>
        </Box>

        <Box className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
          {tabs.map(({ id, label, icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-primary/30 bg-primary text-primary-foreground'
                    : 'border-border/60 bg-background text-muted-foreground hover:border-primary/25 hover:bg-primary/5 hover:text-foreground'
                }`}
              >
                <Iconify icon={icon} width={16} />
                {label}
              </button>
            );
          })}
        </Box>

        {tab === 'localization' ? (
          <LocalizationDefaultsPanel />
        ) : tab === 'delivery' ? (
          <Box className="space-y-10">
            <DeliverySettingsPanel />
            <Box className="border-t border-border/60 pt-8">
              <ShopDeliveryLimitsPanel />
            </Box>
          </Box>
        ) : tab === 'general' ? (
          <Box className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('form.columnSettingName')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('columns.type')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('form.columnValue')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('columns.updatedAt')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('form.columnActions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {generalItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        {t('form.settingsNotFound')}
                      </td>
                    </tr>
                  ) : (
                    generalItems.map((item) => (
                      <SettingRow key={item.id} item={item} onEdit={setEditingItem} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Box>
        ) : (
          <QuickOrderSettingsPanel settings={items} />
        )}
      </Box>

      {editingItem && (
        <SettingEditModal
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          item={editingItem}
        />
      )}
    </>
  );
}
