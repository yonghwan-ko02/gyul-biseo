import { parseUserUtterance } from "./src/lib/ai/llm";

interface TestCase {
  category: string;
  input: string;
  expectedAction: string;
  description: string;
}

const testCases: TestCase[] = [
  // 1. Slang/Dialect mixed transactions
  {
    category: "제주 방언 및 은어 혼용",
    input: "서귀포 선과장에 조생 10다마 파치 삼십 콘테나 보내부렀어",
    expectedAction: "create_shipment",
    description: "선과장(유통), 조생(품종), 10다마/파치(규격), 콘테나(단위) 등의 방언/은어가 혼재된 출하 기록"
  },
  {
    category: "제주 방언 및 은어 혼용",
    input: "오늘 일꾼 하영 데려왔주게. 아주망 오명이랑 아즈방 세명 하영 옵데강 일했어",
    expectedAction: "create_farm_log",
    description: "일꾼, 하영(많이), 아주망(아주머니), 오명(5명), 아즈방(아저씨), 세명(3명) 등 방언이 섞인 영농일지 기록"
  },

  // 2. Missing required info (Clarify validation)
  {
    category: "정보 누락 (되묻기 검증)",
    input: "한라봉 10박스 보냈어",
    expectedAction: "clarify",
    description: "거래처가 누락되었으므로 clarify 액션을 리턴하고 질문을 생성해야 함 (이전 테스트 실패 항목)"
  },
  {
    category: "정보 누락 (되묻기 검증)",
    input: "제주청과에 극조생 보냈어",
    expectedAction: "clarify",
    description: "수량과 단위가 누락되었으므로 clarify 액션을 리턴해야 함"
  },
  {
    category: "정보 누락 (되묻기 검증)",
    input: "어제 500만원 입금됐네",
    expectedAction: "clarify",
    description: "어느 거래처에서 입금되었는지 정보가 누락되었으므로 clarify 액션을 리턴해야 함"
  },

  // 3. Spoken Korean numbers
  {
    category: "한글 숫자 및 금액 표현",
    input: "제주청과에 천혜향 열다섯박스 보냈고 단가는 이만오천원이야",
    expectedAction: "create_shipment",
    description: "열다섯박스 -> 15 박스, 이만오천원 -> 25000 단가로 정상 추출되는지 확인"
  },
  {
    category: "한글 숫자 및 금액 표현",
    input: "남원농협에 극조생 쉰콘테나 보냈어",
    expectedAction: "create_shipment",
    description: "쉰콘테나 -> 50 콘테나로 정상 추출되는지 확인"
  },

  // 4. Natural Language CRUD (Edit/Delete)
  {
    category: "자연어 CRUD 시도",
    input: "아까 제주청과 보낸 거 50개 아니고 40개야 수정해줘",
    expectedAction: "unknown",
    description: "현재 지원하지 않는 수정(CRUD) 요청이 들어왔을 때 어떻게 대응하는지 검증"
  },
  {
    category: "자연어 CRUD 시도",
    input: "어제 동일유통에서 입금된 기록 지워줘",
    expectedAction: "unknown",
    description: "현재 지원하지 않는 삭제(CRUD) 요청이 들어왔을 때 어떻게 대응하는지 검증"
  },

  // 5. Conversational Noise / Out of Domain
  {
    category: "대화 노이즈 및 일상어",
    input: "아이고 오늘 날씨가 참 좋다. 내일 비온다는데 밭에 나가봐야겠네.",
    expectedAction: "unknown",
    description: "농가 업무와 무관한 단순 일상 대화에 대한 예외 처리 검증"
  },
  {
    category: "대화 노이즈 및 일상어",
    input: "영철아 밥 먹었냐? 이따 한라봉 10박스 보낸 거 장부에 적어둬라",
    expectedAction: "clarify",
    description: "일상 대화와 업무가 섞였을 때 노이즈를 거르고 핵심만 파악하는지, 거래처 누락으로 clarify가 뜨는지 확인"
  },

  // 6. KakaoTalk dirty order format
  {
    category: "카카오톡 주문서 파싱",
    input: "[주문서]\n홍길동 / 한라봉 5kg 3박스\n연락처: 010-9999-8888\n주소: 제주시 연동 123-45 2층",
    expectedAction: "create_customer_order",
    description: "줄바꿈과 슬래시, 한글 텍스트가 섞인 B2C 카카오톡 주문 템플릿의 정확한 엔티티 추출 검증"
  },

  // 7. Messy Real-world Spoken Korean
  {
    category: "실전 구어체 출하 기록",
    input: "야, 오늘 동일유통에 타이벡 한 오십박스 실어보냈거든? 근데 단가는 대충 2만5천원씩 해서 적어놔봐라.",
    expectedAction: "create_shipment",
    description: "호칭 노이즈, 한글 수량(오십), 단가(2만5천원), 완곡어미(~거든)가 섞인 매우 거친 실전 출하 지시 파싱 검증"
  },
  {
    category: "실전 구어체 입금 기록",
    input: "어제 동일유통에서 그 오백만원인가 입금한거 같던데 확인해봐",
    expectedAction: "create_payment",
    description: "주저함(그), 추측성 조사(인가), 완곡어미(~같던데)가 포함된 추측형 실전 입금 보고 파싱 검증"
  },
  {
    category: "실전 구어체 영농일지",
    input: "오늘 일꾼들 와가지고 전정작업 오지게 했네. 아지망 세명이랑 저기 삼촌 두명 해서 하루종일 고생했어.",
    expectedAction: "create_farm_log",
    description: "속어(오지게), 방언(아지망, 삼촌), 복수 수량 합산(3명+2명=5명)이 섞인 영농일지 기록 파싱 검증"
  },
  {
    category: "실전 구어체 매출 통계 조회",
    input: "야 귤비서야, 이번달 총 매출 통계랑 외상 얼마쯤 남았는지 싹 다 알려줘봐",
    expectedAction: "query_revenue",
    description: "구어체(야, 얼마쯤), 노이즈가 섞인 이번 달 매출액 및 출하 통계 질의 의도 파싱 검증"
  },
  {
    category: "실전 구어체 품종별 출하량 조회",
    input: "올해 나간 타이벡 귤은 총 몇 박스인가?",
    expectedAction: "query_revenue",
    description: "품종 필터(타이벡)와 기간 필터(올해)가 지정된 출하량 통계 질의 의도 파싱 검증"
  },
  
  // 8. UI Exploration / Non-transactional requests
  {
    category: "비-거래 요청 (UI 탐색/시각화)",
    input: "시각화해서 보여줘",
    expectedAction: "unknown",
    description: "시각화 요청이 거래처/수량 없이 들어올 때 주문으로 오분류하지 않고 unknown(또는 clarify)으로 처리하는지 검증"
  },
  {
    category: "비-거래 요청 (기능 질의)",
    input: "뭐 할 수 있어?",
    expectedAction: "unknown",
    description: "기능 질의가 들어올 때 안내 메시지를 주기 위해 unknown(또는 clarify)으로 처리하는지 검증"
  }
];

async function runTests() {
  console.log("==================================================");
  console.log("🔍 [귤비서] 비판적 시나리오 스트레스 테스트 시작");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`\n[테스트 #${i + 1}] 카테고리: ${tc.category}`);
    console.log(`📝 설명: ${tc.description}`);
    console.log(`🗣️ 발화: "${tc.input}"`);
    console.log(`⏳ 분석 중...`);

    const start = Date.now();
    const result = await parseUserUtterance(tc.input);
    const elapsed = Date.now() - start;

    console.log(`⏱️ 소요 시간: ${elapsed}ms`);
    console.log(`🤖 결과 액션: "${result.action}"`);
    console.log(`🤖 상세 데이터:`, JSON.stringify(result.data, null, 2));

    const isMatch = result.action === tc.expectedAction;
    if (isMatch) {
      console.log("🟢 결과: 통과 (Pass)");
      passed++;
    } else {
      console.log(`🔴 결과: 실패 (Fail) - 기대 액션: "${tc.expectedAction}"`);
      failed++;
    }
    console.log("--------------------------------------------------");
  }

  console.log("\n==================================================");
  console.log("📊 테스트 결과 요약");
  console.log(`- 전체 테스트 케이스: ${testCases.length}건`);
  console.log(`- 통과: ${passed}건`);
  console.log(`- 실패: ${failed}건`);
  console.log(`- 패스율: ${((passed / testCases.length) * 100).toFixed(1)}%`);
  console.log("==================================================");
}

runTests();
