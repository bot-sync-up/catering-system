// ============================================
// Pricing Engine - מנוע התמחור הראשי
// ============================================
// סדר חישוב:
// 1. מחיר בסיס לפריט
// 2. תמחור עונתי (אם רלוונטי לתאריך)
// 3. מחירון לקוח (B2B / VIP)
// 4. חבילה (אם הוזמנה)
// 5. סיכום ביניים
// 6. קופון
// 7. מימוש נקודות נאמנות
// 8. סך הכל סופי
// ============================================

const prisma = require('../utils/db');
const dayjs = require('dayjs');

class PricingEngine {
  /**
   * מחיר ליחידת פריט בודד, מתחשב בעונתיות ומחירון
   */
  async getEffectiveItemPrice(menuItemId, { customerId = null, date = new Date() } = {}) {
    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { seasonalPrices: true },
    });
    if (!item) throw Object.assign(new Error('פריט לא נמצא'), { statusCode: 404 });

    let price = item.basePrice;
    const breakdown = [{ stage: 'base', price, label: 'מחיר בסיס' }];

    // 1. תמחור עונתי - בודקים אם יש תקופה פעילה
    const seasonal = await this._getActiveSeasonalForItem(menuItemId, date);
    if (seasonal) {
      const before = price;
      if (seasonal.fixedPrice != null) {
        price = seasonal.fixedPrice;
      } else {
        price = price * seasonal.multiplier;
      }
      breakdown.push({
        stage: 'seasonal',
        price,
        delta: price - before,
        label: `תמחור עונתי: ${seasonal.name}`,
      });
    }

    // 2. מחירון לקוח
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { priceList: { include: { itemPrices: true } } },
      });
      if (customer?.priceList) {
        const itemOverride = customer.priceList.itemPrices.find(p => p.menuItemId === menuItemId);
        const before = price;
        if (itemOverride) {
          if (itemOverride.customPrice != null) {
            price = itemOverride.customPrice;
          } else if (itemOverride.discount != null) {
            price = price * (1 - itemOverride.discount / 100);
          }
          breakdown.push({
            stage: 'priceList-item',
            price,
            delta: price - before,
            label: `מחירון "${customer.priceList.name}" - פריט`,
          });
        } else if (customer.priceList.globalDiscount > 0) {
          price = price * (1 - customer.priceList.globalDiscount / 100);
          breakdown.push({
            stage: 'priceList-global',
            price,
            delta: price - before,
            label: `הנחת מחירון "${customer.priceList.name}" ${customer.priceList.globalDiscount}%`,
          });
        }
      }
    }

    return { price: round(price), breakdown };
  }

  async _getActiveSeasonalForItem(menuItemId, date) {
    const candidates = await prisma.seasonalPricing.findMany({
      where: {
        isActive: true,
        validFrom: { lte: date },
        validUntil: { gte: date },
        OR: [{ menuItemId }, { menuItemId: null }],
      },
      orderBy: [{ priority: 'desc' }, { menuItemId: 'desc' }], // ספציפי קודם
    });
    return candidates[0] || null;
  }

  /**
   * חישוב מלא להזמנה - הקלט הוא טיוטה (cart)
   * @param {Object} cart
   * @param {string} cart.customerId
   * @param {Array<{menuItemId, quantity}>} cart.items
   * @param {string} [cart.packageId]
   * @param {number} [cart.guestCount]
   * @param {string} [cart.couponCode]
   * @param {number} [cart.loyaltyPointsToRedeem]
   * @param {Date} [cart.eventDate]
   */
  async calculateOrder(cart) {
    const date = cart.eventDate ? new Date(cart.eventDate) : new Date();
    const customerId = cart.customerId;
    const guestCount = cart.guestCount || 1;
    const result = {
      items: [],
      packagePrice: 0,
      subtotal: 0,
      discounts: [],
      discountAmount: 0,
      loyaltyDiscount: 0,
      pointsToEarn: 0,
      pointsRedeemed: 0,
      total: 0,
      breakdown: [],
    };

    // 1. פריטים
    for (const ci of (cart.items || [])) {
      const { price, breakdown } = await this.getEffectiveItemPrice(ci.menuItemId, { customerId, date });
      const lineTotal = round(price * ci.quantity);
      result.items.push({
        menuItemId: ci.menuItemId,
        quantity: ci.quantity,
        unitPrice: price,
        totalPrice: lineTotal,
        breakdown,
      });
      result.subtotal += lineTotal;
    }

    // 2. חבילה
    if (cart.packageId) {
      const pkg = await prisma.package.findUnique({
        where: { id: cart.packageId },
        include: { items: { include: { menuItem: true } } },
      });
      if (!pkg) throw Object.assign(new Error('חבילה לא נמצאה'), { statusCode: 404 });
      if (guestCount < pkg.minGuests) {
        throw Object.assign(
          new Error(`חבילה זו דורשת מינימום ${pkg.minGuests} אורחים`),
          { statusCode: 400, code: 'MIN_GUESTS' }
        );
      }
      if (pkg.maxGuests && guestCount > pkg.maxGuests) {
        throw Object.assign(
          new Error(`חבילה זו מוגבלת ל-${pkg.maxGuests} אורחים`),
          { statusCode: 400, code: 'MAX_GUESTS' }
        );
      }
      const pkgTotal = pkg.basePrice + (pkg.pricePerGuest || 0) * guestCount;
      result.packagePrice = round(pkgTotal);
      result.subtotal += result.packagePrice;
      result.breakdown.push({
        stage: 'package',
        label: `חבילה: ${pkg.name} (${guestCount} אורחים)`,
        price: result.packagePrice,
      });
    }

    result.subtotal = round(result.subtotal);

    // 3. קופון
    if (cart.couponCode) {
      const couponResult = await this._applyCoupon(cart.couponCode, customerId, result.subtotal);
      result.discountAmount += couponResult.amount;
      result.discounts.push(couponResult);
    }

    // 4. הנחת רמת נאמנות
    if (customerId) {
      const tierDiscount = await this._applyTierDiscount(customerId, result.subtotal);
      if (tierDiscount.amount > 0) {
        result.discountAmount += tierDiscount.amount;
        result.discounts.push(tierDiscount);
      }
    }

    // 5. מימוש נקודות
    if (cart.loyaltyPointsToRedeem && customerId) {
      const redeemResult = await this._redeemPoints(customerId, cart.loyaltyPointsToRedeem, result.subtotal);
      result.loyaltyDiscount = redeemResult.discount;
      result.pointsRedeemed = redeemResult.points;
    }

    result.discountAmount = round(result.discountAmount);
    result.total = round(Math.max(0, result.subtotal - result.discountAmount - result.loyaltyDiscount));

    // 6. צבירת נקודות (1 נק' לכל ש"ח, מוכפל לפי טייר)
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      const tierConfig = await prisma.loyaltyTierConfig.findUnique({
        where: { tier: customer?.loyaltyTier || 'BRONZE' },
      });
      const multiplier = tierConfig?.pointsMultiplier || 1;
      result.pointsToEarn = Math.floor(result.total * multiplier);
    }

    return result;
  }

  async _applyCoupon(code, customerId, subtotal) {
    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: { usages: customerId ? { where: { customerId } } : false },
    });

    if (!coupon) throw Object.assign(new Error('קוד קופון לא קיים'), { statusCode: 404 });
    if (!coupon.isActive) throw Object.assign(new Error('הקופון אינו פעיל'), { statusCode: 400 });

    const now = new Date();
    if (coupon.validFrom > now) throw Object.assign(new Error('הקופון עדיין לא בתוקף'), { statusCode: 400 });
    if (coupon.validUntil < now) throw Object.assign(new Error('פג תוקפו של הקופון'), { statusCode: 400 });

    if (coupon.maxUses != null && coupon.usesCount >= coupon.maxUses) {
      throw Object.assign(new Error('הקופון מוצה'), { statusCode: 400 });
    }

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      throw Object.assign(
        new Error(`הזמנה מינימלית לקופון: ₪${coupon.minOrderAmount}`),
        { statusCode: 400 }
      );
    }

    if (coupon.perCustomerLimit && customerId) {
      const used = coupon.usages?.length || 0;
      if (used >= coupon.perCustomerLimit) {
        throw Object.assign(new Error('הגעת למקסימום שימושים בקופון זה'), { statusCode: 400 });
      }
    }

    let amount = 0;
    if (coupon.type === 'PERCENTAGE') {
      amount = subtotal * (coupon.value / 100);
      if (coupon.maxDiscount) amount = Math.min(amount, coupon.maxDiscount);
    } else if (coupon.type === 'FIXED_AMOUNT') {
      amount = Math.min(coupon.value, subtotal);
    }

    return {
      type: 'coupon',
      code: coupon.code,
      label: coupon.name,
      amount: round(amount),
      couponId: coupon.id,
    };
  }

  async _applyTierDiscount(customerId, subtotal) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { amount: 0 };
    const cfg = await prisma.loyaltyTierConfig.findUnique({ where: { tier: customer.loyaltyTier } });
    if (!cfg || cfg.discountPercent <= 0) return { amount: 0 };
    return {
      type: 'tier',
      label: `הטבת רמה ${customer.loyaltyTier} (${cfg.discountPercent}%)`,
      amount: round(subtotal * cfg.discountPercent / 100),
    };
  }

  async _redeemPoints(customerId, requestedPoints, subtotal) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { points: 0, discount: 0 };

    // 100 נקודות = 10 שח (1 נק' = 0.10 שח)
    const POINT_VALUE = 0.10;
    const maxPoints = Math.min(customer.loyaltyPoints, requestedPoints);
    const maxDiscount = Math.min(maxPoints * POINT_VALUE, subtotal);
    const actualPoints = Math.ceil(maxDiscount / POINT_VALUE);

    return { points: actualPoints, discount: round(maxDiscount) };
  }

  /**
   * סוגרים הזמנה - הופך טיוטה להזמנה רשומה
   */
  async finalizeOrder(orderId, calculation) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: calculation.subtotal,
          discountAmount: calculation.discountAmount + calculation.loyaltyDiscount,
          loyaltyRedeemed: calculation.pointsRedeemed,
          total: calculation.total,
          status: 'CONFIRMED',
        },
      });

      // עדכון שימושים בקופון
      for (const d of calculation.discounts) {
        if (d.type === 'coupon' && d.couponId) {
          await tx.coupon.update({
            where: { id: d.couponId },
            data: { usesCount: { increment: 1 } },
          });
          await tx.couponUsage.create({
            data: {
              couponId: d.couponId,
              customerId: order.customerId,
              orderId: order.id,
              amount: d.amount,
            },
          });
        }
      }

      // מימוש נקודות
      if (calculation.pointsRedeemed > 0) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { loyaltyPoints: { decrement: calculation.pointsRedeemed } },
        });
        await tx.loyaltyEntry.create({
          data: {
            customerId: order.customerId,
            type: 'REDEEM',
            points: -calculation.pointsRedeemed,
            reason: `מימוש בהזמנה #${order.orderNumber}`,
            orderId: order.id,
          },
        });
      }

      // צבירת נקודות
      if (calculation.pointsToEarn > 0) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { loyaltyPoints: { increment: calculation.pointsToEarn } },
        });
        await tx.loyaltyEntry.create({
          data: {
            customerId: order.customerId,
            type: 'EARN',
            points: calculation.pointsToEarn,
            reason: `צבירה מהזמנה #${order.orderNumber}`,
            orderId: order.id,
          },
        });

        // עדכון רמת נאמנות
        await this._updateTier(tx, order.customerId);
      }

      return order;
    });
  }

  async _updateTier(tx, customerId) {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    const tiers = await tx.loyaltyTierConfig.findMany({
      orderBy: { minPoints: 'desc' },
    });
    for (const t of tiers) {
      if (customer.loyaltyPoints >= t.minPoints) {
        if (customer.loyaltyTier !== t.tier) {
          await tx.customer.update({
            where: { id: customerId },
            data: { loyaltyTier: t.tier },
          });
        }
        return;
      }
    }
  }
}

function round(n) {
  return Math.round(n * 100) / 100;
}

module.exports = new PricingEngine();
