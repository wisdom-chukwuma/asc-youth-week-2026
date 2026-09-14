// Admin tool: uploads a day's photos/videos into the official Event
// Gallery. Not shipped to the app — run locally, authenticated via the
// same cached firebase-tools login used for CLI deploys (reuses its
// OAuth refresh token so it bypasses Firestore/Storage rules the same
// way the Firebase Console does, since gallery writes are otherwise
// closed to the client entirely).
//
// Usage:
//   node scripts/upload-gallery.js <day-number> <folder-path>
// Example:
//   node scripts/upload-gallery.js 1 "C:\Users\kay boi\Downloads\Day1Media"
//
// Accepts .jpg/.jpeg/.png/.webp as photos and .mp4/.mov/.webm as video
// clips. Skips anything else in the folder.

const fs = require("fs");
const path = require("path");

const CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const PROJECT = "asc-youth-week-2026";
const BUCKET = "asc-youth-week-2026.firebasestorage.app";

const IMAGE_EXT = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const VIDEO_EXT = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm" };

async function getAccessToken() {
  const configPath = path.join(process.env.USERPROFILE, ".config", "configstore", "firebase-tools.json");
  const c = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const t = c.tokens;
  if (t.expires_at && t.expires_at > Date.now() + 60000) return t.access_token;
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      refresh_token: t.refresh_token, grant_type: "refresh_token"
    })
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error("token refresh failed: " + JSON.stringify(json));
  return json.access_token;
}

async function uploadFile(token, localPath, storagePath, contentType) {
  const bytes = fs.readFileSync(localPath);
  // The underlying Google Cloud Storage JSON API (Firebase Storage
  // buckets are plain GCS buckets) - firebasestorage.googleapis.com's
  // own REST surface uses a different path shape and 404s on this one.
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
    body: bytes
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`upload failed for ${localPath}: HTTP ${resp.status} ${text.slice(0, 500)}`);
  }
  const json = await resp.json();
  // Public download URL — matches the shape getDownloadURL() would give the client SDK.
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media`;
}

async function createGalleryDoc(token, day, type, url) {
  const resp = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/gallery`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          day: { integerValue: String(day) },
          type: { stringValue: type },
          url: { stringValue: url },
          createdAt: { timestampValue: new Date().toISOString() }
        }
      })
    }
  );
  const json = await resp.json();
  if (!resp.ok) throw new Error("firestore doc create failed: " + JSON.stringify(json));
  return json.name;
}

(async () => {
  const [, , dayArg, folderArg] = process.argv;
  if (!dayArg || !folderArg) {
    console.error("Usage: node scripts/upload-gallery.js <day-number> <folder-path>");
    process.exit(1);
  }
  const day = Number(dayArg);
  const folder = folderArg;
  if (!fs.existsSync(folder)) throw new Error(`Folder not found: ${folder}`);

  const token = await getAccessToken();
  const files = fs.readdirSync(folder);
  let uploaded = 0, skipped = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const localPath = path.join(folder, file);
    if (fs.statSync(localPath).isDirectory()) continue;

    let type, contentType;
    if (IMAGE_EXT[ext]) { type = "photo"; contentType = IMAGE_EXT[ext]; }
    else if (VIDEO_EXT[ext]) { type = "video"; contentType = VIDEO_EXT[ext]; }
    else { console.log(`Skipping (unsupported type): ${file}`); skipped++; continue; }

    const storagePath = `gallery/${day}/${Date.now()}_${file}`;
    console.log(`Uploading ${file} (${type})...`);
    const url = await uploadFile(token, localPath, storagePath, contentType);
    await createGalleryDoc(token, day, type, url);
    console.log(`  done: ${storagePath}`);
    uploaded++;
  }

  console.log(`\nDay ${day}: uploaded ${uploaded}, skipped ${skipped}.`);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
