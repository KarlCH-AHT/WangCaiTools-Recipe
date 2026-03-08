# Family Recipe Planner

A full-stack family recipe management app with AI recipe generation, weekly meal planning, shopping lists, cooking mode, and PDF export.

**Tech Stack:** React 19 · TypeScript · Tailwind CSS 4 · tRPC 11 · Drizzle ORM · MySQL · Express · OpenAI SDK · AWS S3 · PDFKit

---

## Features

- **Recipe Management** - Create, edit, delete, and search recipes with ingredients, steps, images, and tags
- **AI Generation** - Generate complete recipes from a dish name using any OpenAI-compatible LLM
- **Link Import** - Import recipes from any URL (scrapes title, ingredients, and steps)
- **Weekly & Daily Meal Planning** - Drag recipes into a weekly calendar and generate shopping lists
- **Cooking Mode** - Step-by-step guided cooking view with ingredient highlighting
- **PDF Export** - Export any recipe as a beautifully formatted PDF (supports Chinese, German, English)
- **Multi-language UI** - Chinese (zh), German (de), and English (en)
- **Email/Password Auth** - Self-contained JWT-based authentication (no OAuth provider required)

---

## Quick Start

### Prerequisites

- Node.js 20+
- MySQL 8+ (or PlanetScale / TiDB / any MySQL-compatible database)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/family-recipe-planner.git
cd family-recipe-planner
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | MySQL connection string |
| `JWT_SECRET` | ✅ | Random secret for session cookies |
| `OWNER_OPEN_ID` | Optional | If set, this user becomes `admin` on upsert |
| `OPENAI_API_KEY` | For AI features | OpenAI (or compatible) API key |
| `OPENAI_BASE_URL` | Optional | Override API endpoint (default: OpenAI) |
| `OPENAI_MODEL` | Optional | Model name (default: `gpt-4o-mini`) |
| `S3_BUCKET` | For images | AWS S3 bucket name |
| `S3_REGION` | For images | AWS region (default: `us-east-1`) |
| `S3_ACCESS_KEY_ID` | For images | AWS access key |
| `S3_SECRET_ACCESS_KEY` | For images | AWS secret key |
| `S3_PUBLIC_BASE_URL` | Optional | CDN base URL for uploaded files |

### 3. Set up the database

```bash
npm run db:push
```

### 4. Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register your first account.

---

## Deployment

### Render (Recommended)

1. Push to GitHub
2. Go to [render.com](https://render.com) -> New Web Service
3. Connect your repository
4. Render auto-detects `render.yaml` -> click **Deploy**
5. Add environment variables in the Render dashboard

### Vercel

> **Note:** Vercel is optimized for serverless. The Express server runs as a single serverless function, which works but may have cold start latency.

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) -> New Project
3. Import your repository
4. Set environment variables in Project Settings -> Environment Variables
5. Deploy

### Netlify

> **Note:** Netlify requires wrapping the Express app in a Netlify Function. See `netlify.toml` for configuration.

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) -> Add new site
3. Import from Git
4. Set environment variables in Site Settings -> Environment Variables
5. Deploy

### Self-hosted (VPS / Docker)

```bash
npm run build
NODE_ENV=production DATABASE_URL=... JWT_SECRET=... npm start
```

---

## License

MIT
