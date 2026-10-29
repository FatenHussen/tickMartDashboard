import { z as zod } from 'zod';
import { isColorCategoryAttribute } from '@/pages/dashboard/categories/utils/color-attribute';

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
      color_id: zod.number().int().positive().optional(),
      hex: zod.string().optional(),
      name: zod.object({
        en: zod.string().min(1, { message: t('categoryAttribute.valueNameEnRequired') }),
        ar: zod.string().min(1, { message: t('categoryAttribute.valueNameArRequired') }),
      }),
    })
  ),
}).superRefine((data, ctx) => {
  // Empty color values are valid: create links the full palette, and an
  // untouched edit omits `values`. color_id is checked at submit when rows are sent.
  if (isColorCategoryAttribute(data)) return;

  if (data.values.length < 1) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      path: ['values'],
      message: t('categoryAttribute.atLeastOneValue'),
    });
  }
});

export type CategoryAttributeFormValues = zod.infer<typeof CategoryAttributeSchema>;
