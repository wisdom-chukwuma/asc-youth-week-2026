// Session reminders for Worship The King — Youth Week 2026.
// Seven fixed schedules, one per session start (two on Day 5), each
// firing 30 minutes early in Africa/Lagos time. Dates are pinned to
// this event only; safe to leave deployed afterward, they just won't
// match again until the same day/month recurs next year.
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

async function sendToAll(title, body) {
  const db = getFirestore();
  const snap = await db.collection("profiles").get();
  const tokens = snap.docs.map((d) => d.data().fcmToken).filter(Boolean);
  if (!tokens.length) {
    console.log("No FCM tokens registered yet — nothing to send.");
    return;
  }

  const messaging = getMessaging();
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const res = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      webpush: { fcmOptions: { link: "https://asc-youth-week.netlify.app/" } }
    });
    console.log(`Sent to ${res.successCount}/${chunk.length} (failures: ${res.failureCount})`);
  }
}

const TZ = "Africa/Lagos";

exports.remindDay1 = onSchedule({ schedule: "30 17 14 9 *", timeZone: TZ }, async () => {
  await sendToAll("Theme Expository starts in 30 min \u{1F451}", "Discovering truth through the word — see you at 6pm!");
});

exports.remindDay2 = onSchedule({ schedule: "30 17 15 9 *", timeZone: TZ }, async () => {
  await sendToAll("Bible Study starts in 30 min \u{1F4D6}", "Exploring God's Word together — see you at 6pm!");
});

exports.remindDay3 = onSchedule({ schedule: "30 17 16 9 *", timeZone: TZ }, async () => {
  await sendToAll("Purpose Meets Profession starts in 30 min \u{1F4BC}", "Lessons for impactful living — see you at 6pm!");
});

exports.remindDay4 = onSchedule({ schedule: "30 16 17 9 *", timeZone: TZ }, async () => {
  await sendToAll("Ignite Thy Spirit starts in 30 min \u{1F525}", "A night of revival + Praise Unleashed — see you at 5pm!");
});

exports.remindDay5Morning = onSchedule({ schedule: "30 8 19 9 *", timeZone: TZ }, async () => {
  await sendToAll("Fit For Purpose starts in 30 min ☀️", "Building healthy lives — see you at 9am!");
});

exports.remindDay5Evening = onSchedule({ schedule: "30 16 19 9 *", timeZone: TZ }, async () => {
  await sendToAll("The Spotlight Experience starts in 30 min \u{1F3A8}", "Kingdom Creatives night — see you at 5pm!");
});

exports.remindDay6 = onSchedule({ schedule: "30 7 20 9 *", timeZone: TZ }, async () => {
  await sendToAll("Youth Harvest Thanksgiving starts in 30 min \u{1F33E}", "Bring your best before the King — see you at 8am!");
});
