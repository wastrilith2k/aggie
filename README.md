# Aggie - Multi-Platform Note Search

A unified search dashboard that queries Google Drive, Trello, Gmail, OneDrive, and Google Calendar simultaneously.

[![Demo Video](https://img.youtube.com/vi/Fhe7XXuelEU/maxresdefault.jpg)](https://youtu.be/Fhe7XXuelEU)

```
┌─────────────────┐                           ┌─────────────────┐
│                 │    POST /webhook/search   │                 │
│  React Frontend │  ───────────────────────► │  n8n Workflow   │
│  (Firebase)     │       { query: "..." }    │                 │
│                 │  ◄─────────────────────── │  ┌───────────┐  │
└─────────────────┘    Unified JSON Results   │  │ Drive     │  │
                                              │  │ Gmail     │  │
                                              │  │ Calendar  │  │
                                              │  │ OneDrive  │  │
                                              │  │ Trello    │  │
                                              │  └───────────┘  │
                                              └─────────────────┘
```

## Features

- **Unified Search** - Query all services with one search
- **Google Sign-in** - Secure authentication with email whitelist support
- **Keyboard Navigation** - Vim-style shortcuts (`j`/`k` to navigate, `/` to search)
- **Dark Mode** - Toggle between light and dark themes
- **Responsive** - Works on desktop and mobile

## Quick Start

### Prerequisites

- **n8n instance** - Self-hosted or [n8n Cloud](https://n8n.io/cloud/)
- **Node.js 18+** - For local development
- **Firebase project** - For authentication and hosting

### 1. Set Up n8n Workflow

1. Import `n8n-workflow.json` into your n8n instance
2. Configure credentials for each service (see [Credential Setup](#credential-setup))
3. Activate the workflow and copy your webhook URL

### 2. Set Up Firebase Project

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** → **Google** sign-in provider
3. Add a web app and copy the config values

### 3. Deploy Frontend (Recommended: Firebase Hosting)

```bash
cd frontend
cp .env.example .env
# Edit .env with your n8n webhook URL and Firebase config

npm install
npm run build

# Deploy to Firebase
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only hosting
```

Your app will be live at `https://YOUR_PROJECT_ID.web.app`

### 4. (Optional) Automated Deployments

The repo includes GitHub Actions for automatic deployment on push. Add these secrets to your repo:

| Secret | Description |
|--------|-------------|
| `VITE_N8N_WEBHOOK_URL` | Your n8n webhook URL |
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON from Firebase Console |

---

## Credential Setup

### Google (Drive, Gmail, Calendar)

1. Create a [Google Cloud project](https://console.cloud.google.com/)
2. Enable Drive, Gmail, and Calendar APIs
3. Configure OAuth consent screen with read-only scopes
4. Create OAuth credentials with redirect URI: `https://YOUR_N8N_URL/rest/oauth2-credential/callback`
5. In n8n, create credentials for each service using the Client ID and Secret

### Microsoft (OneDrive)

1. Register an app in [Azure Portal](https://portal.azure.com/) → Azure AD → App registrations
2. Add `Files.Read.All` permission under Microsoft Graph
3. Create a client secret
4. In n8n, create OAuth2 credential with the Azure credentials

### Trello

1. Get API key from [Trello Power-Ups Admin](https://trello.com/power-ups/admin)
2. Generate token: `https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key=YOUR_API_KEY`
3. Replace `YOUR_TRELLO_API_KEY` and `YOUR_TRELLO_TOKEN` in the n8n workflow

---

## Access Control

To restrict access to specific users, set the `VITE_ALLOWED_EMAILS` environment variable in `frontend/.env`:

```bash
VITE_ALLOWED_EMAILS=user@gmail.com,another@example.com
```

Multiple emails can be comma-separated. Leave empty or omit to allow any authenticated Google user.

---

## Local Development

```bash
cd frontend
cp .env.example .env
# Edit .env with your configuration

npm install
npm run dev
```

Open http://localhost:5173

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search bar |
| `Enter` | Search or open selected result |
| `j` | Next result |
| `k` | Previous result |
| `Esc` | Close suggestions |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error | Ensure n8n webhook allows your frontend origin |
| OAuth token expired | Reconnect credential in n8n |
| Empty results | Verify API scopes and credential permissions |
| Partial failures | Check n8n execution logs for service-specific errors |

---

## Project Structure

```
aggie/
├── n8n-workflow.json              # n8n workflow (import this)
├── frontend/
│   ├── src/
│   │   ├── components/            # UI components
│   │   ├── firebase/              # Auth config and context
│   │   ├── hooks/                 # React hooks
│   │   ├── types/                 # TypeScript types
│   │   └── utils/                 # API utilities
│   ├── .env.example               # Environment template
│   ├── firebase.json              # Hosting configuration
│   └── package.json
├── scripts/
│   └── sync-env-to-gh.sh          # Sync .env to GitHub Secrets
├── docker-compose.yml             # Optional: self-host n8n
└── .github/workflows/
    └── firebase-deploy.yml        # CI/CD for Firebase
```

---

## Security Notes

- All API credentials are stored in n8n (not in the frontend)
- Firebase Authentication protects the frontend
- Email whitelist provides additional access control
- Environment variables are never committed (`.env` is gitignored)
- GitHub Secrets store deployment credentials securely

---

## License

MIT
