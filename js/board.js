import { db, collection, query, orderBy, limit, onSnapshot } from "./firebase-config.js";
import { SQUADS, squadById } from "./data.js";
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

  function renderSquadBars(profiles) {
    const map = {};
    profiles.forEach((p) => { map[p.squad] = (map[p.squad] || 0) + (p.points || 0); });
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
  }

  function renderIndividualList(rankedDocs) {
    listEl.innerHTML = "";
    let meRank = null;
    let meScore = null;
    const top20 = rankedDocs.slice(0, 20);
    top20.forEach((docSnap, i) => {
      const rank = i + 1;
      const p = docSnap.data();
      const isMe = docSnap.id === state.uid;
      if (isMe) { meRank = rank; meScore = p.points || 0; }
      const squad = squadById(p.squad);
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
    } else if (meRank) {
      meRankEl.textContent = `You're #${meRank} with ${meScore} pts`;
    } else {
      meRankEl.textContent = `You: ${state.profile.points || 0} pts — climb into the top 20!`;
    }
  }

  // A single live query over every profile (points-ordered) drives both
  // the squad totals and the individual leaderboard, so there's no
  // separate aggregate collection that can drift out of sync — that's
  // exactly what happened to the old squadTotals collection, which only
  // ever got touched by check-ins and silently ignored every other way
  // to earn points.
  const allQuery = query(collection(db, "profiles"), orderBy("points", "desc"), limit(500));
  onSnapshot(allQuery, (snap) => {
    const docs = snap.docs;
    renderSquadBars(docs.map((d) => d.data()));
    renderIndividualList(docs);
  });
}
