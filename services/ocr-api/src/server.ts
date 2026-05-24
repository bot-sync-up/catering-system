import 'dotenv/config';
import express from 'express';
import { auditContextMiddleware } from '@catering/audit-enforcement';
import cors from 'cors';
import multer from 'multer';
import {
  makeQueue,
  enqueueEnvelope,
  mobileEnvelope,
  browserPdfEnvelope,
  batchEnvelopes,
  imapFromEnv,
  recordVerifiedExample,
  InvoiceSchema,
} from '@invoice-ocr/integrations-ocr';

const app = express();
app.use(auditContextMiddleware());
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const queue = makeQueue();

/** Channel 2 - Mobile single photo */
app.post('/api/ingest/mobile', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const env = mobileEnvelope({
    bytes: req.file.buffer,
    mimeType: req.file.mimetype,
    filename: req.file.originalname,
    uploaderId: String(req.body.uploaderId ?? 'unknown'),
  });
  const jobId = await enqueueEnvelope(queue, env);
  res.json({ jobId });
});

/** Channel 3 - Browser PDF */
app.post('/api/ingest/browser-pdf', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const env = browserPdfEnvelope({
    bytes: req.file.buffer,
    filename: req.file.originalname,
    uploaderId: req.body.uploaderId,
  });
  const jobId = await enqueueEnvelope(queue, env);
  res.json({ jobId });
});

/** Channel 4 - Drag&Drop batch */
app.post('/api/ingest/batch', upload.array('files', 50), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) return res.status(400).json({ error: 'files required' });
  const envs = batchEnvelopes(
    files.map((f) => ({ bytes: f.buffer, mimeType: f.mimetype, filename: f.originalname })),
    String(req.body.uploaderId ?? 'unknown'),
  );
  const jobIds: string[] = [];
  for (const e of envs) {
    const id = await enqueueEnvelope(queue, e);
    if (id) jobIds.push(id);
  }
  res.json({ jobIds, batchId: envs[0].meta?.batchId });
});

/**
 * Verify endpoint - the React UI submits the human-corrected invoice.
 * On accept we (a) persist a few-shot example for that supplier, and
 * (b) mark the invoice as approved (downstream side-effects -
 * inventory + iCount - run in a follow-up worker reading approved
 * invoices; out of scope for this thin API).
 */
app.post('/api/verify/:hash', async (req, res) => {
  const parsed = InvoiceSchema.safeParse(req.body.invoice);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid invoice', issues: parsed.error.issues });
  }
  await recordVerifiedExample(parsed.data, req.body.hint);
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${port}`);
});

/** Channel 1 - IMAP poller (runs in-process for simplicity). */
const imap = imapFromEnv();
if (imap) {
  const pollMs = Number(process.env.IMAP_POLL_SECONDS || 120) * 1000;
  (async () => {
    await imap.connect();
    setInterval(async () => {
      try {
        const envs = await imap.drainOnce();
        for (const e of envs) await enqueueEnvelope(queue, e);
        if (envs.length) {
          // eslint-disable-next-line no-console
          console.log(`[imap] enqueued ${envs.length}`);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[imap]', err);
      }
    }, pollMs);
  })();
}
