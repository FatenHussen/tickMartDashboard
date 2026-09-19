import type { TFunction } from 'i18next';

import React from 'react';
import { toast } from 'react-toastify';
import { queryKeys } from '@/api/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { Iconify } from '@/shared/components/iconify';
import { _ColorApi } from '@/pages/dashboard/colors/api/color.services';

import { Box, Button, Typography } from 'src/shared/ui';

import { AttributeSingleSelect } from './VariantAttributeSelects';
import {
  sortedComboKey,
  generateVariantSku,
  buildColorsHexLookup,
  resolveAttributeValuesByIds,
  type CategoryAttributePickerRow,
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

type Props = {
  categoryAttributes: CategoryAttributePickerRow[];
  productSku: string;
  existingComboKeys: Set<string>;
  onAdd: (row: GeneratedVariantRow) => void;
  t: TFunction;
  formatAttributeLabel: (name: unknown) => string;
};

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
