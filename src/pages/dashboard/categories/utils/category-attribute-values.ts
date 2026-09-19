import type { CategoryAttributeValue } from '@/pages/dashboard/categories/types/category-attribute.types';

export type CategoryAttributeValueFormRow = {
  id?: number;
  name: {
    en: string;
    ar: string;
  };
};

export type CategoryAttributeValuePayloadRow = {
  id?: number;
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
  val: Pick<CategoryAttributeValue, 'id' | 'name'>
): CategoryAttributeValueFormRow {
  const id = parseCategoryAttributeValueId(val.id);
  const name =
    typeof val.name === 'string'
      ? { en: val.name, ar: val.name }
      : { en: val.name?.en ?? '', ar: val.name?.ar ?? '' };

  return id != null ? { id, name } : { name };
}

/**
 * Existing rows keep `id` so PUT updates the same DB row (products stay linked).
 * New rows omit `id` so the backend inserts a new value.
 */
export function toCategoryAttributeValuePayload(
  row: CategoryAttributeValueFormRow
): CategoryAttributeValuePayloadRow {
  const id = parseCategoryAttributeValueId(row.id);
  return {
    ...(id != null ? { id } : {}),
    name: {
      en: row.name.en,
      ar: row.name.ar,
    },
  };
}
