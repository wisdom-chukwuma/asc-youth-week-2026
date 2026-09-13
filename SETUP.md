# Worship The King — Setup & Deploy

10-15 minutes, no coding needed. Two parts: Firebase (the live backend) and hosting (the link you'll share).

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it (e.g. `asc-youth-week-2026`) → skip Google Analytics (not needed) → Create.
2. **Authentication**: left sidebar → Build → Authentication → Get started → Sign-in method tab → enable **Anonymous** → Save.
3. **Firestore Database**: Build → Firestore Database → Create database → Start in **production mode** → pick a location close to Nigeria (e.g. `eur3` or `europe-west1`) → Enable.
   - Go to the **Rules** tab → delete the default contents → paste in everything from `firestore.rules` in this folder → Publish.
4. **Storage**: Build → Storage → Get started → production mode → same location → Done.
   - Go to the **Rules** tab → paste in everything from `storage.rules` → Publish.
5. **Get your web app config**: click the gear icon (top left, next to Project Overview) → Project settings → scroll to "Your apps" → click the `</>` (web) icon → register an app (any nickname, no hosting checkbox needed) → copy the `firebaseConfig` object it shows you.
6. Open `js/firebase-config.js` in this folder and paste your real values over the `PASTE_...` placeholders at the top.

## 2. Put it online

Simplest option — no installs, drag and drop:

1. Go to https://app.netlify.com/drop
2. Drag the whole `app` folder (this folder) onto the page.
3. It gives you a live link in seconds, e.g. `https://random-name-123.netlify.app`.
4. Optional: click "Site configuration" → "Change site name" to get a nicer link like `https://asc-youth-week.netlify.app`.

That link is what you share on WhatsApp/Instagram — anyone can open it on their phone. It's also installable as a real app icon (see part 4 below) — still no login.

(Alternative if you prefer: Firebase Hosting via the `firebase` CLI, or Vercel/GitHub Pages — any static host works, the app is just HTML/CSS/JS.)

## 3. Test it before sharing widely

- Open the link on your own phone, enter a nickname, confirm your squad shows up.
- Check in (the button only activates inside each day's time window — see below).
- Post a photo, post a shoutout, vote on the poll — confirm they show up when you open the link on a second phone/incognito tab.

## 4. Install it like a real app (PWA)

Already built in, nothing to configure — it just works once the site is deployed:

- **Android (Chrome)**: after a couple of visits, Chrome offers "Add to Home Screen" automatically, or menu (⋮) → **Install app**.
- **iPhone (Safari)**: open the link in Safari → tap the **Share** icon → **Add to Home Screen**. (iOS doesn't support the automatic prompt Android has — this manual step is the only way, and it only works from Safari, not Chrome-on-iOS.)

Once installed, it opens full-screen with its own crown icon — no browser bar, feels like a real app. It also keeps working (reading cached schedule/theme) with a weak or dropped signal, since the shell is cached on-device.

## 5. Turn on push notifications ("starts in 30 min" reminders)

This part is optional and takes ~20 minutes — the app works fully without it (skip to "Things worth knowing" if you'd rather not bother). If you want real reminders that reach people even with the app closed, here's the setup:

**A. Get your Web Push key**
1. Firebase console → gear icon → Project settings → **Cloud Messaging** tab.
2. Under "Web configuration" → **Web Push certificates** → **Generate key pair**.
3. Copy the key it shows you.
4. Open `js/notifications.js` and paste it over `PASTE_VAPID_KEY_HERE`.

**B. Deploy the reminder functions** (one-time; needs Node.js, already confirmed installed):

Open a terminal in this `app` folder and run, one at a time:

```
npx firebase-tools login
```
(opens your browser — sign in with the same Google account as the Firebase project)

```
cd functions
npm install
cd ..
npx firebase-tools deploy --only functions
```

The first deploy may prompt you to enable a couple of Google Cloud APIs (Cloud Scheduler, Cloud Build, Eventarc) — say yes to each, it's automatic and still within the free tier for this scale of usage. This deploys 7 scheduled reminders (one per session, two on Saturday), each firing 30 minutes before its session start, matched exactly to the flyer's times.

**C. Re-deploy the web app** (so the notification button + updated key go live):
Push the change to GitHub (`git add -A && git commit -m "add push key" && git push`) — Netlify picks it up automatically.

**D. Test it**: open the live site, go to Home, tap "Get notified before each session," allow the browser permission prompt. You won't see a real notification until 30 minutes before an actual session — that's expected, the schedule is exact.

## Things worth knowing

- **Check-in windows**: the "I'm here" button unlocks 30 minutes before a day's first session and locks 30 minutes after the last one ends, based on each phone's own clock. It's an honor system — no leader code needed. If you'd rather gate it with a code announced live each day, that's a small change to `updateCheckinButton()` in `js/app.js` — ask and I'll wire it in.
- **Editing schedule/theme/points**: everything content-related lives in `js/data.js` — squad names/colors, point values, daily poll & reflection questions, and the schedule itself (in case a time changes).
- **Squads**: assigned automatically and deterministically per device (no coordination needed) — Crown, Throne, Altar, Sanctuary.
- **Security model**: anyone can open the link and participate (Anonymous Auth = a device identity, not a real account). Firestore rules stop people from editing *other* people's scores or check-ins, but a technically motivated person could still inflate their own — deliberate trade-off for a zero-login youth week app, not a banking app. Good enough for this context.
- **Costs**: the project is on Firebase's Blaze (pay-as-you-go) plan — required now for Storage — but keeps the same free monthly quota Spark had. A single church youth week's worth of reads/writes/photo storage/function calls stays well inside that free quota; realistically $0.
- **PWA**: installable app icon + offline shell caching, covered in part 4 above.
- **Push notifications**: optional, covered in part 5 above — 7 scheduled reminders, 30 minutes before each session.
