export interface AccountMenuItem {
 id: string;
 label: string;
 icon: React.ReactNode;
 path: string;
 isDanger?: boolean;
}

export interface UserProfile {
 id: string;
 fullName: string;
 email: string;
 phone: string;
 avatar?: string;
 isOnline?: boolean;
}

// Basket types
export type BasketStatus ="active"|"paused"|"expired";

export type BasketCategory ="scheduled"|"occasion"|"suggested";

export type BasketScheduleType ="recurring"|"one_time";

export type BasketItem = {
 id: string | number;
 name: string;
 image?: string;
 quantity: number;
 price: string;
};

export type Basket = {
 id: string | number;
 name: string;
 status: BasketStatus;
 category: BasketCategory;
 discount?: string;
 itemsCount: number;
 description: string;
 scheduleType: BasketScheduleType;
 scheduleInfo: string;
 nextDelivery?: string;
 scheduledFor?: string;
 pausedSince?: string;
 price: string;
 originalPrice?: string;
 savings?: string;
 createdOn: string;
 items?: BasketItem[];
};

export type BasketFilter =
 |"all"
 |"active"
 |"paused"
 |"expired"
 |"suggested"
 |"scheduled"
 |"occasion";

// Packages API types
export interface PackageApi {
 id: number;
 name: string | { ar: string; en: string };
 price: number | string;
 price_currency?: string;
 currency?: string;
 currency_symbol?: string;
 price_formatted?: string;
 duration_days: number;
 monthly_orders_limit: number;
 free_delivery_count: number;
 discount_percentage: string;
 points_bonus: number;
 is_active: boolean | number;
}

export interface SubscriptionPaymentMethod {
 id: number;
 name: string;
 code: string;
 icon: string | null;
 is_active: boolean;
 is_default: boolean;
}

export interface MySubscriptionData {
 id: number;
 package: PackageApi;
 status: "active" | "pending" | string;
 payment_method_id?: number;
 payment_method?: SubscriptionPaymentMethod;
 start_date: string;
 end_date: string;
 remaining_orders: number;
 remaining_free_deliveries: number;
}

export interface MySubscriptionResponse {
 status: boolean;
 message: string;
 data: MySubscriptionData;
}

export interface PackagesListResponse {
 data: PackageApi[];
}

// Favorites API types - matches API: product, recipe, brand, basket, shop
export type FavoriteType ="product"|"recipe"|"brand"|"basket"|"shop"|"vendor";

export interface FavoriteBadge {
 id: number;
 name: string;
 color: string;
 postion: string | null;
 type?: string;
 image?: string;
}

export interface FavoriteBadgeApi {
 id: number;
 name: string;
 color: string;
 postion: string | null;
 type?: string;
 image?: string;
}

/** CTA / action button from API - primary + secondary text for AnimatedButton */
export interface FavoriteButtonApi {
 primary: string;
 secondary?: string;
}

export interface FavoriteItem {
 id: number;
 name?: string;
 title?: string;
 description?: string;
 desc?: string;
 image?: string | null;
 thumbnail?: string | null;
 /** Shop/vendor logo from API */
 logo_url?: string | null;
 rating?: number;
 /** Shop average_rating from API */
 average_rating?: number;
 price?: number;
 original_price?: number;
 price_after_discount?: number;
 discount?: string;
 discount_amount?: number;
 discount_value?: number | string | null;
 orders_count?: number;
 num_sold?: number;
 saving?: number;
 created_at?: string;
 budges?: FavoriteBadge[];
 top_badges?: FavoriteBadgeApi[];
 bottom_badges?: FavoriteBadgeApi[];
 /** CTA button: primary + secondary text for animated button (from API) */
 button?: FavoriteButtonApi;
 cta?: { primary?: string; secondary?: string; label?: string; sublabel?: string };
 action_button?: { primary?: string; secondary?: string; primary_text?: string; secondary_text?: string; label?: string; sublabel?: string };
 category?: string;
 store?: string;
 has_free_delivery?: boolean;
 is_new?: boolean;
 delivery_price?: number;
 price_formatted?: string;
 price_after_discount_formatted?: string;
 price_currencies?: import("@/shared/lib/formatApiPrice").ApiDualCurrencies | null;
 price_after_discount_currencies?: import("@/shared/lib/formatApiPrice").ApiDualCurrencies | null;
 currency_symbol?: string;
 discount_type?: "percentage" | "fixed" | string | null;
 amount_saved_formatted?: string;
 /** Present when API returns all favorites (no type filter) */
 type?: FavoriteType;
 /** API: whether item is favorited */
 is_favorite?: boolean;
 /** Shop: nested vendor with badges */
 vendor?: {
 id?: number;
 name?: string;
 top_badges?: FavoriteBadgeApi[];
 bottom_badges?: FavoriteBadgeApi[];
 };
}

export interface WishlistBadge {
 id: number;
 name: string;
 color: string;
 type?: string;
 image?: string;
}

/** Normalized shape for display in wishlist cards */
export interface WishlistDisplayItem {
 id: number;
 name: string;
 category?: string;
 image: string;
 rating?: number;
 priceDisplay: string;
 originalPrice?: string;
 /** Formatted savings amount e.g."$180"- card prepends"You saved"*/
 savingsAmount?: string;
 soldCount?: number;
 showNew: boolean;
 hasFreeDelivery: boolean;
 detailPath: string;
 /** Badges from top_badges / budges */
 topBadges: WishlistBadge[];
 /** Badges from bottom_badges */
 bottomBadges: WishlistBadge[];
 /** CTA button from API - used for AnimatedButton */
 button?: { primary: string; secondary: string };
}

export interface FavoritesResponse {
 status: boolean;
 message: string;
 data: FavoriteItem[] | { items: FavoriteItem[]; total: number };
}

export interface ToggleFavoritePayload {
 type: FavoriteType;
 id: number;
}

// Complaints API types
export type ComplaintType ="product"|"order"|"driver"|"merchant";
export type ComplaintStatus ="new"|"in_review"|"resolved"|"rejected";

export interface ComplaintUser {
 id: number;
 name: string;
 phone: string;
}

export interface Complaint {
 id: number;
 order_id: number;
 type: ComplaintType;
 message: string;
 status: ComplaintStatus;
 admin_response: string | null;
 images: string[];
 user: ComplaintUser;
 created_at: string;
}

export interface ComplaintOrder {
 id: number;
 order_code: string;
 status?: string;
 total?: number;
 created_at?: string;
}

export interface ComplaintsListResponse {
 success: boolean;
 data: Complaint[];
 meta?: { current_page: number; total: number };
}

export interface ComplaintOrdersResponse {
 success: boolean;
 data: ComplaintOrder[];
}

// Wishlist types
export type WishlistItem = {
 id: string | number;
 name: string;
 image: string;
 category: string;
 store: string;
 price: string;
 originalPrice?: string;
 savings?: string;
 rating: number;
 soldCount: number;
 isNew?: boolean;
 hasFreeDelivery?: boolean;
};

// Points & Rewards types (UI / mock)
export type PointsHistoryType ="earned"|"redeemed"|"expired";

export type PointsHistoryItem = {
 id: string | number;
 date: string;
 description: string;
 type: PointsHistoryType;
 points: number;
 balance: number;
};

// Points API types
export interface PointsSummaryValue {
 point_value: string;
 point_value_usd: string;
 estimated_value: string;
 estimated_value_formatted: string;
 currency_code: string;
 currency_symbol: string;
}

export interface PointsSummaryData {
 points: number;
 value: PointsSummaryValue;
 next_reward: string;
 expiry: string;
 earning_rules: string[];
 /** @deprecated Legacy fields - use points, value, expiry, earning_rules */
 balance?: number;
 pending_points?: number;
 expire_at?: string;
}

export interface PointsSummaryResponse {
 status: boolean;
 message: string;
 data: PointsSummaryData;
}

export interface PointsTransactionRule {
 title: string;
 code: string;
}

export interface PointsTransactionItem {
 id: number;
 points: number;
 source: string;
 status:"earned"|"redeemed"|"expired";
 type: string;
 reason: string | null;
 rule?: PointsTransactionRule | null;
 expires_at: string;
 created_at: string;
}

export interface PointsTransactionsResponse {
 status: boolean;
 message: string;
 data: {
 items: PointsTransactionItem[];
 pagination: {
 current_page: number;
 last_page: number;
 per_page: number;
 total: number;
 };
 };
}

export interface PointsExchangeGift {
 id: number;
 name: string;
 description: string;
 image: string;
 points_required: number;
 stock_quantity: number;
 category: string | null;
}

export interface PointsExchangeOptionsData {
 available: boolean;
 current_balance: number;
 options: {
 coupon: {
 enabled: boolean;
 min_points: number;
 max_points: number;
 discount_rate: number;
 description: string;
 };
 free_delivery: {
 enabled: boolean;
 points_cost: number;
 description: string;
 };
 gifts: {
 enabled: boolean;
 available_gifts: PointsExchangeGift[];
 };
 };
}

export interface PointsExchangeOptionsResponse {
 success: boolean;
 data: PointsExchangeOptionsData;
}

export interface ExchangeCouponResponse {
 success: boolean;
 message: string;
 data: {
 discount_amount: number;
 expires_at: string;
 };
}

export interface ExchangeGiftResponse {
 success: boolean;
 message: string;
 data: {
 gift_id: number;
 gift_name: string;
 status: string;
 };
}

export interface ExchangeHistoryItem {
 id: number;
 exchange_type:"coupon"|"free_delivery"|"gift";
 status: string;
 created_at: string;
 exchange_data: Record<string, unknown>;
}

export interface ExchangeHistoryResponse {
 success: boolean;
 data: {
 exchanges: ExchangeHistoryItem[];
 pagination: {
 current_page: number;
 last_page: number;
 per_page: number;
 total: number;
 };
 };
}

// Reviews types
export type ReviewType =
 |"product"
 |"store"
 |"delivery"
 |"scheduled_basket"
 |"recipe"
 |"brand"
 |"basket";

export type Review = {
 id: string | number;
 type: ReviewType;
 rating: number;
 date: string;
 createdAt: string;
};

export type ProductReview = Review & {
 type:"product";
 productName: string;
 productImage: string;
 seller: string;
 reviewText: string;
 images?: string[];
 orderId: string;
};

export type StoreReview = Review & {
 type:"store";
 storeName: string;
 storeIcon?: string;
 reviewText?: string;
};

export type DeliveryReview = Review & {
 type:"delivery";
 orderId: string;
 deliveryDate: string;
 /** When type is null from API (e.g. driver/person rating) */
 targetName?: string;
 reviewText?: string;
};

export type ScheduledBasketReview = Review & {
 type:"scheduled_basket";
 basketName: string;
 basketImage?: string;
 orderId?: string;
 reviewText?: string;
};

export type RecipeReview = Review & {
 type:"recipe";
 recipeName: string;
 recipeImage?: string;
 triedDate: string;
 reviewText?: string;
};

export type BrandReview = Review & {
 type:"brand";
 brandName: string;
 brandIcon?: string;
 reviewText?: string;
};

export type BasketReview = Review & {
 type:"basket";
 basketName: string;
 basketImage?: string;
 reviewText?: string;
};

export type ReviewUnion =
 | ProductReview
 | StoreReview
 | DeliveryReview
 | ScheduledBasketReview
 | RecipeReview
 | BrandReview
 | BasketReview;

export type UnreviewedItem = {
 id: string | number;
 productName: string;
 productImage: string;
 deliveryDate: string;
 orderId?: string;
};

// Address types
export type AddressLabel ="Home"|"Work"|"Other";

export interface NewAddressFormData {
 label: AddressLabel;
 governorate: string;
 city: string;
 area: string;
 streetName: string;
 nearestLandmark: string;
 buildingNumber?: string;
 floorApartment?: string;
 contactPhone: string;
 lat: number;
 lng: number;
 isDefault: boolean;
}

export interface CreateAddressPayload {
 label: AddressLabel;
 area_id: number;
 street_name?: string;
 nearest_landmark?: string;
 building_number?: string;
 floor_apartment?: string;
 contact_phone?: string;
 lat: number;
 lng: number;
 is_default: boolean;
}

export interface UpdateAddressPayload {
 label: AddressLabel;
 governorate_id: number;
 city_id: number;
 area_id: number;
 street_name?: string;
 nearest_landmark?: string;
 building_number?: string;
 floor_apartment?: string;
 contact_phone?: string;
 lat: number;
 lng: number;
 is_default: boolean;
}

// Address API Response Types
export interface AddressGovernorate {
 id: number;
 name: string;
 created_at: string;
}

export interface AddressCity {
 id: number;
 name: string;
 governorate: AddressGovernorate;
 created_at: string;
}

export interface AddressArea {
 id: number;
 name: string | { ar?: string; en?: string };
 base_fee?: number;
 lat?: string;
 lng?: string;
 city: AddressCity;
 created_at: string;
}

export interface Address {
 id: number;
 label: AddressLabel;
 street_name: string;
 nearest_landmark: string;
 building_number?: string;
 floor_apartment?: string;
 contact_phone: string;
 lat: number;
 lng: number;
 is_default: boolean;
 area: AddressArea;
 created_at: string;
 updated_at: string;
}

export interface AddressesResponse {
 status: boolean;
 message: string;
 data: {
 items: Address[];
 pagination: null | {
 current_page: number;
 last_page: number;
 per_page: number;
 total: number;
 };
 };
}

// ==================== Profile API Types ====================
export interface ProfileData {
 id: number;
 name: string;
 phone: string;
 email: string;
 city: string;
 image: string;
}

export interface ProfileResponse {
 status: boolean;
 message: string;
 data: ProfileData;
}

export interface UpdateProfilePayload {
 name: string;
 image?: File | string;
 city_id: number;
}

export interface UpdatePasswordPayload {
 old_password: string;
 new_password: string;
 new_password_confirmation: string;
}

export interface UpdateEmailPayload {
 email: string;
}

export interface UpdatePhonePayload {
 phone: string;
}

export interface VerifyProfilePayload {
 code: string;
 email?: string;
 phone?: string;
}

export interface GenericApiResponse {
 status: boolean;
 message: string;
 data?: any;
}

// ==================== Currency API Types ====================
export interface CurrencyItem {
 id: number;
 code: string;
 name: string;
 symbol: string;
 is_default: boolean;
}

export interface CurrenciesListResponse {
 status: boolean;
 message: string;
 data: {
 items: CurrencyItem[];
 pagination: null | Record<string, unknown>;
 };
}

export interface MyCurrencyData {
 id: number;
 code: string;
 name: string;
 symbol: string;
 exchange_rate: string;
 is_default: boolean;
 is_active: boolean;
 /** Missing provenance from older APIs does not establish a saved preference. */
 preference_source?: "user" | "default" | null;
}

export interface MyCurrencyResponse {
 status: boolean;
 message: string;
 data: MyCurrencyData;
}

export interface UpdateCurrencyPayload {
 currency_id: number;
}
