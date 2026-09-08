import { ROOTS } from 'src/routes/paths';

// ----------------------------------------------------------------------

export const apiRoutes = {
  // Auth routes
  auth: {
    me: '/admin/auth/me',
    signIn: '/admin/auth/login',
    logout: '/admin/auth/logout',
    profile: '/admin/auth/profile',
    notifications: '/admin/auth/notifications',
    storeToken: '/admin/auth/store-token',
  },
  // Admin routes
  admin: {
    list: `${ROOTS.ADMIN}/admins`,
    create: `${ROOTS.ADMIN}/admins`,
    update: (id: number | string) => `${ROOTS.ADMIN}/admins/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/admins/${id}`,
    /** Unified visibility / active flag for many models (body: type, id, is_active). */
    toggleStatus: `${ROOTS.ADMIN}/toggle-status`,
  },
  // Vendor routes
  vendor: {
    list: `${ROOTS.ADMIN}/vendors`,
    create: `${ROOTS.ADMIN}/vendors`,
    update: (id: number | string) => `${ROOTS.ADMIN}/vendors/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/vendors/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/vendors/${id}`,
  },
  // Shop routes
  shop: {
    list: `${ROOTS.ADMIN}/shops`,
    create: `${ROOTS.ADMIN}/shops`,
    update: (id: number | string) => `${ROOTS.ADMIN}/shops/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/shops/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/shops/${id}`,
  },
  // Role routes
  role: {
    list: `${ROOTS.ADMIN}/roles`,
    create: `${ROOTS.ADMIN}/roles`,
    update: (id: number | string) => `${ROOTS.ADMIN}/roles/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/roles/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/roles/${id}`,
  },
  // Permission routes
  permission: {
    list: `${ROOTS.ADMIN}/permissions`,
  },
  // Driver routes
  driver: {
    list: `${ROOTS.ADMIN}/drivers`,
    create: `${ROOTS.ADMIN}/drivers`,
    update: (id: number | string) => `${ROOTS.ADMIN}/drivers/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/drivers/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/drivers/${id}`,
  },
  // Brand routes
  brand: {
    list: `${ROOTS.ADMIN}/brands`,
    create: `${ROOTS.ADMIN}/brands`,
    update: (id: number | string) => `${ROOTS.ADMIN}/brands/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/brands/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/brands/${id}`,
    /** Persist drag-and-drop ordering. Body: `{ ordered_ids: number[] }`. */
    sort: `${ROOTS.ADMIN}/brands/sort`,
  },
  // Product unit routes (admin CRUD; `name` is `{ ar, en }` JSON)
  unit: {
    list: `${ROOTS.ADMIN}/units`,
    create: `${ROOTS.ADMIN}/units`,
    update: (id: number | string) => `${ROOTS.ADMIN}/units/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/units/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/units/${id}`,
  },
  warranty: {
    list: `${ROOTS.ADMIN}/warranties`,
    create: `${ROOTS.ADMIN}/warranties`,
    update: (id: number | string) => `${ROOTS.ADMIN}/warranties/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/warranties/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/warranties/${id}`,
  },
  // Governorate routes
  governorate: {
    list: `${ROOTS.ADMIN}/governorates`,
    create: `${ROOTS.ADMIN}/governorates`,
    update: (id: number | string) => `${ROOTS.ADMIN}/governorates/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/governorates/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/governorates/${id}`,
  },
  // City routes
  city: {
    list: `${ROOTS.ADMIN}/cities`,
    create: `${ROOTS.ADMIN}/cities`,
    update: (id: number | string) => `${ROOTS.ADMIN}/cities/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/cities/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/cities/${id}`,
  },
  // Area routes
  area: {
    list: `${ROOTS.ADMIN}/areas`,
    create: `${ROOTS.ADMIN}/areas`,
    update: (id: number | string) => `${ROOTS.ADMIN}/areas/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/areas/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/areas/${id}`,
  },
  // Category routes
  category: {
    list: `${ROOTS.ADMIN}/categories`,
    create: `${ROOTS.ADMIN}/categories`,
    update: (id: number | string) => `${ROOTS.ADMIN}/categories/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/categories/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/categories/${id}`,
    /** Persist drag-and-drop ordering. Body: `{ ordered_ids: number[], parent_id?: number }`. */
    sort: `${ROOTS.ADMIN}/categories/sort`,
    /** Preview of what a delete would affect (children/products/baskets/pages/recipes). */
    deleteImpact: (id: number | string) => `${ROOTS.ADMIN}/categories/${id}/delete-impact`,
    /** Paginated linked entities that would be affected by deleting this category. */
    linkedItems: (id: number | string) => `${ROOTS.ADMIN}/categories/${id}/linked-items`,
  },
  // Category Attribute routes
  categoryAttribute: {
    list: `${ROOTS.ADMIN}/category-attributes`,
    create: `${ROOTS.ADMIN}/category-attributes`,
    update: (id: number | string) => `${ROOTS.ADMIN}/category-attributes/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/category-attributes/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/category-attributes/${id}`,
    /** Preview of what a delete would affect (values/variants/products/orders). */
    deleteImpact: (id: number | string) => `${ROOTS.ADMIN}/category-attributes/${id}/delete-impact`,
    /** Paginated product variants currently using this attribute's values. */
    linkedItems: (id: number | string) => `${ROOTS.ADMIN}/category-attributes/${id}/linked-items`,
  },
  // Category Details routes
  categoryDetail: {
    list: `${ROOTS.ADMIN}/category-details`,
    create: `${ROOTS.ADMIN}/category-details`,
    update: (id: number | string) => `${ROOTS.ADMIN}/category-details/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/category-details/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/category-details/${id}`,
  },
  // Product extra details (per-category presets; linked on product create/update)
  productExtraDetail: {
    list: `${ROOTS.ADMIN}/product-extra-details`,
    create: `${ROOTS.ADMIN}/product-extra-details`,
    update: (id: number | string) => `${ROOTS.ADMIN}/product-extra-details/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/product-extra-details/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/product-extra-details/${id}`,
  },
  // Service routes
  service: {
    list: `${ROOTS.ADMIN}/services`,
    create: `${ROOTS.ADMIN}/services`,
    update: (id: number | string) => `${ROOTS.ADMIN}/services/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/services/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/services/${id}`,
  },
  // Language routes
  language: {
    list: `${ROOTS.ADMIN}/languages`,
    create: `${ROOTS.ADMIN}/languages`,
    update: (id: number | string) => `${ROOTS.ADMIN}/languages/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/languages/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/languages/${id}`,
  },
  // Section routes
  section: {
    list: `${ROOTS.ADMIN}/sections`,
    create: `${ROOTS.ADMIN}/sections`,
    update: (id: number | string) => `${ROOTS.ADMIN}/sections/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/sections/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/sections/${id}`,
    itemTypes: `${ROOTS.ADMIN}/sections/item-types`,
  },
  // Banner routes
  banner: {
    list: `${ROOTS.ADMIN}/banners`,
    create: `${ROOTS.ADMIN}/banners`,
    update: (id: number | string) => `${ROOTS.ADMIN}/banners/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/banners/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/banners/${id}`,
  },
  /**
   * Page Builder routes (unified CMS page CRUD + one-call section creation).
   * Requires `page.*` permissions; `addSection` requires `pagesection.create`.
   */
  pageBuilder: {
    list: `${ROOTS.ADMIN}/pages`,
    create: `${ROOTS.ADMIN}/pages`,
    details: (id: number | string) => `${ROOTS.ADMIN}/pages/${id}`,
    update: (id: number | string) => `${ROOTS.ADMIN}/pages/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/pages/${id}`,
    /** Links an existing section (or creates + links) to the page. */
    addSection: (pageId: number | string) => `${ROOTS.ADMIN}/pages/${pageId}/sections`,
    /** Every existing section (not just those already on the page) — for the picker. */
    sliders: (pageId: number | string) => `${ROOTS.ADMIN}/pages/${pageId}/sliders`,
  },
  // Page Section routes
  pageSection: {
    list: `${ROOTS.ADMIN}/page-sections`,
    create: `${ROOTS.ADMIN}/page-sections`,
    update: (id: number | string) => `${ROOTS.ADMIN}/page-sections/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/page-sections/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/page-sections/${id}`,
    pages: `${ROOTS.ADMIN}/sections/pages`,
    pagePreview: (id: number | string) => `${ROOTS.ADMIN}/page-sections/pages/${id}/preview`,
    /** Persist section order on a CMS page. Body: `{ sections: [{ id, order, position }] }`. */
    pageReorder: (pageId: number | string) => `${ROOTS.ADMIN}/page-sections/pages/${pageId}/reorder`,
    /** Card layout templates for a content type (`?manual_model=product`). */
    displayTypes: `${ROOTS.ADMIN}/sections/display-types`,
  },
  /**
   * Storefront navigation menu items (the public top bar).
   * Requires `navmenuitem.*` permissions. Create/update are sent as `multipart/form-data`
   * (optional `icon` upload); update is POSTed with `_method=PUT`.
   */
  navMenuItem: {
    list: `${ROOTS.ADMIN}/nav-menu-items`,
    create: `${ROOTS.ADMIN}/nav-menu-items`,
    details: (id: number | string) => `${ROOTS.ADMIN}/nav-menu-items/${id}`,
    update: (id: number | string) => `${ROOTS.ADMIN}/nav-menu-items/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/nav-menu-items/${id}`,
    /** Persist drag-and-drop ordering. Body: `{ ordered_ids: number[] }`. */
    reorder: `${ROOTS.ADMIN}/nav-menu-items/reorder`,
    /** Built-in storefront screens for `type=route` (`baskets`, `schedules`, …). */
    routeKeys: `${ROOTS.ADMIN}/nav-menu-items/route-keys`,
  },
  // Other API routes (from old endpoints)
  chat: '/api/chat',
  kanban: '/api/kanban',
  calendar: '/api/calendar',
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
  },
  post: {
    list: '/api/post/list',
    details: '/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
  // Complaint routes
  complaint: {
    list: `${ROOTS.ADMIN}/complaints`,
    update: (id: number | string) => `${ROOTS.ADMIN}/complaints/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/complaints/${id}`,
  },
  // Coupon routes
  coupon: {
    list: `${ROOTS.ADMIN}/coupons`,
    create: `${ROOTS.ADMIN}/coupons`,
    update: (id: number | string) => `${ROOTS.ADMIN}/coupons/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/coupons/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/coupons/${id}`,
  },
  // User routes
  user: {
    list: `${ROOTS.ADMIN}/users`,
    create: `${ROOTS.ADMIN}/users`,
    update: (id: number | string) => `${ROOTS.ADMIN}/users/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/users/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/users/${id}`,
    marketers: `${ROOTS.ADMIN}/users/markters`,
    demoteAffiliate: (id: number | string) => `${ROOTS.ADMIN}/users/${id}/demote-affiliate`,
    reactivateAffiliate: (id: number | string) =>
      `${ROOTS.ADMIN}/users/${id}/reactivate-affiliate`,
  },
  product: {
    list: `${ROOTS.ADMIN}/products`,
    create: `${ROOTS.ADMIN}/products`,
    update: (id: number | string) => `${ROOTS.ADMIN}/products/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/products/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/products/${id}`,
    variants: (id: number | string) => `${ROOTS.ADMIN}/products/${id}/variants`,
    approve: (id: number | string) => `${ROOTS.ADMIN}/products/${id}/approve`,
    reject: (id: number | string) => `${ROOTS.ADMIN}/products/${id}/reject`,
    importTemplate: `${ROOTS.ADMIN}/products/import-template`,
    import: `${ROOTS.ADMIN}/products/import`,
  },
  // Order routes
  order: {
    list: `${ROOTS.ADMIN}/orders`,
    /** Unassigned orders eligible for driver assignment (optional coverage filter). */
    toAssign: `${ROOTS.ADMIN}/orders/to-assign`,
    details: (id: number | string) => `${ROOTS.ADMIN}/orders/${id}`,
    getOne: (id: number | string) => `${ROOTS.ADMIN}/orders/${id}/get_one`,
    changeStatus: (id: number | string) => `${ROOTS.ADMIN}/orders/${id}/change-status`,
    assignDriver: (id: number | string) => `${ROOTS.ADMIN}/orders/${id}/assign-driver`,
    changeItemStatus: (itemId: number | string) =>
      `${ROOTS.ADMIN}/orders/items/${itemId}/change-status`,
  },
  // Custom order requests (quick / text+image → priced system order)
  customOrderRequest: {
    list: `${ROOTS.ADMIN}/custom-order-requests`,
    getOne: (id: number | string) => `${ROOTS.ADMIN}/custom-order-requests/${id}/get_one`,
    convert: (id: number | string) => `${ROOTS.ADMIN}/custom-order-requests/${id}/convert`,
    cancel: (id: number | string) => `${ROOTS.ADMIN}/custom-order-requests/${id}/cancel`,
  },
  // Basket routes
  basket: {
    list: `${ROOTS.ADMIN}/baskets`,
    create: `${ROOTS.ADMIN}/baskets`,
    update: (id: number | string) => `${ROOTS.ADMIN}/baskets/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/baskets/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/baskets/${id}`,
  },
  // Scheduled Basket routes
  scheduledBasket: {
    list: `${ROOTS.ADMIN}/scheduled-baskets`,
    create: `${ROOTS.ADMIN}/scheduled-baskets`,
    update: (id: number | string) => `${ROOTS.ADMIN}/scheduled-baskets/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/scheduled-baskets/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/scheduled-baskets/${id}`,
  },
  // Package routes
  package: {
    list: `${ROOTS.ADMIN}/packages`,
    create: `${ROOTS.ADMIN}/packages`,
    update: (id: number | string) => `${ROOTS.ADMIN}/packages/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/packages/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/packages/${id}`,
  },
  /**
   * User subscriptions (read-only): GET list + GET by id.
   * Backend: `/api/admin/subscriptions` when `VITE_SERVER_URL` includes `/api`.
   */
  subscription: {
    list: `${ROOTS.ADMIN}/subscriptions`,
    details: (id: number | string) => `${ROOTS.ADMIN}/subscriptions/${id}`,
  },
  // Gift routes
  gift: {
    list: `${ROOTS.ADMIN}/gifts`,
    create: `${ROOTS.ADMIN}/gifts`,
    bulkCreate: `${ROOTS.ADMIN}/gifts/bulk`,
    update: (id: number | string) => `${ROOTS.ADMIN}/gifts/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/gifts/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/gifts/${id}`,
  },
  // User Gift routes (هدايا المستخدمين)
  userGift: {
    list: `${ROOTS.ADMIN}/user-gifts`,
    create: `${ROOTS.ADMIN}/user-gifts`,
    update: (id: number | string) => `${ROOTS.ADMIN}/user-gifts/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/user-gifts/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/user-gifts/${id}`,
  },
  // Point Exchange routes
  pointExchange: {
    list: `${ROOTS.ADMIN}/point-exchanges`,
    details: (id: number | string) => `${ROOTS.ADMIN}/point-exchanges/${id}`,
    updateStatus: (id: number | string) => `${ROOTS.ADMIN}/point-exchanges/${id}`,
  },
  // User Points routes
  userPoints: {
    list: `${ROOTS.ADMIN}/user-points`,
    details: (userId: number | string) => `${ROOTS.ADMIN}/user-points/${userId}`,
    transactions: (userId: number | string) => `${ROOTS.ADMIN}/user-points/${userId}/transactions`,
    add: `${ROOTS.ADMIN}/points/add`,
    deduct: `${ROOTS.ADMIN}/points/deduct`,
    statistics: `${ROOTS.ADMIN}/user-points/statistics`,
  },
  // Currency routes
  currency: {
    list: `${ROOTS.ADMIN}/currencies`,
    create: `${ROOTS.ADMIN}/currencies`,
    update: (id: number | string) => `${ROOTS.ADMIN}/currencies/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/currencies/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/currencies/${id}`,
    toggleStatus: (id: number | string) => `${ROOTS.ADMIN}/currencies/${id}/toggle-status`,
  },
  // Recipe routes
  recipe: {
    list: `${ROOTS.ADMIN}/recipes`,
    create: `${ROOTS.ADMIN}/recipes`,
    update: (id: number | string) => `${ROOTS.ADMIN}/recipes/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/recipes/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/recipes/${id}`,
  },
  /**
   * Product Variant routes (individual update/delete).
   * Delete is soft and always allowed, but needs `?confirm=true` when linked data
   * exists — otherwise the API answers `409` with the impact payload.
   * `deleteImpact` returns that same payload without deleting anything.
   */
  productVariant: {
    list: `${ROOTS.ADMIN}/product-variants`,
    details: (id: number | string) => `${ROOTS.ADMIN}/product-variants/${id}`,
    update: (id: number | string) => `${ROOTS.ADMIN}/product-variants/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/product-variants/${id}`,
    deleteImpact: (id: number | string) => `${ROOTS.ADMIN}/product-variants/${id}/delete-impact`,
  },
  // Shop Product Variant routes (shared - used in selects). Same confirm flow as `productVariant`.
  shopProductVariant: {
    list: `${ROOTS.ADMIN}/shop-product-variants`,
    update: (id: number | string) => `${ROOTS.ADMIN}/shop-product-variants/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/shop-product-variants/${id}`,
    deleteImpact: (id: number | string) =>
      `${ROOTS.ADMIN}/shop-product-variants/${id}/delete-impact`,
  },
  // Legal Document routes
  legalDocument: {
    list: `${ROOTS.ADMIN}/legal-documents`,
    create: `${ROOTS.ADMIN}/legal-documents`,
    details: (id: number | string) => `${ROOTS.ADMIN}/legal-documents/${id}`,
    update: (id: number | string) => `${ROOTS.ADMIN}/legal-documents/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/legal-documents/${id}`,
  },
  // FAQ routes
  faq: {
    list: `${ROOTS.ADMIN}/faqs`,
    create: `${ROOTS.ADMIN}/faqs`,
    details: (id: number | string) => `${ROOTS.ADMIN}/faqs/${id}`,
    update: (id: number | string) => `${ROOTS.ADMIN}/faqs/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/faqs/${id}`,
  },
  // Vendor Subscription routes
  vendorSubscription: {
    list: `${ROOTS.ADMIN}/vendor-subscriptions`,
    create: `${ROOTS.ADMIN}/vendor-subscriptions`,
    details: (id: number | string) => `${ROOTS.ADMIN}/vendor-subscriptions/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/vendor-subscriptions/${id}`,
  },
  // Admin Notifications (broadcast push notifications)
  adminNotification: {
    list: `${ROOTS.ADMIN}/notifications`,
    create: `${ROOTS.ADMIN}/notifications`,
    details: (id: number | string) => `${ROOTS.ADMIN}/notifications/${id}`,
    update: (id: number | string) => `${ROOTS.ADMIN}/notifications/${id}`,
  },
  // Vendor Packages
  vendorPackage: {
    list: `${ROOTS.ADMIN}/vendor-packages`,
    create: `${ROOTS.ADMIN}/vendor-packages`,
    update: (id: number | string) => `${ROOTS.ADMIN}/vendor-packages/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/vendor-packages/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/vendor-packages/${id}`,
  },
  // Seller Registration routes
  sellerRegistration: {
    list: `${ROOTS.ADMIN}/seller-registrations`,
    details: (id: number | string) => `${ROOTS.ADMIN}/seller-registrations/${id}`,
    approve: (id: number | string) => `${ROOTS.ADMIN}/seller-registrations/${id}/approve`,
    reject: (id: number | string) => `${ROOTS.ADMIN}/seller-registrations/${id}/reject`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/seller-registrations/${id}`,
  },
  // Vendor User routes
  vendorUser: {
    list: `${ROOTS.ADMIN}/vendor-users`,
    create: `${ROOTS.ADMIN}/vendor-users`,
    update: (id: number | string) => `${ROOTS.ADMIN}/vendor-users/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/vendor-users/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/vendor-users/${id}`,
  },
  // Reports routes
  reports: {
    sales: `${ROOTS.ADMIN}/reports/sales`,
    salesExport: `${ROOTS.ADMIN}/reports/export/sales`,
    productMovement: `${ROOTS.ADMIN}/reports/product-movement`,
    productMovementExport: `${ROOTS.ADMIN}/reports/export/product-movement`,
    vendorPerformance: (id: number | string) => `${ROOTS.ADMIN}/reports/vendor-performance/${id}`,
    vendorPerformanceExport: (id: number | string) =>
      `${ROOTS.ADMIN}/reports/export/vendor-performance/${id}`,
    driverPerformance: (id: number | string) => `${ROOTS.ADMIN}/reports/driver-performance/${id}`,
    driverPerformanceExport: (id: number | string) =>
      `${ROOTS.ADMIN}/reports/export/driver-performance/${id}`,
    salesByLocation: `${ROOTS.ADMIN}/reports/sales-by-location`,
    salesByLocationExport: `${ROOTS.ADMIN}/reports/export/sales-by-location`,
    salesByCategory: `${ROOTS.ADMIN}/reports/sales-by-category`,
    salesByCategoryExport: `${ROOTS.ADMIN}/reports/export/sales-by-category`,
  },
  // Setting routes
  setting: {
    list: `${ROOTS.ADMIN}/settings`,
    details: (key: string) => `${ROOTS.ADMIN}/settings/${key}`,
    update: (key: string) => `${ROOTS.ADMIN}/settings/${key}`,
  },
  // Badge routes
  badge: {
    list: `${ROOTS.ADMIN}/badges`,
    create: `${ROOTS.ADMIN}/badges`,
    update: (id: number | string) => `${ROOTS.ADMIN}/badges/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/badges/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/badges/${id}`,
  },
  // Activity Log routes
  activityLog: {
    list: `${ROOTS.ADMIN}/activity-logs`,
  },
  // Affiliate Withdraw Request routes
  affiliateWithdraw: {
    list: `${ROOTS.ADMIN}/affiliate-withdraw-requests`,
    details: (id: number | string) => `${ROOTS.ADMIN}/affiliate-withdraw-requests/${id}`,
    update: (id: number | string) => `${ROOTS.ADMIN}/affiliate-withdraw-requests/${id}`,
  },
  /** Read-only: affiliate wallet ledger (commission / withdraw). */
  affiliateWalletTransaction: {
    list: `${ROOTS.ADMIN}/affiliate-wallet-transactions`,
    details: (id: number | string) => `${ROOTS.ADMIN}/affiliate-wallet-transactions/${id}`,
  },
  /** Read-only: driver wallet ledger (delivery earnings). */
  driverWalletTransaction: {
    list: `${ROOTS.ADMIN}/driver-wallet-transactions`,
    details: (id: number | string) => `${ROOTS.ADMIN}/driver-wallet-transactions/${id}`,
  },
  // Icon routes
  icon: {
    list: `${ROOTS.ADMIN}/icons`,
    create: `${ROOTS.ADMIN}/icons`,
    update: (id: number | string) => `${ROOTS.ADMIN}/icons/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/icons/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/icons/${id}`,
  },
  // Color routes (product / catalog colors)
  color: {
    list: `${ROOTS.ADMIN}/colors`,
    create: `${ROOTS.ADMIN}/colors`,
    update: (id: number | string) => `${ROOTS.ADMIN}/colors/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/colors/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/colors/${id}`,
  },
  // Promotion routes
  promotion: {
    list: `${ROOTS.ADMIN}/promotions`,
    create: `${ROOTS.ADMIN}/promotions`,
    update: (id: number | string) => `${ROOTS.ADMIN}/promotions/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/promotions/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/promotions/${id}`,
  },
  // Country routes
  country: {
    list: `${ROOTS.ADMIN}/countries`,
    create: `${ROOTS.ADMIN}/countries`,
    update: (id: number | string) => `${ROOTS.ADMIN}/countries/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/countries/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/countries/${id}`,
  },
  /** Sale countries (GCC / markets) — distinct from origin countries */
  saleCountry: {
    list: `${ROOTS.ADMIN}/sale-countries`,
    create: `${ROOTS.ADMIN}/sale-countries`,
    update: (id: number | string) => `${ROOTS.ADMIN}/sale-countries/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/sale-countries/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/sale-countries/${id}`,
  },
  // Promotion Request routes
  promotionRequest: {
    list: `${ROOTS.ADMIN}/promotion-requests`,
    details: (id: number | string) => `${ROOTS.ADMIN}/promotion-requests/${id}`,
    approve: (id: number | string) => `${ROOTS.ADMIN}/promotion-requests/${id}/approve`,
    reject: (id: number | string) => `${ROOTS.ADMIN}/promotion-requests/${id}/reject`,
  },
  // Point Rule routes
  pointRule: {
    list: `${ROOTS.ADMIN}/point-rules`,
    create: `${ROOTS.ADMIN}/point-rules`,
    update: (id: number | string) => `${ROOTS.ADMIN}/point-rules/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/point-rules/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/point-rules/${id}`,
  },
  /** Delivery fee distance tiers (`auth:admin`). */
  deliveryDistanceRange: {
    list: `${ROOTS.ADMIN}/delivery-distance-ranges`,
    create: `${ROOTS.ADMIN}/delivery-distance-ranges`,
    update: (id: number | string) => `${ROOTS.ADMIN}/delivery-distance-ranges/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/delivery-distance-ranges/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/delivery-distance-ranges/${id}`,
  },
  // Schedule routes
  /** Schedule categories (user cards). Backend: `/api/admin/schedules`. */
  schedule: {
    list: `${ROOTS.ADMIN}/schedules`,
    create: `${ROOTS.ADMIN}/schedules`,
    update: (id: number | string) => `${ROOTS.ADMIN}/schedules/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/schedules/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/schedules/${id}`,
  },
  // User Basket Schedule routes
  userBasketSchedule: {
    list: `${ROOTS.ADMIN}/user-basket-schedules`,
    create: `${ROOTS.ADMIN}/user-basket-schedules`,
    update: (id: number | string) => `${ROOTS.ADMIN}/user-basket-schedules/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/user-basket-schedules/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/user-basket-schedules/${id}`,
    disable: (id: number | string) => `${ROOTS.ADMIN}/user-basket-schedules/${id}/disable`,
    enable: (id: number | string) => `${ROOTS.ADMIN}/user-basket-schedules/${id}/enable`,
  },
  // Vendor Service Type routes
  vendorServiceType: {
    list: `${ROOTS.ADMIN}/vendor-service-types`,
    create: `${ROOTS.ADMIN}/vendor-service-types`,
    update: (id: number | string) => `${ROOTS.ADMIN}/vendor-service-types/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/vendor-service-types/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/vendor-service-types/${id}`,
  },
  // Vendor Service routes
  vendorService: {
    list: `${ROOTS.ADMIN}/vendor-services`,
    create: `${ROOTS.ADMIN}/vendor-services`,
    update: (id: number | string) => `${ROOTS.ADMIN}/vendor-services/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/vendor-services/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/vendor-services/${id}`,
  },
  // Shop Vendor Service routes
  shopVendorService: {
    list: `${ROOTS.ADMIN}/shop-vendor-services`,
    create: `${ROOTS.ADMIN}/shop-vendor-services`,
    update: (id: number | string) => `${ROOTS.ADMIN}/shop-vendor-services/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/shop-vendor-services/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/shop-vendor-services/${id}`,
  },
  // Service Order routes
  serviceOrder: {
    list: `${ROOTS.ADMIN}/service-orders`,
    getOne: (id: number | string) => `${ROOTS.ADMIN}/service-orders/${id}/get_one`,
    changeStatus: (id: number | string) => `${ROOTS.ADMIN}/service-orders/${id}/change-status`,
  },
  // Quick Action routes
  quickAction: {
    list: `${ROOTS.ADMIN}/quick-actions`,
    create: `${ROOTS.ADMIN}/quick-actions`,
    update: (id: number | string) => `${ROOTS.ADMIN}/quick-actions/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/quick-actions/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/quick-actions/${id}`,
  },
  /**
   * Popup campaigns (auth:admin). Backend path: `/api/admin/popup-campaigns` when `VITE_SERVER_URL` is e.g. `https://host/api`
   * (same pattern as other `${ROOTS.ADMIN}/...` routes).
   */
  popupCampaign: {
    list: `${ROOTS.ADMIN}/popup-campaigns`,
    create: `${ROOTS.ADMIN}/popup-campaigns`,
    update: (id: number | string) => `${ROOTS.ADMIN}/popup-campaigns/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/popup-campaigns/${id}`,
    details: (id: number | string) => `${ROOTS.ADMIN}/popup-campaigns/${id}`,
  },
  // Flash Sale routes
  flashSale: {
    list: `${ROOTS.ADMIN}/flash-sales`,
    create: `${ROOTS.ADMIN}/flash-sales`,
    details: (id: number | string) => `${ROOTS.ADMIN}/flash-sales/${id}`,
    update: (id: number | string) => `${ROOTS.ADMIN}/flash-sales/${id}`,
  },
  // Vendor Accounting routes
  vendorAccounting: {
    summary: `${ROOTS.ADMIN}/vendor-accounting/summary`,
    vendors: `${ROOTS.ADMIN}/vendor-accounting/vendors`,
    vendorStatement: (id: number | string) => `${ROOTS.ADMIN}/vendor-accounting/vendors/${id}`,
  },
  // Vendor Withdraw Request routes
  vendorWithdrawRequest: {
    list: `${ROOTS.ADMIN}/vendor-withdraw-requests`,
    details: (id: number | string) => `${ROOTS.ADMIN}/vendor-withdraw-requests/${id}`,
    update: (id: number | string) => `${ROOTS.ADMIN}/vendor-withdraw-requests/${id}`,
  },
  // Contact methods (settings — CRUD)
  contactMethod: {
    list: `${ROOTS.ADMIN}/contact-methods`,
    create: `${ROOTS.ADMIN}/contact-methods`,
    details: (id: number | string) => `${ROOTS.ADMIN}/contact-methods/${id}`,
    update: (id: number | string) => `${ROOTS.ADMIN}/contact-methods/${id}`,
    delete: (id: number | string) => `${ROOTS.ADMIN}/contact-methods/${id}`,
  },
  // Statistics routes
  statistics: {
    dashboard: `${ROOTS.ADMIN}/statistics/dashboard`,
    counts: `${ROOTS.ADMIN}/statistics/counts`,
    monthlyPerformance: `${ROOTS.ADMIN}/statistics/monthly-performance`,
    ordersByStatus: `${ROOTS.ADMIN}/statistics/orders-by-status`,
    topShops: `${ROOTS.ADMIN}/statistics/top-shops`,
    revenueTrend: `${ROOTS.ADMIN}/statistics/revenue-trend`,
    ordersByHour: `${ROOTS.ADMIN}/statistics/orders-by-hour`,
    ordersByDay: `${ROOTS.ADMIN}/statistics/orders-by-day`,
    topCategories: `${ROOTS.ADMIN}/statistics/top-categories`,
    userGrowth: `${ROOTS.ADMIN}/statistics/user-growth`,
    orderFunnel: `${ROOTS.ADMIN}/statistics/order-funnel`,
    avgOrderValueTrend: `${ROOTS.ADMIN}/statistics/avg-order-value-trend`,
    driverComparison: `${ROOTS.ADMIN}/statistics/driver-comparison`,
    stockLevels: `${ROOTS.ADMIN}/statistics/stock-levels`,
    salesHeatmap: `${ROOTS.ADMIN}/statistics/sales-heatmap`,
  },
} as const;
