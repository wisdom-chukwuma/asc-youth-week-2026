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
        icon: "book-open",
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
        icon: "cross",
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
        icon: "briefcase",
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
        icon: "fire",
        start: "2026-09-17T17:00:00+01:00",
        end: "2026-09-17T20:00:00+01:00"
      },
      {
        title: "Praise Unleashed",
        blurb: "Worship the King",
        icon: "music-notes",
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
        icon: "sun",
        start: "2026-09-19T09:00:00+01:00",
        end: "2026-09-19T12:00:00+01:00"
      },
      {
        title: "The Spotlight Experience",
        blurb: "Kingdom Creatives",
        icon: "bell",
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
        icon: "grains",
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
    options: ["Locked in", "Getting there", "Show up, see"],
    reflection: "One truth you're hoping God shows you this week:"
  },
  2: {
    poll: "How did tonight's Bible Study land?",
    options: ["Convicted", "Encouraged", "Still chewing on it"],
    reflection: "One verse from tonight worth remembering:"
  },
  3: {
    poll: "Purpose meets profession — how's that hitting?",
    options: ["Clarity", "Challenged", "Still figuring it out"],
    reflection: "One way you want to live more purposefully:"
  },
  4: {
    poll: "How's your spirit after tonight?",
    options: ["Ignited", "Refreshed", "Still processing"],
    reflection: "One thing you're carrying from Praise Unleashed:"
  },
  5: {
    poll: "Fit for Purpose + Spotlight — today's vibe?",
    options: ["Energized", "Inspired by the talent", "Both!"],
    reflection: "One creative gift you want to steward better:"
  },
  6: {
    poll: "How's your heart on Harvest Sunday?",
    options: ["Grateful", "Full circle", "Ready for what's next"],
    reflection: "One thing you're thankful for from this Youth Week:"
  }
};

export const SQUADS = [
  { id: "crown", name: "Crown", icon: "crown", color: "#F4B942" },
  { id: "throne", name: "Throne", icon: "sword", color: "#E85D75" },
  { id: "altar", name: "Altar", icon: "fire", color: "#5DB3E8" },
  { id: "sanctuary", name: "Sanctuary", icon: "bird", color: "#7DDE92" }
];

export const POINTS = {
  checkin: 10,
  poll: 5,
  reflection: 5,
  photo: 5,
  photoDailyCap: 2,
  shoutout: 3,
  shoutoutDailyCap: 2,
  signature: 5,
  comment: 2,
  commentDailyCap: 10,
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
