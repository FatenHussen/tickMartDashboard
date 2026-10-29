import type { ColorListItem } from '@/pages/dashboard/colors/types/color.types';
import type { CategoryAttributeValueRef } from '@/pages/dashboard/products/utils/variant-combinations';

import { _ColorApi } from '@/pages/dashboard/colors/api/color.services';
import { normalizeCatalogHex } from '@/pages/dashboard/colors/utils/catalog-hex';
import { _CategoryAttributeApi } from '@/pages/dashboard/categories/api/category-attribute.services';

export type LinkedVariantShade = {
  valueId: number;
  colorId: number;
  hex: string;
  name: { en: string; ar: string };
};

function bilingualName(name: unknown, fallback: string): { en: string; ar: string } {
  if (name && typeof name === 'object') {
    const record = name as { en?: unknown; ar?: unknown };
    const en = String(record.en ?? '').trim();
    const ar = String(record.ar ?? '').trim();
    const filled = en || ar || fallback;
    return { en: en || filled, ar: ar || filled };
  }
  const text = String(name ?? '').trim() || fallback;
  return { en: text, ar: text };
}

/** Catalog rows may return a string or `{ en, ar }`. Empty input is not a name. */
function colorDisplayName(name: unknown): { en: string; ar: string } | null {
  const named = bilingualName(name, '');
  return named.en ? named : null;
}

function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function readCreatedColorId(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const candidates = [record.data, record.color, record.item, record];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const id = positiveId((candidate as { id?: unknown }).id);
    if (id != null) return id;
  }
  return null;
}

function findColorByHex(colors: ColorListItem[], hex: string): ColorListItem | undefined {
  return colors.find((color) => normalizeCatalogHex(color.hex) === hex);
}

/**
 * Picking a shade on the product form stores it in `colors`, then links a
 * category-attribute value so the variant can send that value id.
 * An existing hex is reused. Existing attribute values are sent back with
 * their ids so the update does not replace them.
 */
export async function persistVariantShade(args: {
  attributeId: number;
  hex: string;
  selectedValueId?: number | null;
  selectedName?: unknown;
  catalog?: ColorListItem[];
}): Promise<LinkedVariantShade> {
  const hex = normalizeCatalogHex(args.hex);
  if (!hex) throw new Error('shade hex is missing');

  const detail = await _CategoryAttributeApi.getCategoryAttributeById(args.attributeId);
  const attribute = detail.data;
  if (!attribute) throw new Error('attribute is missing');
  const storedValues = Array.isArray(attribute.values) ? attribute.values : [];
  const selectedId = positiveId(args.selectedValueId);
  const selectedStored =
    selectedId != null
      ? storedValues.find((value) => positiveId(value.id) === selectedId)
      : undefined;

  const known =
    findColorByHex(args.catalog ?? [], hex) ??
    findColorByHex((await _ColorApi.getListColors({ hex, per_page: 20 })).data?.items ?? [], hex);

  let colorId = positiveId(known?.id);
  const colorName =
    colorDisplayName(known?.name) ??
    colorDisplayName(args.selectedName) ??
    bilingualName(hex, hex);

  if (colorId == null) {
    const created = await _ColorApi.createColor({
      name: colorName,
      hex,
      is_active: true,
    });
    colorId = readCreatedColorId(created);
  }
  if (colorId == null) throw new Error('color create response is missing id');

  // The current value stays. Only a missing id is replaced by the shade's value.
  if (selectedStored && positiveId(selectedStored.color_id) === colorId) {
    return {
      valueId: selectedId as number,
      colorId,
      hex,
      name: bilingualName(selectedStored.name, colorName.en),
    };
  }

  if (!selectedStored) {
    const linked = storedValues.find((value) => positiveId(value.color_id) === colorId);
    const linkedId = positiveId(linked?.id);
    if (linked && linkedId != null) {
      return {
        valueId: linkedId,
        colorId,
        hex,
        name: bilingualName(linked.name, colorName.en),
      };
    }
  }

  const rows = storedValues.map((value) => {
    const id = positiveId(value.id);
    const currentColorId = positiveId(value.color_id);
    return {
      ...(id != null ? { id } : {}),
      name: bilingualName(value.name, hex),
      ...(currentColorId != null ? { color_id: currentColorId } : {}),
    };
  });

  const selectedRow = selectedId != null ? rows.find((row) => row.id === selectedId) : undefined;
  if (selectedRow) {
    selectedRow.color_id = colorId;
  } else {
    rows.push({ name: colorName, color_id: colorId });
  }

  const categoryId = positiveId(attribute.category_id ?? attribute.root_category_id);
  if (categoryId == null) throw new Error('attribute category is missing');

  const saved = await _CategoryAttributeApi.updateCategoryAttribute(args.attributeId, {
    category_id: categoryId,
    type: attribute.type,
    name: bilingualName(attribute.name, 'Color'),
    values: rows,
  });

  const savedValues = (saved?.data?.values ?? []) as CategoryAttributeValueRef[];
  const match =
    savedValues.find((value) => positiveId(value.color_id) === colorId && positiveId(value.id) === selectedId) ??
    savedValues.find((value) => positiveId(value.color_id) === colorId && normalizeCatalogHex(value.hex) === hex) ??
    savedValues.find((value) => positiveId(value.color_id) === colorId);
  const valueId = positiveId(match?.id);
  if (valueId == null) throw new Error('attribute value id is missing after shade save');

  return {
    valueId,
    colorId,
    hex,
    name: bilingualName(match?.name, colorName.en),
  };
}
