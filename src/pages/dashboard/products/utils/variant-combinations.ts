import { formatTranslated } from '@/utils/format-translated';

/** Bilingual label on category attribute values. */
export type AttributeValueName = { ar?: string; en?: string } | string | null | undefined;

export type CategoryAttributeValueRef = {
  id: number;
  name?: AttributeValueName;
  hex?: string | null;
  color_hex?: string | null;
  color?: { hex?: string } | null;
};

export type ColorsHexLookup = {
  byId: Map<number, string>;
  byName: Map<string, string>;
};

function coerceHexString(v: unknown): string | null {
  if (v == null || typeof v !== 'string') return null;
  const s = v.trim();
  if (!/^#?[0-9A-Fa-f]{3,8}$/.test(s)) return null;
  return s.startsWith('#') ? s : `#${s}`;
}

/** Map admin Colors list rows to id / name lookups for attribute value swatches. */
export function buildColorsHexLookup(
  colors: Array<{ id: number; hex?: string; name?: string | { ar?: string; en?: string } }>
): ColorsHexLookup {
  const byId = new Map<number, string>();
  const byName = new Map<string, string>();

  for (const c of colors) {
    const hex = coerceHexString(c.hex);
    if (!hex) continue;
    byId.set(Number(c.id), hex);

    if (typeof c.name === 'string') {
      const key = c.name.trim().toLowerCase();
      if (key) byName.set(key, hex);
    } else if (c.name && typeof c.name === 'object') {
      for (const part of [c.name.en, c.name.ar]) {
        const key = String(part ?? '').trim().toLowerCase();
        if (key) byName.set(key, hex);
      }
    }
  }

  return { byId, byName };
}

/** Resolve CSS hex for a category attribute value (color type). */
export function resolveCategoryAttributeValueHex(
  value: CategoryAttributeValueRef,
  lookup?: ColorsHexLookup | null
): string | null {
  const direct =
    coerceHexString(value.hex) ??
    coerceHexString(value.color?.hex) ??
    coerceHexString(value.color_hex);
  if (direct) return direct;

  if (typeof value.name === 'string') {
    const fromName = coerceHexString(value.name);
    if (fromName) return fromName;
  }

  if (lookup && value.id != null) {
    const byId = lookup.byId.get(Number(value.id));
    if (byId) return byId;
  }

  if (lookup) {
    const label = attributeValueLabel(value.name).toLowerCase();
    if (label && lookup.byName.has(label)) return lookup.byName.get(label)!;

    if (value.name != null && typeof value.name === 'object') {
      for (const part of [value.name.en, value.name.ar]) {
        const key = String(part ?? '').trim().toLowerCase();
        if (key && lookup.byName.has(key)) return lookup.byName.get(key)!;
      }
    }
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

/** Readable English SKU from product base + attribute values (no Arabic). */
export function generateVariantSku(
  productSku: string | null | undefined,
  attributeValues: CategoryAttributeValueRef[],
  lookup?: ColorsHexLookup | null
): string {
  const base = sanitizeSkuBase(productSku);
  const parts = attributeValues.map((v) => attributeValueSkuPart(v, lookup)).filter(Boolean);
  return parts.length > 0 ? `${base}-${parts.join('-')}` : base;
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
