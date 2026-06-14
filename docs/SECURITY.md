# Security

This document describes the current controls and the production hardening still
recommended for Bookified.

## Reporting a Vulnerability

<!-- TODO: Replace this placeholder with a monitored private security contact. -->

Do not publish secrets, user PDFs, private transcripts, or exploit details in a
public issue. Provide the affected route, impact, reproduction steps, and a
safe proof of concept through a private project channel.

## Authentication Security

Clerk is the identity provider.

`proxy.ts` protects all matched application routes except:

- `/sign-in(.*)`
- `/sign-up(.*)`
- `/api/vapi/search-book(.*)`

The Vapi webhook is public at the Clerk layer because Vapi is not a Clerk user.
It uses a separate shared secret.

Current positive controls:

- Book Server Actions call Clerk auth or server subscription resolution.
- Book reads and searches include `clerkId`.
- Blob cleanup validates user-scoped path prefixes.
- Session ending matches both session ID and Clerk user ID.
- Book details are fetched by both slug and Clerk user ID.

Important hardening:

- `startVoiceSession(bookId)` should verify that the book belongs to the current
  user before creating a session.
- `/api/voice/synthesize` currently relies on proxy protection. Add an explicit
  route-level Clerk check for defense in depth before expanding its use.
- New Server Actions must authenticate internally because action endpoints can
  be invoked directly.

## Authorization and Data Isolation

MongoDB documents use the Clerk user ID as the ownership boundary.

- `Book.clerkId` owns book metadata.
- `BookSegment.clerkId` scopes search results.
- `VoiceSession.clerkId` owns session metadata.
- `BookQuotaLock._id` serializes one user's quota checks.

Never accept a browser-supplied Clerk user ID as authority. Derive it from
Clerk on the server.

Return DTOs rather than raw Mongoose documents. The current persistence layer
selects and serializes only fields needed by the UI.

## Environment Variable Security

Server-only secrets:

- `CLERK_SECRET_KEY`
- `MONGODB_URI`
- `BLOB_READ_WRITE_TOKEN`
- `VAPI_WEBHOOK_SECRET`
- `ELEVENLABS_API_KEY`

Public build-time configuration:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Clerk route variables
- `NEXT_PUBLIC_VAPI_API_KEY`
- `NEXT_PUBLIC_ASSISTANT_ID`

Only a Vapi key specifically intended for browser use belongs in
`NEXT_PUBLIC_VAPI_API_KEY`.

Operational requirements:

- Use separate credentials for development, preview, and production.
- Restrict who can read or edit production variables.
- Rotate leaked or former-employee credentials.
- Never log full connection strings or tokens.
- Redeploy after changing public variables.

## File Upload Security

Current controls:

- Clerk authentication before issuing a Blob upload token
- User-scoped path prefix
- Allowed content-type list
- 50 MB PDF limit
- 10 MB cover limit
- Random suffixes
- Overwrite disabled
- Client and server validation
- Cleanup after partial failure

Remaining risks:

- MIME type and extension checks do not verify file signatures.
- PDFs are not scanned for malware.
- Complex PDFs can consume significant browser CPU or memory.
- PDF parsing does not currently limit page count or decompressed complexity.
- Generated canvas content is trusted only as an upload source, not executable
  content.

Recommended hardening:

- Verify file magic bytes.
- Add malware scanning or a quarantine workflow.
- Add page-count and parsing-time limits.
- Add per-user upload rate and storage quotas.
- Consider background processing for untrusted documents.
- Reject password-protected or malformed PDFs with a clear error.

## Blob Storage Security

The current code uploads PDFs and covers with:

```ts
access: "public"
```

Anyone with a Blob URL can retrieve the file. Authentication controls library
discovery but does not make the stored PDF private.

Before storing sensitive or licensed documents:

- Confirm public Blob access matches product requirements.
- Consider private storage or authenticated download URLs.
- Define data retention and account-deletion procedures.
- Add a user-facing book deletion workflow that removes metadata, segments,
  sessions as appropriate, and Blob assets.
- Monitor orphaned objects after cleanup failures.
- Apply provider-level budget and usage alerts.

Never expose `BLOB_READ_WRITE_TOKEN` to the browser.

## PDF Content and Prompt Injection

Book text is untrusted user-supplied content. The browser Vapi flow explicitly
tells the assistant to treat retrieved excerpts as source material, not
instructions.

Maintain that separation when editing prompts:

- Do not allow book text to override system behavior.
- Delimit excerpts from instructions.
- Ask the model to state when evidence is insufficient.
- Limit retrieved content size.
- Avoid placing provider secrets or hidden policy text in prompts that can be
  repeated to the user.

## Vapi Webhook Security

`/api/vapi/search-book`:

- Requires `VAPI_WEBHOOK_SECRET` in production.
- Accepts Bearer or `x-vapi-secret` authentication.
- Uses `timingSafeEqual`.
- Validates the body with Zod.
- Limits requests to 50 tool calls.
- Processes at most five calls concurrently.
- Resolves ownership from a stored voice session.
- Rejects a book ID that does not match the session.

Recommended additions:

- Rate limit by provider, IP, call ID, and session ID.
- Add replay protection using timestamped signatures if Vapi supports them.
- Log request IDs without logging full book excerpts.
- Rotate the webhook secret periodically.
- Restrict request body size at the platform or application layer.

## API and Server Action Security

Treat Route Handlers and Server Actions as public network entry points.

For every new entry point:

1. Authenticate the caller.
2. Authorize access to the specific resource.
3. Validate all input.
4. Limit input size and work.
5. Return only required data.
6. Avoid leaking provider errors.
7. Add rate limiting for expensive operations.
8. Make retries and cleanup safe.

The Server Action body limit is 100 MB, but this is not a business-rule
validation. Keep endpoint-specific limits lower.

## Rate Limiting Recommendations

No application-level rate limiter is currently configured.

Prioritize:

| Operation | Suggested key |
| --- | --- |
| `/api/upload` token generation | Clerk user ID and IP |
| Book duplicate and persistence actions | Clerk user ID |
| `startVoiceSession` | Clerk user ID |
| `searchBookContent` | Clerk user ID, book ID, and session |
| `/api/vapi/search-book` | Secret identity, call/session ID, and IP |
| `/api/voice/synthesize` | Clerk user ID and IP |

Use short burst limits plus longer daily or monthly quotas. Rate-limit failures
should be observable and should not reveal whether another user's resource
exists.

## User Data Handling

Stored data includes:

- Clerk user ID
- Book title, author, selected persona, file size, and Blob URLs
- Extracted book text segments
- Voice session timestamps, duration, book ID, and billing period

Current browser transcripts are held in React state and are not persisted by
the application.

Production requirements:

- Publish a privacy policy and retention policy.
- Document which third parties process audio and text.
- Obtain any consent required for voice processing.
- Provide account and book deletion procedures.
- Minimize log retention and redact user content.
- Back up and restore data according to product requirements.
- Avoid using uploaded books or voice data for unrelated purposes without
  explicit authorization.

## Dependency and Build Security

- Review dependency updates and lockfile changes.
- Run `npm run lint` and `npm run build`.
- Monitor advisories for Next.js, Clerk, Vapi, PDF.js, Mongoose, and Vercel
  Blob.
- Read the installed Next.js documentation before framework changes.
- Consider a Content Security Policy.
- Self-host fonts if deterministic, network-independent builds are required.

## Production Security Checklist

- Production Clerk keys are active.
- MongoDB credentials are unique and least-privileged.
- Atlas network access is reviewed.
- Blob token is server-only.
- Public PDF storage is an explicit product decision.
- Vapi browser key is public-scoped.
- Vapi webhook secret is configured and tested.
- ElevenLabs key is present only if the direct route is used.
- Rate limiting is implemented for paid and resource-heavy endpoints.
- Provider usage alerts and budgets are configured.
- Logs do not contain secrets or full private documents.
- Incident response and secret rotation owners are defined.
