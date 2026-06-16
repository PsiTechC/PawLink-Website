import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const {
  SMTP_HOST,
  SMTP_PORT = '587',
  SMTP_SECURE = 'false',     // "true" for port 465 (implicit TLS), "false" for 587 (STARTTLS)
  SMTP_USER,
  SMTP_PASS,
  // Shared mail hosts often present a cert for the provider's domain, not your mail hostname.
  // Set to "false" to keep the connection encrypted but skip the strict hostname-on-cert check.
  SMTP_TLS_REJECT_UNAUTHORIZED = 'true',
  MAIL_TO = 'partnerships@psitech.co.in',
  MAIL_FROM,                  // optional; defaults to SMTP_USER
  PORT = '3000',
  ALLOWED_ORIGIN = '*',       // e.g. "http://127.0.0.1:5500" — "*" allows any origin
} = process.env;

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cors({ origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN.split(',') }));

// Build the SMTP transport from environment configuration.
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === 'true',
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: SMTP_TLS_REJECT_UNAUTHORIZED === 'true' },
});

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Health check — open http://localhost:3000/api/health to confirm the server runs,
// and it also verifies the SMTP connection/credentials.
app.get('/api/health', async (_req, res) => {
  try {
    await transporter.verify();
    res.json({ ok: true, smtp: 'connected', to: MAIL_TO });
  } catch (err) {
    res.status(500).json({ ok: false, smtp: 'failed', error: err.message });
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, designation, email, phone, organisation, interest, message } = req.body || {};

  // Required fields mirror the form's own validation.
  if (!name || !email || !organisation || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ success: false, error: 'Invalid email address.' });
  }

  const rows = [
    ['Name', name],
    ['Designation', designation],
    ['Work email', email],
    ['Phone', phone],
    ['Municipal body / Organisation', organisation],
    ['Primary interest', interest],
    ['Message', message],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#1c2b22;max-width:620px">
      <h2 style="color:#2D6A4F;margin:0 0 16px">New pilot request — PawLink</h2>
      <table style="border-collapse:collapse;width:100%">
        ${rows.map(([k, v]) => `
          <tr>
            <td style="padding:8px 12px;background:#f3f6f4;font-weight:600;width:220px;vertical-align:top;border:1px solid #e2e8e4">${esc(k)}</td>
            <td style="padding:8px 12px;border:1px solid #e2e8e4;white-space:pre-wrap">${esc(v || '—')}</td>
          </tr>`).join('')}
      </table>
      <p style="color:#6b7a72;font-size:12.5px;margin-top:18px">Submitted from the PawLink contact form.</p>
    </div>`;

  const text = rows.map(([k, v]) => `${k}: ${v || '—'}`).join('\n');

  try {
    await transporter.sendMail({
      from: MAIL_FROM || SMTP_USER,           // must be an address your SMTP is allowed to send as
      to: MAIL_TO,
      replyTo: `${name} <${email}>`,          // hitting "Reply" answers the requester directly
      subject: `New pilot request — ${name}${organisation ? ` (${organisation})` : ''}`,
      text,
      html,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('sendMail failed:', err.message);
    res.status(502).json({ success: false, error: 'Email could not be sent.' });
  }
});

app.listen(Number(PORT), () => {
  console.log(`PawLink contact backend running on http://localhost:${PORT}`);
  console.log(`  Health/SMTP check: http://localhost:${PORT}/api/health`);
  console.log(`  Submissions email to: ${MAIL_TO}`);
});
