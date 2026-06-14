# Bookified

Bookified turns uploaded PDF books into searchable, voice-enabled conversations. Authenticated users can build a personal library, upload and parse PDFs, choose an assistant voice, and discuss a book through a Vapi-powered browser call.

## Features

- Clerk authentication and user-scoped data access
- Personal library with title and author search
- PDF uploads up to 50 MB
- Optional JPG, PNG, or WebP cover uploads up to 10 MB
- Browser-side PDF text extraction and first-page cover generation
- Overlapping text segments stored in MongoDB for full-text retrieval
- Vapi voice conversations with live transcripts
- Deepgram transcription and ElevenLabs voices configured through Vapi
- Free, Standard, and Pro usage limits backed by Clerk Billing
- Direct-to-Vercel Blob client uploads with authenticated upload tokens
- Rollback and Blob cleanup for partially failed uploads

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Radix UI |
| Authentication and billing | Clerk |
| Database | MongoDB Atlas, Mongoose |
| File storage | Vercel Blob |
| PDF processing | PDF.js (`pdfjs-dist`) |
| Voice assistant | Vapi Web SDK |
| Speech-to-text | Deepgram through Vapi |
| Voice output | ElevenLabs through Vapi |
| Validation and forms | Zod, React Hook Form |
| Deployment | Vercel |

## Screenshots

<!-- TODO: Add a screenshot of the authenticated library page. -->

<!-- TODO: Add a screenshot of the PDF upload form. -->

<!-- TODO: Add a screenshot of an active voice conversation and transcript. -->

## Getting Started

### Prerequisites

- Node.js `22.13.0` or newer
- npm
- Clerk application
- MongoDB Atlas deployment
- Vercel Blob store
- Vapi account, public API key, and assistant

An ElevenLabs API key is only required for the standalone
`/api/voice/synthesize` route. Vapi-hosted calls use the voice provider
configuration in Vapi.

### Installation

```bash
git clone https://github.com/Tieson18/bookified.git
cd bookified
npm install
```

Create the local environment file:

```bash
cp .env.example .env.local
```

On PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Fill in the required values described in
[`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md).

### Environment Variables

The minimum application configuration is:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
MONGODB_URI=
BLOB_READ_WRITE_TOKEN=
NEXT_PUBLIC_ASSISTANT_ID=
NEXT_PUBLIC_VAPI_API_KEY=
```

Clerk route variables, the production Vapi webhook secret, optional MongoDB
DNS overrides, and the conditional ElevenLabs key are included in
[`.env.example`](.env.example).

Never commit `.env`, `.env.local`, provider tokens, or production credentials.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Clerk protects the
application routes, so sign in before opening the library or upload flow.

Microphone access works on `localhost`. A deployed voice experience must use
HTTPS.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with Turbopack |
| `npm run lint` | Run ESLint |
| `npm run build` | Type-check and create a production build |
| `npm run start` | Run the completed production build |

There is currently no automated test command.

## Deployment

Vercel is the intended deployment target.

1. Import the repository into Vercel.
2. Use Node.js 22 or newer.
3. Connect a Vercel Blob store.
4. Add all production environment variables.
5. Allow the deployment to reach MongoDB Atlas.
6. Configure Clerk production keys, domains, billing plans, and redirects.
7. Configure Vapi with the production domain and public key.
8. Run `npm run build` before promotion.

`NEXT_PUBLIC_*` values are embedded during the build and must be present before
deployment. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full
checklist.

## Folder Structure

```text
app/
  (root)/                  Authenticated pages
  api/                     Upload, Vapi webhook, and synthesis handlers
  sign-in/                 Clerk sign-in route
  sign-up/                 Clerk sign-up route
components/                Server and Client UI components
database/                  MongoDB connection management
hooks/                     Vapi and voice-session React hooks
lib/
  actions/                 Authenticated Server Actions
  services/                Book, session, upload, and storage workflows
  subscriptions/           Clerk subscription resolution
  vapi/                    Vapi client, assistant, events, and diagnostics
models/                    Mongoose schemas and indexes
public/assets/             Static visual assets
types/                     Shared TypeScript models
docs/                      Developer and operations documentation
proxy.ts                   Clerk route protection for Next.js 16
```

## Documentation

- [Local setup](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API and Server Actions](docs/API.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Security](docs/SECURITY.md)
- [Changelog](CHANGELOG.md)

## Known Issues

- PDF parsing is text extraction only. Image-only or scanned PDFs require OCR
  before upload.
- Parsing and first-page cover rendering happen in the browser, so very large
  or complex PDFs can use significant client memory and CPU.
- Extracted segments do not currently retain page numbers.
- MongoDB retrieval uses a text index, not vector or semantic search.
- The browser call uses the client-side `search_book_content` tool. The
  separate `/api/vapi/search-book` webhook expects `search_book` and must be
  configured independently if used.
- `/api/voice/synthesize` exists but is not called by the current UI.
- Production builds need network access to download the configured Google
  fonts unless the fonts are self-hosted.
- No automated unit, integration, or end-to-end tests are configured.

## Future Improvements

- Add OCR for scanned PDFs.
- Move heavy PDF processing to a background worker for large documents.
- Add vector embeddings and semantic retrieval.
- Add user-facing book deletion with database and Blob cleanup.
- Persist optional session history for eligible subscription plans.
- Add rate limiting, observability, and structured audit events.
- Add unit, integration, and browser tests.
- Self-host fonts for deterministic offline builds.

## License

<!-- TODO: Add a LICENSE file and document the selected license here. -->
