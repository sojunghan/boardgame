# 🎲 보드게임 소모임 페이지

정적 사이트(HTML/CSS/JS) + Firebase(Firestore, Auth)로 동작합니다. GitHub Pages로 무료 호스팅할 수 있어요.

## 디자인 (Tailwind CSS · 네오브루탈리즘)

스타일은 Tailwind CSS로 작성하고, 빌드된 결과 `css/style.css`를 그대로 커밋해 두었어요.
**그냥 쓰기만 한다면 빌드는 필요 없어요.** 디자인을 직접 고치고 싶을 때만:

```bash
npm install          # 최초 1회 (Node.js 필요)
npm run build:css    # src/input.css, 각 html/js의 클래스 → css/style.css
npm run watch:css    # 수정하면서 자동 빌드
```

- 색상·그림자 같은 테마 값: `tailwind.config.js`
- 카드/버튼/모달 등 공통 컴포넌트 스타일: `src/input.css`
- JS가 만드는 화면(카드 등)의 클래스를 바꾸면 반드시 `build:css`를 다시 실행하세요.

## 0. 로컬에서 먼저 테스트 (서버 불필요)

`js/firebase-config.js`의 `BACKEND`가 `"local"`이면 데이터가 내 브라우저(localStorage)에만 저장됩니다.
ES 모듈을 쓰므로 `index.html`을 더블클릭하지 말고 간단한 웹서버로 여세요.

```bash
cd boardgame-club
python -m http.server 8000      # 또는: npx serve
```

브라우저에서 http://localhost:8000 접속 → 관리자 로그인 (아이디 `admin` / 비밀번호 `1234`, `LOCAL_ADMIN`에서 변경)
→ **기본 게임 일괄 등록** 클릭으로 36개 게임 입력.

실서버로 전환할 때는 아래 1번을 마친 뒤 `BACKEND = "firebase"`로 바꾸면 됩니다.

## 1. Firebase 설정 (약 5분)

1. https://console.firebase.google.com 에서 프로젝트 생성 (Analytics는 꺼도 됨)
2. **빌드 > Firestore Database > 데이터베이스 만들기** (프로덕션 모드, 지역은 `asia-northeast3` 서울 추천)
3. **Firestore > 규칙** 탭에 `firestore.rules` 내용을 붙여넣고, `admin@example.com`을 본인 관리자 이메일로 바꾼 뒤 **게시**
4. **빌드 > Authentication > 시작하기 > 로그인 방법**에서 두 가지를 사용 설정
   - **Google** (회원 로그인: 활동 후기 작성·수정·삭제용. 프로젝트 지원 이메일 선택)
   - **이메일/비밀번호** (관리자 로그인용)
5. **Authentication > 사용자 > 사용자 추가**로 관리자 계정(이메일 + 비밀번호) 생성
   - 이게 "미리 설정한 아이디/패스워드"입니다. 이메일 형식이면 아무거나 가능 (예: `admin@mygroup.com`, 실제 메일일 필요 없음)
6. **프로젝트 설정 > 내 앱 > 웹 앱(</>) 추가** 후 나오는 `firebaseConfig` 값을 `js/firebase-config.js`에 붙여넣기
7. 같은 파일의 `ADMIN_EMAIL`도 관리자 이메일로 수정
8. **Authentication > 설정 > 승인된 도메인**에 `내아이디.github.io` 추가

> 관리자 권한은 화면이 아니라 `firestore.rules`가 서버에서 검사하므로, 코드를 열어봐도 우회할 수 없습니다.

## 2. GitHub Pages 배포

```bash
cd boardgame-club
git init
git add .
git commit -m "boardgame club page"
git branch -M main
git remote add origin https://github.com/<내아이디>/<레포이름>.git
git push -u origin main
```

GitHub 레포 **Settings > Pages > Branch: main / (root)** 선택 → 몇 분 뒤
`https://<내아이디>.github.io/<레포이름>/` 으로 접속할 수 있어요.

## 계정 / 권한 요약

| 구분 | 할 수 있는 일 |
|---|---|
| 비로그인 | 모든 내용 보기, 게임 후기·평점을 **게스트(닉네임)** 로 작성 (본인 삭제 불가) |
| Google 로그인 회원 | 위 + **활동 후기** 작성(사진 최대 4장), **본인 글 수정/삭제**, 본인 게임 후기 삭제 |
| 관리자 | 게임 관리·플레이 횟수, 모든 후기 삭제, 활동 후기 수정/삭제, **관리자 페이지(`admin.html`)** |

관리자 페이지: 활동 로그(작성/수정/삭제/복원 기록) 조회, **삭제된 활동 후기 복원 / 영구 삭제**.
회원이 활동 후기를 삭제하면 목록에서만 숨겨지고(보관), 관리자가 복원할 수 있어요.
로그는 관리자만 볼 수 있고 수정·삭제할 수 없어요. (소규모 모임용 클라이언트 기록이라 완전한 감사 로그는 아니에요.)

## 기능

- 보유 게임 목록 (사진, 인원, 시간, 간단 룰) / 검색·정렬
- 플레이한 게임(횟수 1 이상)에 닉네임 + 별점 + 후기 작성
- 종합 평점(평균)과 랭킹 탭
- 모임 기록 탭: 일시, 참석자, 플레이한 게임, 에피소드
- 관리자: 게임 추가/수정/삭제, 플레이 횟수 ±조정, 후기 삭제, 회차 기록 추가/삭제
  (회차 기록 저장 시 선택한 게임의 플레이 횟수를 +1 반영하는 옵션 있음)

## 참고

- 사진은 업로드하면 자동으로 작게 압축해 DB에 저장합니다(별도 Storage 불필요). 이미지 URL 입력도 가능.
- Firebase 무료(Spark) 요금제로 소모임 규모는 충분합니다.
