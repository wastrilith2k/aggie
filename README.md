# Unified Multi-Platform Note Search Dashboard

A web-based search dashboard that queries notes across Google Drive, Trello, Gmail, OneDrive, and Google Calendar simultaneously and displays unified results.

```
┌─────────────┐     POST /webhook/search      ┌─────────────────┐
│             │  ─────────────────────────►   │                 │
│   React     │       { query: "..." }        │   n8n Workflow  │
│   Frontend  │                               │                 │
│             │  ◄─────────────────────────   │  ┌───────────┐  │
└─────────────┘     Normalized JSON Results   │  │ Google    │  │
                                              │  │ Drive     │  │
                                              │  ├───────────┤  │
                                              │  │ Trello    │  │
                                              │  ├───────────┤  │
                                              │  │ Gmail     │  │
                                              │  ├───────────┤  │
                                              │  │ OneDrive  │  │
                                              │  ├───────────┤  │
                                              │  │ Calendar  │  │
                                              │  └───────────┘  │
                                              └─────────────────┘
```

## Prerequisites

- **n8n** - One of the following:
  - Use the included Docker Compose setup (see [Docker Setup](#docker-setup))
  - Self-hosted n8n instance
  - n8n Cloud account
- **Node.js** v18+ and npm (for the frontend)
- API credentials for the services you want to search:
  - Google Cloud project with Drive, Gmail, and Calendar APIs enabled
  - Microsoft Azure AD app for OneDrive
  - Trello API key and token

## Quick Start

### 1. Import n8n Workflow

1. Open your n8n instance
2. Go to **Workflows** → **Import from File**
3. Select `n8n-workflow.json`
4. The workflow will be imported with placeholder credentials

### 2. Configure Credentials

See [Credential Setup](#credential-setup) below for detailed instructions for each service.

### 3. Get Webhook URL

1. Open the imported workflow
2. Click on the **Webhook** node
3. Copy the **Production URL** (or Test URL for development)
4. The URL format is: `https://your-n8n-instance.com/webhook/search`

### 4. Deploy Frontend

The frontend uses Firebase for authentication and hosting. See [Firebase Setup](#firebase-setup) for deployment instructions.

For local development:
```bash
cd frontend
cp .env.example .env
# Edit .env and set your n8n webhook URL and Firebase config
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Firebase Setup

The frontend uses Firebase Authentication (Google sign-in) and Firebase Hosting.

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Name your project and follow the setup wizard

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Google** as a sign-in provider
3. Configure the OAuth consent screen if prompted

### 3. Register Web App

1. In Firebase Console, go to **Project Settings** → **Your apps**
2. Click the web icon (`</>`) to add a web app
3. Register the app (enable Firebase Hosting when prompted)
4. Copy the Firebase config values

### 4. Configure Frontend

Create `frontend/.env` with your values:
```env
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/search

VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 5. Restrict Access (Optional)

To limit who can use the app, edit `frontend/src/firebase/AuthContext.tsx`:
```typescript
const ALLOWED_EMAILS: string[] = [
  'your-email@gmail.com',
  'another-allowed@gmail.com',
];
```

Leave the array empty to allow any authenticated Google user.

### 6. Deploy to Firebase Hosting

```bash
cd frontend

# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize (select your project, choose "dist" as public directory)
firebase init hosting

# Build the app
npm run build

# Deploy
firebase deploy --only hosting
```

Your app will be available at `https://your-project.web.app`

### 7. Automated Deployment with GitHub Actions (Optional)

The repo includes a GitHub Actions workflow that automatically deploys to Firebase Hosting when you push to `main`.

#### Set up GitHub Secrets

Add these secrets in your repo's **Settings** → **Secrets and variables** → **Actions**:

| Secret | Description |
|--------|-------------|
| `VITE_N8N_WEBHOOK_URL` | Your n8n webhook URL |
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (see below) |

#### Create Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/) → Your project
2. Click the gear icon → **Project settings** → **Service accounts**
3. Click **Generate new private key**
4. Download the JSON file
5. Copy the entire JSON content as the value for `FIREBASE_SERVICE_ACCOUNT` secret

Or use the Firebase CLI:
```bash
firebase login:ci
# Copy the token and use it to generate a service account
```

#### Trigger Deployment

The workflow runs automatically when:
- You push changes to `frontend/` on the `main` branch
- You manually trigger it via **Actions** → **Deploy to Firebase Hosting** → **Run workflow**

---

## Credential Setup

### Google OAuth2 (Drive, Gmail, Calendar)

All three Google services use the same OAuth2 credential.

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable these APIs:
     - Google Drive API
     - Gmail API
     - Google Calendar API

2. **Configure OAuth Consent Screen**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Select **External** (or Internal for Workspace)
   - Add scopes:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/calendar.readonly`

3. **Create OAuth2 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Add authorized redirect URI: `https://your-n8n-instance.com/rest/oauth2-credential/callback`
   - Copy **Client ID** and **Client Secret**

4. **Add to n8n**
   - In n8n, go to **Credentials** → **New**
   - Select **OAuth2 API**
   - Fill in:
     - **Client ID**: from step 3
     - **Client Secret**: from step 3
     - **Authorization URL**: `https://accounts.google.com/o/oauth2/auth`
     - **Token URL**: `https://oauth2.googleapis.com/token`
     - **Scope**: `https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly`
   - Click **Connect** and authorize

5. **Update Workflow**
   - Open each Google node (Drive, Gmail, Calendar)
   - Select your Google OAuth2 credential

### Microsoft OAuth2 (OneDrive)

1. **Register Azure AD App**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Navigate to **Azure Active Directory** → **App registrations**
   - Click **New registration**
   - Set redirect URI: `https://your-n8n-instance.com/rest/oauth2-credential/callback`

2. **Configure API Permissions**
   - Go to **API permissions** → **Add a permission**
   - Select **Microsoft Graph** → **Delegated permissions**
   - Add: `Files.Read.All`
   - Click **Grant admin consent**

3. **Create Client Secret**
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Copy the secret value immediately

4. **Add to n8n**
   - In n8n, create new **OAuth2 API** credential
   - Fill in:
     - **Client ID**: Application (client) ID from Azure
     - **Client Secret**: from step 3
     - **Authorization URL**: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
     - **Token URL**: `https://login.microsoftonline.com/common/oauth2/v2.0/token`
     - **Scope**: `https://graph.microsoft.com/Files.Read.All offline_access`
   - Connect and authorize

### Trello API

1. **Get API Key**
   - Go to [Trello Power-Ups Admin](https://trello.com/power-ups/admin)
   - Create a new Power-Up or use existing
   - Copy your **API Key**

2. **Generate Token**
   - Visit: `https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key=YOUR_API_KEY`
   - Replace `YOUR_API_KEY` with your actual API key
   - Authorize and copy the token

3. **Update Workflow**
   - Before importing, edit `n8n-workflow.json`
   - Find and replace:
     - `YOUR_TRELLO_API_KEY` → your actual API key
     - `YOUR_TRELLO_TOKEN` → your actual token
   - Or edit the Trello Search node in n8n after importing

---

## Frontend Configuration

### Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/search
```

### Development

```bash
cd frontend
npm install
npm run dev
```

### Production Build

```bash
npm run build
npm run preview  # Test production build locally
```

The built files will be in `frontend/dist/`.

---

## Testing

### Test Webhook with curl

```bash
# Basic search
curl -X POST https://your-n8n-instance.com/webhook/search \
  -H "Content-Type: application/json" \
  -d '{"query": "meeting notes"}'

# Test locally
curl -X POST https://your-n8n-instance.com/webhook/search \
  -H "Content-Type: application/json" \
  -d '{"query": "project plan"}'
```

### Expected Response

```json
{
  "success": true,
  "query": "meeting notes",
  "totalResults": 15,
  "errors": [],
  "hasErrors": false,
  "results": [
    {
      "source": "Google Drive",
      "title": "Q4 Meeting Notes",
      "snippet": "Discussion about quarterly goals...",
      "url": "https://docs.google.com/...",
      "date": "2024-01-15T10:30:00Z",
      "relevance": 85,
      "metadata": {
        "fileType": "application/vnd.google-apps.document",
        "fileId": "abc123"
      }
    }
  ]
}
```

---

## Usage Guide

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search bar |
| `Enter` | Execute search (in search bar) or open selected result |
| `j` | Select next result |
| `k` | Select previous result |
| `Esc` | Close suggestions, blur search |

### Features

- **Unified Search**: Search all connected services with one query
- **Relevance Sorting**: Results are ranked by title and content match
- **Source Grouping**: Results are grouped by service for easy browsing
- **Recent Searches**: Quick access to your last 10 searches
- **Dark Mode**: Toggle between light and dark themes
- **Responsive**: Works on desktop and mobile

---

## Troubleshooting

### "n8n webhook URL not configured"

Set the `VITE_N8N_WEBHOOK_URL` in your `.env` file and restart the dev server.

### "CORS error"

The n8n workflow includes CORS headers. If you still see CORS errors:
1. Check that your n8n instance allows the frontend origin
2. For local development, ensure both run on localhost

### "OAuth token expired"

Re-authenticate the credential in n8n:
1. Go to **Credentials**
2. Find the affected credential
3. Click **Reconnect**

### "Service returns empty results"

- Check that the service credential is properly connected
- Verify API scopes include read permissions
- For Trello, ensure your token has access to the boards you want to search

### "Partial results with errors"

Some services failed but others succeeded. Check:
- The error banner shows which service failed
- Individual service error cards in the results
- n8n execution logs for details

---

## Docker Setup

This repo includes a Docker Compose configuration to run n8n locally.

### Important: OAuth Requires a Real Domain

Google and Microsoft OAuth **will not work with localhost**. The redirect URIs must be on a real, publicly accessible domain. Options:

1. **Use a domain you own** - Point it to your server running n8n
2. **Use a tunnel service** - [ngrok](https://ngrok.com), [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/), or similar
3. **Use n8n Cloud** - They handle the OAuth redirect for you

Example with ngrok:
```bash
# Start n8n
docker-compose up -d

# In another terminal, expose it via ngrok
ngrok http 5678

# Use the ngrok URL (e.g., https://abc123.ngrok.io) for:
# - WEBHOOK_URL in .env
# - OAuth redirect URIs in Google Cloud / Azure
```

### Quick Start with Docker

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env:
#    - Set WEBHOOK_URL to your public URL (not localhost!)
#    - Generate encryption key: openssl rand -hex 32

# 3. Start n8n
docker-compose up -d

# 4. Access n8n at http://localhost:5678 (or your public URL)
```

### First-Time Setup

1. Open http://localhost:5678
2. Create your admin account (if using User Management)
3. Import the workflow:
   - The workflow file is mounted at `/home/node/workflow.json`
   - Go to **Workflows** → **Import from File**
   - Or use CLI: `docker exec -it n8n-aggie n8n import:workflow --input=/home/node/workflow.json`
4. Set up credentials for each service (see [Credential Setup](#credential-setup))
5. Activate the workflow

### Security Options

#### Option 1: n8n User Management (Recommended)

This is enabled by default. On first access, you'll create an admin account.

```env
# In .env - this is the default
N8N_USER_MANAGEMENT_DISABLED=false
```

#### Option 2: Basic Auth

Simple username/password protection. Good for personal use.

```env
# In .env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password-here
```

#### Encryption Key (IMPORTANT!)

Always set an encryption key to protect stored credentials:

```bash
# Generate a key
openssl rand -hex 32

# Add to .env
N8N_ENCRYPTION_KEY=your-generated-key-here
```

**Save this key securely!** If you lose it, you'll need to re-enter all OAuth credentials.

### Production Deployment

For production, you should:

1. **Use HTTPS** - Put n8n behind a reverse proxy (nginx, Traefik, Caddy)
   ```env
   N8N_PROTOCOL=https
   N8N_HOST=n8n.yourdomain.com
   WEBHOOK_URL=https://n8n.yourdomain.com/
   ```

2. **Set strong credentials** - Use a strong password or enable User Management

3. **Backup the data volume** - Contains your workflows and encrypted credentials
   ```bash
   docker run --rm -v n8n_data:/data -v $(pwd):/backup alpine tar czf /backup/n8n-backup.tar.gz /data
   ```

4. **Keep the encryption key safe** - Store it in a password manager or secrets vault

### Docker Commands

```bash
# Start n8n
docker-compose up -d

# View logs
docker-compose logs -f n8n

# Stop n8n
docker-compose down

# Import workflow via CLI
docker exec -it n8n-aggie n8n import:workflow --input=/home/node/workflow.json

# Restart after config changes
docker-compose down && docker-compose up -d

# Backup n8n data
docker run --rm -v n8n_data:/data -v $(pwd):/backup alpine tar czf /backup/n8n-backup.tar.gz /data
```

---

## Project Structure

```
aggie/
├── n8n-workflow.json       # Importable n8n workflow
├── docker-compose.yml      # Optional Docker setup for n8n
├── README.md               # This file
└── frontend/
    ├── src/
    │   ├── components/     # React components
    │   │   ├── SearchBar.tsx
    │   │   ├── ResultCard.tsx
    │   │   ├── ResultsGroup.tsx
    │   │   ├── LoadingState.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── ErrorBanner.tsx
    │   │   ├── ErrorState.tsx
    │   │   ├── ServiceErrorCard.tsx
    │   │   ├── SourceIcon.tsx
    │   │   └── ThemeToggle.tsx
    │   ├── hooks/
    │   │   └── useSearch.ts
    │   ├── types/
    │   │   └── search.types.ts
    │   ├── utils/
    │   │   └── api.ts
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── .env.example
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.ts
    └── tsconfig.json
```

---

## License

MIT
