import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Iconify } from '@/shared/components/iconify';
import { MultiSelect } from '@/shared/ui/multi-select';
import { compressImage } from '@/utils/compress-image';
import { useMemo, useEffect, type ReactNode } from 'react';
import { formatTranslated } from '@/utils/format-translated';
import { MapPicker } from '@/shared/components/map/map-picker';
import { getApiErrorMessage } from '@/lib/get-api-error-message';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { _AreaApi } from '@/pages/dashboard/locations/api/area.services';
import { useFetchServices } from '@/pages/dashboard/vendor/hooks/service';
import { _VendorApi } from '@/pages/dashboard/vendor/api/vendor.services';
import { _CategoryApi } from '@/pages/dashboard/categories/api/category.services';
import {
  ShopSchema,
  type ShopFormValues,
} from '@/pages/dashboard/vendor/validation/shop.validation';
import {
  useCreateShop,
  useUpdateShop,
  useFetchShopById,
} from '@/pages/dashboard/vendor/hooks/shop';
import { CategoryHierarchyCheckboxTree } from '@/pages/dashboard/categories/components/category-hierarchy-checkbox-tree';
import {
  type ShopData,
  type DaySchedule,
  type WorkingHours,
  paymentMethodsFromShop,
  normalizeShopTypeFromApi,
  normalizeShopPriceLevelFromApi,
} from '@/pages/dashboard/vendor/types/shop.types';

import { CONFIG } from 'src/global-config';
import { Box, Input, Checkbox, Typography } from 'src/shared/ui';
import { RHFSelect } from 'src/shared/components/hook-form/rhf-select';
import { RHFTextField } from 'src/shared/components/hook-form/rhf-text-field';
import { StepperFormLayout } from 'src/shared/components/forms/stepper-form-layout';
import { RHFBadgeSelector } from 'src/shared/components/hook-form/rhf-badge-selector';
import { RHFInfiniteSelect } from 'src/shared/components/hook-form/rhf-infinite-select';

// ----------------------------------------------------------------------

const vendorFetcher = (page: number, limit: number) =>
  _VendorApi.getListVendor({ page, limit }).then((r) => ({
    data: {
      items: r.data.items.map((vendor) => ({ id: vendor.id, label: vendor.name })),
      pagination: r.data.pagination,
    },
  }));

// Areas API loads all at once — fake single-page pagination
const areaFetcherForShop = (_page: number, _limit: number) =>
  _AreaApi.getListAreas().then((r) => ({
    data: {
      items: r.data.items.map((area) => ({ id: area.id, label: area.name })),
      pagination: r.data.pagination,
    },
  }));

const SHOP_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

type ShopDayKey = (typeof SHOP_DAY_KEYS)[number];

function ShopStepCanvas({ children }: { children: ReactNode }) {
  return (
    <Box className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/95 via-card/90 to-primary/[0.045] shadow-[0_22px_64px_-28px_rgba(0,0,0,0.2)] ring-1 ring-primary/[0.07] dark:shadow-[0_26px_72px_-32px_rgba(0,0,0,0.5)]">
      <Box className="pointer-events-none absolute -right-16 -top-28 h-64 w-64 rounded-full bg-primary/[0.11] blur-3xl" />
      <Box className="pointer-events-none absolute -bottom-28 -left-12 h-52 w-52 rounded-full bg-primary/[0.05] blur-3xl" />
      <Box className="relative p-4 sm:p-6 md:p-8 lg:p-9">{children}</Box>
    </Box>
  );
}

const DEFAULT_WORKING_HOURS_TEMPLATE: ShopFormValues['working_hours'] = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { closed: true },
  saturday: { open: '10:00', close: '16:00' },
  sunday: { open: '10:00', close: '16:00' },
};

function parseOpenCloseRange(value: string): { open: string; close: string } | null {
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!m) return null;
  return { open: m[1], close: m[2] };
}

/** e.g. API `{ "sat-sun": "08:00-20:00" }` → saturday/sunday schedules */
const COMPACT_WORKING_HOUR_KEYS: Record<string, ShopDayKey[]> = {
  'sat-sun': ['saturday', 'sunday'],
  sat_sun: ['saturday', 'sunday'],
  'mon-fri': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  mon_fri: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
};

/** Maps API `working_hours` (per-day objects and/or compact string keys) into our per-day shape. */
function normalizeApiWorkingHoursForForm(raw: unknown): WorkingHours | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const out: Partial<Record<ShopDayKey, DaySchedule>> = {};

  for (const day of SHOP_DAY_KEYS) {
    const s = r[day];
    if (s != null && typeof s === 'object') {
      out[day] = s as DaySchedule;
    }
  }

  for (const [key, val] of Object.entries(r)) {
    if (SHOP_DAY_KEYS.includes(key as ShopDayKey)) continue;
    if (typeof val !== 'string') continue;
    const range = parseOpenCloseRange(val);
    if (!range) continue;
    const days = COMPACT_WORKING_HOUR_KEYS[key.toLowerCase()];
    if (!days) continue;
    for (const d of days) {
      if (out[d]) continue;
      out[d] = { open: range.open, close: range.close, closed: false };
    }
  }

  return Object.keys(out).length > 0 ? (out as WorkingHours) : undefined;
}

/** Merge API partial week with defaults so every day has a defined schedule (avoids broken edit UI). */
function mergeWorkingHours(
  api: WorkingHours | undefined,
  defaults: ShopFormValues['working_hours']
): ShopFormValues['working_hours'] {
  return SHOP_DAY_KEYS.reduce((acc, day) => {
    const s = api?.[day];
    const def = defaults[day];
    if (s && typeof s === 'object') {
      const c = s.closed;
      const closed =
        c === true ||
        c === 1 ||
        c === '1' ||
        String(c).toLowerCase() === 'true';
      acc[day] = closed
        ? { closed: true, open: undefined, close: undefined }
        : {
            closed: false,
            open: s.open ?? def?.open ?? '09:00',
            close: s.close ?? def?.close ?? '18:00',
          };
    } else {
      acc[day] = def ?? { open: '09:00', close: '18:00' };
    }
    return acc;
  }, {} as ShopFormValues['working_hours']);
}

/** Maps GET admin/shops/:id into full form state (used with RHF `values` so contact fields stay in sync when the step mounts). */
function buildShopFormValuesFromApi(shop: ShopData): ShopFormValues {
  const toBilingual = (val: unknown): { ar: string; en: string } => {
    if (val == null) return { ar: '', en: '' };
    if (typeof val === 'string') return { ar: val, en: val };
    if (Array.isArray(val)) {
      if (val.length === 0) return { ar: '', en: '' };
      return { ar: String(val[0] ?? ''), en: String(val[1] ?? '') };
    }
    if (val && typeof val === 'object' && ('ar' in val || 'en' in val)) {
      const o = val as { ar?: unknown; en?: unknown };
      return { ar: String(o.ar ?? ''), en: String(o.en ?? '') };
    }
    return { ar: '', en: '' };
  };

  const nameValue = toBilingual(shop.name);
  const descriptionValue = toBilingual(shop.description);
  const addressValue = toBilingual(shop.address);

  const rawServices = shop.services ?? shop.service_ids ?? [];
  const serviceIds = rawServices
    .map((s: { id?: number } | number) =>
      typeof s === 'object' && s?.id != null ? { id: Number(s.id) } : { id: Number(s) }
    )
    .filter((s) => Number.isFinite(s.id) && s.id > 0);

  const badgeRows = (shop.badges ?? []).filter(
    (b: { id?: number }) => b != null && typeof b.id === 'number' && Number.isFinite(b.id)
  );

  return {
    vendor_id: Number(shop.vendor_id ?? shop.vendor?.id ?? 0),
    logo: null,
    name: nameValue,
    description: descriptionValue,
    address: addressValue,
    lat: Number(shop.lat ?? shop.area?.lat ?? 0),
    lng: Number(shop.lng ?? shop.area?.lng ?? 0),
    phone: shop.phone != null && String(shop.phone).trim() !== '' ? String(shop.phone) : '',
    mobile: shop.mobile != null ? String(shop.mobile) : '',
    email: shop.email != null ? String(shop.email) : '',
    working_hours: mergeWorkingHours(
      normalizeApiWorkingHoursForForm(shop.working_hours),
      DEFAULT_WORKING_HOURS_TEMPLATE
    ),
    is_active: shop.is_active,
    area_id: Number(shop.area?.id ?? shop.area_id ?? 0),
    service_ids: serviceIds,
    badges: badgeRows.length
      ? badgeRows.map((b: any) => (typeof b === 'number' ? b : b.id))
      : [],
    shop_type: normalizeShopTypeFromApi(shop),
    payment_methods: paymentMethodsFromShop(shop),
    pricing_tier: normalizeShopPriceLevelFromApi(shop),
    is_recommended: Boolean(shop.is_recommended ?? shop.recommended),
    category_ids:
      shop.category_ids?.length
        ? shop.category_ids
        : shop.categories?.map((c) => c.id).filter((id) => Number.isFinite(id) && id > 0) ?? [],
  };
}

/** Field groups validated before advancing each step (aligned with `steps` order). */
const SHOP_STEP_VALIDATION_FIELDS: string[][] = [
  ['vendor_id', 'name', 'description', 'logo', 'badges'],
  ['address', 'lat', 'lng'],
  ['phone', 'mobile', 'email'],
  ['working_hours'],
  [
    'area_id',
    'service_ids',
    'category_ids',
    'is_active',
    'shop_type',
    'payment_methods',
    'pricing_tier',
    'is_recommended',
  ],
];

export default function CreatePage() {
  const { t } = useTranslation('table');
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isEditMode = !!id;
  const isServiceProviderMode = pathname.startsWith('/service-providers');
  const isRestaurantMode = pathname.startsWith('/restaurants');
  const backListPath = isServiceProviderMode
    ? '/service-providers'
    : isRestaurantMode
      ? '/restaurants'
      : '/shop';

  // Hooks for fetching and mutations
  const { data: shopData, isLoading: isLoadingShop } = useFetchShopById(id || '');
  const { data: servicesResponse } = useFetchServices(1, 200);
  const createShopMutation = useCreateShop();
  const updateShopMutation = useUpdateShop();

  const services = (servicesResponse as any)?.data?.items ?? [];
  const serviceOptions = services.map((s: any) => ({
    value: s.id,
    label: formatTranslated(s.name),
  }));

  const { data: categoryRows = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories', 'flat', 'shop-form', isRestaurantMode ? 'restaurant' : 'all'],
    queryFn: () =>
      _CategoryApi.getListAllCategoriesFlat({
        per_page: 500,
        is_active: true,
        ...(isRestaurantMode ? { is_restaurant: true } : {}),
      }),
  });
  const categoryOptions = categoryRows.map((c) => ({
    value: c.id,
    label: formatTranslated(c.name),
  }));

  const paymentMethodOptions = (['cash', 'online'] as const).map((key) => ({
    value: key,
    label: t(`form.shopPaymentMethod_${key}`),
  }));

  const shopRecord = shopData?.data;
  const vendorSelectLabel =
    isEditMode && shopRecord?.vendor ? formatTranslated(shopRecord.vendor.name) : undefined;
  const areaSelectLabel =
    isEditMode && shopRecord?.area ? formatTranslated(shopRecord.area.name) : undefined;

  const defaultValues: ShopFormValues = {
    vendor_id: 0,
    logo: null,
    name: {
      ar: '',
      en: '',
    },
    description: {
      ar: '',
      en: '',
    },
    address: {
      ar: '',
      en: '',
    },
    lat: 0,
    lng: 0,
    phone: '',
    mobile: '',
    email: '',
    working_hours: structuredClone(DEFAULT_WORKING_HOURS_TEMPLATE),
    is_active: true,
    area_id: 0,
    service_ids: [],
    badges: [],
    shop_type: isServiceProviderMode
      ? 'service_provider'
      : isRestaurantMode
        ? 'restaurant'
        : 'store',
    payment_methods: [],
    pricing_tier: 'medium',
    is_recommended: false,
    category_ids: [],
  };

  const editFormValues = useMemo(() => {
    if (!isEditMode || isLoadingShop || !shopRecord) return undefined;
    return buildShopFormValuesFromApi(shopRecord);
  }, [isEditMode, isLoadingShop, shopRecord]);

  const methods = useForm<ShopFormValues>({
    resolver: zodResolver(ShopSchema) as Resolver<ShopFormValues>,
    defaultValues,
  });

  const { handleSubmit, control, watch, reset } = methods;

  useEffect(() => {
    if (isServiceProviderMode) {
      methods.setValue('shop_type', 'service_provider');
    } else if (isRestaurantMode) {
      methods.setValue('shop_type', 'restaurant');
    } else {
      methods.setValue('shop_type', 'store');
    }
  }, [isServiceProviderMode, isRestaurantMode, methods]);

  /** RHF `values` is unreliable when omitted on first mount then set after fetch — explicit `reset` applies API data to inputs. */
  useEffect(() => {
    if (editFormValues === undefined) return;
    reset(editFormValues);
  }, [editFormValues, reset]);
  const logoFile = watch('logo');

  const logoPreviewUrl = useMemo(() => {
    if (logoFile instanceof File) return URL.createObjectURL(logoFile);
    const raw = shopData?.data?.logo_url;
    if (isEditMode && raw && !logoFile) {
      const s = String(raw).trim();
      if (s.startsWith('http://') || s.startsWith('https://')) return s;
      const base = CONFIG.serverUrl?.replace(/\/$/, '') ?? '';
      return base ? `${base}/${s.replace(/^\//, '')}` : s;
    }
    return null;
  }, [logoFile, isEditMode, shopData?.data?.logo_url]);

  useEffect(() => {
    if (logoFile instanceof File && logoPreviewUrl?.startsWith('blob:')) {
      return () => URL.revokeObjectURL(logoPreviewUrl);
    }
    return undefined;
  }, [logoFile, logoPreviewUrl]);

  const isSubmitting = createShopMutation.isPending || updateShopMutation.isPending;
  const errorMessage =
    createShopMutation.error?.message || updateShopMutation.error?.message || null;

  const onSubmit = async (data: ShopFormValues) => {
    try {
      const payload = {
        vendor_id: data.vendor_id,
        logo:
          data.logo instanceof File ? await compressImage(data.logo) : undefined,
        name: {
          ar: data.name.ar,
          en: data.name.en,
        },
        description: {
          ar: data.description.ar,
          en: data.description.en,
        },
        address: {
          ar: data.address.ar,
          en: data.address.en,
        },
        lat: data.lat,
        lng: data.lng,
        phone: data.phone,
        mobile: data.mobile,
        email: data.email,
        working_hours: data.working_hours,
        is_active: data.is_active,
        area_id: data.area_id,
        service_ids: data.service_ids,
        badges: data.badges,
        is_restaurant: data.shop_type === 'restaurant',
        payment_methods: data.payment_methods ?? [],
        pricing_tier: data.pricing_tier,
        is_recommended: data.is_recommended,
        category_ids: (data.category_ids ?? []).filter((categoryId) => categoryId > 0),
      };

      if (isEditMode && id) {
        await updateShopMutation.mutateAsync({ id, data: payload as any });
        toast.success(t('form.shopUpdatedSuccess'));
        navigate(backListPath);
      } else {
        await createShopMutation.mutateAsync(payload);
        toast.success(
          isServiceProviderMode
            ? t('form.serviceProviderCreatedSuccess')
            : isRestaurantMode
              ? t('form.restaurantCreatedSuccess')
              : t('form.shopCreatedSuccess')
        );
        navigate(backListPath);
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('form.shopSaveFailed')));
    }
  };

  const handleCancel = () => {
    navigate(backListPath);
  };

  // Working Hours Component
  const WorkingHoursField = ({ day }: { day: ShopDayKey }) => {
    const daySchedule = watch(`working_hours.${day}`) as DaySchedule | undefined;
    const isClosed = daySchedule?.closed || false;

    return (
      <Box className="group relative p-4 sm:p-5 border border-border/60 rounded-xl bg-card/50 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:shadow-md min-w-0">
        <Box className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 mb-4">
          <Box className="flex min-w-0 items-center gap-2.5">
            <Box className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Iconify
                icon="solar:clock-circle-bold"
                className="text-primary"
                width={16}
                height={16}
              />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground truncate">
              {t(`form.weekday_${day}`)}
            </Typography>
          </Box>
          <Controller
            name={`working_hours.${day}.closed`}
            control={control}
            render={({ field }) => (
              <Box className="flex items-center gap-2 sm:ml-auto sm:shrink-0">
                <Box
                  className={`px-3 py-1.5 rounded-lg border transition-all max-w-full ${
                    field.value
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50'
                      : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                  }`}
                >
                  <Checkbox
                    checked={field.value || false}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      if (e.target.checked) {
                        methods.setValue(`working_hours.${day}.open`, undefined);
                        methods.setValue(`working_hours.${day}.close`, undefined);
                      } else {
                        methods.setValue(`working_hours.${day}.open`, '09:00');
                        methods.setValue(`working_hours.${day}.close`, '18:00');
                      }
                    }}
                    label={
                      <span
                        className={`text-xs font-medium ${field.value ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}
                      >
                        {field.value ? t('form.shopDayClosed') : t('form.shopDayOpen')}
                      </span>
                    }
                  />
                </Box>
              </Box>
            )}
          />
        </Box>
        {!isClosed && (
          <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RHFTextField
              name={`working_hours.${day}.open`}
              type="time"
              label={t('form.openTime')}
              className="transition-all duration-200"
            />
            <RHFTextField
              name={`working_hours.${day}.close`}
              type="time"
              label={t('form.closeTime')}
              className="transition-all duration-200"
            />
          </Box>
        )}
        {isClosed && (
          <Box className="py-2 text-center">
            <Typography variant="caption" className="text-muted-foreground italic">
              {t('form.shopClosedOnDayHint')}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const stepValidationFields = useMemo(() => {
    if (!isRestaurantMode) return SHOP_STEP_VALIDATION_FIELDS;
    return SHOP_STEP_VALIDATION_FIELDS.map((fields, index) =>
      index === 4 ? fields.filter((field) => field !== 'category_ids') : fields
    );
  }, [isRestaurantMode]);

  const restaurantCategoriesBeforeStepper = isRestaurantMode ? (
    <ShopStepCanvas>
      <Box className="group">
        <Box className="flex items-center gap-2.5 mb-4">
          <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Iconify icon="solar:folder-bold" className="text-primary" width={16} height={16} />
          </Box>
          <Typography variant="subtitle2" className="font-semibold text-foreground">
            {t('form.restaurantCategoriesSection')}
          </Typography>
        </Box>
        <Controller
          name="category_ids"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <CategoryHierarchyCheckboxTree
              categories={categoryRows}
              value={field.value ?? []}
              onChange={field.onChange}
              isLoading={isLoadingCategories}
              disabled={isLoadingCategories || categoryRows.length === 0}
              error={error?.message ? String(error.message) : undefined}
            />
          )}
        />
      </Box>
    </ShopStepCanvas>
  ) : undefined;

  // Define steps for the stepper
  const steps = [
    {
      label: t('form.shopStepBasicLabel'),
      description: t('form.shopStepBasicDesc'),
      icon: 'solar:case-minimalistic-bold',
      content: (
        <ShopStepCanvas>
          <Box className="space-y-6">
          {/* Vendor Selection */}
          <Box className="group">
            <Box className="flex items-center gap-2.5 mb-3">
              <Box className="w-7 h-7 rounded-lg bg-muted border border-border/60 flex items-center justify-center">
                <Iconify
                  icon="solar:case-minimalistic-bold"
                  className="text-muted-foreground"
                  width={16}
                  height={16}
                />
              </Box>
              <Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('form.shopVendorFieldLabel')}
              </Typography>
            </Box>
            <RHFInfiniteSelect
              name="vendor_id"
              queryKey={['vendors', 'infinite', 'shop-form']}
              fetcher={vendorFetcher}
              placeholder={t('form.selectVendor')}
              helperText={t('form.shopVendorOneShopHelper')}
              initialLabel={vendorSelectLabel}
            />
          </Box>

          {/* Shop Name - Bilingual */}
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Box className="group">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify
                    icon="solar:case-minimalistic-bold"
                    className="text-primary"
                    width={16}
                    height={16}
                  />
                </Box>
<Typography variant="subtitle2" className="font-semibold text-foreground">
                {isRestaurantMode ? t('form.restaurantVendorNameAr') : t('form.storeNameAr')}
                </Typography>
              </Box>
              <RHFTextField
                name="name.ar"
                placeholder={
                  isRestaurantMode
                    ? t('form.restaurantVendorNameArPlaceholder')
                    : t('form.storeNameAr')
                }
                helperText={
                  isRestaurantMode
                    ? t('form.restaurantVendorNameArHelper')
                    : t('form.shopNameArHelper')
                }
                className="transition-all duration-200"
              />
            </Box>

            <Box className="group">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify
                    icon="solar:case-minimalistic-bold"
                    className="text-primary"
                    width={16}
                    height={16}
                  />
                </Box>
<Typography variant="subtitle2" className="font-semibold text-foreground">
                {isRestaurantMode ? t('form.restaurantVendorNameEn') : t('form.storeNameEn')}
                </Typography>
              </Box>
              <RHFTextField
                name="name.en"
                placeholder={
                  isRestaurantMode
                    ? t('form.restaurantVendorNameEnPlaceholder')
                    : t('form.storeNameEn')
                }
                helperText={
                  isRestaurantMode
                    ? t('form.restaurantVendorNameEnHelper')
                    : t('form.shopNameEnHelper')
                }
                className="transition-all duration-200"
              />
            </Box>
          </Box>

          {/* Description - Bilingual */}
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Box className="group">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify
                    icon="solar:notes-bold-duotone"
                    className="text-primary"
                    width={16}
                    height={16}
                  />
                </Box>
<Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('form.descriptionAr')}
                </Typography>
              </Box>
              <RHFTextField
                name="description.ar"
                placeholder={t('form.storeDescAr')}
                helperText={t('form.shopDescArHelper')}
                className="transition-all duration-200"
              />
            </Box>

            <Box className="group">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify
                    icon="solar:notes-bold-duotone"
                    className="text-primary"
                    width={16}
                    height={16}
                  />
                </Box>
<Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('form.descriptionEn')}
                </Typography>
              </Box>
              <RHFTextField
                name="description.en"
                placeholder={t('form.storeDescEn')}
                helperText={t('form.shopDescEnHelper')}
                className="transition-all duration-200"
              />
            </Box>
          </Box>

          {/* Shop Logo Upload */}
          <Box className="group">
            <Box className="flex items-center gap-2.5 mb-3">
              <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Iconify
                  icon="solar:gallery-add-bold"
                  className="text-primary"
                  width={16}
                  height={16}
                />
              </Box>
              <Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('form.shopLogoField')}
              </Typography>
            </Box>
            <Controller
              name="logo"
              control={control}
              render={({ field: { onChange, value, ...field }, fieldState: { error } }) => (
                <div className="w-full">
                  <Input
                    {...field}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      onChange(file || null);
                    }}
                    error={!!error}
                    helperText={
                      error?.message ||
                      (isEditMode ? t('form.shopLogoHelperEdit') : t('form.shopLogoHelperCreate'))
                    }
                    fullWidth
                    className="transition-all duration-200"
                  />
                  {logoPreviewUrl && (
                    <Box className="mt-4">
                      <img
                        src={logoPreviewUrl}
                        alt={t('form.shopLogoPreviewAlt')}
                        className="w-24 h-24 rounded-xl object-cover border border-border/60"
                      />
                    </Box>
                  )}
                </div>
              )}
            />
          </Box>

          {/* Badges */}
          <Box className="group">
            <Box className="flex items-center gap-2.5 mb-3">
              <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Iconify
                  icon="solar:star-bold"
                  className="text-primary"
                  width={16}
                  height={16}
                />
              </Box>
              <Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('form.shopBadgesSection')}
              </Typography>
            </Box>
            <RHFBadgeSelector
              name="badges"
              helperText={t('form.badgesHelperShop')}
            />
          </Box>
          </Box>
        </ShopStepCanvas>
      ),
    },
    {
      label: t('form.shopStepLocationLabel'),
      description: t('form.shopStepLocationDesc'),
      icon: 'solar:case-minimalistic-bold',
      content: (
        <ShopStepCanvas>
          <Box className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:items-start">
            <Box className="space-y-6">
              <Typography variant="overline" className="text-primary/90 font-semibold tracking-wider">
                {t('form.shopStepLocationLabel')}
              </Typography>
              {/* Address - Bilingual */}
              <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Box className="group">
                  <Box className="flex items-center gap-2.5 mb-3">
                    <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Iconify
                        icon="solar:case-minimalistic-bold"
                        className="text-primary"
                        width={16}
                        height={16}
                      />
                    </Box>
                    <Typography variant="subtitle2" className="font-semibold text-foreground">
                      {t('form.addressAr')}
                    </Typography>
                  </Box>
                  <RHFTextField
                    name="address.ar"
                    placeholder={t('form.addressPlaceholderAr')}
                    helperText={t('form.shopAddressArHelper')}
                    className="transition-all duration-200"
                  />
                </Box>

                <Box className="group">
                  <Box className="flex items-center gap-2.5 mb-3">
                    <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Iconify
                        icon="solar:case-minimalistic-bold"
                        className="text-primary"
                        width={16}
                        height={16}
                      />
                    </Box>
                    <Typography variant="subtitle2" className="font-semibold text-foreground">
                      {t('form.addressEn')}
                    </Typography>
                  </Box>
                  <RHFTextField
                    name="address.en"
                    placeholder={t('form.addressPlaceholderEn')}
                    helperText={t('form.shopAddressEnHelper')}
                    className="transition-all duration-200"
                  />
                </Box>
              </Box>
            </Box>

            {/* Map — full column on wide screens */}
            <Box className="space-y-4 xl:sticky xl:top-6">
              <Box className="flex items-center gap-2.5">
                <Box className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/20">
                  <Iconify icon="solar:map-point-bold" className="text-primary" width={22} height={22} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('form.shopLocationOnMap')}
                  </Typography>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('form.shopMapClickHelper')}
                  </Typography>
                </Box>
              </Box>
              <Box className="rounded-2xl border border-border/60 bg-muted/20 p-3 shadow-inner dark:bg-muted/10">
                <MapPicker
                  lat={String(watch('lat') ?? '')}
                  lng={String(watch('lng') ?? '')}
                  onChange={(latStr, lngStr) => {
                    const latNum = parseFloat(latStr);
                    const lngNum = parseFloat(lngStr);
                    if (!Number.isNaN(latNum)) methods.setValue('lat', latNum);
                    if (!Number.isNaN(lngNum)) methods.setValue('lng', lngNum);
                  }}
                  height="min(52vh, 520px)"
                  className="w-full"
                />
              </Box>
              <Box className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-4 rounded-xl border border-border/50 bg-card/60 px-4 py-3">
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('form.latitudeLabel')}
                  </Typography>
                  <Typography variant="body2" className="font-mono font-medium">
                    {watch('lat') ?? '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-muted-foreground">
                    {t('form.longitudeLabel')}
                  </Typography>
                  <Typography variant="body2" className="font-mono font-medium">
                    {watch('lng') ?? '-'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </ShopStepCanvas>
      ),
    },
    {
      label: t('form.shopStepContactLabel'),
      description: t('form.shopStepContactDesc'),
      icon: 'solar:phone-bold',
      content: (
        <ShopStepCanvas>
          <Box className="space-y-6">
          <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Box className="group">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify
                    icon="solar:phone-bold"
                    className="text-primary"
                    width={16}
                    height={16}
                  />
                </Box>
<Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('columns.phone')}
                </Typography>
              </Box>
              <RHFTextField
                name="phone"
                autoComplete="tel"
                placeholder={t('form.phonePlaceholder')}
                helperText={t('form.shopPhoneHelper')}
                className="transition-all duration-200"
              />
            </Box>
            <Box className="group">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify
                    icon="solar:smartphone-2-bold"
                    className="text-primary"
                    width={16}
                    height={16}
                  />
                </Box>
<Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('form.mobileLabel')}
                </Typography>
              </Box>
              <RHFTextField
                name="mobile"
                autoComplete="tel"
                placeholder={t('form.mobilePlaceholder')}
                helperText={t('form.shopMobileHelper')}
                className="transition-all duration-200"
              />
            </Box>
            <Box className="group">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify
                    icon="solar:letter-bold"
                    className="text-primary"
                    width={16}
                    height={16}
                  />
                </Box>
<Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('columns.email')}
                </Typography>
              </Box>
              <RHFTextField
                name="email"
                type="email"
                placeholder={t('form.emailPlaceholder')}
                helperText={t('form.shopEmailHelper')}
                className="transition-all duration-200"
              />
            </Box>
          </Box>
          </Box>
        </ShopStepCanvas>
      ),
    },
    {
      label: t('form.shopStepHoursLabel'),
      description: t('form.shopStepHoursDesc'),
      icon: 'solar:clock-circle-bold',
      content: (
        <ShopStepCanvas>
          <Box className="space-y-6">
          <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {SHOP_DAY_KEYS.map((dayKey) => (
              <WorkingHoursField key={dayKey} day={dayKey} />
            ))}
          </Box>
          </Box>
        </ShopStepCanvas>
      ),
    },
    {
      label: t('form.shopStepSettingsLabel'),
      description: t('form.shopStepSettingsDesc'),
      icon: 'solar:settings-bold',
      content: (
        <ShopStepCanvas>
          <Box className="space-y-6">
          {/* Classification, pricing, payments, coupons */}
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Box className="group md:col-span-2">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify
                    icon="solar:shop-bold"
                    className="text-primary"
                    width={16}
                    height={16}
                  />
                </Box>
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.shopClassificationSection')}
                </Typography>
              </Box>
              {isServiceProviderMode ? (
                <Box className="p-4 rounded-lg border border-border/60 bg-card/30">
                  <Typography variant="body2" className="font-medium text-foreground">
                    {t('form.shopTypeServiceProvider')}
                  </Typography>
                </Box>
              ) : isRestaurantMode ? (
                <Box className="p-4 rounded-lg border border-border/60 bg-card/30">
                  <Typography variant="body2" className="font-medium text-foreground">
                    {t('form.shopTypeRestaurant')}
                  </Typography>
                </Box>
              ) : (
                <Box className="p-4 rounded-lg border border-border/60 bg-card/30">
                  <Typography variant="body2" className="font-medium text-foreground">
                    {t('form.shopTypeStore')}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box className="group">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify icon="solar:tag-price-bold" className="text-primary" width={16} height={16} />
                </Box>
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.shopPriceLevelLabel')}
                </Typography>
              </Box>
              <RHFSelect
                name="pricing_tier"
                options={[
                  { value: 'cheap', label: t('form.shopPriceLevelCheap') },
                  { value: 'medium', label: t('form.shopPriceLevelMedium') },
                  { value: 'expensive', label: t('form.shopPriceLevelExpensive') },
                ]}
                placeholder={t('form.shopPriceLevelPlaceholder')}
              />
            </Box>

            <Box className="group">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify icon="solar:wallet-bold" className="text-primary" width={16} height={16} />
                </Box>
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.shopPaymentMethodsLabel')}
                </Typography>
              </Box>
              <Controller
                name="payment_methods"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div className="w-full">
                    <MultiSelect
                      options={paymentMethodOptions}
                      value={field.value ?? []}
                      onChange={(ids) => field.onChange(ids as string[])}
                      placeholder={t('form.shopPaymentMethodsPlaceholder')}
                    />
                    {error?.message && (
                      <Typography variant="caption" className="text-destructive mt-1 block">
                        {error.message}
                      </Typography>
                    )}
                  </div>
                )}
              />
            </Box>

            <Box className="group md:col-span-2">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify icon="solar:star-bold" className="text-primary" width={16} height={16} />
                </Box>
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.shopRecommendedSection')}
                </Typography>
              </Box>
              <Controller
                name="is_recommended"
                control={control}
                render={({ field }) => (
                  <Box className="p-4 rounded-lg border border-border/60 bg-card/30 hover:bg-card/50 transition-colors">
                    <Checkbox
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      label={
                        <span className="text-sm font-medium text-foreground">
                          {t('form.shopRecommendedLabel')}
                        </span>
                      }
                    />
                  </Box>
                )}
              />
            </Box>
          </Box>

          {/* Area ID & Service IDs */}
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Box className="group">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify
                    icon="solar:case-minimalistic-bold"
                    className="text-primary"
                    width={16}
                    height={16}
                  />
                </Box>
<Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('areaLabel')}
                </Typography>
              </Box>
              <RHFInfiniteSelect
                name="area_id"
                queryKey={['areas', 'infinite', 'shop-form']}
                fetcher={areaFetcherForShop}
                placeholder={t('form.selectArea')}
                helperText={t('form.selectAreaHelper')}
                initialLabel={areaSelectLabel}
              />
            </Box>

            <Box className="group">
              <Box className="flex items-center gap-2.5 mb-3">
                <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Iconify
                    icon="solar:settings-bold"
                    className="text-primary"
                    width={16}
                    height={16}
                  />
                </Box>
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.shopServicesSection')}
                </Typography>
              </Box>
              <Controller
                name="service_ids"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div className="w-full">
                    <MultiSelect
                      options={serviceOptions}
                      value={field.value?.map((s) => s.id) ?? []}
                      onChange={(ids) =>
                        field.onChange(
                          (ids as (string | number)[]).map((sid) => ({ id: Number(sid) }))
                        )
                      }
                      placeholder={t('form.selectServices')}
                      isDisabled={serviceOptions.length === 0}
                    />
                    {error?.message && (
                      <Typography variant="caption" className="text-destructive mt-1 block">
                        {error.message}
                      </Typography>
                    )}
                  </div>
                )}
              />
            </Box>
          </Box>

          {!isRestaurantMode ? (
          <Box className="group pt-2">
            <Box className="flex items-center gap-2.5 mb-3">
              <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Iconify
                  icon="solar:folder-bold"
                  className="text-primary"
                  width={16}
                  height={16}
                />
              </Box>
              <Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('form.shopCategoriesSection')}
              </Typography>
            </Box>
            <Controller
              name="category_ids"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div className="w-full">
                  <MultiSelect
                    options={categoryOptions}
                    value={field.value ?? []}
                    onChange={(ids) =>
                      field.onChange(
                        (ids as (string | number)[])
                          .map((cid) => Number(cid))
                          .filter((n) => Number.isFinite(n) && n > 0)
                      )
                    }
                    placeholder={
                      isLoadingCategories ? t('loading') : t('form.selectShopCategories')
                    }
                    isDisabled={isLoadingCategories || categoryOptions.length === 0}
                  />
                  <Typography variant="caption" className="text-muted-foreground mt-1 block">
                    {t('form.shopCategoriesHelper')}
                  </Typography>
                  {error?.message && (
                    <Typography variant="caption" className="text-destructive mt-1 block">
                      {error.message}
                    </Typography>
                  )}
                </div>
              )}
            />
          </Box>
          ) : null}

          {/* Active Status */}
          <Box className="group pt-2">
            <Box className="flex items-center gap-2.5 mb-3">
              <Box className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Iconify
                  icon="solar:check-circle-bold"
                  className="text-primary"
                  width={16}
                  height={16}
                />
              </Box>
              <Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('form.shopActiveStatusSection')}
              </Typography>
            </Box>
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Box className="p-4 rounded-lg border border-border/60 bg-card/30 hover:bg-card/50 transition-colors">
                  <Checkbox
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    label={
                      <span className="text-sm font-medium text-foreground">
                        {t('form.markShopActiveLabel')}
                      </span>
                    }
                  />
                </Box>
              )}
            />
          </Box>
          </Box>
        </ShopStepCanvas>
      ),
    },
  ];

  return (
    <>
      <title>
        {isEditMode
          ? isRestaurantMode
            ? t('form.restaurantEditDocumentTitle', { appName: CONFIG.appName })
            : t('form.shopEditDocumentTitle', { appName: CONFIG.appName })
          : isServiceProviderMode
            ? t('form.serviceProviderCreateDocumentTitle', { appName: CONFIG.appName })
            : isRestaurantMode
              ? t('form.restaurantCreateDocumentTitle', { appName: CONFIG.appName })
              : t('form.shopCreateDocumentTitle', { appName: CONFIG.appName })}
      </title>

      <StepperFormLayout
        methods={methods}
        onSubmit={handleSubmit(
          (data) => {
            onSubmit(data);
          },
          (errors) => {
            const getFirstMessage = (obj: unknown): string | null => {
              if (!obj || typeof obj !== 'object') return null;
              const o = obj as Record<string, unknown>;
              if (typeof o.message === 'string') return o.message;
              for (const v of Object.values(o)) {
                const m = getFirstMessage(v);
                if (m) return m;
              }
              return null;
            };
            const msg = getFirstMessage(errors);
            if (msg) toast.error(msg);
          }
        )}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        title={
          isEditMode
            ? isRestaurantMode
              ? t('form.editRestaurant')
              : t('form.editShop')
            : isServiceProviderMode
              ? t('form.createServiceProvider')
              : isRestaurantMode
                ? t('form.createRestaurant')
                : t('form.createShop')
        }
        description={
          isEditMode
            ? isRestaurantMode
              ? t('form.editRestaurantDesc')
              : t('form.editShopDesc')
            : isServiceProviderMode
              ? t('form.createServiceProviderDesc')
              : isRestaurantMode
                ? t('form.createRestaurantDesc')
                : t('form.createShopDesc')
        }
        icon={
          <Box className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/35 via-primary/15 to-transparent shadow-lg shadow-primary/15 ring-2 ring-primary/25">
            <Iconify
            icon={
              isEditMode
                ? isRestaurantMode
                  ? 'solar:chef-hat-bold'
                  : 'solar:shop-2-bold'
                : isServiceProviderMode
                  ? 'solar:hand-stars-bold'
                  : isRestaurantMode
                    ? 'solar:chef-hat-bold'
                    : 'solar:shop-bold'
            } 
              className="text-primary"
              width={30}
              height={30}
            />
          </Box>
        }
        isEditMode={isEditMode}
        isLoading={isLoadingShop}
        loadingText={
          isServiceProviderMode
            ? t('form.loadingServiceProvider')
            : isRestaurantMode
              ? t('form.loadingRestaurant')
              : t('form.loadingShop')
        }
        maxWidth="full"
        steps={steps}
        stepValidationFields={stepValidationFields}
        beforeStepper={restaurantCategoriesBeforeStepper}
        reviewHint={t('reviewBeforeSubmit')}
        submitLabel={
          isEditMode
            ? isRestaurantMode
              ? t('form.updateRestaurantSubmit')
              : t('form.updateShopSubmit')
            : isServiceProviderMode
              ? t('form.createServiceProviderSubmit')
              : isRestaurantMode
                ? t('form.createRestaurantSubmit')
                : t('form.createShopSubmit')
        }
        submittingLabel={
          isEditMode
            ? isRestaurantMode
              ? t('form.updatingRestaurant')
              : t('form.updatingShop')
            : isServiceProviderMode
              ? t('form.creatingServiceProvider')
              : isRestaurantMode
                ? t('form.creatingRestaurant')
                : t('form.creatingShop')
        }
      />
    </>
  );
}
