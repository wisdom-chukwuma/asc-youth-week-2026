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

That link is what you share on WhatsApp/Instagram — anyone can open it on their phone, no login, no app install.

(Alternative if you prefer: Firebase Hosting via the `firebase` CLI, or Vercel/GitHub Pages — any static host works, the app is just HTML/CSS/JS.)

## 3. Test it before sharing widely

- Open the link on your own phone, enter a nickname, confirm your squad shows up.
- Check in (the button only activates inside each day's time window — see below).
- Post a photo, post a shoutout, vote on the poll — confirm they show up when you open the link on a second phone/incognito tab.

## Things worth knowing

- **Check-in windows**: the "I'm here" button unlocks 30 minutes before a day's first session and locks 30 minutes after the last one ends, based on each phone's own clock. It's an honor system — no leader code needed. If you'd rather gate it with a code announced live each day, that's a small change to `updateCheckinButton()` in `js/app.js` — ask and I'll wire it in.
- **Editing schedule/theme/points**: everything content-related lives in `js/data.js` — squad names/colors, point values, daily poll & reflection questions, and the schedule itself (in case a time changes).
- **Squads**: assigned automatically and deterministically per device (no coordination needed) — Crown, Throne, Altar, Sanctuary.
- **Security model**: anyone can open the link and participate (Anonymous Auth = a device identity, not a real account). Firestore rules stop people from editing *other* people's scores or check-ins, but a technically motivated person could still inflate their own — deliberate trade-off for a zero-login youth week app, not a banking app. Good enough for this context.
- **Costs**: Firebase's free (Spark) tier comfortably covers a single church youth week — thousands of reads/writes and several GB of photo storage, all free.
