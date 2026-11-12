import type { FormEvent } from 'react';
import type { LanguageData } from '@/pages/dashboard/languages/types/language.types';
import type { CurrencyData } from '@/pages/dashboard/currencies/types/currency.types';

import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useMemo, useState, useEffect } from 'react';
import { Iconify } from '@/shared/components/iconify';
import { useQueryClient } from '@tanstack/react-query';
import { formatTranslated } from '@/utils/format-translated';
import { _SettingApi } from '@/pages/dashboard/settings/api/setting.services';
import { useFetchLanguages } from '@/pages/dashboard/languages/hooks/language';
import { useFetchCurrencies } from '@/pages/dashboard/currencies/hooks/currency';
import { useFetchSettingsGroup } from '@/pages/dashboard/settings/hooks/setting';

import { Button } from 'src/shared/ui/button';
import { Box, Typography } from 'src/shared/ui';
import { SimpleSelect } from 'src/shared/ui/select';

// ----------------------------------------------------------------------

/**
 * Storefront display defaults. These are the values the app/web use for a
 * visitor who has not picked a language or currency of their own — the user's
 * own choice, once made, always wins on the client.
 */
export const LOCALIZATION_SETTING_KEYS = [
  'default_display_language',
  'default_display_currency',
] as const;

export type LocalizationSettingKey = (typeof LOCALIZATION_SETTING_KEYS)[number];

/** The settings group these keys live under on the backend. */
export const LOCALIZATION_SETTINGS_GROUP = 'localization';

function collectValues(payload: unknown): Map<string, string> {
  const into = new Map<string, string>();
  walk(payload, into, 0);
  return into;
}

function walk(node: unknown, into: Map<string, string>, depth: number) {
  if (depth > 5 || node == null) return;
  if (Array.isArray(node)) {
    node.forEach((item) => walk(item, into, depth + 1));
    return;
  }
  if (typeof node !== 'object') return;

  const record = node as Record<string, unknown>;
  if (typeof record.key === 'string' && 'value' in record) {
    into.set(record.key, record.value == null ? '' : String(record.value));
    return;
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === 'status' || key === 'message' || key === 'pagination') continue;
    if ((LOCALIZATION_SETTING_KEYS as readonly string[]).includes(key)) {
      if (value && typeof value === 'object' && 'value' in (value as object)) {
        const nested = (value as { value: unknown }).value;
        into.set(key, nested == null ? '' : String(nested));
      } else if (
        value == null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        into.set(key, value == null ? '' : String(value));
      }
      continue;
    }
    if (key === 'data' || key === 'items' || key === 'settings' || key === 'group') {
      walk(value, into, depth + 1);
    }
  }
}

function languageLabel(lang: LanguageData): string {
  const name = lang.native_name?.trim();
  return name ? `${name} (${lang.code})` : lang.code;
}

function currencyLabel(currency: CurrencyData): string {
  const name = formatTranslated(currency.name, '').trim();
  const symbol = currency.symbol?.trim();
  const suffix = symbol ? ` — ${symbol}` : '';
  return name ? `${name} (${currency.code})${suffix}` : `${currency.code}${suffix}`;
}

// ----------------------------------------------------------------------

export function LocalizationDefaultsPanel() {
  const { t } = useTranslation('table');
  const queryClient = useQueryClient();

  const settingsQuery = useFetchSettingsGroup(LOCALIZATION_SETTINGS_GROUP);
  const languagesQuery = useFetchLanguages({ page: 1, limit: 100, is_active: 1 });
  const currenciesQuery = useFetchCurrencies(1, 100);

  const [languageCode, setLanguageCode] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serverValues = useMemo(() => collectValues(settingsQuery.data), [settingsQuery.data]);

  const languages = useMemo(
    () => languagesQuery.data?.data?.items ?? [],
    [languagesQuery.data]
  );
  const currencies = useMemo(
    () => currenciesQuery.data?.data?.items ?? [],
    [currenciesQuery.data]
  );

  /**
   * Fall back to the `is_default` flag already carried by the language and
   * currency records, so the panel shows the truth even before the settings
   * keys exist on the backend.
   */
  const fallbackLanguage = useMemo(
    () => languages.find((lang) => lang.is_default)?.code ?? '',
    [languages]
  );
  const fallbackCurrency = useMemo(
    () => currencies.find((currency) => currency.is_default)?.code ?? '',
    [currencies]
  );

  const serverLanguage = (serverValues.get('default_display_language') ?? '').trim();
  const serverCurrency = (serverValues.get('default_display_currency') ?? '').trim();

  const effectiveLanguage = serverLanguage || fallbackLanguage;
  const effectiveCurrency = serverCurrency || fallbackCurrency;

  useEffect(() => {
    setLanguageCode(effectiveLanguage);
    setCurrencyCode(effectiveCurrency);
    setError(null);
  }, [effectiveLanguage, effectiveCurrency]);

  const loading =
    settingsQuery.isLoading || languagesQuery.isLoading || currenciesQuery.isLoading;

  const inactiveLanguageSelected = useMemo(() => {
    if (!languageCode) return false;
    const match = languages.find((lang) => lang.code === languageCode);
    return match ? !match.is_active : false;
  }, [languageCode, languages]);

  const inactiveCurrencySelected = useMemo(() => {
    if (!currencyCode) return false;
    const match = currencies.find((currency) => currency.code === currencyCode);
    return match ? !match.is_active : false;
  }, [currencyCode, currencies]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!languageCode || !currencyCode) {
      setError(t('form.localizationDefaultsRequired'));
      return;
    }
    if (inactiveLanguageSelected || inactiveCurrencySelected) {
      setError(t('form.localizationDefaultsInactive'));
      return;
    }

    const next: Record<LocalizationSettingKey, string> = {
      default_display_language: languageCode,
      default_display_currency: currencyCode,
    };

    const changed = LOCALIZATION_SETTING_KEYS.filter(
      (key) => (serverValues.get(key) ?? '').trim() !== next[key]
    );

    if (changed.length === 0) {
      toast.info(t('form.localizationDefaultsNoChanges'));
      return;
    }

    setSaving(true);
    try {
      for (const key of changed) {
        await _SettingApi.updateSystemSetting(key, next[key]);
      }
      await queryClient.invalidateQueries({ queryKey: ['setting'] });
      // The default flags on the resources themselves may move with it.
      await queryClient.invalidateQueries({ queryKey: ['language'] });
      await queryClient.invalidateQueries({ queryKey: ['currency'] });
      toast.success(t('form.localizationDefaultsSaveSuccess'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('form.settingsUpdateFailed');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Typography variant="body2" className="text-muted-foreground">
        {t('loading')}
      </Typography>
    );
  }

  const languageOptions = languages.map((lang) => ({
    value: lang.code,
    label: languageLabel(lang),
    disabled: !lang.is_active,
  }));

  const currencyOptions = currencies.map((currency) => ({
    value: currency.code,
    label: currencyLabel(currency),
    disabled: !currency.is_active,
  }));

  return (
    <form onSubmit={(event) => void save(event)} className="space-y-4">
      <Box className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <Iconify
          icon="solar:info-circle-bold"
          width={18}
          className="mt-0.5 shrink-0 text-primary"
        />
        <Typography variant="body2" className="text-muted-foreground">
          {t('form.localizationDefaultsHint')}
        </Typography>
      </Box>

      <Box className="grid gap-4 lg:grid-cols-2">
        <Box className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <Typography variant="subtitle2" className="font-semibold">
            {t('form.defaultDisplayLanguage')}
          </Typography>
          <SimpleSelect
            fullWidth
            value={languageCode}
            disabled={saving || languageOptions.length === 0}
            placeholder={t('form.localizationSelectPlaceholder')}
            options={languageOptions}
            onChange={(value) => setLanguageCode(String(value))}
            aria-label={t('form.defaultDisplayLanguage')}
          />
          <Typography variant="caption" className="block text-muted-foreground">
            {t('form.defaultDisplayLanguageHint')}
          </Typography>
        </Box>

        <Box className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <Typography variant="subtitle2" className="font-semibold">
            {t('form.defaultDisplayCurrency')}
          </Typography>
          <SimpleSelect
            fullWidth
            value={currencyCode}
            disabled={saving || currencyOptions.length === 0}
            placeholder={t('form.localizationSelectPlaceholder')}
            options={currencyOptions}
            onChange={(value) => setCurrencyCode(String(value))}
            aria-label={t('form.defaultDisplayCurrency')}
          />
          <Typography variant="caption" className="block text-muted-foreground">
            {t('form.defaultDisplayCurrencyHint')}
          </Typography>
        </Box>
      </Box>

      {error ? (
        <Typography variant="body2" className="text-destructive">
          {error}
        </Typography>
      ) : null}

      <Box className="flex justify-end border-t border-border/60 pt-4">
        <Button type="submit" variant="contained" disabled={saving} className="min-w-[160px]">
          {saving ? t('updating') : t('form.saveChanges')}
        </Button>
      </Box>
    </form>
  );
}
