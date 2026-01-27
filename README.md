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

- **n8n** v1.0+ (self-hosted or cloud) - tested with v2.2.3
- **Node.js** v18+ and npm
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
4. The URL format is: `https://n8n.wastrilith2k.net/webhook/search`

### 4. Start Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env and set VITE_N8N_WEBHOOK_URL to your webhook URL
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

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
   - Add authorized redirect URI: `https://n8n.wastrilith2k.net/rest/oauth2-credential/callback`
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
   - Set redirect URI: `https://n8n.wastrilith2k.net/rest/oauth2-credential/callback`

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
   - Authorize and copy the token

3. **Add to n8n**
   - In the workflow, Trello credentials are passed as query parameters
   - Set environment variables in n8n:
     - `TRELLO_API_KEY`: your API key
     - `TRELLO_TOKEN`: your token

   Or edit the Trello Search node to use hardcoded values.

---

## Frontend Configuration

### Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_N8N_WEBHOOK_URL=https://n8n.wastrilith2k.net/webhook/search
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
curl -X POST https://n8n.wastrilith2k.net/webhook/search \
  -H "Content-Type: application/json" \
  -d '{"query": "meeting notes"}'

# Test locally
curl -X POST https://n8n.wastrilith2k.net/webhook/search \
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

## Docker Setup (Optional)

If you want to run n8n locally via Docker:

```bash
docker-compose up -d
```

n8n will be available at https://n8n.wastrilith2k.net

See `docker-compose.yml` for configuration options.

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
