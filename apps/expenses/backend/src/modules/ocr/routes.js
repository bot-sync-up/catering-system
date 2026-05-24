const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { runOcrOnFile, extractInvoiceFields } = require('./service');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', 'ocr-tmp');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

router.post('/parse', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'NO_FILE' });
  const raw = await runOcrOnFile(req.file.path);
  const fields = extractInvoiceFields(raw.text || '');
  res.json({ raw, fields });
});

module.exports = router;
