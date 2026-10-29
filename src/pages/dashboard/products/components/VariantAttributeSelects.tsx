import type { TFunction } from 'i18next';

import { useMemo } from 'react';
import { toast } from 'react-toastify';
import { useActiveColorCatalog } from '@/pages/dashboard/colors/hooks/color';
import { isColorCategoryAttribute } from '@/pages/dashboard/categories/utils/color-attribute';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/shared/ui/select';

import { Box, Typography } from 'src/shared/ui';

import { VariantColorPalette } from './VariantColorPalette';
import { VariantFieldLabel, ColorAttributeOption } from './variant-field-ui';
import {
  sortedComboKey,
  attributeValueLabel,
  buildColorsHexLookup,
  attributePickerValues,
  replaceAttributeValueId,
  type VariantAttributeRow,
  selectedValueIdForAttribute,
  type CategoryAttributePickerRow,
  resolveCategoryAttributeValueHex,
} from '../utils/variant-combinations';

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
}: {
  attr: CategoryAttributePickerRow;
  selectedId: number;
  onChange: (valueId: number) => void;
  colorsHexLookup: ReturnType<typeof buildColorsHexLookup>;
  formatAttributeLabel: (name: unknown) => string;
  colorHint?: string;
  resetNonce?: number;
}) {
  const label = formatAttributeLabel(attr.name);
  const isColor = isColorCategoryAttribute(attr);
  const values = attributePickerValues(attr, colorsHexLookup, selectedId);

  if (isColor) {
    return (
      <Box className="min-w-0 space-y-1 sm:col-span-2 lg:col-span-3">
        <VariantFieldLabel>{label}</VariantFieldLabel>
        <VariantColorPalette attr={attr} selectedId={selectedId} onChange={onChange} />
        {colorHint ? (
          <Typography variant="caption" className="block text-muted-foreground">
            {colorHint}
          </Typography>
        ) : null}
      </Box>
    );
  }

  return (
    <Box className="min-w-0 space-y-1">
      <VariantFieldLabel>{label}</VariantFieldLabel>
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
            const valHex = isColor
              ? resolveCategoryAttributeValueHex(val, colorsHexLookup)
              : null;
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
      {isColor && colorHint ? (
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

  const colorsHexLookup = useMemo(
    () => buildColorsHexLookup(colorItems ?? []),
    [colorItems]
  );

  if (categoryAttributes.length === 0) return null;

  return (
    <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categoryAttributes.map((attr) => {
        const selectedId =
          selectedValueIdForAttribute(selectedIds, attr, variantAttributes) ?? 0;
        return (
          <AttributeSingleSelect
            key={attr.id}
            attr={attr}
            selectedId={selectedId}
            resetNonce={resetNonce}
            colorsHexLookup={colorsHexLookup}
            formatAttributeLabel={formatAttributeLabel}
            colorHint={
              isColorCategoryAttribute(attr) ? t?.('form.productColorSwatchHint') : undefined
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
