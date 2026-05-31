import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./prompts";
import { type ParsedAction } from "./actions";

// 환경변수에 GROQ_API_KEY가 있으면 클라우드(Groq)를 우선 사용하고, 없으면 로컬 Ollama로 대체(Fallback)합니다.
const useGroq = !!process.env.GROQ_API_KEY;

const baseURL = useGroq 
  ? "https://api.groq.com/openai/v1" 
  : (process.env.OLLAMA_BASE_URL ? `${process.env.OLLAMA_BASE_URL}/v1` : "http://127.0.0.1:11434/v1");

const apiKey = useGroq ? process.env.GROQ_API_KEY : "ollama";
const modelName = useGroq ? "llama-3.3-70b-versatile" : "llama3.1"; // Groq용 고성능 Llama 3.3 70B 모델

export const llmClient = new OpenAI({
  baseURL,
  apiKey,
  timeout: 10000, // 10초 타임아웃
});

/**
 * 사용자의 발화를 받아 모델(Groq 또는 Ollama)을 호출하고
 * 사전에 정의된 JSON 액션 객체로 파싱하여 반환합니다.
 */
export async function parseUserUtterance(utterance: string): Promise<ParsedAction> {
  // 음성 인식(STT) 오류로 인해 숫자 사이에 공백이 들어간 경우 (예: "3 0 0" -> "300") 사전에 결합
  const cleanUtterance = utterance.replace(/(\d)\s+(?=\d)/g, "$1");

  try {
    const response = await llmClient.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: cleanUtterance },
      ],
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
