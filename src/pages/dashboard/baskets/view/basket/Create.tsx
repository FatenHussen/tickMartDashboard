import type { BasketItem , BasketCreateUpdatePayload } from '@/pages/dashboard/baskets/types/basket.types';

import { toast } from 'react-toastify';
import { Button } from '@/shared/ui/button';
import { useTranslation } from 'react-i18next';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Iconify } from '@/shared/components/iconify';
import { useParams, useNavigate } from 'react-router';
import { compressImage } from '@/utils/compress-image';
import { formatTranslated } from '@/utils/format-translated';
import { resolveBasketGalleryUrls } from '@/utils/basket-gallery';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { InfiniteScrollSelect } from '@/shared/components/infinite-scroll-select';
import { _CategoryApi } from '@/pages/dashboard/categories/api/category.services';
import { _ShopProductVariantApi } from '@/shared/api/shop-product-variant.services';
import { TinyMCEEditorField } from '@/shared/components/tinymce-editor/tinymce-editor';
import {
  useFetchCategories,
  useFetchCategoryById,
} from '@/pages/dashboard/categories/hooks/category';
import {
  BasketSchema,
  type BasketFormValues,
} from '@/pages/dashboard/baskets/validation/basket.validation';
import {
  useCreateBasket,
  useUpdateBasket,
  useFetchBasketById,
} from '@/pages/dashboard/baskets/hooks/basket';
import {
  resolveStorageImageUrl,
  shopVariantOptionImage,
  shopVariantOptionColorHex,
} from '@/utils/shop-variant-image';

import { CONFIG } from 'src/global-config';
import { Label } from 'src/shared/components/label';
import { Box, Input, Typography } from 'src/shared/ui';
import { LoadingScreen } from 'src/shared/components/loading-screen';
import { RHFTextField } from 'src/shared/components/hook-form/rhf-text-field';
import { CreateFormLayout } from 'src/shared/components/forms/create-form-layout';
import { RHFBadgeSelector } from 'src/shared/components/hook-form/rhf-badge-selector';

// ----------------------------------------------------------------------

const mainCategoryFetcher = (page: number, limit: number) =>
  _CategoryApi.getListCategoriesPaginated({ page, per_page: limit, parent_id: 0 }).then((r) => ({
    data: {
      items: r.data.items.map((cat) => ({
        id: cat.id,
        label: formatTranslated(cat.name as Parameters<typeof formatTranslated>[0]),
      })),
      pagination: r.data.pagination,
    },
  }));

// ----------------------------------------------------------------------

function FieldErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Typography variant="caption" className="text-destructive mt-1 block">
      {message}
    </Typography>
  );
}

const getTranslation = (val: any, lang: 'ar' | 'en') => {
  if (!val) return '';
  if (typeof val === 'string') return lang === 'en' ? val : '';
  return val[lang] || '';
};

/** Shown in variant dropdown before options load / when selected row is off the first page (edit basket). */
function basketLineVariantInitialLabel(row: BasketItem | undefined): string | undefined {
  if (!row) return undefined;
  const productName =
    row.product?.name != null
      ? typeof row.product.name === 'string'
        ? row.product.name
        : formatTranslated(row.product.name as Parameters<typeof formatTranslated>[0])
      : '';
  const variantStr = Array.isArray(row.variant)
    ? row.variant.map((v) => String(v)).filter(Boolean).join(' · ')
    : '';
  const shop = row.shop_variant?.shop_name?.trim();
  const parts = [productName, variantStr, shop].filter(Boolean);
  if (parts.length) return parts.join(' — ');
  const spvid = row.shop_product_variant_id;
  if (spvid != null && Number(spvid) > 0) return `#${spvid}`;
  return undefined;
}

export default function CreatePage() {
  const { t } = useTranslation('table');
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { data: basketResponse, isLoading: isLoadingBasket } = useFetchBasketById(id || '');
  const createBasketMutation = useCreateBasket();
  const updateBasketMutation = useUpdateBasket();

  const defaultValues: BasketFormValues = {
    category_ids: [],
    name: { en: '', ar: '' },
    description: { en: '', ar: '' },
    offer_ends_at: '',
    discount: 0,
    discount_type: 'percentage',
    delivery_price: 0,
    image: null,
    images: [],
    items: [{ shop_product_variant_id: 0, quantity: 1 }],
    badges: [],
  };

  const methods = useForm<BasketFormValues>({
    resolver: zodResolver(BasketSchema) as any,
    defaultValues,
  });

  const { handleSubmit, reset, control, watch, setValue, formState: { errors } } = methods;
  const categoryIds = watch('category_ids') ?? [];
  const imageValue = watch('image');
  const extraImageFiles = watch('images') ?? [];
  const [fileImagePreview, setFileImagePreview] = useState<string | null>(null);
  const [extraImagePreviews, setExtraImagePreviews] = useState<string[]>([]);
  const [mainCategoryId, setMainCategoryId] = useState(0);

  const existingGallery = useMemo(
    () => (isEditMode && basketResponse?.data ? resolveBasketGalleryUrls(basketResponse.data) : []),
    [isEditMode, basketResponse?.data]
  );

  useEffect(() => {
    if (!(imageValue instanceof File)) {
      setFileImagePreview(null);
      return undefined;
    }
    const u = URL.createObjectURL(imageValue);
    setFileImagePreview(u);
    return () => URL.revokeObjectURL(u);
  }, [imageValue]);

  const extraSig = extraImageFiles.map((f) => `${f.name}:${f.size}`).join('|');
  useEffect(() => {
    if (!extraImageFiles.length) {
      setExtraImagePreviews([]);
      return undefined;
    }
    const urls = extraImageFiles.map((f) => URL.createObjectURL(f));
    setExtraImagePreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [extraSig]);

  const basketLeafCategoryId = useMemo(() => {
    if (!isEditMode || !basketResponse?.data) return 0;
    const src = basketResponse.data;
    const raw =
      src.category_ids?.length ? src.category_ids : src.categories?.map((c) => c.id) ?? [];
    const legacy =
      typeof src.category === 'object' && src.category && 'id' in src.category
        ? [src.category.id]
        : [];
    const ids = raw.length ? raw : legacy;
    if (!ids.length) return 0;
    const n = ids.length > 1 ? ids[ids.length - 1] : ids[0];
    return Number(n) || 0;
  }, [isEditMode, basketResponse?.data]);

  const { data: basketLeafCategoryResp } = useFetchCategoryById(
    basketLeafCategoryId > 0 ? basketLeafCategoryId : ''
  );

  useEffect(() => {
    setMainCategoryId(0);
  }, [id]);

  useEffect(() => {
    if (!isEditMode || basketLeafCategoryId <= 0) return;
    const d = basketLeafCategoryResp?.data;
    if (!d || Number(d.id) !== basketLeafCategoryId) return;
    const pid = d.parent_id != null && Number(d.parent_id) > 0 ? Number(d.parent_id) : null;
    setMainCategoryId(pid ?? Number(d.id));
  }, [isEditMode, basketLeafCategoryId, basketLeafCategoryResp?.data]);

  const { data: subcategoriesListResp, isLoading: isLoadingSubCats } = useFetchCategories(
    1,
    10,
    mainCategoryId > 0 ? { parent_id: mainCategoryId } : undefined,
    { enabled: mainCategoryId > 0 }
  );

  const hasChildCategories = useMemo(() => {
    if (mainCategoryId <= 0) return false;
    const items = subcategoriesListResp?.data?.items ?? [];
    const total = subcategoriesListResp?.data?.pagination?.total;
    if (typeof total === 'number') return total > 0;
    return items.length > 0;
  }, [mainCategoryId, subcategoriesListResp]);

  const childCategoryFetcher = useMemo(
    () => (page: number, limit: number) =>
      _CategoryApi.getListCategoriesPaginated({
        page,
        per_page: limit,
        parent_id: mainCategoryId,
      }).then((r) => ({
        data: {
          items: r.data.items.map((cat) => ({
            id: cat.id,
            label: formatTranslated(cat.name as Parameters<typeof formatTranslated>[0]),
          })),
          pagination: r.data.pagination,
        },
      })),
    [mainCategoryId]
  );

  const mainCategoryInitialLabel = useMemo(() => {
    if (!isEditMode || basketLeafCategoryId <= 0 || !basketLeafCategoryResp?.data) return undefined;
    const d = basketLeafCategoryResp.data;
    if (Number(d.id) !== basketLeafCategoryId) return undefined;
    const pid = d.parent_id != null && Number(d.parent_id) > 0 ? Number(d.parent_id) : null;
    if (pid && d.parent) {
      return typeof d.parent.name === 'string'
        ? d.parent.name
        : formatTranslated(d.parent.name as Parameters<typeof formatTranslated>[0]);
    }
    return formatTranslated(d.name as Parameters<typeof formatTranslated>[0]);
  }, [isEditMode, basketLeafCategoryId, basketLeafCategoryResp?.data]);

  const leafCategoryInitialLabel = useMemo(() => {
    if (!isEditMode || !basketResponse?.data || basketLeafCategoryId <= 0) return undefined;
    const cat = basketResponse.data.categories?.find((c) => Number(c.id) === basketLeafCategoryId);
    if (!cat?.name) return undefined;
    return formatTranslated(cat.name as Parameters<typeof formatTranslated>[0]);
  }, [isEditMode, basketResponse?.data, basketLeafCategoryId]);

  useEffect(() => {
    if (mainCategoryId <= 0 || isLoadingSubCats) return;
    if (!hasChildCategories) {
      setValue('category_ids', [mainCategoryId], { shouldValidate: true });
    }
  }, [mainCategoryId, hasChildCategories, isLoadingSubCats, setValue]);

  const basketDiscountType = watch('discount_type');
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    // In edit mode, always use API data (GET baskets/:id) - list/state has no items
    const source = isEditMode ? basketResponse?.data : null;
    if (source) {
      const name = typeof source.name === 'object' ? source.name : { en: String(source.name || ''), ar: String(source.name || '') };
      const discountNum = typeof source.discount === 'string' ? parseFloat(source.discount) : (source.discount ?? source.discount_value ?? 0);
      const offerDate = source.offer_ends_at ? (source.offer_ends_at.includes('-') ? source.offer_ends_at.split('T')[0] : source.offer_ends_at) : '';
      const idsFromPivot =
        source.category_ids?.length ? source.category_ids : source.categories?.map((c) => c.id) ?? [];
      const legacyId = typeof source.category === 'object' && source.category && 'id' in source.category ? source.category.id : undefined;
      const rawIds =
        idsFromPivot.length > 0 ? idsFromPivot : legacyId != null ? [legacyId] : [];
      const leafNum =
        rawIds.length > 1 ? Number(rawIds[rawIds.length - 1]) : rawIds[0] != null ? Number(rawIds[0]) : 0;
      const category_ids = leafNum > 0 ? [leafNum] : [];

      reset({
        category_ids,
        name: { en: (name as any)?.en || '', ar: (name as any)?.ar || '' },
        description: {
          en: getTranslation(source.description, 'en'),
          ar: getTranslation(source.description, 'ar'),
        },
        offer_ends_at: offerDate,
        discount: Number.isNaN(discountNum) ? 0 : Number(discountNum),
        discount_type: source.discount_type || 'percentage',
        delivery_price: source.delivery_price ?? 0,
        image: null,
        images: [],
        items: source.items?.length
          ? source.items.map((it) => ({
              shop_product_variant_id: Number(it.shop_product_variant_id) || 0,
              quantity: Number(it.quantity) > 0 ? Number(it.quantity) : 1,
            }))
          : [{ shop_product_variant_id: 0, quantity: 1 }],
        badges: source.badges?.length
          ? source.badges.map((b: any) => (typeof b === 'number' ? b : b.id))
          : [],
      });
    }
  }, [basketResponse?.data, isEditMode, reset]);

  const isSubmitting = createBasketMutation.isPending || updateBasketMutation.isPending;
  const errorMessage = createBasketMutation.error?.message || updateBasketMutation.error?.message || null;

  const onSubmit = async (data: BasketFormValues) => {
    try {
      const image =
        data.image instanceof File ? await compressImage(data.image) : data.image;
      const images = data.images?.length
        ? await Promise.all(
            data.images.map((f) => (f instanceof File ? compressImage(f) : f))
          )
        : undefined;
      const payload: BasketCreateUpdatePayload = {
        category_ids: data.category_ids,
        category_id: data.category_ids[0],
        name: data.name,
        description: data.description,
        offer_ends_at: data.offer_ends_at,
        discount: data.discount,
        discount_type: data.discount_type,
        delivery_price: data.delivery_price,
        image,
        images,
        items: data.items,
        badges: data.badges,
      };
      if (isEditMode && id) {
        await updateBasketMutation.mutateAsync({ id, data: payload });
        toast.success(t('form.basketUpdatedSuccess'));
      } else {
        await createBasketMutation.mutateAsync(payload);
        toast.success(t('form.basketCreatedSuccess'));
      }
      navigate('/baskets');
    } catch (error: any) {
      console.error('Error saving basket:', error);
    }
  };

  const handleCancel = () => navigate('/baskets');

  if (isEditMode && isLoadingBasket) return <LoadingScreen />;

  return (
    <>
      <title>
        {isEditMode
          ? t('form.basketEditDocumentTitle', { appName: CONFIG.appName })
          : t('form.basketCreateDocumentTitle', { appName: CONFIG.appName })}
      </title>

      <CreateFormLayout
        methods={methods as any}
        onSubmit={handleSubmit(
          onSubmit as any,
          (validationErrors) => {
            console.log('[Basket form] Validation errors:', validationErrors);
          }
        )}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        title={isEditMode ? t('form.editBasketTitle') : t('form.createNewBasket')}
        description={isEditMode ? t('form.editBasketDesc') : t('form.createBasketDesc')}
        isEditMode={isEditMode}
        isLoading={isEditMode && isLoadingBasket}
        loadingText={t('form.loadingBasket')}
        submitLabel={isEditMode ? t('form.updateBasketSubmit') : t('form.createBasketSubmit')}
        submittingLabel={isEditMode ? t('form.updatingBasket') : t('form.creatingBasket')}
      >
        {/* ── Section: Category & Names ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-violet-500/[0.06] via-violet-500/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:widget-5-bold" className="text-violet-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.categoryLabel')} · {t('columns.name')} · {t('columns.description')}
            </Typography>
          </Box>
          <Box className="p-6 flex flex-col gap-5">
            <Box className="group space-y-4">
              <Box className="group">
                <Box className="flex items-center gap-2 mb-2">
                  <Iconify icon="solar:folder-bold" className="text-violet-500" width={16} />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('form.productMainCategory')}
                  </Typography>
                </Box>
                <InfiniteScrollSelect
                  value={mainCategoryId}
                  onChange={(val) => {
                    setMainCategoryId(val);
                    setValue('category_ids', []);
                    setValue('items', [{ shop_product_variant_id: 0, quantity: 1 }]);
                  }}
                  queryKey={['categories', 'infinite', 'basket-form', 'roots']}
                  fetcher={mainCategoryFetcher}
                  placeholder={t('form.selectMainCategory')}
                  initialLabel={mainCategoryInitialLabel}
                />
              </Box>
              {hasChildCategories ? (
                <Box className="group">
                  <Label className="text-sm font-medium mb-1 block text-foreground">
                    {t('form.productSubcategory')}
                  </Label>
                  <InfiniteScrollSelect
                    value={categoryIds[0] ?? 0}
                    onChange={(leafId) => {
                      const n = Number(leafId) || 0;
                      setValue('category_ids', n > 0 ? [n] : [], { shouldValidate: true });
                      setValue('items', [{ shop_product_variant_id: 0, quantity: 1 }]);
                    }}
                    queryKey={['categories', 'infinite', 'basket-form', 'children', mainCategoryId]}
                    fetcher={childCategoryFetcher}
                    placeholder={t('form.selectSubcategory')}
                    initialLabel={leafCategoryInitialLabel}
                    disabled={!mainCategoryId}
                  />
                </Box>
              ) : mainCategoryId > 0 && !isLoadingSubCats ? (
                <Typography variant="caption" className="text-muted-foreground block">
                  {t('form.productCategoryUsesMainOnly')}
                </Typography>
              ) : null}
              {errors.category_ids?.message ? (
                <Typography variant="caption" className="text-destructive block">
                  {String(errors.category_ids.message)}
                </Typography>
              ) : null}
            </Box>
            <Box className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Box className="group">
                <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground flex items-center gap-1.5">
                  <Iconify icon="solar:text-bold" className="text-violet-500" width={16} />
                  {t('form.nameEn')}
                </Typography>
                <RHFTextField name="name.en" placeholder={t('form.basketNameEn')} fullWidth />
              </Box>
              <Box className="group">
                <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground flex items-center gap-1.5">
                  <Iconify icon="solar:text-bold" className="text-violet-500" width={16} />
                  {t('form.nameAr')}
                </Typography>
                <RHFTextField name="name.ar" placeholder={t('form.basketNameAr')} dir="rtl" fullWidth />
              </Box>
            </Box>

            <Box className="border-t border-border pt-5 mt-2 space-y-5">
              <Box className="group">
                <Box className="flex items-center gap-2 mb-2">
                  <Iconify icon="solar:document-bold" className="text-primary" width={20} />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('form.productFullDescAr')}
                  </Typography>
                </Box>
                <Controller
                  name="description.ar"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <div>
                      <TinyMCEEditorField
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder={t('form.fullDescArPlaceholder')}
                        dir="rtl"
                        menubar
                        toolsMenuWordCount
                        height={320}
                      />
                      <FieldErrorText message={error?.message} />
                    </div>
                  )}
                />
              </Box>

              <Box className="group">
                <Box className="flex items-center gap-2 mb-2">
                  <Iconify icon="solar:document-bold" className="text-primary" width={20} />
                  <Typography variant="subtitle2" className="font-semibold text-foreground">
                    {t('form.productFullDescEn')}
                  </Typography>
                </Box>
                <Controller
                  name="description.en"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <div>
                      <TinyMCEEditorField
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder={t('form.fullDescPlaceholder')}
                        dir="ltr"
                        menubar
                        toolsMenuWordCount
                        height={320}
                      />
                      <FieldErrorText message={error?.message} />
                    </div>
                  )}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Section: Pricing ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-amber-500/[0.06] via-amber-500/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:tag-price-bold" className="text-amber-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.discountType')} · {t('form.offerEndsAt')} · {t('form.deliveryPrice')} · {t('form.basketImage')}
            </Typography>
          </Box>
          <Box className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Box className="group">
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground flex items-center gap-1.5">
                <Iconify icon="solar:percent-bold" className="text-amber-500" width={16} />
                {t('form.discountType')}
              </Typography>
              <Controller
                name="discount_type"
                control={control}
                render={({ field }) => (
                  <select {...field} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="percentage">{t('form.discountTypePercentage')}</option>
                    <option value="fixed">{t('form.discountTypeFixed')}</option>
                  </select>
                )}
              />
            </Box>
            <Box className="group">
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground flex items-center gap-1.5">
                <Iconify icon="solar:tag-price-bold" className="text-amber-500" width={16} />
                {t('form.discountValue')}
              </Typography>
              <RHFTextField
                name="discount"
                type="number"
                placeholder={t('form.placeholderZero')}
                fullWidth
                min={0}
                max={basketDiscountType === 'percentage' ? 100 : undefined}
              />
            </Box>
            <Box className="group">
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground flex items-center gap-1.5">
                <Iconify icon="solar:calendar-date-bold" className="text-amber-500" width={16} />
                {t('form.offerEndsAt')}
              </Typography>
              <RHFTextField name="offer_ends_at" type="date" fullWidth />
            </Box>
            <Box className="group">
              <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground flex items-center gap-1.5">
                <Iconify icon="solar:delivery-bold" className="text-amber-500" width={16} />
                {t('form.deliveryPrice')}
              </Typography>
              <RHFTextField name="delivery_price" type="number" placeholder={t('form.placeholderZero')} fullWidth />
            </Box>
            <Box className="group md:col-span-2">
              <Box className="flex items-center gap-2 mb-2">
                <Iconify icon="solar:gallery-add-bold" className="text-amber-500" width={20} height={20} />
                <Typography variant="subtitle2" className="font-semibold text-foreground">
                  {t('form.basketImage')}
                </Typography>
              </Box>
              {isEditMode && existingGallery.length > 0 && (
                <Box className="mb-3 flex flex-wrap gap-2">
                  {existingGallery.map((u) => (
                    <img
                      key={u}
                      src={u}
                      alt=""
                      className="h-16 w-16 rounded-lg border border-border/60 object-cover"
                    />
                  ))}
                </Box>
              )}
              <Controller
                name="image"
                control={control}
                render={({ field: { onChange, value, ...field }, fieldState: { error } }) => (
                  <div className="w-full">
                    <Input
                      {...field}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        onChange(file || null);
                      }}
                      error={!!error}
                      helperText={error?.message || t('form.basketImageHelperPrimary')}
                      fullWidth
                    />
                    {(() => {
                      const displaySrc =
                        fileImagePreview ||
                        (!(value instanceof File) && isEditMode
                          ? basketResponse?.data?.image || existingGallery[0]
                          : null);
                      return displaySrc ? (
                        <Box className="mt-2">
                          <img
                            src={displaySrc}
                            alt=""
                            className="max-h-32 max-w-xs rounded-xl border border-border/60 object-cover"
                          />
                        </Box>
                      ) : null;
                    })()}
                  </div>
                )}
              />
              <Typography variant="caption" className="mt-2 block text-muted-foreground">
                {t('form.basketAdditionalImagesLabel')}
              </Typography>
              <Controller
                name="images"
                control={control}
                render={({ field: { onChange, value, ...field }, fieldState: { error } }) => (
                  <div className="w-full">
                    <Input
                      {...field}
                      value=""
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/gif"
                      multiple
                      onChange={(e) => onChange(e.target.files ? Array.from(e.target.files) : [])}
                      error={!!error}
                      helperText={error?.message || t('form.basketAdditionalImagesHelper')}
                      fullWidth
                    />
                    {extraImagePreviews.length > 0 && (
                      <Box className="mt-2 flex flex-wrap gap-2">
                        {extraImagePreviews.map((u, i) => (
                          <img
                            key={`${u}-${i}`}
                            src={u}
                            alt=""
                            className="h-16 w-16 rounded-lg border border-border/60 object-cover"
                          />
                        ))}
                      </Box>
                    )}
                  </div>
                )}
              />
            </Box>
          </Box>
        </Box>

        {/* ── Section: Items ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-gradient-to-r from-emerald-500/[0.06] via-emerald-500/[0.02] to-transparent">
            <Box className="flex items-center gap-3">
              <Box className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Iconify icon="solar:cart-large-2-bold" className="text-emerald-500" width={15} />
              </Box>
              <Typography variant="subtitle2" className="font-semibold text-foreground">
                {t('form.basketItems')}
              </Typography>
            </Box>
            <Button type="button" variant="outlined" size="small" onClick={() => append({ shop_product_variant_id: 0, quantity: 1 })} className="text-xs">
              <Iconify icon="solar:add-circle-bold" width={16} className="mr-1" />
              {t('form.addBasketItem')}
            </Button>
          </Box>
          <Box className="p-6 flex flex-col gap-3">
            {fields.map((field, index) => (
              <Box key={field.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-background/60">
                <Box className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-semibold text-emerald-600">
                  {index + 1}
                </Box>
                <Box className="flex-1">
                  <Controller
                    name={`items.${index}.shop_product_variant_id`}
                    control={control}
                    render={({ field: f }) => {
                      const apiItems = basketResponse?.data?.items;
                      const lineFromApi = Array.isArray(apiItems) ? apiItems[index] : undefined;
                      const numericValue = Number(f.value) || 0;
                      return (
                        <InfiniteScrollSelect
                          value={numericValue}
                          onChange={(variantId) => f.onChange(Number(variantId) || 0)}
                          queryKey={['shopProductVariant', 'list', categoryIds.join(',')]}
                          fetcher={(page, limit) => {
                            const perPage = limit ?? 10;
                            if (!categoryIds.length) {
                              return Promise.resolve({
                                data: {
                                  items: page === 1 ? [{ id: 0, label: t('form.selectCategoryBeforeVariants') }] : [],
                                  pagination: { current_page: page, last_page: page, per_page: perPage, total: 0 },
                                },
                              });
                            }
                            if (categoryIds.length === 1) {
                              return _ShopProductVariantApi.getList({
                                page,
                                per_page: perPage,
                                category_id: categoryIds[0],
                              });
                            }
                            return _ShopProductVariantApi.getList({
                              page,
                              per_page: perPage,
                              category_ids: categoryIds,
                            });
                          }}
                          placeholder={t('form.variantId')}
                          initialLabel={basketLineVariantInitialLabel(lineFromApi as BasketItem | undefined)}
                          initialImage={resolveStorageImageUrl(
                            (lineFromApi as BasketItem | undefined)?.variant_image ??
                              (lineFromApi as BasketItem | undefined)?.product?.image
                          )}
                          getOptionImage={(item) => shopVariantOptionImage(item)}
                          getOptionColorHex={(item) => shopVariantOptionColorHex(item)}
                          disabled={categoryIds.length === 0}
                        />
                      );
                    }}
                  />
                  <FieldErrorText message={errors.items?.[index]?.shop_product_variant_id?.message} />
                </Box>
                <Box className="w-24 shrink-0">
                  <RHFTextField name={`items.${index}.quantity`} placeholder={t('form.quantity')} type="number" fullWidth />
                </Box>
                {fields.length > 1 && (
                  <Button type="button" variant="text" onClick={() => remove(index)} className="shrink-0 text-destructive">
                    <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                  </Button>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Section: Badges ── */}
        <Box className="rounded-2xl border border-border/50 bg-card/50 shadow-sm">
          <Box className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-sky-500/[0.06] via-sky-500/[0.02] to-transparent">
            <Box className="h-8 w-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Iconify icon="solar:medal-ribbons-star-bold" className="text-sky-500" width={15} />
            </Box>
            <Typography variant="subtitle2" className="font-semibold text-foreground">
              {t('form.badgesLabel')}
            </Typography>
          </Box>
          <Box className="p-6">
            <RHFBadgeSelector name="badges" label={t('form.badgesLabel')} />
          </Box>
        </Box>
      </CreateFormLayout>
    </>
  );
}
