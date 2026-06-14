# API and Server Actions

Bookified uses React Server Actions for application operations and Next.js Route
Handlers for Blob uploads, Vapi webhooks, and optional speech synthesis.

## Result Conventions

Most book actions return:

```ts
type ActionResult<T> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: {
        message: string;
        code?: string;
      };
      data?: T;
      message?: string;
    };
```

Callers must check `success` before reading `data` or `error`.

Route Handler errors generally use:

```json
{
  "error": "Human-readable message"
}
```

Do not expose stack traces, provider credentials, or raw database errors to
clients.

## Book Server Actions

Source: `lib/actions/book.actions.ts`

### `getAllBooks(searchQuery?)`

Returns books owned by the signed-in Clerk user.

Input:

```ts
searchQuery?: string
```

The query is trimmed, limited to 100 characters, escaped for regular-expression
use, and matched case-insensitively against title or author.

Success data:

```ts
Array<{
  id: string;
  slug: string;
  title: string;
  author: string;
  coverURL: string;
}>
```

Errors include `UNAUTHORIZED` and `BOOK_FETCH_FAILED`.

### `getBookBySlug(slug)`

Returns one user-owned book and up to three initial segments.

Input:

```ts
slug: string
```

Success data:

```ts
{
  book: {
    id: string;
    slug: string;
    title: string;
    author: string;
    coverURL: string;
    fileURL: string;
    fileSize: number;
    totalSegments: number;
    persona?: string;
    createdAt?: string;
  };
  segments: Array<{
    id: string;
    content: string;
    segmentIndex: number;
    pageNumber?: number;
    wordCount: number;
  }>;
}
```

Errors include `UNAUTHORIZED`, `BOOK_NOT_FOUND`, and
`BOOK_DETAIL_FETCH_FAILED`.

### `searchBookContent(bookId, query)`

Runs a user-scoped MongoDB text search and returns the three highest-ranked
segment excerpts.

Inputs:

```ts
bookId: string
query: string
```

The query is trimmed and limited to 500 characters. Combined output is limited
to 9,000 characters.

Success data:

```ts
string
```

If no segment matches, the successful result is:

```text
No matching information was found in this book.
```

Errors include `UNAUTHORIZED`, `BOOK_SEARCH_INVALID`, and
`BOOK_CONTENT_SEARCH_FAILED`.

### `checkBookExists(title)`

Checks for a duplicate user/title slug and verifies the current plan's book
limit before an upload begins.

Input:

```ts
title: string
```

Success data:

```ts
{
  exists: boolean;
  book?: {
    id: string;
    slug: string;
    title: string;
    author: string;
  };
}
```

Errors include `UNAUTHORIZED`, `BOOK_LIMIT_REACHED`, and
`BOOK_DUPLICATE_CHECK_FAILED`.

This is an early user-experience check. The quota and duplicate checks are
repeated transactionally during persistence.

### `cleanupUploadedBookAssets(pathnames)`

Deletes uploaded Blob objects after a failed client workflow.

Input:

```ts
pathnames: string[]
```

Every pathname must start with the signed-in user's normalized
`books/<user>/` prefix.

Success data:

```ts
{
  requested: string[];
  deleted: string[];
  failed: string[];
}
```

Errors include `UNAUTHORIZED`, `UPLOAD_SCOPE_INVALID`, and
`BLOB_CLEANUP_PARTIAL`. A partial cleanup response may include the report in
`data`.

### `persistUploadedBook(payload)`

Validates Blob metadata, enforces the plan limit, creates the book, saves text
segments, and rolls back partial failures.

Input:

```ts
{
  book: {
    title: string;
    author: string;
    persona?: string;
    fileURL: string;
    fileBlobKey: string;
    coverURL: string;
    coverBlobKey?: string;
    fileSize: number;
  };
  segments: Array<{
    text: string;
    segmentIndex: number;
    pageNumber?: number;
    wordCount: number;
  }>;
  uploadedAssets: Array<{
    pathname: string;
    url: string;
  }>;
}
```

Success data:

```ts
{
  status: "created" | "already-exists";
  book: {
    id: string;
    slug: string;
    title: string;
    author: string;
  };
  cleanup?: {
    requested: string[];
    deleted: string[];
    failed: string[];
  };
}
```

Errors include:

- `UNAUTHORIZED`
- `UPLOAD_SCOPE_INVALID`
- `BOOK_UPLOAD_METADATA_INVALID`
- `BOOK_UPLOAD_METADATA_MISMATCH`
- `BOOK_SEGMENTS_EMPTY`
- `BOOK_LIMIT_REACHED`
- `BOOK_PERSISTENCE_FAILED`

Upload failures can include a `cleanup` report inside the error.

## Session Server Actions

Source: `lib/actions/session.action.ts`

### `startVoiceSession(bookId)`

Checks authentication and the monthly session quota, then creates a voice
session.

Input:

```ts
bookId: string
```

Success:

```ts
{
  success: true;
  sessionId: string;
  maxDurationMinutes: number;
}
```

Failure:

```ts
{
  success: false;
  error: string;
  errorCode?: "SESSION_LIMIT_REACHED";
}
```

The current implementation records the supplied `bookId` but does not
independently query the `Book` collection before creating the session. Callers
should continue to start sessions only from a user-owned book page. A future
hardening change should verify ownership in the action.

### `endVoiceSession(sessionId)`

Sets the end timestamp and computes duration for a session owned by the
signed-in Clerk user.

Input:

```ts
sessionId: string
```

Output:

```ts
{
  success: boolean;
}
```

This action intentionally returns a minimal result and logs operational errors
on the server.

## Route Handlers

### `POST /api/upload`

Source: `app/api/upload/route.ts`

Purpose: handle the Vercel Blob client-upload token exchange.

Authentication: required through Clerk proxy and checked again with `auth()`.

Request body: Vercel Blob's `HandleUploadBody`. Application code should call
`upload()` from `@vercel/blob/client` rather than construct this payload
manually.

Client upload example:

```ts
await upload(pathname, file, {
  access: "public",
  handleUploadUrl: "/api/upload",
  clientPayload: JSON.stringify({ kind: "pdf" }),
  contentType: "application/pdf",
});
```

Accepted client metadata:

```json
{
  "kind": "pdf"
}
```

or:

```json
{
  "kind": "cover"
}
```

Rules:

- Path must start with the current user's `books/<normalized-user-id>/`
  prefix.
- PDF maximum is 50 MB.
- Cover maximum is 10 MB.
- Covers accept JPEG, PNG, and WebP.
- Random suffixes are added.
- Overwrites are disabled.
- Blob access is public.

Errors:

| Status | Meaning |
| ---: | --- |
| `400` | Invalid JSON, metadata, or Blob upload preparation |
| `401` | No Clerk user |
| `403` | Missing/unsupported kind or invalid user path |
| `500` | Blob token is not configured |

### `POST /api/vapi/search-book`

Source: `app/api/vapi/search-book/route.ts`

Purpose: server-side Vapi custom tool webhook for book retrieval.

Runtime: Node.js.

Authentication:

- `Authorization: Bearer <VAPI_WEBHOOK_SECRET>`, or
- `x-vapi-secret: <VAPI_WEBHOOK_SECRET>`

Secret comparison is timing-safe. Development permits requests when no secret
is configured. Production returns `503` if the secret is missing.

Example request:

```json
{
  "message": {
    "type": "tool-calls",
    "artifact": {
      "variableValues": {
        "voiceSessionId": "665f00000000000000000000"
      }
    },
    "toolCallList": [
      {
        "id": "tool-call-1",
        "name": "search_book",
        "arguments": {
          "bookId": "665e00000000000000000000",
          "query": "What motivates the main character?"
        }
      }
    ]
  }
}
```

The route accepts up to 50 tool calls and processes batches of five. It resolves
the authoritative `bookId` and `clerkId` from the stored voice session.

Success:

```json
{
  "results": [
    {
      "name": "search_book",
      "toolCallId": "tool-call-1",
      "result": "Matching book excerpts..."
    }
  ]
}
```

A valid request can return per-tool errors without changing the HTTP status:

```json
{
  "results": [
    {
      "name": "search_book",
      "toolCallId": "tool-call-1",
      "error": "A valid book ID is required."
    }
  ]
}
```

Top-level errors:

| Status | Meaning |
| ---: | --- |
| `400` | Invalid JSON or Vapi tool-call schema |
| `401` | Invalid secret or voice session |
| `503` | Production webhook secret is missing |

### `POST /api/voice/synthesize`

Source: `app/api/voice/synthesize/route.ts`

Purpose: optional direct ElevenLabs text-to-speech endpoint. It is not called by
the current user interface.

Authentication: protected by Clerk proxy. The handler itself does not perform a
second auth check.

Request:

```json
{
  "text": "Read this passage aloud.",
  "voiceId": "rachel"
}
```

Supported voice IDs:

```text
dave
daniel
chris
rachel
sarah
```

Success:

- Status `200`
- `Content-Type: audio/mpeg`
- `Cache-Control: no-store`
- Binary MP3 response body

Errors:

| Status | Meaning |
| ---: | --- |
| `400` | Invalid JSON, missing text/voice, or unsupported voice |
| `500` | `ELEVENLABS_API_KEY` is missing |
| Provider status | ElevenLabs rejected or failed the request |

## Error Code Guidance

- Use stable codes for client branching.
- Keep messages suitable for display to an end user.
- Log internal provider or database context on the server.
- Do not branch on human-readable messages when a code exists.
- Treat cleanup failures separately from the original upload failure.
