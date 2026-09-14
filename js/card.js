// Generates a shareable 4:5 "day card" (IG/WhatsApp-story friendly)
// on the offscreen canvas and hands it to the Web Share API, falling
// back to a plain download.
import { EVENT, SQUADS } from "./data.js";

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
  ctx.fillText(EVENT.diocese.toUpperCase(), w / 2, 150);
  ctx.fillStyle = "#f5eefc";
  ctx.font = "700 40px Manrope, sans-serif";
  ctx.fillText(EVENT.churchName, w / 2, 200);

  // Youth week + day
  ctx.fillStyle = "#e8c874";
  ctx.font = "700 30px Manrope, sans-serif";
  ctx.fillText("YOUTH WEEK 2026", w / 2, 300);

  ctx.fillStyle = "#f4b942";
  ctx.font = "700 34px Manrope, sans-serif";
  ctx.fillText(`DAY ${dayInfo.day} · ${dayInfo.label.toUpperCase()} ${dayInfo.dateLabel.toUpperCase()}`, w / 2, 350);

  // Big theme title
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 108px Cinzel, Georgia, serif";
  ctx.fillText("Worship", w / 2, 480);
  ctx.fillStyle = "#f4b942";
  ctx.font = "900 128px Cinzel, Georgia, serif";
  ctx.fillText("The King", w / 2, 610);

  ctx.fillStyle = "#b8a9d9";
  ctx.font = "italic 500 28px Manrope, sans-serif";
  ctx.textAlign = "center";
  const verseLines = wrapText(ctx, `"${EVENT.verseText}"`, w / 2, 680, w - pad * 2, 36);
  ctx.font = "700 26px Manrope, sans-serif";
  ctx.fillStyle = "#e8c874";
  ctx.fillText(EVENT.verse, w / 2, 680 + verseLines * 36 + 16);

  // Session card
  const cardTop = 830;
  const cardH = dayInfo.sessions.length > 1 ? 260 : 190;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  roundRect(ctx, pad, cardTop, w - pad * 2, cardH, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(244,185,66,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, pad, cardTop, w - pad * 2, cardH, 28);
  ctx.stroke();

  ctx.textAlign = "left";
  let sy = cardTop + 60;
  dayInfo.sessions.forEach((s) => {
    ctx.fillStyle = "#f4b942";
    ctx.font = "700 30px Manrope, sans-serif";
    ctx.fillText(s.title, pad + 40, sy);
    ctx.fillStyle = "#c9bce3";
    ctx.font = "500 24px Manrope, sans-serif";
    ctx.fillText(s.blurb, pad + 40, sy + 34);
    sy += 100;
  });

  // Footer: nickname + squad
  ctx.textAlign = "center";
  ctx.fillStyle = "#f5eefc";
  ctx.font = "700 30px Manrope, sans-serif";
  const who = profile?.nickname ? `${profile.nickname} · Team ${squad.name}` : "Anticipate!";
  ctx.fillText(who, w / 2, h - 110);

  ctx.fillStyle = "#8677a8";
  ctx.font = "600 22px Manrope, sans-serif";
  ctx.fillText(`${EVENT.address} · Mon 14 – Sun 20 Sept`, w / 2, h - 60);

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
