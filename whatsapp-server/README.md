# WhatsApp Web Session Automation Service

A generic, standalone, and app-agnostic microservice for managing multiple concurrent WhatsApp sessions and sending queued messages. Built on Node.js, Express, and **Baileys** (direct WebSocket connection to WhatsApp Web).

---

## Architectural & Design History

When modifying or discussing this server with future AI agents, refer to these fundamental design rules and context:

### 1. Warm Process Daemon (VPS) vs. Serverless Hosting
- **Decision**: Must be hosted as a warm background process daemon (e.g. via PM2 on a VPS) rather than serverless functions (like Vercel serverless).
- **Reason**: Baileys keeps a persistent WebSocket connection open to WhatsApp Web. Serverless environments terminate execution after a short timeout (typically 10–30s), closing active socket connections, causing frequent link breakages, and triggering anti-spam locks on the user's account due to repeated logins.

### 2. Multi-App Multi-Session separation (Multi-Tenancy)
- **Decision**: The server is generic, standalone, and completely decoupled from any single client application. It isolates sessions by `clientId`.
- **Reason**: A single instance of this server can be shared by multiple external apps (e.g., AIMS and another portal). By using unique `clientId` structures, the admin sessions of different apps are kept entirely separate.

### 3. PostgreSQL JSONB Session Store
- **Decision**: All credentials, pre-keys, and sync states are stored inside a single PostgreSQL table (`whatsapp_sessions`) in `JSONB` format instead of using filesystem files.
- **Reason**: Storing keys as files triggers severe Linux inode depletion and consumes huge disk footprint due to 4KB sector block-padding on small metadata files. PostgreSQL JSONB strips whitespace and formatting, resulting in a physical size that is **~20x smaller** on disk and simple to backup/restore.

### 4. Sleep Mode & Lazy Loading
- **Decision**: Sockets are lazy-loaded when a message is queued and suspended (`sock.end()`) after going idle to free up VPS RAM.
- **Reason**: Since most admins only send messages occasionally (e.g., fee reminders or notices), keeping 50 active socket connections continuously open consumes massive memory. Sleep mode keeps connections sleeping, starting them only on-demand.

### 5. Anti-Spam Design (Min/Max Delay and Limits)
- **Decision**: Enforces a random wait interval between `minDelayMs` and `maxDelayMs` for message dispatches.
- **Reason**: Fixed intervals (e.g., exactly every 5s) are flagged by WhatsApp's anti-spam engine as automated bot behavior and banned. Randomized intervals emulate human typing patterns.

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

### 2. Process Manager Setup (Choose Option A or B)

Choose one of the following methods to keep the server running continuously and restart automatically on crash or system reboots.

#### Option A: Native System Service (systemd/systemctl) - *Recommended*
No third-party packages required. Uses the native process supervisor built directly into Linux.

1. Create a service file `/etc/systemd/system/whatsapp.service`:
   ```bash
   sudo nano /etc/systemd/system/whatsapp.service
   ```
2. Paste the configuration:
   ```ini
   [Unit]
   Description=WhatsApp Session Automation Service
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/var/www/whatsapp-server
   ExecStart=/usr/bin/node server.js
   Restart=on-failure
   RestartSec=5
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```
   *(Be sure to replace `/var/www/whatsapp-server` with the path where you placed the files).*
3. Reload, enable, and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable whatsapp
   sudo systemctl start whatsapp
   ```
4. Manage the service:
   ```bash
   # Check status
   sudo systemctl status whatsapp

   # View live logs
   sudo journalctl -u whatsapp -f
   ```

#### Option B: PM2 Process Manager
Useful if you want to use Node-specific process monitoring and cluster management.

1. Install PM2 globally:
   ```bash
   sudo npm install -g pm2
   ```
2. Start the service:
   ```bash
   pm2 start server.js --name "whatsapp-server"
   ```
3. Configure PM2 to start automatically on system reboot:
   ```bash
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

---

## Complete Step-by-Step Integration Reference

Here are the detailed programmatic steps to fully integrate this WhatsApp service into any new client app:

> [!NOTE]
> **What is the `clientId`?**
> The `clientId` is a unique key representing a session. You can use either the **Admin's unique User ID** (e.g., a database UUID or `admin_99`) OR their **linked WhatsApp mobile number**. 
> 
> *Best Practice*: Use the Admin's application User ID as the `clientId` during the initial scan (Step 1), as their mobile number is not yet known. Once they are connected, you can continue using that same User ID as the `clientId` for all message dispatches, queries, and logs.

### Step 1: Device Registration (User Setup UI)
1. **Initialize Socket Instance**:
   - Call `POST /api/session/init/:clientId` where `:clientId` is a unique session key for your user (e.g., `appname_admin_99`).
2. **Fetch and Render the QR Code**:
   - Immediately call `GET /api/session/qr/:clientId`.
   - The API returns a base64 Data URL string under the key `qr` (e.g. `data:image/png;base64,...`).
   - Bind this string directly to an image source element in your HTML: `<img src={qrBase64} alt="Scan QR Code" />`.
3. **Monitor Scanning State**:
   - Set a frontend interval to poll status every 3 seconds: `GET /api/session/status/:clientId`.
   - While the QR code is unscanned, the status returns `"waiting_for_qr"`.
   - When the user scans the code, status transitions to `"connected"` and returns the verified `phoneNumber` linked to the account.
   - **Action**: Save the verified `phoneNumber` in your app's local user settings/database, and cancel the polling interval.

### Step 2: Configure Queue Settings (Optional)
If your admin wants to customize their rate-limiting profile or daily message quotas:
- Call `POST /api/message/settings/:clientId`.
- Send JSON payload:
  ```json
  {
    "minDelayMs": 5000,
    "maxDelayMs": 15000,
    "maxDailyMessages": 100
  }
  ```
*This configures the queue parameters immediately in memory and PostgreSQL.*

### Step 3: Dispatching Messages (Connect-on-Demand)
Since the server supports lazy loading, you do not need to check socket state before sending messages. Simply queue the message, and the server handles connection wakeup automatically.

#### Single message dispatch:
- Send `POST /api/message/send` with payload:
  ```json
  {
    "clientId": "appname_admin_99",
    "to": "923007654321",
    "text": "Hello World!"
  }
  ```

#### Batch messages dispatch:
- Send `POST /api/message/send-bulk` with payload:
  ```json
  {
    "clientId": "appname_admin_99",
    "messages": [
      { "to": "923001111111", "text": "Batch alert 1" },
      { "to": "923002222222", "text": "Batch alert 2" }
    ]
  }
  ```

### Step 4: Track Delivery Status
You can track the progression of the message queue for the session using `GET /api/message/queue/:clientId`.
This returns the status of currently queued items:
```json
{
  "total": 2,
  "queued": 0,
  "sending": 0,
  "sent": 2,
  "failed": 0,
  "processing": false,
  "sentToday": 2,
  "maxDailyMessages": 100
}
```

### Step 5: Logging Out
To disconnect the account and remove credentials:
- Send `DELETE /api/session/:clientId`.
- This closes the active socket connection and deletes the authentication keys from the PostgreSQL database.

