/** 네오브루탈리즘 테마: 굵은 검정 테두리 + 오프셋 하드 섀도 + 원색 포인트 */
module.exports = {
  content: ["./*.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        cream: "#FFF6DC",
        "nb-yellow": "#FFD93D",
        "nb-pink": "#FF8FB7",
        "nb-blue": "#7CC8FF",
        "nb-green": "#8BE88B",
        "nb-purple": "#C9A7FF",
        "nb-orange": "#FFA64D",
        "nb-red": "#FF5757"
      },
      fontFamily: {
        display: ['"Black Han Sans"', '"Noto Sans KR"', "sans-serif"],
        body: ['"Noto Sans KR"', "sans-serif"]
      },
      boxShadow: {
        nbxs: "2px 2px 0 0 #111111",
        nbsm: "3px 3px 0 0 #111111",
        nb: "5px 5px 0 0 #111111",
        nblg: "8px 8px 0 0 #111111"
      }
    }
  },
  plugins: []
};
