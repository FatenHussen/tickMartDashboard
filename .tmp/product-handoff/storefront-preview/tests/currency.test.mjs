import assert from "node:assert/strict";
import { test } from "node:test";
import {
    CURRENCY_DEFAULT_KEY,
    CURRENCY_PREFERENCE_KEY,
    getExplicitAccountCurrency,
    persistCurrencySelection,
    persistDefaultCurrency,
    readCurrencySelection,
    resetAccountCurrencySelection,
    resolveCurrencySelection,
} from "../src/shared/lib/currencyPreference.ts";

function createStorage(entries = []) {
    const values = new Map(entries);
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
    };
}

const usdDefault = { code: "USD", symbol: "$", source: "default" };
const sypUser = { code: "SYP", symbol: "ل.س", source: "user" };

test("the old forced Syrian default cannot override the dashboard default", () => {
    const storage = createStorage([
        ["currencyDefaultsVersion", "syp-default-v2"],
        ["currency", "SYP"],
        ["currencySymbol", "ل.س"],
    ]);
    assert.deepEqual(readCurrencySelection(storage), usdDefault);
    assert.deepEqual(resolveCurrencySelection(readCurrencySelection(storage), usdDefault), usdDefault);
});

test("visitors without a preference follow dashboard changes and cache the latest default", () => {
    const storage = createStorage();
    const eurDefault = { code: "EUR", symbol: "€", source: "default" };
    persistDefaultCurrency(storage, eurDefault);
    assert.deepEqual(readCurrencySelection(storage), eurDefault);
    const updated = resolveCurrencySelection(readCurrencySelection(storage), usdDefault);
    persistDefaultCurrency(storage, updated);
    persistCurrencySelection(storage, updated);
    assert.equal(storage.getItem(CURRENCY_PREFERENCE_KEY), null);
    assert.deepEqual(readCurrencySelection(storage), usdDefault);
});

test("a user's currency survives reload and wins over later default or account responses", () => {
    const storage = createStorage();
    persistCurrencySelection(storage, sypUser);
    const restored = readCurrencySelection(storage);
    assert.deepEqual(restored, sypUser);
    assert.deepEqual(resolveCurrencySelection(restored, usdDefault), sypUser);
    assert.deepEqual(resolveCurrencySelection(restored, {
        code: "EUR", symbol: "€", source: "account",
    }), sypUser);
    persistDefaultCurrency(storage, usdDefault);
    assert.deepEqual(readCurrencySelection(storage), sypUser);
});

test("a late default response cannot replace the saved account currency", () => {
    const account = { code: "EUR", symbol: "€", source: "account" };
    assert.deepEqual(resolveCurrencySelection(usdDefault, account), account);
    assert.deepEqual(resolveCurrencySelection(account, usdDefault), account);
    assert.deepEqual(resolveCurrencySelection(account, sypUser), sypUser);
});

test("logout or account switch drops the previous account currency and resumes dashboard defaults", () => {
    const oldAccount = { code: "EUR", symbol: "€", source: "account" };
    const loggedOut = resetAccountCurrencySelection(oldAccount, usdDefault);
    assert.deepEqual(loggedOut, usdDefault);
    const nextDefault = { code: "SAR", symbol: "ر.س", source: "default" };
    assert.deepEqual(resolveCurrencySelection(loggedOut, nextDefault), nextDefault);
    const nextAccount = { code: "SYP", symbol: "ل.س", source: "account" };
    assert.deepEqual(resolveCurrencySelection(loggedOut, nextAccount), nextAccount);
    assert.deepEqual(resetAccountCurrencySelection(sypUser, usdDefault), sypUser);
});

test("an inherited account currency cannot override the current dashboard default", () => {
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

test("malformed cache or denied storage still allows a safe default and currency switching", () => {
    const malformed = createStorage([[CURRENCY_DEFAULT_KEY, "{bad json"]]);
    assert.deepEqual(readCurrencySelection(malformed), usdDefault);
    const denied = {
        getItem() { throw new Error("Storage blocked"); },
        setItem() { throw new Error("Storage blocked"); },
        removeItem() { throw new Error("Storage blocked"); },
    };
    assert.deepEqual(readCurrencySelection(denied), usdDefault);
    assert.doesNotThrow(() => persistCurrencySelection(denied, sypUser));
    assert.doesNotThrow(() => persistDefaultCurrency(denied, usdDefault));
    assert.deepEqual(resolveCurrencySelection(usdDefault, sypUser), sypUser);
});
