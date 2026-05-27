import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./prompts";
import { type ParsedAction } from "./actions";

// 환경변수에 GROQ_API_KEY가 있으면 클라우드(Groq)를 우선 사용하고, 없으면 로컬 Ollama로 대체(Fallback)합니다.
const useGroq = !!process.env.GROQ_API_KEY;

const baseURL = useGroq 
  ? "https://api.groq.com/openai/v1" 
  : (process.env.OLLAMA_BASE_URL ? `${process.env.OLLAMA_BASE_URL}/v1` : "http://127.0.0.1:11434/v1");

const apiKey = useGroq ? process.env.GROQ_API_KEY : "ollama";
const modelName = useGroq ? "llama-3.1-8b-instant" : "llama3.1"; // Groq용 초고속 Llama 3.1 모델

export const llmClient = new OpenAI({
  baseURL,
  apiKey,
});

/**
 * 사용자의 발화를 받아 모델(Groq 또는 Ollama)을 호출하고
 * 사전에 정의된 JSON 액션 객체로 파싱하여 반환합니다.
 */
export async function parseUserUtterance(utterance: string): Promise<ParsedAction> {
  try {
    const response = await llmClient.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: utterance },
      ],
      temperature: 0.1, // 안정적이고 결정론적인 출력을 위해 낮게 설정
      // Groq과 Ollama 모두 JSON 모드를 지원하므로 아래 옵션 활성화
      response_format: { type: "json_object" }, 
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
