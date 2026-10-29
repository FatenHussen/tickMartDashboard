import { formatTranslated } from '@/utils/format-translated';
import { normalizeCatalogHex } from '@/pages/dashboard/colors/utils/catalog-hex';
import { isColorCategoryAttribute } from '@/pages/dashboard/categories/utils/color-attribute';

/** Bilingual label on category attribute values. */
export type AttributeValueName = { ar?: string; en?: string } | string | null | undefined;

export type CategoryAttributeValueRef = {
  id: number;
  name?: AttributeValueName;
  /** `colors.id` — not this value's id. */
  color_id?: number | null;
  hex?: string | null;
  color_hex?: string | null;
  color?: { hex?: string } | null;
};

export type ColorsHexLookup = {
  byId: Map<number, string>;
};

/** Map `colors.id` → `#RRGGBB`. Names are not a swatch source. */
export function buildColorsHexLookup(
  colors: Array<{ id: number; hex?: string | null }>
): ColorsHexLookup {
  const byId = new Map<number, string>();

  for (const color of colors) {
    const hex = normalizeCatalogHex(color.hex);
    const id = Number(color.id);
    if (!hex || !Number.isInteger(id) || id <= 0) continue;
    byId.set(id, hex);
  }

  return { byId };
}

/**
 * Swatch hex comes from the linked `colors` row (`hex` or `color_id`).
 * The value name is display text — "2" does not paint a circle.
 */
export function resolveCategoryAttributeValueHex(
  value: CategoryAttributeValueRef,
  lookup?: ColorsHexLookup | null
): string | null {
  const direct =
    normalizeCatalogHex(value.hex) ??
    normalizeCatalogHex(value.color?.hex) ??
    normalizeCatalogHex(value.color_hex);
  if (direct) return direct;

  const colorId = Number(value.color_id);
  if (lookup && Number.isInteger(colorId) && colorId > 0) {
    return lookup.byId.get(colorId) ?? null;
  }

  return null;
}

export type VariantCombinationSelection = {
  categoryAttributeId: number;
  valueIds: number[];
};

export type VariantSelectionMode = 'single' | 'multi';

/**
 * Expand attribute selections into one `attributes_values_ids` array per variant row.
 * Cartesian product of all selected values (size multi expands rows; color stays single in UI).
 */
export function expandVariantCombinations(
  selections: VariantCombinationSelection[],
  _mode: VariantSelectionMode = 'multi'
): number[][] {
  const withValues = selections.filter((s) => s.valueIds?.length > 0);
  if (withValues.length === 0) return [];

  return withValues.reduce<number[][]>(
    (acc, { valueIds }) => {
      if (acc.length === 0) return valueIds.map((id) => [id]);
      const next: number[][] = [];
      for (const combo of acc) {
        for (const id of valueIds) {
          next.push([...combo, id]);
        }
      }
      return next;
    },
    []
  );
}

/** Dashboard spec §17: every category attribute uses single-select in the variant add form. */
export function isAttributeMultiSelect(_attr?: { type?: string | null } | null): boolean {
  return false;
}

/** UI display — respects active locale (ar/en); SKU uses {@link attributeValueEnglishLabel}. */
export function attributeValueLabel(name: AttributeValueName): string {
  if (name == null) return '';
  if (typeof name === 'object') return formatTranslated(name, '').trim();
  return String(name).trim();
}

/** Display uses ar/en; SKU must be ASCII-only (spec §6). */
export function attributeValueEnglishLabel(name: AttributeValueName): string {
  if (name == null) return '';
  if (typeof name === 'object') return String(name.en ?? '').trim();
  const s = String(name).trim();
  return s.length > 0 && [...s].every((ch) => ch.charCodeAt(0) <= 0x7f) ? s : '';
}

function sanitizeSkuBase(productSku: string | null | undefined): string {
  const cleaned = String(productSku ?? 'VAR')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toUpperCase();
  return cleaned || 'VAR';
}

/** Variant SKU: English letters, digits, and hyphen only — strip Arabic and other scripts. */
export function sanitizeEnglishSkuInput(raw: string): string {
  return String(raw ?? '').replace(/[^a-zA-Z0-9-]/g, '');
}

/** Spec §6: `{productSku}-{6 random A–Z/2–9}` — no Arabic. */
export function generateRandomVariantSku(productSku?: string | null): string {
  const base = sanitizeSkuBase(productSku);
  return `${base}-${randomVariantSkuSuffix(6)}`;
}

function attributeValueSkuPart(
  value: CategoryAttributeValueRef,
  lookup?: ColorsHexLookup | null
): string {
  const en = attributeValueEnglishLabel(value.name);
  if (en) {
    const slug = en.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    if (slug) return slug.slice(0, 12);
  }

  const hex = resolveCategoryAttributeValueHex(value, lookup)?.replace('#', '').toUpperCase();
  if (hex) return hex.slice(0, 8);

  return String(value.id);
}

export function randomVariantSkuSuffix(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Readable English SKU from product base + `name.en` (or a random suffix — never `name.ar`). */
export function generateVariantSku(
  productSku: string | null | undefined,
  attributeValues: CategoryAttributeValueRef[],
  lookup?: ColorsHexLookup | null
): string {
  const base = sanitizeSkuBase(productSku);
  const parts = attributeValues
    .map((v) => attributeValueSkuPart(v, lookup))
    .filter((part) => part && !/^\d+$/.test(part));
  if (parts.length > 0) return `${base}-${parts.join('-')}`;
  return `${base}-${randomVariantSkuSuffix(6)}`;
}

/** Explicit regenerate (refresh button) — always returns a new SKU (random suffix). */
export function regenerateVariantSku(
  productSku: string | null | undefined,
  attributeValues: CategoryAttributeValueRef[],
  lookup?: ColorsHexLookup | null
): string {
  const base = sanitizeSkuBase(productSku);
  const parts = attributeValues.map((v) => attributeValueSkuPart(v, lookup)).filter(Boolean);
  const suffix = randomVariantSkuSuffix(6);
  if (parts.length > 0) return `${base}-${parts.join('-')}-${suffix}`;
  return `${base}-${suffix}`;
}

/** Unique 13-digit barcode for a variant row (EAN-13 check digit). */
export function generateVariantBarcode(
  productSku: string | null | undefined,
  variantIndex: number
): string {
  const fromSku = String(productSku ?? '').replace(/\D/g, '');
  const raw = `${Date.now()}${variantIndex}${fromSku}629110000000`.replace(/\D/g, '');
  const body = raw.slice(0, 12).padStart(12, '0');
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const n = Number(body[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${body}${check}`;
}

export function priceAfterDiscount(
  price: number | null | undefined,
  discountType: string | null | undefined,
  discount: number | null | undefined
): number {
  const p = Number(price) || 0;
  const d = Number(discount) || 0;
  if (!p || !discountType || discountType === 'none' || d <= 0) return p;
  if (discountType === 'percentage') return Math.round((p - p * (d / 100)) * 100) / 100;
  if (discountType === 'fixed') return Math.max(0, Math.round((p - d) * 100) / 100);
  return p;
}

/** Amount subtracted from the list price (read-only preview). */
export function discountAmount(
  price: number | null | undefined,
  discountType: string | null | undefined,
  discount: number | null | undefined
): number {
  const p = Number(price) || 0;
  const after = priceAfterDiscount(p, discountType, discount);
  return Math.round(Math.max(0, p - after) * 100) / 100;
}

export function sortedComboKey(valueIds: number[]): string {
  return [...valueIds].sort((a, b) => a - b).join('-');
}

export function resolveAttributeValuesByIds(
  categoryAttributes: Array<{
    id?: number;
    values?: CategoryAttributeValueRef[];
  }>,
  valueIds: number[]
): CategoryAttributeValueRef[] {
  const byId = new Map<number, CategoryAttributeValueRef>();
  for (const attr of categoryAttributes) {
    for (const val of attr.values ?? []) {
      if (val?.id != null) byId.set(Number(val.id), val);
    }
  }
  return valueIds.map((id) => byId.get(id)).filter((v): v is CategoryAttributeValueRef => v != null);
}

/** One category attribute + its values — bind selects by these IDs, never by name. */
export type CategoryAttributePickerRow = {
  id: number;
  name?: { ar?: string; en?: string } | string;
  type?: string;
  values?: CategoryAttributeValueRef[];
};

export function toCategoryAttributePickerRows(raw: unknown): CategoryAttributePickerRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: CategoryAttributePickerRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as {
      id?: unknown;
      name?: CategoryAttributePickerRow['name'];
      type?: string;
      values?: CategoryAttributeValueRef[];
    };
    const id = Number(rec.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    const values = (Array.isArray(rec.values) ? rec.values : [])
      .map((val) => {
        const colorId = parsePositiveId(val?.color_id);
        const hex = resolveCategoryAttributeValueHex(val);
        return {
          ...val,
          id: Number(val?.id),
          ...(colorId != null ? { color_id: colorId } : {}),
          hex,
        };
      })
      .filter((val) => Number.isInteger(val.id) && val.id > 0);
    rows.push({
      id,
      name: rec.name,
      type: rec.type,
      values,
    });
  }
  return rows;
}

/**
 * Always one select per GET `attributes[]` row (color + size).
 * If `/category-attributes` omitted a row, synthesize it from the product payload.
 */
export function ensureCategoryAttributesFromVariants(
  rows: CategoryAttributePickerRow[],
  variants: Array<{
    attributes?: Array<{
      id?: number;
      value_id?: number;
      value?: string;
      attribute?: string;
      type?: string;
      hex?: string | null;
      color_id?: number | null;
      category_attribute_id?: number;
    }>;
  }>
): CategoryAttributePickerRow[] {
  const byId = new Map<number, CategoryAttributePickerRow>();
  for (const row of rows) {
    byId.set(row.id, { ...row, values: [...(row.values ?? [])] });
  }

  for (const variant of variants) {
    for (const attr of variant.attributes ?? []) {
      const attributeId = parsePositiveId(attr.category_attribute_id);
      if (attributeId == null) continue;
      const existing = byId.get(attributeId);
      const valueId = parsePositiveId(attr.id ?? attr.value_id);
      const nextValues = [...(existing?.values ?? [])];
      const hex = normalizeCatalogHex(attr.hex);
      const colorId = parsePositiveId(attr.color_id);
      if (valueId != null) {
        const index = nextValues.findIndex((val) => Number(val.id) === valueId);
        if (index === -1) {
          nextValues.push({
            id: valueId,
            name: attr.value,
            ...(hex ? { hex } : {}),
            ...(colorId != null ? { color_id: colorId } : {}),
          });
        } else {
          const current = nextValues[index];
          nextValues[index] = {
            ...current,
            hex: resolveCategoryAttributeValueHex(current) ?? hex,
            color_id: parsePositiveId(current.color_id) ?? colorId ?? current.color_id,
          };
        }
      }
      byId.set(attributeId, {
        id: attributeId,
        name: existing?.name ?? attr.attribute,
        type: existing?.type ?? attr.type,
        values: nextValues,
      });
    }
  }

  return [...byId.values()];
}

export type VariantAttributeRow = {
  id?: number;
  value_id?: number;
  category_attribute_id?: number;
};

function parsePositiveId(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Color lists show only values linked to a `colors` row with a valid hex.
 * The current selection stays visible so a re-save does not drop text such as "2".
 */
export function attributePickerValues(
  attribute: CategoryAttributePickerRow,
  lookup: ColorsHexLookup | null | undefined,
  selectedId: number
): CategoryAttributeValueRef[] {
  const values = Array.isArray(attribute.values) ? attribute.values : [];
  if (!isColorCategoryAttribute(attribute)) return values;
  return values.filter((value) => {
    if (selectedId > 0 && Number(value.id) === selectedId) return true;
    return resolveCategoryAttributeValueHex(value, lookup) != null;
  });
}

/** True when a variant still points at a color value with no `hex`. Product save rejects that. */
export function variantPointsAtUncoloredShade(
  categoryAttributes: CategoryAttributePickerRow[],
  valueIds: number[]
): boolean {
  for (const attribute of categoryAttributes) {
    if (!isColorCategoryAttribute(attribute)) continue;
    const selected = selectedValueIdForAttribute(valueIds, attribute);
    if (selected == null) continue;
    const value = (attribute.values ?? []).find((row) => Number(row.id) === selected);
    if (resolveCategoryAttributeValueHex(value ?? { id: selected }) == null) return true;
  }
  return false;
}

/** Selected value for this attribute from `attributes_values_ids` ∩ `values[].id`. */
export function selectedValueIdForAttribute(
  selectedIds: number[],
  attribute: CategoryAttributePickerRow,
  _variantAttributes?: VariantAttributeRow[] | null
): number | null {
  const valueIds = new Set(
    (attribute.values ?? []).map((val) => parsePositiveId(val.id)).filter((id): id is number => id != null)
  );
  return selectedIds.map(parsePositiveId).find((id) => id != null && valueIds.has(id)) ?? null;
}

/** Same as {@link selectedValueIdForAttribute}, then GET `attributes[]` by `category_attribute_id`. */
export function resolveAttributeValueId(
  selectedIds: number[],
  attribute: CategoryAttributePickerRow,
  variantAttributes?: VariantAttributeRow[] | null
): number | null {
  const fromSelected = selectedValueIdForAttribute(selectedIds, attribute);
  if (fromSelected != null) return fromSelected;

  const attributeId = parsePositiveId(attribute.id);
  if (attributeId == null || !Array.isArray(variantAttributes)) return null;
  const row = variantAttributes.find(
    (item) => parsePositiveId(item.category_attribute_id) === attributeId
  );
  return parsePositiveId(row?.id ?? row?.value_id);
}

/** Fill empty attribute slots from GET — never drop size when the form only has color. */
export function mergeVariantAttributeValueIds(
  formIds: number[],
  apiIds: number[],
  categoryAttributes: CategoryAttributePickerRow[],
  variantAttributes?: VariantAttributeRow[] | null
): number[] {
  const form = formIds.map(parsePositiveId).filter((id): id is number => id != null);
  const api = apiIds.map(parsePositiveId).filter((id): id is number => id != null);

  if (categoryAttributes.length === 0) {
    return [...new Set([...form, ...api])];
  }

  const result: number[] = [];
  const seen = new Set<number>();
  const push = (id: number | null) => {
    if (id == null || seen.has(id)) return;
    seen.add(id);
    result.push(id);
  };

  for (const attr of categoryAttributes) {
    const current = selectedValueIdForAttribute(form, attr);
    if (current != null) {
      push(current);
      continue;
    }
    push(resolveAttributeValueId(api, attr, variantAttributes));
  }

  for (const id of form) push(id);
  return result;
}

/** Replace this attribute's value in `attributes_values_ids` — other attributes stay put. */
export function replaceAttributeValueId(
  selectedIds: number[],
  attribute: CategoryAttributePickerRow,
  nextValueId: number | null
): number[] {
  const valueIds = new Set(
    (attribute.values ?? []).map((val) => parsePositiveId(val.id)).filter((id): id is number => id != null)
  );
  const kept = selectedIds
    .map(parsePositiveId)
    .filter((id): id is number => id != null && !valueIds.has(id));
  const next = parsePositiveId(nextValueId);
  if (next != null) kept.push(next);
  return [...new Set(kept)];
}
