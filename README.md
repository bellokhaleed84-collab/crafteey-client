# Crafteey Client App

The customer-facing app in the Crafteey system. See
`crafteey-client-app-context.md` (shared separately) for the full product
spec and dispatch model.

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in:
   - The same Firebase project values as `fixteq-technicians-portal` and
     `fixteq-admin-portal`
   - The same `MONGODB_URI` as the other two apps
   - Your Cloudinary credentials (cloud name, API key, API secret)
   - `NEXT_PUBLIC_SUPPORT_HOTLINE` — the number shown to clients while a
     job is pending
3. `npm run dev`

## ⚠️ Important: the Job schema is shared across all three apps

`src/models/Job.ts` in this repo must stay in sync with the `Job` model
used by `fixteq-admin-portal` (for dispatch) and `fixteq-technicians-portal`
(for on-the-way/arrival/completion). These are three separate repos, so
there's no shared package enforcing this — if you add a field to the Job
schema in one app, add it in all three, or reads/writes will silently
drop data in whichever app doesn't know about the new field.

## What's built so far

- Firebase Auth signup/login (single step — clients aren't vetted like
  technicians)
- Post a job: single-select trade toggle, description, area (text, no
  map), photo/video upload via signed direct-to-Cloudinary upload
- Job list + job detail page with status-specific UI:
  - **Pending** — hotline fallback
  - **Dispatched / On the way** — technician contact reveal, QR code
    display once "on the way"
  - **Arrived / Completed / Cancelled** — final states

## Not built yet (depends on the admin + technician apps)

- The QR code currently just displays `job.qrToken` — nothing generates
  or validates that token yet, since the admin dispatch screen and the
  technician app's QR scanner don't exist yet. Once those are built, the
  full loop (dispatch → on the way → scan → arrived) becomes testable
  end-to-end.
- Job cancellation while pending (schema supports a `cancelled` status,
  no UI or API route for it yet)
- Ratings/reviews (flagged as possible v1.1, not committed)
- Payment integration (not scoped yet)
