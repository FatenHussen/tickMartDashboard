/** Color attribute: `type = color`, or the name is Color / اللون even when type is `square`. */
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
  const text = String(value ?? '').trim();
  if (!text) return false;
  return text.toLowerCase() === 'color' || text === 'اللون';
}
