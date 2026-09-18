// Generates a shareable 4:5 "day card" (IG/WhatsApp-story friendly)
// on the offscreen canvas and hands it to the Web Share API, falling
// back to a plain download.
import { EVENT, SQUADS } from "./data.js";

// Phosphor glyph codepoints, for drawing the same icons used elsewhere
// in the app directly onto the canvas (matches every icon name used in
// data.js's SCHEDULE/SQUADS).
const ICON_GLYPH = {
  "book-open": "\ue0e6",
  "cross": "\ue8a0",
  "briefcase": "\ue0ee",
  "fire": "\ue242",
  "music-notes": "\ue340",
  "sun": "\ue472",
  "bell": "\ue0ce",
  "grains": "\uec68",
  "crown": "\ue614",
  "castle-turret": "\ue9d0",
  "armchair": "\ue012",
  "bird": "\ue72c",
  "map-pin": "\ue316"
};

function squadMeta(id) {
  return SQUADS.find((s) => s.id === id) || SQUADS[0];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  const lines = [];
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return lines.length;
}

// A plain greedy wrap fills line 1 to the max and dumps whatever's left
// on line 2 — for a short quote that means a single orphaned word (e.g.
// "Zion.") stranded alone on its own line. This instead finds whichever
// word-boundary split keeps both lines as close to equal width as
// possible, so short trailing lines don't happen.
function wrapTextBalanced(ctx, text, x, y, maxWidth, lineHeight) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return 1;
  }
  const words = text.split(" ");
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(" ");
    const line2 = words.slice(i).join(" ");
    const w1 = ctx.measureText(line1).width;
    const w2 = ctx.measureText(line2).width;
    if (w1 > maxWidth || w2 > maxWidth) continue;
    const balance = Math.abs(w1 - w2);
    if (!best || balance < best.balance) best = { line1, line2, balance };
  }
  if (!best) return wrapText(ctx, text, x, y, maxWidth, lineHeight);
  ctx.fillText(best.line1, x, y);
  ctx.fillText(best.line2, x, y + lineHeight);
  return 2;
}

// Filled circle with a centered Phosphor glyph — used for both the
// session-time icon badge and the squad badge, so both read instantly
// the same way the app itself does.
function drawIconBadge(ctx, cx, cy, radius, bgColor, glyph, glyphColor, glyphSize) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  if (glyph) {
    ctx.font = `${glyphSize}px Phosphor`;
    ctx.fillStyle = glyphColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, cx, cy + glyphSize * 0.04);
  }
  ctx.restore();
}

function formatClock(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function paintBackground(ctx, w, h) {
  ctx.fillStyle = "#150a2e";
  ctx.fillRect(0, 0, w, h);

  const glow = (cx, cy, r, color) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  glow(w * 0.5, h * 0.05, w * 0.9, "rgba(122,43,110,0.55)");
  glow(w * 0.9, h * 0.2, w * 0.6, "rgba(58,20,112,0.5)");
  glow(w * 0.1, h * 1.0, w * 0.7, "rgba(45,18,87,0.55)");

  // fine vertical light rays, echoing the flyer's cross-light motif
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = "#f4b942";
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    const x = w * 0.5 + (i - 3) * 70;
    ctx.moveTo(x, -40);
    ctx.lineTo(x + 120, h + 40);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

export async function shareDayCard(dayInfo, profile) {
  // The Phosphor glyphs below are drawn straight onto the canvas, which
  // needs the font file actually downloaded first — without this the
  // very first card a person generates can render empty icon boxes.
  await document.fonts.load("48px Phosphor");
  await document.fonts.ready;

  const canvas = document.getElementById("card-canvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  paintBackground(ctx, w, h);

  const squad = squadMeta(profile?.squad);
  const pad = 90;

  // Church mark
  ctx.textAlign = "center";
  ctx.fillStyle = "#b8a9d9";
  ctx.font = "600 26px Manrope, sans-serif";
  ctx.fillText(EVENT.diocese.toUpperCase(), w / 2, 130);
  ctx.fillStyle = "#f5eefc";
  ctx.font = "700 40px Manrope, sans-serif";
  ctx.fillText(EVENT.churchName, w / 2, 180);

  // Youth week + day
  ctx.fillStyle = "#e8c874";
  ctx.font = "700 28px Manrope, sans-serif";
  ctx.fillText("YOUTH WEEK 2026", w / 2, 270);

  ctx.fillStyle = "#f4b942";
  ctx.font = "700 32px Manrope, sans-serif";
  ctx.fillText(`DAY ${dayInfo.day} · ${dayInfo.label.toUpperCase()} ${dayInfo.dateLabel.toUpperCase()}`, w / 2, 318);

  // Big theme title
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 96px Cinzel, Georgia, serif";
  ctx.fillText("Worship", w / 2, 440);
  ctx.fillStyle = "#f4b942";
  ctx.font = "900 116px Cinzel, Georgia, serif";
  ctx.fillText("The King", w / 2, 560);

  ctx.fillStyle = "#b8a9d9";
  ctx.font = "italic 500 27px Manrope, sans-serif";
  ctx.textAlign = "center";
  const verseLines = wrapTextBalanced(ctx, `"${EVENT.verseText}"`, w / 2, 630, w - pad * 2, 34);
  ctx.font = "700 25px Manrope, sans-serif";
  ctx.fillStyle = "#e8c874";
  ctx.fillText(EVENT.verse, w / 2, 630 + verseLines * 34 + 14);

  // Session card — each session gets its own themed icon badge + start
  // time, not just a title, so the card is actually useful as an invite
  // ("come at 6pm") and not just a mood board.
  const cardTop = 630 + verseLines * 34 + 60;
  const rowH = 100;
  const cardH = dayInfo.sessions.length * rowH + 40;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  roundRect(ctx, pad, cardTop, w - pad * 2, cardH, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(244,185,66,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, pad, cardTop, w - pad * 2, cardH, 28);
  ctx.stroke();

  ctx.textAlign = "left";
  dayInfo.sessions.forEach((s, i) => {
    // rowCenter is the true vertical middle of this row — the icon badge
    // sits exactly on it, and the title/blurb baselines are placed by
    // their actual font metrics (ascent/line-height) so the two-line
    // text block's visual center lands on the same line as the icon,
    // not just its own two baselines split evenly.
    const rowCenter = cardTop + 20 + i * rowH + rowH / 2;
    drawIconBadge(ctx, pad + 78, rowCenter, 34, "rgba(244,185,66,0.16)", ICON_GLYPH[s.icon], "#f4b942", 34);

    const textX = pad + 130;
    ctx.fillStyle = "#f4b942";
    ctx.font = "700 30px Manrope, sans-serif";
    ctx.fillText(s.title, textX, rowCenter - 9);
    ctx.fillStyle = "#c9bce3";
    ctx.font = "500 23px Manrope, sans-serif";
    ctx.fillText(s.blurb, textX, rowCenter + 24);

    ctx.textAlign = "right";
    ctx.fillStyle = "#e8c874";
    ctx.font = "700 24px Manrope, sans-serif";
    ctx.fillText(formatClock(s.start), w - pad - 40, rowCenter + 8);
    ctx.textAlign = "left";

    if (i < dayInfo.sessions.length - 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad + 40, cardTop + 20 + (i + 1) * rowH);
      ctx.lineTo(w - pad - 40, cardTop + 20 + (i + 1) * rowH);
      ctx.stroke();
    }
  });

  // Squad badge — a colored icon badge reads far better shared out of
  // context than plain "Team Sanctuary" text ever could.
  const squadY = cardTop + cardH + 85;
  drawIconBadge(ctx, w / 2, squadY, 46, squad.color, ICON_GLYPH[squad.icon], "#1c0f36", 44);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f5eefc";
  ctx.font = "700 32px Manrope, sans-serif";
  const who = profile?.nickname || "Anticipate!";
  ctx.fillText(who, w / 2, squadY + 92);
  ctx.fillStyle = squad.color;
  ctx.font = "700 24px Manrope, sans-serif";
  ctx.fillText(`Team ${squad.name}`, w / 2, squadY + 126);

  // Join CTA — the whole point of sharing a card is someone else seeing
  // it, so it needs to actually say where to go.
  const ctaY = squadY + 185;
  const ctaLabel = "Join us · asc-youth-week.netlify.app";
  ctx.font = "700 26px Manrope, sans-serif";
  const ctaW = ctx.measureText(ctaLabel).width + 80;
  roundRect(ctx, w / 2 - ctaW / 2, ctaY - 34, ctaW, 68, 34);
  ctx.strokeStyle = "rgba(244,185,66,0.55)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#f4b942";
  ctx.fillText(ctaLabel, w / 2, ctaY + 9);

  ctx.fillStyle = "#8677a8";
  ctx.font = "600 22px Manrope, sans-serif";
  ctx.fillText(`${EVENT.address} · Mon 14 – Sun 20 Sept`, w / 2, ctaY + 70);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
  const filename = `worship-the-king-day${dayInfo.day}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Worship The King — Youth Week 2026",
        text: "Join us at All Saints' Church Festac this week"
      });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
