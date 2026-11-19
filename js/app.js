(async () => {
const { BACKEND, LOCAL_ADMIN, firebaseConfig, ADMIN_EMAIL, ADMIN_GOOGLE_EMAILS } = window.BG_CONFIG;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeImg = u => (/^(https?:\/\/|data:image\/)/i.test(u || "") ? u : "");

const state = { games: [], reviews: [], sessions: [], profiles: [], profilesLoaded: false, rawUser: null, promptedFor: null, pAvatar: "", isAdmin: false, canAdmin: false, adminOnly: false, adminMode: sessionStorage.getItem("bg_admin_mode") === "1", user: null, openGameId: null, editGameId: null, editSessionId: null, photos: [], gamesLoaded: false, seedChecked: false, pendingRating: 0, editReviewId: null, editRating: 0, editText: "" };

// ---------- 프로필 / 아바타 ----------
// 캐릭터 기본 아이콘 16종은 js/avatars.js(직접 그린 SVG). 프로필에는 "preset:id" 또는 업로드한 사진(data URL)이 저장돼요.
const AVATARS = window.BG_AVATARS;
const avatarById = id => AVATARS.find(a => a.id === id) || AVATARS[0];
function avatarHtml(av, cls = "") {
  if (av && av.startsWith("data:image/")) return `<span class="avatar ${cls}"><img src="${esc(av)}" alt=""></span>`;
  const a = avatarById((av || "").replace("preset:", ""));
  return `<span class="avatar ${cls}" style="background:${a.bg}">${a.svg}</span>`;
}
const profileOf = uid => state.profiles.find(p => p.id === uid);
const nameOf = (uid, fallback) => profileOf(uid)?.name || fallback || "익명";
const whoHtml = (uid, name, cls = "sm") => `<span class="who-line">${uid ? avatarHtml(profileOf(uid)?.avatar, cls) : ""}${esc(nameOf(uid, name))}</span>`;
function applyProfile() {   // 로그인 정보 + 프로필(이름/아이콘) 합치기
  const r = state.rawUser;
  if (!r) { state.user = null; return; }
  const p = state.adminOnly ? null : profileOf(r.uid);   // 관리자 전용 계정만 프로필 없음
  state.user = { ...r, name: p?.name || r.name, avatar: p?.avatar || "" };
}
const canTouch = row => !!state.user && (state.isAdmin || row.authorUid === state.user.uid);

let backend;
try {
  backend = BACKEND === "firebase"
    ? await (await import("./backend-firebase.js")).createFirebaseBackend(firebaseConfig, ADMIN_EMAIL, ADMIN_GOOGLE_EMAILS)
    : window.createLocalBackend(LOCAL_ADMIN);
} catch (err) {
  $("#setupNotice").innerHTML = "<b>백엔드를 불러오지 못했어요.</b> " + esc(err.message);
  $("#setupNotice").classList.remove("hidden");
  throw err;
}
if (backend.mode === "local") {
  $("#setupNotice").innerHTML = `<b>🧪 로컬 테스트 모드</b> — 데이터가 이 브라우저에만 저장돼요. 관리자 로그인: 아이디 <code>${esc(LOCAL_ADMIN.id)}</code> / 비밀번호 <code>${esc(LOCAL_ADMIN.password)}</code>`;
  $("#setupNotice").classList.remove("hidden");
}

// ---------- 유틸 ----------
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add("hidden"), 2200);
}
const fmtDate = ts => {
  const d = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : (ts ? new Date(ts) : null);
  if (!d) return "";
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
};
const fmtDateTime = ts => {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const p = n => String(n).padStart(2, "0");
  const w = "일월화수목금토"[d.getDay()];
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} (${w}) ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toMs = ts => ts?.toDate ? ts.toDate().getTime() : ts?.seconds ? ts.seconds * 1000 : +new Date(ts);
// 별점은 0.5점 단위. 평균 같은 값은 가장 가까운 0.5로 맞춰 반쪽 별까지 그려요.
const toHalf = v => Math.round((+v || 0) * 2) / 2;
const fmtRating = v => { const h = toHalf(v); return Number.isInteger(h) ? h.toFixed(0) : h.toFixed(1); };
function starsHtml(value) {
  const h = toHalf(value);
  return `<span class="stars" aria-label="${fmtRating(h)}점">${[1, 2, 3, 4, 5].map(n =>
    `<i class="st ${h >= n ? "on" : h >= n - 0.5 ? "half" : ""}">★</i>`).join("")}</span>`;
}
const starPicker = (value, id = "starInput") => `<div class="star-input" id="${id}">${[1, 2, 3, 4, 5].map(n =>
  `<span class="si ${value >= n ? "on" : value >= n - 0.5 ? "half" : ""}" data-n="${n}"><b data-v="${n - 0.5}"></b><b data-v="${n}"></b>★</span>`).join("")}
  <span class="rating-val">${value ? fmtRating(value) + "점" : "별을 눌러 선택"}</span></div>`;
function stats(gameId) {
  const rs = state.reviews.filter(r => r.gameId === gameId);
  const avg = rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : 0;
  return { count: rs.length, avg };
}
function openModal(id) { $(id).classList.remove("hidden"); document.body.style.overflow = "hidden"; }
function closeModals() {
  $$(".modal").forEach(m => m.classList.add("hidden"));
  document.body.style.overflow = "";
  state.openGameId = null; state.editReviewId = null;
}

// ---------- 렌더: 게임 목록 ----------
function thumb(g) {
  const src = safeImg(g.image);
  return src ? `<img src="${esc(src)}" alt="${esc(g.name)}" loading="lazy">` : "🎲";
}
function renderGames() {
  const q = $("#searchInput").value.trim().toLowerCase();
  const sort = $("#sortSelect").value;
  const rankMap = new Map(computeRanking().map(x => [x.g.id, x.rank]));
  let list = state.games.filter(g => g.name.toLowerCase().includes(q));
  list.sort((a, b) => {
    if (sort === "plays") return (b.playCount || 0) - (a.playCount || 0);
    if (sort === "rating") { const x = stats(a.id), y = stats(b.id); return y.avg - x.avg || y.count - x.count || a.name.localeCompare(b.name, "ko"); }   // 평점 높은 순 → 후기 많은 순 → 이름순
    if (sort === "recent") return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    return a.name.localeCompare(b.name, "ko");
  });
  // 보유 게임 개수 (검색 중이면 검색 결과 수도 함께)
  $("#gameCount").textContent = q ? `전체 ${state.games.length}개 · 검색 ${list.length}개` : `${state.games.length}개`;
  $("#gameGrid").innerHTML = list.length ? list.map(g => {
    const s = stats(g.id);
    return `<article class="card" data-id="${g.id}">
      <div class="thumb">${thumb(g)}${rankBadge(rankMap.get(g.id))}</div>
      <div class="card-body">
        <h3>${esc(g.name)}</h3>
        <div class="meta">${g.players ? `<span>👥 ${esc(g.players)}</span>` : ""}${g.bestPlayers ? `<span class="best">⭐ 베스트 ${esc(g.bestPlayers)}</span>` : ""}${g.time ? `<span>⏱ ${esc(g.time)}</span>` : ""}</div>
        <div class="meta" style="margin-top:6px">
          <span class="pill">🎯 ${g.playCount || 0}회 플레이</span>
          ${s.count ? `<span><span class="stars">★</span> <span class="score">${s.avg.toFixed(1)}</span> (${s.count})</span>` : `<span>평점 없음</span>`}
        </div>
        ${g.rules ? `<p class="rule-snip">${esc(g.rules)}</p>` : ""}
      </div></article>`;
  }).join("") : `<div class="empty" style="grid-column:1/-1">${state.games.length ? "검색 결과가 없어요." : "아직 등록된 게임이 없어요."}</div>`;
}

// ---------- 렌더: 랭킹 ----------
// 평점이 있는 게임만 평균 평점순 정렬. 평균(소수 2자리)과 리뷰 수가 같으면 공동 순위.
function computeRanking() {
  const list = state.games.map(g => ({ g, ...stats(g.id) })).filter(x => x.count > 0)
    .sort((a, b) => b.avg - a.avg || b.count - a.count || a.g.name.localeCompare(b.g.name, "ko"));
  list.forEach((x, i) => {
    const p = list[i - 1];
    x.rank = p && p.avg.toFixed(2) === x.avg.toFixed(2) && p.count === x.count ? p.rank : i + 1;
  });
  return list;
}
const rankBadge = rank => rank ? `<span class="rank-badge r${rank <= 3 ? rank : 0}">${rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : "🏆"} ${rank}위</span>` : "";

function renderRanking() {
  const ranked = computeRanking();
  $("#rankList").innerHTML = ranked.length ? ranked.map(x => `
    <li data-id="${x.g.id}" class="r${x.rank <= 3 ? x.rank : 0}">
      <div class="no">${x.rank}</div>
      <div class="rthumb">${thumb(x.g)}</div>
      <div class="info"><b>${esc(x.g.name)}</b><div class="meta">${starsHtml(x.avg)}<span>리뷰 ${x.count}개</span><span>🎯 ${x.g.playCount || 0}회</span></div></div>
      <div class="big">${x.avg.toFixed(2)}</div></li>`).join("")
    : `<div class="empty">아직 평점이 없어요. 게임을 플레이하고 첫 평점을 남겨보세요!</div>`;
}

// ---------- 렌더: 모임 기록 ----------
function renderSessions() {
  const gname = id => state.games.find(g => g.id === id)?.name;
  const visible = state.sessions.filter(s => !s.deletedAt);   // 삭제(숨김) 처리된 글은 관리자 페이지에서만 보임
  $("#sessionList").innerHTML = visible.length ? visible.map(s => {
    const games = (s.gameIds || []).map(id => ({ id, name: gname(id) })).filter(g => g.name);
    return `<article class="session" data-sid="${esc(s.id)}">
      <h3>📅 ${fmtDateTime(s.date)}</h3>
      <div class="meta">
        <span>👥 ${(s.attendees || []).length}명${(s.attendees || []).length ? ": " + esc(s.attendees.join(", ")) : ""}</span>
      </div>
      ${games.length ? `<div style="margin-top:8px">${games.map(g => `<button type="button" class="pill link" data-game="${esc(g.id)}" title="게임 상세 보기">${esc(g.name)}</button>`).join(" ")}</div>` : ""}
      ${s.episode ? `<p>${esc(s.episode)}</p>` : ""}
      ${(s.photos || []).length ? `<div class="photos">${s.photos.map((p, i) => safeImg(p) ? `<img src="${esc(p)}" data-photo="${esc(s.id)}:${i}" alt="활동 사진" loading="lazy">` : "").join("")}</div>` : ""}
      <div class="by">${whoHtml(s.authorUid, s.authorName)}${s.editedAt ? " · 수정됨" : ""}</div>
      ${canTouch(s) ? `<div style="margin-top:10px"><button class="btn ghost small" data-edit-session="${s.id}">수정</button> <button class="btn danger small" data-del-session="${s.id}">삭제</button></div>` : ""}
    </article>`;
  }).join("") : `<div class="empty">아직 남겨진 활동 후기가 없어요. 첫 후기를 남겨보세요!</div>`;
}

// ---------- 렌더: 상세 ----------
function renderDetail() {
  const g = state.games.find(x => x.id === state.openGameId);
  if (!g) { closeModals(); return; }
  const s = stats(g.id);
  const rs = state.reviews.filter(r => r.gameId === g.id).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const linked = state.sessions.filter(x => !x.deletedAt && (x.gameIds || []).includes(g.id)).sort((a, b) => toMs(b.date) - toMs(a.date));
  const canReview = (g.playCount || 0) > 0 || !!state.user;   // 로그인하면 모든 게임에 후기 가능, 게스트는 플레이한 게임만
  const savedNick = state.user ? state.user.name : (localStorage.getItem("bg_nick") || "");
  // 입력 중인 값 보존
  const keep = { nick: $("#rvNick")?.value || savedNick, text: $("#rvText")?.value ?? "" };
  $("#detailBody").innerHTML = `
    <div class="detail-head">
      <div class="pic">${thumb(g)}${rankBadge(computeRanking().find(x => x.g.id === g.id)?.rank)}</div>
      <div class="txt">
        <h2>${esc(g.name)}</h2>
        <div class="meta">${g.players ? `<span>👥 ${esc(g.players)}</span>` : ""}${g.bestPlayers ? `<span class="best">⭐ 베스트 ${esc(g.bestPlayers)}</span>` : ""}${g.time ? `<span>⏱ ${esc(g.time)}</span>` : ""}</div>
        <div style="margin:10px 0"><span style="font-size:1.3rem">${starsHtml(s.count ? s.avg : 0)}</span>
          <span class="score">${s.count ? s.avg.toFixed(2) : "-"}</span> <span class="hint">(리뷰 ${s.count}개)</span></div>
        <div class="counter"><span class="pill">🎯 우리 모임 플레이 ${g.playCount || 0}회</span>
          ${state.isAdmin ? `<button data-pc="-1" title="감소">−</button><button data-pc="1" title="증가">+</button>` : ""}</div>
        ${state.isAdmin ? `<button class="btn ghost small" data-edit="${g.id}">수정</button> <button class="btn danger small" data-del-game="${g.id}">게임 삭제</button>` : ""}
      </div>
    </div>
    <h3>📖 간단 룰</h3>
    <div class="rules">${g.rules ? esc(g.rules) : "등록된 룰이 없어요."}</div>
    <h3>📸 이 게임이 나온 활동 후기</h3>
    ${linked.length ? `<div class="linked-list">${linked.map(x => `<button type="button" class="act-link" data-goto-session="${esc(x.id)}">
        <b>📅 ${fmtDateTime(x.date)}</b> <span class="who-line">${whoHtml(x.authorUid, x.authorName)}</span>
        ${x.episode ? `<span class="snip">${esc(x.episode.slice(0, 60))}${x.episode.length > 60 ? "…" : ""}</span>` : ""}
        <span class="go">보러가기 →</span></button>`).join("")}</div>`
      : `<p class="hint">아직 이 게임이 나온 활동 후기가 없어요.</p>`}
    <h3>💬 한줄 후기 & 평점</h3>
    ${rs.length ? rs.map(r => {
      const mine = !!(state.user && r.uid && r.uid === state.user.uid);   // 로그인 상태로 쓴 본인 후기
      if (state.editReviewId === r.id) return `<div class="review editing"><div class="grow">
          <span class="who">${r.uid ? whoHtml(r.uid, r.nickname) : esc(r.nickname)}</span> <span class="hint">후기 수정 (별점은 0.5점 단위)</span>
          ${starPicker(state.editRating, "editStarInput")}
          <textarea id="editRvText" rows="3" maxlength="500" placeholder="한줄 후기 (선택)">${esc(state.editText)}</textarea>
          <div class="actions"><button type="button" class="btn ghost small" data-cancel-edit>취소</button><button type="button" class="btn small" data-save-review="${r.id}">저장</button></div>
        </div></div>`;
      return `<div class="review"><div>
        <span class="who">${r.uid ? whoHtml(r.uid, r.nickname) : esc(r.nickname)}</span> ${starsHtml(r.rating)} <span class="score text-sm">${fmtRating(r.rating)}</span><span class="when">${fmtDate(r.createdAt)}${r.editedAt ? " · 수정됨" : ""}</span>
        ${r.comment ? `<p>${esc(r.comment)}</p>` : ""}</div>
        <div class="flex shrink-0 gap-1.5">${mine ? `<button class="btn ghost small" data-edit-review="${r.id}">수정</button>` : ""}${state.isAdmin || mine ? `<button class="btn danger small" data-del-review="${r.id}">삭제</button>` : ""}</div></div>`;
    }).join("")
      : `<p class="hint">아직 후기가 없어요.</p>`}
    ${canReview ? `
    <form id="reviewForm" class="review-form">
      <b>후기 남기기</b> <span class="hint">(별점은 0.5점 단위)</span>
      ${starPicker(state.pendingRating)}
      <input id="rvNick" placeholder="닉네임 *" maxlength="20" required value="${esc(keep.nick)}">
      <textarea id="rvText" rows="3" maxlength="500" placeholder="한줄 후기 (선택)">${esc(keep.text)}</textarea>
      <button class="btn" type="submit">등록</button>
      <span class="hint">${state.user ? "로그인 상태라 내 후기는 직접 수정·삭제할 수 있어요." : "게스트로 남기면 나중에 직접 삭제할 수 없어요. (Google 로그인하면 가능)"}</span>
    </form>` : `<div class="rounded-xl border-[3px] border-dashed border-ink bg-white p-3 text-sm font-bold">아직 모임에서 플레이한 기록이 없는 게임이에요. <b>로그인하면</b> 언제든 후기와 평점을 남길 수 있어요.
      <button type="button" class="btn small mt-2" data-login>Google 로그인</button></div>`}`;
}

function renderAll() {
  renderGames(); renderRanking(); renderSessions();
  if (state.openGameId) renderDetail();
  $("#adminBadge").classList.toggle("hidden", !state.isAdmin);
  $$(".admin-only").forEach(e => e.classList.toggle("hidden", !state.isAdmin));
  $("#adminBtn").classList.toggle("hidden", !!state.user);        // 로그인 중에는 숨김
  $("#userName").classList.toggle("hidden", !state.user);
  $("#userName").innerHTML = state.user ? `${state.adminOnly ? "🛠 " : avatarHtml(state.user.avatar)}${esc(state.user.name)}${state.adminOnly ? "" : " ⚙"}` : "";
  $("#userName").disabled = state.adminOnly;   // 관리자 전용 계정은 프로필 없음
  // 관리자 권한이 있는 구글 계정: 평소엔 일반 모드, 버튼을 눌러야 관리자 모드
  $("#adminModeBtn").classList.toggle("hidden", !(state.canAdmin && !state.adminOnly));
  $("#adminModeBtn").textContent = state.adminMode ? "🛠 관리자 모드 끄기" : "🛠 관리자 모드 켜기";
  $("#adminModeBtn").classList.toggle("ghost", !state.adminMode);
  $("#userBtn").textContent = state.user ? "로그아웃" : "Google 로그인";
  $("#userBtn").classList.toggle("ghost", !!state.user);
}

// ---------- 실시간 구독 ----------
for (const name of ["games", "reviews", "sessions", "profiles"]) {
  backend.subscribe(name, (rows, meta) => {
    state[name] = rows;
    if (name === "games" && !meta?.fromCache) { state.gamesLoaded = true; syncSeedGames(); }
    if (name === "profiles") { state.profilesLoaded = true; applyProfile(); maybePromptProfile(); }
    renderAll();
  }, e => toast("불러오기 실패: " + (e.code || e.message)));
}
function recomputeMode() {
  if (!state.canAdmin) state.adminMode = false;
  state.isAdmin = state.canAdmin && (state.adminOnly || state.adminMode);
  if (!state.adminMode) sessionStorage.removeItem("bg_admin_mode"); else sessionStorage.setItem("bg_admin_mode", "1");
  applyProfile();
}
backend.onAuth(({ user, isAdmin, adminOnly }) => {
  state.rawUser = user; state.canAdmin = !!isAdmin; state.adminOnly = !!adminOnly;
  recomputeMode(); maybePromptProfile(); renderAll();
  syncSeedGames();
});

// 코드(games-seed.js)에 추가한 게임을 관리자 권한 계정이 접속했을 때 서버에 자동 반영 (새 게임만, 이미 반영한 건 지워도 되살리지 않음)
async function syncSeedGames() {
  if (state.seedChecked || !state.canAdmin || !state.gamesLoaded || !Array.isArray(window.SEED_GAMES)) return;
  state.seedChecked = true;
  try {
    const norm = n => n.replace(/\s/g, "").toLowerCase();
    const have = new Set(state.games.map(g => norm(g.name)));
    const synced = await backend.getSyncedSeeds();                       // 처음이면 null → 지금 있는 게임들을 '반영됨'으로 간주
    const done = new Set((synced || state.games.map(g => g.name)).map(norm));
    const todo = window.SEED_GAMES.filter(g => !have.has(norm(g.name)) && !done.has(norm(g.name)));
    const names = [...new Set([...(synced || []), ...state.games.map(g => g.name), ...window.SEED_GAMES.map(g => g.name)])];
    if (!todo.length && synced && names.length === synced.length) return;   // 바뀐 게 없음
    await backend.seedNew(todo, names);
    if (todo.length) toast(`${todo.length}개 게임이 추가되었어요 🎲`);
  } catch (err) {
    console.error("기본 게임 자동 반영 실패", err);
    toast("게임 자동 반영 실패: " + (err.code || err.message));
  }
}

// ---------- 이벤트 ----------
function showTab(name) {
  $$(".tab").forEach(x => x.classList.toggle("active", x.dataset.tab === name));
  $$(".panel").forEach(p => p.classList.toggle("hidden", p.id !== "tab-" + name));
}
$$(".tab").forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));
// 게임 상세 -> 해당 활동 후기 글로 이동(스크롤 + 강조)
function gotoSession(sid) {
  closeModals(); showTab("sessions");
  const el = $$("[data-sid]").find(x => x.dataset.sid === sid);
  if (!el) return toast("해당 활동 후기를 찾을 수 없어요");
  el.scrollIntoView?.({ behavior: "smooth", block: "center" });
  el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2200);
}
$("#searchInput").addEventListener("input", renderGames);
$("#sortSelect").addEventListener("change", renderGames);

function openDetail(id) { state.openGameId = id; state.pendingRating = 0; state.editReviewId = null; renderDetail(); openModal("#detailModal"); }
$("#gameGrid").addEventListener("click", e => { const c = e.target.closest(".card"); if (c) openDetail(c.dataset.id); });
$("#rankList").addEventListener("click", e => { const c = e.target.closest("li"); if (c) openDetail(c.dataset.id); });

document.addEventListener("click", e => {
  if (e.target.matches("[data-close]") || e.target.classList.contains("modal")) closeModals();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModals(); });

// 상세 모달 내부 이벤트 (위임)
$("#detailBody").addEventListener("click", async e => {
  const t = e.target;
  const go = t.closest("[data-goto-session]");
  if (go) return gotoSession(go.dataset.gotoSession);
  if (t.closest("[data-login]")) return requireLogin("로그인하면 이 게임에도 후기와 평점을 남길 수 있어요.", () => renderDetail());
  const si = t.closest(".star-input .si");
  if (si) {   // 별의 왼쪽 절반 = n-0.5점, 오른쪽 절반(또는 별 자체) = n점
    const box = si.closest(".star-input"), editing = box.id === "editStarInput";
    const half = t.closest("[data-v]");
    const v = half ? +half.dataset.v : +si.dataset.n;
    if (editing) state.editRating = v; else state.pendingRating = v;
    $$(".si", box).forEach(el => { const n = +el.dataset.n; el.className = "si " + (v >= n ? "on" : v >= n - 0.5 ? "half" : ""); });
    $(".rating-val", box).textContent = fmtRating(v) + "점";
    return;
  }
  try {
    if (t.dataset.editReview) {   // 본인 후기 수정 시작
      const r = state.reviews.find(x => x.id === t.dataset.editReview);
      if (r) { state.editReviewId = r.id; state.editRating = r.rating; state.editText = r.comment || ""; renderDetail(); }
      return;
    }
    if (t.dataset.cancelEdit !== undefined) { state.editReviewId = null; renderDetail(); return; }
    if (t.dataset.saveReview) {
      if (!state.editRating) return toast("별점을 선택해주세요");
      await backend.updateReview(t.dataset.saveReview, { rating: state.editRating, comment: ($("#editRvText")?.value ?? state.editText).trim() });
      state.editReviewId = null; renderDetail(); toast("후기를 수정했어요 ✏️");
      return;
    }
    if (t.dataset.delReview) {   // 관리자 또는 작성자 본인
      if (confirm("이 후기를 삭제할까요?")) await backend.deleteReview(t.dataset.delReview);
      return;
    }
    if (!state.isAdmin) return;
    if (t.dataset.pc) {
      const g = state.games.find(x => x.id === state.openGameId);
      if ((g.playCount || 0) + +t.dataset.pc < 0) return;
      await backend.bumpPlay(g.id, +t.dataset.pc);
    } else if (t.dataset.delGame) {
      if (confirm("게임을 삭제할까요? (후기는 남아있지만 표시되지 않아요)")) { await backend.deleteGame(t.dataset.delGame); closeModals(); toast("삭제했어요"); }
    } else if (t.dataset.edit) {
      openGameForm(state.games.find(x => x.id === t.dataset.edit));
    }
  } catch (err) { toast("실패: " + err.code); }
});

$("#detailBody").addEventListener("input", e => { if (e.target.id === "editRvText") state.editText = e.target.value; });
$("#detailBody").addEventListener("submit", async e => {
  if (e.target.id !== "reviewForm") return;
  e.preventDefault();
  if (!state.pendingRating) return toast("별점을 선택해주세요");
  const nickname = $("#rvNick").value.trim();
  if (!nickname) return;
  try {
    await backend.addReview({
      gameId: state.openGameId, nickname, rating: state.pendingRating,
      comment: $("#rvText").value.trim(),
      ...(state.user ? { uid: state.user.uid } : {})   // 로그인 상태면 uid 기록(본인 삭제 가능), 게스트는 없음
    });
    localStorage.setItem("bg_nick", nickname);
    state.pendingRating = 0; $("#rvText").value = "";
    toast("후기를 등록했어요 🎉");
  } catch (err) { toast("등록 실패: " + err.code); }
});

// ---------- 로그인 (회원: Google / 관리자: 아이디·비밀번호) ----------
async function googleLogin() {
  try {
    let name;
    if (backend.mode === "local") {            // 로컬 테스트에서는 구글 로그인을 닉네임 입력으로 대체
      name = prompt("[로컬 테스트] Google 로그인 대신 사용할 이름을 입력하세요");
      if (!name) return;
    }
    await backend.loginGoogle(name);
    toast("로그인했어요");
    return true;
  } catch (err) { toast("로그인 실패: " + (err.code || err.message)); }
}
// 로그인이 필요한 기능을 눌렀을 때: 안내 창을 띄우고, 로그인에 성공하면 하려던 동작을 이어서 실행
let pendingAfterLogin = null;
function requireLogin(msg, then) {
  if (state.user) { then?.(); return true; }
  pendingAfterLogin = then || null;
  $("#loginPromptMsg").textContent = msg || "이 기능은 로그인 후 사용할 수 있어요.";
  openModal("#loginPromptModal");
  return false;
}
$("#loginPromptBtn").addEventListener("click", async () => {
  if (!(await googleLogin())) return;
  $("#loginPromptModal").classList.add("hidden");
  if ($$(".modal").every(m => m.classList.contains("hidden"))) document.body.style.overflow = "";
  for (let i = 0; i < 20 && !state.user; i++) await new Promise(r => setTimeout(r, 100));   // 로그인 상태 반영 대기
  await new Promise(r => setTimeout(r, 60));   // 첫 로그인이면 프로필 설정 창이 먼저 뜰 시간을 줌
  const cb = pendingAfterLogin; pendingAfterLogin = null;
  // 첫 로그인이라 프로필 설정 창이 떠 있으면 그것부터 마치게 하고 이어가지 않음
  if (cb && state.user && $("#profileModal").classList.contains("hidden")) cb();
});
$("#adminModeBtn").addEventListener("click", () => {
  state.adminMode = !state.adminMode; recomputeMode(); renderAll();
  toast(state.adminMode ? "관리자 모드를 켰어요" : "일반 모드로 돌아왔어요");
});
$("#userBtn").addEventListener("click", async () => {
  if (state.user) { state.adminMode = false; await backend.logout(); toast("로그아웃했어요"); return; }
  googleLogin();
});
$("#adminBtn").addEventListener("click", async () => {
  if (state.isAdmin) { await backend.logout(); toast("로그아웃했어요"); return; }
  $("#loginError").textContent = ""; openModal("#loginModal");
});
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await backend.login(f.get("email").trim(), f.get("password"));
    e.target.reset(); closeModals(); toast("관리자로 로그인했어요");
  } catch { $("#loginError").textContent = "아이디 또는 비밀번호가 올바르지 않아요."; }
});

// ---------- 프로필 설정 (헤더의 프로필 칩에서 언제든 변경) ----------
function maybePromptProfile() {   // 로그인했는데 프로필이 아직 없으면 최초 1회 설정 창을 띄움
  const r = state.rawUser;
  if (!r || state.adminOnly || !state.profilesLoaded || profileOf(r.uid) || state.promptedFor === r.uid) return;
  state.promptedFor = r.uid;
  setTimeout(() => openProfile(), 0);
}
function renderProfileForm() {
  $("#profilePreview").innerHTML = avatarHtml(state.pAvatar, "xl");
  $("#avatarGrid").innerHTML = AVATARS.map(a =>
    `<button type="button" class="avatar-opt ${state.pAvatar === "preset:" + a.id ? "on" : ""}" data-av="preset:${a.id}" title="${a.n}">${avatarHtml("preset:" + a.id)}<span>${a.n}</span></button>`).join("");
}
function openProfile() {
  if (!state.rawUser || state.adminOnly) return;
  const p = profileOf(state.rawUser.uid);
  $("#profileForm").elements.name.value = p?.name || state.rawUser.name || "";
  state.pAvatar = p?.avatar || "preset:" + AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
  renderProfileForm();
  openModal("#profileModal");
}
$("#userName").addEventListener("click", openProfile);
$("#avatarGrid").addEventListener("click", e => {
  const b = e.target.closest("[data-av]"); if (!b) return;
  state.pAvatar = b.dataset.av; renderProfileForm();
});
$("#avatarFile").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  try { state.pAvatar = await compressImage(file, 128, 0.8); renderProfileForm(); }
  catch { toast("이미지를 읽지 못했어요"); }
});
$("#profileForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = e.target.elements.name.value.trim();
  if (!name) return toast("이름을 입력해주세요");
  try {
    await backend.saveProfile({ name, avatar: state.pAvatar });
    closeModals(); toast("프로필을 저장했어요 ✨");
  } catch (err) { toast("저장 실패: " + (err.code || err.message)); }
});

// ---------- 게임 추가/수정 ----------
function openGameForm(g) {
  state.editGameId = g?.id || null;
  const f = $("#gameForm"); f.reset();
  $("#gameModalTitle").textContent = g ? "게임 수정" : "게임 추가";
  if (g) {
    f.elements.name.value = g.name; f.elements.players.value = g.players || ""; f.elements.bestPlayers.value = g.bestPlayers || ""; f.elements.time.value = g.time || "";
    f.elements.rules.value = g.rules || ""; f.elements.imageUrl.value = g.image && !g.image.startsWith("data:") ? g.image : "";
  }
  $("#detailModal").classList.add("hidden");
  openModal("#gameModal");
}
$("#addGameBtn").addEventListener("click", () => openGameForm(null));

function compressImage(file, max = 640, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject; img.src = url;
  });
}

$("#gameForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector("[type=submit]");
  btn.disabled = true;
  try {
    const data = { name: f.elements.name.value.trim(), players: f.elements.players.value.trim(), bestPlayers: f.elements.bestPlayers.value.trim(), time: f.elements.time.value.trim(), rules: f.elements.rules.value.trim() };
    const file = f.elements.imageFile.files[0];
    if (file) data.image = await compressImage(file);
    else if (f.elements.imageUrl.value.trim()) data.image = f.elements.imageUrl.value.trim();
    await backend.saveGame(state.editGameId, data);
    closeModals(); toast("저장했어요");
  } catch (err) { toast("저장 실패: " + (err.code || err.message)); }
  btn.disabled = false;
});

// ---------- 활동 후기 (로그인 필요 / 본인만 수정·삭제 / 사진 첨부) ----------
const MAX_PHOTOS = 4, MAX_PHOTO_CHARS = 850000;   // Firestore 문서 1MB 제한 대비
const toLocalInput = ts => {
  const d = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
function renderPhotoPreview() {
  $("#photoPreview").innerHTML = state.photos.map((p, i) =>
    `<div class="ph"><img src="${esc(p)}" alt=""><button type="button" data-rm-photo="${i}" title="삭제">×</button></div>`).join("");
}
function openSessionForm(s) {
  const f = $("#sessionForm"); f.reset();
  state.editSessionId = s?.id || null;
  state.photos = [...(s?.photos || [])];
  $("#sessionModalTitle").textContent = s ? "활동 후기 수정" : "활동 후기 쓰기";
  f.elements.date.value = toLocalInput(s ? s.date : Date.now());
  f.elements.attendees.value = (s?.attendees || []).join(", ");
  f.elements.episode.value = s?.episode || "";
  const selected = new Set(s?.gameIds || []);
  $("#sessionGameChecks").innerHTML = [...state.games].sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map(g => `<label><input type="checkbox" value="${g.id}" ${selected.has(g.id) ? "checked" : ""}> ${esc(g.name)}</label>`).join("") || `<span class="hint">등록된 게임이 없어요</span>`;
  $("#bumpRow").classList.toggle("hidden", !(state.isAdmin && !s));   // 플레이 횟수 반영은 관리자 + 새 글일 때만
  renderPhotoPreview();
  openModal("#sessionModal");
}
$("#addSessionBtn").addEventListener("click", () => requireLogin("활동 후기를 쓰려면 로그인이 필요해요.", () => openSessionForm(null)));
$("#photoInput").addEventListener("change", async e => {
  const files = [...e.target.files]; e.target.value = "";
  for (const file of files) {
    if (state.photos.length >= MAX_PHOTOS) { toast(`사진은 최대 ${MAX_PHOTOS}장까지예요`); break; }
    try { state.photos.push(await compressImage(file, 800, 0.65)); } catch { toast("이미지를 읽지 못했어요"); }
  }
  renderPhotoPreview();
});
$("#photoPreview").addEventListener("click", e => {
  const i = e.target.dataset.rmPhoto;
  if (i !== undefined) { state.photos.splice(+i, 1); renderPhotoPreview(); }
});
$("#sessionForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  if (!state.user) return toast("로그인이 필요해요");
  if (state.photos.join("").length > MAX_PHOTO_CHARS) return toast("사진 용량이 너무 커요. 장수를 줄여주세요");
  const data = {
    date: new Date(f.elements.date.value),
    attendees: f.elements.attendees.value.split(",").map(s => s.trim()).filter(Boolean),
    gameIds: $$("#sessionGameChecks input:checked").map(i => i.value),
    episode: f.elements.episode.value.trim(),
    photos: state.photos
  };
  try {
    if (state.editSessionId) await backend.updateSession(state.editSessionId, data);
    else await backend.addSession({ ...data, authorUid: state.user.uid, authorName: state.user.name }, state.isAdmin && f.elements.bump.checked);
    closeModals(); toast(state.editSessionId ? "후기를 수정했어요" : "후기를 등록했어요 🎉");
  } catch (err) { toast("저장 실패: " + (err.code || err.message)); }
});
$("#sessionList").addEventListener("click", async e => {
  const t = e.target;
  const pill = t.closest("[data-game]");
  if (pill) { showTab("games"); window.scrollTo({ top: 0 }); return openDetail(pill.dataset.game); }
  try {
    if (t.dataset.delSession) {
      if (confirm("이 활동 후기를 삭제할까요?")) await backend.deleteSession(t.dataset.delSession);
    } else if (t.dataset.editSession) {
      openSessionForm(state.sessions.find(s => s.id === t.dataset.editSession));
    } else if (t.dataset.photo) {
      const [sid, idx] = t.dataset.photo.split(":");
      const src = state.sessions.find(s => s.id === sid)?.photos?.[+idx];
      if (src && safeImg(src)) { $("#photoBig").src = src; openModal("#photoModal"); }
    }
  } catch (err) { toast("실패: " + (err.code || err.message)); }
});

renderAll();
})().catch(err => { console.error(err); const n = document.getElementById('setupNotice'); if (n) { n.textContent = '시작 오류: ' + err.message; n.classList.remove('hidden'); } });
