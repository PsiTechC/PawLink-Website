# PawLink contact backend

Receives submissions from the PawLink contact form and emails them to
**partnerships@psitech.co.in** via your psitech.co.in (MailEnable) SMTP server.

## Setup

1. Install dependencies (already done once):
   ```bash
   cd backend
   npm install
   ```

2. Put the **mailbox password** into `.env`:
   ```
   SMTP_PASS=your-real-partnerships-mailbox-password
   ```
   (Everything else — host, port, TLS, recipient — is already configured.)

3. Start the server:
   ```bash
   npm start
   ```

4. Confirm SMTP works — open in a browser:
   ```
   http://localhost:3000/api/health
   ```
   You want: `{"ok":true,"smtp":"connected", ...}`
   If you see `535 Invalid Username or Password`, the SMTP_PASS is wrong.

5. Open the website (Live Server) and submit the form.
   The email arrives in the partnerships@psitech.co.in webmail Inbox.

## How the page reaches the backend

The form POSTs to `http://localhost:3000/api/contact` by default.
To point it elsewhere (e.g. a deployed server), set this in the page before the
bundle loads, or just deploy the backend and update the URL:
```js
window.PAWLINK_CONTACT_ENDPOINT = 'https://your-server/api/contact';
```

## Going live (production)

- Deploy this backend somewhere always-on (a small VPS, Render, Railway, etc.).
- Set `ALLOWED_ORIGIN` in `.env` to your real site origin instead of `*`.
- Update `window.PAWLINK_CONTACT_ENDPOINT` (or the default in the form handler)
  to the deployed URL — `localhost` only works on your own machine.
- Keep `.env` private (never commit the password).
