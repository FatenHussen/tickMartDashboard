export interface CurrencyValue {
    code: string;
    symbol: string;
}

export interface CurrencySelection extends CurrencyValue {
    source: "default" | "account" | "user";
}

export const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    SYP: "ل.س",
    AED: "د.إ",
    SAR: "ر.س",
    EGP: "ج.م",
};

export const FALLBACK_CURRENCY: CurrencyValue = { code: "USD", symbol: "$" };
export const CURRENCY_PREFERENCE_KEY = "currencyPreference";
export const CURRENCY_DEFAULT_KEY = "storefrontDefaultCurrency";

type CurrencyStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readCurrencySelection(storage?: Pick<Storage, "getItem">): CurrencySelection {
    try {
        // Older clients also saved automatic defaults as `currency`. Only a
        // deliberate choice may override the dashboard default after reload.
        if (storage?.getItem(CURRENCY_PREFERENCE_KEY) === "user") {
            const code = storage.getItem("currency");
            if (code) {
                return {
                    code,
                    symbol: storage.getItem("currencySymbol") || currencySymbols[code] || code,
                    source: "user",
                };
            }
        }
    } catch {
        // Browsers may deny storage access; currency switching still works.
    }
    return { ...readDefaultCurrency(storage), source: "default" };
}

export function readDefaultCurrency(storage?: Pick<Storage, "getItem">): CurrencyValue {
    try {
        const cachedDefault = storage?.getItem(CURRENCY_DEFAULT_KEY);
        if (cachedDefault) {
            const value: unknown = JSON.parse(cachedDefault);
            if (value && typeof value === "object" && "code" in value &&
                typeof value.code === "string" && value.code && "symbol" in value &&
                typeof value.symbol === "string") {
                return { code: value.code, symbol: value.symbol };
            }
        }
    } catch {
        // Ignore malformed or unavailable cached defaults.
    }
    return FALLBACK_CURRENCY;
}

export function resolveCurrencySelection(
    current: CurrencySelection,
    incoming: CurrencySelection,
): CurrencySelection {
    if (incoming.source !== "user" && current.source === "user") return current;
    if (incoming.source === "default" && current.source === "account") return current;
    if (current.code === incoming.code && current.symbol === incoming.symbol &&
        current.source === incoming.source) return current;
    return incoming;
}

/** Only an active account currency explicitly saved by the customer has account precedence. */
export function getExplicitAccountCurrency(
    currency: (CurrencyValue & { preference_source?: string | null; is_active?: boolean }) | null | undefined,
): CurrencyValue | null {
    if (currency?.preference_source !== "user" || currency.is_active !== true) return null;
    return { code: currency.code, symbol: currency.symbol };
}

/** Account preferences only belong to the authenticated account that supplied them. */
export function resetAccountCurrencySelection(
    current: CurrencySelection,
    defaultCurrency: CurrencyValue,
): CurrencySelection {
    return current.source === "account" ? { ...defaultCurrency, source: "default" } : current;
}

export function persistCurrencySelection(storage: CurrencyStorage, selection: CurrencySelection) {
    try {
        storage.setItem("currency", selection.code);
        storage.setItem("currencySymbol", selection.symbol);
        if (selection.source === "user") storage.setItem(CURRENCY_PREFERENCE_KEY, "user");
        else storage.removeItem(CURRENCY_PREFERENCE_KEY);
    } catch {
        // Persistence is optional when storage is unavailable.
    }
}

export function persistDefaultCurrency(storage: CurrencyStorage, currency: CurrencyValue) {
    try {
        storage.setItem(CURRENCY_DEFAULT_KEY, JSON.stringify(currency));
    } catch {
        // The API default still applies for the current visit.
    }
}
