// מחוללי דאטה בעברית לבדיקות עומס
// שמות, רחובות, ערים, מוצרים - כדי שהבדיקה תייצג תעבורה אמיתית.

const FIRST_NAMES = [
  'משה', 'יוסף', 'דוד', 'אברהם', 'יצחק', 'יעקב', 'שמעון', 'לוי',
  'אהרון', 'מנחם', 'נחמן', 'שלמה', 'אליעזר', 'בנימין', 'נפתלי',
  'שרה', 'רבקה', 'רחל', 'לאה', 'דבורה', 'חנה', 'אסתר', 'מרים',
  'יהודית', 'תמר', 'נעמי', 'רות', 'אביגיל', 'דליה', 'חוה',
];

const LAST_NAMES = [
  'כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'דהן', 'אזולאי', 'אוחיון',
  'דושינסקי', 'פרידמן', 'רוזנברג', 'גולדשטיין', 'שפירא', 'וייס',
  'אדלר', 'הירש', 'קליין', 'גרוס', 'שטרן', 'ברגר',
];

const CITIES = [
  'ירושלים', 'בני ברק', 'מודיעין עילית', 'בית שמש', 'אלעד',
  'אשדוד', 'תל אביב', 'חיפה', 'נתניה', 'פתח תקווה',
  'רחובות', 'רעננה', 'הרצליה', 'ביתר עילית', 'קרית ספר',
];

const STREETS = [
  'רחוב רבי עקיבא', 'רחוב הרב שך', 'רחוב חזון איש', 'רחוב יהודה הנשיא',
  'רחוב הראשונים', 'רחוב הרצל', 'שדרות ירושלים', 'רחוב ויצמן',
  'רחוב בן גוריון', 'רחוב הרב קוק', 'רחוב חפץ חיים', 'רחוב מאיר',
];

const PRODUCTS = [
  { name: 'חלת שבת מתוקה', price: 18, category: 'מאפים', sku: 'BAKE-001' },
  { name: 'עוגת שמרים שוקולד', price: 45, category: 'מאפים', sku: 'BAKE-002' },
  { name: 'יין קידוש מובחר', price: 75, category: 'משקאות', sku: 'WINE-001' },
  { name: 'בקבוק יין אדום יבש', price: 89, category: 'משקאות', sku: 'WINE-002' },
  { name: 'בשר טחון בקר טרי קילו', price: 95, category: 'בשר', sku: 'MEAT-001' },
  { name: 'עוף שלם מהדרין', price: 65, category: 'בשר', sku: 'MEAT-002' },
  { name: 'דגים קרפיון לחג', price: 120, category: 'דגים', sku: 'FISH-001' },
  { name: 'סלסלת פירות יבשים', price: 55, category: 'פירות', sku: 'FRUIT-001' },
  { name: 'מארז מצות שמורה', price: 220, category: 'פסח', sku: 'PASS-001' },
];

const EVENT_TYPES = ['חתונה', 'בר מצווה', 'בת מצווה', 'ברית', 'אירוסין', 'חינוך הבית'];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomPerson() {
  const first = rand(FIRST_NAMES);
  const last = rand(LAST_NAMES);
  return {
    firstName: first,
    lastName: last,
    fullName: `${first} ${last}`,
    email: `${transliterate(first)}.${transliterate(last)}.${randomInt(1000, 9999)}@test.syncup.co.il`,
    phone: `05${randomInt(0, 9)}-${randomInt(1000000, 9999999)}`,
  };
}

export function randomAddress() {
  return {
    city: rand(CITIES),
    street: rand(STREETS),
    house: randomInt(1, 200),
    apt: randomInt(1, 30),
    zip: String(randomInt(1000000, 9999999)),
  };
}

export function randomOrder(itemCount = null) {
  const count = itemCount || randomInt(1, 6);
  const items = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const product = rand(PRODUCTS);
    const qty = randomInt(1, 3);
    items.push({ sku: product.sku, name: product.name, qty, price: product.price });
    total += product.price * qty;
  }
  return {
    items,
    total,
    currency: 'ILS',
    notes: 'הזמנה לכבוד שבת קודש',
  };
}

export function randomEvent() {
  return {
    type: rand(EVENT_TYPES),
    host: randomPerson(),
    address: randomAddress(),
    date: futureDate(7, 90),
    guestCount: randomInt(200, 800),
    adminCount: randomInt(3, 12),
    hallName: `אולמי ${rand(['פאר', 'גני', 'היכל', 'בית'])} ${rand(LAST_NAMES)}`,
  };
}

export function randomPayment(amount) {
  return {
    amount: amount || randomInt(50, 5000),
    currency: 'ILS',
    card: {
      number: '4580000000000000',
      cvv: '123',
      expMonth: '12',
      expYear: '30',
      holder: rand(FIRST_NAMES) + ' ' + rand(LAST_NAMES),
    },
    installments: randomInt(1, 6),
  };
}

function futureDate(minDays, maxDays) {
  const d = new Date();
  d.setDate(d.getDate() + randomInt(minDays, maxDays));
  return d.toISOString().split('T')[0];
}

// תעתיק בסיסי לעברית->לועזית עבור email-id
function transliterate(s) {
  const map = {
    'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v',
    'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k',
    'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's',
    'ע': 'a', 'פ': 'p', 'ף': 'p', 'צ': 'tz', 'ץ': 'tz', 'ק': 'k',
    'ר': 'r', 'ש': 'sh', 'ת': 't',
  };
  return s.split('').map(c => map[c] || c).join('');
}
