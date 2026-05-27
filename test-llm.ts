import { parseUserUtterance } from "./src/lib/ai/llm";

async function run() {
  const utterances = [
    "제주청과에 극조생 10다마 50콘테나 보냈어",
    "동일유통에서 어제 500만원 입금했네",
    "아주머니 3명 불러서 오늘 방제 작업했어",
    "한라봉 10박스 보냈어" // 거래처 누락
  ];

  for (const text of utterances) {
    console.log(`\n🗣️ 사용자: "${text}"`);
    console.log(`⏳ 분석 중...`);
    const start = Date.now();
    const result = await parseUserUtterance(text);
    const ms = Date.now() - start;
    console.log(`✅ 결과 (${ms}ms):`, JSON.stringify(result, null, 2));
  }
}

run();
