// 실행 모드: "local"  = 이 브라우저(localStorage)에만 저장 — 서버 없이 테스트용
//            "firebase" = 실서버 (회원들과 데이터 공유) — 아래 firebaseConfig 설정 필요
const BACKEND = "firebase";

// [local 모드] 테스트용 관리자 계정 (실서버에서는 사용되지 않음)
const LOCAL_ADMIN = { id: "admin", password: "1234", memberNames: ["운영자"] };   // memberNames: 이 이름으로 로그인하면 구글 관리자 계정처럼 동작(테스트용)

// [firebase 모드] Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)에서 복사한 값으로 교체하세요.
// (이 값들은 공개되어도 괜찮습니다. 보안은 firestore.rules가 담당합니다.)
const firebaseConfig = {
  apiKey: "AIzaSyARP8NhZbuExzG8QKAAxe0CgDAT2wmGgN8",
  // Firebase Hosting(*.web.app / *.firebaseapp.com)에서 열면 사이트와 로그인 서버가 같은 도메인이 돼서
  // 브라우저의 타사 쿠키 차단에 걸리지 않아요. 그 외(GitHub Pages 등)에서는 기본 도메인을 써요.
  authDomain: /(\.web\.app|\.firebaseapp\.com)$/.test(location.hostname) ? location.host : "nextjenga-2645a.firebaseapp.com",
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

// [firebase 모드] 구글 로그인용 웹 클라이언트 ID (공개돼도 되는 값).
// 채우면 github.io 같은 다른 도메인에서도 구글 로그인이 안정적으로 동작해요(Firebase 로그인 팝업 대신 구글 로그인 창을 직접 사용).
// 비워 두면 기존 방식(Firebase 팝업)을 써요. Firebase 콘솔 > Authentication > 로그인 방법 > Google > 웹 SDK 구성 > "웹 클라이언트 ID"
const GOOGLE_CLIENT_ID = "";

window.BG_CONFIG = { BACKEND, LOCAL_ADMIN, firebaseConfig, ADMIN_EMAIL, ADMIN_GOOGLE_EMAILS, GOOGLE_CLIENT_ID };
