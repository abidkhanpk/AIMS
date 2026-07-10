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
- **PostgreSQL Session Storage**: Keeps all authentication states, credentials, and cryptographic keys compiled as `JSONB` blobs inside a single database table. Very lightweight on disk and enables easy backups. *(The table schema and indexes are automatically verified and created upon server startup — no manual database migrations are required).*
- **Resource-Efficient Sleep Mode (Lazy Loading)**: Sockets are automatically loaded on demand when a send request arrives, and closed (placed to sleep) after a configurable idle time to conserve VPS RAM.
- **Human-Like Queuing Delay**: Messages are queued and sent with a random delay (e.g. 5–15 seconds) to mimic human typing and prevent WhatsApp spam detection bans.
- **Daily Message Limits**: Enforces daily caps on messages sent per number.
- **Token Authorization**: Secured with a shared secret header (`X-WA-SECRET`).

---

## Environment Configuration

Copy `.env.example` to `.env` and fill in the parameters:

- `PORT`: Express server port (default `3001`).
- `API_SECRET`: Fallback shared secret key. Used if `API_SECRETS_MAP` is not set.
- `API_SECRETS_MAP`: Multi-tenant key-value JSON mapping (e.g. `{"secret_aims":"aims","secret_crm":"crm"}`). Automatically maps a specific client app's `X-WA-SECRET` header to its prefix, isolating session IDs and preventing collisions.
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
Install Nginx and map a domain name (e.g., `wa.yourdomain.com`) to the Node port:
```bash
sudo apt install nginx -y
```

Create `/etc/nginx/sites-available/whatsapp-server`:
```nginx
server {
    listen 80;
    server_name wa.yourdomain.com;

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
sudo certbot --nginx -d wa.yourdomain.com
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

## Complete Step-by-Step Integration Reference (For Beginners)

If you are new to API integrations, this guide will walk you through exactly how to hook up this WhatsApp service into your new web application. 

> [!CAUTION]
> **Security Warning: Do NOT call this server directly from Frontend (Browser) code!**
> If you write these `fetch` requests inside your frontend code (such as React components, Vue scripts, or vanilla HTML/JS files), your `X-WA-SECRET` passcode **will be exposed** to any user who opens Chrome DevTools (Network tab) or inspects your source code.
> 
> **How to keep it safe**:
> 1. Always run these `fetch` calls from your client application's **backend / server code** (such as Next.js API routes, Node/Express handlers, Python scripts, or PHP controllers).
> 2. Retrieve the secret passcode securely from your backend's environment variable (e.g. `process.env.WHATSAPP_API_SECRET` which is set to match the secret key defined in the VPS server `.env` file).
> 3. Your frontend browser should talk to your own application's backend endpoint, and your backend will attach the secret header securely and proxy the request to the WhatsApp server.


### Core Concepts to Know:
- **`clientId`**: A unique label to identify who is sending the message (e.g. `admin_45`). You should use the database ID of the user logging in.
- **`X-WA-SECRET` (Password Header)**: This is a secure passcode header that prevents unauthorized apps from using your WhatsApp server.
  - **Where do I get it?**
    - You can choose **either** a single global secret or a multi-tenant secrets map:
      - **Option A (Single App)**: Use `API_SECRET` in `.env` (e.g. `API_SECRET=my_secret_token_123`). The client app passes this secret directly. No session prefixing is applied.
      - **Option B (Multi-App Isolation - Recommended)**: Use `API_SECRETS_MAP` in `.env` (e.g. `API_SECRETS_MAP={"secret_for_aims":"aims", "secret_for_crm":"crm"}`). AIMS will configure its client secret as `secret_for_aims`, and the CRM configures `secret_for_crm`. The server automatically isolates their sessions under the `aims_` or `crm_` namespace.
- **`fetch()`**: The built-in function in JavaScript to talk to a remote server.

---

### Step 1: Design your "Link WhatsApp" Setup Form (QR Code)

To link an account, you need to display a QR code for the user to scan. Copy and paste the JavaScript function template below into your client application:

```javascript
// Step 1: Initializing the session and loading the QR code image
async function setupWhatsAppLinking(adminUserId) {
  const SERVER_URL = "https://wa.yourdomain.com";
  const SECRET = "your_super_secret_shared_key_here";
  
  // 1. Tell the server to open a new session for this user
  const initResponse = await fetch(`${SERVER_URL}/api/session/init/${adminUserId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-WA-SECRET": SECRET
    }
  });
  
  if (!initResponse.ok) {
    console.error("Failed to start session.");
    return;
  }
  
  // 2. Fetch the QR code image generated by the server
  const qrResponse = await fetch(`${SERVER_URL}/api/session/qr/${adminUserId}`, {
    method: "GET",
    headers: {
      "X-WA-SECRET": SECRET
    }
  });
  
  const qrData = await qrResponse.json();
  
  if (qrData.qr) {
    // Show this QR image in your HTML! 
    // Simply set: document.getElementById("qr-image").src = qrData.qr;
    console.log("QR Code base64 image link:", qrData.qr);
  }

  // 3. Start polling every 3 seconds to see if they scanned the QR code
  const pollInterval = setInterval(async () => {
    const statusResponse = await fetch(`${SERVER_URL}/api/session/status/${adminUserId}`, {
      method: "GET",
      headers: {
        "X-WA-SECRET": SECRET
      }
    });
    
    const statusData = await statusResponse.json();
    
    if (statusData.status === "connected") {
      clearInterval(pollInterval);
      alert("Success! WhatsApp is linked.");
      
      // Save their verified phone number in your own database!
      console.log("Verified mobile number JID:", statusData.phoneNumber);
    }
  }, 3000);
}
```

---

### Step 2: Configure Settings (Optional)

If you want to set the rate-limiting values (to prevent spam blocks) for this user's messages:

```javascript
async function updateWhatsAppSettings(adminUserId, minSeconds, maxSeconds, dailyLimit) {
  const SERVER_URL = "https://wa.yourdomain.com";
  const SECRET = "your_super_secret_shared_key_here";

  await fetch(`${SERVER_URL}/api/message/settings/${adminUserId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-WA-SECRET": SECRET
    },
    body: JSON.stringify({
      minDelayMs: minSeconds * 1000,       // convert seconds to milliseconds
      maxDelayMs: maxSeconds * 1000,
      maxDailyMessages: dailyLimit
    })
  });
  
  console.log("Queue settings updated successfully!");
}
```

---

### Step 3: Sending Messages (Connect-on-Demand)

Since the server supports **Sleep Mode**, the connection automatically sleeps when idle to save RAM. When you want to send a message, just call the API. The server will wake up, establish connection, deliver the message, and go back to sleep automatically.

#### A. Send a single message:
```javascript
async function sendSingleMessage(adminUserId, recipientPhone, messageText) {
  const SERVER_URL = "https://wa.yourdomain.com";
  const SECRET = "your_super_secret_shared_key_here";

  const response = await fetch(`${SERVER_URL}/api/message/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-WA-SECRET": SECRET
    },
    body: JSON.stringify({
      clientId: adminUserId,
      to: recipientPhone, // e.g. "923001234567"
      text: messageText
    })
  });
  
  const data = await response.json();
  console.log("Queue result:", data);
}
```

#### B. Send a batch of messages (Bulk Delivery):
```javascript
async function sendBulkMessages(adminUserId, messageList) {
  const SERVER_URL = "https://wa.yourdomain.com";
  const SECRET = "your_super_secret_shared_key_here";

  // Example messageList format:
  // [ { to: "923001111111", text: "Notice 1" }, { to: "923002222222", text: "Notice 2" } ]

  const response = await fetch(`${SERVER_URL}/api/message/send-bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-WA-SECRET": SECRET
    },
    body: JSON.stringify({
      clientId: adminUserId,
      messages: messageList
    })
  });
  
  const data = await response.json();
  console.log("Bulk Queue result:", data);
}
```

---

### Step 4: Disconnect (Log Out)

If the user unlinks or logs out of their WhatsApp account, call this endpoint to clean up. This stops the server connection and deletes the login credentials from the database.

```javascript
async function unlinkWhatsApp(adminUserId) {
  const SERVER_URL = "https://wa.yourdomain.com";
  const SECRET = "your_super_secret_shared_key_here";

  await fetch(`${SERVER_URL}/api/session/${adminUserId}`, {
    method: "DELETE",
    headers: {
      "X-WA-SECRET": SECRET
    }
  });
  
  alert("WhatsApp account unlinked successfully.");
}
```

