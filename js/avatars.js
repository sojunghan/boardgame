// 프로필 캐릭터 세트 (직접 그린 SVG, 100x100). 프로필에는 "preset:<id>" 로 저장돼요.
(function () {
  const INK = "#3b2a1e";
  // 공통 얼굴 파츠
  const eyes = (y = 54, dx = 13, r = 4.4) =>
    `<circle cx="${50 - dx}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${50 + dx}" cy="${y}" r="${r}" fill="${INK}"/>` +
    `<circle cx="${50 - dx + 1.6}" cy="${y - 1.6}" r="1.4" fill="#fff"/><circle cx="${50 + dx + 1.6}" cy="${y - 1.6}" r="1.4" fill="#fff"/>`;
  const cheeks = (y = 63, dx = 22) =>
    `<ellipse cx="${50 - dx}" cy="${y}" rx="5.5" ry="3.4" fill="#ff8f9c" opacity=".55"/><ellipse cx="${50 + dx}" cy="${y}" rx="5.5" ry="3.4" fill="#ff8f9c" opacity=".55"/>`;
  const smile = (y = 64, w = 6) =>
    `<path d="M${50 - w} ${y} Q50 ${y + 6} ${50 + w} ${y}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  const stroke = (d, c = INK, w = 2.4) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

  const A = [
    { id: "cat", n: "고양이", bg: "#ffe3c2", svg:
      `<polygon points="19,44 22,11 47,31" fill="#f2a65a"/><polygon points="81,44 78,11 53,31" fill="#f2a65a"/>` +
      `<polygon points="25,37 26,21 38,30" fill="#f7b6b6"/><polygon points="75,37 74,21 62,30" fill="#f7b6b6"/>` +
      `<ellipse cx="50" cy="60" rx="34" ry="29" fill="#f7b867"/>` +
      stroke("M50 33 v8 M41 34 l2.5 7 M59 34 l-2.5 7", "#d9822b", 2.6) +
      eyes(56) + cheeks(65) + `<path d="M47 61 h6 l-3 4z" fill="#e57373"/>` + stroke("M50 65 q-4 5 -8 2 M50 65 q4 5 8 2") +
      stroke("M13 58 l13 2 M13 66 l13 -2 M87 58 l-13 2 M87 66 l-13 -2", "#b9824a", 1.6) },
    { id: "dog", n: "강아지", bg: "#dff0ff", svg:
      `<ellipse cx="20" cy="54" rx="10" ry="21" fill="#8d5a3b" transform="rotate(12 20 54)"/><ellipse cx="80" cy="54" rx="10" ry="21" fill="#8d5a3b" transform="rotate(-12 80 54)"/>` +
      `<circle cx="50" cy="57" r="33" fill="#ecd0a3"/><circle cx="64" cy="49" r="12" fill="#8d5a3b"/>` +
      eyes(52, 14) + `<ellipse cx="50" cy="68" rx="15" ry="11" fill="#fff6e6"/><ellipse cx="50" cy="62" rx="5.5" ry="3.8" fill="${INK}"/>` +
      stroke("M50 65 v4 M50 69 q-4 4 -8 0 M50 69 q4 4 8 0") + `<ellipse cx="54" cy="76" rx="3.6" ry="4.4" fill="#ff8a8a"/>` },
    { id: "bear", n: "곰", bg: "#f6e2cf", svg:
      `<circle cx="24" cy="29" r="12" fill="#a9744f"/><circle cx="76" cy="29" r="12" fill="#a9744f"/><circle cx="24" cy="29" r="6" fill="#e0b48a"/><circle cx="76" cy="29" r="6" fill="#e0b48a"/>` +
      `<circle cx="50" cy="58" r="34" fill="#c08a5e"/>` + eyes(51, 15) + cheeks(63, 25) +
      `<ellipse cx="50" cy="67" rx="15" ry="11.5" fill="#efd7b6"/><ellipse cx="50" cy="62" rx="5.5" ry="3.8" fill="${INK}"/>` + stroke("M50 65 v3 M50 68 q-4 4 -8 0 M50 68 q4 4 8 0") },
    { id: "rabbit", n: "토끼", bg: "#ffe0ea", svg:
      `<ellipse cx="35" cy="26" rx="9.5" ry="25" fill="#fff" stroke="#eadfd3" stroke-width="2" transform="rotate(-8 35 34)"/><ellipse cx="65" cy="26" rx="9.5" ry="25" fill="#fff" stroke="#eadfd3" stroke-width="2" transform="rotate(8 65 34)"/>` +
      `<ellipse cx="35" cy="28" rx="4.5" ry="17" fill="#f8bfcb" transform="rotate(-8 35 34)"/><ellipse cx="65" cy="28" rx="4.5" ry="17" fill="#f8bfcb" transform="rotate(8 65 34)"/>` +
      `<circle cx="50" cy="62" r="31" fill="#fff" stroke="#eadfd3" stroke-width="2"/>` + eyes(59, 12) + cheeks(67, 20) +
      `<ellipse cx="50" cy="65" rx="3.2" ry="2.4" fill="#f58aa0"/>` + stroke("M50 67 v2 M50 69 q-3 3 -6 0 M50 69 q3 3 6 0") + `<rect x="47.4" y="70" width="5.2" height="5.5" rx="1.2" fill="#fff" stroke="#c9b9a8" stroke-width="1.2"/>` },
    { id: "fox", n: "여우", bg: "#ffe9c9", svg:
      `<polygon points="16,46 21,9 47,31" fill="#ec7f37"/><polygon points="84,46 79,9 53,31" fill="#ec7f37"/>` +
      `<polygon points="23,38 25,20 38,31" fill="${INK}"/><polygon points="77,38 75,20 62,31" fill="${INK}"/>` +
      `<ellipse cx="50" cy="57" rx="35" ry="29" fill="#f08a3c"/>` + `<path d="M15 61 Q36 72 50 62 Q64 72 85 61 Q78 90 50 92 Q22 90 15 61Z" fill="#fff"/>` +
      eyes(53, 15, 4) + `<ellipse cx="50" cy="70" rx="5" ry="3.8" fill="${INK}"/>` + stroke("M50 73 v2 M50 75 q-4 3 -7 0 M50 75 q4 3 7 0") },
    { id: "panda", n: "판다", bg: "#e2f3e4", svg:
      `<circle cx="23" cy="28" r="12" fill="${INK}"/><circle cx="77" cy="28" r="12" fill="${INK}"/>` +
      `<circle cx="50" cy="58" r="34" fill="#fff" stroke="#e6e6e6" stroke-width="2"/>` +
      `<ellipse cx="35" cy="54" rx="9.5" ry="12" fill="${INK}" transform="rotate(-22 35 54)"/><ellipse cx="65" cy="54" rx="9.5" ry="12" fill="${INK}" transform="rotate(22 65 54)"/>` +
      `<circle cx="36" cy="53" r="3.8" fill="#fff"/><circle cx="64" cy="53" r="3.8" fill="#fff"/><circle cx="37" cy="53.5" r="2" fill="${INK}"/><circle cx="63" cy="53.5" r="2" fill="${INK}"/>` +
      cheeks(67, 25) + `<ellipse cx="50" cy="64" rx="5.5" ry="3.8" fill="${INK}"/>` + stroke("M50 67 v3 M50 70 q-4 4 -8 0 M50 70 q4 4 8 0") },
    { id: "penguin", n: "펭귄", bg: "#d9eef7", svg:
      `<circle cx="50" cy="57" r="35" fill="#36445c"/><path d="M50 40 Q72 40 76 62 Q70 86 50 86 Q30 86 24 62 Q28 40 50 40Z" fill="#fff"/>` +
      eyes(55, 13) + cheeks(65, 21) + `<polygon points="43,62 57,62 50,71" fill="#f6b93b"/>` + `<ellipse cx="50" cy="26" rx="8" ry="4" fill="#4a5a76"/>` },
    { id: "owl", n: "부엉이", bg: "#efe5d6", svg:
      `<polygon points="20,38 18,12 41,28" fill="#7e5f41"/><polygon points="80,38 82,12 59,28" fill="#7e5f41"/>` +
      `<ellipse cx="50" cy="59" rx="35" ry="32" fill="#a8825c"/><path d="M30 80 Q50 92 70 80 Q50 74 30 80Z" fill="#d8bd96"/>` +
      `<circle cx="34" cy="53" r="14" fill="#fff3d6" stroke="#7e5f41" stroke-width="2"/><circle cx="66" cy="53" r="14" fill="#fff3d6" stroke="#7e5f41" stroke-width="2"/>` +
      `<circle cx="35" cy="54" r="7" fill="${INK}"/><circle cx="65" cy="54" r="7" fill="${INK}"/><circle cx="37.5" cy="51.5" r="2.2" fill="#fff"/><circle cx="67.5" cy="51.5" r="2.2" fill="#fff"/>` +
      `<polygon points="45,62 55,62 50,73" fill="#f6b93b"/>` },
    { id: "dragon", n: "아기용", bg: "#dff5df", svg:
      `<polygon points="28,36 24,12 42,28" fill="#f6e0a0"/><polygon points="72,36 76,12 58,28" fill="#f6e0a0"/>` +
      `<polygon points="40,30 44,18 49,29" fill="#4a9d55"/><polygon points="51,28 56,16 60,30" fill="#4a9d55"/>` +
      `<ellipse cx="50" cy="59" rx="35" ry="30" fill="#6fbf73"/><ellipse cx="50" cy="72" rx="20" ry="13" fill="#bfe8a8"/>` +
      eyes(52, 15) + cheeks(64, 26) + `<circle cx="44" cy="68" r="1.9" fill="#3f8a4a"/><circle cx="56" cy="68" r="1.9" fill="#3f8a4a"/>` + stroke("M42 74 Q50 80 58 74") + `<polygon points="45,76 47.5,80 50,76" fill="#fff"/>` },
    { id: "robot", n: "로봇", bg: "#e4e9f5", svg:
      stroke("M50 26 V12", "#6b7280", 3) + `<circle cx="50" cy="10" r="5" fill="#e57373"/>` +
      `<rect x="9" y="46" width="8" height="18" rx="3" fill="#8b97a8"/><rect x="83" y="46" width="8" height="18" rx="3" fill="#8b97a8"/>` +
      `<rect x="14" y="26" width="72" height="62" rx="16" fill="#d3dbe6" stroke="#8b97a8" stroke-width="2.5"/>` +
      `<rect x="23" y="36" width="54" height="38" rx="10" fill="#1f2d3d"/>` +
      `<rect x="32" y="46" width="11" height="12" rx="3.5" fill="#7de3ff"/><rect x="57" y="46" width="11" height="12" rx="3.5" fill="#7de3ff"/>` +
      stroke("M40 66 Q50 71 60 66", "#7de3ff", 3) + `<circle cx="30" cy="81" r="2.2" fill="#8b97a8"/><circle cx="70" cy="81" r="2.2" fill="#8b97a8"/>` },
    { id: "wizard", n: "마법사", bg: "#eadffa", svg:
      `<circle cx="50" cy="64" r="26" fill="#f9d5b3"/>` +
      `<path d="M25 68 Q50 104 75 68 Q63 84 50 84 Q37 84 25 68Z" fill="#fff" stroke="#ddd" stroke-width="1.5"/>` +
      eyes(60, 11, 3.8) + `<ellipse cx="50" cy="68" rx="4.6" ry="3.6" fill="#f2b48f"/>` + cheeks(67, 19) +
      `<ellipse cx="50" cy="42" rx="38" ry="8" fill="#5a3fa3"/><polygon points="50,2 24,43 76,43" fill="#6a4fb3"/>` +
      `<polygon points="50,19 52.6,25.4 59.4,25.8 54.2,30.2 55.9,36.8 50,33.2 44.1,36.8 45.8,30.2 40.6,25.8 47.4,25.4" fill="#ffd54f"/>` },
    { id: "pirate", n: "해적", bg: "#f9e1dd", svg:
      `<circle cx="50" cy="60" r="32" fill="#f9d5b3"/>` +
      `<polygon points="76,42 95,34 90,54" fill="#c62828"/>` +
      `<path d="M17 52 Q50 8 83 52 Q50 40 17 52Z" fill="#d32f2f"/><circle cx="36" cy="33" r="2.2" fill="#fff"/><circle cx="52" cy="26" r="2.2" fill="#fff"/><circle cx="66" cy="35" r="2.2" fill="#fff"/><circle cx="46" cy="40" r="1.8" fill="#fff"/>` +
      stroke("M18 52 L40 58", "#222", 2.6) + `<circle cx="37" cy="60" r="9" fill="#222"/>` +
      `<circle cx="64" cy="59" r="4.6" fill="${INK}"/><circle cx="65.7" cy="57.4" r="1.5" fill="#fff"/>` + cheeks(70, 24) + stroke("M42 73 Q52 81 62 72") +
      `<rect x="55" y="73" width="4" height="4" rx="1" fill="#fff" stroke="#c9b9a8" stroke-width=".8"/><circle cx="83" cy="68" r="3.4" fill="none" stroke="#e5b53a" stroke-width="2"/>` },
    { id: "knight", n: "기사", bg: "#e6ebf0", svg:
      `<path d="M50 24 Q40 4 62 4 Q58 14 56 25Z" fill="#e53935"/>` +
      `<path d="M16 64 Q16 22 50 22 Q84 22 84 64 L84 80 Q50 94 16 80Z" fill="#b4bfcb" stroke="#7b8794" stroke-width="2.5"/>` +
      stroke("M50 24 V46", "#7b8794", 3) +
      `<rect x="26" y="46" width="48" height="28" rx="12" fill="#f9d5b3" stroke="#7b8794" stroke-width="2"/>` +
      eyes(58, 11, 3.8) + cheeks(67, 17) + stroke("M44 68 Q50 73 56 68") +
      `<circle cx="22" cy="72" r="2" fill="#7b8794"/><circle cx="78" cy="72" r="2" fill="#7b8794"/>` },
    { id: "kraken", n: "크라켄", bg: "#e5def7", svg:
      `<ellipse cx="22" cy="78" rx="8.5" ry="15" fill="#a368cf" transform="rotate(18 22 78)"/><ellipse cx="39" cy="83" rx="8.5" ry="13" fill="#a368cf"/>` +
      `<ellipse cx="61" cy="83" rx="8.5" ry="13" fill="#a368cf"/><ellipse cx="78" cy="78" rx="8.5" ry="15" fill="#a368cf" transform="rotate(-18 78 78)"/>` +
      `<circle cx="50" cy="48" r="35" fill="#b57edc"/><circle cx="32" cy="28" r="4" fill="#cfa6ea"/><circle cx="66" cy="25" r="5" fill="#cfa6ea"/><circle cx="76" cy="40" r="3" fill="#cfa6ea"/>` +
      eyes(48, 14, 5) + cheeks(60, 25) + stroke("M43 60 Q50 67 57 60") +
      `<circle cx="17" cy="88" r="2.2" fill="#f3d5ff"/><circle cx="39" cy="92" r="2.2" fill="#f3d5ff"/><circle cx="61" cy="92" r="2.2" fill="#f3d5ff"/><circle cx="83" cy="88" r="2.2" fill="#f3d5ff"/>` },
    { id: "alien", n: "외계인", bg: "#dff3e8", svg:
      stroke("M38 22 L31 7 M62 22 L69 7", "#5faa3f", 3) + `<circle cx="30" cy="6" r="4.4" fill="#ffd54f"/><circle cx="70" cy="6" r="4.4" fill="#ffd54f"/>` +
      `<path d="M50 18 Q87 18 87 52 Q87 78 50 92 Q13 78 13 52 Q13 18 50 18Z" fill="#8fdc6a"/>` +
      `<ellipse cx="35" cy="54" rx="9.5" ry="13.5" fill="#1f2d3d" transform="rotate(-18 35 54)"/><ellipse cx="65" cy="54" rx="9.5" ry="13.5" fill="#1f2d3d" transform="rotate(18 65 54)"/>` +
      `<circle cx="32" cy="49" r="3" fill="#fff"/><circle cx="62" cy="49" r="3" fill="#fff"/>` + stroke("M43 74 Q50 80 57 74") },
    { id: "frog", n: "개구리", bg: "#e3f4d9", svg:
      `<ellipse cx="50" cy="63" rx="38" ry="28" fill="#7ccf6e"/><ellipse cx="50" cy="75" rx="24" ry="13" fill="#c8eeb6"/>` +
      `<circle cx="30" cy="34" r="15" fill="#7ccf6e"/><circle cx="70" cy="34" r="15" fill="#7ccf6e"/>` +
      `<circle cx="30" cy="34" r="10" fill="#fff"/><circle cx="70" cy="34" r="10" fill="#fff"/>` +
      `<circle cx="31" cy="35" r="5.4" fill="${INK}"/><circle cx="69" cy="35" r="5.4" fill="${INK}"/><circle cx="32.8" cy="33" r="1.8" fill="#fff"/><circle cx="70.8" cy="33" r="1.8" fill="#fff"/>` +
      cheeks(62, 28) + `<circle cx="45" cy="55" r="1.7" fill="#3f8a4a"/><circle cx="55" cy="55" r="1.7" fill="#3f8a4a"/>` + stroke("M30 66 Q50 84 70 66", INK, 2.6) }
  ];

  window.BG_AVATARS = A.map(a => ({ id: a.id, n: a.n, bg: a.bg, svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${a.svg}</svg>` }));
})();
