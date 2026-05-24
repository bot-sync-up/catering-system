// טיפוסים משותפים לכל החבילה

export type Currency = "ILS" | "USD" | "EUR";

export type EventType =
  | "wedding" // חתונה
  | "bar_mitzvah" // בר מצווה
  | "bat_mitzvah" // בת מצווה
  | "brit" // ברית
  | "corporate" // אירוע חברה
  | "engagement" // אירוסין
  | "sheva_brachot" // שבע ברכות
  | "henna" // חינה
  | "memorial" // אזכרה
  | "other";

export type KosherLevel =
  | "meat" // בשרי
  | "dairy" // חלבי
  | "pareve" // פרווה
  | "non_kosher";

export type Allergen =
  | "gluten"
  | "lactose"
  | "egg"
  | "peanut"
  | "tree_nut"
  | "sesame"
  | "soy"
  | "fish"
  | "shellfish"
  | "celery"
  | "mustard"
  | "sulfite";

export interface MenuItem {
  id: string;
  name: string; // עברית
  nameEn?: string;
  category: string;
  pricePerGuest: number;
  currency: Currency;
  kosher: KosherLevel;
  allergens: Allergen[];
  ingredients: string[];
  description?: string;
}

export interface Order {
  id: string;
  customerId: string;
  eventDate: Date;
  eventType: EventType;
  guestCount: number;
  items: Array<{ menuItemId: string; quantity: number }>;
  totalPrice: number;
  status: "draft" | "quoted" | "confirmed" | "delivered" | "cancelled";
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  language: "he" | "en" | "ar";
  segment?: "vip" | "high" | "medium" | "low" | "at_risk";
}
