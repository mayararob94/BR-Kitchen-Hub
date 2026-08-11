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
