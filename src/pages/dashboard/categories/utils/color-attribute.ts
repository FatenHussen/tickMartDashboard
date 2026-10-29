/** Same labels the API treats as a color attribute, even when `type` is `square`. */
const COLOR_ATTRIBUTE_NAMES = new Set([
  'color',
  'colour',
  'اللون',
  'لون',
  'الالوان',
  'الألوان',
  'الوان',
  'ألوان',
]);

/** Color attribute: `type = color`, or a color name even when type is `square`. */
export function isColorCategoryAttribute(input: {
  type?: string | null;
  name?: { ar?: string; en?: string } | string | null;
}): boolean {
  if (String(input.type ?? '').trim().toLowerCase() === 'color') return true;

  const name = input.name;
  if (name == null) return false;
  if (typeof name === 'string') return isColorAttributeName(name);

  return isColorAttributeName(name.en) || isColorAttributeName(name.ar);
}

function isColorAttributeName(value: unknown): boolean {
  const text = String(value ?? '').trim().toLowerCase();
  return text !== '' && COLOR_ATTRIBUTE_NAMES.has(text);
}
