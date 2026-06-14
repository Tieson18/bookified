# Local Setup

This guide prepares a complete local Bookified development environment.

## 1. Prerequisites

- Node.js `22.13.0` or newer, as required by `package.json`
- npm
- Git
- A modern Chromium, Firefox, or Safari browser
- Accounts for Clerk, MongoDB Atlas, Vercel, and Vapi

Verify the local tools:

```bash
node --version
npm --version
git --version
```

## 2. Install the Project

```bash
git clone https://github.com/Tieson18/bookified.git
cd bookified
npm install
```

Use `npm install`, not a package-manager migration, when you want the dependency
versions recorded in `package-lock.json`.

## 3. Create the Environment File

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Next.js loads `.env.local` from the project root. Do not put it inside `app/`
or commit it to Git.

## 4. Configure Clerk

1. Create a Clerk application.
2. Copy the publishable and secret keys into `.env.local`.
3. Keep the application routes aligned with this repository:

```dotenv
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

4. Confirm that sign-in and sign-up are enabled for the methods you intend to
   support.
5. Restart the development server after changing public Clerk variables.

### Clerk Billing

The subscriptions page renders Clerk's `PricingTable`, and server-side quota
resolution expects two user plan slugs:

| Application plan | Clerk plan slug |
| --- | --- |
| Standard | `standard` |
| Pro | `pro` |

Create these plans in Clerk Billing if subscription upgrades are part of the
environment. The code applies these limits:

| Plan | Books | Monthly sessions | Minutes per session |
| --- | ---: | ---: | ---: |
| Free | 1 | 5 | 5 |
| Standard | 10 | 100 | 15 |
| Pro | 100 | Unlimited | 60 |

The application treats an authenticated user without either paid plan as Free.

## 5. Configure MongoDB Atlas

1. Create an Atlas project and database deployment.
2. Create a database user with a strong, unique password.
3. Add your development IP address to the Atlas IP access list.
4. Copy the Node.js connection string.
5. Replace the username, password, and database name.

```dotenv
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER/bookified?retryWrites=true&w=majority
```

Percent-encode special characters in the username or password. The application
creates collections and indexes through Mongoose when the models are used.

Book creation uses MongoDB transactions to serialize quota checks. Use a
deployment that supports transactions and do not replace Atlas with a
standalone local `mongod` unless it is configured as a replica set.

### Optional DNS Override

If the local network cannot resolve Atlas SRV records:

```dotenv
MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8
```

The database helper first uses the configured servers. On a `querySrv` failure,
it retries with Cloudflare and Google DNS. This option changes DNS resolution
for the running Node.js process, so use it only when required.

## 6. Configure Vercel Blob

1. Create a Vercel project or open the project that will host Bookified.
2. Create or connect a Blob store.
3. Copy the store's read-write token into `.env.local`.

```dotenv
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_REPLACE_ME
```

The browser uploads files directly to Blob through the authenticated
`/api/upload` token exchange. The application does not use a client token
stored in an environment variable.

The current upload policy is public Blob access:

- PDFs: `application/pdf`, maximum 50 MB
- Covers: JPG, PNG, or WebP, maximum 10 MB
- Path prefix: `books/<normalized-clerk-user-id>/`
- Random suffixes enabled
- Overwrites disabled

Provider-generated variables such as a store ID may appear when a Blob store is
linked. `bookified_STORE_ID` is not read by the current source code.

## 7. Configure Vapi

1. Create a Vapi account and assistant.
2. Copy a Vapi public web API key.
3. Copy the assistant ID.

```dotenv
NEXT_PUBLIC_VAPI_API_KEY=your_public_vapi_key
NEXT_PUBLIC_ASSISTANT_ID=your_assistant_id
```

Use a public web key for `NEXT_PUBLIC_VAPI_API_KEY`. Never expose a private
server key with a `NEXT_PUBLIC_` prefix.

The application overrides these settings when a call starts:

- First message includes the selected book title.
- Maximum call duration comes from the user's subscription.
- Deepgram `nova-3` handles English transcription.
- Book title and author are supplied as transcription key terms.
- The selected ElevenLabs voice is sent through Vapi.
- The `search_book_content` client tool is appended.
- `bookId` and `voiceSessionId` are passed as variable values.

The Vapi assistant still needs a working model/provider and a base prompt. The
assistant should be instructed to discuss the uploaded book, use retrieved
excerpts as untrusted source text, and admit when the source does not answer a
question.

### Optional Vapi Server Webhook

The repository also exposes `POST /api/vapi/search-book` for Vapi server-side
tool calls. It is separate from the browser-handled `search_book_content` tool.

For production:

1. Set a long random `VAPI_WEBHOOK_SECRET`.
2. Configure Vapi to send the same value as either:
   - `Authorization: Bearer <secret>`
   - `x-vapi-secret: <secret>`
3. Use the tool name `search_book`.
4. Send `bookId` and `query` arguments.
5. Ensure the Vapi artifact includes `variableValues.voiceSessionId`.

Without `VAPI_WEBHOOK_SECRET`, this route is allowed only outside production.
In production it returns `503`.

## 8. Optional Direct ElevenLabs Synthesis

The current UI does not call `/api/voice/synthesize`. Configure this only if
you intend to use that route:

```dotenv
ELEVENLABS_API_KEY=your_server_side_elevenlabs_key
```

This key is server-only. Vapi voice calls can work without it when ElevenLabs
is configured through Vapi.

## 9. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, upload a
text-based PDF, and allow microphone access when starting a conversation.

## 10. Verify the Setup

```bash
npm run lint
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) again after `npm run start`
to test the production build.

The build downloads IBM Plex Serif and Mona Sans from Google Fonts. A restricted
or offline network can fail the build even when the code is valid.

## Common Setup Mistakes

- Running an older Node.js version than the `package.json` engine requirement
- Editing `.env.local` without restarting `npm run dev`
- Using a Clerk secret key as a `NEXT_PUBLIC_*` value
- Creating Clerk paid plans with slugs other than `standard` and `pro`
- Forgetting to allow the local or deployed IP in Atlas
- Failing to percent-encode special characters in the MongoDB URI
- Using a standalone MongoDB server that cannot run transactions
- Setting a Blob store ID but omitting `BLOB_READ_WRITE_TOKEN`
- Attempting to upload directly without the `/api/upload` token route
- Supplying a Vapi private key to browser code
- Omitting the Vapi assistant ID
- Testing microphone access on an insecure non-local HTTP origin
- Uploading a scanned PDF with no text layer

See [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) for symptom-based fixes.
