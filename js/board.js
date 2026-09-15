import { db, collection, query, orderBy, limit, onSnapshot } from "./firebase-config.js";
import { SQUADS } from "./data.js";
import { state } from "./state.js";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export function initBoard() {
  const squadListEl = document.getElementById("board-squad-list");
  const meRankEl = document.getElementById("board-me-rank");
  const listEl = document.getElementById("board-individual-list");

  onSnapshot(collection(db, "squadTotals"), (snap) => {
    const map = {};
    snap.forEach((d) => { map[d.id] = d.data().points || 0; });
    const maxPts = Math.max(1, ...SQUADS.map((s) => map[s.id] || 0));
    const ranked = SQUADS.slice().sort((a, b) => (map[b.id] || 0) - (map[a.id] || 0));

    squadListEl.innerHTML = "";
    ranked.forEach((s) => {
      const pts = map[s.id] || 0;
      const row = document.createElement("div");
      row.className = "squad-bar-row";
      row.innerHTML =
        `<div class="squad-bar-label"><span class="squad-badge squad-badge-sm" style="background:${s.color}"><i class="ph ph-${s.icon}"></i></span><span>${s.name}</span>` +
        `<span class="squad-bar-points">${pts} pts</span></div>` +
        `<div class="squad-bar-track"><div class="squad-bar-fill" style="width:${(pts / maxPts) * 100}%;background:${s.color}"></div></div>`;
      squadListEl.appendChild(row);
    });
  });

  const topQuery = query(collection(db, "profiles"), orderBy("points", "desc"), limit(20));
  onSnapshot(topQuery, (snap) => {
    listEl.innerHTML = "";
    let rank = 0;
    let meInTop = false;
    let meScoreInTop = null;
    snap.forEach((docSnap) => {
      rank++;
      const p = docSnap.data();
      const isMe = docSnap.id === state.uid;
      if (isMe) { meInTop = true; meScoreInTop = p.points || 0; }
      const squad = SQUADS.find((s) => s.id === p.squad) || SQUADS[0];
      const li = document.createElement("li");
      li.className = "rank-row" + (rank <= 3 ? " is-top3" : "") + (isMe ? " is-me" : "");
      li.innerHTML =
        `<span class="rank-pos">${rank}</span>` +
        `<span class="rank-squad-dot" style="background:${squad.color}"></span>` +
        `<span class="rank-name">${escapeHtml(p.nickname)}${isMe ? " (you)" : ""}</span>` +
        `<span class="rank-pts">${p.points || 0}</span>`;
      listEl.appendChild(li);
    });

    if (!state.profile) {
      meRankEl.textContent = "";
    } else if (meInTop) {
      meRankEl.textContent = `You're #${[...listEl.children].findIndex((li) => li.classList.contains("is-me")) + 1} with ${meScoreInTop} pts`;
    } else {
      meRankEl.textContent = `You: ${state.profile.points || 0} pts — climb into the top 20!`;
    }
  });
}
