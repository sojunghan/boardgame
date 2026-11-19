// 로컬 테스트용 백엔드: 데이터를 이 브라우저의 localStorage에 저장합니다. (서버 불필요)
// 구글 로그인은 로컬에서는 흉내만 냅니다(닉네임 입력으로 대체).
(function () {
  const KEY = "bgclub_local_v1", USER_KEY = "bgclub_local_user", ADMIN_KEY = "bgclub_local_admin", SEEDED_KEY = "bgclub_local_seeded";
  const empty = () => ({ games: [], reviews: [], sessions: [], logs: [], profiles: [] });
  const load = () => { try { return Object.assign(empty(), JSON.parse(localStorage.getItem(KEY))); } catch { return empty(); } };
  const save = d => localStorage.setItem(KEY, JSON.stringify(d));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const nowTs = () => ({ seconds: Math.floor(Date.now() / 1000) });
  const denied = () => Object.assign(new Error("권한 없음"), { code: "permission-denied" });
  const sTitle = s => { const d = new Date(s.date); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${(s.episode || "").slice(0, 30)}`.trim(); };

  window.createLocalBackend = function createLocalBackend(admin) {
    const subs = { games: [], reviews: [], sessions: [], logs: [], profiles: [] };
    const authSubs = [];

    // 로컬 테스트 편의: 이 브라우저에서 처음 열 때 게임이 하나도 없으면 기본 36개를 자동 등록 (1회만)
    if (!localStorage.getItem(SEEDED_KEY) && Array.isArray(window.SEED_GAMES)) {
      const d = load();
      if (d.games.length === 0) {
        window.SEED_GAMES.forEach((g, i) => d.games.push({ id: uid(), image: "", playCount: 0, createdAt: { seconds: Math.floor(Date.now() / 1000) - i }, ...g }));
        save(d);
      }
      localStorage.setItem(SEEDED_KEY, "1");
    }
    const view = (name, rows) => {
      const r = rows.map(x => ({ ...x }));
      if (name === "games") r.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      if (name === "sessions") r.sort((a, b) => b.date - a.date);
      if (name === "logs") r.sort((a, b) => b.createdAt - a.createdAt);
      return r;
    };
    const emit = () => { const d = load(); for (const k in subs) subs[k].forEach(cb => cb(view(k, d[k]))); };
    const isAdmin = () => localStorage.getItem(ADMIN_KEY) === "1";
    const member = () => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } };
    const me = () => {
      if (isAdmin()) return { uid: "admin", name: "관리자" };
      const m = member(); if (!m) return null;
      const p = load().profiles.find(x => x.id === m.uid);   // 프로필이 있으면 프로필 이름 우선
      return p ? { ...m, name: p.name || m.name } : m;
    };
    const authState = () => ({ user: me(), isAdmin: isAdmin() });
    const emitAuth = () => authSubs.forEach(cb => cb(authState()));
    window.addEventListener("storage", e => { if ([KEY, USER_KEY, ADMIN_KEY].includes(e.key)) { emit(); emitAuth(); } });
    const mutate = fn => { const d = load(); fn(d); save(d); emit(); };
    const needAdmin = () => { if (!isAdmin()) throw denied(); };
    const needUser = () => { const u = me(); if (!u) throw denied(); return u; };
    const isOwner = row => !!me() && row.authorUid === me().uid;

    // 활동 로그 기록 (작성/수정/삭제/복원 등)
    function log(d, action, targetType, targetId, title, detail = "", actorName) {
      const u = me();
      d.logs.push({
        id: uid(), action, targetType, targetId: targetId || "",
        title: String(title || "").slice(0, 120), detail: String(detail).slice(0, 300),
        actorUid: u ? u.uid : null, actorName: actorName || (u ? u.name : "게스트"), createdAt: Date.now()
      });
      if (d.logs.length > 500) d.logs = d.logs.slice(-500);
    }

    return {
      mode: "local",
      subscribe(name, cb) { subs[name].push(cb); cb(view(name, load()[name])); },
      onAuth(cb) { authSubs.push(cb); cb(authState()); },
      async login(id, pw) {
        if (id !== admin.id || pw !== admin.password) throw new Error("bad credentials");
        localStorage.setItem(ADMIN_KEY, "1"); emitAuth();
      },
      async loginGoogle(name) {
        name = (name || "").trim();
        if (!name) throw new Error("이름 필요");
        localStorage.setItem(USER_KEY, JSON.stringify({ uid: "local-" + name, name, photo: "" })); emitAuth();
      },
      // 프로필(이름/아이콘): 로그인한 본인 것만 저장
      async saveProfile(data) {
        const u = member();
        if (!u || isAdmin()) throw denied();
        mutate(d => {
          const p = d.profiles.find(x => x.id === u.uid);
          const next = { name: String(data.name || "").slice(0, 12), avatar: String(data.avatar || ""), updatedAt: nowTs() };
          if (p) Object.assign(p, next); else d.profiles.push({ id: u.uid, ...next });
        });
        emitAuth();
      },
      async logout() { localStorage.removeItem(ADMIN_KEY); localStorage.removeItem(USER_KEY); emitAuth(); },

      async saveGame(id, data) {
        needAdmin();
        mutate(d => {
          if (id) {
            const g = d.games.find(x => x.id === id) || {};
            log(d, "game.edit", "game", id, g.name || data.name, Object.keys(data).filter(k => k !== "image").join(", ") + (data.image ? ", image" : ""));
            Object.assign(g, data);
          } else {
            const nid = uid();
            d.games.push({ id: nid, image: "", playCount: 0, createdAt: nowTs(), ...data });
            log(d, "game.create", "game", nid, data.name);
          }
        });
      },
      async deleteGame(id) {
        needAdmin();
        mutate(d => { const g = d.games.find(x => x.id === id); log(d, "game.delete", "game", id, g?.name); d.games = d.games.filter(x => x.id !== id); });
      },
      async bumpPlay(id, delta) {
        needAdmin();
        mutate(d => {
          const g = d.games.find(x => x.id === id);
          if (g) { g.playCount = Math.max(0, (g.playCount || 0) + delta); log(d, "game.playcount", "game", id, g.name, `${delta > 0 ? "+" : ""}${delta} → ${g.playCount}회`); }
        });
      },

      // 게임 후기: 게스트 작성 가능(uid 없음). 로그인 상태면 uid가 붙어 본인이 삭제 가능.
      async addReview(r) {
        const d0 = load(); const g = d0.games.find(x => x.id === r.gameId);
        if (!g) throw denied();
        if (!me() && !(g.playCount > 0)) throw denied();   // 게스트는 플레이한 게임만, 로그인하면 모든 게임
        if (r.uid && (!me() || me().uid !== r.uid)) throw denied();
        mutate(d => {
          const nid = uid();
          d.reviews.push({ id: nid, ...r, createdAt: nowTs() });
          log(d, "review.create", "review", nid, `${g.name} · ${r.nickname}`, `★${r.rating} ${(r.comment || "").slice(0, 100)}`, me() ? undefined : `${r.nickname} (게스트)`);
        });
      },
      async deleteReview(id) {
        const r = load().reviews.find(x => x.id === id);
        if (!r || !(isAdmin() || (r.uid && me() && r.uid === me().uid))) throw denied();
        mutate(d => {
          const g = d.games.find(x => x.id === r.gameId);
          log(d, "review.delete", "review", id, `${g?.name || "?"} · ${r.nickname}`, `★${r.rating} ${(r.comment || "").slice(0, 100)}`);
          d.reviews = d.reviews.filter(x => x.id !== id);
        });
      },

      // 활동 후기: 로그인한 사람만 작성, 본인(또는 관리자)만 수정/삭제. 삭제는 '숨김'이며 관리자가 복원 가능.
      async addSession(s, bump) {
        const u = needUser();
        if (s.authorUid !== u.uid) throw denied();
        mutate(d => {
          const nid = uid();
          const row = { id: nid, ...s, date: s.date.getTime(), createdAt: nowTs() };
          d.sessions.push(row);
          log(d, "session.create", "session", nid, sTitle(row), `사진 ${(s.photos || []).length}장`);
          if (bump && isAdmin()) s.gameIds.forEach(gid => {
            const g = d.games.find(x => x.id === gid);
            if (g) { g.playCount = (g.playCount || 0) + 1; log(d, "game.playcount", "game", gid, g.name, `+1 → ${g.playCount}회 (활동 후기 반영)`); }
          });
        });
      },
      async updateSession(id, data) {
        const row = load().sessions.find(x => x.id === id);
        if (!row || !(isAdmin() || (isOwner(row) && !row.deletedAt))) throw denied();
        mutate(d => {
          const t = d.sessions.find(x => x.id === id);
          Object.assign(t, data, data.date ? { date: data.date.getTime() } : {}, { editedAt: nowTs() });
          log(d, "session.edit", "session", id, sTitle(t), `사진 ${(t.photos || []).length}장`);
        });
      },
      async deleteSession(id) {   // 소프트 삭제
        const row = load().sessions.find(x => x.id === id);
        if (!row || row.deletedAt || !(isAdmin() || isOwner(row))) throw denied();
        mutate(d => {
          const t = d.sessions.find(x => x.id === id);
          t.deletedAt = nowTs(); t.deletedByName = me().name;
          log(d, "session.delete", "session", id, sTitle(t), `작성자: ${t.authorName || "?"}`);
        });
      },
      async restoreSession(id) {
        needAdmin();
        mutate(d => { const t = d.sessions.find(x => x.id === id); if (!t) return; t.deletedAt = null; t.deletedByName = ""; log(d, "session.restore", "session", id, sTitle(t)); });
      },
      async purgeSession(id) {
        needAdmin();
        mutate(d => { const t = d.sessions.find(x => x.id === id); if (t) log(d, "session.purge", "session", id, sTitle(t), "영구 삭제"); d.sessions = d.sessions.filter(x => x.id !== id); });
      },
      async seed(list) {
        needAdmin();
        mutate(d => {
          list.forEach((g, i) => d.games.push({ id: uid(), image: "", playCount: 0, createdAt: { seconds: Math.floor(Date.now() / 1000) - i }, ...g }));
          log(d, "game.seed", "game", "", "기본 게임 일괄 등록", `${list.length}개`);
        });
      }
    };
  };
})();
