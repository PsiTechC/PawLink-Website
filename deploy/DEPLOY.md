# Deploying PawLink to the VPS (pawlink.psitech.co.in)

Target: a VPS that already has **nginx** and **Node.js** installed.
Result: static landing page at `https://pawlink.psitech.co.in`, contact form
posting to a Node backend (systemd) that emails submissions to
`partnerships@psitech.co.in` via SMTP.

Run all commands as a sudo-capable user on the VPS.

---

## 1. DNS

In your DNS provider, add an **A record**:

| Name                    | Type | Value (VPS public IP) |
|-------------------------|------|-----------------------|
| `pawlink.psitech.co.in` | A    | `<your VPS IP>`        |

Wait for it to resolve: `dig +short pawlink.psitech.co.in`

---

## 2. Get the code onto the VPS

```bash
cd /opt
sudo git clone https://github.com/PsiTechC/PawLink-Website.git pawlink-src
cd pawlink-src
```
(To update later: `cd /opt/pawlink-src && sudo git pull`.)

---

## 3. Frontend (static page)

```bash
sudo mkdir -p /var/www/pawlink
# Copy the standalone HTML in as index.html
sudo cp "/opt/pawlink-src/PawLink (standalone).html" /var/www/pawlink/index.html
sudo chown -R www-data:www-data /var/www/pawlink
```
The page is fully self-contained (CSS, JS, fonts, favicon all embedded) — no other files needed.

---

## 4. Backend (contact API)

```bash
sudo mkdir -p /var/www/pawlink-backend
sudo cp -r /opt/pawlink-src/backend/* /var/www/pawlink-backend/
cd /var/www/pawlink-backend

# Install production deps
sudo npm ci --omit=dev      # or: sudo npm install --omit=dev

# Create .env from the template and fill in the real SMTP password
sudo cp .env.example .env
sudo nano .env
```

Set in `.env`:
```
SMTP_HOST=mail.psitech.co.in
SMTP_PORT=587
SMTP_SECURE=false
SMTP_TLS_REJECT_UNAUTHORIZED=false
SMTP_USER=partnerships@psitech.co.in
SMTP_PASS=<the real mailbox password>
MAIL_TO=partnerships@psitech.co.in
MAIL_FROM=partnerships@psitech.co.in
PORT=3000
ALLOWED_ORIGIN=https://pawlink.psitech.co.in
```

```bash
sudo chown -R www-data:www-data /var/www/pawlink-backend
```

Quick manual test (Ctrl+C to stop):
```bash
sudo -u www-data node server.js
# in another shell:  curl http://localhost:3000/api/health   -> {"ok":true,"smtp":"connected"}
```

---

## 5. Run the backend as a systemd service

```bash
# Confirm node path; if not /usr/bin/node, edit ExecStart in the unit file first
which node

sudo cp /opt/pawlink-src/deploy/pawlink-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pawlink-backend

sudo systemctl status pawlink-backend        # should be active (running)
journalctl -u pawlink-backend -n 30 --no-pager
```

---

## 6. nginx site

```bash
sudo cp /opt/pawlink-src/deploy/nginx-pawlink.conf /etc/nginx/sites-available/pawlink
sudo ln -sf /etc/nginx/sites-available/pawlink /etc/nginx/sites-enabled/pawlink
sudo nginx -t            # test config
sudo systemctl reload nginx
```

Now `http://pawlink.psitech.co.in` should load the page.

---

## 7. HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d pawlink.psitech.co.in
```
Certbot edits the nginx config to add the 443 server block and auto-renews.

---

## 8. Verify end-to-end

1. Open `https://pawlink.psitech.co.in`
2. Health: `https://pawlink.psitech.co.in/api/health` -> `{"ok":true,"smtp":"connected"}`
3. Submit the contact form -> the email arrives in the `partnerships@psitech.co.in` webmail Inbox.

---

## Updating later

```bash
cd /opt/pawlink-src && sudo git pull

# frontend
sudo cp "/opt/pawlink-src/PawLink (standalone).html" /var/www/pawlink/index.html

# backend (if changed)
sudo cp -r /opt/pawlink-src/backend/*.js /var/www/pawlink-backend/
sudo systemctl restart pawlink-backend
```

## Notes
- `backend/.env` holds the SMTP password and is **gitignored** — it never comes from the repo. Create/edit it directly on the VPS.
- The contact form auto-detects environment: on the live domain it posts to `/api/contact` (same origin, proxied to the Node service); on local Live Server it posts to `http://localhost:3000/api/contact`.
- Logs: `journalctl -u pawlink-backend -f`
