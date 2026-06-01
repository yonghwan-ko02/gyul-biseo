import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./prompts";
import { type ParsedAction } from "./actions";
import { prisma } from "@/lib/prisma";

// 환경변수에 GROQ_API_KEY가 있으면 클라우드(Groq)를 우선 사용하고, 없으면 로컬 Ollama로 대체(Fallback)합니다.
const useGroq = !!process.env.GROQ_API_KEY;

const baseURL = useGroq 
  ? "https://api.groq.com/openai/v1" 
  : (process.env.OLLAMA_BASE_URL ? `${process.env.OLLAMA_BASE_URL}/v1` : "http://127.0.0.1:11434/v1");

const apiKey = useGroq ? process.env.GROQ_API_KEY : "ollama";
const modelName = useGroq 
  ? (process.env.GROQ_MODEL || "llama-3.3-70b-versatile") 
  : (process.env.OLLAMA_MODEL || "llama3.1");


export const llmClient = new OpenAI({
  baseURL,
  apiKey,
  timeout: 10000, // 10초 타임아웃
});

const KOREAN_NUMBERS_MAP: Record<string, string> = {
  "한": "1",
  "하나": "1",
  "두": "2",
  "둘": "2",
  "세": "3",
  "셋": "3",
  "네": "4",
  "넷": "4",
  "다섯": "5",
  "여섯": "6",
  "일곱": "7",
  "여덟": "8",
  "아홉": "9",
  "열": "10",
  "열한": "11",
  "열하나": "11",
  "열두": "12",
  "열둘": "12",
  "열세": "13",
  "열셋": "13",
  "열네": "14",
  "열넷": "14",
  "열다섯": "15",
  "열여섯": "16",
  "열일곱": "17",
  "열여덟": "18",
  "열아홉": "19",
  "스무": "20",
  "스물": "20",
  "스물한": "21",
  "스물두": "22",
  "서른": "30",
  "마흔": "40",
  "쉰": "50",
  "예순": "60",
  "일흔": "70",
  "여든": "80",
  "아흔": "90",
  "백": "100"
};

/**
 * 말로 표현된 한글 수사(예: "열", "여덟", "쉰" 등)를 숫자 형태("10", "8", "50" 등)로
 * 안전하게 사전 치환하여 모델(특히 8B 이하 소형 모델)의 추출 정확도를 100% 가깝게 높입니다.
 */
export function convertKoreanNumbersToDigits(text: string): string {
  let result = text;
  const keys = Object.keys(KOREAN_NUMBERS_MAP).sort((a, b) => b.length - a.length);

  // 1단계: 단위가 결합된 형태 치환 ("열 박스" -> "10 박스")
  for (const key of keys) {
    const digit = KOREAN_NUMBERS_MAP[key];
    const regex = new RegExp(`(${key})\\s*(박스|상자|콘테나|개|킬로|kg|톤|원|만)`, "g");
    result = result.replace(regex, (match, p1, p2) => `${digit}${p2}`);
  }

  // 2단계: 단독 단어로 쪼개져 조사나 띄어쓰기 사이에 고립된 형태 보정 ("여덟 보냈다" -> "8 보냈다")
  for (const key of keys) {
    const digit = KOREAN_NUMBERS_MAP[key];
    const regex = new RegExp(`\\b(${key})\\b`, "g");
    result = result.replace(regex, digit);
  }

  return result;
}

/**
 * 사용자의 발화를 받아 모델(Groq 또는 Ollama)을 호출하고
 * 사전에 정의된 JSON 액션 객체로 파싱하여 반환합니다.
 */
export async function parseUserUtterance(utterance: string): Promise<ParsedAction> {
  // 음성 인식(STT) 오류로 인해 숫자 사이에 공백이 들어간 경우 (예: "3 0 0" -> "300") 사전에 결합
  let cleanUtterance = utterance.replace(/(\d)\s+(?=\d)/g, "$1");
  
  // 농장주 고령 사용자가 말하는 한글 고유 수사(열, 여덟, 쉰 등)를 사전에 아라비아 숫자로 변환
  cleanUtterance = convertKoreanNumbersToDigits(cleanUtterance);

  try {
    // ─── 하이브리드 거래처 매칭 사전 가드 (Hybrid DB customer Matching Guard) ───
    // DB에서 활성화된 모든 거래처 및 닉네임을 조회하여 발화에 포함되어 있는지 결정적으로 사전 체크
    const dbCustomers = await prisma.customer.findMany({
      where: { isDeleted: false },
      select: { name: true, nickname: true }
    });

    let matchedDbCustomer = "";
    for (const c of dbCustomers) {
      if (cleanUtterance.includes(c.name)) {
        matchedDbCustomer = c.name;
        break;
      }
      if (c.nickname && cleanUtterance.includes(c.nickname)) {
        matchedDbCustomer = c.name;
        break;
      }
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    // 기존 등록된 거래처 이름이 사용자의 발화에 포함된 경우, 8B 소형 모델을 위한 초정밀 힌트 가이드 주입
    if (matchedDbCustomer) {
      messages.push({
        role: "system",
        content: `[초정밀 거래처 매칭 힌트] 사용자의 발화에 기존 등록된 거래처 "${matchedDbCustomer}"이(가) 직접 포함되어 있음이 시스템 선제 체크로 감지되었습니다. 추론할 필요 없이 무조건 JSON 출력값의 'customerName'에 "${matchedDbCustomer}"을(를) 정확히 매핑하여 기입하십시오.`
      });
    }

    messages.push({ role: "user", content: cleanUtterance });

    const response = await llmClient.chat.completions.create({
      model: modelName,
      messages: messages as any,
      temperature: 0.1, // 안정적이고 결정론적인 출력을 위해 낮게 설정
      // Groq과 Ollama 모두 JSON 모드를 지원하므로 아래 옵션 활성화
      response_format: { type: "json_object" }, 
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned empty content");
    }

    let jsonString = content.trim();

    // 마크다운 백틱 코드 블록 제거 (```json ... ``` 또는 ``` ... ``` 형태 추출)
    if (jsonString.startsWith("```")) {
      const match = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        jsonString = match[1].trim();
      }
    }

    // 앞뒤의 불필요한 텍스트 제거하고 { 로 시작하고 } 로 끝나는 JSON 객체 영역만 찾아냄
    if (!jsonString.startsWith("{")) {
      const startIdx = jsonString.indexOf("{");
      const endIdx = jsonString.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonString = jsonString.substring(startIdx, endIdx + 1);
      }
    }

    // JSON 파싱 (안전하게)
    const parsed = JSON.parse(jsonString) as ParsedAction;
    
    // 최소한 action 필드가 있는지 검증
    if (!parsed.action) {
      throw new Error("Invalid response format: missing 'action'");
    }

    // ─── 하이브리드 안전 보정 필터 (Deterministic Safety Guard) ───
    // 거래(출하, 주문, 입금) 요청인데 거래처명이 누락되었거나 'unknown', 'none', '미지정' 등 placeholder인 경우
    if (
      (parsed.action === "create_shipment" || parsed.action === "create_customer_order" || parsed.action === "create_payment") &&
      parsed.data
    ) {
      const customerName = (parsed.data as any).customerName?.trim();
      const isPlaceholder = !customerName || 
        ["unknown", "none", "미지정", "누락", "알수없음", "알 수 없음"].includes(customerName.toLowerCase());

      if (isPlaceholder) {
        return {
          action: "clarify",
          data: {
            reason: "거래처 이름 누락",
            question: parsed.action === "create_payment" 
              ? "어느 거래처에서 입금되었는지 이름을 알려주세요." 
              : "어느 거래처로 보내셨는지 거래처 이름을 알려주세요."
          }
        };
      }
    }

    return parsed;
  } catch (error) {
    console.error("LLM Parsing Error:", error);
    // 파싱 실패나 예기치 않은 오류 시 fallback 응답 반환
    return {
      action: "unknown",
      data: {
        reason: error instanceof Error ? error.message : "Failed to parse LLM response",
      },
    };
  }
}
