import type { TFunction } from 'i18next';
import type {
  CategoryAttributeValue,
  CategoryAttributeListResponse,
} from '@/pages/dashboard/categories/types/category-attribute.types';

import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeCatalogHex } from '@/pages/dashboard/colors/utils/catalog-hex';
import { useActiveColorCatalog } from '@/pages/dashboard/colors/hooks/color';
import { HexPaletteField } from '@/shared/components/hook-form/rhf-color-picker';
import { isColorCategoryAttribute } from '@/pages/dashboard/categories/utils/color-attribute';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/shared/ui/select';

import { Box, Typography } from 'src/shared/ui';

import { VariantFieldLabel, ColorAttributeOption } from './variant-field-ui';
import {
  sortedComboKey,
  linkedShadeHex,
  attributeValueLabel,
  buildColorsHexLookup,
  attributePickerValues,
  replaceAttributeValueId,
  type VariantAttributeRow,
  selectedValueIdForAttribute,
  replaceColorAttributeValueId,
  type CategoryAttributeValueRef,
  type CategoryAttributePickerRow,
} from '../utils/variant-combinations';
import { persistVariantShade } from '../utils/persist-variant-shade';

// ----------------------------------------------------------------------

const selectTriggerCls =
  'h-10 w-full rounded-lg border border-border/45 bg-background px-3 text-sm shadow-none transition-colors hover:border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/15';

/** Radix Select cannot use an empty string; this marks an unset optional attribute. */
const ATTRIBUTE_NONE_VALUE = '__none__';

export function AttributeSingleSelect({
  attr,
  selectedId,
  onChange,
  colorsHexLookup,
  formatAttributeLabel,
  colorHint,
  resetNonce = 0,
  shadeBusy = false,
  onCommitShade,
}: {
  attr: CategoryAttributePickerRow;
  selectedId: number;
  onChange: (valueId: number) => void;
  colorsHexLookup: ReturnType<typeof buildColorsHexLookup>;
  formatAttributeLabel: (name: unknown) => string;
  colorHint?: string;
  resetNonce?: number;
  shadeBusy?: boolean;
  onCommitShade?: (hex: string) => Promise<void>;
}) {
  const label = formatAttributeLabel(attr.name);
  const isColor = isColorCategoryAttribute(attr);
  const values = attributePickerValues(attr, colorsHexLookup, selectedId);
  const selected = values.find((val) => Number(val.id) === selectedId);
  const selectedHex = isColor ? linkedShadeHex(selected, colorsHexLookup) ?? '' : '';
  const [draftHex, setDraftHex] = useState(selectedHex);

  useEffect(() => {
    setDraftHex(selectedHex);
  }, [selectedHex]);

  return (
    <Box className="min-w-0 space-y-1">
      <VariantFieldLabel>{label}</VariantFieldLabel>
      {isColor && onCommitShade ? (
        <HexPaletteField
          value={draftHex}
          disabled={shadeBusy}
          helperText={colorHint}
          placeholder="#RRGGBB"
          onChange={setDraftHex}
          onCommit={(hex) => {
            void onCommitShade(hex).catch(() => setDraftHex(selectedHex));
          }}
        />
      ) : null}
      <Select
        key={`${attr.id}-${resetNonce}`}
        value={selectedId > 0 ? String(selectedId) : ATTRIBUTE_NONE_VALUE}
        onValueChange={(v) => onChange(v === ATTRIBUTE_NONE_VALUE ? 0 : Number(v))}
      >
        <SelectTrigger className={selectTriggerCls}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent className="max-h-64 min-w-[var(--radix-select-trigger-width)] p-1">
          <SelectItem value={ATTRIBUTE_NONE_VALUE} textValue="—" className="rounded-md py-2">
            <span className="text-muted-foreground">—</span>
          </SelectItem>
          {values.map((val) => {
            const valLabel = attributeValueLabel(val.name) || String(val.id);
            const valHex = isColor ? linkedShadeHex(val, colorsHexLookup) : null;
            return (
              <SelectItem
                key={val.id}
                value={String(val.id)}
                textValue={valLabel}
                className="rounded-md py-2"
              >
                {isColor && valHex ? (
                  <ColorAttributeOption hex={valHex} label={valLabel} />
                ) : (
                  valLabel
                )}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {isColor && colorHint && !onCommitShade ? (
        <Typography variant="caption" className="block text-muted-foreground">
          {colorHint}
        </Typography>
      ) : null}
    </Box>
  );
}

type Props = {
  categoryAttributes: CategoryAttributePickerRow[];
  selectedIds: number[];
  variantAttributes?: VariantAttributeRow[] | null;
  onChange: (nextIds: number[]) => void;
  formatAttributeLabel: (name: unknown) => string;
  /** Other rows' combos — changing a select must not collide. */
  existingComboKeys?: Set<string>;
  t?: TFunction;
  resetNonce?: number;
};

export function VariantAttributeSelects({
  categoryAttributes,
  selectedIds,
  variantAttributes,
  onChange,
  formatAttributeLabel,
  existingComboKeys,
  t,
  resetNonce = 0,
}: Props) {
  const { data: colorItems } = useActiveColorCatalog();
  const queryClient = useQueryClient();
  const [extraValues, setExtraValues] = useState<Record<number, CategoryAttributeValueRef[]>>({});
  const [shadeBusyId, setShadeBusyId] = useState<number | null>(null);

  const colorsHexLookup = useMemo(
    () => buildColorsHexLookup(colorItems ?? []),
    [colorItems]
  );

  const attributes = useMemo(
    () =>
      categoryAttributes.map((attr) => {
        const extras = extraValues[attr.id] ?? [];
        if (extras.length === 0) return attr;
        const values = [...(attr.values ?? [])];
        for (const extra of extras) {
          const index = values.findIndex((val) => Number(val.id) === Number(extra.id));
          if (index === -1) values.push(extra);
          else values[index] = { ...values[index], ...extra };
        }
        return { ...attr, values };
      }),
    [categoryAttributes, extraValues]
  );

  if (attributes.length === 0) return null;

  const rememberShade = (attributeId: number, value: CategoryAttributeValueRef) => {
    setExtraValues((current) => {
      const list = current[attributeId] ?? [];
      const next = list.filter((row) => Number(row.id) !== Number(value.id));
      return { ...current, [attributeId]: [...next, value] };
    });
    queryClient.setQueriesData<CategoryAttributeListResponse>(
      { queryKey: ['categoryattribute', 'list'] },
      (cached) => {
        const items = cached?.data?.items;
        if (!cached || !Array.isArray(items)) return cached;
        return {
          ...cached,
          data: {
            ...cached.data,
            items: items.map((row) => {
              if (Number(row.id) !== attributeId) return row;
              const values = [...(row.values ?? [])];
              const index = values.findIndex((item) => Number(item.id) === Number(value.id));
              const stored: CategoryAttributeValue = {
                id: value.id,
                name:
                  value.name && typeof value.name === 'object'
                    ? { ar: value.name.ar ?? '', en: value.name.en ?? '' }
                    : String(value.name ?? ''),
                color_id: value.color_id,
                hex: value.hex,
              };
              if (index === -1) values.push(stored);
              else values[index] = { ...values[index], ...stored };
              return { ...row, values };
            }),
          },
        };
      }
    );
  };

  return (
    <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {attributes.map((attr) => {
        const selectedId =
          selectedValueIdForAttribute(selectedIds, attr, variantAttributes) ?? 0;
        const isColor = isColorCategoryAttribute(attr);
        return (
          <AttributeSingleSelect
            key={attr.id}
            attr={attr}
            selectedId={selectedId}
            resetNonce={resetNonce}
            colorsHexLookup={colorsHexLookup}
            formatAttributeLabel={formatAttributeLabel}
            shadeBusy={shadeBusyId === attr.id}
            colorHint={isColor ? t?.('form.productColorSwatchHint') : undefined}
            onCommitShade={
              isColor
                ? async (hex) => {
                    const nextHex = normalizeCatalogHex(hex);
                    if (!nextHex) return;
                    const selectedNow = (attr.values ?? []).find((val) => Number(val.id) === selectedId);
                    if (linkedShadeHex(selectedNow, colorsHexLookup) === nextHex) return;
                    setShadeBusyId(attr.id);
                    try {
                      const selected = selectedNow;
                      const linked = await persistVariantShade({
                        attributeId: attr.id,
                        hex,
                        selectedValueId: selectedId > 0 ? selectedId : null,
                        selectedName: selected?.name,
                        catalog: colorItems ?? [],
                      });
                      const nextIds = replaceColorAttributeValueId(
                        selectedIds,
                        attributes,
                        attr,
                        linked.valueId
                      );
                      if (existingComboKeys && nextIds.length > 0) {
                        const key = sortedComboKey(nextIds);
                        if (existingComboKeys.has(key)) {
                          toast.error(t?.('form.variantAddDuplicateCombo') ?? '');
                          throw new Error('duplicate variant combination');
                        }
                      }
                      rememberShade(attr.id, {
                        id: linked.valueId,
                        name: linked.name,
                        color_id: linked.colorId,
                        hex: linked.hex,
                      });
                      onChange(nextIds);
                      void queryClient.invalidateQueries({ queryKey: ['color', 'list'] });
                      toast.success(t?.('form.productColorShadeSaved') ?? '');
                    } finally {
                      setShadeBusyId(null);
                    }
                  }
                : undefined
            }
            onChange={(valueId) => {
              const nextIds = replaceAttributeValueId(selectedIds, attr, valueId > 0 ? valueId : null);
              if (existingComboKeys && nextIds.length > 0) {
                const key = sortedComboKey(nextIds);
                if (existingComboKeys.has(key)) {
                  toast.error(t?.('form.variantAddDuplicateCombo') ?? '');
                  return;
                }
              }
              onChange(nextIds);
            }}
          />
        );
      })}
    </Box>
  );
}
