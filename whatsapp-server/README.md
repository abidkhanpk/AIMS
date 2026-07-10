# WhatsApp Web Session Automation Service

A generic, standalone, and app-agnostic microservice for managing multiple concurrent WhatsApp sessions and sending queued messages. Built on Node.js, Express, and **Baileys** (direct WebSocket connection to WhatsApp Web).

---

## Key Features
- **PostgreSQL Session Storage**: Keeps all authentication states, credentials, and cryptographic keys compiled as `JSONB` blobs inside a single database table. Very lightweight on disk and enables easy backups.
- **Resource-Efficient Sleep Mode (Lazy Loading)**: Sockets are automatically loaded on demand when a send request arrives, and closed (placed to sleep) after a configurable idle time to conserve VPS RAM.
- **Human-Like Queuing Delay**: Messages are queued and sent with a random delay (e.g. 5–15 seconds) to mimic human typing and prevent WhatsApp spam detection bans.
- **Daily Message Limits**: Enforces daily caps on messages sent per number.
- **Token Authorization**: Secured with a shared secret header (`X-WA-SECRET`).

---

## Environment Configuration

Copy `.env.example` to `.env` and fill in the parameters:

- `PORT`: Express server port (default `3001`).
- `API_SECRET`: Shared secret key. Clients must pass this key in the `X-WA-SECRET` header on all API requests.
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://postgres:password@localhost:5432/whatsapp_service`).
- `WHATSAPP_MODE`:
  - `SLEEP`: Sockets connect on demand (lazy loading) and close when idle to save RAM.
  - `DAEMON`: Sockets remain connected 24/7.
- `WHATSAPP_IDLE_TIMEOUT`: Sockets disconnect and free up memory after this many milliseconds of inactivity (default `300000` = 5 minutes).
- `WHATSAPP_SLEEP_ON_QUEUE_COMPLETION`: Set to `true` to immediately suspend the socket 10 seconds after a message queue completes sending, rather than waiting for `WHATSAPP_IDLE_TIMEOUT`. (Default is `false`).
- `DEFAULT_MIN_DELAY_MS` / `DEFAULT_MAX_DELAY_MS`: Default rate-limiting delays between message dispatches.
- `DEFAULT_MAX_DAILY_MESSAGES`: Default daily quota per WhatsApp account.

---

## VPS Deployment Guide

### 1. Install Node.js & System Setup
```bash
# Update package list and install Node/npm
sudo apt update
sudo apt install nodejs npm -y

# Verify installation (Node v18+ recommended)
node -v
```

### 2. Install PM2 Process Manager
Keep the server running continuously in the background and ensure it recovers from crashes:
```bash
sudo npm install -g pm2
pm2 start server.js --name "whatsapp-server"
pm2 startup
pm2 save
```

### 3. Expose under Subdomain with SSL (Nginx Reverse Proxy)
Install Nginx and map a domain name (e.g., `whatsapp.yourdomain.com`) to the Node port:
```bash
sudo apt install nginx -y
```

Create `/etc/nginx/sites-available/whatsapp-server`:
```nginx
server {
    listen 80;
    server_name whatsapp.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and configure HTTPS with Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install certbot and request SSL certificates
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d whatsapp.yourdomain.com
```

---

## Client Application Integration Guide

An external client app (AIMS or any other app) can easily integrate with this server in two steps. All requests must carry the `X-WA-SECRET` header matching the server's `API_SECRET`.

### 1. Device Registration (Scan QR)
To register a new WhatsApp account:
1. **Initialize Session**: Call `POST /api/session/init/:clientId`
   - Use a unique identifier (like the user ID) as the `:clientId`.
2. **Retrieve QR Code**: Call `GET /api/session/qr/:clientId`
   - Display the base64-encoded `qr` data URL in your frontend for the user to scan.
3. **Poll Connection Status**: Poll `GET /api/session/status/:clientId` every 3 seconds.
   - When the user scans the code, the status changes to `connected` and returns the linked `phoneNumber`.
   - Once connected, save the linked `phoneNumber` in your app's local user settings.

### 2. Sending Messages (Connect-on-Demand)
Since the server supports lazy loading, the client app does **not** need to manage sockets. Simply call the send endpoints, and the server will wake up, establish connection, queue the message, and go to sleep when finished.

#### Send a Single Message
- **Endpoint**: `POST /api/message/send`
- **Headers**: `X-WA-SECRET: <secret>`
- **Body**:
  ```json
  {
    "clientId": "aims_admin_123",
    "to": "923001234567",
    "text": "السلام علیکم! یہ فیس کی ادائیگی کا پیغام ہے۔"
  }
  ```

#### Send Bulk Messages (Auto-Queued)
- **Endpoint**: `POST /api/message/send-bulk`
- **Body**:
  ```json
  {
    "clientId": "aims_admin_123",
    "messages": [
      { "to": "923001111111", "text": "Fee notice 1" },
      { "to": "923002222222", "text": "Fee notice 2" }
    ]
  }
  ```

---

## Configuring Session Settings via API

You can configure and override the message delays and daily send limit dynamically for any session:

### Update Session Settings
- **Endpoint**: `POST /api/message/settings/:clientId`
- **Headers**: `X-WA-SECRET: <secret>`
- **Body**:
  ```json
  {
    "minDelayMs": 3000,
    "maxDelayMs": 10000,
    "maxDailyMessages": 100
  }
  ```

### Get Session Settings
- **Endpoint**: `GET /api/message/settings/:clientId`
- **Response**:
  ```json
  {
    "minDelayMs": 3000,
    "maxDelayMs": 10000,
    "maxDailyMessages": 100
  }
  ```
