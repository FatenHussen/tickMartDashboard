import { z } from 'zod';

import i18n from 'src/lib/i18n';

const t = (key: string) => i18n.t(key, { ns: 'validation' });

export const CurrencySchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, t('currency.codeLength')),
  name: z.object({
    en: z.string().trim().min(1, t('currency.nameEnRequired')),
    ar: z.string().trim().min(1, t('currency.nameArRequired')),
  }),
  symbol: z.string().trim().min(1, t('currency.symbolRequired')),
  exchange_rate: z.coerce.number().finite(t('currency.exchangeRateMin')).min(0.000001, t('currency.exchangeRateMin')),
  is_default: z.boolean(),
  is_active: z.boolean(),
}).refine((currency) => !currency.is_default || currency.is_active, {
  message: t('currency.defaultMustBeActive'),
  path: ['is_active'],
});

export type CurrencyFormValues = z.infer<typeof CurrencySchema>;
