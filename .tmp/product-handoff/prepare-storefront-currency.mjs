import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = 'C:/Users/FATEN/Desktop/tikmool-website';
const targetRoot = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const edits = [
  {
    path: 'src/features/account/types/index.ts',
    old: 'export interface MyCurrencyData {\n id: number;\n code: string;\n name: string;\n symbol: string;\n exchange_rate: string;\n is_default: boolean;\n is_active: boolean;\n}',
    new: 'export interface MyCurrencyData {\n id: number;\n code: string;\n name: string;\n symbol: string;\n exchange_rate: string;\n is_default: boolean;\n is_active: boolean;\n /** Missing provenance from older APIs does not establish a saved preference. */\n preference_source?: "user" | "default" | null;\n}',
  },
  {
    path: 'src/shared/lib/currencyPreference.ts',
    old: '/** Account preferences only belong to the authenticated account that supplied them. */',
    new: '/** Only an active account currency explicitly saved by the customer has account precedence. */\nexport function getExplicitAccountCurrency(\n    currency: (CurrencyValue & { preference_source?: string | null; is_active?: boolean }) | null | undefined,\n): CurrencyValue | null {\n    if (currency?.preference_source !== "user" || currency.is_active !== true) return null;\n    return { code: currency.code, symbol: currency.symbol };\n}\n\n/** Account preferences only belong to the authenticated account that supplied them. */',
  },
  {
    path: 'src/features/account/components/CurrencyFromApiSync.tsx',
    old: 'import { useAuthStore } from "@/store/auth";\n',
    new: 'import { useAuthStore } from "@/store/auth";\nimport { getExplicitAccountCurrency } from "@/shared/lib/currencyPreference";\n',
  },
  {
    path: 'src/features/account/components/CurrencyFromApiSync.tsx',
    old: '        if (authenticated && myCurrency) {\n            setCurrency(myCurrency.code, myCurrency.symbol, { fromAccount: true });\n        }\n    }, [authenticated, userId, myCurrency, setCurrency]);',
    new: '        if (authenticated && myCurrency) {\n            const preference = getExplicitAccountCurrency(myCurrency);\n            if (preference) {\n                setCurrency(preference.code, preference.symbol, { fromAccount: true });\n            } else {\n                // An inherited default must also clear a previously applied account choice.\n                resetAccountCurrency();\n            }\n        }\n    }, [authenticated, userId, myCurrency, setCurrency, resetAccountCurrency]);',
  },
  {
    path: 'tests/currency.test.mjs',
    old: '    CURRENCY_PREFERENCE_KEY,\n',
    new: '    CURRENCY_PREFERENCE_KEY,\n    getExplicitAccountCurrency,\n',
  },
  {
    path: 'tests/currency.test.mjs',
    old: 'test("malformed cache or denied storage still allows a safe default and currency switching", () => {',
    new: `test("an inherited account currency cannot override the current dashboard default", () => {
    const inherited = { code: "SYP", symbol: "ل.س", is_active: true, preference_source: "default" };
    assert.equal(getExplicitAccountCurrency(inherited), null);
    assert.deepEqual(resetAccountCurrencySelection(usdDefault, usdDefault), usdDefault);
});

test("only an active explicit account choice receives account precedence", () => {
    const saved = { code: "EUR", symbol: "€", is_active: true, preference_source: "user" };
    const preference = getExplicitAccountCurrency(saved);
    assert.deepEqual(preference, { code: "EUR", symbol: "€" });
    const account = { ...preference, source: "account" };
    assert.deepEqual(resolveCurrencySelection(usdDefault, account), account);
    assert.deepEqual(resolveCurrencySelection(account, usdDefault), account);
    assert.deepEqual(resolveCurrencySelection(sypUser, account), sypUser);
});

test("legacy unknown and inactive account responses do not establish an explicit preference", () => {
    const legacy = { code: "SYP", symbol: "ل.س", is_active: true };
    for (const response of [
        undefined,
        null,
        legacy,
        { ...legacy, preference_source: null },
        { ...legacy, preference_source: "unknown" },
        { ...legacy, preference_source: "user", is_active: false },
        { code: "SYP", symbol: "ل.س", preference_source: "user" },
    ]) assert.equal(getExplicitAccountCurrency(response), null);
});

test("a default-origin response clears prior account precedence and follows later dashboard changes", () => {
    const previousAccount = { code: "EUR", symbol: "€", source: "account" };
    const inherited = { code: "SYP", symbol: "ل.س", is_active: true, preference_source: "default" };
    assert.equal(getExplicitAccountCurrency(inherited), null);
    const resumedDefault = resetAccountCurrencySelection(previousAccount, usdDefault);
    assert.deepEqual(resumedDefault, usdDefault);
    const nextDefault = { code: "SAR", symbol: "ر.س", source: "default" };
    assert.deepEqual(resolveCurrencySelection(resumedDefault, nextDefault), nextDefault);
});

test("clearing inherited account state preserves explicit browser choices across reload", () => {
    const storage = createStorage();
    persistCurrencySelection(storage, sypUser);
    const restored = readCurrencySelection(storage);
    const inherited = { code: "USD", symbol: "$", is_active: true, preference_source: "default" };
    assert.equal(getExplicitAccountCurrency(inherited), null);
    const selection = resetAccountCurrencySelection(restored, usdDefault);
    assert.deepEqual(selection, sypUser);
    persistCurrencySelection(storage, selection);
    assert.deepEqual(readCurrencySelection(storage), sypUser);
});

test("malformed cache or denied storage still allows a safe default and currency switching", () => {`,
  },
];

fs.mkdirSync(targetRoot, { recursive: true });
fs.writeFileSync(path.join(targetRoot, 'storefront-currency-edits.json'), JSON.stringify({ sourceRoot, edits }, null, 2) + '\n');
const originals = new Map();
const staged = new Map();
for (const edit of edits) {
  const original = originals.get(edit.path) ?? fs.readFileSync(path.join(sourceRoot, edit.path), 'utf8').replace(/\r\n/g, '\n');
  originals.set(edit.path, original);
  const current = staged.get(edit.path) ?? original;
  if (current.split(edit.old).length !== 2) throw new Error('Expected exactly one occurrence in ' + edit.path);
  staged.set(edit.path, current.replace(edit.old, edit.new));
}
for (const [relativePath, content] of staged) {
  const destination = path.join(targetRoot, 'storefront-preview', relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
}
console.log(JSON.stringify({ spec: path.join(targetRoot, 'storefront-currency-edits.json'), changedFiles: [...staged.keys()], siblingWrites: 0 }));
