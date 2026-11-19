(async () => {
const { BACKEND, LOCAL_ADMIN, firebaseConfig, ADMIN_EMAIL, ADMIN_GOOGLE_EMAILS, GOOGLE_CLIENT_ID } = window.BG_CONFIG;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeImg = u => (/^(https?:\/\/|data:image\/)/i.test(u || "") ? u : "");
const state = { isAdmin: false, sessions: [], logs: [], subscribed: false };

let backend;
try {
  backend = BACKEND === "firebase"
    ? await (await import("./backend-firebase.js")).createFirebaseBackend(firebaseConfig, ADMIN_EMAIL, ADMIN_GOOGLE_EMAILS, GOOGLE_CLIENT_ID)
    : window.createLocalBackend(LOCAL_ADMIN);
} catch (err) {
  $("#setupNotice").innerHTML = "<b>백엔드를 불러오지 못했어요.</b> " + esc(err.message);
  $("#setupNotice").classList.remove("hidden"); throw err;
}
if (backend.mode === "local") {
  $("#setupNotice").innerHTML = `<b>🧪 로컬 테스트 모드</b> — 관리자 로그인: <code>${esc(LOCAL_ADMIN.id)}</code> / <code>${esc(LOCAL_ADMIN.password)}</code>`;
  $("#setupNotice").classList.remove("hidden");
}

// ---------- 유틸 ----------
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add("hidden"), 2200);
}
const toDate = ts => ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : (ts ? new Date(ts) : null);
const p2 = n => String(n).padStart(2, "0");
const fmt = ts => { const d = toDate(ts); return d ? `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}` : "-"; };
const fmtSec = ts => { const d = toDate(ts); return d ? `${fmt(ts)}:${p2(d.getSeconds())}` : "-"; };
const fmtDateTime = ts => { const d = toDate(ts); return `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} (${"일월화수목금토"[d.getDay()]}) ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
function openModal(id) { $(id).classList.remove("hidden"); document.body.style.overflow = "hidden"; }
function closeModals() { $$(".modal").forEach(m => m.classList.add("hidden")); document.body.style.overflow = ""; }

const ACTIONS = {
  "session.create": ["활동 후기 작성", "c"], "session.edit": ["활동 후기 수정", "e"],
  "session.delete": ["활동 후기 삭제", "d"], "session.restore": ["활동 후기 복원", "r"], "session.purge": ["활동 후기 영구삭제", "d"],
  "review.create": ["게임 후기 작성", "c"], "review.edit": ["게임 후기 수정", "e"], "review.delete": ["게임 후기 삭제", "d"],
  "game.create": ["게임 추가", "c"], "game.edit": ["게임 수정", "e"], "game.delete": ["게임 삭제", "d"],
  "game.playcount": ["플레이 횟수 변경", "e"], "game.seed": ["게임 일괄 등록", "c"]
};

// ---------- 렌더 ----------
function render() {
  $("#gate").classList.toggle("hidden", state.isAdmin);
  $("#adminTabs").classList.toggle("hidden", !state.isAdmin);
  $("#adminBadge").classList.toggle("hidden", !state.isAdmin);
  $("#logoutBtn").classList.toggle("hidden", !state.isAdmin);
  const active = $(".tab.active")?.dataset.tab || "deleted";
  $("#tab-deleted").classList.toggle("hidden", !state.isAdmin || active !== "deleted");
  $("#tab-logs").classList.toggle("hidden", !state.isAdmin || active !== "logs");
  if (!state.isAdmin) return;
  renderDeleted(); renderLogs();
}

function renderDeleted() {
  const rows = state.sessions.filter(s => s.deletedAt)
    .sort((a, b) => (toDate(b.deletedAt) || 0) - (toDate(a.deletedAt) || 0));
  $("#deletedCount").textContent = rows.length ? `(${rows.length})` : "";
  $("#deletedList").innerHTML = rows.length ? rows.map(s => `
    <article class="session deleted">
      <h3>📅 ${fmtDateTime(s.date)}</h3>
      <div class="meta"><span>✍️ ${esc(s.authorName || "익명")}</span><span>🗑 ${fmt(s.deletedAt)} · ${esc(s.deletedByName || "?")} 삭제</span>
        <span>👥 ${(s.attendees || []).length}명${(s.attendees || []).length ? ": " + esc(s.attendees.join(", ")) : ""}</span></div>
      ${s.episode ? `<p>${esc(s.episode)}</p>` : ""}
      ${(s.photos || []).length ? `<div class="photos">${s.photos.map((p, i) => safeImg(p) ? `<img src="${esc(p)}" data-photo="${esc(s.id)}:${i}" alt="" loading="lazy">` : "").join("")}</div>` : ""}
      <div style="margin-top:10px"><button class="btn small" data-restore="${esc(s.id)}">↩ 복원</button>
        <button class="btn danger small" data-purge="${esc(s.id)}">영구 삭제</button></div>
    </article>`).join("") : `<div class="empty">삭제된 활동 후기가 없어요.</div>`;
}

function renderLogs() {
  const f = $("#logFilter").value, q = $("#logSearch").value.trim().toLowerCase();
  const rows = state.logs.filter(l => (!f || l.action.startsWith(f)) &&
    (!q || [l.actorName, l.title, l.detail].some(v => (v || "").toLowerCase().includes(q))));
  $("#logBody").innerHTML = rows.length ? rows.map(l => {
    const [label, kind] = ACTIONS[l.action] || [l.action, "e"];
    return `<tr><td class="nowrap">${fmtSec(l.createdAt)}</td><td>${esc(l.actorName || "게스트")}</td>
      <td><span class="act ${kind}">${esc(label)}</span></td><td>${esc(l.title)}</td><td class="detail">${esc(l.detail)}</td></tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">기록이 없어요.</td></tr>`;
}

// ---------- 데이터/인증 ----------
function startSubscriptions() {   // 로그는 관리자만 읽을 수 있으므로 로그인 후에 구독
  if (state.subscribed) return; state.subscribed = true;
  backend.subscribe("sessions", rows => { state.sessions = rows; render(); }, e => toast("불러오기 실패: " + (e.code || e.message)));
  backend.subscribe("logs", rows => { state.logs = rows; render(); }, e => toast("로그 불러오기 실패: " + (e.code || e.message)));
}
backend.onAuth(({ isAdmin }) => { state.isAdmin = isAdmin; if (isAdmin) startSubscriptions(); render(); });

// ---------- 이벤트 ----------
$$(".tab").forEach(t => t.addEventListener("click", () => {
  $$(".tab").forEach(x => x.classList.toggle("active", x === t)); render();
}));
$("#logFilter").addEventListener("change", renderLogs);
$("#logSearch").addEventListener("input", renderLogs);
$("#gAdminBtn").addEventListener("click", async () => {
  try {
    if (backend.mode === "local") return toast("로컬 테스트 모드에서는 아이디/비밀번호로 로그인하세요");
    await backend.loginGoogle();
    // 관리자 지정 계정이 아니면 안내 후 로그아웃
    setTimeout(async () => { if (!state.isAdmin) { await backend.logout(); $("#loginError").textContent = "이 구글 계정은 관리자로 등록되어 있지 않아요."; } }, 800);
  } catch (err) { toast("로그인 실패: " + (err.code || err.message)); }
});
$("#logoutBtn").addEventListener("click", async () => { await backend.logout(); toast("로그아웃했어요"); });
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try { await backend.login(f.get("email").trim(), f.get("password")); e.target.reset(); $("#loginError").textContent = ""; }
  catch { $("#loginError").textContent = "아이디 또는 비밀번호가 올바르지 않아요."; }
});
$("#deletedList").addEventListener("click", async e => {
  const t = e.target;
  try {
    if (t.dataset.restore) { await backend.restoreSession(t.dataset.restore); toast("복원했어요 ↩"); }
    else if (t.dataset.purge) { if (confirm("영구 삭제하면 되돌릴 수 없어요. 삭제할까요?")) { await backend.purgeSession(t.dataset.purge); toast("영구 삭제했어요"); } }
    else if (t.dataset.photo) {
      const [sid, idx] = t.dataset.photo.split(":");
      const src = state.sessions.find(s => s.id === sid)?.photos?.[+idx];
      if (src && safeImg(src)) { $("#photoBig").src = src; openModal("#photoModal"); }
    }
  } catch (err) { toast("실패: " + (err.code || err.message)); }
});
document.addEventListener("click", e => { if (e.target.matches("[data-close]") || e.target.classList.contains("modal")) closeModals(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModals(); });

render();
})().catch(err => { console.error(err); const n = document.getElementById("setupNotice"); if (n) { n.textContent = "시작 오류: " + err.message; n.classList.remove("hidden"); } });
