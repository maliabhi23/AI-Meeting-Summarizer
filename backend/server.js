import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { actionCollector } from './actionCollector.js';
import { summarizeWithGroq } from './summarize.js';
import { sendSummaryEmail } from './email.js';
import { isEmailListValid, safeTrim } from './utils.js';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const PORT = process.env.PORT || 8080;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(actionCollector);

// Health
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-meeting-summarizer', ts: new Date().toISOString() });
});

// Summarize: accepts either raw text or uploaded .txt file
app.post('/summarize', upload.single('file'), async (req, res) => {
  try {
    const prompt = safeTrim(req.body.prompt);
    const textFromBody = safeTrim(req.body.transcript);
    const fileText = req.file ? req.file.buffer.toString('utf-8') : '';
    const transcript = textFromBody || fileText;

    if (!transcript) {
      return res.status(400).json({ error: 'No transcript provided (text or file required).' });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Server missing GROQ_API_KEY.' });
    }

    const summary = await summarizeWithGroq({
      transcript,
      prompt,
      apiKey: process.env.GROQ_API_KEY
    });

    res.setHeader('X-Action', 'summarize-success');
    return res.json({ summary });
  } catch (e) {
    console.error(e);
    res.setHeader('X-Action', 'summarize-failed');
    return res.status(500).json({ error: String(e.message || e) });
  }
});

// Send Email
app.post('/send-email', async (req, res) => {
  try {
    const { recipients, summary, subject } = req.body || {};
    if (!summary || !summary.trim()) {
      return res.status(400).json({ error: 'Summary content is required.' });
    }
    if (!isEmailListValid(recipients)) {
      return res.status(400).json({ error: 'Recipients must be a comma-separated list of valid emails.' });
    }

    const smtp = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    };
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;

    if (!smtp.host || !smtp.user || !smtp.pass) {
      return res.status(500).json({ error: 'Email is not configured on server.' });
    }

    const html = `
      <div style="font-family:Arial, sans-serif;line-height:1.5">
        <h2>Meeting Summary</h2>
        <pre style="white-space:pre-wrap;font-family:inherit">${summary.replace(/[<>&]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[s]))}</pre>
        <hr/>
        <small>Sent by AI Meeting Summarizer</small>
      </div>`;

    const result = await sendSummaryEmail({
      smtp,
      from,
      toList: recipients,
      subject: subject || 'Meeting Summary',
      html
    });

    res.setHeader('X-Action', 'email-sent');
    return res.json({ ok: true, result });
  } catch (e) {
    console.error(e);
    res.setHeader('X-Action', 'email-failed');
    return res.status(500).json({ error: String(e.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
