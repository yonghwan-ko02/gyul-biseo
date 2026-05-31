import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

interface UltraStressTestCase {
  id: number;
  category: string;
  input: string;
  expectedAction: string;
  description: string;
  expectedDataCheck?: (data: any) => boolean;
}

const ultraStressTestCases: UltraStressTestCase[] = [
  // 1. 다중 정정 및 교차 취소 시나리오 (Multi-Layered Negation & Self-Correction)
  {
    id: 1,
    category: "다중 정정 및 교차 취소",
    input: "야 제주청과에 극조생 쉰박스 보냈거든? 아 잠깐잠깐, 조생 쉰박스가 아니고 극조생 오십박스... 아 씨 머리 아프네. 다시다시! 한라봉 백오십박스 보낸거네 동일유통에! 제주청과가 아니고 동일유통이다!",
    expectedAction: "create_shipment",
    description: "거래처(제주청과->동일유통), 품종(극조생->조생->한라봉), 수량(50->150)이 연쇄적으로 수정되는 초고난도 자기수정 파싱",
    expectedDataCheck: (data: any) => {
      const nameOk = data.customerName === "동일유통";
      const varOk = data.variety?.includes("한라봉");
      const qtyOk = Number(data.quantity) === 150;
      const unitOk = data.unit === "박스";
      return !!(nameOk && varOk && qtyOk && unitOk);
    }
  },

  // 2. 인명 역할 혼동 및 관계망 분석 (Pronoun/Role Ambiguity)
  {
    id: 2,
    category: "역할 혼동 및 주어 분석",
    input: "오늘 홍길동 삼촌이 소개해준 김영희 선과장에 한라봉 쉰박스 실어 보냈어",
    expectedAction: "create_shipment",
    description: "소개해준 사람(홍길동)과 실제 거래처(김영희 선과장)가 명시될 때 거래처명을 정확히 김영희 선과장으로 추출하는지 검증",
    expectedDataCheck: (data: any) => {
      const nameOk = data.customerName?.includes("김영희");
      const notIntroducer = !data.customerName?.includes("홍길동");
      const qtyOk = Number(data.quantity) === 50;
      return !!(nameOk && notIntroducer && qtyOk);
    }
  },

  // 3. 모호한 근사치 표현 검증 (Ambiguous Approximation - Should Clarify)
  {
    id: 3,
    category: "모호한 근사치 (Clarification)",
    input: "동일유통에서 어제 한 사오백만원 입금된 거 같던데 장부에 적어둬라.",
    expectedAction: "clarify",
    description: "'사오백만원'(400만원 또는 500만원)은 명확하지 않은 금액이므로, 임의 추정치로 등록하지 않고 되묻기(clarify)가 작동해야 함",
    expectedDataCheck: (data: any) => {
      return !!(data.reason?.includes("금액") || data.question);
    }
  },

  // 4. 극단적인 음성인식 자소 분리 및 띄어쓰기 훼손 (Severe STT Spacing Mutilation)
  {
    id: 4,
    category: "극단적 STT 훼손",
    input: "동 1 여 통 서 서 어 3 0 0 만 원 인 가 2 끔 해 꺼 든?",
    expectedAction: "create_payment",
    description: "띄어쓰기 및 맞춤법이 극단적으로 훼손된 문장(동일유통에서 어제 300만원 입금했거든)의 맥락적 의미 추출",
    expectedDataCheck: (data: any) => {
      const nameOk = data.customerName === "동일유통";
      const amtOk = Number(data.amount) === 3000000;
      return !!(nameOk && amtOk);
    }
  },

  // 5. 3개 이상 다중 근로 그룹의 합산 연산 (Multi-Group Summation)
  {
    id: 5,
    category: "3개 근로 그룹 합산",
    input: "오늘 밭에 오전에 아주망 셋, 오후에 아주망 넷, 그리고 기사 삼촌 둘 와서 하루종일 가지치기 작업했어.",
    expectedAction: "create_farm_log",
    description: "오전(3) + 오후(4) + 기사(2) = 총 9명의 다중 그룹 인원을 오차 없이 산술 합산하는지 검증",
    expectedDataCheck: (data: any) => {
      const workOk = data.workType?.includes("가지치기") || data.workType?.includes("전정");
      const workersOk = Number(data.workerCount) === 9;
      return !!(workOk && workersOk);
    }
  },

  // 6. 극단적인 현장 방언 및 고유 명사 오타 결합 (Complex Dialect & Metathesis)
  {
    id: 6,
    category: "방언 및 고유명사 오타 결합",
    input: "어이 귤상구야... 나 요번주에 선과장 그 서기포농에 극조생 파치 백콘테나 가량 실어 보낸 것 같더마는 단가는 삼천사백오십원으로 다가 대충 매겨부렀저.",
    expectedAction: "create_shipment",
    description: "비서 호칭(귤상구), 오타(서기포농=서귀포농협), 방언(것 같더마는, 매겨부렀저), 상세한 단가(삼천사백오십원=3450) 파싱",
    expectedDataCheck: (data: any) => {
      const nameOk = data.customerName?.includes("서귀포") || data.customerName?.includes("서기포농");
      const varOk = data.variety?.includes("극조생") || data.variety?.includes("파치");
      const qtyOk = Number(data.quantity) === 100;
      const priceOk = Number(data.pricePerUnit) === 3450;
      return !!(nameOk && varOk && qtyOk && priceOk);
    }
  }
];

async function runUltraStressTests() {
  console.log("==========================================================");
  console.log("⚡ [귤비서] 초고난도(Ultra-High) 구어체 스트레스 시나리오 테스트");
  console.log("==========================================================");

  const { parseUserUtterance } = await import("./src/lib/ai/llm");

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < ultraStressTestCases.length; i++) {
    const tc = ultraStressTestCases[i];
    console.log(`\n[초고난도 테스트 #${tc.id}] 카테고리: ${tc.category}`);
    console.log(`📝 검증 목적: ${tc.description}`);
    console.log(`🗣️ 실전 발화: "${tc.input}"`);
    console.log(`⏳ AI 분석 중...`);

    const start = Date.now();
    let result;
    try {
      result = await parseUserUtterance(tc.input);
    } catch (err: any) {
      result = { action: "error", data: { reason: err.message } };
    }
    const elapsed = Date.now() - start;

    console.log(`⏱️ 소요 시간: ${elapsed}ms`);
    console.log(`🤖 결과 액션: "${result.action}"`);
    console.log(`🤖 추출 데이터:`, JSON.stringify(result.data, null, 2));

    let isPass = result.action === tc.expectedAction;
    
    if (isPass && tc.expectedDataCheck && result.data) {
      try {
        const dataCheckPassed = tc.expectedDataCheck(result.data);
        if (!dataCheckPassed) {
          console.log(`⚠️ 액션은 매칭되었으나 세부 데이터 구조 검증에 실패했습니다.`);
          isPass = false;
        }
      } catch (checkErr) {
        console.log(`⚠️ 데이터 검증 함수 실행 중 오류 발생:`, checkErr);
        isPass = false;
      }
    }

    if (isPass) {
      console.log("🟢 결과: [통과] (Pass)");
      passed++;
    } else {
      console.log(`🔴 결과: [실패] (Fail) - 기대 액션: "${tc.expectedAction}"`);
      failed++;
    }
    console.log("----------------------------------------------------------");
  }

  console.log("\n==========================================================");
  console.log("📊 초고난도 스트레스 테스트 최종 요약");
  console.log(`- 전체 테스트 케이스: ${ultraStressTestCases.length}건`);
  console.log(`- 통과 (Pass): ${passed}건`);
  console.log(`- 실패 (Fail): ${failed}건`);
  console.log(`- 초고난도 돌파율: ${((passed / ultraStressTestCases.length) * 100).toFixed(1)}%`);
  console.log("==========================================================");
}

runUltraStressTests();
