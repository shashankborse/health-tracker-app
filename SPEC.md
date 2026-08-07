# Personal Health & Fitness Tracker — Product Spec

**Owner:** Sir (solo build, personal use only)
**Status:** Finalised design — ready for execution
**Last updated:** 24 July 2026

---

## Problem Statement

There's no single affordable app that combines Whoop-style recovery/strain analytics, MyFitnessPal-style nutrition logging with locally relevant (Dublin/Ireland) food data, and an adaptive strength + running program in one place. Whoop requires proprietary hardware and a subscription; MyFitnessPal's food database is US-centric and its useful features are paywalled; neither offers a customisable progressive-overload engine. The user already owns a Fitbit (data flows into Google's health ecosystem) and wants to combine that existing data source with structured training and nutrition tracking, at effectively zero ongoing cost.

## Goals

1. Surface all Fitbit-sourced biometrics (steps, heart rate, HRV, sleep stages, respiratory rate, SpO2, skin temperature) in one dashboard, refreshed at least daily via a scheduled sync and again on-demand whenever the app is opened.
2. Produce an approximate daily readiness score (0–100, colour-banded) from real HRV/resting-HR/sleep/respiratory-rate data — reliable close to immediately by backfilling the user's existing ~1 month of Fitbit history on first connection, rather than waiting weeks after launch to accumulate a fresh baseline.
3. Track every workout set (weight, reps, RPE) and auto-apply next-session targets via a progressive-overload algorithm suited to a recomposition (muscle gain + fat loss) goal.
4. Log nutrition at meal level with accurate calories/macros/fibre, backed by food data realistic for where the user actually shops and eats (Dublin), including a no-beef/no-pork constraint.
5. Run indefinitely at **€0/month** at this (single-user) scale.

## Non-Goals

- **Multi-user accounts / full auth system** — single password gate only; not building for other users.
- **Whoop's hardware-dependent features** — ECG, blood pressure, blood-biomarker labs, menstrual cycle tracking, ambient continuous skin-temperature sensing. Fitbit's wearable doesn't capture these; out of scope permanently, not just for v1.
- **Native App Store distribution** — shipping as an installable web app (PWA, "Add to Home Screen") instead of a compiled iOS app, to avoid the $99/year Apple Developer Program cost.
- **Live/real-time heart-rate streaming** — the Fitbit/Google Health API is a periodic sync (roughly daily), not a live feed; dashboards reflect synced data, not the current instant.
- **Exact replication of Whoop's proprietary recovery formula** — Whoop doesn't publish its algorithm. This app builds its own transparent approximation from the same category of inputs, clearly labelled as an approximation.

## User Stories

**Health dashboard**
- As the user, I want to see my daily readiness score with the inputs that produced it, so I can trust the number instead of treating it as a black box.
- As the user, I want daily, weekly, and monthly trend views of steps, sleep, resting heart rate, and HRV, so I can spot patterns over time.
- As the user, I want a provisional-score indicator only if a historical baseline genuinely isn't available yet, so I know when to trust the readiness score.
- As the user, I want my roughly one month of existing Fitbit history pulled in on first connection, so the app doesn't start from zero and the readiness score can use a real baseline right away.
- As the user, I want weight entries that already exist in my Fitbit/Google Health data (e.g. from a connected smart scale) to show up automatically, so I don't have to manually log weight I've already recorded elsewhere.

**Workouts**
- As the user, I want an editable 4-day plan template (3 strength days covering all major body parts with limited equipment, 1 running day), so the structure adapts as my gym access or goals change.
- As the user, I want each set's weight and rep target pre-filled with the app's recommendation when I go to log it, so that if I hit the goal I can just confirm and move straight to the next exercise, only editing the values if I did something different.
- As the user, I want the app to auto-suggest my next session's weight/reps based on how the last one felt, so I don't have to manually programme progressive overload myself.
- As the user, I want to override any auto-applied suggestion, so the app never locks me into something that doesn't feel right.

**Nutrition**
- As the user, I want to log food at the meal level (breakfast/lunch/dinner/snack) with quantities, so my daily totals are accurate.
- As the user, I want to search a food database that actually includes Irish supermarket and restaurant items (even approximated), so logging isn't a guessing game with US-only data.
- As the user, I want to star/favourite any food item for one-tap "quick add" (starting with my daily staples — buttermilk, fibre vegetables — but extendable to anything), so tracking my gut-health habits and repeat foods doesn't add friction.
- As the user, I want to repeat a previous day's meal (e.g. "same as yesterday's lunch") in one action, so logging my quite repetitive routine meals doesn't mean re-entering the same items every time.
- As the user, I want a daily calorie/macro target that adjusts to my actual Fitbit-measured activity, not just a static formula, so the numbers stay realistic as my activity changes.

**Weight**
- As the user, I want to log body weight over time and see the trend, so I can track recomposition progress.
- As the user, I want a daily notification at 7:30am reminding me to log my weight, so I don't forget and my trend data stays consistent.

**Progress tracking**
- As the user, I want to log weekly body measurements (arms, chest, waist/stomach, hips, thighs), so I can see recomposition progress the scale alone won't show.
- As the user, I want to attach progress photos to each weekly measurement entry, so I can see how my body actually looks and changes over time, not just the numbers.
- As the user, I want those photos stored in my own Google Drive rather than the app's database, so I don't burn through limited free storage.
- As the user, I want to record a short video of myself performing an exercise, so I have a personal reference for checking my form over time, saved the same way as the progress photos.
- As the user, I want each exercise's card to show a tappable video that opens right there in the app, plus Log Data / View Progress / Record buttons, matching the layout I already like from another app I use.

**System**
- As the user, I want the whole thing to run for free indefinitely, so cost is never a reason to abandon it.
- As the user, I want updates to go live automatically when code is pushed to GitHub, so there's no manual deployment step.

## Requirements

### Must-Have (P0)

- **Infra**: Next.js app on Vercel (Hobby/free tier), Supabase (free tier) Postgres database, GitHub repo with auto-deploy on push to main. *Acceptance:* pushing a commit to GitHub results in a live update on the Vercel URL within minutes, with no manual step.
- **Auth**: Single shared password gate via Next.js middleware, password stored as a Vercel environment variable. *Acceptance:* app is inaccessible without the password; password is never present in source code or GitHub history.
- **Supabase keep-alive**: scheduled ping (e.g. Vercel Cron) to prevent the free Supabase project auto-pausing after 7 days of inactivity. *Acceptance:* project shows continuous activity in Supabase's dashboard, never enters "paused" state under normal use.
- **Weight logging**: log date, weight (kg), optional body-fat %, optional note; view trend over time. Also pulls existing weight (and body-fat %) entries from the Google Health API's `weight`/`body-fat` data types — confirmed available under the `googlehealth.health_metrics_and_measurements.readonly` scope, the same one used for HRV/resting-HR/respiratory-rate/SpO2/skin-temperature, no separate scope needed — so a smart-scale reading logged via Fitbit/Google shows up without manual entry. Where both a manual entry and a Google-sourced entry exist for the same day, the manual entry is treated as authoritative (it's a deliberate action); the Google-sourced value only fills in days with no manual entry. *Acceptance:* a logged entry appears immediately in the trend chart; a weight recorded via Fitbit/a connected scale appears in the trend without the user opening the app to type it in, and doesn't create a duplicate/conflicting point on a day the user also logged manually.
- **Daily weight-log reminder**: push notification at 7:30am prompting the user to log their weight, sent via the web app (Web Push, since this is a PWA rather than a native app). *Acceptance:* a notification arrives at 7:30am local time daily; tapping it opens directly to the weight-logging screen. *Technical note:* requires the app to be installed to the iPhone home screen and notification permission granted (iOS supports Web Push for home-screen PWAs from iOS 16.4 onward) — this is a hard prerequisite, not optional, for this feature to work at all on iPhone. Crucially, this install must happen through **Safari's** "Add to Home Screen," not Chrome's — Chrome for iOS still runs on Apple's WebKit engine even in the EU (Google hasn't exercised the DMA-permitted switch to its own Blink engine), but its own "Add to Home Screen" only creates a bookmark shortcut that reopens inside Chrome, without the standalone app shell or Web Push support that Safari's mechanism provides. Chrome can still be used to simply browse the site day-to-day, just not to install it as the notification-capable home-screen app.
- **Workout plan (editable template)**: a full 7-day weekly schedule — 3 strength days, 1 running day, 1 active-recovery day, and 2 rest days by default (see Appendix A for the starting blueprint) — each training day holding a list of exercises with target sets/reps, editable at any time. Each exercise in the library includes a reference link to an instructional video — either a YouTube link or a Google Drive link — and is presented as its own card on the day's session screen. *Acceptance:* user can add/remove/reorder exercises and days without needing a code change; opening a session shows one card per exercise; an exercise can be added to a plan without a video link set (its card shows a placeholder "add video" state instead), so seeding/editing the plan is never blocked on sourcing a link first — links get filled in later, in batches, through the same editable UI; rest and active-recovery days appear on the weekly schedule but require no logging. *UI reference:* each exercise card shows a tappable video thumbnail that opens in an in-app modal player (not a link out to YouTube), the exercise name, target reps, and a brief instruction with a "More" expansion, followed by three actions — **Log Data** (opens the rep-by-rep tally described below), **View Progress** (that exercise's history over time), and **Record** (the form-check recording feature below) — matching the layout of a reference app the user already uses and likes.
- **Warm-up and cool-down exercises (fully tracked)**: every training day's warm-up and cool-down routine is built from individual exercises, each treated exactly like a main lift — its own card, its own instructional video link, and its own log entry (reps, duration, or hold-time as appropriate; weight/RPE not needed for these). *Acceptance:* every warm-up and cool-down move appears as its own card with a video link, in the same session flow as the main exercises; logging a full session means logging warm-up items, main lifts, and cool-down items end to end, not a single blanket toggle.
- **Running progression program**: since the user has no prior running background, the running day starts at a beginner walk/jog interval structure (e.g. 20–30 minutes alternating 1-minute jog/1-minute walk) and advances toward continuous easy-paced running over time, using the same RPE-based advancement logic as the strength progressive-overload engine (RPE ≤7 → advance to the next phase, e.g. longer jog intervals or shorter walk intervals; RPE 8 → repeat the current phase; RPE ≥9 → hold or regress a phase, cross-checked against readiness score). *Acceptance:* the running day's plan shows a defined current phase (interval structure, or continuous duration/pace once reached) that updates automatically based on logged RPE after each run, starting from the beginner interval structure by default rather than assuming any existing running fitness.
- **Workout logging**: for strength days, log each set's exercise, weight, and RPE (1–10); reps are captured via a live rep-by-rep tally (one line per rep, with +/- controls to add a rep just completed or remove one that wasn't achievable), pre-filled to the recommended target rep count, so hitting the goal only requires confirming and moving to the next exercise, while falling short or exceeding it is a quick tap adjustment rather than retyping a number; for the running day, log distance, duration, and RPE. *Acceptance:* every set is individually stored and retrievable per session, including the final rep count reached via the tally; the logging screen shows the recommended weight and rep-tally pre-filled before any input, and a single confirm action saves the set unchanged when the target was met.
- **Offline-resilient workout logging**: sets/reps/RPE entered during a session are saved locally first (browser storage) and pushed to the server as connectivity allows, so a patchy gym wifi/signal moment doesn't lose a logged set. *Technical note:* iOS Safari does not support the Background Sync API (confirmed unsupported as of mid-2026 — Chromium-only), so unlike a native app, failed saves can't silently auto-retry the moment signal returns; the practical approach is queuing unsent sets locally and flushing the queue automatically the next time the app is opened or brought to the foreground. *Acceptance:* logging a set with no connectivity doesn't show an error or lose the data; reopening the app with connectivity restored syncs any queued sets without user intervention.
- **Progressive overload engine (auto-apply)**: after each session, computes the next week's suggested weight/reps for that exercise using both the actual reps completed (from the rep-by-rep tally, including any +/- adjustments made during the set) and RPE (target reps met/exceeded with RPE ≤7 → increase; target just met at RPE 8 → hold; reps missed or RPE ≥9 → hold/reduce, cross-checked against readiness score), automatically updates the plan, editable by the user afterward. *Acceptance:* a completed session's actual rep count and RPE together produce a visibly updated target for that exercise's next weekly occurrence.
- **Fitbit/Google Health sync**: OAuth2 connection to Google's Health API; a scheduled daily sync of steps, resting heart rate, HRV, respiratory rate, skin-temperature deviation, SpO2, and sleep stages, plus an on-demand refresh triggered every time the app is opened (subject to Google Health API rate limits). *Technical note:* the Google Cloud OAuth client requests three read-only scopes — `googlehealth.activity_and_fitness.readonly` (steps/activity), `googlehealth.health_metrics_and_measurements.readonly` (HRV, resting HR, respiratory rate, skin temperature, SpO2, weight, body-fat %), and `googlehealth.sleep.readonly` (sleep stages) — confirmed by registering the app in Google Cloud Console; no write scopes are requested since the app only ever reads Fitbit-sourced data. *Acceptance:* a full day's metrics appear in the dashboard within 24 hours of being recorded on the Fitbit device via the scheduled sync, and opening the app pulls the latest available data rather than showing a stale cached view.
- **Historical Fitbit data backfill**: on first successful Google Health connection, pull the user's full existing history rather than only data from that point forward — confirmed the API supports querying as far back as data exists, with no historical limitation, subject to a 90-day span per request (so a ~1 month backfill fits in a single request; longer history just needs pagination). Covers the same metrics as the daily sync, plus weight (see below). *Acceptance:* after connecting, the dashboards and trend views immediately show the weeks of pre-existing history rather than starting empty; the readiness score's baseline uses this backfilled data rather than waiting for new data to accumulate.
- **Readiness score**: computed daily from a rolling 30-day personal baseline (HRV 40%, resting HR 30%, sleep performance 20%, respiratory-rate stability 10%), 0–100, colour-banded. *Acceptance:* score and its component inputs are both visible on the same screen; the score is fully live (not provisional) as soon as the historical backfill has provided ~30 days of baseline data — the "provisional" flag only applies in the edge case where backfilled history is shorter than that (e.g. a newer Fitbit user).
- **Nutrition logging**: meal-level entries (breakfast/lunch/dinner/snack) against a local food database seeded from Open Food Facts (packaged/barcode items, free API), the UK CoFID dataset (generic foods, one-time import), and manually entered Irish/UK restaurant-chain items. *Acceptance:* logging a meal updates daily calorie/macro/fibre totals immediately.
- **Quick-add favourites**: any food item can be starred/favourited from search results for one-tap logging, not limited to a fixed list — buttermilk (~200ml, twice daily) and fibre vegetables (e.g. cucumber) are starred by default as the initial gut-health staples. *Acceptance:* starring an item adds it to a quick-add list; logging a starred item takes a single tap, no search required.
- **Repeat previous meal**: log a meal by copying a previous day's meal (e.g. "repeat yesterday's lunch") instead of re-entering each item, suited to a repetitive daily meal routine. *Acceptance:* selecting a past meal duplicates all its food items and quantities into today's log in one action, editable afterward.
- **Dietary constraint enforcement**: no beef or pork in any recommended or default food entries; chicken, fish, and vegetarian sources used instead. *Acceptance:* no seeded or recommended item contains beef/pork.
- **Nutrition targets**: daily calorie target computed from Mifflin-St Jeor as a fallback, superseded by Fitbit's actual daily calorie-burn figure once synced, minus a ~300–400 kcal recomposition deficit; protein ~1.8–2.2g/kg bodyweight, fat ~0.8g/kg, remainder as carbs, biased toward training days. *Acceptance:* target recalculates automatically as new weight and Fitbit data arrive.
- **Fibre/gut-health tracking**: daily fibre total (target ~30g) computed automatically from logged food categories. *Acceptance:* fibre total updates without any separate manual entry beyond normal food logging.
- **Automated backup to Google Drive**: Supabase's free tier has confirmed zero automated backups and no point-in-time recovery (that's a $25/month paid feature) — so instead, a scheduled job runs daily at ~2:00pm Europe/Dublin time (deliberately outside sleep-tracking hours and the usual workout windows), exporting every table — weight, workouts, nutrition, Fitbit history, measurements — to structured files uploaded into the same Google Drive connection already used for photos/videos. This is text/reference data only: no photos, recordings, or other binary media are ever stored in Supabase itself, only small text references pointing to the corresponding Drive files, keeping the database itself lean and cheap regardless of how much media accumulates in Drive. Restoring means running a documented, purpose-built restore script against the exported files to rebuild the tables in a Supabase project — this is a custom scripted process, not Supabase's own one-click restore button, since that specific feature only exists on the paid tier this approach is avoiding. *Acceptance:* a backup from today or yesterday always exists in Drive; the restore script can rebuild every table from the latest backup into a working Supabase database; no binary media ever appears in a Supabase table, confirmed by inspecting the schema itself.
- **Weekly body measurements & progress photos**: a weekly entry logging arm, chest, waist/stomach, hip, and thigh circumference (cm), with one or more progress photos attached (front/side/back suggested as the default poses, adjustable). Photos are uploaded straight to a dedicated folder in the user's own Google Drive rather than stored in Supabase — the app keeps only the Drive file reference/link, not the image itself, since Drive's free 15GB is both larger and free for longer than Supabase's 1GB free-tier storage or AWS S3's 12-month-limited free tier. *Acceptance:* a weekly entry stores all five measurements plus at least one photo; opening that entry later shows the measurements and loads the photos from Drive; measurement trends are viewable over time alongside the weight trend.
- **Exercise form-check recording ("Record")**: from any exercise's card, record a short video of yourself performing it via the phone camera, for personal reference on form over time — same storage approach as progress photos (uploaded to Google Drive, only the link stored in Supabase), attached to that specific exercise and session date so it's viewable from that exercise's "View Progress" history. *Technical note:* uses the browser's `MediaRecorder` API, confirmed supported in iOS Safari (since version 14.5) including inside an installed home-screen PWA; iOS only supports recording to `video/mp4`, unlike Chrome's default of `video/webm`, so the recording code must explicitly request the mp4 format. *Acceptance:* tapping Record, performing the set, and stopping the recording results in a video saved to Drive and linked to that exercise and date, retrievable later without leaving the app.

### Nice-to-Have (P1)

- **Barcode scanning for packaged food**: use the iPhone camera to scan a product's barcode and look it up directly against Open Food Facts (which is barcode-keyed), auto-filling the food log entry instead of a manual search. *Technical note:* iOS Safari doesn't support the native `BarcodeDetector` browser API (confirmed unsupported), so this needs a JS decoding library (e.g. zxing-js) reading frames from the camera via `getUserMedia`, which iOS Safari does support — a well-documented, workable pattern, just not a one-line built-in feature.
- Weekly workout-volume dashboard (sets × reps × weight per body part, trended over time).
- Correlation views (e.g. sleep vs. next-day readiness, nutrition vs. workout performance).
- Data export (CSV) for weight, workout, and nutrition history as a personal backup/safety net.
- "Plant diversity" gut-health metric (distinct whole-plant foods per week) as an optional secondary gut-health indicator alongside the simpler fibre/staple tracking.
- Automatic deletion of Drive backup files older than 7 days. Explicitly not critical — the user is fine accumulating backups indefinitely and clearing old ones manually now and then if this isn't built right away.

### Future Considerations (P2)

- LLM-based conversational coach ("Whoop Coach" equivalent) answering questions against the user's own historical data.
- Custom domain (currently deferred in favour of the free Vercel subdomain).
- Expansion to a proper multi-user auth system, only if ever needed beyond personal use.

## Open Questions

- **[Non-blocking — engineering]** Exact deficit size (300 vs. 400 kcal) and protein target (1.8 vs. 2.2 g/kg) within the stated ranges should be tuned after 2–3 weeks of real weight-trend data, rather than fixed permanently now.
- **[Non-blocking — engineering]** Legacy Fitbit Web API is being deprecated in September 2026; integration should be built directly against the new Google Health API to avoid near-term rework.
- **[Non-blocking — user]** Exercise instructional videos will be linked out to an existing source (e.g. YouTube) rather than hosted. Sourcing one reliable, equipment-appropriate video link per exercise is manual curation work, not something that can be automated — worth doing in batches as exercises are added to the plan rather than all upfront.
- **[Non-blocking — engineering]** Progress photos and exercise recordings use Google Drive's API with the narrow `drive.file` scope (the app can only see/manage files it creates itself, not the user's whole Drive) — this can be registered in the same Google Cloud project as the Google Health API, just as an additional API/scope enabled during that same setup step, rather than a second separate integration.
- **[Non-blocking — user]** Photo/video poses are assumed as front/side/back by default for the weekly progress entry — confirm or adjust if a different set of angles is preferred.
- **[Non-blocking — user]** The multi-function machine's exact model hasn't been confirmed yet, so cable-based exercises (Face Pulls in particular) are provisional. Once the model is shared, confirm it supports a cable pulley setup, or swap permanently to the Dumbbell Reverse Fly fallback already noted in Appendix A.
- **[Non-blocking — engineering]** Several main exercises (Barbell Bent-Over Row, Standing Barbell Overhead Press, Dumbbell Renegade Row, Dumbbell Walking Lunges, Hanging Knee Raises, Dumbbell Step-ups, Dumbbell Thrusters), the running day's beginner run-walk explainer, and every warm-up/stretch item across all four days are marked "video TBD" — this session's tools couldn't reach a working YouTube search or browser to verify real links. Suggested search terms are included inline where available; filling the rest in is a quick manual step (or can be retried with browser access), and can be done in batches rather than all at once since each is independent.

## Timeline / Phasing

No hard external deadline — pacing is up to the user, but a sensible build order given dependencies:

1. **Foundation**: GitHub repo, Supabase project (+ keep-alive cron), Vercel project, password-gated Next.js skeleton deployed end-to-end.
2. **Manual tracking core**: weight logging, workout plan template + session/set logging, seeded with the Appendix A starting blueprint (no smart features yet). The daily 7:30am weight-log push notification is explicitly deferred to Phase 6 — Web Push can't be verified end-to-end until the app is actually installed as a home-screen PWA, which is Phase 6's job.
3. **Google Health API integration**: register developer app, confirm granted scopes, build daily sync job, a one-time historical backfill (steps/HR/HRV/RHR/sleep/respiratory/SpO2/skin-temp/weight, as far back as exists), and raw-metric dashboards. Also covers all Google Drive-dependent work — weekly progress photos, exercise form-check recordings, and the daily Drive backup job — using the same OAuth client (app registration) as the Health API rather than standing up a second integration. *Technical note (confirmed live during backfill testing):* Drive access cannot share a single token/authorization with the Health scopes — `health.googleapis.com` rejects any access token whose scope set includes anything outside its own recognized scopes (a token also carrying `drive.file` got a 403 `DISALLOWED_OAUTH_SCOPES` on every Health API call). Drive therefore needs its own separate OAuth grant and its own stored token, requested only when Phase 3.7 actually needs it, rather than one combined authorization up front.
4. **Nutrition core**: food database seeding (Open Food Facts + CoFID import + manual restaurant entries), meal-level logging, quick-add staples.
5. **Smart features**: readiness-score engine (once baseline data exists), progressive-overload engine (strength and running), dynamic nutrition targets.
6. **Polish**: PWA installability, the deferred weight-log Web Push reminder, trend/correlation dashboards, CSV export.
7. **Design polish**: a holistic pass across every screen built in Phases 1–6, once all features exist — visual hierarchy, spacing/typography consistency, micro-interactions and transitions, and refining the iOS-native look (established in Phase 2) into something that reads as genuinely Apple-made rather than merely "styled like iOS." Deliberately last, not mixed into Phase 6, since it needs the full app surface to review holistically rather than polishing screens piecemeal as they're first built.

---

## Appendix B: Getting Started — Execution Checklist

The intent is to build everything in this spec before starting daily real-world use, rather than rolling features out gradually while already relying on the app day to day. That's fully achievable, with two caveats that are about data, not engineering — the readiness score will display but stay flagged "provisional" for the first 2–3 weeks until a real personal baseline exists, and the progressive-overload engine's first suggestion for each exercise is simply the Appendix A default (there's no prior session to adapt from yet), then it starts adjusting from each exercise's second occurrence onward. Everything else — dashboards, logging, nutrition, the plan itself — can be fully working from day one.

### Accounts to set up first (all free)

1. **GitHub** — github.com, for the code repository.
2. **Vercel** — vercel.com, sign up with the GitHub account (this links them for auto-deploy).
3. **Supabase** — supabase.com, sign up with the GitHub account.
4. **Google Cloud Console** — console.cloud.google.com, needed to register the Google Health API developer app (create an OAuth consent screen and OAuth client credentials, "Web application" type).
5. **A Claude subscription or Console account** — needed to log into Claude Code.

### Installing Claude Code

Two ways to work with Claude Code — pick whichever is more comfortable:

- **Terminal CLI:** macOS/Linux/WSL: `curl -fsSL https://claude.ai/install.sh | bash`; Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`. Then run `claude --version` to confirm, and `claude` on its own to log in on first use.
- **Claude Desktop app's "Code" tab:** if the Claude Desktop app is already installed (e.g. it's what Cowork runs in), no separate install is needed — just open the **Code** tab alongside Chat and Cowork, point it at the project folder, and work the same way (type prompts, review diffs, approve changes) without typing terminal commands. GitHub connects via the "+" connector button rather than typed `git` commands, and it auto-starts a dev server with a live preview. Requires a paid Claude plan (Pro/Max/Team/Enterprise); on Windows it needs Git for Windows installed once first (the app prompts for this).

### Step-by-step build flow

1. Create an empty GitHub repository, clone it locally.
2. `cd` into the repo folder and run `claude` to start a session there.
3. Copy this spec document into the repo root (e.g. as `SPEC.md`) so Claude Code can reference it directly, and open with something like: *"Read SPEC.md — start with Phase 1 of the Timeline / Phasing section: scaffold a Next.js app with a password-gated middleware, ready to deploy."*
4. In Vercel's dashboard, import the GitHub repo as a new project — it auto-detects Next.js. Add environment variables here (the shared password, Supabase keys, Google OAuth client ID/secret) rather than committing them to code.
5. Create the Supabase project, grab its connection URL and API keys, add them to both Vercel's environment variables and a local `.env.local` file (excluded from Git via `.gitignore`).
6. In Google Cloud Console, finish the OAuth consent screen and client credentials for the Google Health API, using the Vercel deployment's URL as the authorised redirect URI. While there, also enable the Google Drive API and add the narrow `drive.file` scope to the same OAuth client, so progress photos and exercise recordings can upload to Drive without a second separate integration. This is also when the blocking open question above (exact granted data scopes) gets resolved.
7. From here, work through the spec's existing Phase 2–6 order with Claude Code one phase at a time: describe the phase's goal (pulling straight from the Requirements section), review the changes Claude Code proposes, commit, and push — Vercel deploys automatically on every push, so there's no separate manual deploy step at any point.
8. After each phase lands, install the current build to the iPhone home screen via **Safari's** "Add to Home Screen" (not Chrome — see the technical note under the weight-reminder requirement) to test it as the real, notification-capable app rather than just a browser tab.
9. The still-open items (exercise video links, multi-function machine confirmation) can be filled in at any point in parallel — they don't block any phase of the build.

## Appendix A: Initial Workout Plan (Seed Content)

This is the starting plan to load into the app on first setup — the editable template requirement means all of this can be changed later, but it's the baseline rather than an empty plan.

### Weekly schedule

| Day | Session |
|---|---|
| Monday | Strength Workout A — Upper Body Focus |
| Tuesday | Active Recovery — light walking or mobility stretching |
| Wednesday | Strength Workout B — Lower Body Focus |
| Thursday | Rest Day (complete rest) |
| Friday | Strength Workout C — Full Body Focus |
| Saturday | Running Day — cardiovascular health |
| Sunday | Rest Day (complete rest) |

### Equipment on hand

Bench press bench, power rack, dumbbells, and a multi-function machine (exact model to be confirmed — treat any cable-based exercise below as provisional until confirmed the machine supports it).

The exercise selections below were revised from the original bodyweight/dumbbell-only draft now that a power rack and bench are available, favouring compound, multi-joint movements that recruit several muscle groups at once over simpler single-joint moves — e.g. Farmer's Carries (a fairly simple loaded-carry move) has been replaced with Dumbbell Thrusters (a squat-to-press combination that hits legs, glutes, shoulders, and core in one movement).

### Day 1: Strength Workout A (Upper Body Focus)

**Warm-up (5–8 min):**

- **Arm Circles** (forward and backward) — 15 reps each direction. *(video TBD)*
- **Band Pull-Aparts** (or light dumbbell external rotations if no band) — 15 reps. *(video TBD)*
- **Push-up to Downward Dog Stretch** — 8 reps. *(video TBD)*
- **Barbell Bench Press — light warm-up sets** (bar only or very light weight) — 2 sets × 10 reps. Same video as the main lift below.

3 sets of 8–12 reps per exercise, 60–90 seconds rest between sets.

- **Barbell Bench Press** — chest, shoulders, triceps. Video: "How To: Barbell Bench Press" — ScottHermanFitness — https://www.youtube.com/watch?v=rT7DgCr-3pg
- **Barbell Bent-Over Row** — upper back, biceps. Video: not yet verified — search "barbell bent over row form" on Jeff Nippard's or Athlean-X's channel.
- **Standing Barbell Overhead Press** — shoulders, triceps, core stability. Video: not yet verified — search "standing overhead press form" on Jeff Nippard's or Athlean-X's channel.
- **Pull-ups / Chin-ups** (assisted or negative-rep progression for a beginner) — back, biceps. Video: "Go From 0 to 10 Pull-Ups In A Row (FAST!)" — Jeremy Ethier — https://youtu.be/syS4M1G-rII (covers beginner progressions specifically)
- **Dumbbell Renegade Row** (replaces Plank Hold) — core, back, shoulders, stabilisers in one movement. Video: not yet verified — search "dumbbell renegade row form" on Jeremy Ethier's or Athlean-X's channel.

**Cool-down stretch (5–8 min):**

- **Doorway Chest Stretch** — 30 seconds per side. *(video TBD)*
- **Overhead Triceps Stretch** — 30 seconds per side. *(video TBD)*
- **Lat Stretch** (overhead reach, or hang from the rack's pull-up bar) — 30 second hold. *(video TBD)*
- **Cross-Body Shoulder Stretch** — 30 seconds per side. *(video TBD)*

### Day 2: Strength Workout B (Lower Body Focus)

**Warm-up (5–8 min):**

- **Bodyweight Squats** — 10–15 reps. *(video TBD)*
- **Leg Swings** (front-to-back and side-to-side) — 10 each direction per leg. *(video TBD)*
- **Bodyweight Walking Lunges** — 10 reps. *(video TBD)*
- **Hip Circles** — 10 each direction. *(video TBD)*
- **Barbell Back Squat — light warm-up sets** (bar only) — 2 sets × 10 reps. Same video as the main lift below.

3 sets of 8–12 reps per exercise, 60–90 seconds rest between sets.

- **Barbell Back Squat** — quads, glutes, core. Video: "How to Perform A Back Squat" — Squat University — https://www.youtube.com/watch?v=7v_V6xiA_AA
- **Barbell Romanian Deadlift** — hamstrings, glutes, lower back. Video: RDL section within "The ONLY Workout You Need For 2026 (Do This 3x/Week)" — Jeremy Ethier — https://youtu.be/n_YW24F5HGc (a multi-exercise video, not a single dedicated RDL tutorial — fine as a reference, worth skipping to the RDL segment)
- **Dumbbell Walking Lunges** — single-leg balance, hip strength. Video: not yet verified — search "dumbbell walking lunges form" on Jeremy Ethier's or Athlean-X's channel.
- **Barbell Hip Thrust** (bench-supported, replaces bodyweight Glute Bridge) — glutes, hamstrings, more loadable now a bench is available. Video: barbell hip thrust section within "The #1 Workout That BLEW UP My Glutes (3 Exercises)" — Jeremy Ethier — https://youtu.be/5r-liFTy64E
- **Hanging Knee Raises** (rack pull-up bar) — lower abdominals, grip. Video: not yet verified — search "hanging knee raises form" on Athlean-X's or Jeremy Ethier's channel.

**Cool-down stretch (5–8 min):**

- **Standing Quad Stretch** — 30 seconds per side. *(video TBD)*
- **Standing or Seated Hamstring Forward Fold** — 30 second hold. *(video TBD)*
- **Kneeling Hip-Flexor Stretch** — 30 seconds per side. *(video TBD)*
- **Figure-4 Glute/Piriformis Stretch** — 30 seconds per side. *(video TBD)*
- **Calf Stretch Against a Wall** — 30 seconds per side. *(video TBD)*

### Day 3: Strength Workout C (Full Body & Balance)

**Warm-up (5–8 min):**

- **Light Cardio** (jogging on the spot or jumping jacks) — 2–3 minutes. *(video TBD)*
- **Arm Circles** — 15 reps each direction. *(video TBD)*
- **Bodyweight Squats** — 10–15 reps. *(video TBD)*
- **Bodyweight Walking Lunges** — 10 reps. *(video TBD)*
- **Push-up to Downward Dog Stretch** — 8 reps. *(video TBD)*
- **Conventional Deadlift — light warm-up sets** (bar only) — 2 sets × 10 reps. Same video as the main lift below.

3 sets of 10 reps per exercise, 60–90 seconds rest between sets.

- **Conventional Barbell Deadlift** — the single biggest full-body, multi-muscle compound lift; posterior chain, grip, core. Video: "Your Deadlift Form Is Probably Wrong (Here's Why)" — Squat University — https://www.youtube.com/watch?v=5_zk8YURgxQ
- **Push-ups** (standard or incline against a bench) — chest, shoulders, triceps, core. Video: "How To Unlock Your Push Up Strength (In 5 Minutes)" — Jeremy Ethier — https://youtu.be/Z88Rl5bpnmI
- **Dumbbell Step-ups** (using the bench) — leg power, mimics daily climbing movement. Video: not yet verified — search "dumbbell step ups form" on Jeremy Ethier's or Athlean-X's channel.
- **Dumbbell Thrusters** (replaces Farmer's Carries) — squat-to-press combination hitting legs, glutes, shoulders, and core in one movement; more complex and multi-muscle than a loaded carry, same minimal equipment. Video: not yet verified — search "dumbbell thrusters form" on Jeremy Ethier's or Athlean-X's channel.
- **Face Pulls** (multi-function machine cable — provisional pending machine confirmation; fallback is Dumbbell Reverse Fly) — rear delts, upper back, shoulder health. Video: both movements demonstrated in "We Tested 17 Shoulder Exercises, These Are Best For Growth" — Jeremy Ethier — https://youtu.be/YcDxLXj2RKk

**Cool-down stretch (5–8 min):**

- **Hamstring Stretch** — 30 seconds per side. *(video TBD)*
- **Quad Stretch** — 30 seconds per side. *(video TBD)*
- **Kneeling Hip-Flexor Stretch** — 30 seconds per side. *(video TBD)*
- **Child's Pose or Knee-to-Chest** (lower back) — 30 second hold. *(video TBD)*
- **Chest/Shoulder Doorway Stretch** — 30 seconds per side. *(video TBD)*

### Day 4: Running Day (Cardiovascular Health) — beginner progression

No prior running background, so this starts at the beginner phase and advances via the running progression program (see requirements above) based on logged RPE. Effort and consistency matter more than speed or distance at the start.

**Warm-up (5 min):**

- **Brisk Walk** — 2–3 minutes. *(video TBD)*
- **Leg Swings** (front-to-back and side-to-side) — 10 each direction per leg. *(video TBD)*
- **High Knees** — 20 seconds. *(video TBD)*
- **Butt Kicks** — 20 seconds. *(video TBD)*
- **Ankle Circles** — 10 each direction per ankle. *(video TBD)*

- **Phase 1 (starting point):** 20–30 minutes alternating 1 minute jogging with 1 minute walking.
- **Phase 2 (progression target):** 30 minutes of continuous, easy-paced running, at a pace where holding a conversation is still possible.
- Further phases beyond this (e.g. building duration or introducing pace work) are added once Phase 2 is comfortably sustained, rather than fixed upfront.
- Video: not yet verified. Runna's own channel (youtube.com/@Runna) describes itself purely around running plans/coaching (5k/10k/marathon), which suggests it likely does cover beginner run-walk content, but this couldn't be confirmed by browsing its video library this session — worth checking directly, or search "couch to 5k week 1" as a well-established alternative format for this exact structure.

**Cool-down stretch (5–8 min):**

- **Walk** (heart rate recovery) — 3–5 minutes.
- **Calf Stretch** — 30 seconds per side. *(video TBD)*
- **Hamstring Stretch** — 30 seconds per side. *(video TBD)*
- **Quad Stretch** — 30 seconds per side. *(video TBD)*
- **Hip-Flexor Stretch** — 30 seconds per side. *(video TBD)*

### Guiding principles (apply across all sessions, not just day one)

- **Progressive overload is a long game** — weight/rep increases should compound over months, not be forced week to week.
- **Listen to the body** — if an exercise causes joint pain, swap it for a pain-free variation using the plan's editability rather than pushing through.
- **Sleep is part of training** — recovery and muscle growth happen during rest, which is exactly what the readiness score and rest/active-recovery days are there to protect.
