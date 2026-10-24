# Design decisions

Decisions taken while building the Ferrocine UI, with their rationale. The core's
`DECISIONS.md` covers the server side (OIDC, transcoding, storage). The API contract is the
core's `docs/api.md`, copied here as [docs/api.md](docs/api.md); keep the copy in sync when the
core changes it. Entries marked ⚠️ are the ones most worth reviewing.

## Scope and architecture

### D1. A separate project, served by nginx in front of the core ⚠️

- **Choice.** The UI is its own repository and image: static files built by Vite, served by a
  Docker Hardened nginx that also reverse-proxies `/api/`, `/auth/`, `/healthz` and `/readyz` to
  the core (`FERROCINE_UPSTREAM`).
- **Why.** Sign-in is a cookie session set by the core, and the API checks same-origin requests,
  so UI and API must share one origin. A proxy in the UI image gives that without the core
  having to serve files, and lets the UI be released on its own rhythm.
- **Cost.** One more hop for media bytes. nginx streams them (`proxy_buffering off` on
  `/api/v1/hls/` and `/api/v1/items/{id}/stream`), so it adds no disk or memory buffering.
- _Alternative._ The core serving `dist/` itself (it can, optionally): one container fewer,
  but UI changes then need a core release.

### D2. Stack: React 19, Vite 8, TypeScript, hls.js; nothing else at run time

- `tsc` 7 for typechecking, with TypeScript 6 aliased for
  typescript-eslint; ESLint flat config; Prettier; `node --test` on TypeScript sources (type
  stripping, so the tested modules use erasable syntax only).
- **No component, router or data library.** A History API router (`src/router.ts`), a
  `useAsync` hook and hand-drawn SVG icons cover what the pages need.
- **hls.js, light build, loaded on demand.** Only HLS playback needs it, so it is a separate
  chunk (115 kB gzipped) fetched when a remux or transcode starts. The light build leaves out
  subtitles, alternate audio and DRM, which Ferrocine does not use: subtitles are WebVTT
  tracks, audio tracks are chosen server side (D6).

### D3. Rust (WebAssembly) was not chosen for the UI

A Rust front end (Leptos, Yew, Dioxus) would share types with the core, but the player is
mostly glue around browser APIs (MSE, hls.js, the media element, fullscreen) where TypeScript
is the native language, and the WASM bundle would be larger than this one. The API types are
written by hand from `docs/api.md` instead.

## Player

### D4. The client declares capabilities; the core decides

`POST /playback` sends what the browser can decode, probed with `MediaSource.isTypeSupported`
(what hls.js needs) and `canPlayType`: H.264, HEVC, VP9 and AV1; AAC, MP3, Opus, FLAC, Vorbis,
AC-3 and E-AC-3; `mp4` when H.264 plays, `webm` when VP9 or Opus does. The core picks direct
play, remux or transcode and says why (`reasons`, shown in the info panel, key `i`). Probing
rather than user-agent sniffing follows the browser's real abilities, e.g. HEVC on Safari or on
Chrome with hardware support.

### D5. One timeline across sessions ⚠️

- **How the core streams.** An HLS stream starts where asked (`start_ms`) and grows as ffmpeg
  produces it (EVENT playlist). Stream time 0 is item time `start_ms`.
- **What the UI shows.** The control bar always shows the whole item: item time =
  `start_ms` + `currentTime`. The part already produced is drawn on the seek bar.
- **Seeking** (`planSeek`, unit-tested): direct play seeks in the file. In HLS, a target inside
  the produced range (minus 2 s, to avoid a segment still being written) seeks in the stream;
  any other target stops the session and starts a new one there. Dragging only previews;
  the seek happens on release, so dragging does not start a transcode at every step.
- **Why.** Seeking past what ffmpeg has produced would stall until it got there. Restarting
  ffmpeg at the target is what makes "jump to 1:30:00" quick.
- **hls.js settings.** `startPosition: 0` (an EVENT playlist otherwise starts at its "live
  edge") and no catching up with the live edge, which would skip content when playback falls
  behind.

### D6. Track and quality changes start a new session

Changing the audio track or the quality requests a new playback at the current position, with
`audio_index` or `max_height`/`max_bitrate` (Original, 1080p 8 Mb/s, 720p 4 Mb/s, 480p
1.5 Mb/s). The core then remuxes or transcodes with that track or limit. Text subtitles are
fetched as WebVTT, shifted to the stream's start (`?start_ms=`), and added as a `<track>`
through a blob URL; image subtitles (PGS, VobSub) are listed as unsupported in the details
page and left out of the menu.

### D7. Sessions are released, positions are saved

- Positions are saved every 10 s while playing, at once on pause and at the end (the duration,
  so the core marks the item played), and on leaving.
- Leaving (closing the player, navigating away, `pagehide`) stops the HLS session with a
  `keepalive` request, so ffmpeg stops at once rather than after the core's 60 s idle timeout.
  Requests superseded by a newer seek have their session stopped as soon as they answer.
- The player is an imperative controller (`src/player/controller.ts`) that React renders:
  media events, hls.js and the session lifecycle do not fit React's render cycle, and an
  "epoch" counter makes every superseded start (including React's development double mount)
  harmless.

### D7b. Lost segments and sessions restart where the user is

The core bounds what a session keeps: segments more than 30 minutes behind the furthest one
requested are deleted, ffmpeg pauses about 3 minutes ahead, and a session without requests for
60 s is stopped. The player treats all three alike, as a seek outside the stream:

- a fatal hls.js network error (a 404 on a pruned segment or on the playlist of a stopped
  session, after one retry) starts a new session at the playhead, at most 3 times in a row
  without playback resuming, then shows the error;
- resuming after a pause of more than 45 s (`sessionLikelyExpired`, unit-tested) starts a new
  session at once instead of waiting for the 404.

`POST /playback` answers once the first segment exists, so the spinner covers the wait;
503 (too many streams) and 500 (could not start) get readable messages and a retry button.

### D7c. Subtitle search in the player, hidden when the server has no provider

- **Where.** "Search subtitles…" ends the player's subtitle menu: the need shows up while
  watching. A dialog searches in one language (default: the first browser language
  OpenSubtitles knows, else English; "Server defaults" sends no language) and lists results with
  badges (Matches file, HI, Forced, Machine). A download adds the track to the menu, selects it
  and shows a short confirmation; a 429 shows the core's quota message in the dialog.
- **Discovery by 503.** No endpoint says whether a provider is configured, so the entry is shown
  until a search (or download) answers `503`; it then disappears for the rest of that player
  session, with a short notice. One wasted click per playback on servers without a provider,
  instead of an extra request on every playback.
- **Removal is an admin action on the item page** (media information, "Remove" next to
  downloaded tracks, with a confirmation), not in the player.
- Keyboard: while the dialog is open the player's shortcuts are off and Escape closes the dialog
  only. Space and Enter on any focused player button now press the button instead of toggling
  playback.

### D7d. Ratings badges, title logos and external links

Per-source ratings are small badges in a fixed order (TMDB, IMDb, RT, Metacritic, AniList,
AniDB): 0–100 scores read as percentages for Rotten Tomatoes and AniList, as plain scores for
Metacritic, and /10 scores as numbers; the single "★" score shows only when there are none. A
title logo replaces the text title (which stays its `alt` text, and comes back if the image
fails), at most 120 px high. External links (TMDB, IMDb, TheTVDB, AniDB, AniList) open in a new
tab with `noopener noreferrer`; TMDB, TVDB and the anime sites only for movies and series. The
formatting is pure and unit-tested (`src/logic/ratings.ts`).

### D7e. Bitmap subtitles are burned in; chapters seek like any seek

- **Bitmap subtitles** (PGS, DVD; `text: false`, including the DVD streams from index 2000) are in
  the subtitle menu with "(burned in)". Choosing one starts a new session at the playhead with
  `burn_subtitle`; leaving it (Off, or a text subtitle) starts one without. Text subtitles still
  switch in the browser without a new session. `planSubtitle` (unit-tested) decides which.
- **Chapters**: ticks on the seek bar (the one at 0 left out) and a Chapters menu (with two or
  more chapters) whose entries seek exactly like the seek bar, so a chapter outside the produced
  HLS range starts a new session there. The item page lists them, collapsed.
- **Extras** are a row on the movie page whose cards start playing at once (resuming like any
  item); an extra's own page is the same item page with its type and a link back to the movie.

### D7f. Seek bar previews

Hovering (mouse), dragging (touch) or focusing (keyboard) the seek bar shows a box with the
trickplay frame, the chapter and the time. Frames are cut from the sheets with CSS
(`background-position`, scaled with `background-size`), so one immutable JPEG serves 100 frames;
a sheet is fetched only when a position in it is hovered, and the last frame stays on screen
until the next sheet has loaded, so the box never blinks empty. The box is `aria-hidden`: the
range input keeps its value text. The math is pure and tested (`src/logic/trickplay.ts`).

### D8. Next episode

At the end of an episode (and in its last 30 s), an "Up next" card offers the next episode:
the next one of the season, else the first of the next season (specials skipped). It does not
start by itself: autoplay is the kind of setting that would need a preference, which there is
none of yet.

## Security

### D9. Strict Content Security Policy

`default-src 'self'`, no inline script or style, `media-src`/`worker-src` with `blob:` (MSE
and hls.js's worker), `frame-ancestors 'none'`, plus `nosniff`, `Referrer-Policy: same-origin`
and `X-Frame-Options: DENY`. The only dynamic styles (progress widths, the produced range) are
set through the CSSOM by React, which the policy allows. No token ever reaches the page: the
session cookie is `HttpOnly` and set by the core.

### D10. Sign-in and CSRF follow the core

On a 401 (at load or later, when the session expires) the sign-in screen links to
`/auth/login?return_to=<current path>`; `return_to` is restricted to local paths. Sign-out is
a same-origin form POST to `/auth/logout`. All writes are same-origin `fetch` calls, which the
browser marks with `Sec-Fetch-Site: same-origin`, as the core requires.

### D10b. Account menu and avatar fallback

- **Avatar.** The header shows the provider's picture (`me.avatar`, served by the core) in a
  round button opening a two-entry menu (Profile, Log out; menu-button pattern: arrow keys,
  Home/End, Escape and outside click close). Search and administration keep their icons.
- **Fallback: initials on a derived colour.** Without a picture, or when it fails to load, the
  avatar shows one or two letters (first letters of the first and last words of the display
  name, else of the username without an e-mail domain; Unicode letters, so "Élodie" gives "É")
  on one of 8 colours chosen by an FNV-1a hash of the username (`src/logic/avatar.ts`,
  unit-tested). The same user gets the same colour on every device with nothing stored, and
  users of a household are told apart at a glance.
- **Palette.** Mid-dark colours: white initials have at least 5.5:1 contrast on each. Against
  the dark page a few are under 3:1, so the circle gets a faint light rim.
- **Profile page** (`/profile`): read-only (name, username, e-mail, role, groups). The
  identity provider owns these details; the core refreshes them at each sign-in, which the page
  says.

### D10c. Running configuration, read-only

The administration page shows `GET /api/v1/config` as the core describes it: one collapsible
block per section (open/closed remembered per browser, in `localStorage` guarded by try/catch)
with when its changes apply, then each setting with its value rendered by kind (On/Off, chips,
monospace for durations, paths, URLs and addresses, "not set"), its default when the value
differs, its description, and all alternatives of a choice with the active one marked (for the
database URL, the engine whose scheme prefixes it). It is read-only: the configuration is code,
edited in files and applied with "Reload configuration". The formatting rules are pure functions
(`src/logic/config.ts`, unit-tested).

### D10d. Theme choice per browser, applied before the first paint

- **Choice.** System (default), Light or Dark, from the account menu (radio menu items) or the
  profile page (a radio group); both read one store (`src/theme.ts`, `useSyncExternalStore`),
  which also follows other tabs (`storage` event) and, under System, the system setting live.
- **Per browser, not per user.** Stored in `localStorage` (`ferrocine.theme`, every access in
  try/catch; anything unknown means System). A phone and a TV may want different themes, and
  the server stays out of it.
- **CSS.** Light tokens on `:root`; dark tokens under
  `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }` and under
  `:root[data-theme='dark']`, each setting `color-scheme`, so form controls and scrollbars follow.
  The player is dark whatever the theme.
- **No flash.** `public/theme.js`, a few lines loaded in `<head>` before the stylesheet, sets
  `data-theme` before the first paint (the CSP forbids inline scripts; `'self'` allows this
  one). It is not hashed, so nginx serves it with `no-cache` like `index.html`. It repeats the
  parsing rule of `src/logic/theme.ts` (unit-tested) because it must run before any module.

## Image

### D11. Hardened nginx, rendered configuration

- **Base.** `dhi.io/nginx:1-alpine3.24` (nginx 1.31, user 65532), pinned by multi-arch index
  digest like the Node build image. The build stage runs on the build platform (the output is
  architecture independent).
- **Configuration from the environment.** The DHI image has no `envsubst` templates nor
  dynamic modules, so a small entrypoint validates `FERROCINE_UPSTREAM`
  (`http(s)://host[:port]`, nothing else, so it cannot inject configuration) and renders the
  template into `/tmp/nginx/`. Everything nginx writes is under `/tmp`, so a read-only root
  filesystem works.
- **Upstream by variable.** The core's name is resolved at request time (`resolver` from
  `/etc/resolv.conf`), so the UI starts before the core and follows it when its address changes;
  it answers 502 meanwhile.
- **Two workers.** `worker_processes auto` started one per CPU (32 on the test host) for a
  static site and a proxy.
- **Tested** on rootless Docker 29 with `--read-only --tmpfs /tmp --cap-drop ALL`: SPA
  fallback, headers and caching, method, query, `Range` and forwarded headers passed to a stub
  core, 502 without it, healthy. 16.6 MB image.

### D12. CI, release and updates

CI runs typecheck, lint, format check, unit tests, build, yamllint and a Docker build with a
smoke test (read-only, no capability, no core). Releases build amd64 and arm64 natively and
push `ghcr.io/sebastka/ferrocine-ui` with SBOM and provenance: `edge` and `sha-<commit>` from
`master`, and dated releases (`YYYY-MM-DD`, `.1`, `.2`… for further releases the same day,
and `latest`, with a Git tag and a GitHub release) when the workflow is run by hand, like the
server. Every image is signed with cosign
(keyless, by the release workflow's identity) and gets a build provenance attestation, both
verified before a release is created. Actions are pinned by SHA; Renovate (nightly, auto-merge of non-majors after 3
days) covers npm, the Dockerfile images, Actions and yamllint. The TypeScript aliases are
updated by hand, together with typescript-eslint.

## Not done yet

- End-to-end tests in this repository against a running core and a mock OIDC provider; only
  pure logic is unit-tested here so far. (The core's development stack has been walked
  through in headless Chromium: sign-in, browsing, and direct, remux and VA-API transcode
  playback.)
- Image subtitles (needs burn-in by the core), trick-play thumbnails on the seek bar,
  autoplay of the next episode, per-user preferences (default audio/subtitle language).
- Music and photo libraries (the core has movies and shows only).
