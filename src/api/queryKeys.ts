// ----------------------------------------------------------------------

export const queryKeys = {
  // Column order
  columnOrder: () => ['column_order'] as const,
  // Admin query keys
  admin: {
    list: (params?: { page?: number; limit?: number }) => ['admin', 'list', params] as const,
    details: (id: number | string) => ['admin', 'details', id] as const,
  },
  // Vendor query keys
  vendor: {
    list: (params?: { page?: number; limit?: number }) => ['vendor', 'list', params] as const,
    details: (id: number | string) => ['vendor', 'details', id] as const,
  },
  // Shop query keys
  shop: {
    list: (params?: {
      page?: number;
      limit?: number;
      vendor_id?: number;
      shop_status?: string;
      shop_type?: string;
      is_restaurant?: 0 | 1 | boolean;
    }) => ['shop', 'list', params] as const,
    details: (id: number | string) => ['shop', 'details', id] as const,
  },
  // Auth query keys
  auth: {
    profile: () => ['auth', 'profile'] as const,
    notifications: () => ['auth', 'notifications'] as const,
  },
  // Role query keys
  role: {
    list: (params?: { page?: number; limit?: number; search?: string }) => ['role', 'list', params] as const,
    details: (id: number | string) => ['role', 'details', id] as const,
  },
  // Permission query keys
  permission: {
    list: (params?: { page?: number; limit?: number; per_page?: number }) =>
      ['permission', 'list', params] as const,
  },
  // Driver query keys
  driver: {
    list: (params?: {
      page?: number;
      limit?: number;
      status?: string;
      is_active?: number;
    }) => ['driver', 'list', params] as const,
    details: (id: number | string) => ['driver', 'details', id] as const,
  },
  // Brand query keys
  brand: {
    list: (params?: Record<string, unknown>) => ['brand', 'list', params] as const,
    details: (id: number | string) => ['brand', 'details', id] as const,
  },
  // Unit (measurement) query keys
  unit: {
    list: (params?: Record<string, unknown>) => ['unit', 'list', params] as const,
    details: (id: number | string) => ['unit', 'details', id] as const,
  },
  warranty: {
    list: (params?: Record<string, unknown>) => ['warranty', 'list', params] as const,
    details: (id: number | string) => ['warranty', 'details', id] as const,
  },
  // Product query keys (admin `/admin/products` list filters)
  product: {
    list: (params?: Record<string, unknown>) => ['product', 'list', params] as const,
    details: (id: number | string) => ['product', 'details', id] as const,
    variants: (
      id: number | string,
      params?: {
        page?: number;
        per_page?: number;
        price_min?: number;
        price_max?: number;
        quantity_min?: number;
        quantity_max?: number;
      }
    ) => ['product', 'variants', id, params] as const,
  },
  // Governorate query keys
  governorate: {
    list: (params?: { page?: number; limit?: number }) => ['governorate', 'list', params] as const,
    details: (id: number | string) => ['governorate', 'details', id] as const,
  },
  // City query keys
  city: {
    list: (params?: { page?: number; limit?: number }) => ['city', 'list', params] as const,
    details: (id: number | string) => ['city', 'details', id] as const,
  },
  // Area query keys
  area: {
    list: (params?: { page?: number; limit?: number }) => ['area', 'list', params] as const,
    details: (id: number | string) => ['area', 'details', id] as const,
  },
  // Category query keys
  category: {
    list: (params?: {
      page?: number;
      limit?: number;
      parent_id?: number | null;
      category_id?: number;
      sort_field?: string;
      sort_order?: 'asc' | 'desc';
      search?: string;
      name?: string;
      is_active?: 0 | 1 | boolean;
      is_restaurant?: 0 | 1 | boolean;
    }) => ['category', 'list', params] as const,
    details: (id: number | string) => ['category', 'details', id] as const,
    deleteImpact: (id: number | string) => ['category', 'delete-impact', id] as const,
    linkedItems: (id: number | string, page: number, perPage: number) =>
      ['category', 'linked-items', id, page, perPage] as const,
  },
  // Category Attribute query keys
  categoryAttribute: {
    list: (params?: Record<string, unknown>) => ['categoryattribute', 'list', params] as const,
    details: (id: number | string) => ['categoryattribute', 'details', id] as const,
    deleteImpact: (id: number | string) => ['categoryattribute', 'delete-impact', id] as const,
    linkedItems: (id: number | string, page: number, perPage: number) =>
      ['categoryattribute', 'linked-items', id, page, perPage] as const,
  },
  // Category Detail query keys
  categoryDetail: {
    list: (params?: { page?: number; limit?: number }) =>
      ['categorydetail', 'list', params] as const,
    details: (id: number | string) => ['categorydetail', 'details', id] as const,
  },
  productExtraDetail: {
    list: (params?: Record<string, unknown>) =>
      ['productextradetail', 'list', params] as const,
    details: (id: number | string) => ['productextradetail', 'details', id] as const,
  },
  // Service query keys
  service: {
    list: (params?: { page?: number; limit?: number }) => ['service', 'list', params] as const,
    details: (id: number | string) => ['service', 'details', id] as const,
  },
  // Language query keys
  language: {
    list: (params?: { page?: number; limit?: number; code?: string; is_active?: number; direction?: string }) => ['language', 'list', params] as const,
    details: (id: number | string) => ['language', 'details', id] as const,
  },
  // Section query keys
  section: {
    list: (params?: {
      page?: number;
      per_page?: number;
      limit?: number;
      search?: string;
      content_type?: string;
      type?: string;
      is_active?: 0 | 1;
      category_id?: number;
    }) => ['section', 'list', params] as const,
    details: (id: number | string) => ['section', 'details', id] as const,
    itemTypes: () => ['section', 'item-types'] as const,
    manualItems: (manualModel: string, url: string, params?: { page?: number; limit?: number; search?: string }) =>
      ['section', 'manual-items', manualModel, url, params] as const,
  },
  // User query keys
  user: {
    list: (params?: {
      page?: number;
      per_page?: number;
      affiliate_approved?: number;
      area_id?: number;
    }) => ['user', 'list', params] as const,
    details: (id: number | string) => ['user', 'details', id] as const,
  },
  // Complaint query keys
  complaint: {
    list: (params?: { page?: number; per_page?: number; status?: string; user_id?: number }) =>
      ['complaint', 'list', params] as const,
    details: (id: number | string) => ['complaint', 'details', id] as const,
  },
  // Coupon query keys
  coupon: {
    list: (params?: { page?: number; per_page?: number }) => ['coupon', 'list', params] as const,
    details: (id: number | string) => ['coupon', 'details', id] as const,
  },
  // Banner query keys
  banner: {
    list: (params?: { page?: number; per_page?: number }) => ['banner', 'list', params] as const,
    details: (id: number | string) => ['banner', 'details', id] as const,
  },
  // Page Builder query keys (unified CMS page CRUD)
  pageBuilder: {
    /**
     * `type` and `category_id` are part of the cache identity, not decoration: the Pages screen
     * runs the same endpoint per tab, so omitting them here would collide content with category rows.
     */
    list: (params?: {
      page?: number;
      per_page?: number;
      search?: string;
      sort_field?: string;
      sort_order?: string;
      type?: 'content' | 'category';
      category_id?: number;
    }) => ['pageBuilder', 'list', params] as const,
    listAll: () => ['pageBuilder', 'list', 'all'] as const,
    details: (id: number | string) => ['pageBuilder', 'details', id] as const,
    sliders: (pageId: number | string, params?: Record<string, unknown>) =>
      ['pageBuilder', 'sliders', pageId, params] as const,
  },
  // Page Section query keys
  pageSection: {
    list: (params?: { page?: number; limit?: number; search?: string }) => ['pageSection', 'list', params] as const,
    details: (id: number | string) => ['pageSection', 'details', id] as const,
    pages: () => ['pageSection', 'pages'] as const,
    pagePreview: (id: number | string, paramsKey?: string) =>
      ['pageSection', 'pagePreview', id, paramsKey ?? ''] as const,
    displayTypes: (manualModel?: string, pageId?: number | string) =>
      ['pageSection', 'displayTypes', manualModel ?? '', pageId ?? ''] as const,
  },
  // Order query keys
  order: {
    list: (params?: {
      page?: number;
      per_page?: number;
      status?: string;
      search?: string;
      driver_id?: number;
      sort_field?: string;
      sort_order?: 'asc' | 'desc';
    }) =>
      ['order', 'list', params] as const,
    details: (id: number | string) => ['order', 'details', id] as const,
    toAssign: (params: {
      driverId: number;
      filterByDriverCoverage: boolean;
      status?: 'pending' | 'preparing';
      isInstantDelivery: boolean;
    }) => ['order', 'to-assign', params] as const,
  },
  // Basket query keys
  basket: {
    list: (params?: { page?: number; per_page?: number }) => ['basket', 'list', params] as const,
    details: (id: number | string) => ['basket', 'details', id] as const,
  },
  // Scheduled Basket query keys
  scheduledBasket: {
    list: (params?: {
      page?: number;
      per_page?: number;
      search?: string;
      category_id?: number;
      schedule_id?: number;
      sort_field?: string;
      sort_order?: string;
    }) => ['scheduledBasket', 'list', params] as const,
    details: (id: number | string) => ['scheduledBasket', 'details', id] as const,
  },
  // Package query keys
  package: {
    list: (params?: { page?: number; per_page?: number }) => ['package', 'list', params] as const,
    details: (id: number | string) => ['package', 'details', id] as const,
  },
  // Subscription query keys (GET /admin/subscriptions — list + show only)
  subscription: {
    list: (params?: {
      page?: number;
      per_page?: number;
      user_id?: number;
      package_id?: number;
      status?: string;
      start_date_from?: string;
      start_date_to?: string;
      search?: string;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    }) => ['subscription', 'list', params] as const,
    details: (id: number | string) => ['subscription', 'details', id] as const,
  },
  // Gift query keys
  gift: {
    list: (params?: {
      page?: number;
      per_page?: number;
      search?: string;
      category_id?: number;
    }) => ['gift', 'list', params] as const,
    details: (id: number | string) => ['gift', 'details', id] as const,
  },
  // User Gift query keys
  userGift: {
    list: (params?: Record<string, unknown>) => ['userGift', 'list', params] as const,
    details: (id: number | string) => ['userGift', 'details', id] as const,
  },
  // Point Exchange query keys
  pointExchange: {
    list: (params?: { page?: number; per_page?: number }) => ['pointExchange', 'list', params] as const,
    details: (id: number | string) => ['pointExchange', 'details', id] as const,
  },
  // User Points query keys
  userPoints: {
    list: (params?: { page?: number; per_page?: number }) => ['userPoints', 'list', params] as const,
    details: (userId: number | string) => ['userPoints', 'details', userId] as const,
    transactions: (userId: number | string, params?: { page?: number; per_page?: number }) =>
      ['userPoints', 'transactions', userId, params] as const,
    statistics: () => ['userPoints', 'statistics'] as const,
  },
  // Currency query keys
  currency: {
    list: (params?: { page?: number; per_page?: number }) => ['currency', 'list', params] as const,
    details: (id: number | string) => ['currency', 'details', id] as const,
  },
  // Recipe query keys
  recipe: {
    list: (params?: { page?: number; per_page?: number; search?: string }) => ['recipe', 'list', params] as const,
    details: (id: number | string) => ['recipe', 'details', id] as const,
  },
  // Product Variant query keys
  productVariant: {
    list: (params?: Record<string, unknown>) => ['productVariant', 'list', params] as const,
    details: (id: number | string) => ['productVariant', 'details', id] as const,
  },
  // Shop Product Variant query keys (shared - used in selects)
  shopProductVariant: {
    list: (params?: { page?: number; per_page?: number }) =>
      ['shopProductVariant', 'list', params] as const,
  },
  // Legal Document query keys
  legalDocument: {
    list: (params?: {
      page?: number;
      per_page?: number;
      search?: string;
      key?: string;
      sort_field?: 'id' | 'key' | 'created_at' | 'updated_at';
      sort_order?: 'asc' | 'desc';
    }) =>
      ['legalDocument', 'list', params] as const,
    details: (id: number | string) => ['legalDocument', 'details', id] as const,
  },
  // FAQ query keys
  faq: {
    list: (params?: { page?: number; per_page?: number; type?: string }) =>
      ['faq', 'list', params] as const,
    details: (id: number | string) => ['faq', 'details', id] as const,
  },
  contactMethod: {
    list: (params?: Record<string, unknown>) => ['contactMethod', 'list', params] as const,
    details: (id: number | string) => ['contactMethod', 'details', id] as const,
  },
  // Vendor Subscription query keys
  vendorSubscription: {
    list: (params?: Record<string, any>) => ['vendorSubscription', 'list', params] as const,
    details: (id: number | string) => ['vendorSubscription', 'details', id] as const,
  },
  // Admin Notification query keys
  adminNotification: {
    list: (params?: {
      page?: number;
      per_page?: number;
      search?: string;
      type?: string;
      sort_field?: string;
      sort_order?: string;
    }) => ['adminNotification', 'list', params] as const,
    details: (id: number | string) => ['adminNotification', 'details', id] as const,
  },
  // Vendor Package query keys
  vendorPackage: {
    list: (params?: {
      page?: number;
      per_page?: number;
      sort_field?: string;
      sort_order?: string;
      is_active?: number;
      min_price?: number;
      max_price?: number;
      slug?: string;
      search?: string;
    }) => ['vendorPackage', 'list', params] as const,
    details: (id: number | string) => ['vendorPackage', 'details', id] as const,
  },
  // Vendor User query keys
  vendorUser: {
    list: (params?: { page?: number; per_page?: number; search?: string }) =>
      ['vendorUser', 'list', params] as const,
    details: (id: number | string) => ['vendorUser', 'details', id] as const,
  },
  // Seller Registration query keys
  sellerRegistration: {
    list: (params?: { page?: number; per_page?: number }) =>
      ['sellerRegistration', 'list', params] as const,
    details: (id: number | string) => ['sellerRegistration', 'details', id] as const,
  },
  // Setting query keys
  setting: {
    list: (params?: { page?: number; per_page?: number }) => ['setting', 'list', params] as const,
    details: (key: string) => ['setting', 'details', key] as const,
  },
  // Badge query keys
  badge: {
    list: (params?: { page?: number; per_page?: number }) => ['badge', 'list', params] as const,
    details: (id: number | string) => ['badge', 'details', id] as const,
  },
  // Activity Log query keys
  activityLog: {
    list: (params?: { page?: number; per_page?: number; action?: string; model?: string }) =>
      ['activityLog', 'list', params] as const,
  },
  // Affiliate Withdraw Request query keys
  affiliateWithdraw: {
    list: (params?: Record<string, any>) => ['affiliateWithdraw', 'list', params] as const,
    details: (id: number | string) => ['affiliateWithdraw', 'details', id] as const,
  },
  affiliateWalletTransaction: {
    list: (params?: Record<string, unknown>) =>
      ['affiliateWalletTransaction', 'list', params] as const,
    details: (id: number | string) => ['affiliateWalletTransaction', 'details', id] as const,
  },
  driverWalletTransaction: {
    list: (params?: Record<string, unknown>) =>
      ['driverWalletTransaction', 'list', params] as const,
    details: (id: number | string) => ['driverWalletTransaction', 'details', id] as const,
  },
  // Icon query keys
  icon: {
    list: (params?: { page?: number; per_page?: number }) => ['icon', 'list', params] as const,
    details: (id: number | string) => ['icon', 'details', id] as const,
  },
  // Color query keys
  color: {
    list: (params?: Record<string, unknown>) => ['color', 'list', params] as const,
    details: (id: number | string) => ['color', 'details', id] as const,
  },
  // Promotion query keys
  promotion: {
    list: (params?: { page?: number; per_page?: number; search?: string }) => ['promotion', 'list', params] as const,
    details: (id: number | string) => ['promotion', 'details', id] as const,
  },
  // Country query keys
  country: {
    list: (params?: { page?: number; per_page?: number }) => ['country', 'list', params] as const,
    details: (id: number | string) => ['country', 'details', id] as const,
  },
  // Sale country (markets) — list used in product forms; toggle invalidates selects when wired with useQuery
  saleCountry: {
    list: (params?: { page?: number; per_page?: number; is_active?: number | string }) =>
      ['saleCountry', 'list', params] as const,
    details: (id: number | string) => ['saleCountry', 'details', id] as const,
  },
  // Promotion Request query keys
  promotionRequest: {
    list: (params?: { page?: number; per_page?: number; status?: string; search?: string }) =>
      ['promotionRequest', 'list', params] as const,
    details: (id: number | string) => ['promotionRequest', 'details', id] as const,
  },
  // Custom order request query keys
  customOrderRequest: {
    list: (params?: Record<string, unknown>) => ['customOrderRequest', 'list', params] as const,
    details: (id: number | string) => ['customOrderRequest', 'details', id] as const,
  },
  // Point Rule query keys
  pointRule: {
    list: (params?: { page?: number; per_page?: number }) => ['pointRule', 'list', params] as const,
    details: (id: number | string) => ['pointRule', 'details', id] as const,
  },
  deliveryDistanceRange: {
    list: (params?: { page?: number; per_page?: number }) =>
      ['deliveryDistanceRange', 'list', params] as const,
    details: (id: number | string) => ['deliveryDistanceRange', 'details', id] as const,
  },
  // Schedule query keys
  schedule: {
    list: (params?: Record<string, unknown>) => ['schedule', 'list', params] as const,
    details: (id: number | string) => ['schedule', 'details', id] as const,
  },
  // User Basket Schedule query keys
  userBasketSchedule: {
    list: (params?: { page?: number; per_page?: number }) =>
      ['userBasketSchedule', 'list', params] as const,
    details: (id: number | string) => ['userBasketSchedule', 'details', id] as const,
  },
  // Report query keys
  report: {
    sales: (params?: object) => ['report', 'sales', params] as const,
    productMovement: (params?: object) => ['report', 'productMovement', params] as const,
    vendorPerformance: (id: number | string, params?: object) =>
      ['report', 'vendorPerformance', id, params] as const,
    driverPerformance: (id: number | string, params?: object) =>
      ['report', 'driverPerformance', id, params] as const,
    salesByLocation: (params?: object) => ['report', 'salesByLocation', params] as const,
    salesByCategory: (params?: object) => ['report', 'salesByCategory', params] as const,
  },
  // Vendor Service Type query keys
  vendorServiceType: {
    list: (params?: Record<string, unknown>) => ['vendorServiceType', 'list', params] as const,
    details: (id: number | string) => ['vendorServiceType', 'details', id] as const,
  },
  // Vendor Service query keys
  vendorService: {
    list: (params?: Record<string, unknown>) => ['vendorService', 'list', params] as const,
    details: (id: number | string) => ['vendorService', 'details', id] as const,
  },
  // Shop Vendor Service query keys
  shopVendorService: {
    list: (params?: Record<string, unknown>) => ['shopVendorService', 'list', params] as const,
    details: (id: number | string) => ['shopVendorService', 'details', id] as const,
  },
  // Service Order query keys
  serviceOrder: {
    list: (params?: Record<string, unknown>) => ['serviceOrder', 'list', params] as const,
    details: (id: number | string) => ['serviceOrder', 'details', id] as const,
  },
  // Quick Action query keys
  quickAction: {
    list: (params?: Record<string, unknown>) => ['quickAction', 'list', params] as const,
    details: (id: number | string) => ['quickAction', 'details', id] as const,
  },
  // Navigation menu item query keys (storefront top bar)
  navMenuItem: {
    list: (params?: Record<string, unknown>) => ['navMenuItem', 'list', params] as const,
    details: (id: number | string) => ['navMenuItem', 'details', id] as const,
    routeKeys: () => ['navMenuItem', 'routeKeys'] as const,
  },
  // Popup Campaign query keys
  popupCampaign: {
    list: (params?: Record<string, unknown>) => ['popupCampaign', 'list', params] as const,
    details: (id: number | string) => ['popupCampaign', 'details', id] as const,
  },
  // Flash Sale query keys
  flashSale: {
    list: (params?: Record<string, unknown>) => ['flashSale', 'list', params] as const,
    details: (id: number | string) => ['flashSale', 'details', id] as const,
  },
  // Vendor Accounting query keys
  vendorAccounting: {
    summary: (params?: Record<string, unknown>) =>
      ['vendorAccounting', 'summary', params] as const,
    vendors: (params?: Record<string, unknown>) =>
      ['vendorAccounting', 'vendors', params] as const,
    vendorStatement: (id: number | string, params?: Record<string, unknown>) =>
      ['vendorAccounting', 'vendorStatement', id, params] as const,
  },
  // Vendor Withdraw Request query keys
  vendorWithdrawRequest: {
    list: (params?: Record<string, unknown>) =>
      ['vendorWithdrawRequest', 'list', params] as const,
    details: (id: number | string) => ['vendorWithdrawRequest', 'details', id] as const,
  },
  // Statistics query keys
  statistics: {
    dashboard: (params?: Record<string, unknown>) => ['statistics', 'dashboard', params] as const,
    counts: (params?: Record<string, unknown>) => ['statistics', 'counts', params] as const,
    monthlyPerformance: (params?: Record<string, unknown>) =>
      ['statistics', 'monthlyPerformance', params] as const,
    ordersByStatus: (params?: Record<string, unknown>) => ['statistics', 'ordersByStatus', params] as const,
    topShops: (params?: Record<string, unknown>) => ['statistics', 'topShops', params] as const,
    revenueTrend: (params?: Record<string, unknown>) =>
      ['statistics', 'revenueTrend', params] as const,
    ordersByHour: (params?: Record<string, unknown>) => ['statistics', 'ordersByHour', params] as const,
    ordersByDay: (params?: Record<string, unknown>) => ['statistics', 'ordersByDay', params] as const,
    topCategories: (params?: Record<string, unknown>) =>
      ['statistics', 'topCategories', params] as const,
    userGrowth: (params?: Record<string, unknown>) => ['statistics', 'userGrowth', params] as const,
    orderFunnel: (params?: Record<string, unknown>) => ['statistics', 'orderFunnel', params] as const,
    avgOrderValueTrend: (params?: Record<string, unknown>) =>
      ['statistics', 'avgOrderValueTrend', params] as const,
    driverComparison: (params?: Record<string, unknown>) =>
      ['statistics', 'driverComparison', params] as const,
    stockLevels: (params?: Record<string, unknown>) => ['statistics', 'stockLevels', params] as const,
    salesHeatmap: (params?: Record<string, unknown>) => ['statistics', 'salesHeatmap', params] as const,
  },
} as const;
