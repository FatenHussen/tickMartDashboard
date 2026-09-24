import type { MultiSelectOption } from '@/shared/ui/multi-select';
import type { SettingItem } from '@/pages/dashboard/settings/types/setting.types';

import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useMemo, useState, useEffect } from 'react';
import { Iconify } from '@/shared/components/iconify';
import { compressImage } from '@/utils/compress-image';
import { formatTranslated } from '@/utils/format-translated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { _SettingApi } from '@/pages/dashboard/settings/api/setting.services';
import { settingKeyLabel } from '@/pages/dashboard/settings/utils/setting-key-label';
import { _PageBuilderApi } from '@/pages/dashboard/sections/api/page-builder.services';

import { Button } from 'src/shared/ui/button';
import { Switch } from 'src/shared/ui/switch';
import { SimpleSelect } from 'src/shared/ui/select';
import { Box, Input, Typography } from 'src/shared/ui';
import { MultiSelect } from 'src/shared/ui/multi-select';

// ----------------------------------------------------------------------

export const QUICK_ORDER_SETTING_KEYS = [
  'quick_order_header_enabled',
  'quick_order_enabled',
  'quick_order_page_ids',
  'quick_order_background_image',
  'quick_order_background_color',
  'quick_order_card_background_color',
  'quick_order_card_variant',
  'quick_order_badge',
  'quick_order_title',
  'quick_order_subtitle',
  'quick_order_cta',
  'quick_order_steps',
] as const;

export type QuickOrderSettingKey = (typeof QUICK_ORDER_SETTING_KEYS)[number];

type LangPair = { ar: string; en: string };

type QuickOrderStep = {
  number: number;
  /** Backend icon key, e.g. edit | price | delivery | feedback. */
  icon: string;
  title: LangPair;
  description: LangPair;
};

const CARD_VARIANTS = ['horizontal', 'vertical', 'square'] as const;
const STEP_ICON_KEYS = ['edit', 'price', 'delivery', 'feedback'] as const;

function asLangPair(v: unknown): LangPair {
  if (typeof v === 'string') return { ar: v, en: v };
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return {
      ar: typeof o.ar === 'string' ? o.ar : '',
      en: typeof o.en === 'string' ? o.en : '',
    };
  }
  return { ar: '', en: '' };
}

function normalizeSteps(raw: unknown): QuickOrderStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 6).map((step, i) => {
    const s =
      step && typeof step === 'object' && !Array.isArray(step)
        ? (step as Record<string, unknown>)
        : {};
    return {
      number: typeof s.number === 'number' && s.number > 0 ? s.number : i + 1,
      icon: typeof s.icon === 'string' ? s.icon : '',
      title: asLangPair(s.title),
      description: asLangPair(s.description),
    };
  });
}

function emptyStep(index: number): QuickOrderStep {
  return {
    number: index + 1,
    icon: '',
    title: { ar: '', en: '' },
    description: { ar: '', en: '' },
  };
}

function isStepFilled(step: QuickOrderStep): boolean {
  return Boolean(
    step.icon.trim() ||
      step.title.ar.trim() ||
      step.title.en.trim() ||
      step.description.ar.trim() ||
      step.description.en.trim()
  );
}

function normalizeHexForColorInput(hex: string): string {
  const s = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1]!;
    const g = s[2]!;
    const b = s[3]!;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#FFE8D6';
}

function coerceBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  }
  return Boolean(v);
}

/** Normalize setting value to positive page id numbers (handles JSON string / nested arrays). */
function normalizePageIds(raw: unknown): number[] {
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const item of value) {
    const n = typeof item === 'number' ? item : Number(item);
    if (!Number.isFinite(n) || n <= 0 || seen.has(n)) continue;
    seen.add(n);
    ids.push(n);
  }
  return ids;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ----------------------------------------------------------------------

export type QuickOrderSettingsPanelProps = {
  settings: SettingItem[];
};

export function QuickOrderSettingsPanel({ settings }: QuickOrderSettingsPanelProps) {
  const { t } = useTranslation('table');
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const byKey = useMemo(() => {
    const map = new Map<string, SettingItem>();
    settings.forEach((item) => map.set(item.key, item));
    return map;
  }, [settings]);

  const has = (key: QuickOrderSettingKey) => byKey.has(key);

  const [headerEnabled, setHeaderEnabled] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [pageIds, setPageIds] = useState<number[]>([]);
  const [bgColor, setBgColor] = useState('#FFE8D6');
  const [cardBgColor, setCardBgColor] = useState('#FFFFFF');
  const [cardVariant, setCardVariant] = useState<string>('horizontal');
  const [badge, setBadge] = useState<LangPair>({ ar: '', en: '' });
  const [title, setTitle] = useState<LangPair>({ ar: '', en: '' });
  const [subtitle, setSubtitle] = useState<LangPair>({ ar: '', en: '' });
  const [cta, setCta] = useState<LangPair>({ ar: '', en: '' });
  const [steps, setSteps] = useState<QuickOrderStep[]>([]);
  const [fileDraft, setFileDraft] = useState<File | null>(null);

  const { data: pagesFlat = [], isLoading: pagesLoading } = useQuery({
    queryKey: ['pageBuilder', 'list', 'flat', 'quick-order-settings'],
    queryFn: () => _PageBuilderApi.getListAllPagesFlat(),
  });

  const pageOptions: MultiSelectOption[] = useMemo(
    () =>
      pagesFlat.map((page) => ({
        value: page.id,
        label:
          typeof page.title === 'string'
            ? page.title
            : formatTranslated(page.title, page.slug || `#${page.id}`),
      })),
    [pagesFlat]
  );

  // Only re-hydrate from server when saved values actually change (not while editing).
  const serverSignature = useMemo(
    () =>
      QUICK_ORDER_SETTING_KEYS.map((key) => {
        const item = byKey.get(key);
        if (!item) return `${key}:missing`;
        return `${key}:${item.updated_at}:${JSON.stringify(item.value)}`;
      }).join('|'),
    [byKey]
  );

  useEffect(() => {
    const headerItem = byKey.get('quick_order_header_enabled');
    if (headerItem) setHeaderEnabled(coerceBoolean(headerItem.value));

    const enabledItem = byKey.get('quick_order_enabled');
    if (enabledItem) setEnabled(coerceBoolean(enabledItem.value));

    const pageIdsItem = byKey.get('quick_order_page_ids');
    if (pageIdsItem) setPageIds(normalizePageIds(pageIdsItem.value));

    const bg = byKey.get('quick_order_background_color');
    if (bg && (typeof bg.value === 'string' || typeof bg.value === 'number')) {
      setBgColor(String(bg.value));
    }

    const cardBg = byKey.get('quick_order_card_background_color');
    if (cardBg && (typeof cardBg.value === 'string' || typeof cardBg.value === 'number')) {
      setCardBgColor(String(cardBg.value));
    }

    const variant = byKey.get('quick_order_card_variant');
    if (
      variant &&
      typeof variant.value === 'string' &&
      CARD_VARIANTS.includes(variant.value as (typeof CARD_VARIANTS)[number])
    ) {
      setCardVariant(variant.value);
    }

    const badgeItem = byKey.get('quick_order_badge');
    if (badgeItem) setBadge(asLangPair(badgeItem.value));

    const titleItem = byKey.get('quick_order_title');
    if (titleItem) setTitle(asLangPair(titleItem.value));

    const subtitleItem = byKey.get('quick_order_subtitle');
    if (subtitleItem) setSubtitle(asLangPair(subtitleItem.value));

    const ctaItem = byKey.get('quick_order_cta');
    if (ctaItem) setCta(asLangPair(ctaItem.value));

    const stepsItem = byKey.get('quick_order_steps');
    if (stepsItem) {
      const normalized = normalizeSteps(stepsItem.value).filter(isStepFilled);
      setSteps(normalized.length > 0 ? normalized : [emptyStep(0)]);
    }

    setFileDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate only when server values change
  }, [serverSignature]);

  const saveAll = async () => {
    const seededKeys = QUICK_ORDER_SETTING_KEYS.filter((key) => has(key));
    if (seededKeys.length === 0) {
      toast.error(t('form.quickOrderNotSeeded'));
      return;
    }

    setSaving(true);
    try {
      const updates: Array<{ key: QuickOrderSettingKey; value: unknown; isFile?: boolean }> = [];

      if (has('quick_order_header_enabled')) {
        const current = byKey.get('quick_order_header_enabled')?.value;
        if (!valuesEqual(coerceBoolean(current), headerEnabled)) {
          updates.push({ key: 'quick_order_header_enabled', value: headerEnabled });
        }
      }

      if (has('quick_order_enabled')) {
        const current = byKey.get('quick_order_enabled')?.value;
        if (!valuesEqual(coerceBoolean(current), enabled)) {
          updates.push({ key: 'quick_order_enabled', value: enabled });
        }
      }

      if (has('quick_order_page_ids')) {
        const next = [...pageIds].sort((a, b) => a - b);
        const current = normalizePageIds(byKey.get('quick_order_page_ids')?.value).sort(
          (a, b) => a - b
        );
        if (!valuesEqual(current, next)) {
          updates.push({ key: 'quick_order_page_ids', value: pageIds });
        }
      }

      if (has('quick_order_background_image') && fileDraft instanceof File) {
        const value = fileDraft.type.startsWith('image/')
          ? await compressImage(fileDraft)
          : fileDraft;
        updates.push({ key: 'quick_order_background_image', value, isFile: true });
      }

      if (has('quick_order_background_color')) {
        const next = bgColor.trim();
        const current = byKey.get('quick_order_background_color')?.value;
        if (!valuesEqual(String(current ?? ''), next)) {
          updates.push({ key: 'quick_order_background_color', value: next });
        }
      }

      if (has('quick_order_card_background_color')) {
        const next = cardBgColor.trim();
        const current = byKey.get('quick_order_card_background_color')?.value;
        if (!valuesEqual(String(current ?? ''), next)) {
          updates.push({ key: 'quick_order_card_background_color', value: next });
        }
      }

      if (has('quick_order_card_variant')) {
        const current = byKey.get('quick_order_card_variant')?.value;
        if (!valuesEqual(current, cardVariant)) {
          updates.push({ key: 'quick_order_card_variant', value: cardVariant });
        }
      }

      if (has('quick_order_badge')) {
        const next = { ar: badge.ar.trim(), en: badge.en.trim() };
        const current = asLangPair(byKey.get('quick_order_badge')?.value);
        if (!valuesEqual(current, next)) {
          updates.push({ key: 'quick_order_badge', value: next });
        }
      }

      if (has('quick_order_title')) {
        const next = { ar: title.ar.trim(), en: title.en.trim() };
        const current = asLangPair(byKey.get('quick_order_title')?.value);
        if (!valuesEqual(current, next)) {
          updates.push({ key: 'quick_order_title', value: next });
        }
      }

      if (has('quick_order_subtitle')) {
        const next = { ar: subtitle.ar.trim(), en: subtitle.en.trim() };
        const current = asLangPair(byKey.get('quick_order_subtitle')?.value);
        if (!valuesEqual(current, next)) {
          updates.push({ key: 'quick_order_subtitle', value: next });
        }
      }

      if (has('quick_order_cta')) {
        const next = { ar: cta.ar.trim(), en: cta.en.trim() };
        const current = asLangPair(byKey.get('quick_order_cta')?.value);
        if (!valuesEqual(current, next)) {
          updates.push({ key: 'quick_order_cta', value: next });
        }
      }

      if (has('quick_order_steps')) {
        const filled = (steps.length > 0 ? steps : [emptyStep(0)]).filter(isStepFilled);
        const next = filled.map((s, i) => ({
          number: s.number || i + 1,
          ...(s.icon.trim() ? { icon: s.icon.trim() } : {}),
          title: { ar: s.title.ar.trim(), en: s.title.en.trim() },
          description: { ar: s.description.ar.trim(), en: s.description.en.trim() },
        }));
        const current = normalizeSteps(byKey.get('quick_order_steps')?.value)
          .filter(isStepFilled)
          .map((s, i) => ({
            number: s.number || i + 1,
            ...(s.icon.trim() ? { icon: s.icon.trim() } : {}),
            title: { ar: s.title.ar.trim(), en: s.title.en.trim() },
            description: { ar: s.description.ar.trim(), en: s.description.en.trim() },
          }));
        if (!valuesEqual(current, next)) {
          updates.push({ key: 'quick_order_steps', value: next });
        }
      }

      if (updates.length === 0) {
        toast.info(t('form.quickOrderNoChanges'));
        return;
      }

      // Sequential so one failed key does not leave a half-written batch race.
      for (const update of updates) {
        await _SettingApi.updateSetting(update.key, update.value, update.isFile);
      }

      await queryClient.invalidateQueries({ queryKey: ['setting'] });
      setFileDraft(null);
      toast.success(t('form.quickOrderSaveAllSuccess'));
    } catch (err: any) {
      toast.error(err?.message || t('form.settingsUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const canSave = QUICK_ORDER_SETTING_KEYS.some((key) => has(key));

  return (
    <Box className="space-y-4">
      <Box className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <Typography variant="body2" className="text-muted-foreground">
          {t('form.quickOrderPanelHint')}
        </Typography>
      </Box>

      <FieldCard
        title={settingKeyLabel(t, 'quick_order_header_enabled')}
        keyName="quick_order_header_enabled"
        seeded={has('quick_order_header_enabled')}
        notSeededLabel={t('form.quickOrderNotSeeded')}
      >
        <Switch
          checked={headerEnabled}
          onChange={(e) => setHeaderEnabled(e.target.checked)}
          disabled={!has('quick_order_header_enabled') || saving}
          label={t('form.quickOrderHeaderEnabledLabel')}
          helperText={t('form.quickOrderHeaderEnabledHelper')}
        />
      </FieldCard>

      <FieldCard
        title={settingKeyLabel(t, 'quick_order_enabled')}
        keyName="quick_order_enabled"
        seeded={has('quick_order_enabled')}
        notSeededLabel={t('form.quickOrderNotSeeded')}
      >
        <Switch
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={!has('quick_order_enabled') || saving}
          label={t('form.quickOrderEnabledLabel')}
          helperText={t('form.quickOrderEnabledHelper')}
        />
      </FieldCard>

      <FieldCard
        title={settingKeyLabel(t, 'quick_order_page_ids')}
        keyName="quick_order_page_ids"
        seeded={has('quick_order_page_ids')}
        notSeededLabel={t('form.quickOrderNotSeeded')}
      >
        <MultiSelect
          fullWidth
          label={t('form.quickOrderPageIdsLabel')}
          options={pageOptions}
          value={pageIds}
          onChange={(ids) =>
            setPageIds(
              (ids as (string | number)[])
                .map((id) => Number(id))
                .filter((n) => Number.isFinite(n) && n > 0)
            )
          }
          placeholder={
            pagesLoading ? t('loading') : t('form.quickOrderPageIdsPlaceholder')
          }
          isDisabled={!has('quick_order_page_ids') || saving || pagesLoading}
          isSearchable
          helperText={t('form.quickOrderPageIdsHelper')}
        />
      </FieldCard>

      <FieldCard
        title={settingKeyLabel(t, 'quick_order_background_image')}
        keyName="quick_order_background_image"
        seeded={has('quick_order_background_image')}
        notSeededLabel={t('form.quickOrderNotSeeded')}
      >
        {typeof byKey.get('quick_order_background_image')?.value === 'string' &&
        byKey.get('quick_order_background_image')?.value ? (
          <a
            href={String(byKey.get('quick_order_background_image')!.value)}
            target="_blank"
            rel="noreferrer"
            className="mb-3 inline-block text-sm text-primary underline"
          >
            {t('form.settingsFileCurrent')} — {t('form.viewFile')}
          </a>
        ) : null}
        <label className="flex cursor-pointer flex-col gap-2">
          <Typography variant="caption" className="text-muted-foreground">
            {t('form.settingsFileHelper')}
          </Typography>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            disabled={!has('quick_order_background_image') || saving}
            className="text-sm file:me-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/15"
            onChange={(e) => setFileDraft(e.target.files?.[0] ?? null)}
          />
          {fileDraft ? (
            <Typography variant="caption" className="font-mono text-foreground">
              {fileDraft.name}
            </Typography>
          ) : null}
        </label>
      </FieldCard>

      <Box className="grid gap-4 lg:grid-cols-2">
        <ColorField
          title={settingKeyLabel(t, 'quick_order_background_color')}
          keyName="quick_order_background_color"
          seeded={has('quick_order_background_color')}
          notSeededLabel={t('form.quickOrderNotSeeded')}
          colorVal={bgColor}
          setColorVal={setBgColor}
          colorPickerLabel={t('form.settingsColorPicker')}
          hexLabel={t('form.settingsColorHex')}
          disabled={saving}
        />
        <ColorField
          title={settingKeyLabel(t, 'quick_order_card_background_color')}
          keyName="quick_order_card_background_color"
          seeded={has('quick_order_card_background_color')}
          notSeededLabel={t('form.quickOrderNotSeeded')}
          colorVal={cardBgColor}
          setColorVal={setCardBgColor}
          colorPickerLabel={t('form.settingsColorPicker')}
          hexLabel={t('form.settingsColorHex')}
          disabled={saving}
        />
      </Box>

      <FieldCard
        title={settingKeyLabel(t, 'quick_order_card_variant')}
        keyName="quick_order_card_variant"
        seeded={has('quick_order_card_variant')}
        notSeededLabel={t('form.quickOrderNotSeeded')}
      >
        <SimpleSelect
          fullWidth
          label={t('form.quickOrderCardVariantLabel')}
          value={cardVariant}
          disabled={!has('quick_order_card_variant') || saving}
          onChange={(v) => setCardVariant(String(v))}
          options={CARD_VARIANTS.map((v) => ({
            value: v,
            label: t(`form.quickOrderCardVariant_${v}`, { defaultValue: v }),
          }))}
        />
        <Typography variant="caption" className="mt-2 block text-muted-foreground">
          {t('form.quickOrderCardVariantHelper')}
        </Typography>
      </FieldCard>

      <BilingualField
        title={settingKeyLabel(t, 'quick_order_badge')}
        keyName="quick_order_badge"
        seeded={has('quick_order_badge')}
        notSeededLabel={t('form.quickOrderNotSeeded')}
        value={badge}
        onChange={setBadge}
        nameEn={t('form.nameEn')}
        nameAr={t('form.nameAr')}
        disabled={saving}
      />
      <BilingualField
        title={settingKeyLabel(t, 'quick_order_title')}
        keyName="quick_order_title"
        seeded={has('quick_order_title')}
        notSeededLabel={t('form.quickOrderNotSeeded')}
        value={title}
        onChange={setTitle}
        nameEn={t('form.nameEn')}
        nameAr={t('form.nameAr')}
        disabled={saving}
      />
      <BilingualField
        title={settingKeyLabel(t, 'quick_order_subtitle')}
        keyName="quick_order_subtitle"
        seeded={has('quick_order_subtitle')}
        notSeededLabel={t('form.quickOrderNotSeeded')}
        value={subtitle}
        onChange={setSubtitle}
        nameEn={t('form.nameEn')}
        nameAr={t('form.nameAr')}
        rows={2}
        disabled={saving}
      />
      <BilingualField
        title={settingKeyLabel(t, 'quick_order_cta')}
        keyName="quick_order_cta"
        seeded={has('quick_order_cta')}
        notSeededLabel={t('form.quickOrderNotSeeded')}
        value={cta}
        onChange={setCta}
        nameEn={t('form.nameEn')}
        nameAr={t('form.nameAr')}
        disabled={saving}
      />

      <FieldCard
        title={settingKeyLabel(t, 'quick_order_steps')}
        keyName="quick_order_steps"
        seeded={has('quick_order_steps')}
        notSeededLabel={t('form.quickOrderNotSeeded')}
      >
        {has('quick_order_steps') ? (
          <Box className="space-y-4">
            {steps.map((step, index) => (
              <Box
                key={`step-${index}`}
                className="space-y-3 rounded-lg border border-border/70 bg-background p-4"
              >
                <Box className="flex flex-wrap items-center justify-between gap-2">
                  <Typography variant="subtitle2" className="font-semibold">
                    {t('form.quickOrderStepLabel', { n: index + 1 })}
                  </Typography>
                  <Button
                    type="button"
                    variant="text"
                    size="small"
                    disabled={steps.length <= 1 || saving}
                    onClick={() =>
                      setSteps((prev) =>
                        prev
                          .filter((_, i) => i !== index)
                          .map((s, i) => ({ ...s, number: i + 1 }))
                      )
                    }
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={16} className="me-1" />
                    {t('form.quickOrderRemoveStep')}
                  </Button>
                </Box>
                <Box className="grid gap-3 sm:grid-cols-2">
                  <Box>
                    <Typography variant="caption" className="mb-1 block text-muted-foreground">
                      {t('form.quickOrderStepIcon')}
                    </Typography>
                    <SimpleSelect
                      fullWidth
                      value={step.icon}
                      disabled={saving}
                      onChange={(v) =>
                        setSteps((prev) =>
                          prev.map((s, i) => (i === index ? { ...s, icon: String(v) } : s))
                        )
                      }
                      options={[
                        { value: '', label: t('form.quickOrderStepIconNone') },
                        ...STEP_ICON_KEYS.map((key) => ({
                          value: key,
                          label: t(`form.quickOrderStepIcon_${key}`, { defaultValue: key }),
                        })),
                        ...(step.icon &&
                        !STEP_ICON_KEYS.includes(step.icon as (typeof STEP_ICON_KEYS)[number])
                          ? [{ value: step.icon, label: step.icon }]
                          : []),
                      ]}
                    />
                    <Typography variant="caption" className="mt-1 block text-muted-foreground">
                      {t('form.quickOrderStepIconHelper')}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" className="mb-1 block text-muted-foreground">
                      {t('form.quickOrderStepNumber')}
                    </Typography>
                    <Input
                      type="number"
                      min={1}
                      value={step.number}
                      disabled={saving}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSteps((prev) =>
                          prev.map((s, i) =>
                            i === index
                              ? { ...s, number: Math.max(1, Number(e.target.value) || 1) }
                              : s
                          )
                        )
                      }
                      className="font-mono text-sm"
                    />
                  </Box>
                </Box>
                <Box className="grid gap-3 sm:grid-cols-2">
                  <LangInputs
                    labelEn={t('form.nameEn')}
                    labelAr={t('form.nameAr')}
                    value={step.title}
                    disabled={saving}
                    onChange={(pair) =>
                      setSteps((prev) =>
                        prev.map((s, i) => (i === index ? { ...s, title: pair } : s))
                      )
                    }
                  />
                </Box>
                <Box className="grid gap-3 sm:grid-cols-2">
                  <LangInputs
                    labelEn={`${t('form.nameEn')} — ${t('form.quickOrderStepDescription')}`}
                    labelAr={`${t('form.nameAr')} — ${t('form.quickOrderStepDescription')}`}
                    value={step.description}
                    rows={1}
                    disabled={saving}
                    onChange={(pair) =>
                      setSteps((prev) =>
                        prev.map((s, i) => (i === index ? { ...s, description: pair } : s))
                      )
                    }
                  />
                </Box>
              </Box>
            ))}
            <Button
              type="button"
              variant="outlined"
              disabled={steps.length >= 6 || saving}
              onClick={() => setSteps((prev) => [...prev, emptyStep(prev.length)])}
            >
              <Iconify icon="solar:add-circle-bold" width={18} className="me-1" />
              {t('form.quickOrderAddStep')}
            </Button>
          </Box>
        ) : null}
      </FieldCard>

      <Box className="sticky bottom-0 z-10 -mx-1 flex justify-end border-t border-border/60 bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button
          type="button"
          variant="contained"
          disabled={!canSave || saving}
          onClick={() => void saveAll()}
          className="min-w-[160px]"
        >
          {saving ? t('updating') : t('form.saveChanges')}
        </Button>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

function FieldCard({
  title,
  keyName,
  seeded,
  notSeededLabel,
  children,
}: {
  title: string;
  keyName: string;
  seeded: boolean;
  notSeededLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Box className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <Box>
        <Typography variant="subtitle1" className="font-semibold">
          {title}
        </Typography>
        <Typography variant="caption" className="font-mono text-muted-foreground">
          {keyName}
        </Typography>
        {!seeded && (
          <Typography variant="body2" className="mt-2 text-amber-700 dark:text-amber-300">
            {notSeededLabel}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}

function ColorField({
  title,
  keyName,
  seeded,
  notSeededLabel,
  colorVal,
  setColorVal,
  colorPickerLabel,
  hexLabel,
  disabled,
}: {
  title: string;
  keyName: string;
  seeded: boolean;
  notSeededLabel: string;
  colorVal: string;
  setColorVal: (v: string) => void;
  colorPickerLabel: string;
  hexLabel: string;
  disabled?: boolean;
}) {
  return (
    <FieldCard title={title} keyName={keyName} seeded={seeded} notSeededLabel={notSeededLabel}>
      <Box className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Box className="flex flex-col gap-2">
          <Typography variant="subtitle2" className="font-medium">
            {colorPickerLabel}
          </Typography>
          <input
            type="color"
            value={normalizeHexForColorInput(colorVal)}
            disabled={!seeded || disabled}
            onChange={(e) => setColorVal(e.target.value)}
            className="h-12 w-full max-w-[120px] cursor-pointer rounded-lg border border-input bg-background p-1 disabled:opacity-50"
          />
        </Box>
        <Box className="min-w-0 flex-1">
          <Typography variant="subtitle2" className="mb-2 font-medium">
            {hexLabel}
          </Typography>
          <Input
            value={colorVal}
            disabled={!seeded || disabled}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColorVal(e.target.value)}
            placeholder="#RRGGBB"
            className="font-mono text-sm"
          />
        </Box>
      </Box>
    </FieldCard>
  );
}

function BilingualField({
  title,
  keyName,
  seeded,
  notSeededLabel,
  value,
  onChange,
  nameEn,
  nameAr,
  rows = 1,
  disabled,
}: {
  title: string;
  keyName: string;
  seeded: boolean;
  notSeededLabel: string;
  value: LangPair;
  onChange: (v: LangPair) => void;
  nameEn: string;
  nameAr: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <FieldCard title={title} keyName={keyName} seeded={seeded} notSeededLabel={notSeededLabel}>
      <Box className="grid gap-3 sm:grid-cols-2">
        <LangInputs
          labelEn={nameEn}
          labelAr={nameAr}
          value={value}
          rows={rows}
          disabled={!seeded || disabled}
          onChange={onChange}
        />
      </Box>
    </FieldCard>
  );
}

function LangInputs({
  labelEn,
  labelAr,
  value,
  onChange,
  rows = 1,
  disabled,
}: {
  labelEn: string;
  labelAr: string;
  value: LangPair;
  onChange: (v: LangPair) => void;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <>
      <Box>
        <Typography variant="subtitle2" className="mb-1 font-medium">
          {labelEn}
        </Typography>
        <textarea
          value={value.en}
          disabled={disabled}
          rows={rows}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
      </Box>
      <Box>
        <Typography variant="subtitle2" className="mb-1 font-medium">
          {labelAr}
        </Typography>
        <textarea
          value={value.ar}
          disabled={disabled}
          rows={rows}
          dir="rtl"
          onChange={(e) => onChange({ ...value, ar: e.target.value })}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
      </Box>
    </>
  );
}
