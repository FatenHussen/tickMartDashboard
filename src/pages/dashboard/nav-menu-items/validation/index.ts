import { z as zod } from 'zod';

import i18n from 'src/lib/i18n';

import { NAV_MENU_ITEM_TYPES, NAV_MENU_ROUTE_KEYS } from '../types';

// ----------------------------------------------------------------------

const t = (key: string, options?: Record<string, unknown>) =>
  i18n.t(key, { ns: 'validation', ...options });

/** Backend cap for the optional nav icon. */
const MAX_ICON_SIZE = 2 * 1024 * 1024;
const ALLOWED_ICON_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const titleShape = zod.object({
  en: zod
    .string()
    .trim()
    .min(1, { message: t('titleEnRequired') })
    .max(255),
  ar: zod
    .string()
    .trim()
    .min(1, { message: t('titleArRequired') })
    .max(255),
});

const iconShape = zod
  .custom<File | null>((v) => v == null || v instanceof File)
  .refine((v) => !(v instanceof File) || v.size <= MAX_ICON_SIZE, {
    message: t('imageMaxSize', { size: '2MB' }),
  })
  .refine((v) => !(v instanceof File) || ALLOWED_ICON_TYPES.includes(v.type), {
    message: t('imageFormat'),
  })
  .nullable()
  .optional();

/**
 * One row of `nav_menu_items`. Target ids stay strings because the selects are string-based;
 * they are coerced when the FormData payload is built.
 */
const baseShape = {
  title: titleShape,
  type: zod.enum(NAV_MENU_ITEM_TYPES, { message: t('typeRequired') }),
  route_key: zod.string().optional().default(''),
  category_id: zod.string().optional().default(''),
  brand_id: zod.string().optional().default(''),
  page_id: zod.string().optional().default(''),
  url: zod.string().optional().default(''),
  icon: iconShape,
  order: zod.coerce.number().min(0).optional(),
  is_active: zod.boolean().default(true),
  open_in_new_tab: zod.boolean().default(false),
};

/** `type` decides which single target field is mandatory. */
function refineTarget(
  values: {
    type: string;
    route_key?: string;
    category_id?: string;
    brand_id?: string;
    page_id?: string;
    url?: string;
  },
  ctx: zod.RefinementCtx
) {
  const requireField = (path: string, message: string) => {
    ctx.addIssue({ code: zod.ZodIssueCode.custom, path: [path], message });
  };

  switch (values.type) {
    case 'route':
      if (!values.route_key?.trim()) {
        requireField('route_key', t('navMenuItem.routeKeyRequired'));
      } else if (
        !(NAV_MENU_ROUTE_KEYS as readonly string[]).includes(values.route_key.trim()) &&
        !/^[a-z][a-z0-9_-]*$/.test(values.route_key.trim())
      ) {
        requireField('route_key', t('navMenuItem.routeKeyInvalid'));
      }
      break;
    case 'category':
      if (!values.category_id?.trim()) requireField('category_id', t('categoryRequired'));
      break;
    case 'brand':
      if (!values.brand_id?.trim()) requireField('brand_id', t('navMenuItem.brandRequired'));
      break;
    case 'page':
      if (!values.page_id?.trim()) requireField('page_id', t('pageSection.pageRequired'));
      break;
    case 'url': {
      const raw = values.url?.trim() ?? '';
      if (!raw) {
        requireField('url', t('navMenuItem.urlRequired'));
        break;
      }
      if (!/^https?:\/\/\S+$/i.test(raw)) requireField('url', t('navMenuItem.urlInvalid'));
      break;
    }
    default:
      break;
  }
}

export const NavMenuItemCreateSchema = zod
  .object(baseShape)
  .superRefine((values, ctx) => refineTarget(values, ctx));

/** Same rules on update — the icon is optional in both directions (keeps the stored one). */
export const NavMenuItemUpdateSchema = NavMenuItemCreateSchema;

export type NavMenuItemFormValues = Omit<zod.infer<typeof NavMenuItemCreateSchema>, 'icon'> & {
  icon: File | null;
};
