/**
 * Core domain types for MEALzinha Hub.
 *
 * Naming and shapes intentionally mirror the MEALzinha online project
 * (integer-cents money, price snapshots on order items, key/value settings)
 * so a future sync/migration is straightforward.
 */

// ─── Settings ───

export interface BusinessSettings {
  businessName: string;
  tradingName: string;
  abn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export interface BankSettings {
  accountName: string;
  bsb: string;
  accountNumber: string;
  paymentInstructions: string;
}

export interface OrderSettings {
  orderPrefix: string;
  orderNext: number;
  invoicePrefix: string;
  invoiceNext: number;
  defaultDeliveryFeeCents: number;
}

export interface PrintingSettings {
  invoicePaperSize: string; // "A4"
  labelSize: string; // "4x6"
  labelOrientation: string; // "portrait"
}

export interface AppSettings
  extends BusinessSettings,
    BankSettings,
    OrderSettings,
    PrintingSettings {}

// ─── Categories ───

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Meals / Products ───

export interface Meal {
  id: number;
  name: string;
  shortDescription: string;
  categoryId: number | null;
  categoryName?: string | null;
  priceCents: number;
  isActive: boolean;
  sortOrder: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Customers ───

export type DeliveryWindow = "morning" | "afternoon" | "anytime" | "";
export type DeliveryPreference = "home" | "safe_place" | "";

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  state: string;
  postcode: string;
  deliveryInstructions: string;
  deliveryWindow: DeliveryWindow;
  deliveryPreference: DeliveryPreference;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerStats {
  totalOrders: number;
  totalMeals: number;
  totalSpentCents: number;
  lastOrderDate: string | null;
}

// ─── Weekly Menu ───

export type WeekStatus = "draft" | "active" | "closed";

export interface WeeklyMenu {
  id: number;
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string; // YYYY-MM-DD (Sunday)
  status: WeekStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyMenuItem {
  id: number;
  weeklyMenuId: number;
  mealId: number;
  mealName: string; // convenience join
  priceCents: number; // price for this week (snapshot from meal at add time, editable)
  sortOrder: number;
  categoryName?: string | null;
}

// ─── Orders ───

export type OrderStatus =
  | "draft"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "partial";

export type DiscountType = "amount" | "percent";

export interface OrderItem {
  id: number;
  orderId: number;
  mealId: number | null;
  mealNameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  invoiceNumber: string | null;
  weeklyMenuId: number | null;
  customerId: number | null;
  deliveryDate: string | null;

  // Customer snapshot (captured at order time so historical labels/invoices
  // remain stable even if the customer record is later edited).
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  state: string;
  postcode: string;
  deliveryInstructions: string;
  deliveryWindow: DeliveryWindow;
  deliveryPreference: DeliveryPreference;

  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;

  subtotalCents: number;
  deliveryFeeCents: number;
  discountType: DiscountType;
  discountValue: number; // percent number, or dollar amount entered (cents when amount)
  discountCents: number; // actual applied discount in cents
  totalCents: number;

  amountPaidCents: number;
  paymentDate: string | null;
  paymentReference: string;

  notes: string;
  createdAt: string;
  updatedAt: string;

  items: OrderItem[];
  totalMeals: number;
}

// ─── Invoice (view model, assembled from Order + settings) ───

export interface InvoiceLineItem {
  mealName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

// ─── Production module: Ingredients ───

export type BaseUnit = "g" | "ml" | "each";

export interface Ingredient {
  id: number;
  name: string;
  category: string;
  baseUnit: BaseUnit;
  defaultYieldPct: number; // e.g. 75, 250
  priceCents: number | null; // cents per kg / L / each; null = unknown
  supplier: string;
  supplierSku: string;
  packSizeBase: number | null; // optional pack size in base units
  packPriceCents: number | null; // optional pack price
  purchaseIncrementBase: number | null; // optional purchasing round-up increment
  bufferPctOverride: number | null;
  notes: string;
  lastPriceUpdate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Effective price per kg/L/each in cents (derived from pack size if set). */
  effectivePriceCents: number | null;
}

// ─── Production module: Recipes ───

export type RecipeType = "final" | "batch";
export type ComponentType = "ingredient" | "recipe";

export interface RecipeComponent {
  id: number;
  recipeId: number;
  componentType: ComponentType;
  ingredientId: number | null;
  childRecipeId: number | null;
  quantityBase: number;
  yieldOverride: number | null;
  priceOverrideCents: number | null;
  prepNotes: string;
  sortOrder: number;
  // convenience joins
  name?: string;
  baseUnit?: BaseUnit;
}

export interface Recipe {
  id: number;
  mealId: number | null;
  name: string;
  recipeType: RecipeType;
  version: number;
  isActive: boolean;
  batchYieldBase: number | null;
  batchYieldUnit: BaseUnit;
  batchIncrement: number | null;
  instructions: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  components: RecipeComponent[];
}

// ─── Production module: computed (engine output) ───

export interface ComputedComponent {
  componentId: number;
  type: ComponentType;
  refId: number; // ingredientId or childRecipeId
  name: string;
  baseUnit: BaseUnit;
  cookedBase: number; // finished/used quantity per portion (or per batch input for batch ingredient)
  rawBase: number; // raw required per portion
  yieldPct: number;
  unitPriceCents: number | null; // per kg/L/each used
  costCents: number | null; // cost per portion for this component
  costUnavailable: boolean;
}

export interface ComputedRecipe {
  recipeId: number;
  type: RecipeType;
  name: string;
  components: ComputedComponent[];
  finishedWeightBase: number; // total finished/cooked weight per portion (final) or batch yield (batch)
  rawWeightBase: number; // total raw ingredient weight per portion/batch
  foodCostCents: number | null; // per portion (final) or per batch (batch)
  costUnavailable: boolean;
  // batch recipes only
  batchYieldBase?: number | null;
  costPerBaseFinishedCents?: number | null; // cents per base unit of finished output
  warnings: string[];
}

export interface IngredientRequirement {
  ingredientId: number;
  name: string;
  category: string;
  baseUnit: BaseUnit;
  supplier: string;
  requiredBase: number; // raw required, no buffer
  bufferPct: number;
  finalRequiredBase: number; // with buffer
  purchaseBase: number; // rounded to purchase increment
  purchaseIncrementBase: number | null;
  unitPriceCents: number | null;
  estimatedCostCents: number | null; // purchaseBase × price
  costUnavailable: boolean;
}

export interface DishProduction {
  mealId: number;
  recipeId: number | null;
  dishName: string;
  portions: number;
  hasRecipe: boolean;
  components: {
    name: string;
    type: ComponentType;
    baseUnit: BaseUnit;
    finishedBase: number; // cooked/finished total for all portions
    rawBase: number; // raw total for all portions (ingredients) or finished for sub-recipes
  }[];
  foodCostCents: number | null;
}

export interface SubRecipeProduction {
  recipeId: number;
  name: string;
  baseUnit: BaseUnit;
  requiredFinishedBase: number;
  batchYieldBase: number | null;
  theoreticalBatches: number | null;
  recommendedBatches: number | null;
  scaleFactor: number; // required / batchYield (theoretical)
  components: {
    name: string;
    type: ComponentType;
    baseUnit: BaseUnit;
    quantityBase: number; // scaled to production
  }[];
  costCents: number | null;
}

export interface ProductionComputation {
  weekId: number;
  totalOrders: number;
  totalMeals: number;
  distinctDishes: number;
  estimatedFoodCostCents: number | null;
  estimatedRawWeightBase: number;
  bufferPct: number;
  dishes: DishProduction[];
  subRecipes: SubRecipeProduction[];
  ingredients: IngredientRequirement[];
  estimatedPurchasingCostCents: number | null;
  warnings: string[];
}

export type ProductionStatus = "draft" | "finalised";

export interface ProductionPlan {
  id: number;
  weeklyMenuId: number;
  status: ProductionStatus;
  bufferPct: number;
  ordersSignature: string;
  createdAt: string;
  finalisedAt: string | null;
  updatedAt: string;
  snapshot: ProductionComputation | null;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  invoiceDate: string;
  deliveryDate: string | null;
  business: BusinessSettings;
  bank: BankSettings;
  customer: {
    name: string;
    phone: string;
    email: string;
    addressLines: string[];
  };
  lineItems: InvoiceLineItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
  amountPaidCents: number;
  paymentStatus: PaymentStatus;
  totalMeals: number;
}
