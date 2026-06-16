# Deploying PawLink with Docker (pawlink.psitech.co.in)

Docker runs the app (Node backend + an nginx that serves the page and routes
`/api`) on host port **8095**. Your existing **host nginx** terminates SSL for
the domain and proxies to it.

Prereqs on the VPS: Docker Engine + Docker Compose plugin, nginx, certbot.

---

## 1. DNS
A record: `pawlink.psitech.co.in` -> `<VPS IP>`

## 2. Get the code
```bash
cd /opt
sudo git clone https://github.com/PsiTechC/PawLink-Website.git pawlink
cd pawlink
```

## 3. Create the backend secret file
```bash
sudo cp backend/.env.example backend/.env
sudo nano backend/.env
```
Set the real values (especially `SMTP_PASS`), and:
```
ALLOWED_ORIGIN=https://pawlink.psitech.co.in
```

## 4. Build & start the stack
```bash
sudo docker compose up -d --build

sudo docker compose ps          # both services Up
sudo docker compose logs -f backend
```
Local check on the VPS:
```bash
curl http://localhost:8095/api/health     # -> {"ok":true,"smtp":"connected"}
curl -I http://localhost:8095/            # -> 200, serves the page
```

## 5. Host nginx -> Docker, then SSL
```bash
sudo cp deploy/docker/nginx-host.conf /etc/nginx/sites-available/pawlink
sudo ln -sf /etc/nginx/sites-available/pawlink /etc/nginx/sites-enabled/pawlink
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d pawlink.psitech.co.in
```

## 6. Verify
- `https://pawlink.psitech.co.in`
- `https://pawlink.psitech.co.in/api/health` -> `{"ok":true,...}`
- Submit the form -> email arrives at partnerships@psitech.co.in.

---

## Everyday commands
```bash
# Update to latest code
cd /opt/pawlink && sudo git pull && sudo docker compose up -d --build

# Restart / stop / logs
sudo docker compose restart
sudo docker compose down
sudo docker compose logs -f

# Change the published port (if 8080 is taken)
HOST_WEB_PORT=8096 sudo docker compose up -d
# (then update proxy_pass in deploy/docker/nginx-host.conf to :8096 and reload nginx)
```

## Notes
- `backend/.env` is gitignored — it lives only on the VPS. Compose injects it via `env_file`.
- The contact form auto-targets `/api/contact` on the live domain (same origin), so no CORS config is needed.
- Want SSL inside Docker too (no host nginx)? Swap to an `nginx-proxy` + `acme-companion`
  or Caddy container and publish 80/443 directly — ask and I'll add that compose variant.
