// Static content for Youth Week 2026 — All Saints' Church, Festac
// Times are Africa/Lagos (WAT, UTC+1), no DST.

export const EVENT = {
  churchName: "All Saints' Church",
  diocese: "Diocese of Lagos South-West",
  address: "41 Road, Festac Town, Lagos",
  theme: "Worship The King",
  verse: "Psalm 84:7",
  verseText: "They go from strength to strength, till each appears before God in Zion.",
  tagline: "Anticipate! Prepare Your Heart."
};

// Day windows use ISO local time; the browser reads them as WAT since
// that's this event's timezone regardless of viewer location.
export const SCHEDULE = [
  {
    day: 1,
    date: "2026-09-14",
    label: "Monday",
    dateLabel: "14th Sept",
    sessions: [
      {
        title: "Theme Expository",
        blurb: "Discovering truth through the word",
        start: "2026-09-14T18:00:00+01:00",
        end: "2026-09-14T20:00:00+01:00"
      }
    ]
  },
  {
    day: 2,
    date: "2026-09-15",
    label: "Tuesday",
    dateLabel: "15th Sept",
    sessions: [
      {
        title: "Bible Study",
        blurb: "Exploring God's Word together",
        start: "2026-09-15T18:00:00+01:00",
        end: "2026-09-15T20:00:00+01:00"
      }
    ]
  },
  {
    day: 3,
    date: "2026-09-16",
    label: "Wednesday",
    dateLabel: "16th Sept",
    sessions: [
      {
        title: "Purpose Meets Profession",
        blurb: "Lessons for Impactful Living",
        start: "2026-09-16T18:00:00+01:00",
        end: "2026-09-16T20:00:00+01:00"
      }
    ]
  },
  {
    day: 4,
    date: "2026-09-17",
    label: "Thursday",
    dateLabel: "17th Sept",
    sessions: [
      {
        title: "Ignite Thy Spirit",
        blurb: "A night of Revival",
        start: "2026-09-17T17:00:00+01:00",
        end: "2026-09-17T20:00:00+01:00"
      },
      {
        title: "Praise Unleashed",
        blurb: "Worship the King",
        start: "2026-09-17T17:00:00+01:00",
        end: "2026-09-17T20:00:00+01:00"
      }
    ]
  },
  {
    day: 5,
    date: "2026-09-19",
    label: "Saturday",
    dateLabel: "19th Sept",
    sessions: [
      {
        title: "Fit For Purpose",
        blurb: "Building Healthy Lives",
        start: "2026-09-19T09:00:00+01:00",
        end: "2026-09-19T12:00:00+01:00"
      },
      {
        title: "The Spotlight Experience",
        blurb: "Kingdom Creatives",
        start: "2026-09-19T17:00:00+01:00",
        end: "2026-09-19T20:00:00+01:00"
      }
    ]
  },
  {
    day: 6,
    date: "2026-09-20",
    label: "Sunday",
    dateLabel: "20th Sept",
    sessions: [
      {
        title: "Youth Harvest Thanksgiving",
        blurb: "Bringing our best before the King",
        start: "2026-09-20T08:00:00+01:00",
        end: "2026-09-20T12:00:00+01:00"
      }
    ]
  }
];

// One reflection "Engage" prompt per day — a mood/vibe poll plus an
// open reflection line, not trivia (no session content to quiz on
// ahead of time).
export const ENGAGE = {
  1: {
    poll: "How ready is your heart for this week?",
    options: ["Locked in \u{1F451}", "Getting there ✨", "Show up, see \u{1F440}"],
    reflection: "One truth you're hoping God shows you this week:"
  },
  2: {
    poll: "How did tonight's Bible Study land?",
    options: ["Convicted \u{1F62E}", "Encouraged \u{1F64C}", "Still chewing on it \u{1F9E0}"],
    reflection: "One verse from tonight worth remembering:"
  },
  3: {
    poll: "Purpose meets profession — how's that hitting?",
    options: ["Clarity \u{1F3AF}", "Challenged \u{1F4AA}", "Still figuring it out \u{1F914}"],
    reflection: "One way you want to live more purposefully:"
  },
  4: {
    poll: "How's your spirit after tonight?",
    options: ["Ignited \u{1F525}", "Refreshed \u{1F54A}️", "Still processing \u{1F64F}"],
    reflection: "One thing you're carrying from Praise Unleashed:"
  },
  5: {
    poll: "Fit for Purpose + Spotlight — today's vibe?",
    options: ["Energized ⚡", "Inspired by the talent \u{1F3A8}", "Both! \u{1F389}"],
    reflection: "One creative gift you want to steward better:"
  },
  6: {
    poll: "How's your heart on Harvest Sunday?",
    options: ["Grateful \u{1F33E}", "Full circle \u{1F451}", "Ready for what's next \u{1F680}"],
    reflection: "One thing you're thankful for from this Youth Week:"
  }
};

export const SQUADS = [
  { id: "crown", name: "Crown", emoji: "\u{1F451}", color: "#F4B942" },
  { id: "throne", name: "Throne", emoji: "⚔️", color: "#E85D75" },
  { id: "altar", name: "Altar", emoji: "\u{1F525}", color: "#5DB3E8" },
  { id: "sanctuary", name: "Sanctuary", emoji: "\u{1F54A}️", color: "#7DDE92" }
];

export const POINTS = {
  checkin: 10,
  poll: 5,
  reflection: 5,
  photo: 5,
  photoDailyCap: 2,
  shoutout: 3,
  shoutoutDailyCap: 2,
  fullWeekBonus: 25
};

export function squadFor(id) {
  // Deterministic hash so a device lands on the same squad every time,
  // no coordination or account needed.
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return SQUADS[h % SQUADS.length];
}

export function todaySchedule(now = new Date()) {
  // Local calendar date, not UTC — toISOString() would misidentify
  // "today" for up to an hour after local midnight in WAT (UTC+1).
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return SCHEDULE.find((d) => d.date === key) || null;
}

export function nextSession(now = new Date()) {
  const all = SCHEDULE.flatMap((d) =>
    d.sessions.map((s) => ({ ...s, day: d.day, dateLabel: d.dateLabel, label: d.label }))
  );
  const upcoming = all
    .filter((s) => new Date(s.end) > now)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  return upcoming[0] || null;
}
