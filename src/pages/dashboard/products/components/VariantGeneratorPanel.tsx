import type { TFunction } from 'i18next';

import React from 'react';
import { toast } from 'react-toastify';
import { queryKeys } from '@/api/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { Iconify } from '@/shared/components/iconify';
import { _ColorApi } from '@/pages/dashboard/colors/api/color.services';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/shared/ui/select';

import { Box, Button, Typography } from 'src/shared/ui';

import { VariantFieldLabel, ColorAttributeOption } from './variant-field-ui';
import {
  sortedComboKey,
  generateVariantSku,
  attributeValueLabel,
  buildColorsHexLookup,
  resolveAttributeValuesByIds,
  resolveCategoryAttributeValueHex,
} from '../utils/variant-combinations';

// ----------------------------------------------------------------------

export type GeneratedVariantRow = {
  attributes_values_ids: number[];
  sku: string;
  price?: number;
  price_syp?: number;
  quantity?: number;
  discount?: number;
  discount_type: 'none' | 'percentage' | 'fixed';
  images: [];
  existing_images_ids: [];
  existing_images: [];
  original_existing_images_ids: [];
  model: string;
  barcode: string;
  is_trend: 0;
  is_active: 1;
};

type CategoryAttributeRow = {
  id: number;
  name?: { ar?: string; en?: string } | string;
  type?: string;
  values?: Array<{
    id: number;
    name?: { ar?: string; en?: string } | string;
    hex?: string | null;
    color_hex?: string | null;
    color?: { hex?: string } | null;
  }>;
};

const selectTriggerCls =
  'h-10 w-full rounded-lg border border-border/45 bg-background px-3 text-sm shadow-none transition-colors hover:border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/15';

/** Radix Select cannot use an empty string; this marks an unset optional attribute. */
const ATTRIBUTE_NONE_VALUE = '__none__';

type Props = {
  categoryAttributes: CategoryAttributeRow[];
  productSku: string;
  existingComboKeys: Set<string>;
  onAdd: (row: GeneratedVariantRow) => void;
  t: TFunction;
  formatAttributeLabel: (name: unknown) => string;
};

function AttributeSingleSelect({
  attr,
  selectedId,
  onChange,
  colorsHexLookup,
  formatAttributeLabel,
  resetNonce,
}: {
  attr: CategoryAttributeRow;
  selectedId: number;
  onChange: (valueId: number) => void;
  colorsHexLookup: ReturnType<typeof buildColorsHexLookup>;
  formatAttributeLabel: (name: unknown) => string;
  /** Bumps after each successful add so Radix Select remounts with empty value. */
  resetNonce: number;
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

export function VariantGeneratorPanel({
  categoryAttributes,
  productSku,
  existingComboKeys,
  onAdd,
  t,
  formatAttributeLabel,
}: Props) {
  const [selections, setSelections] = React.useState<Record<number, number>>({});
  const [resetNonce, setResetNonce] = React.useState(0);

  const { data: colorsResp } = useQuery({
    queryKey: queryKeys.color.list({ per_page: 500, is_active: true, picker: 'variant-generator' }),
    queryFn: () => _ColorApi.getListColors({ page: 1, per_page: 500, is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const colorsHexLookup = React.useMemo(
    () => buildColorsHexLookup(colorsResp?.data?.items ?? []),
    [colorsResp?.data?.items]
  );

  const selectedCombo = React.useMemo(
    () =>
      categoryAttributes
        .map((attr) => Number(selections[Number(attr.id)]))
        .filter((id) => Number.isFinite(id) && id > 0),
    [categoryAttributes, selections]
  );

  const hasAnySelected = selectedCombo.length > 0;

  const selectedValueRefs = React.useMemo(
    () =>
      selectedCombo.length > 0
        ? resolveAttributeValuesByIds(categoryAttributes, selectedCombo)
        : [],
    [categoryAttributes, selectedCombo]
  );

  const resetSelections = React.useCallback(() => {
    setSelections({});
    setResetNonce((n) => n + 1);
  }, []);

  const handleAdd = () => {
    if (!hasAnySelected) {
      toast.error(t('form.variantAddSelectAllAttributes'));
      return;
    }

    const key = sortedComboKey(selectedCombo);
    if (existingComboKeys.has(key)) {
      toast.error(t('form.variantAddDuplicateCombo'));
      return;
    }

    onAdd({
      attributes_values_ids: selectedCombo,
      sku: generateVariantSku(productSku, selectedValueRefs, colorsHexLookup),
      discount_type: 'none',
      images: [],
      existing_images_ids: [],
      existing_images: [],
      original_existing_images_ids: [],
      model: '',
      barcode: '',
      is_trend: 0,
      is_active: 1,
    });
    resetSelections();
  };

  return (
    <Box className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <Box className="border-b border-border/40 bg-muted/15 px-5 py-3.5">
        <Typography variant="subtitle2" className="font-semibold text-foreground">
          {t('form.variantAddNewTitle')}
        </Typography>
      </Box>

      <Box className="space-y-5 p-5">
        <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryAttributes.map((attr) => (
            <AttributeSingleSelect
              key={`${attr.id}-${resetNonce}`}
              attr={attr}
              selectedId={selections[Number(attr.id)] ?? 0}
              onChange={(valueId) =>
                setSelections((prev) => {
                  const next = { ...prev };
                  const attrId = Number(attr.id);
                  if (valueId > 0) next[attrId] = valueId;
                  else delete next[attrId];
                  return next;
                })
              }
              colorsHexLookup={colorsHexLookup}
              formatAttributeLabel={formatAttributeLabel}
              resetNonce={resetNonce}
            />
          ))}
        </Box>

        <Box className="flex justify-end border-t border-border/25 pt-4">
          <Button
            type="button"
            variant="contained"
            size="medium"
            disabled={!hasAnySelected}
            onClick={handleAdd}
          >
            <Iconify icon="solar:add-circle-bold" width={18} className="me-1.5" />
            {t('form.variantAddNewTitle')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
