/**
 * 100 חומרי גלם — בשר/עוף/דגים/ירקות/פירות/מאפים/יין/חלב/יבש/חד"פ.
 */
import { did } from "../utils/ids.js";
import { randInt, randDecimal } from "../utils/rng.js";
import { scaled } from "../context.js";
import type { SeedContext } from "../context.js";
import type { SeededSupplier } from "./suppliers.js";

interface ProductSpec {
  key: string;
  sku: string;
  name: string;
  hebrewName: string;
  unit: string;
  unitCost: number;
  unitPrice: number;
  category: string;
  isPerishable: boolean;
  shelfLifeDays?: number;
  supplierKey?: string;
}

export const PRODUCTS: ProductSpec[] = [
  // בשר ועוף
  { key: "entrecote", sku: "MT-001", name: "Entrecote", hebrewName: "אנטריקוט", unit: "ק\"ג", unitCost: 180, unitPrice: 260, category: "בשר", isPerishable: true, shelfLifeDays: 5, supplierKey: "meshek-chai" },
  { key: "filet", sku: "MT-002", name: "Filet Mignon", hebrewName: "פילה בקר", unit: "ק\"ג", unitCost: 280, unitPrice: 380, category: "בשר", isPerishable: true, shelfLifeDays: 5, supplierKey: "meshek-chai" },
  { key: "kebab", sku: "MT-003", name: "Kebab", hebrewName: "קבב מעורב", unit: "ק\"ג", unitCost: 75, unitPrice: 110, category: "בשר", isPerishable: true, shelfLifeDays: 3, supplierKey: "meshek-chai" },
  { key: "lamb-chops", sku: "MT-004", name: "Lamb Chops", hebrewName: "צלעות כבש", unit: "ק\"ג", unitCost: 220, unitPrice: 310, category: "בשר", isPerishable: true, shelfLifeDays: 5, supplierKey: "meshek-chai" },
  { key: "ground-beef", sku: "MT-005", name: "Ground Beef", hebrewName: "בקר טחון", unit: "ק\"ג", unitCost: 65, unitPrice: 95, category: "בשר", isPerishable: true, shelfLifeDays: 3, supplierKey: "meshek-chai" },
  { key: "chicken-breast", sku: "MT-006", name: "Chicken Breast", hebrewName: "חזה עוף", unit: "ק\"ג", unitCost: 42, unitPrice: 60, category: "עוף", isPerishable: true, shelfLifeDays: 4, supplierKey: "of-tov" },
  { key: "chicken-thigh", sku: "MT-007", name: "Chicken Thigh", hebrewName: "ירכי עוף", unit: "ק\"ג", unitCost: 32, unitPrice: 48, category: "עוף", isPerishable: true, shelfLifeDays: 4, supplierKey: "of-tov" },
  { key: "whole-chicken", sku: "MT-008", name: "Whole Chicken", hebrewName: "עוף שלם", unit: "יחידה", unitCost: 38, unitPrice: 55, category: "עוף", isPerishable: true, shelfLifeDays: 4, supplierKey: "of-tov" },
  { key: "turkey-breast", sku: "MT-009", name: "Turkey Breast", hebrewName: "חזה הודו", unit: "ק\"ג", unitCost: 55, unitPrice: 78, category: "עוף", isPerishable: true, shelfLifeDays: 4, supplierKey: "of-tov" },
  { key: "schnitzel", sku: "MT-010", name: "Schnitzel", hebrewName: "שניצל פרוס", unit: "ק\"ג", unitCost: 58, unitPrice: 85, category: "עוף", isPerishable: true, shelfLifeDays: 2, supplierKey: "of-tov" },
  // נקניקיות וטחונים
  { key: "merguez", sku: "MT-011", name: "Merguez", hebrewName: "נקניקיות מרגז", unit: "ק\"ג", unitCost: 60, unitPrice: 88, category: "בשר", isPerishable: true, shelfLifeDays: 7, supplierKey: "soglowek" },
  { key: "pastrami", sku: "MT-012", name: "Pastrami", hebrewName: "פסטרמה", unit: "ק\"ג", unitCost: 95, unitPrice: 140, category: "בשר", isPerishable: true, shelfLifeDays: 14, supplierKey: "soglowek" },
  // דגים
  { key: "salmon", sku: "FS-001", name: "Salmon", hebrewName: "סלמון טרי", unit: "ק\"ג", unitCost: 110, unitPrice: 165, category: "דגים", isPerishable: true, shelfLifeDays: 2, supplierKey: "carmel-fish" },
  { key: "denis", sku: "FS-002", name: "Denis", hebrewName: "דניס", unit: "ק\"ג", unitCost: 85, unitPrice: 125, category: "דגים", isPerishable: true, shelfLifeDays: 2, supplierKey: "carmel-fish" },
  { key: "musht", sku: "FS-003", name: "Tilapia", hebrewName: "אמנון (מושט)", unit: "ק\"ג", unitCost: 45, unitPrice: 68, category: "דגים", isPerishable: true, shelfLifeDays: 2, supplierKey: "carmel-fish" },
  { key: "carp", sku: "FS-004", name: "Carp", hebrewName: "קרפיון לגעפילטע", unit: "ק\"ג", unitCost: 38, unitPrice: 58, category: "דגים", isPerishable: true, shelfLifeDays: 2, supplierKey: "carmel-fish" },
  { key: "tuna-can", sku: "FS-005", name: "Canned Tuna", hebrewName: "טונה בשמן (פחית)", unit: "פחית 160 ג'", unitCost: 8, unitPrice: 14, category: "דגים", isPerishable: false },
  // ירקות
  { key: "tomato", sku: "VG-001", name: "Tomato", hebrewName: "עגבניות", unit: "ק\"ג", unitCost: 6, unitPrice: 10, category: "ירקות", isPerishable: true, shelfLifeDays: 7, supplierKey: "shuk-carmel" },
  { key: "cucumber", sku: "VG-002", name: "Cucumber", hebrewName: "מלפפונים", unit: "ק\"ג", unitCost: 5, unitPrice: 9, category: "ירקות", isPerishable: true, shelfLifeDays: 7, supplierKey: "shuk-carmel" },
  { key: "pepper-red", sku: "VG-003", name: "Red Pepper", hebrewName: "פלפל אדום", unit: "ק\"ג", unitCost: 12, unitPrice: 18, category: "ירקות", isPerishable: true, shelfLifeDays: 10, supplierKey: "shuk-carmel" },
  { key: "pepper-yellow", sku: "VG-004", name: "Yellow Pepper", hebrewName: "פלפל צהוב", unit: "ק\"ג", unitCost: 13, unitPrice: 19, category: "ירקות", isPerishable: true, shelfLifeDays: 10, supplierKey: "shuk-carmel" },
  { key: "onion", sku: "VG-005", name: "Onion", hebrewName: "בצל יבש", unit: "ק\"ג", unitCost: 4, unitPrice: 7, category: "ירקות", isPerishable: false, shelfLifeDays: 60, supplierKey: "shuk-carmel" },
  { key: "garlic", sku: "VG-006", name: "Garlic", hebrewName: "שום", unit: "ק\"ג", unitCost: 22, unitPrice: 32, category: "ירקות", isPerishable: false, shelfLifeDays: 30, supplierKey: "shuk-carmel" },
  { key: "potato", sku: "VG-007", name: "Potato", hebrewName: "תפוחי אדמה", unit: "ק\"ג", unitCost: 4, unitPrice: 7, category: "ירקות", isPerishable: false, shelfLifeDays: 30, supplierKey: "shuk-carmel" },
  { key: "sweet-potato", sku: "VG-008", name: "Sweet Potato", hebrewName: "בטטה", unit: "ק\"ג", unitCost: 8, unitPrice: 13, category: "ירקות", isPerishable: false, shelfLifeDays: 30, supplierKey: "shuk-carmel" },
  { key: "carrot", sku: "VG-009", name: "Carrot", hebrewName: "גזר", unit: "ק\"ג", unitCost: 4, unitPrice: 7, category: "ירקות", isPerishable: true, shelfLifeDays: 21, supplierKey: "shuk-carmel" },
  { key: "lettuce", sku: "VG-010", name: "Lettuce", hebrewName: "חסה בלי תולעים", unit: "ק\"ג", unitCost: 14, unitPrice: 22, category: "ירקות", isPerishable: true, shelfLifeDays: 5, supplierKey: "shuk-carmel" },
  { key: "spinach", sku: "VG-011", name: "Spinach", hebrewName: "תרד טרי", unit: "ק\"ג", unitCost: 18, unitPrice: 28, category: "ירקות", isPerishable: true, shelfLifeDays: 4, supplierKey: "shuk-carmel" },
  { key: "eggplant", sku: "VG-012", name: "Eggplant", hebrewName: "חצילים", unit: "ק\"ג", unitCost: 7, unitPrice: 12, category: "ירקות", isPerishable: true, shelfLifeDays: 10, supplierKey: "shuk-carmel" },
  { key: "zucchini", sku: "VG-013", name: "Zucchini", hebrewName: "קישואים", unit: "ק\"ג", unitCost: 6, unitPrice: 10, category: "ירקות", isPerishable: true, shelfLifeDays: 7, supplierKey: "shuk-carmel" },
  { key: "cabbage", sku: "VG-014", name: "Cabbage", hebrewName: "כרוב לבן", unit: "ק\"ג", unitCost: 4, unitPrice: 7, category: "ירקות", isPerishable: true, shelfLifeDays: 14, supplierKey: "shuk-carmel" },
  { key: "cauliflower", sku: "VG-015", name: "Cauliflower", hebrewName: "כרובית", unit: "ק\"ג", unitCost: 9, unitPrice: 14, category: "ירקות", isPerishable: true, shelfLifeDays: 7, supplierKey: "shuk-carmel" },
  { key: "broccoli", sku: "VG-016", name: "Broccoli", hebrewName: "ברוקולי", unit: "ק\"ג", unitCost: 11, unitPrice: 17, category: "ירקות", isPerishable: true, shelfLifeDays: 7, supplierKey: "shuk-carmel" },
  { key: "parsley", sku: "VG-017", name: "Parsley", hebrewName: "פטרוזיליה", unit: "צרור", unitCost: 3, unitPrice: 5, category: "ירקות", isPerishable: true, shelfLifeDays: 5, supplierKey: "shuk-carmel" },
  { key: "cilantro", sku: "VG-018", name: "Cilantro", hebrewName: "כוסברה", unit: "צרור", unitCost: 3, unitPrice: 5, category: "ירקות", isPerishable: true, shelfLifeDays: 5, supplierKey: "shuk-carmel" },
  { key: "mint", sku: "VG-019", name: "Mint", hebrewName: "נענע", unit: "צרור", unitCost: 4, unitPrice: 6, category: "ירקות", isPerishable: true, shelfLifeDays: 5, supplierKey: "shuk-carmel" },
  { key: "dill", sku: "VG-020", name: "Dill", hebrewName: "שמיר", unit: "צרור", unitCost: 4, unitPrice: 6, category: "ירקות", isPerishable: true, shelfLifeDays: 5, supplierKey: "shuk-carmel" },
  // פירות
  { key: "apple", sku: "FR-001", name: "Apple", hebrewName: "תפוחי עץ", unit: "ק\"ג", unitCost: 9, unitPrice: 14, category: "פירות", isPerishable: true, shelfLifeDays: 21, supplierKey: "shuk-carmel" },
  { key: "orange", sku: "FR-002", name: "Orange", hebrewName: "תפוזים", unit: "ק\"ג", unitCost: 6, unitPrice: 10, category: "פירות", isPerishable: true, shelfLifeDays: 14, supplierKey: "shuk-carmel" },
  { key: "banana", sku: "FR-003", name: "Banana", hebrewName: "בננות", unit: "ק\"ג", unitCost: 8, unitPrice: 13, category: "פירות", isPerishable: true, shelfLifeDays: 7, supplierKey: "shuk-carmel" },
  { key: "grapes", sku: "FR-004", name: "Grapes", hebrewName: "ענבים", unit: "ק\"ג", unitCost: 18, unitPrice: 28, category: "פירות", isPerishable: true, shelfLifeDays: 7, supplierKey: "shuk-carmel" },
  { key: "strawberry", sku: "FR-005", name: "Strawberry", hebrewName: "תותים", unit: "ק\"ג", unitCost: 28, unitPrice: 45, category: "פירות", isPerishable: true, shelfLifeDays: 3, supplierKey: "shuk-carmel" },
  { key: "watermelon", sku: "FR-006", name: "Watermelon", hebrewName: "אבטיח", unit: "ק\"ג", unitCost: 3, unitPrice: 5, category: "פירות", isPerishable: true, shelfLifeDays: 14, supplierKey: "shuk-carmel" },
  { key: "lemon", sku: "FR-007", name: "Lemon", hebrewName: "לימונים", unit: "ק\"ג", unitCost: 9, unitPrice: 15, category: "פירות", isPerishable: false, shelfLifeDays: 30, supplierKey: "shuk-carmel" },
  // מאפים
  { key: "challah", sku: "BR-001", name: "Challah", hebrewName: "חלה שבת", unit: "יחידה", unitCost: 14, unitPrice: 22, category: "מאפים", isPerishable: true, shelfLifeDays: 3, supplierKey: "berman" },
  { key: "bread-white", sku: "BR-002", name: "White Bread", hebrewName: "לחם לבן פרוס", unit: "יחידה", unitCost: 7, unitPrice: 11, category: "מאפים", isPerishable: true, shelfLifeDays: 5, supplierKey: "angel" },
  { key: "bread-rye", sku: "BR-003", name: "Rye Bread", hebrewName: "לחם שיפון", unit: "יחידה", unitCost: 9, unitPrice: 14, category: "מאפים", isPerishable: true, shelfLifeDays: 5, supplierKey: "angel" },
  { key: "pita", sku: "BR-004", name: "Pita", hebrewName: "פיתות", unit: "חבילה", unitCost: 6, unitPrice: 10, category: "מאפים", isPerishable: true, shelfLifeDays: 5, supplierKey: "angel" },
  { key: "burekas", sku: "BR-005", name: "Burekas", hebrewName: "בורקס גבינה", unit: "יחידה", unitCost: 3, unitPrice: 6, category: "מאפים", isPerishable: true, shelfLifeDays: 5, supplierKey: "berman" },
  { key: "rugelach", sku: "BR-006", name: "Rugelach", hebrewName: "רוגלך שוקולד", unit: "ק\"ג", unitCost: 38, unitPrice: 58, category: "מאפים", isPerishable: true, shelfLifeDays: 7, supplierKey: "berman" },
  // יין ומשקאות
  { key: "wine-cab", sku: "WN-001", name: "Cabernet Sauvignon", hebrewName: "יין קברנה סוביניון", unit: "בקבוק 750 מ\"ל", unitCost: 55, unitPrice: 90, category: "יין", isPerishable: false, supplierKey: "milgam" },
  { key: "wine-merlot", sku: "WN-002", name: "Merlot", hebrewName: "יין מרלו", unit: "בקבוק 750 מ\"ל", unitCost: 50, unitPrice: 82, category: "יין", isPerishable: false, supplierKey: "milgam" },
  { key: "wine-chardonnay", sku: "WN-003", name: "Chardonnay", hebrewName: "יין שרדונה", unit: "בקבוק 750 מ\"ל", unitCost: 55, unitPrice: 88, category: "יין", isPerishable: false, supplierKey: "yarden-wines" },
  { key: "wine-rose", sku: "WN-004", name: "Rosé", hebrewName: "יין רוזה", unit: "בקבוק 750 מ\"ל", unitCost: 48, unitPrice: 75, category: "יין", isPerishable: false, supplierKey: "yarden-wines" },
  { key: "grape-juice", sku: "WN-005", name: "Grape Juice", hebrewName: "מיץ ענבים לקידוש", unit: "בקבוק 1 ליטר", unitCost: 22, unitPrice: 35, category: "משקאות", isPerishable: false },
  { key: "soda", sku: "DR-001", name: "Soda", hebrewName: "סודה מינרלית", unit: "בקבוק 1.5 ליטר", unitCost: 4, unitPrice: 8, category: "משקאות", isPerishable: false },
  { key: "cola", sku: "DR-002", name: "Cola", hebrewName: "קולה", unit: "בקבוק 1.5 ליטר", unitCost: 7, unitPrice: 13, category: "משקאות", isPerishable: false },
  { key: "fanta", sku: "DR-003", name: "Fanta", hebrewName: "פנטה", unit: "בקבוק 1.5 ליטר", unitCost: 7, unitPrice: 13, category: "משקאות", isPerishable: false },
  { key: "sprite", sku: "DR-004", name: "Sprite", hebrewName: "ספרייט", unit: "בקבוק 1.5 ליטר", unitCost: 7, unitPrice: 13, category: "משקאות", isPerishable: false },
  { key: "orange-juice", sku: "DR-005", name: "Orange Juice", hebrewName: "מיץ תפוזים סחוט", unit: "ליטר", unitCost: 15, unitPrice: 24, category: "משקאות", isPerishable: true, shelfLifeDays: 7 },
  { key: "water", sku: "DR-006", name: "Mineral Water", hebrewName: "מים מינרלים", unit: "בקבוק 1.5 ליטר", unitCost: 3, unitPrice: 7, category: "משקאות", isPerishable: false },
  // חלב
  { key: "milk-3", sku: "DA-001", name: "Milk 3%", hebrewName: "חלב תנובה 3%", unit: "ליטר", unitCost: 6, unitPrice: 9, category: "חלב", isPerishable: true, shelfLifeDays: 7, supplierKey: "tnuva" },
  { key: "yogurt", sku: "DA-002", name: "Yogurt", hebrewName: "יוגורט תנובה", unit: "כוס 200 ג'", unitCost: 4, unitPrice: 7, category: "חלב", isPerishable: true, shelfLifeDays: 14, supplierKey: "tnuva" },
  { key: "cheese-yellow", sku: "DA-003", name: "Yellow Cheese", hebrewName: "גבינה צהובה עמק", unit: "ק\"ג", unitCost: 68, unitPrice: 95, category: "חלב", isPerishable: true, shelfLifeDays: 21, supplierKey: "tnuva" },
  { key: "cheese-feta", sku: "DA-004", name: "Feta", hebrewName: "גבינת פטה בולגרית", unit: "ק\"ג", unitCost: 55, unitPrice: 80, category: "חלב", isPerishable: true, shelfLifeDays: 30, supplierKey: "tara" },
  { key: "cheese-cottage", sku: "DA-005", name: "Cottage", hebrewName: "קוטג' 5%", unit: "גביע 250 ג'", unitCost: 6, unitPrice: 9, category: "חלב", isPerishable: true, shelfLifeDays: 14, supplierKey: "tnuva" },
  { key: "cream", sku: "DA-006", name: "Cream 38%", hebrewName: "שמנת מתוקה 38%", unit: "ליטר", unitCost: 28, unitPrice: 42, category: "חלב", isPerishable: true, shelfLifeDays: 14, supplierKey: "tnuva" },
  { key: "butter", sku: "DA-007", name: "Butter", hebrewName: "חמאה תנובה", unit: "חבילה 200 ג'", unitCost: 12, unitPrice: 18, category: "חלב", isPerishable: true, shelfLifeDays: 30, supplierKey: "tnuva" },
  { key: "eggs", sku: "DA-008", name: "Eggs", hebrewName: "ביצים L", unit: "תבנית 30", unitCost: 32, unitPrice: 48, category: "חלב", isPerishable: true, shelfLifeDays: 30 },
  // יבש
  { key: "rice-white", sku: "DR-007", name: "White Rice", hebrewName: "אורז לבן", unit: "ק\"ג", unitCost: 8, unitPrice: 13, category: "יבש", isPerishable: false, supplierKey: "neto" },
  { key: "rice-basmati", sku: "DR-008", name: "Basmati Rice", hebrewName: "אורז בסמטי", unit: "ק\"ג", unitCost: 14, unitPrice: 22, category: "יבש", isPerishable: false, supplierKey: "neto" },
  { key: "couscous", sku: "DR-009", name: "Couscous", hebrewName: "קוסקוס מרוקאי", unit: "ק\"ג", unitCost: 14, unitPrice: 22, category: "יבש", isPerishable: false, supplierKey: "neto" },
  { key: "pasta", sku: "DR-010", name: "Pasta", hebrewName: "פסטה", unit: "ק\"ג", unitCost: 9, unitPrice: 14, category: "יבש", isPerishable: false, supplierKey: "neto" },
  { key: "flour", sku: "DR-011", name: "Flour", hebrewName: "קמח לבן", unit: "ק\"ג", unitCost: 4, unitPrice: 7, category: "יבש", isPerishable: false, supplierKey: "neto" },
  { key: "sugar", sku: "DR-012", name: "Sugar", hebrewName: "סוכר לבן", unit: "ק\"ג", unitCost: 5, unitPrice: 8, category: "יבש", isPerishable: false, supplierKey: "neto" },
  { key: "salt", sku: "DR-013", name: "Salt", hebrewName: "מלח אכילה", unit: "ק\"ג", unitCost: 3, unitPrice: 5, category: "יבש", isPerishable: false, supplierKey: "neto" },
  { key: "oil-canola", sku: "DR-014", name: "Canola Oil", hebrewName: "שמן קנולה", unit: "ליטר", unitCost: 12, unitPrice: 18, category: "יבש", isPerishable: false, supplierKey: "neto" },
  { key: "oil-olive", sku: "DR-015", name: "Olive Oil", hebrewName: "שמן זית כתית", unit: "ליטר", unitCost: 45, unitPrice: 65, category: "יבש", isPerishable: false, supplierKey: "neto" },
  { key: "chickpeas", sku: "DR-016", name: "Chickpeas", hebrewName: "חומוס יבש", unit: "ק\"ג", unitCost: 12, unitPrice: 18, category: "יבש", isPerishable: false, supplierKey: "neto" },
  { key: "tahini", sku: "DR-017", name: "Tahini", hebrewName: "טחינה גולמית", unit: "ק\"ג", unitCost: 22, unitPrice: 35, category: "יבש", isPerishable: false, supplierKey: "shufersal-pro" },
  { key: "humus-paste", sku: "DR-018", name: "Hummus", hebrewName: "חומוס מוכן", unit: "ק\"ג", unitCost: 18, unitPrice: 30, category: "יבש", isPerishable: true, shelfLifeDays: 14 },
  { key: "matzah", sku: "DR-019", name: "Matzah", hebrewName: "מצה לפסח", unit: "ק\"ג", unitCost: 28, unitPrice: 42, category: "יבש", isPerishable: false },
  { key: "spice-paprika", sku: "SP-001", name: "Paprika", hebrewName: "פפריקה אדומה מתוקה", unit: "ק\"ג", unitCost: 38, unitPrice: 55, category: "תבלינים", isPerishable: false },
  { key: "spice-cumin", sku: "SP-002", name: "Cumin", hebrewName: "כמון טחון", unit: "ק\"ג", unitCost: 45, unitPrice: 68, category: "תבלינים", isPerishable: false },
  { key: "spice-turmeric", sku: "SP-003", name: "Turmeric", hebrewName: "כורכום", unit: "ק\"ג", unitCost: 42, unitPrice: 62, category: "תבלינים", isPerishable: false },
  { key: "spice-zaatar", sku: "SP-004", name: "Zaatar", hebrewName: "זעתר", unit: "ק\"ג", unitCost: 48, unitPrice: 72, category: "תבלינים", isPerishable: false },
  { key: "spice-baharat", sku: "SP-005", name: "Baharat", hebrewName: "בהרט", unit: "ק\"ג", unitCost: 52, unitPrice: 78, category: "תבלינים", isPerishable: false },
  { key: "spice-pepper", sku: "SP-006", name: "Black Pepper", hebrewName: "פלפל שחור גרוס", unit: "ק\"ג", unitCost: 65, unitPrice: 95, category: "תבלינים", isPerishable: false },
  // אגוזים
  { key: "almonds", sku: "NT-001", name: "Almonds", hebrewName: "שקדים", unit: "ק\"ג", unitCost: 65, unitPrice: 95, category: "אגוזים", isPerishable: false },
  { key: "walnuts", sku: "NT-002", name: "Walnuts", hebrewName: "אגוזי מלך", unit: "ק\"ג", unitCost: 70, unitPrice: 100, category: "אגוזים", isPerishable: false },
  { key: "pecans", sku: "NT-003", name: "Pecans", hebrewName: "אגוזי פקאן", unit: "ק\"ג", unitCost: 85, unitPrice: 125, category: "אגוזים", isPerishable: false },
  { key: "pine-nuts", sku: "NT-004", name: "Pine Nuts", hebrewName: "צנוברים", unit: "ק\"ג", unitCost: 220, unitPrice: 310, category: "אגוזים", isPerishable: false },
  // חד"פ ומוצרי מטבח
  { key: "plates-l", sku: "DS-001", name: "Plates L", hebrewName: "צלחות גדולות חד\"פ", unit: "חבילה 50", unitCost: 18, unitPrice: 28, category: "חד\"פ", isPerishable: false, supplierKey: "keter-disposables" },
  { key: "plates-s", sku: "DS-002", name: "Plates S", hebrewName: "צלחות קטנות חד\"פ", unit: "חבילה 50", unitCost: 12, unitPrice: 20, category: "חד\"פ", isPerishable: false, supplierKey: "keter-disposables" },
  { key: "cutlery", sku: "DS-003", name: "Cutlery Set", hebrewName: "סט סכו\"ם חד\"פ", unit: "חבילה 100", unitCost: 28, unitPrice: 45, category: "חד\"פ", isPerishable: false, supplierKey: "keter-disposables" },
  { key: "napkins", sku: "DS-004", name: "Napkins", hebrewName: "מפיות חד\"פ", unit: "חבילה 100", unitCost: 8, unitPrice: 14, category: "חד\"פ", isPerishable: false, supplierKey: "keter-disposables" },
  { key: "cups", sku: "DS-005", name: "Cups", hebrewName: "כוסות חד\"פ", unit: "חבילה 100", unitCost: 14, unitPrice: 24, category: "חד\"פ", isPerishable: false, supplierKey: "keter-disposables" },
  { key: "tablecloth", sku: "DS-006", name: "Tablecloth", hebrewName: "מפת שולחן חד\"פ", unit: "יחידה", unitCost: 6, unitPrice: 12, category: "חד\"פ", isPerishable: false, supplierKey: "keter-disposables" },
  { key: "aluminum", sku: "DS-007", name: "Aluminum Foil", hebrewName: "אלומיניום", unit: "גליל", unitCost: 22, unitPrice: 35, category: "חד\"פ", isPerishable: false },
  { key: "trays", sku: "DS-008", name: "Disposable Trays", hebrewName: "תבניות הגשה חד\"פ", unit: "חבילה 25", unitCost: 32, unitPrice: 48, category: "חד\"פ", isPerishable: false, supplierKey: "yofi-yeladim" },
  // קטניות וביצים
  { key: "lentils", sku: "DR-020", name: "Lentils", hebrewName: "עדשים אדומות", unit: "ק\"ג", unitCost: 10, unitPrice: 16, category: "יבש", isPerishable: false, supplierKey: "neto" },
  { key: "beans-white", sku: "DR-021", name: "White Beans", hebrewName: "שעועית לבנה", unit: "ק\"ג", unitCost: 11, unitPrice: 17, category: "יבש", isPerishable: false, supplierKey: "neto" },
  // קפה ותה
  { key: "coffee", sku: "BV-001", name: "Coffee", hebrewName: "קפה שחור טחון", unit: "ק\"ג", unitCost: 95, unitPrice: 145, category: "קפה ותה", isPerishable: false },
  { key: "tea", sku: "BV-002", name: "Tea", hebrewName: "תה ויסוצקי", unit: "חבילה 25", unitCost: 14, unitPrice: 22, category: "קפה ותה", isPerishable: false },
  { key: "sugar-sticks", sku: "BV-003", name: "Sugar Sticks", hebrewName: "סוכר במקלות", unit: "חבילה 1000", unitCost: 38, unitPrice: 58, category: "קפה ותה", isPerishable: false },
];

export interface SeededProduct extends ProductSpec {
  id: string;
}

export async function seedProducts(
  ctx: SeedContext,
  suppliers: SeededSupplier[],
): Promise<SeededProduct[]> {
  const { prisma, tenantId, factor } = ctx;
  const count = scaled(PRODUCTS.length, factor);
  const selected = PRODUCTS.slice(0, count);
  const supplierMap = new Map(suppliers.map((s) => [s.key, s]));
  const out: SeededProduct[] = [];

  for (const p of selected) {
    const id = did(`product:${tenantId}:${p.key}`);
    await prisma.product.upsert({
      where: { id },
      update: { unitCost: p.unitCost as any, unitPrice: p.unitPrice as any },
      create: {
        id,
        tenantId,
        sku: p.sku,
        name: p.name,
        hebrewName: p.hebrewName,
        unit: p.unit,
        unitCost: p.unitCost as any,
        unitPrice: p.unitPrice as any,
        isActive: true,
        isPerishable: p.isPerishable,
        shelfLifeDays: p.shelfLifeDays ?? null,
        metadata: { category: p.category } as any,
      },
    });

    // StockLevel — main location
    const stockId = did(`stock:${id}:main`);
    await prisma.stockLevel.upsert({
      where: { productId_location: { productId: id, location: "main" } },
      update: {},
      create: {
        id: stockId,
        tenantId,
        productId: id,
        location: "main",
        quantity: randDecimal(10, 200, 2) as any,
        reorderLevel: randDecimal(5, 30) as any,
        reorderQty: randDecimal(20, 80) as any,
      },
    });

    // SupplierPrice
    if (p.supplierKey && supplierMap.has(p.supplierKey)) {
      const supplier = supplierMap.get(p.supplierKey)!;
      const sp = did(`sp:${supplier.id}:${id}`);
      await prisma.supplierPrice.upsert({
        where: { id: sp },
        update: {},
        create: {
          id: sp,
          tenantId,
          supplierId: supplier.id,
          productId: id,
          price: p.unitCost as any,
          currency: "ILS",
          minQuantity: 1 as any,
          leadTimeDays: randInt(1, 7),
          validFrom: new Date("2026-01-01"),
        },
      });
    }

    out.push({ ...p, id });
  }

  return out;
}
