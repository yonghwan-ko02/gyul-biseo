import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./prompts";
import { type ParsedAction } from "./actions";

// Ollama 로컬 인스턴스를 바라보도록 설정된 OpenAI 클라이언트
// OLLAMA_BASE_URL은 .env.local에 정의되어 있습니다.
const baseURL = process.env.OLLAMA_BASE_URL 
  ? `${process.env.OLLAMA_BASE_URL}/v1`
  : "http://127.0.0.1:11434/v1";

export const llmClient = new OpenAI({
  baseURL,
  apiKey: "ollama", // Ollama는 API 키를 검증하지 않지만 SDK 요구사항으로 더미값 입력
});

/**
 * 사용자의 발화를 받아 로컬 Ollama 모델(Llama 3.1)을 호출하고
 * 사전에 정의된 JSON 액션 객체로 파싱하여 반환합니다.
 */
export async function parseUserUtterance(utterance: string): Promise<ParsedAction> {
  try {
    const response = await llmClient.chat.completions.create({
      model: "llama3.1", // Ollama에 설치된 모델명
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: utterance },
      ],
      temperature: 0.1, // 안정적이고 결정론적인 출력을 위해 낮게 설정
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned empty content");
    }

    // JSON 파싱 (안전하게)
    const parsed = JSON.parse(content) as ParsedAction;
    
    // 최소한 action 필드가 있는지 검증
    if (!parsed.action) {
      throw new Error("Invalid response format: missing 'action'");
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
