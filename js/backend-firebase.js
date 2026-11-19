// 실서버용 백엔드: Firebase(Firestore + Auth). 회원은 구글 로그인, 관리자는 이메일/비밀번호.
export async function createFirebaseBackend(firebaseConfig, adminEmail, adminGoogleEmails = [], googleClientId = "") {
  const V = "9.23.0", base = `https://www.gstatic.com/firebasejs/${V}/`;
  const { initializeApp } = await import(base + "firebase-app.js");
  const fs = await import(base + "firebase-firestore.js");
  const au = await import(base + "firebase-auth.js");
  const { getFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, increment, query, orderBy, limit, writeBatch, Timestamp } = fs;

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app), auth = au.getAuth(app);
  // 구글 로그인 창(Google Identity Services)을 미리 불러 둠: 클릭 즉시 팝업이 열려야 차단되지 않아요.
  const gisReady = googleClientId ? new Promise(res => {
    if (window.google?.accounts?.oauth2) return res(true);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => res(true); s.onerror = () => res(false);
    document.head.appendChild(s);
  }) : Promise.resolve(false);
  const gisAccessToken = () => new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId, scope: "openid email profile", prompt: "select_account",
      callback: r => r.error ? reject(Object.assign(new Error(r.error_description || r.error), { code: "auth/" + r.error })) : resolve(r.access_token),
      error_callback: e => reject(Object.assign(new Error(e?.message || e?.type || "popup error"), { code: e?.type === "popup_closed" ? "auth/popup-closed-by-user" : "auth/" + (e?.type || "gis-error"), gis: true }))
    });
    client.requestAccessToken();
  });

  const cache = { games: [], reviews: [], sessions: [], profiles: [] };   // 로그 제목/작성자 이름 생성용 최신 데이터

  // 관리자 판정: 이메일/비밀번호 관리자 계정, 또는 구글이 이메일을 인증한 지정 계정
  const isAdminUser = u => !!u && (u.email === adminEmail || (adminGoogleEmails.includes(u.email) && u.emailVerified === true));
  const toDate = ts => ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  const sTitle = s => { const d = toDate(s.date); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${(s.episode || "").slice(0, 30)}`.trim(); };
  const curName = () => {
    const u = auth.currentUser; if (!u) return null;
    if (u.email === adminEmail) return "관리자";   // 이메일/비밀번호 관리자 전용 계정만 "관리자"로 표기
    return cache.profiles.find(p => p.id === u.uid)?.name || u.displayName || "회원";
  };

  // 활동 로그 (실패해도 본 작업에는 영향 없음)
  async function log(action, targetType, targetId, title, detail = "", actorName) {
    const u = auth.currentUser;
    try {
      await addDoc(collection(db, "logs"), {
        action, targetType, targetId: targetId || "",
        title: String(title || "").slice(0, 120), detail: String(detail).slice(0, 300),
        actorUid: u ? u.uid : null, actorName: actorName || curName() || "게스트", createdAt: serverTimestamp()
      });
    } catch (e) { console.warn("로그 기록 실패", e); }
  }
  const find = (name, id) => cache[name].find(x => x.id === id);

  return {
    mode: "firebase",
    subscribe(name, cb, onErr) {
      const q = name === "games" ? query(collection(db, "games"), orderBy("createdAt", "desc"))
        : name === "sessions" ? query(collection(db, "sessions"), orderBy("date", "desc"))
        : name === "logs" ? query(collection(db, "logs"), orderBy("createdAt", "desc"), limit(300))
        : collection(db, name);
      onSnapshot(q, s => {
        const rows = s.docs.map(d => ({ id: d.id, ...d.data() }));
        if (cache[name]) cache[name] = rows;
        cb(rows, { fromCache: s.metadata.fromCache });
      }, onErr);
    },
    onAuth(cb) {
      au.onAuthStateChanged(auth, u => {
        const adminOnly = !!u && u.email === adminEmail;   // 이메일/비밀번호 관리자 전용 계정
        cb({
          isAdmin: isAdminUser(u),   // 관리자 권한 보유 여부 (구글 관리자 계정은 앱에서 '관리자 모드'를 켜야 실제로 사용)
          adminOnly,
          user: u ? { uid: u.uid, name: adminOnly ? "관리자" : (u.displayName || "회원"), photo: u.photoURL || "" } : null
        });
      });
    },
    async saveProfile(data) {   // 로그인한 본인 문서(profiles/{uid})만 저장
      const u = auth.currentUser; if (!u) throw Object.assign(new Error("로그인 필요"), { code: "unauthenticated" });
      await setDoc(doc(db, "profiles", u.uid), { name: String(data.name || "").slice(0, 12), avatar: String(data.avatar || ""), updatedAt: serverTimestamp() }, { merge: true });
    },
    login: (id, pw) => au.signInWithEmailAndPassword(auth, id, pw),
    async loginGoogle() {
      // 1) 구글 로그인 창을 직접 사용 (Firebase 인증 처리 페이지를 거치지 않아 다른 도메인에서도 안정적)
      if (googleClientId && await gisReady) {
        try {
          const token = await gisAccessToken();
          return await au.signInWithCredential(auth, au.GoogleAuthProvider.credential(null, token));
        } catch (e) {
          if (e.code === "auth/popup-closed-by-user") throw e;   // 사용자가 직접 닫음
          console.warn("구글 로그인 창 실패, 기존 방식으로 재시도", e);
        }
      }
      // 2) 기존 방식(Firebase 팝업)
      return au.signInWithPopup(auth, new au.GoogleAuthProvider());
    },
    logout: () => au.signOut(auth),

    async saveGame(id, data) {
      if (id) {
        await updateDoc(doc(db, "games", id), data);
        log("game.edit", "game", id, find("games", id)?.name || data.name, Object.keys(data).filter(k => k !== "image").join(", ") + (data.image ? ", image" : ""));
      } else {
        const ref = await addDoc(collection(db, "games"), { image: "", playCount: 0, ...data, createdAt: serverTimestamp() });
        log("game.create", "game", ref.id, data.name);
      }
    },
    async deleteGame(id) { const n = find("games", id)?.name; await deleteDoc(doc(db, "games", id)); log("game.delete", "game", id, n); },
    async bumpPlay(id, delta) {
      await updateDoc(doc(db, "games", id), { playCount: increment(delta) });
      const g = find("games", id); log("game.playcount", "game", id, g?.name, `${delta > 0 ? "+" : ""}${delta} → ${Math.max(0, (g?.playCount || 0) + delta)}회`);
    },

    async addReview(r) {
      const ref = await addDoc(collection(db, "reviews"), { ...r, createdAt: serverTimestamp() });
      log("review.create", "review", ref.id, `${find("games", r.gameId)?.name || "?"} · ${r.nickname}`, `★${r.rating} ${(r.comment || "").slice(0, 100)}`, auth.currentUser ? undefined : `${r.nickname} (게스트)`);
    },
    async updateReview(id, data) {   // 본인 후기만 별점/내용 수정 (규칙에서도 검사)
      const comment = String(data.comment || "").slice(0, 500);
      await updateDoc(doc(db, "reviews", id), { rating: data.rating, comment, editedAt: serverTimestamp() });
      const r = find("reviews", id);
      log("review.edit", "review", id, `${find("games", r?.gameId)?.name || "?"} · ${r?.nickname || "?"}`, `★${data.rating} ${comment.slice(0, 100)}`);
    },
    async deleteReview(id) {
      const r = find("reviews", id);
      await deleteDoc(doc(db, "reviews", id));
      log("review.delete", "review", id, `${find("games", r?.gameId)?.name || "?"} · ${r?.nickname || "?"}`, r ? `★${r.rating} ${(r.comment || "").slice(0, 100)}` : "");
    },

    async addSession(s, bump) {
      const batch = writeBatch(db);
      const ref = doc(collection(db, "sessions"));
      batch.set(ref, { ...s, date: Timestamp.fromDate(s.date), createdAt: serverTimestamp() });
      if (bump) s.gameIds.forEach(id => batch.update(doc(db, "games", id), { playCount: increment(1) }));
      await batch.commit();
      log("session.create", "session", ref.id, sTitle(s), `사진 ${(s.photos || []).length}장`);
      if (bump) s.gameIds.forEach(id => { const g = find("games", id); log("game.playcount", "game", id, g?.name, `+1 → ${(g?.playCount || 0) + 1}회 (활동 후기 반영)`); });
    },
    async updateSession(id, data) {
      await updateDoc(doc(db, "sessions", id), { ...data, ...(data.date ? { date: Timestamp.fromDate(data.date) } : {}), editedAt: serverTimestamp() });
      log("session.edit", "session", id, sTitle({ ...(find("sessions", id) || {}), ...data }), `사진 ${(data.photos || []).length}장`);
    },
    async deleteSession(id) {   // 소프트 삭제: 목록에서만 숨기고 관리자가 복원할 수 있게 보관
      const s = find("sessions", id);
      await updateDoc(doc(db, "sessions", id), { deletedAt: serverTimestamp(), deletedByName: curName() || "" });
      log("session.delete", "session", id, s ? sTitle(s) : "", `작성자: ${s?.authorName || "?"}`);
    },
    async restoreSession(id) {
      const s = find("sessions", id);
      await updateDoc(doc(db, "sessions", id), { deletedAt: null, deletedByName: "" });
      log("session.restore", "session", id, s ? sTitle(s) : "");
    },
    async purgeSession(id) {
      const s = find("sessions", id);
      await deleteDoc(doc(db, "sessions", id));
      log("session.purge", "session", id, s ? sTitle(s) : "", "영구 삭제");
    },
    // 코드(games-seed.js)의 기본 게임 자동 반영용
    async getSyncedSeeds() {
      const snap = await getDoc(doc(db, "meta", "seedState"));
      return snap.exists() ? (snap.data().names || []) : null;
    },
    async seedNew(list, syncedNames) {
      const batch = writeBatch(db);
      // 같은 게임이 동시에 두 번 들어가지 않도록 이름으로 만든 고정 ID 사용
      const idOf = name => "seed_" + [...name.replace(/\s/g, "")].map(c => c.codePointAt(0).toString(36)).join("");
      list.forEach(g => batch.set(doc(db, "games", idOf(g.name)), { image: "", playCount: 0, ...g, createdAt: serverTimestamp() }));
      batch.set(doc(db, "meta", "seedState"), { names: syncedNames, updatedAt: serverTimestamp() });
      await batch.commit();
      if (list.length) log("game.seed", "game", "", "기본 게임 자동 반영", `${list.length}개: ${list.map(g => g.name).join(", ").slice(0, 200)}`);
    }
  };
}
