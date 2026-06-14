# Troubleshooting

Start with:

```bash
node --version
npm install
npm run lint
npm run build
```

The project requires Node.js `22.13.0` or newer. Restart `npm run dev` after
changing any environment variable.

## MongoDB `querySrv ECONNREFUSED`

Typical messages:

```text
querySrv ECONNREFUSED
MongoServerSelectionError
```

This means the runtime could not resolve or reach the DNS SRV record in a
`mongodb+srv://` URI.

1. Confirm that `MONGODB_URI` is copied exactly from Atlas.
2. Confirm the cluster is running.
3. Confirm the current IP is in the Atlas IP access list.
4. Test another network to rule out corporate, school, VPN, or ISP DNS
   filtering.
5. Temporarily disable a VPN or DNS filter.
6. Configure explicit DNS servers:

```dotenv
MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8
```

The connection helper retries `querySrv` failures with those fallback servers.
Remove the override when it is no longer necessary.

Also check:

- Username and password are correct.
- Special URI characters are percent-encoded.
- A database name is present.
- The Vercel production runtime is allowed by Atlas.

## MongoDB Transaction Errors

Book creation uses a transaction for duplicate and quota enforcement.

If the server reports that transactions are unsupported:

- Use MongoDB Atlas or a replica set.
- Do not use a standalone local `mongod`.
- Confirm the database user can read and write the target database.
- Check Atlas availability and connection stability.

## Vercel Blob Client Token Errors

Typical messages:

```text
Blob storage is not configured.
Unable to prepare this upload.
Failed to retrieve the client token.
```

The browser does not use `BLOB_READ_WRITE_TOKEN` directly. It calls
`/api/upload`, which uses the server token to create a scoped upload
authorization.

Check:

1. `BLOB_READ_WRITE_TOKEN` exists in `.env.local` or Vercel.
2. The development server was restarted.
3. The user is signed in.
4. `/api/upload` is not blocked by an extension or network policy.
5. The Blob store is active and connected to the intended Vercel project.
6. The pathname starts with `books/<normalized-current-user-id>/`.
7. The client payload contains `{"kind":"pdf"}` or `{"kind":"cover"}`.

Do not add a read-write Blob token to a `NEXT_PUBLIC_*` variable.

## Upload Rejected with `401` or `403`

- `401` means Clerk did not resolve a signed-in user.
- `403` generally means missing upload metadata, an unsupported asset kind, or
  a pathname outside the current user's prefix.

Sign out and back in, then retry. If custom upload code was added, compare it
with `lib/services/upload/blob-upload.ts`.

## File Upload Issues

### PDF Is Too Large

The PDF limit is 50 MB. Both browser validation and the Blob upload token
enforce it.

### Cover Is Rejected

The cover limit is 10 MB. Accepted formats are:

- JPEG
- PNG
- WebP

The file extension alone is not a security guarantee. The current application
does not inspect magic bytes.

### Upload Finishes but Book Is Missing

Persistence may have failed after Blob upload. The workflow attempts to delete
the uploaded files and returns a cleanup report.

Check:

- Server logs for `BOOK_PERSISTENCE_FAILED`
- MongoDB connectivity and transaction support
- Duplicate title slug
- Subscription book limit
- Whether Blob cleanup logged a failed pathname

### Image Does Not Render

Confirm the cover URL matches an allowed `next/image` pattern:

```text
https://*.public.blob.vercel-storage.com/books/**
```

If the store hostname or path format differs, update `next.config.ts` and
redeploy.

## PDF Parsing Issues

### "This PDF does not contain readable text"

PDF.js extracts a text layer. It does not run OCR.

Try:

- Open the PDF and confirm text can be selected and copied.
- Export the document again with embedded text.
- Run OCR with a trusted tool before uploading.
- Test a smaller known-good PDF.

### Worker Fails to Load

The parser configures:

```text
pdfjs-dist/build/pdf.worker.min.mjs
```

Clear `.next`, reinstall dependencies, and restart:

```powershell
Remove-Item -Recurse -Force .next
npm install
npm run dev
```

Only remove `.next`; do not delete source or environment files.

### Browser Freezes During Parsing

Parsing, text extraction, and first-page rendering currently happen in the
browser. Large page counts, complex vector pages, and high-resolution scans can
consume substantial memory.

- Try a smaller PDF.
- Close memory-heavy tabs.
- Use a current desktop browser.
- Consider moving parsing to a worker or background service before raising the
  upload limit.

### Generated Cover Is Blank

Upload a manual JPG, PNG, or WebP cover. Some PDFs use page content or rendering
features that do not produce a useful first-page canvas.

## Vapi Microphone Issues

### Permission Is Denied

- Use `localhost` or HTTPS.
- Open the browser's site settings and allow microphone access.
- Check operating-system privacy settings.
- Confirm another application is not holding the microphone exclusively.
- Select a working default input device.
- Reload after changing permission.

The Vapi client requests the microphone in its permission prompt and logs Daily
input configuration after a call starts.

### Call Starts but No Speech Is Detected

Open the browser console and inspect messages beginning with:

```text
[Vapi diagnostics]
```

Look for:

- A missing local microphone track
- A muted Vapi or Daily audio state
- No local audio level above the threshold
- Zero outbound WebRTC audio bitrate
- Packet loss or network-state warnings

Test without Bluetooth, a VPN, browser audio extensions, or restrictive
corporate filtering.

### Vapi Says the Meeting Ended

Some Daily/Vapi meeting-ended events are normal during explicit stop and
cleanup. Unexpected endings are translated into user-facing messages when the
provider reports microphone, assistant, voice, transcriber, model, or quota
failures.

Check Vapi call logs, assistant configuration, provider credits, and the
browser console.

## `setSinkId` Audio Output Errors

The application source does not call `HTMLMediaElement.setSinkId()` directly.
An error mentioning it generally originates from the Vapi/Daily browser SDK
while selecting an output device.

`setSinkId` support varies by browser and requires a secure context.

Try:

1. Use a current Chromium-based browser.
2. Use HTTPS or `localhost`.
3. Reset site microphone and sound permissions.
4. Select the system default speaker.
5. Disconnect and reconnect Bluetooth audio.
6. Reload after changing the output device.
7. Test in a private window without extensions.

If calls work despite the console warning, record the browser and SDK versions
before deciding whether the warning is actionable.

## Vapi Assistant Does Not Start

Check:

```dotenv
NEXT_PUBLIC_VAPI_API_KEY=
NEXT_PUBLIC_ASSISTANT_ID=
```

Then confirm:

- The key is a public web key.
- The assistant exists in the same Vapi account.
- The assistant has an available model/provider.
- Provider accounts have sufficient credits.
- The deployment origin is allowed.
- A fresh build was created after changing public variables.

## Book Search Does Not Affect the Voice Answer

The active browser flow expects a client tool named:

```text
search_book_content
```

The separate webhook expects:

```text
search_book
```

Do not configure one name while expecting the other path to run. Inspect Vapi
messages for `tool-calls`, then check MongoDB has a text index and searchable
segments for the book.

MongoDB text search is lexical. Rephrase the question with terms that appear in
the book.

## Vapi Webhook Returns `401`

Check:

- `VAPI_WEBHOOK_SECRET` matches exactly.
- Vapi sends `Authorization: Bearer <secret>` or `x-vapi-secret`.
- `voiceSessionId` is a canonical MongoDB ObjectId.
- The session still exists in MongoDB.
- `bookId` matches the book stored on that session.

## Vapi Webhook Returns `503`

Production requires `VAPI_WEBHOOK_SECRET`. Add it to the deployment environment
and redeploy.

## Tailwind or shadcn/ui Issues

The project uses Tailwind CSS 4 and the `@tailwindcss/postcss` plugin. It does
not use a traditional `tailwind.config.js`.

Check:

- `app/globals.css` includes `@import 'tailwindcss';`.
- `postcss.config.mjs` includes `@tailwindcss/postcss`.
- `components.json` points to `app/globals.css`.
- Imports use the configured `@/*` alias.
- shadcn components are TypeScript and RSC-compatible.

If generated styles appear stale:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

Do not copy Tailwind 3 setup instructions into this project.

## Clerk Authentication Issues

### Redirect Loop or Missing Sign-in Page

Check:

```dotenv
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

Confirm Clerk allows the local or production origin.

### Protected Route Is Unexpectedly Public

Review `proxy.ts`. Only these routes are public:

- `/sign-in(.*)`
- `/sign-up(.*)`
- `/api/vapi/search-book(.*)`

Server Actions must still authenticate independently.

### Paid User Is Treated as Free

- Confirm Clerk Billing is enabled.
- Confirm plan slugs are exactly `standard` or `pro`.
- Confirm the item is active, or canceled with a future period end.
- Check server logs for a failed billing subscription refresh.

## Next.js Build Errors

### Google Font Fetch Failure

The production build downloads IBM Plex Serif and Mona Sans.

```text
Failed to fetch IBM Plex Serif from Google Fonts
Failed to fetch Mona Sans from Google Fonts
```

Restore outbound network access or migrate to locally hosted font files.

### Lint Passes but Build Fails

`npm run build` also runs TypeScript and route generation. Run both commands:

```bash
npm run lint
npm run build
```

### Build Passes but Runtime Fails

Build success does not validate provider credentials or external connectivity.
Check Vercel runtime logs and each provider's dashboard.

## Direct Voice Synthesis Errors

`/api/voice/synthesize` is not used by the current UI.

If you call it:

- Set `ELEVENLABS_API_KEY`.
- Send non-empty `text`.
- Use one of `dave`, `daniel`, `chris`, `rachel`, or `sarah`.
- Check ElevenLabs status, credits, and model availability.
- Add rate limiting before production use.
