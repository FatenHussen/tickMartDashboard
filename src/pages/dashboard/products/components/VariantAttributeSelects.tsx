import type { TFunction } from 'i18next';

import React from 'react';
import { toast } from 'react-toastify';
import { queryKeys } from '@/api/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { _ColorApi } from '@/pages/dashboard/colors/api/color.services';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/shared/ui/select';

import { Box } from 'src/shared/ui';

import { VariantFieldLabel, ColorAttributeOption } from './variant-field-ui';
import {
  sortedComboKey,
  attributeValueLabel,
  buildColorsHexLookup,
  replaceAttributeValueId,
  selectedValueIdForAttribute,
  resolveCategoryAttributeValueHex,
  type CategoryAttributePickerRow,
  type VariantAttributeRow,
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
  resetNonce = 0,
}: {
  attr: CategoryAttributePickerRow;
  selectedId: number;
  onChange: (valueId: number) => void;
  colorsHexLookup: ReturnType<typeof buildColorsHexLookup>;
  formatAttributeLabel: (name: unknown) => string;
  resetNonce?: number;
}) {
  const values = Array.isArray(attr.values) ? attr.values : [];
  const label = formatAttributeLabel(attr.name);
  const isColor = String(attr.type ?? '').toLowerCase() === 'color';

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
                {isColor ? (
                  <ColorAttributeOption hex={valHex} label={valLabel} />
                ) : (
                  valLabel
                )}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
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
  const { data: colorsResp } = useQuery({
    queryKey: queryKeys.color.list({ per_page: 500, is_active: true, picker: 'variant-attribute-selects' }),
    queryFn: () => _ColorApi.getListColors({ page: 1, per_page: 500, is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const colorsHexLookup = React.useMemo(
    () => buildColorsHexLookup(colorsResp?.data?.items ?? []),
    [colorsResp?.data?.items]
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
