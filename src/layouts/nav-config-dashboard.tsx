import type { TFunction } from 'i18next';
import type { NavSectionProps } from 'src/shared/components/nav-section';

import { WARRANTY_PERMISSION } from '@/pages/dashboard/warranties/permissions';
import { FLASH_SALE_PERMISSION } from '@/pages/dashboard/flash-sales/permissions';
import { NAV_MENU_ITEM_VIEW_ANY } from '@/pages/dashboard/nav-menu-items/permissions';
import { CONTACT_METHOD_VIEW_ANY } from '@/pages/dashboard/contact-methods/permissions';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';
import { Label } from 'src/shared/components/label';
import { Iconify } from 'src/shared/components/iconify';
import { SvgColor } from 'src/shared/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  params: icon('ic-params'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
};

// ----------------------------------------------------------------------

export function getNavData(t: TFunction<'nav'>): NavSectionProps['data'] {
  return [
    /**
     * Account — visible to all authenticated users (no permission gate)
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:user-circle-bold" width={16} height={16} />
          <span>{t('accountGroup')}</span>
        </span>
      ) as any,
      items: [
        {
          title: t('profile'),
          path: paths.dashboard.profile,
          icon: <Iconify icon="custom:profile-duotone" width={22} height={22} />,
        },
      ],
    },
    /**
     * 1. Statistics & Reports
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:chart-2-bold" width={16} height={16} />
          <span>{t('statisticsReportsGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('statistics'), path: paths.dashboard.statistics, icon: ICONS.analytics, requiredPermissionAny: ['stats.index', 'stats.view', 'statistics.view'] },
        { title: t('reports'), path: paths.dashboard.reports, icon: ICONS.invoice, requiredPermission: 'reports.view' },
      ],
    },
    /**
     * 2. Content Management - Categories & Products
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:box-minimalistic-bold" width={16} height={16} />
          <span>{t('contentManagementGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('categories'), path: paths.dashboard.categories, icon: ICONS.product, requiredPermission: 'category.view' },
        { title: t('categoryAttributes'), path: paths.dashboard.categoryAttributes, icon: ICONS.params, requiredPermission: 'categoryattribute.view' },
        { title: t('categoryDetails'), path: paths.dashboard.categoryDetails, icon: ICONS.menuItem, requiredPermission: 'categorydetail.view' },
        {
          title: t('categoryAddOns'),
          path: paths.dashboard.categoryExtraDetails,
          icon: ICONS.label,
          /** Backend may expose `productextradetail.*` later; until then, same admins as category details see this item */
          requiredPermissionAny: ['productextradetail.view', 'categorydetail.view'],
        },
        { title: t('brands'), path: paths.dashboard.brands, icon: ICONS.ecommerce, requiredPermission: 'brand.view' },
        { title: t('units'), path: paths.dashboard.units, icon: ICONS.params, requiredPermission: 'unit.view' },
        { title: t('warranties'), path: paths.dashboard.warranties, icon: ICONS.label, requiredPermission: WARRANTY_PERMISSION.view },
        { title: t('products'), path: paths.dashboard.products, icon: ICONS.product, requiredPermission: 'product.view' },
        { title: t('inventory'), path: paths.dashboard.inventory, icon: ICONS.folder, requiredPermission: 'product.view' },
        // { title: t('crimage.pngeateProductNav'), path: paths.dashboard.product.create, icon: ICONS.ecommerce, requiredPermission: 'product.create' },
      ],
    },
    /**
     * 3. Content Management - Sections & Pages
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:widget-add-bold" width={16} height={16} />
          <span>{t('sectionsPagesGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('sections'), path: paths.dashboard.sections, icon: ICONS.menuItem, requiredPermission: 'section.view' },
        { title: t('pages'), path: paths.dashboard.pages, icon: ICONS.menuItem, requiredPermissionAny: ['page.view', 'pagesection.view'] },
        {
          title: t('navMenuItems'),
          path: paths.dashboard.navMenuItems.root,
          icon: <Iconify icon="solar:list-bold" width={22} height={22} />,
          requiredPermissionAny: [...NAV_MENU_ITEM_VIEW_ANY],
        },
        { title: t('quickActions'), path: paths.dashboard.quickActions.root, icon: ICONS.menuItem, requiredPermission: 'quickaction.view' },
        { title: t('recipes'), path: paths.dashboard.recipes, icon: ICONS.file, requiredPermission: 'recipe.view' },
      ],
    },
    /**
     * 3b. Advertising & promos (app intro, flash, banners)
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:megaphone-bold" width={16} height={16} />
          <span>{t('advertisingGroup')}</span>
        </span>
      ) as any,
      items: [
        {
          title: t('flashSales'),
          path: paths.dashboard.flashSales.root,
          icon: <Iconify icon="solar:bolt-circle-bold" width={22} height={22} />,
          requiredPermission: FLASH_SALE_PERMISSION.view,
        },
        { title: t('banners'), path: paths.dashboard.banners, icon: ICONS.ecommerce, requiredPermission: 'banner.view' },
      ],
    },
    /**
     * 4. Content Management - Baskets & Schedules
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:cart-large-2-bold" width={16} height={16} />
          <span>{t('basketsSchedulesGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('baskets'), path: paths.dashboard.baskets, icon: ICONS.ecommerce, requiredPermission: 'basket.view' },
        { title: t('scheduledBaskets'), path: paths.dashboard.scheduledBaskets, icon: ICONS.calendar, requiredPermission: 'schedulebasket.view' },
        { title: t('schedules'), path: paths.dashboard.schedules, icon: ICONS.calendar, requiredPermission: 'schedule.view' },
        { title: t('userBasketSchedules'), path: paths.dashboard.userBasketSchedules, icon: ICONS.calendar, requiredPermission: 'userbasketschedule.view' },
      ],
    },
    /**
     * 5. Locations
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:map-point-bold" width={16} height={16} />
          <span>{t('locationsGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('government'), path: paths.dashboard.locations, icon: ICONS.tour, requiredPermission: 'governorate.view' },
        { title: t('city'), path: paths.dashboard.city, icon: ICONS.tour, requiredPermission: 'city.view' },
        { title: t('area'), path: paths.dashboard.area, icon: ICONS.label, requiredPermission: 'area.view' },
        { title: t('countries'), path: paths.dashboard.countries, icon: ICONS.tour, requiredPermission: 'country.view' },
        {
          title: t('saleCountries'),
          path: paths.dashboard.saleCountries,
          icon: ICONS.tour,
          requiredPermissionAny: ['salecountry.view', 'SaleCountry.view'],
        },
      ],
    },
    /**
     * 6. Users & Vendors
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:users-group-rounded-bold" width={16} height={16} />
          <span>{t('usersVendorsGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('users'), path: paths.dashboard.users, icon: ICONS.label, requiredPermission: 'user.view' },
        { title: t('affiliates'), path: paths.dashboard.affiliates, icon: ICONS.label, requiredPermission: 'user.view' },
        { title: t('vendor'), path: paths.dashboard.vendor, icon: ICONS.ecommerce, requiredPermission: 'vendor.view' },
        { title: t('vendorUsers'), path: paths.dashboard.vendorUsers, icon: ICONS.job, requiredPermission: 'vendoruser.view' },
        { title: t('sellerRegistrations'), path: paths.dashboard.sellerRegistrations, icon: ICONS.file, requiredPermission: 'sellerregistration.view' },
        { title: t('shop'), path: paths.dashboard.shop, icon: ICONS.analytics, requiredPermission: 'shop.view' },
        {
          title: t('restaurantsNav'),
          path: paths.dashboard.restaurants,
          icon: <Iconify icon="solar:chef-hat-bold" width={22} height={22} />,
          requiredPermission: 'shop.view',
        },
      ],
    },
    /**
     * 6b. Drivers
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:scooter-bold" width={16} height={16} />
          <span>{t('driversGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('driver'), path: paths.dashboard.driver, icon: <Iconify icon="solar:delivery-bold-duotone" width={22} height={22} />, requiredPermission: 'driver.view' },
        {
          title: t('driverWalletTransactions'),
          path: paths.dashboard.driverWalletTransactions,
          icon: ICONS.banking,
          requiredPermission: 'driverwallettransaction.view',
        },
      ],
    },
    /**
     * 6c. Service Providers
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:settings-bold" width={16} height={16} />
          <span>{t('serviceProvidersGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('serviceProvidersNav'), path: paths.dashboard.serviceProviders, icon: <Iconify icon="solar:hand-stars-bold" width={22} height={22} />, requiredPermission: 'shop.view' },
        { title: t('providerServiceCategoriesNav'), path: paths.dashboard.vendorServiceTypes, icon: ICONS.menuItem, requiredPermission: 'vendorservicetype.view' },
        { title: t('providerServiceTypesNav'), path: paths.dashboard.vendorServices, icon: ICONS.course, requiredPermission: 'vendorservice.view' },
        { title: t('providerServicesNav'), path: paths.dashboard.shopVendorServices, icon: ICONS.booking, requiredPermission: 'shopvendorservice.view' },
      ],
    },
    /**
     * 7. Orders
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:cart-2-bold" width={16} height={16} />
          <span>{t('ordersGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('orders'), path: paths.dashboard.orders, icon: ICONS.order, requiredPermission: 'order.view' },
        {
          title: t('customOrderRequests'),
          path: paths.dashboard.customOrderRequests,
          icon: ICONS.file,
          requiredPermissionAny: ['customorderrequest.view', 'custom_order_request.view'],
        },
        { title: t('serviceOrders'), path: paths.dashboard.serviceOrders, icon: ICONS.invoice, requiredPermission: 'serviceorder.view' },
      ],
    },
    /**
     * 7b. Finance & Accounting
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:wallet-money-bold" width={16} height={16} />
          <span>{t('financeGroup')}</span>
        </span>
      ) as any,
      items: [
        {
          title: t('vendorAccountingNav'),
          path: paths.dashboard.vendorAccounting.root,
          icon: ICONS.banking,
          requiredPermission: 'vendoraccounting.view',
        },
        {
          title: t('vendorWithdrawRequests'),
          path: paths.dashboard.vendorWithdrawRequests,
          icon: ICONS.invoice,
          requiredPermission: 'vendorwithdrawrequest.view',
        },
      ],
    },
    /**
     * 8. Packages & Subscriptions
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:box-bold" width={16} height={16} />
          <span>{t('packagesSubscriptionsGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('packages'), path: paths.dashboard.packages, icon: ICONS.product, requiredPermission: 'package.view' },
        { title: t('subscriptions'), path: paths.dashboard.subscriptions, icon: ICONS.invoice, requiredPermission: 'subscription.view' },
        { title: t('vendorPackages'), path: paths.dashboard.vendorPackages, icon: ICONS.product, requiredPermission: 'vendorpackage.view' },
        { title: t('vendorSubscriptions'), path: paths.dashboard.vendorSubscriptions, icon: ICONS.booking, requiredPermission: 'vendorsubscription.view' },
      ],
    },
    /**
     * 9. Rewards & Points
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:gift-bold" width={16} height={16} />
          <span>{t('rewardsGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('gifts'), path: paths.dashboard.gifts, icon: ICONS.ecommerce, requiredPermission: 'gift.view' },
        { title: t('userGifts'), path: paths.dashboard.userGifts, icon: ICONS.ecommerce, requiredPermission: 'gift.view' },
        { title: t('userPoints'), path: paths.dashboard.userPoints, icon: ICONS.analytics, requiredPermission: 'pointwallet.view' },
        { title: t('pointExchanges'), path: paths.dashboard.pointExchanges, icon: ICONS.banking, requiredPermission: 'pointexchange.view' },
        { title: t('pointRules'), path: paths.dashboard.pointRules, icon: ICONS.params, requiredPermission: 'pointrule.view' },
      ],
    },
    /**
     * 10. Marketing & Promotions
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:tag-bold" width={16} height={16} />
          <span>{t('marketingPromotionsGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('coupons'), path: paths.dashboard.coupons, icon: ICONS.invoice, requiredPermission: 'coupon.view' },
        { title: t('promotions'), path: paths.dashboard.promotions, icon: ICONS.label, requiredPermission: 'promotion.view' },
        {
          title: t('popupCampaigns'),
          path: paths.dashboard.popupCampaigns.root,
          icon: ICONS.tour,
          requiredPermission: 'popupcampaign.view',
        },
        { title: t('promotionRequests'), path: paths.dashboard.promotionRequests, icon: ICONS.file, requiredPermission: 'promotionrequest.view' },
        { title: t('services'), path: paths.dashboard.services, icon: ICONS.course, requiredPermission: 'service.view' },
      ],
    },
    /**
     * 11. Settings
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:settings-minimalistic-bold" width={16} height={16} />
          <span>{t('settingsGroup')}</span>
        </span>
      ) as any,
      items: [
        // Languages / translation manager (disabled — see routes `paths` and dashboard `languages` route)
        // { title: t('translationManager'), path: '/languages/translations', icon: ICONS.file, requiredPermission: 'language.view' },
        { title: t('currencies'), path: paths.dashboard.currencies, icon: ICONS.banking, requiredPermission: 'currency.view' },
        {
          title: t('deliveryDistanceRanges'),
          path: paths.dashboard.deliveryDistanceRanges,
          icon: <Iconify icon="solar:routing-2-bold" width={22} height={22} />,
          requiredPermission: 'deliverydistancerange.view',
        },
        { title: t('legalDocuments'), path: paths.dashboard.legalDocuments, icon: ICONS.lock, requiredPermission: 'legaldocument.view' },
        { title: t('faqs'), path: paths.dashboard.faqs, icon: ICONS.blog, requiredPermission: 'faq.view' },
        {
          title: t('contactMethods'),
          path: paths.dashboard.contactMethods,
          icon: <Iconify icon="solar:phone-calling-rounded-bold" width={22} height={22} />,
          requiredPermissionAny: [...CONTACT_METHOD_VIEW_ANY],
        },
        { title: t('complaints'), path: paths.dashboard.complaints, icon: ICONS.chat, requiredPermission: 'complaint.view' },
        { title: t('adminNotifications'), path: paths.dashboard.adminNotifications, icon: <Iconify icon="solar:bell-bold" width={22} height={22} />, requiredPermission: 'notification.view' },
        { title: t('settings'), path: paths.dashboard.settings, icon: ICONS.params, requiredPermission: 'setting.view' },
        { title: t('badges'), path: paths.dashboard.badges, icon: ICONS.label, requiredPermission: 'badge.view' },
        { title: t('icons'), path: paths.dashboard.icons, icon: ICONS.folder, requiredPermission: 'icon.view' },
        {
          title: t('colors'),
          path: paths.dashboard.colors,
          icon: <Iconify icon="solar:palette-bold" width={22} height={22} />,
          requiredPermissionAny: ['color.view', 'Color.view'],
        },
        { title: t('activityLogs'), path: paths.dashboard.activityLogs, icon: ICONS.file, requiredPermission: 'activitylog.view' },
        { title: t('affiliateWithdrawRequests'), path: paths.dashboard.affiliateWithdrawRequests, icon: ICONS.banking, requiredPermission: 'affiliatewithdrawrequest.view' },
        { title: t('affiliateWalletTransactions'), path: paths.dashboard.affiliateWalletTransactions, icon: ICONS.banking, requiredPermission: 'affiliatewallettransaction.view' },
      ],
    },
    /**
     * 12. Administration
     */
    {
      subheader: (
        <span className="flex items-center gap-3">
          <Iconify icon="solar:shield-user-bold" width={16} height={16} />
          <span>{t('administrationGroup')}</span>
        </span>
      ) as any,
      items: [
        { title: t('admin'), path: paths.dashboard.root, icon: ICONS.dashboard, info: <Label>v{CONFIG.appVersion}</Label>, requiredPermission: 'admin.view' },
        { title: t('role'), path: paths.dashboard.role, icon: ICONS.lock, requiredPermission: 'role.view' },
      ],
    },
  ];
}
