# Environment Variables

Bookified loads environment variables from Next.js `.env*` files in the project
root and from the deployment platform.

Copy the template:

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

## Variable Reference

| Variable | Exposure | Requirement | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Required | Initializes Clerk in the browser |
| `CLERK_SECRET_KEY` | Server-only | Required | Clerk server authentication and billing calls |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Public | Required by current routing | Clerk sign-in route, `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Public | Required by current routing | Clerk sign-up route, `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Public | Recommended | Post-sign-in fallback, `/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Public | Recommended | Post-sign-up fallback, `/` |
| `MONGODB_URI` | Server-only | Required | MongoDB/Mongoose connection string |
| `MONGODB_DNS_SERVERS` | Server-only | Optional | Comma-separated DNS servers for SRV resolution |
| `BLOB_READ_WRITE_TOKEN` | Server-only | Required | Creates Vercel Blob upload tokens and deletes files |
| `NEXT_PUBLIC_ASSISTANT_ID` | Public | Required for voice | Vapi assistant started by the browser |
| `NEXT_PUBLIC_VAPI_API_KEY` | Public | Required for voice | Vapi public web API key |
| `VAPI_WEBHOOK_SECRET` | Server-only | Required in production for webhook | Authenticates `/api/vapi/search-book` |
| `ELEVENLABS_API_KEY` | Server-only | Conditional | Enables `/api/voice/synthesize` |

## Public Variables

Every `NEXT_PUBLIC_*` value is included in browser JavaScript and is frozen at
build time.

Public variables must contain only values that are safe for every site visitor:

- Clerk publishable key
- Clerk route configuration
- Vapi public web key
- Vapi assistant ID

Changing a public variable in Vercel requires a new deployment.

## Server-only Variables

Do not prefix these with `NEXT_PUBLIC_`:

- `CLERK_SECRET_KEY`
- `MONGODB_URI`
- `MONGODB_DNS_SERVERS`
- `BLOB_READ_WRITE_TOKEN`
- `VAPI_WEBHOOK_SECRET`
- `ELEVENLABS_API_KEY`

These values are read only by Server Actions, Route Handlers, or server-only
services.

## Complete Example

The repository's `.env.example` contains:

```dotenv
# Clerk browser configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Clerk server credential
CLERK_SECRET_KEY=sk_test_replace_me

# MongoDB Atlas
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER/bookified?retryWrites=true&w=majority
# MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_replace_me

# Vapi browser configuration
NEXT_PUBLIC_ASSISTANT_ID=replace_me
NEXT_PUBLIC_VAPI_API_KEY=replace_with_public_web_key

# Required for the public Vapi webhook in production
VAPI_WEBHOOK_SECRET=

# Optional: only required by POST /api/voice/synthesize
# ELEVENLABS_API_KEY=replace_me
```

## Variable Notes

### Clerk

Development and production Clerk instances have different keys. Do not deploy
`pk_test_*` or `sk_test_*` values to production.

The application expects custom sign-in and sign-up pages at `/sign-in` and
`/sign-up`.

### MongoDB

Use a dedicated database user and include a database name in `MONGODB_URI`.
Percent-encode credentials containing `@`, `:`, `/`, `?`, `#`, or other URI
characters.

`MONGODB_DNS_SERVERS` is not normally needed. The code accepts values such as:

```dotenv
MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8
```

### Vercel Blob

`BLOB_READ_WRITE_TOKEN` is sufficient for the source code. A linked Vercel
integration may inject additional store metadata variables. For example,
`bookified_STORE_ID` can exist in a local environment, but the application does
not read it.

### Vapi

`NEXT_PUBLIC_VAPI_API_KEY` must be a key intended for browser use. A private
Vapi API key must remain server-only and is not required by the current code.

`VAPI_WEBHOOK_SECRET` protects only the optional server-side custom tool route.
The browser-handled `search_book_content` tool is authenticated through Clerk
Server Actions instead.

### ElevenLabs

Vapi voice output uses the ElevenLabs provider through Vapi. The
`ELEVENLABS_API_KEY` variable is used only by the standalone synthesis Route
Handler.

## Security Notes

- `.env*` is ignored by Git in this repository.
- Never paste real values into `.env.example`, documentation, issues, or pull
  requests.
- Scope provider tokens to the smallest available permissions.
- Rotate a secret immediately if it appears in logs or version control.
- Use different secrets for development, preview, and production.
- Limit access to production environment variables in Vercel.
- Treat public Blob URLs as discoverable by anyone who obtains the URL.
- Avoid printing complete request bodies, MongoDB URIs, or provider responses
  that may contain credentials.

## Validation Checklist

```bash
npm run lint
npm run build
```

Then verify:

1. Clerk sign-in succeeds.
2. The library loads without a MongoDB connection error.
3. A small text-based PDF uploads.
4. The generated Blob URLs render.
5. A Vapi call starts and requests microphone permission.
6. The Vapi webhook rejects an incorrect secret if that path is configured.
