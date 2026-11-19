// 실서버용 백엔드: Firebase(Firestore + Auth). 회원은 구글 로그인, 관리자는 이메일/비밀번호.
export async function createFirebaseBackend(firebaseConfig, adminEmail, adminGoogleEmails = []) {
  const V = "10.14.1", base = `https://www.gstatic.com/firebasejs/${V}/`;
  const { initializeApp } = await import(base + "firebase-app.js");
  const fs = await import(base + "firebase-firestore.js");
  const au = await import(base + "firebase-auth.js");
  const { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, increment, query, orderBy, limit, writeBatch, Timestamp } = fs;

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app), auth = au.getAuth(app);
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
        cb(rows);
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
    login: (id, pw) => au.signInWithEmailAndPassword(auth, id, pw),
    loginGoogle: () => au.signInWithPopup(auth, new au.GoogleAuthProvider()),
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
    async seed(list) {
      const batch = writeBatch(db);
      list.forEach(g => batch.set(doc(collection(db, "games")), { image: "", playCount: 0, ...g, createdAt: serverTimestamp() }));
      await batch.commit();
      log("game.seed", "game", "", "기본 게임 일괄 등록", `${list.length}개`);
    }
  };
}
