/**
 * AI 대화 엔진이 사용자 발화를 분석하여 도출할 수 있는 액션의 타입 정의입니다.
 * JSON 모드로 Ollama에 전달될 때, LLM은 반드시 아래 액션 중 하나를 선택해야 합니다.
 */

export type ActionType =
  | "create_shipment" // 출하 기록
  | "create_payment" // 수금(입금) 기록
  | "create_farm_log" // 영농일지 기록
  | "query_unpaid" // 미수금 조회
  | "query_revenue" // 매출 및 출하량 통계 조회
  | "create_customer_order" // B2C 주문 접수
  | "clarify" // 정보 부족으로 인한 되묻기
  | "unknown"; // 이해할 수 없는 발화

export interface BaseAction {
  action: ActionType;
}

export interface CreateShipmentAction extends BaseAction {
  action: "create_shipment";
  data: {
    customerName: string; // 거래처 이름 (예: 제주청과)
    recipientName?: string; // 받는 분 성함
    phone?: string; // 연락처
    address?: string; // 배송지 주소
    variety: string; // 품종 (예: 한라봉, 극조생)
    quantity: number; // 수량
    unit: string; // 단위 (예: 박스, 콘테나, kg)
    pricePerUnit?: number; // 단가 (없으면 null)
  };
}

export interface CreatePaymentAction extends BaseAction {
  action: "create_payment";
  data: {
    customerName: string; // 거래처 이름
    amount: number; // 입금액
  };
}

export interface CreateFarmLogAction extends BaseAction {
  action: "create_farm_log";
  data: {
    workType: string; // 작업 종류 (수확, 방제, 전정 등)
    workerCount?: number; // 작업 인원 수
    details: string; // 기타 작업 내용
  };
}

export interface QueryUnpaidAction extends BaseAction {
  action: "query_unpaid";
  data: {
    customerName?: string; // 특정 거래처를 물어본 경우, 없으면 전체 미수금
  };
}

export interface CreateCustomerOrderAction extends BaseAction {
  action: "create_customer_order";
  data: {
    customerName: string; // 고객명 (주문자/결제자)
    recipientName?: string; // 받는 분 성함 (지인 선물 등)
    phone?: string; // 연락처
    address?: string; // 배송지 주소
    variety: string; // 품종
    quantity: number; // 수량
    unit: string; // 단위
  };
}

export interface ClarifyAction extends BaseAction {
  action: "clarify";
  data: {
    reason: string; // 되묻는 이유 (예: "수량이 빠졌습니다")
    question: string; // 사용자에게 할 질문
  };
}

export interface QueryRevenueAction extends BaseAction {
  action: "query_revenue";
  data: {
    period?: "today" | "month" | "year" | "all"; // 조회 기간 (오늘, 당월, 당해, 전체 등)
    variety?: string; // 특정 품종을 지정해 물어봤는지 여부 (예: "타이벡", "한라봉")
  };
}

export interface UnknownAction extends BaseAction {
  action: "unknown";
  data: {
    reason: string;
  };
}

export type ParsedAction =
  | CreateShipmentAction
  | CreatePaymentAction
  | CreateFarmLogAction
  | QueryUnpaidAction
  | QueryRevenueAction
  | CreateCustomerOrderAction
  | ClarifyAction
  | UnknownAction;
