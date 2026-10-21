# Nenaivu AI — MVP interface prototype

Business-memory app: **Capture → Understand → Confirm → Remember → Follow Through → Recall.**

This is a functional **frontend prototype**. There is no backend and no AI. The app starts **empty**; everything you enter is saved in your browser's localStorage (`src/data/store.ts`), so it survives reloads but stays on that one browser and device. Settings → Delete all data clears it. Sample data used by unit tests lives in `src/test/fixtures.ts` and is not shipped.

## Run

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # typecheck + production build to dist/
npm run build:single   # one self-contained dist/index.html (used for the hosted preview)
npm test               # Vitest unit tests (i18n, preferences, mock Ask, voice state machine)
```

## Stack

React 19 + TypeScript, Vite, Tailwind CSS v4 (tokens in `src/index.css` `@theme`), shadcn/ui-style primitives built on Radix (Dialog, Dropdown, Slot), Lucide icons, React Router (hash router so the static build works anywhere — switch to `createBrowserRouter` behind a server with SPA fallback).

The shadcn CLI was not run (no registry access in the build environment); the equivalent primitives are hand-written in `src/components/ui/` with the same conventions (`cn`, `cva`, `asChild`).

## Structure

```
src/
  types/models.ts          Domain types: Capture, Proposal, Memory, Commitment, Person, ActivityEvent
  services/api.ts          NenaivuApi interface — the only contract the UI uses
  services/index.ts        Chooses the implementation (currently mockApi)
  services/mock/           MOCK: in-memory store, rule-based extractor, keyword "Ask"
  data/store.ts            Browser storage for your data (starts empty)
  test/fixtures.ts         Fictional sample data for unit tests only
  store/                   React context holding ONE workspace's data + selectors
  components/ui/           Button, Input/Textarea/Select/Field, Card, Dialog, Dropdown
  components/              AppSidebar, AppHeader, PageHeader, MetricCard, StatusBadge, MemoryCard,
                           CommitmentRow, SourceReference, ReviewProposalCard, EmptyState,
                           LoadingState, ErrorState, ConfirmationDialog, ActivityList, Toaster
  pages/                   Dashboard, Capture, review/ (Confirmation Inbox), Commitments, Memory,
                           Ask, People, Settings
```

## Trust rules — how they are enforced

| Rule | Where |
|---|---|
| Original capture is never edited | `Capture.content` stored verbatim; `SourceReference` renders it read-only, monospace, labelled "Original source" |
| Proposals ≠ records | Separate `Proposal` type/collection; records are only created in `approveProposal` |
| Rejection creates nothing | `rejectProposal` only changes proposal status and logs it |
| No invented deadlines | Extractor resolves only explicit dates / today / tomorrow / "within N days". Weekdays, "next week", "end of month", "soon" → `ambiguous`; Approve is blocked until the reviewer picks a date or "no due date" |
| No confidence percentages | Uncertainty is plain-language notes only |
| Workspace isolation | `loadWorkspace` returns one workspace; store clears data on switch; every mutation checks `workspaceId`; detail pages show "not in this workspace" for foreign ids |
| Ask is not AI | Keyword match over confirmed records; shows supporting records and terms nothing covers; "No supported answer" instead of guessing |
| Activity history | Capture, approve (incl. edited fields), reject (incl. reason), status and due-date changes |

## What is mocked

- Extraction (`mockExtractor.ts`) — regex/heuristics, labelled "simulated" in the UI.
- Persistence — browser localStorage only; no server, no sync between devices.
- File capture — `.txt/.md/.csv` ≤ 1 MB are read in the browser; nothing is uploaded. PDF/Word/images are rejected with a message.
- Voice capture — disabled, labelled "coming later".
- Auth, sign-out, notifications delivery, reminders — not implemented; UI says so.
- Settings → Prototype controls: toggle latency, force service failures, delete all data.

## Sign-in (mobile number + OTP)

- Screens: mobile number (India, +91) → 6-digit code → first-time profile (name, business). Language can be switched on every sign-in screen.
- `src/services/auth/` defines `AuthProvider`. The current provider is **test mode**: no SMS is sent, the code is always `123456`, and the screens say so. It is not secure.
- Each mobile number gets its own data on the device (`nenaivu.data.v1.<userId>` in localStorage). Signing out keeps the data; signing back in with the same number shows it again. Nothing syncs between devices yet.
- To go live, implement `AuthProvider` with a real SMS service (Firebase phone auth, MSG91, Twilio Verify) and swap it in `src/services/auth/index.ts`. Cross-device data needs a server database.

## Tamil localization

- **Dictionaries:** `src/i18n/messages/en.ts` is the source of keys; `ta.ts` is typed against it, so a missing key fails the build. Unit tests also check that every Tamil string keeps the English placeholders and tags.
- **API:** `useI18n()` returns `t(key, params)` (plurals via `_one`/`_other` and `Intl.PluralRules`), `tx()` for inline `<b>`/`<link>` tags, and `fmt` for locale-aware dates, relative times, numbers, lists and due-date labels.
- **Language ids:** `en`, `ta`. The choice is stored in `localStorage` (`nenaivu.lang`), defaults to English, applies instantly and sets `<html lang>`.
- **What is not translated:** captured sources, record titles and summaries, names, and past Ask answers. The service returns codes (activity events, uncertainty notes, date reasons, errors, capture channels), and the UI renders those in the current language.
- **Font:** Noto Sans Tamil is bundled and falls back to Nirmala UI, Tamil Sangam MN and Latha.

## Voice in Ask Nenaivu

- **Speech to text:** `src/services/speech/browserSpeechToText.ts` uses the Web Speech API. Users pick English (India) or Tamil (India). "Auto-detect" appears but stays disabled, because browser recognition can't detect the spoken language. The transcript goes into the editable message box and is sent through the normal typed-chat path.
  - Voice input has six states: idle, requesting permission, listening, processing, transcript ready, and error.
  - Errors covered: unsupported browser, permission denied, no speech, language unsupported, network failure, and no microphone.
  - A one-time disclosure explains that Chrome and Edge send audio to the browser vendor's speech service. Nenaivu itself stores no audio.
- **Text to speech:** `browserTextToSpeech.ts` waits for voices that load asynchronously and splits long text into chunks.
  - It prefers an exact `ta-IN`/`en-IN` voice, falls back to another voice in the same language, and otherwise tells the user no voice was found.
  - Only one answer plays at a time, and playback stops when you leave the page.
- **Answer language** is a separate setting from the interface language: follow the question, English, or Tamil. It is passed to the service as `AskInput.responseLanguage`. The mock (`mockAsk.ts`) answers from fixed English and Tamil templates and a small Tamil keyword glossary.
- **Swapping providers:** `src/services/speech/index.ts` chooses the providers. Replace them with server-backed speech-to-text and text-to-speech services; API keys must stay on the server.

## Next backend integration steps

1. **Auth & tenancy** — real users, workspace membership; enforce workspace scoping server-side (row-level security), not just in the client.
2. **HTTP `NenaivuApi`** — implement the interface in `services/api.ts` against REST/RPC; swap in `services/index.ts`. Consider TanStack Query for caching.
3. **Capture storage** — immutable capture table + object storage for files; virus scan; server-side text extraction for PDF/DOCX.
4. **Extraction service** — LLM call returning the `Proposal` shape with `sourceExcerpt` spans and uncertainty notes; keep the ambiguous-date contract (server must reject approval of unresolved dates, as the mock does).
5. **Duplicate detection** — embeddings/fuzzy match against open commitments and contacts.
6. **Reminders** — scheduler that only fires for commitments with a human-confirmed `dueDate`.
7. **Ask** — retrieval over confirmed records only, answers must cite record ids; return "unsupported" when retrieval is empty.
8. **Audit log** — persist `ActivityEvent` server-side, append-only.
