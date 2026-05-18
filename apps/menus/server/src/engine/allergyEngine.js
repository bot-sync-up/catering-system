// ============================================
// Allergy & Diet Engine
// בודק התאמת מנות לאורחים - ברמת מנה וברמת אורח
// ============================================

const prisma = require('../utils/db');

class AllergyEngine {
  /**
   * בודק האם פריט בטוח לאורח
   */
  async isItemSafeForGuest(menuItemId, guestId) {
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { allergies: true, diets: true },
    });
    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { allergies: true, diets: true },
    });
    if (!guest || !item) return { safe: false, reasons: ['פריט או אורח לא נמצא'] };

    const reasons = [];

    // אלרגיות - אם המנה מכילה אלרגן שלאורח יש
    for (const ga of guest.allergies) {
      if (item.allergies.find(ia => ia.allergyId === ga.allergyId)) {
        const allergy = await prisma.allergy.findUnique({ where: { id: ga.allergyId } });
        reasons.push(`מכיל אלרגן: ${allergy.name}`);
      }
    }

    // דיאטות - אם הדיאטה של האורח לא מתאימה למנה
    for (const gd of guest.diets) {
      const itemDiet = item.diets.find(id => id.dietId === gd.dietId);
      if (!itemDiet || !itemDiet.isSuitable) {
        const diet = await prisma.diet.findUnique({ where: { id: gd.dietId } });
        reasons.push(`לא מתאים לדיאטה: ${diet.name}`);
      }
    }

    return { safe: reasons.length === 0, reasons };
  }

  /**
   * סינון תפריט לפי אורח - מחזיר רק מנות מתאימות
   */
  async filterMenuForGuest(menuId, guestId) {
    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: {
        categories: {
          include: {
            items: { include: { allergies: true, diets: true } },
          },
        },
      },
    });
    if (!menu) return null;

    const filtered = { ...menu, categories: [] };
    for (const cat of menu.categories) {
      const safeItems = [];
      for (const item of cat.items) {
        const check = await this.isItemSafeForGuest(item.id, guestId);
        if (check.safe) safeItems.push(item);
      }
      filtered.categories.push({ ...cat, items: safeItems });
    }
    return filtered;
  }

  /**
   * דוח אלרגיות לאירוע - מסכם אילו מנות מתאימות לאילו אורחים
   */
  async eventReport(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        guests: {
          include: {
            allergies: { include: { allergy: true } },
            diets: { include: { diet: true } },
          },
        },
        items: { include: { menuItem: { include: { allergies: true, diets: true } } } },
      },
    });
    if (!order) return null;

    const report = {
      orderId,
      guestCount: order.guests.length,
      allergiesSummary: {},
      dietsSummary: {},
      conflicts: [],
    };

    for (const g of order.guests) {
      for (const ga of g.allergies) {
        const name = ga.allergy.name;
        report.allergiesSummary[name] = (report.allergiesSummary[name] || 0) + 1;
      }
      for (const gd of g.diets) {
        const name = gd.diet.name;
        report.dietsSummary[name] = (report.dietsSummary[name] || 0) + 1;
      }

      // חיפוש קונפליקטים
      for (const oi of order.items) {
        const check = await this.isItemSafeForGuest(oi.menuItemId, g.id);
        if (!check.safe) {
          report.conflicts.push({
            guestName: g.name,
            menuItem: oi.menuItem.name,
            reasons: check.reasons,
          });
        }
      }
    }

    return report;
  }
}

module.exports = new AllergyEngine();
