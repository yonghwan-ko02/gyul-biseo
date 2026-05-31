import { loadEnvConfig } from "@next/env";
// Load environment variables from .env.local synchronously before importing other modules
loadEnvConfig(process.cwd());

interface StressTestCase {
  category: string;
  input: string;
  expectedAction: string;
  description: string;
  expectedDataCheck?: (data: any) => boolean;
}

const stressTestCases: StressTestCase[] = [
  // 1단계: STT 발음 오류 및 오타 (Voice Recognition Typos)
  {
    category: "STT 발음 오류 및 오타",
    input: "재주청과에 극조생 열다섯박수 보냇음",
    expectedAction: "create_shipment",
    description: "재주청과(제주청과 오타), 박수(박스 오타), 보냇음(보냈음 오타) 등 오타가 있는 출하 기록",
    expectedDataCheck: (data: any) => {
      const nameOk = data.customerName?.includes("청과");
      const varOk = data.variety?.includes("극조생");
      const qtyOk = Number(data.quantity) === 15;
      const unitOk = data.unit === "박스" || data.unit === "박수";
      return !!(nameOk && varOk && qtyOk && unitOk);
    }
  },
  {
    category: "STT 발음 오류 및 오타",
    input: "남언농헙에 극조생 쉰콘태나 실어보냄",
    expectedAction: "create_shipment",
    description: "남언농헙(남원농협 오타), 콘태나(콘테나 오타), 쉰(50) 수량 추출 검증",
    expectedDataCheck: (data: any) => {
      const nameOk = data.customerName?.includes("남원농협") || data.customerName?.includes("남언농헙");
      const varOk = data.variety?.includes("극조생");
      const qtyOk = Number(data.quantity) === 50;
      const unitOk = data.unit?.includes("콘");
      return !!(nameOk && varOk && qtyOk && unitOk);
    }
  },
  {
    category: "STT 발음 오류 및 오타",
    input: "서기포선과장에 한라봉 오십박스 보냇쪄",
    expectedAction: "create_shipment",
    description: "서기포선과장(서귀포선과장 오타), 보냇쪄(보냈어의 구어체 오타) 파싱 검증",
    expectedDataCheck: (data: any) => {
      const nameOk = data.customerName?.includes("서귀포") || data.customerName?.includes("서기포");
      const varOk = data.variety?.includes("한라봉");
      const qtyOk = Number(data.quantity) === 50;
      const unitOk = data.unit === "박스";
      return !!(nameOk && varOk && qtyOk && unitOk);
    }
  },

  // 2단계: 극단적 방언, 은어 및 구어체 표현 (Jeju Dialect & Jargon)
  {
    category: "극단적 방언 및 은어 사용",
    input: "아따 거시기냐... 동일유통에 타이벡 조생 파치로다가 쉰두콘테나 실어보냈주게. 단가는 만이천원이고이.",
    expectedAction: "create_shipment",
    description: "거시기, 조생 파치, 쉰두(52) 콘테나, 보냈주게/이고이(방언)와 단가 만이천원 파싱 검증",
    expectedDataCheck: (data: any) => {
      const nameOk = data.customerName === "동일유통";
      const varOk = data.variety?.includes("타이벡") || data.variety?.includes("조생");
      const qtyOk = Number(data.quantity) === 52;
      const unitOk = data.unit === "콘테나";
      const priceOk = Number(data.pricePerUnit) === 12000;
      return !!(nameOk && varOk && qtyOk && unitOk && priceOk);
    }
  },
  {
    category: "극단적 방언 및 은어 사용",
    input: "오늘 밭에 아주망 넷이랑 아즈방 둘 델꼬와서 하루종일 방제작업 빡세게 해부렀어.",
    expectedAction: "create_farm_log",
    description: "아주망(아주머니) 4명 + 아즈방(아저씨) 2명 = 총 6명 인원 합산 및 방제 작업 기록",
    expectedDataCheck: (data: any) => {
      const workOk = data.workType?.includes("방제");
      const workersOk = Number(data.workerCount) === 6;
      return !!(workOk && workersOk);
    }
  },

  // 3단계: 노이즈, 현장 잡음 및 자기 수정 (Background Noise & Self-Correction)
  {
    category: "노이즈 및 자기 수정",
    input: "아휴 비가 오려나 허리가 쑤시네... 어이 길동아! 거기 천막 좀 쳐라! 아 귤비서야, 제주청과에 극조생 30박스... 아 아니다! 극조생 말고 조생으로 30박스 보냈어.",
    expectedAction: "create_shipment",
    description: "잡담 노이즈, 다른 사람 부르는 호격 노이즈, '극조생 -> 조생'으로의 즉각적 자기수정(Self-correction) 검증",
    expectedDataCheck: (data: any) => {
      const nameOk = data.customerName?.includes("제주청과");
      const varOk = data.variety === "조생"; // 극조생이 아닌 조생이어야 함
      const qtyOk = Number(data.quantity) === 30;
      const unitOk = data.unit === "박스";
      return !!(nameOk && varOk && qtyOk && unitOk);
    }
  },
  {
    category: "노이즈 및 자기 수정",
    input: "동일유통에서 어제 칠백만원 입금됐다고... 아 참 칠백이 아니고 구백만원이네! 구백만원 입금 들어왔어.",
    expectedAction: "create_payment",
    description: "금액 자기수정(칠백만원 -> 구백만원) 검증",
    expectedDataCheck: (data: any) => {
      const nameOk = data.customerName === "동일유통";
      const amtOk = Number(data.amount) === 9000000;
      return !!(nameOk && amtOk);
    }
  },

  // 4단계: 정보 누락 및 모호성 (Should Clarify)
  {
    category: "정보 누락 및 모호성",
    input: "오늘 극조생 쉰콘테나 보냈거든? 단가는 이만원씩 해서 장부에 잘 좀 적어놔라.",
    expectedAction: "clarify",
    description: "거래처(고객명)가 누락되어 입력을 완료할 수 없으므로 되묻기(clarify)가 작동해야 함"
  },
  {
    category: "정보 누락 및 모호성",
    input: "제주청과에 귤 좀 보냈어 확인해봐",
    expectedAction: "clarify",
    description: "품종, 수량, 단위가 전부 누락되었으므로 되묻기(clarify)가 작동해야 함"
  },
  {
    category: "정보 누락 및 모호성",
    input: "어제 300만원 입금됐네 장부에 올려줘",
    expectedAction: "clarify",
    description: "입금 거래처 정보가 누락되어 되묻기(clarify)가 작동해야 함"
  },

  // 5단계: 업무 무관 발화 및 감정적 토로 (Out of Domain & Venting)
  {
    category: "업무 무관 발화 및 불만 제기",
    input: "아니 이거 버튼이 왜 안 눌러져? 기계가 진짜 쓰레기 같네 아주 답답해 미치겠다!",
    expectedAction: "unknown",
    description: "짜증 및 기계 불만 제기에 대해 거래를 생성하지 않고 unknown으로 분류되는지 검증"
  },
  {
    category: "업무 무관 발화 및 불만 제기",
    input: "오늘 날씨도 좋은데 이따가 삼겹살에 쐬주나 한 잔 때려야겠다",
    expectedAction: "unknown",
    description: "단순 일상 잡담 및 술자리 계획에 대해 unknown(또는 일상 대화 안내)으로 필터링 검증"
  }
];

async function runStressTests() {
  console.log("==========================================================");
  console.log("🔥 [귤비서] 다양하고 부정확한 구어체 스트레스 시나리오 테스트");
  console.log("==========================================================");

  // Dynamic import of llm parser to ensure process.env.GROQ_API_KEY is loaded first
  const { parseUserUtterance } = await import("./src/lib/ai/llm");

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < stressTestCases.length; i++) {
    const tc = stressTestCases[i];
    console.log(`\n[테스트 #${i + 1}] 카테고리: ${tc.category}`);
    console.log(`📝 목적: ${tc.description}`);
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
    
    // 추가적인 데이터 매핑 검증
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
  console.log("📊 스트레스 테스트 최종 요약");
  console.log(`- 전체 테스트 케이스: ${stressTestCases.length}건`);
  console.log(`- 통과 (Pass): ${passed}건`);
  console.log(`- 실패 (Fail): ${failed}건`);
  console.log(`- 종합 성공률: ${((passed / stressTestCases.length) * 100).toFixed(1)}%`);
  console.log("==========================================================");
}

runStressTests();
