import type { UseFieldArrayReturn } from 'react-hook-form';
import type { ColorListItem } from '@/pages/dashboard/colors/types/color.types';
import type { CategoryAttributeFormValues } from '@/pages/dashboard/categories/validation/category-attribute.validation';

import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Iconify } from '@/shared/components/iconify';
import { useWatch, useFormContext } from 'react-hook-form';
import { useRef, useMemo, useState, useEffect } from 'react';
import { _ColorApi } from '@/pages/dashboard/colors/api/color.services';
import { normalizeCatalogHex } from '@/pages/dashboard/colors/utils/catalog-hex';
import { useCreateColor, useActiveColorCatalog } from '@/pages/dashboard/colors/hooks/color';
import { parseCategoryAttributeValueId } from '@/pages/dashboard/categories/utils/category-attribute-values';

import { paths } from 'src/routes/paths';

import { Box, Button, Typography } from 'src/shared/ui';
import { RHFTextField } from 'src/shared/components/hook-form/rhf-text-field';
import { HexPaletteField } from 'src/shared/components/hook-form/rhf-color-picker';

// ----------------------------------------------------------------------

type ColorValuesArray = UseFieldArrayReturn<CategoryAttributeFormValues, 'values', 'fieldKey'>;

function readCreatedColorId(payload: unknown): number | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  const candidates = [record.data, record.color, record.item, record];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const id = Number((candidate as { id?: unknown }).id);
    if (Number.isInteger(id) && id > 0) return id;
  }
  return undefined;
}

function findColorByHex(colors: ColorListItem[], hex: string): ColorListItem | undefined {
  return colors.find((color) => normalizeCatalogHex(color.hex) === hex);
}

function AttributeShadePalette({
  savedHex,
  error,
  disabled,
  helperText,
  placeholder,
  onCommit,
}: {
  savedHex?: string | null;
  error?: string;
  disabled?: boolean;
  helperText: string;
  placeholder: string;
  onCommit: (hex: string) => Promise<void>;
}) {
  const normalized = normalizeCatalogHex(savedHex) ?? '';
  const [draft, setDraft] = useState(normalized);
  const baselineRef = useRef(normalized);

  useEffect(() => {
    baselineRef.current = normalized;
    setDraft(normalized);
  }, [normalized]);

  return (
    <HexPaletteField
      value={draft}
      disabled={disabled}
      error={error}
      helperText={helperText}
      placeholder={placeholder}
      onChange={setDraft}
      onCommit={(hex) => {
        const next = normalizeCatalogHex(hex);
        if (!next || next === normalizeCatalogHex(baselineRef.current)) return;
        setDraft(next);
        void onCommit(next).catch(() => setDraft(baselineRef.current));
      }}
    />
  );
}

export function CategoryAttributeColorValues({
  isEditMode,
  fields,
  append,
  remove,
}: {
  isEditMode: boolean;
  fields: ColorValuesArray['fields'];
  append: ColorValuesArray['append'];
  remove: ColorValuesArray['remove'];
}) {
  const { t } = useTranslation('table');
  const { control, register, setValue, getValues } = useFormContext<CategoryAttributeFormValues>();
  const watchedValues = useWatch({ control, name: 'values' });
  const { data: colors = [] } = useActiveColorCatalog();
  const createColor = useCreateColor();
  const [extraColors, setExtraColors] = useState<ColorListItem[]>([]);

  const catalog = useMemo(() => {
    const byId = new Map<number, ColorListItem>();
    for (const color of [...extraColors, ...colors]) byId.set(color.id, color);
    return [...byId.values()];
  }, [colors, extraColors]);

  const fillEmptyNames = async (index: number, colorId: number) => {
    const current = getValues(`values.${index}.name`);
    if (current?.en?.trim() && current?.ar?.trim()) return;

    try {
      const details = await _ColorApi.getColorById(colorId);
      const name = details.data?.name;
      if (!name || typeof name !== 'object') return;
      const latest = getValues(`values.${index}.name`);
      if (!latest?.en?.trim() && name.en) {
        setValue(`values.${index}.name.en`, name.en, { shouldDirty: true, shouldValidate: true });
      }
      if (!latest?.ar?.trim() && name.ar) {
        setValue(`values.${index}.name.ar`, name.ar, { shouldDirty: true, shouldValidate: true });
      }
    } catch {
      // The row stays linked by color_id. The display name can be typed by hand.
    }
  };

  const linkShade = (
    index: number,
    colorId: number,
    hex: string | null,
    names?: { en: string; ar: string }
  ) => {
    setValue(`values.${index}.color_id`, colorId, { shouldDirty: true, shouldValidate: true });
    if (hex) setValue(`values.${index}.hex`, hex, { shouldDirty: true });
    if (!names) {
      void fillEmptyNames(index, colorId);
      return;
    }
    const current = getValues(`values.${index}.name`);
    if (!current?.en?.trim()) {
      setValue(`values.${index}.name.en`, names.en, { shouldDirty: true, shouldValidate: true });
    }
    if (!current?.ar?.trim()) {
      setValue(`values.${index}.name.ar`, names.ar, { shouldDirty: true, shouldValidate: true });
    }
  };

  const persistShade = async (index: number, rawHex: string) => {
    const hex = normalizeCatalogHex(rawHex);
    if (!hex) return;
    const currentId = parseCategoryAttributeValueId(getValues(`values.${index}.color_id`));
    const currentHex = normalizeCatalogHex(getValues(`values.${index}.hex`));
    if (currentId && currentHex === hex) return;

    const existing = findColorByHex(catalog, hex);
    if (existing) {
      linkShade(index, existing.id, hex);
      return;
    }

    const currentName = getValues(`values.${index}.name`);
    const en = currentName?.en?.trim() || hex;
    const ar = currentName?.ar?.trim() || en;
    const created = await createColor.mutateAsync({
      name: { en, ar },
      hex,
      is_active: true,
    });
    const newId = readCreatedColorId(created);
    if (newId == null) throw new Error('color create response is missing id');
    setExtraColors((current) => [
      {
        id: newId,
        name: en,
        hex,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
      ...current.filter((color) => color.id !== newId),
    ]);
    linkShade(index, newId, hex, { en, ar });
  };

  return (
    <Box className="rounded-2xl border border-rose-500/25 bg-card/50 shadow-sm">
      <Box className="border-b border-border/40 bg-gradient-to-r from-rose-500/[0.08] via-rose-500/[0.03] to-transparent px-6 py-5">
        <Box className="flex items-center gap-3">
          <Box className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/15">
            <Iconify icon="solar:palette-bold" className="text-rose-600" width={18} />
          </Box>
          <Box className="min-w-0 flex-1">
            <Typography variant="subtitle1" className="font-semibold leading-snug text-foreground">
              {t('form.attributeValuesSection')}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box className="space-y-4 p-6">
        <Typography variant="caption" className="block text-muted-foreground">
          {t('form.attributeColorValuesHint')}
        </Typography>

        {fields.length === 0 ? (
          <Typography variant="caption" className="block rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-muted-foreground">
            {isEditMode ? t('form.attributeColorEmptyEdit') : t('form.attributeColorEmptyCreate')}
          </Typography>
        ) : null}

        {fields.map((field, index) => {
          const colorId = parseCategoryAttributeValueId(watchedValues?.[index]?.color_id);
          const linked = colorId ? catalog.find((color) => color.id === colorId) : undefined;
          const savedHex =
            normalizeCatalogHex(linked?.hex) ?? normalizeCatalogHex(watchedValues?.[index]?.hex);
          const showUnlinked = colorId == null;
          return (
            <Box
              key={field.fieldKey}
              className={`space-y-3 rounded-xl border p-4 ${
                showUnlinked ? 'border-rose-500/40 bg-rose-500/[0.04]' : 'border-border/60 bg-muted/25'
              }`}
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
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    remove(index);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5"
                >
                  <Iconify icon="solar:trash-bin-bold" width={16} />
                  {t('form.removeAttributeValue')}
                </Button>
              </Box>

              <Box>
                <Typography variant="caption" className="mb-1.5 block font-medium text-muted-foreground">
                  {t('form.attributeColorPickShade')}
                </Typography>
                <AttributeShadePalette
                  savedHex={savedHex}
                  disabled={createColor.isPending}
                  helperText={t('form.attributeColorPaletteHint')}
                  placeholder={t('form.attributeColorPickPlaceholder')}
                  onCommit={(hex) => persistShade(index, hex)}
                />
                <input type="hidden" {...register(`values.${index}.hex`)} />
                {showUnlinked ? (
                  <Typography variant="caption" className="mt-1.5 block text-rose-600">
                    {t('form.attributeColorUnlinked')}
                  </Typography>
                ) : null}
              </Box>

              <Box className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <RHFTextField
                  name={`values.${index}.name.en`}
                  placeholder={t('form.valueEn')}
                  label={t('form.nameEn')}
                  helperText={t('form.attributeColorDisplayNameHint')}
                />
                <RHFTextField
                  name={`values.${index}.name.ar`}
                  placeholder={t('form.valueAr')}
                  label={t('form.nameAr')}
                  dir="rtl"
                />
              </Box>
            </Box>
          );
        })}

        <Box className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outlined"
            color="warning"
            size="small"
            onClick={() => append({ name: { en: '', ar: '' } })}
            className="inline-flex items-center justify-center gap-2"
          >
            <Iconify icon="solar:add-circle-bold" width={18} height={18} />
            {t('form.addAttributeValue')}
          </Button>
          <Link
            to={`${paths.dashboard.colors}/create`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary hover:underline"
          >
            {t('form.attributeColorOpenCatalog')}
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
