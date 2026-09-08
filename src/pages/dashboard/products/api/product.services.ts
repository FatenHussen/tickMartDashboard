import type {
  ProductDetailData,
  ProductListResponse,
  ProductDetailResponse,
  ProductImportResponse,
  ProductCreateUpdatePayload,
  AdminProductVariantsListApiResponse,
} from '../types/product.types';

import { apiRoutes, axiosInstance } from '@/api';

import { _BrandApi } from './brand.services';
import {
  toVariantPayload,
  toVariantPayloadList,
  toShopVariantPayloadList,
} from '../utils/variant-payload';
import {
  buildProductsImportTemplateBlob,
  PRODUCT_IMPORT_TEMPLATE_FILENAME,
  sanitizeProductsImportFile,
} from '../utils/product-import-template';

// ----------------------------------------------------------------------

const getFilenameFromHeaders = (
  headers: Record<string, string>,
  fallback = 'products-import-template.xlsx'
): string => {
  const disposition = headers['content-disposition'] || headers['Content-Disposition'];
  const match = disposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (match) {
    const filename = match[1].replace(/['"]/g, '').trim();
    if (filename) {
      try {
        return decodeURIComponent(filename);
      } catch {
        return filename;
      }
    }
  }
  return fallback;
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
const splitKeywords = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const appendSeoKeywords = (formData: FormData, kw?: { en?: string; ar?: string }) => {
  if (!kw) return;
  splitKeywords(kw.en ?? '').forEach((w) => formData.append('seo_keywords[en][]', w));
  splitKeywords(kw.ar ?? '').forEach((w) => formData.append('seo_keywords[ar][]', w));
};

const appendVariantRows = (
  formData: FormData,
  rows: ProductCreateUpdatePayload['variants'] | undefined
) => {
  const variants = toVariantPayloadList(rows);
  if (variants.length === 0) return;
  variants.forEach((variant, vIndex) => {
    const cleaned = toVariantPayload(variant);
    if (!cleaned) return;
    if (cleaned.id) {
      formData.append(`variants[${vIndex}][id]`, String(cleaned.id));
    }
    (cleaned.attributes_values_ids ?? []).forEach((attrValueId, attrIndex) => {
      formData.append(
        `variants[${vIndex}][attributes_values_ids][${attrIndex}]`,
        String(attrValueId)
      );
    });
    // Always send kept image ids; omitting the key deletes every variant image.
    (cleaned.existing_images_ids ?? []).forEach((imgId, imgIndex) => {
      formData.append(`variants[${vIndex}][existing_images_ids][${imgIndex}]`, String(imgId));
    });
    (cleaned.images ?? []).forEach((file, imgIndex) => {
      if (file instanceof File) {
        formData.append(`variants[${vIndex}][images][${imgIndex}]`, file);
      }
    });
    if (cleaned.sku != null && String(cleaned.sku).trim() !== '') {
      formData.append(`variants[${vIndex}][sku]`, String(cleaned.sku).trim());
    }
    if (cleaned.model !== undefined) {
      formData.append(`variants[${vIndex}][model]`, cleaned.model ?? '');
    }
    if (cleaned.barcode != null && String(cleaned.barcode).trim() !== '') {
      formData.append(`variants[${vIndex}][barcode]`, String(cleaned.barcode).trim());
    }
    if (cleaned.price !== undefined) {
      formData.append(`variants[${vIndex}][price]`, String(cleaned.price));
    } else if (cleaned.price_syp !== undefined) {
      formData.append(`variants[${vIndex}][price_syp]`, String(cleaned.price_syp));
    }
    if (cleaned.quantity != null && !Number.isNaN(Number(cleaned.quantity))) {
      formData.append(`variants[${vIndex}][quantity]`, String(cleaned.quantity));
    }
    if (cleaned.discount_type !== undefined) {
      formData.append(`variants[${vIndex}][discount_type]`, cleaned.discount_type);
      formData.append(
        `variants[${vIndex}][discount]`,
        String(cleaned.discount_type === 'none' ? 0 : (cleaned.discount ?? 0))
      );
    } else if (cleaned.discount !== undefined) {
      formData.append(`variants[${vIndex}][discount]`, String(cleaned.discount));
    }
    if (cleaned.is_trend !== undefined) {
      formData.append(`variants[${vIndex}][is_trend]`, Number(cleaned.is_trend) === 1 ? '1' : '0');
    }
    if (cleaned.is_active !== undefined) {
      formData.append(`variants[${vIndex}][is_active]`, Number(cleaned.is_active) === 1 ? '1' : '0');
    }
  });
};

const appendShopVariantRows = (
  formData: FormData,
  rows: ProductCreateUpdatePayload['shop_variants'] | undefined
) => {
  const shopVariants = toShopVariantPayloadList(rows);
  if (shopVariants.length === 0) return;
  shopVariants.forEach((shopVariant, index) => {
    if (shopVariant.id) {
      formData.append(`shop_variants[${index}][id]`, String(shopVariant.id));
    }
    formData.append(`shop_variants[${index}][shop_id]`, String(shopVariant.shop_id));
    formData.append(`shop_variants[${index}][variant_index]`, String(shopVariant.variant_index));
    if (shopVariant.cost_price !== undefined && shopVariant.cost_price !== null) {
      formData.append(`shop_variants[${index}][cost_price]`, String(shopVariant.cost_price));
    }
  });
};

/** Optional FK select: send a positive id only. Never send `""` (MySQL integer error). */
const appendOptionalPositiveInt = (formData: FormData, key: string, value: unknown) => {
  if (value == null || value === '') return;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return;
  formData.append(key, String(n));
};

const buildProductFormData = (data: ProductCreateUpdatePayload): FormData => {
  const formData = new FormData();

  if (data.id != null && !Number.isNaN(Number(data.id))) {
    const pid = String(data.id);
    formData.append('id', pid);
    formData.append('product_id', pid);
  }

  formData.append('category_id', data.category_id.toString());
  formData.append('name[en]', data.name.en);
  formData.append('name[ar]', data.name.ar);
  formData.append('description[en]', data.description.en);
  formData.append('description[ar]', data.description.ar);
  if (data.price !== undefined && data.price !== null && !Number.isNaN(Number(data.price))) {
    formData.append('price', String(data.price));
  } else if (
    data.price_syp !== undefined &&
    data.price_syp !== null &&
    !Number.isNaN(Number(data.price_syp))
  ) {
    formData.append('price_syp', String(data.price_syp));
  }
  if (data.product_number != null && String(data.product_number).trim() !== '') {
    formData.append('product_number', String(data.product_number).trim());
  }
  formData.append('is_instant_delivery', data.is_instant_delivery.toString());

  formData.append('is_visible', String(data.is_visible ?? 1));
  appendOptionalPositiveInt(formData, 'brand_id', data.brand_id);

  const saleChannel =
    data.sale_channel === 'shop'
      ? 'shop'
      : data.sale_channel === 'platform'
        ? 'platform'
        : undefined;
  // Omit on name-only updates — sending platform again would re-bind the default branch.
  if (saleChannel != null) {
    formData.append('sale_channel', saleChannel);
  }
  // Platform / omitted channel: backend owns Tikmool vendor + default branch — do not send vendor_id.
  if (saleChannel === 'shop' && data.vendor_id != null && Number(data.vendor_id) > 0) {
    formData.append('vendor_id', String(data.vendor_id));
  }

  const discountType = data.discount_type ?? 'none';
  formData.append('discount_type', discountType);
  formData.append('discount', String(discountType === 'none' ? 0 : (data.discount ?? 0)));

  if (data.cost_price !== undefined && data.cost_price !== null) {
    formData.append('cost_price', String(data.cost_price));
  } else if (
    data.cost_price_syp !== undefined &&
    data.cost_price_syp !== null &&
    !Number.isNaN(Number(data.cost_price_syp))
  ) {
    formData.append('cost_price_syp', String(data.cost_price_syp));
  }
  if (
    data.quantity !== undefined &&
    data.quantity !== null &&
    !Number.isNaN(Number(data.quantity))
  ) {
    formData.append('quantity', String(data.quantity));
  }
  appendOptionalPositiveInt(formData, 'unit_id', data.unit_id);
  appendOptionalPositiveInt(formData, 'warranty_id', data.warranty_id);

  formData.append('full_description[en]', data.full_description?.en ?? '');
  formData.append('full_description[ar]', data.full_description?.ar ?? '');
  appendOptionalPositiveInt(formData, 'country_id', data.country_id);
  appendOptionalPositiveInt(formData, 'sale_country_id', data.sale_country_id);
  if (data.sku != null && String(data.sku).trim() !== '') {
    formData.append('sku', String(data.sku).trim());
  }
  formData.append('model', data.model ?? '');
  if (data.barcode != null && String(data.barcode).trim() !== '') {
    formData.append('barcode', String(data.barcode).trim());
  }
  formData.append('time_prepare', data.time_prepare ?? '');
  formData.append('delivery_time', data.delivery_time ?? '');
  const expiryTrimmed = data.expiry_date?.trim() ?? '';
  if (data.id != null) {
    formData.append('expiry_date', expiryTrimmed);
  } else if (expiryTrimmed) {
    formData.append('expiry_date', expiryTrimmed);
  }

  formData.append('seo_title[en]', data.seo_title?.en ?? '');
  formData.append('seo_title[ar]', data.seo_title?.ar ?? '');
  formData.append('seo_description[en]', data.seo_description?.en ?? '');
  formData.append('seo_description[ar]', data.seo_description?.ar ?? '');
  appendSeoKeywords(formData, data.seo_keywords);
  if (data.seo_image instanceof File) {
    formData.append('seo_image', data.seo_image);
  }

  if (data.thumbnail instanceof File) {
    formData.append('thumbnail', data.thumbnail);
  }

  // Send every kept gallery id; omitting the key entirely often makes Laravel drop all media on update.
  if (Array.isArray(data.existing_media_ids)) {
    data.existing_media_ids.forEach((mediaId) => {
      formData.append('existing_media_ids[]', String(mediaId));
    });
  }
  if (data.images && data.images.length > 0) {
    data.images.forEach((file) => {
      formData.append('media[]', file);
    });
  }

  (data.bought_with ?? []).forEach((productId, index) => {
    formData.append(`bought_with[${index}]`, String(productId));
  });

  // Whitelist-only. Empty arrays are omitted so the backend keeps current rows
  // (sending `variants: []` soft-deletes everything and seeds a default SKU).
  appendVariantRows(formData, data.variants);
  // Shop channel only. Platform / omitted channel: never send shop_variants
  // (name-only edit must leave existing links alone; platform convert rebinds on the backend).
  if (saleChannel === 'shop') {
    appendShopVariantRows(formData, data.shop_variants);
  }

  const validCategoryDetails = (data.category_details ?? []).filter(
    (d) => d.category_detail_id && d.category_detail_id > 0
  );
  if (validCategoryDetails.length > 0) {
    validCategoryDetails.forEach((detail, index) => {
      if (detail.id) {
        formData.append(`category_details[${index}][id]`, detail.id.toString());
      }
      formData.append(
        `category_details[${index}][category_detail_id]`,
        detail.category_detail_id.toString()
      );
      formData.append(`category_details[${index}][detail_value][en]`, detail.detail_value.en);
      formData.append(`category_details[${index}][detail_value][ar]`, detail.detail_value.ar);
    });
  }

  const extraRows = (data.extra_details ?? []).filter(
    (d: { product_extra_detail_id?: number }) =>
      d.product_extra_detail_id != null && Number(d.product_extra_detail_id) > 0
  );
  if (extraRows.length > 0) {
    extraRows.forEach((detail, index: number) => {
      if (detail.id) {
        formData.append(`extra_details[${index}][id]`, detail.id.toString());
      }
      formData.append(
        `extra_details[${index}][product_extra_detail_id]`,
        String(detail.product_extra_detail_id)
      );
      formData.append(
        `extra_details[${index}][quantity]`,
        String(detail.quantity ?? 1)
      );
      formData.append(`extra_details[${index}][price]`, String(detail.price));
    });
  }

  (data.badges ?? []).forEach((badgeId) => {
    formData.append('badges[]', String(badgeId));
  });

  (data.icon_ids ?? []).forEach((iconId) => {
    formData.append('icon_ids[]', String(iconId));
  });

  return formData;
};

export type ProductListQueryParams = {
  page?: number;
  per_page?: number;
  limit?: number;
  shop_id?: number;
  category_id?: number;
  brand_id?: number;
  vendor_id?: number;
  /** Single attribute filter (mutually exclusive with `category_attribute_ids` on the wire). */
  category_attribute_id?: number;
  /** Multiple attribute filters — serialized as `category_attribute_ids[]`. */
  category_attribute_ids?: number[];
  stock_sort?: 'asc' | 'desc';
  approval_status?: string;
  is_visible?: boolean | number | string;
  search?: string;
  /** When set, list is filtered to this product id (numeric search in UI). */
  id?: number;
  sort_field?: string;
  sort_order?: string;
  sortField?: string;
  sortOrder?: string;
  quantity_min?: number;
  quantity_max?: number;
};

function appendProductListParam(
  usp: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined | null
) {
  if (value === undefined || value === null || value === '') return;
  usp.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
}

// ----------------------------------------------------------------------

export const _ProductApi = {
  getListProducts: async (params?: ProductListQueryParams): Promise<ProductListResponse> => {
    const {
      sort_field,
      sort_order,
      sortField,
      sortOrder,
      limit,
      per_page,
      category_attribute_id,
      category_attribute_ids,
      stock_sort,
      ...rest
    } = params ?? {};

    const usp = new URLSearchParams();

    Object.entries(rest).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      appendProductListParam(usp, k, v as string | number | boolean);
    });

    appendProductListParam(usp, 'per_page', per_page ?? limit);

    const sf = sortField ?? sort_field;
    const so = sortOrder ?? sort_order;
    appendProductListParam(usp, 'sort_field', sf as string | undefined);
    appendProductListParam(usp, 'sort_order', so as string | undefined);

    appendProductListParam(usp, 'stock_sort', stock_sort);

    const multiIds = (category_attribute_ids ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (multiIds.length > 1) {
      multiIds.forEach((id) => usp.append('category_attribute_ids[]', String(id)));
    } else if (multiIds.length === 1) {
      appendProductListParam(usp, 'category_attribute_id', multiIds[0]);
    } else if (category_attribute_id != null && !Number.isNaN(Number(category_attribute_id))) {
      appendProductListParam(usp, 'category_attribute_id', Number(category_attribute_id));
    }

    const qs = usp.toString();
    const url = qs ? `${apiRoutes.product.list}?${qs}` : apiRoutes.product.list;
    const response = await axiosInstance.get<ProductListResponse>(url);
    return response.data;
  },

  getProductById: async (id: number | string): Promise<ProductDetailData> => {
    const response = await axiosInstance.get<ProductDetailResponse>(apiRoutes.product.details(id));
    return response.data.data;
  },

  getProductVariants: async (
    productId: number | string,
    params?: {
      page?: number;
      per_page?: number;
      price_min?: number;
      price_max?: number;
      quantity_min?: number;
      quantity_max?: number;
    }
  ): Promise<AdminProductVariantsListApiResponse['data']> => {
    const response = await axiosInstance.get<AdminProductVariantsListApiResponse>(
      apiRoutes.product.variants(productId),
      {
        params: {
          page: params?.page ?? 1,
          per_page: params?.per_page ?? 10,
          ...(params?.price_min != null ? { price_min: params.price_min } : {}),
          ...(params?.price_max != null ? { price_max: params.price_max } : {}),
          ...(params?.quantity_min != null ? { quantity_min: params.quantity_min } : {}),
          ...(params?.quantity_max != null ? { quantity_max: params.quantity_max } : {}),
        },
      }
    );
    const body = response.data;
    const inner = body?.data;
    return {
      items: Array.isArray(inner?.items) ? inner.items : [],
      pagination: inner?.pagination ?? {
        current_page: 1,
        last_page: 1,
        per_page: params?.per_page ?? 10,
        total: 0,
      },
    };
  },

  createProduct: async (data: ProductCreateUpdatePayload): Promise<any> => {
    const formData = buildProductFormData(data);
    // Do not set Content-Type manually — browser/axios must add multipart boundary or Laravel may not parse files/arrays.
    const response = await axiosInstance.post(apiRoutes.product.create, formData, {
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return response.data;
  },

  updateProduct: async (id: number | string, data: ProductCreateUpdatePayload): Promise<any> => {
    const numericId = typeof id === 'string' ? Number(id) : id;
    const formData = buildProductFormData({
      ...data,
      id: Number.isNaN(numericId) ? data.id : numericId,
    });
    // PHP only parses multipart bodies for POST. PUT + multipart often arrives empty on the server
    // unless we spoof: POST with _method=PUT (Laravel route still matches Route::put).
    formData.append('_method', 'PUT');
    const response = await axiosInstance.post(apiRoutes.product.update(id), formData, {
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return response.data;
  },

  /**
   * Send a targeted product update containing ONLY variants/shop_variants nested arrays.
   * Skips every other product field so backend leaves them untouched. Used to add a single
   * new variant (or shop variant) to an existing product without touching the rest.
   */
  updateProductVariantsOnly: async (
    id: number | string,
    payload: {
      variants?: NonNullable<ProductCreateUpdatePayload['variants']>;
      shop_variants?: NonNullable<ProductCreateUpdatePayload['shop_variants']>;
      category_id?: number;
    }
  ): Promise<any> => {
    const formData = new FormData();
    // Omit the key entirely when the caller didn't pass that array so the backend
    // leaves existing rows alone. Never send `[]` from this helper.
    if (payload.variants !== undefined) {
      appendVariantRows(formData, payload.variants);
    }
    if (payload.shop_variants !== undefined) {
      appendShopVariantRows(formData, payload.shop_variants);
    }

    formData.append('_method', 'PUT');
    const response = await axiosInstance.post(apiRoutes.product.update(id), formData, {
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return response.data;
  },

  deleteProduct: async (id: number | string): Promise<any> => {
    const response = await axiosInstance.delete(apiRoutes.product.delete(id));
    return response.data;
  },

  approveProduct: async (id: number | string): Promise<any> => {
    const response = await axiosInstance.post(apiRoutes.product.approve(id));
    return response.data;
  },

  rejectProduct: async (id: number | string, rejection_reason: string): Promise<any> => {
    const response = await axiosInstance.post(apiRoutes.product.reject(id), { rejection_reason });
    return response.data;
  },

  updateProductPrice: async (id: number | string, price: number): Promise<any> => {
    const formData = new FormData();
    formData.append('price', String(price));
    formData.append('_method', 'PUT');
    const response = await axiosInstance.post(apiRoutes.product.update(id), formData);
    return response.data;
  },

  updateProductQuantity: async (id: number | string, quantity: number): Promise<any> => {
    const formData = new FormData();
    formData.append('quantity', String(quantity));
    formData.append('_method', 'PUT');
    const response = await axiosInstance.post(apiRoutes.product.update(id), formData);
    return response.data;
  },

  /** Download the fixed SPBS Excel import template (API, then local fallback). */
  downloadImportTemplate: async (): Promise<void> => {
    try {
      const response = await axiosInstance.get(apiRoutes.product.importTemplate, {
        responseType: 'blob',
        skipErrorToast: true,
        headers: {
          Accept:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream',
        },
      });
      const blob = response.data as Blob;
      const isFile =
        blob instanceof Blob &&
        blob.size > 0 &&
        !/json|html|text\/plain/i.test(blob.type || '');
      if (!isFile) {
        throw new Error('invalid-template-payload');
      }
      const filename = getFilenameFromHeaders(
        response.headers as unknown as Record<string, string>,
        PRODUCT_IMPORT_TEMPLATE_FILENAME
      );
      triggerBlobDownload(blob, filename);
    } catch {
      triggerBlobDownload(
        buildProductsImportTemplateBlob(),
        PRODUCT_IMPORT_TEMPLATE_FILENAME
      );
    }
  },

  /** Upload a products Excel file (fixed columns — no UI mapping). */
  importProducts: async (file: File): Promise<ProductImportResponse> => {
    let brands: Array<{ name?: unknown }> = [];
    try {
      const list = await _BrandApi.getListBrands({ page: 1, per_page: 1000 });
      brands = list?.data?.items ?? [];
    } catch {
      brands = [];
    }
    const sanitized = await sanitizeProductsImportFile(file, brands);
    const formData = new FormData();
    formData.append('file', sanitized);
    const response = await axiosInstance.post<ProductImportResponse>(
      apiRoutes.product.import,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );
    return response.data;
  },
};
