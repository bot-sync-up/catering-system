const router = require('express').Router();
const ah = require('../middleware/asyncHandler');
const engine = require('../engine/pricingEngine');

// חישוב מחיר ליחידה
router.post('/item-price', ah(async (req, res) => {
  const { menuItemId, customerId, date } = req.body;
  const result = await engine.getEffectiveItemPrice(menuItemId, {
    customerId,
    date: date ? new Date(date) : new Date(),
  });
  res.json(result);
}));

// חישוב מלא להזמנה (תצוגה מקדימה - בלי ליצור הזמנה)
router.post('/calculate', ah(async (req, res) => {
  const result = await engine.calculateOrder(req.body);
  res.json(result);
}));

module.exports = router;
