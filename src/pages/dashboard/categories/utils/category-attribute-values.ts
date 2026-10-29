import type { CategoryAttributeValue } from '@/pages/dashboard/categories/types/category-attribute.types';

import { normalizeCatalogHex } from '@/pages/dashboard/colors/utils/catalog-hex';

export type CategoryAttributeValueFormRow = {
  id?: number;
  /** `colors.id`. Omitted for non-color attributes. */
  color_id?: number;
  /** Saved shade, kept so an inactive color still shows a circle. Not sent. */
  hex?: string;
  name: {
    en: string;
    ar: string;
  };
};

export type CategoryAttributeValuePayloadRow = {
  id?: number;
  color_id?: number;
  name: {
    en: string;
    ar: string;
  };
};

/** Persistable value id from GET — never treat a name as the row key. */
export function parseCategoryAttributeValueId(id: unknown): number | undefined {
  if (id == null || id === '') return undefined;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export function toCategoryAttributeValueFormRow(
  val: Pick<CategoryAttributeValue, 'id' | 'name' | 'color_id' | 'hex'>
): CategoryAttributeValueFormRow {
  const id = parseCategoryAttributeValueId(val.id);
  const colorId = parseCategoryAttributeValueId(val.color_id);
  const hex = normalizeCatalogHex(val.hex) ?? undefined;
  const name =
    typeof val.name === 'string'
      ? { en: val.name, ar: val.name }
      : { en: val.name?.en ?? '', ar: val.name?.ar ?? '' };

  return {
    ...(id != null ? { id } : {}),
    ...(colorId != null ? { color_id: colorId } : {}),
    // A hex without color_id is only a display guess. The shade is the colors row.
    ...(colorId != null && hex ? { hex } : {}),
    name,
  };
}

/**
 * Existing rows keep `id` so PUT updates the same DB row (products stay linked).
 * New rows omit `id` so the backend inserts a new value.
 */
/** Stable key so an edit sends `values` only when a row actually changed. */
export function categoryAttributeValuesKey(
  rows: CategoryAttributeValueFormRow[],
  includeColorId: boolean
): string {
  return JSON.stringify(
    rows.map((row) => toCategoryAttributeValuePayload(row, { includeColorId }))
  );
}

export function toCategoryAttributeValuePayload(
  row: CategoryAttributeValueFormRow,
  options?: { includeColorId?: boolean }
): CategoryAttributeValuePayloadRow {
  const id = parseCategoryAttributeValueId(row.id);
  const colorId = parseCategoryAttributeValueId(row.color_id);
  return {
    ...(id != null ? { id } : {}),
    ...(options?.includeColorId && colorId != null ? { color_id: colorId } : {}),
    name: {
      en: row.name.en,
      ar: row.name.ar,
    },
  };
}
