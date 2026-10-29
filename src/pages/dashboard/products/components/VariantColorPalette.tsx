import type { ColorListItem } from '@/pages/dashboard/colors/types/color.types';
import type { CategoryAttributeListResponse } from '@/pages/dashboard/categories/types/category-attribute.types';

import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useRef, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveColorCatalog } from '@/pages/dashboard/colors/hooks/color';
import { normalizeCatalogHex } from '@/pages/dashboard/colors/utils/catalog-hex';
import { _CategoryAttributeApi } from '@/pages/dashboard/categories/api/category-attribute.services';

import { Box, Typography } from 'src/shared/ui';

import {
  attributeValueLabel,
  type CategoryAttributeValueRef,
  type CategoryAttributePickerRow,
  resolveCategoryAttributeValueHex,
} from '../utils/variant-combinations';

type SavedShade = {
  id: number;
  name: { en?: string; ar?: string } | string;
  color_id: number;
  hex: string;
};

function readNames(name: CategoryAttributeValueRef['name']): { en: string; ar: string } {
  if (name && typeof name === 'object') {
    return {
      en: String(name.en ?? '').trim(),
      ar: String(name.ar ?? '').trim(),
    };
  }
  const text = attributeValueLabel(name);
  return { en: text, ar: text };
}

function colorLabel(color: Pick<ColorListItem, 'name' | 'hex'>): string {
  if (typeof color.name === 'string' && color.name.trim()) return color.name.trim();
  return normalizeCatalogHex(color.hex) ?? '';
}

function mergeShadeIntoAttributeLists(attributeId: number, saved: SavedShade) {
  return (current: CategoryAttributeListResponse | undefined) => {
    if (!current?.data?.items) return current;
    return {
      ...current,
      data: {
        ...current.data,
        items: current.data.items.map((item) => {
          if (Number(item.id) !== attributeId) return item;
          const values = [...(item.values ?? [])];
          const names = readNames(saved.name);
          const next = {
            id: saved.id,
            name: { ar: names.ar, en: names.en },
            color_id: saved.color_id,
            hex: saved.hex,
          };
          const index = values.findIndex((row) => Number(row.id) === saved.id);
          if (index >= 0) values[index] = { ...values[index], ...next };
          else values.push(next);
          return { ...item, values };
        }),
      },
    };
  };
}

export function VariantColorPalette({
  attr,
  selectedId,
  onChange,
}: {
  attr: CategoryAttributePickerRow;
  selectedId: number;
  onChange: (valueId: number) => void;
}) {
  const { t } = useTranslation('table');
  const queryClient = useQueryClient();
  const { data: colors = [], isLoading } = useActiveColorCatalog();
  const selected = (attr.values ?? []).find((value) => Number(value.id) === selectedId);
  const linkedHex = selected ? resolveCategoryAttributeValueHex(selected) : null;
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [hex, setHex] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const namesDirty = useRef(false);
  const customHexPending = useRef(false);

  useEffect(() => {
    if (namesDirty.current || customHexPending.current) return;
    const names = readNames(selected?.name);
    setNameEn(names.en);
    setNameAr(names.ar);
    setHex(linkedHex);
  }, [selectedId, selected?.name, linkedHex]);

  const grayValueId = () => {
    if (!selected || resolveCategoryAttributeValueHex(selected) != null) return undefined;
    const id = Number(selected.id);
    return Number.isInteger(id) && id > 0 ? id : undefined;
  };

  const shadeName = (arValue = nameAr, enValue = nameEn) => {
    const en = enValue.trim();
    const ar = arValue.trim();
    if (!en && !ar) return null;
    return { en: en || ar, ar: ar || en };
  };

  const applySaved = (saved: SavedShade) => {
    const storedHex = normalizeCatalogHex(saved.hex);
    const names = readNames(saved.name);
    namesDirty.current = false;
    customHexPending.current = false;
    setNameEn(names.en || nameEn);
    setNameAr(names.ar || nameAr);
    setHex(storedHex);
    queryClient.setQueriesData<CategoryAttributeListResponse>(
      { queryKey: ['categoryattribute', 'list'] },
      mergeShadeIntoAttributeLists(Number(attr.id), {
        ...saved,
        hex: storedHex ?? saved.hex,
      })
    );
    void queryClient.invalidateQueries({ queryKey: ['color', 'list'] });
    void queryClient.invalidateQueries({ queryKey: ['categoryattribute', 'list'] });
    onChange(saved.id);
  };

  const persistExisting = async (colorId: number) => {
    setSaving(true);
    try {
      const attributeValueId = grayValueId();
      const saved = await _CategoryAttributeApi.savePaletteShade(attr.id, {
        color_id: colorId,
        ...(attributeValueId ? { attribute_value_id: attributeValueId } : {}),
      });
      applySaved(saved);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const persistNewHex = async (
    rawHex: string | null,
    names?: { ar?: string; en?: string }
  ) => {
    const nextHex = normalizeCatalogHex(rawHex);
    if (!nextHex) return;
    const name = shadeName(names?.ar ?? nameAr, names?.en ?? nameEn);
    if (!name) {
      toast.error(t('form.productColorNameRequired'));
      return;
    }
    setSaving(true);
    try {
      const attributeValueId = grayValueId();
      const saved = await _CategoryAttributeApi.savePaletteShade(attr.id, {
        name,
        hex: nextHex,
        ...(attributeValueId ? { attribute_value_id: attributeValueId } : {}),
      });
      applySaved(saved);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const activeHex = hex ?? linkedHex;

  return (
    <Box className="min-w-0 space-y-3">
      <Box className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            {t('form.productColorNameAr')}
          </span>
          <input
            value={nameAr}
            dir="rtl"
            disabled={saving}
            onChange={(event) => {
              namesDirty.current = true;
              setNameAr(event.target.value);
            }}
            onBlur={(event) => {
              if (customHexPending.current) {
                void persistNewHex(hex, { ar: event.currentTarget.value, en: nameEn });
              }
            }}
            className="h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary/50"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            {t('form.productColorNameEn')}
          </span>
          <input
            value={nameEn}
            disabled={saving}
            onChange={(event) => {
              namesDirty.current = true;
              setNameEn(event.target.value);
            }}
            onBlur={(event) => {
              if (customHexPending.current) {
                void persistNewHex(hex, { ar: nameAr, en: event.currentTarget.value });
              }
            }}
            className="h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary/50"
          />
        </label>
      </Box>

      <Box>
        <Typography variant="caption" className="mb-1.5 block font-medium text-muted-foreground">
          {t('form.productColorPickShade')}
        </Typography>
        <Box className="flex flex-wrap gap-2 rounded-lg border border-border/60 bg-muted/20 p-2">
          {isLoading ? (
            <Typography variant="caption" className="text-muted-foreground">
              {t('form.loadingColor')}
            </Typography>
          ) : colors.length === 0 ? (
            <Typography variant="caption" className="text-muted-foreground">
              {t('form.attributeColorNoShades')}
            </Typography>
          ) : (
            colors.map((color) => {
              const swatch = normalizeCatalogHex(color.hex);
              if (!swatch) return null;
              const active = activeHex === swatch || Number(selected?.color_id) === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  title={`${colorLabel(color)} ${swatch}`}
                  disabled={saving}
                  onClick={() => {
                    customHexPending.current = false;
                    setHex(swatch);
                    void persistExisting(color.id);
                  }}
                  className={`h-8 w-8 rounded-full border border-black/10 ${
                    active ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              );
            })
          )}
        </Box>
      </Box>

      <label className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">
          {t('form.productColorCustomHex')}
        </span>
        <input
          type="color"
          disabled={saving}
          value={activeHex ?? '#3E434A'}
          onChange={(event) => {
            customHexPending.current = true;
            setHex(normalizeCatalogHex(event.target.value));
          }}
          onBlur={(event) => {
            if (!customHexPending.current) return;
            void persistNewHex(event.currentTarget.value);
          }}
          className="h-9 w-12 cursor-pointer rounded-lg border border-border/70 bg-background"
        />
        <span className="font-mono text-xs text-muted-foreground">{activeHex ?? ''}</span>
      </label>

      {!linkedHex ? (
        <Typography variant="caption" className="block text-rose-600">
          {t('form.productColorNeedsShade')}
        </Typography>
      ) : null}
    </Box>
  );
}
