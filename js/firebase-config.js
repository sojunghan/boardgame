// 실행 모드: "local"  = 이 브라우저(localStorage)에만 저장 — 서버 없이 테스트용
//            "firebase" = 실서버 (회원들과 데이터 공유) — 아래 firebaseConfig 설정 필요
const BACKEND = "firebase";

// [local 모드] 테스트용 관리자 계정 (실서버에서는 사용되지 않음)
const LOCAL_ADMIN = { id: "admin", password: "1234", memberNames: ["운영자"] };   // memberNames: 이 이름으로 로그인하면 구글 관리자 계정처럼 동작(테스트용)

// [firebase 모드] Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)에서 복사한 값으로 교체하세요.
// (이 값들은 공개되어도 괜찮습니다. 보안은 firestore.rules가 담당합니다.)
const firebaseConfig = {
  apiKey: "AIzaSyARP8NhZbuExzG8QKAAxe0CgDAT2wmGgN8",
  authDomain: "nextjenga-2645a.firebaseapp.com",
  projectId: "nextjenga-2645a",
  storageBucket: "nextjenga-2645a.firebasestorage.app",
  messagingSenderId: "297585894354",
  appId: "1:297585894354:web:1d5c05a5ab5e555343de0b"
};

// [firebase 모드] Firebase Authentication에 만든 관리자 이메일 (firestore.rules와 동일해야 함)
const ADMIN_EMAIL = "admin@boardgame.club";

// [firebase 모드] Google 로그인만으로 관리자 권한을 받는 계정들 (firestore.rules의 isAdmin()과 동일해야 함)
// 구글이 인증한(이메일 확인된) 계정만 인정돼요.
const ADMIN_GOOGLE_EMAILS = ["sjh2076@gmail.com"];

window.BG_CONFIG = { BACKEND, LOCAL_ADMIN, firebaseConfig, ADMIN_EMAIL, ADMIN_GOOGLE_EMAILS };
