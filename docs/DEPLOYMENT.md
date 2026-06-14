# Deployment

Bookified is designed for a Vercel deployment backed by Clerk, MongoDB Atlas,
Vercel Blob, and Vapi.

## Pre-deployment Checks

Run locally:

```bash
npm install
npm run lint
npm run build
```

The project requires Node.js `22.13.0` or newer. `next build` runs the TypeScript
check but, in Next.js 16, does not run ESLint automatically.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Confirm the framework preset is Next.js.
4. Set the Node.js version to 22 or newer.
5. Keep the install command as `npm install`.
6. Keep the build command as `npm run build`.
7. Connect a Vercel Blob store.
8. Add environment variables for Production and, as needed, Preview.
9. Deploy.

The application requires a server runtime and cannot be deployed as a static
export.

## Vercel Environment Variables

Required:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
MONGODB_URI=
BLOB_READ_WRITE_TOKEN=
NEXT_PUBLIC_ASSISTANT_ID=
NEXT_PUBLIC_VAPI_API_KEY=
VAPI_WEBHOOK_SECRET=
```

Conditional:

```dotenv
MONGODB_DNS_SERVERS=
ELEVENLABS_API_KEY=
```

`NEXT_PUBLIC_*` variables are embedded during the build. Redeploy after changing
them.

Do not set `NODE_ENV`; Next.js manages it.

## MongoDB Atlas Production Checklist

- Use a dedicated production project or cluster.
- Use a dedicated application database user.
- Grant only the database permissions the application needs.
- Store the connection string only in Vercel.
- Confirm the Vercel runtime can reach Atlas.
- Prefer controlled egress IPs where available.
- If broad IP access is temporarily necessary, use strong credentials, monitor
  access, and reduce the network range as soon as possible.
- Confirm transactions are supported.
- Enable backups appropriate to the selected Atlas tier.
- Configure alerts for connection, storage, and resource pressure.
- Review indexes created by the Mongoose models.
- Test duplicate-book and concurrent quota behavior in a non-production
  environment.

Preview deployments should not share production data unless that is an
intentional and reviewed decision.

## Vercel Blob Production Checklist

- Link the intended production Blob store to the Vercel project.
- Confirm `BLOB_READ_WRITE_TOKEN` is available in Production.
- Do not expose the read-write token to the browser.
- Keep `/api/upload` protected by Clerk.
- Verify the allowed content types and file-size limits.
- Confirm uploaded paths start with `books/<normalized-user-id>/`.
- Remember that both PDFs and covers are currently uploaded with public access.
- Define retention and deletion procedures for user data.
- Monitor storage and bandwidth usage.

The application attempts rollback when persistence fails, but operational
monitoring should still detect orphaned Blob objects.

## Clerk Production Checklist

1. Switch the Clerk application to its production instance.
2. Add the production domain and allowed redirect URLs.
3. Replace all development keys in Vercel.
4. Verify `/sign-in` and `/sign-up`.
5. Configure the production sign-in methods.
6. Enable Clerk Billing if paid plans are offered.
7. Create user plans with exact slugs `standard` and `pro`.
8. Confirm the `PricingTable` displays the intended prices and features.
9. Test active, canceled-but-current, and expired subscription states.
10. Test sign-out and session expiration.

The app's usage limits are defined in source code. Changing Clerk plan display
text alone does not change Bookified limits.

## Vapi Production Checklist

- Use a Vapi public web key for `NEXT_PUBLIC_VAPI_API_KEY`.
- Confirm the assistant ID belongs to the production Vapi account.
- Configure a supported model/provider on the assistant.
- Configure provider billing and sufficient credits.
- Confirm the production origin is permitted for browser calls.
- Test microphone access over HTTPS.
- Test the five configured voice personas.
- Confirm transcript, speech update, status update, and tool-call client
  messages are delivered.
- Verify maximum duration enforcement for every subscription plan.

For `/api/vapi/search-book`:

- Set `VAPI_WEBHOOK_SECRET` in Vercel.
- Set the same Bearer or `x-vapi-secret` header in Vapi.
- Use `https://<production-domain>/api/vapi/search-book`.
- Use tool name `search_book`.
- Include `bookId`, `query`, and the call variable `voiceSessionId`.

The default browser flow uses `search_book_content` instead. Decide which path
the assistant should use and test it explicitly.

## ElevenLabs Production Checklist

The Vapi call sends ElevenLabs voice IDs through Vapi. Confirm that Vapi can use
the provider.

If `/api/voice/synthesize` is enabled:

- Add `ELEVENLABS_API_KEY` to Vercel.
- Keep it server-only.
- Add rate limiting before exposing the route to significant traffic.
- Set usage alerts and budget limits with the provider.
- Review the fixed model and voice IDs before launch.

## Build and Runtime Configuration

`next.config.ts` currently:

- Allows Server Action request bodies up to 100 MB.
- Permits Open Library covers.
- Permits Blob images at `**.public.blob.vercel-storage.com/books/**`.
- Uses the project root for Turbopack.

Application validation is stricter than the Server Action body limit:

- PDF: 50 MB
- Cover: 10 MB

## Build Troubleshooting

### Google Fonts Cannot Be Downloaded

`app/layout.tsx` uses `next/font/google` for IBM Plex Serif and Mona Sans. The
build environment needs outbound access to Google Fonts.

Actions:

- Retry after confirming network access.
- Check provider status.
- Self-host the font files with `next/font/local` for deterministic builds.

### Missing Environment Variable

Symptoms include Clerk failures, `MONGODB_URI is not defined`, Blob token
errors, or Vapi start failures.

Actions:

1. Compare Vercel variables with `.env.example`.
2. Confirm the variable is assigned to the current deployment environment.
3. Redeploy after changing `NEXT_PUBLIC_*` variables.

### MongoDB Build or Runtime Timeout

The app generally connects at request time, but route data collection or
runtime requests can still reveal network failures.

- Check the Atlas IP access list.
- Check the URI and encoded password.
- Check Atlas status and cluster availability.
- Review `querySrv` guidance in `TROUBLESHOOTING.md`.

### Image Host Rejected

If a cover does not render, confirm that its hostname and pathname match
`next.config.ts`. A new Blob hostname pattern or storage provider requires a
configuration change and redeployment.

### Vapi Webhook Returns `503`

Production intentionally rejects the webhook when `VAPI_WEBHOOK_SECRET` is
missing. Add the secret to Vercel and redeploy.

## Post-deployment Smoke Test

1. Sign up and sign in.
2. Confirm protected routes redirect signed-out users.
3. Upload a small text-based PDF without a manual cover.
4. Confirm the PDF and generated cover exist in Blob.
5. Confirm the book and segments exist in MongoDB.
6. Search the library.
7. Start and stop a voice session.
8. Ask a content question and verify retrieval.
9. Reach or simulate a plan limit.
10. Review Vercel, Clerk, MongoDB, Blob, Vapi, and provider logs.

## Rollback

Use Vercel's deployment rollback for application code. A code rollback does not
automatically roll back:

- MongoDB documents
- Blob objects
- Clerk plan configuration
- Vapi assistant configuration
- Environment-variable changes

Treat provider and schema changes as separate operational releases with their
own rollback steps.
