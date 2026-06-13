# Bookified

Bookified turns uploaded PDFs into searchable, voice-enabled conversations.
The application uses Next.js App Router, Clerk, MongoDB, Vercel Blob, Vapi,
and ElevenLabs.

## Requirements

- Node.js 22.13 or newer
- A MongoDB database
- Clerk, Vercel Blob, Vapi, and ElevenLabs credentials

## Environment

Create `.env.local` and configure:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
MONGODB_URI=
BLOB_READ_WRITE_TOKEN=
NEXT_PUBLIC_VAPI_API_KEY=
NEXT_PUBLIC_ASSISTANT_ID=
VAPI_WEBHOOK_SECRET=
ELEVENLABS_API_KEY=
```

`MONGODB_DNS_SERVERS` is optional and accepts a comma-separated list of DNS
servers for MongoDB SRV lookups. Clerk redirect URLs can also be configured
with the standard Clerk environment variables.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run check
npm run build
```

`npm run check` runs ESLint and the strict TypeScript compiler.

## Production

Configure the same environment variables in the deployment platform. Production
deployments must set `VAPI_WEBHOOK_SECRET`; the Vapi search webhook rejects
requests when it is missing in production.
