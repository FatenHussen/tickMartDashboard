import { z as zod } from 'zod';

import i18n from 'src/lib/i18n';

const t = (key: string) => i18n.t(key, { ns: 'validation' });

// ----------------------------------------------------------------------

export const CategoryAttributeSchema = zod.object({
  category_id: zod.number().min(1, { message: t('categoryAttribute.categoryRequired') }),
  name: zod.object({
    en: zod.string().min(1, { message: t('categoryAttribute.nameEnRequired') }),
    ar: zod.string().min(1, { message: t('categoryAttribute.nameArRequired') }),
  }),
  type: zod.string().min(1, { message: t('categoryAttribute.typeRequired') }),
  values: zod.array(
    zod.object({
      id: zod.number().int().positive().optional(),
      name: zod.object({
        en: zod.string().min(1, { message: t('categoryAttribute.valueNameEnRequired') }),
        ar: zod.string().min(1, { message: t('categoryAttribute.valueNameArRequired') }),
      }),
    })
  ),
}).superRefine((data, ctx) => {
  if (data.type !== 'color' && data.values.length < 1) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      path: ['values'],
      message: t('categoryAttribute.atLeastOneValue'),
    });
  }
});

export type CategoryAttributeFormValues = zod.infer<typeof CategoryAttributeSchema>;
