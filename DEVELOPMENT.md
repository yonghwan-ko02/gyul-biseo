# 귤비서 개발 방법론 & 코딩 표준 (Next.js & TypeScript)

> 이 문서는 프로젝트 전체에 걸쳐 **일관성** 있는 개발을 위해 모든 기여자가 반드시 숙지·준수해야 하는 가이드입니다. AI 코딩 어시스턴트(Antigravity 등)도 코드를 생성할 때 이 문서를 최우선으로 반영해야 합니다.

---

## 1. 개발 철학

| 원칙 | 설명 |
|------|------|
| **농장주 최우선 (Accessibility)** | 50~70대가 대상이므로 큰 폰트(최소 18px), 큰 버튼(최소 56px), 뚜렷한 대비를 준수 |
| **음성 중심 설계 (Voice-first)** | 사용자의 주 입력 수단은 음성이며, 부족한 정보는 반드시 퀵 리플라이로 보완 요구 |
| **데이터 불변성 (Soft Delete)** | 기록 유실 방지를 위해 DB의 물리 삭제(DELETE)는 절대 금지. `isDeleted = true`만 사용 |
| **LLM 교체 용이성** | 현재 로컬 Ollama를 쓰지만 언제든 OpenAI로 바꿀 수 있도록 어댑터 패턴 사용 |
| **명시적 복창** | AI는 데이터를 저장/수정/삭제하기 전과 후에 반드시 사용자가 이해할 수 있는 언어로 확인 복창 |

---

## 2. 파일 및 디렉터리 네이밍 규칙

* **컴포넌트 파일**: `PascalCase.tsx` (예: `ChatWindow.tsx`, `StatCard.tsx`)
* **일반 파일**: `kebab-case.ts` (예: `chat-engine.ts`, `format-utils.ts`)
* **훅(Hooks)**: `camelCase.ts` (예: `useVoiceInput.ts`)
* **API 라우트**: `route.ts` (Next.js App Router 규약)

---

## 3. TypeScript 코딩 표준

### 3.1 타입 정의와 인터페이스

* 가능하면 `type` 보다 `interface`를 선호하며, 컴포넌트 Props는 항상 인터페이스로 정의합니다.

```tsx
interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp: string;
}

export function MessageBubble({ content, isUser, timestamp }: MessageBubbleProps) {
  // ...
}
```

### 3.2 Prisma 타입 재사용

* DB 모델의 타입이 필요할 때는 Prisma가 생성한 타입을 직접 사용합니다.

```typescript
import type { Shipment, Customer } from '@prisma/client';

export interface ShipmentWithCustomer extends Shipment {
  customer: Customer;
}
```

---

## 4. 에러 처리 및 API 응답 표준

### 4.1 Next.js API Routes 응답 규격

성공과 실패 응답 포맷을 통일합니다.

```typescript
// 성공 시
export function successResponse<T>(data: T, message: string = "성공") {
  return NextResponse.json({ success: true, data, message }, { status: 200 });
}

// 에러 시
export function errorResponse(error: string, message: string, status: number = 400) {
  return NextResponse.json({ success: false, error, message }, { status });
}
```

### 4.2 오류 메시지 톤앤매너

50~70대 농장주에게 노출되는 에러는 기술적 용어(404, DB Error 등)를 배제하고 **원인과 해결 방법**을 친절히 안내합니다.

* ❌ "JSON Parse Error" -> ✅ "말씀하신 내용을 파악하기 어려웠어요. 다시 한번 말씀해 주시겠어요?"
* ❌ "Record Not Found" -> ✅ "해당하는 기록을 찾지 못했어요. 날짜나 수량을 다르게 말씀해 보세요."

---

## 5. LLM 연동 (Ollama) 패턴

* 로컬 LLM을 사용하므로, LangChain 등 무거운 프레임워크를 쓰지 않고 기본 `fetch`를 이용한 JSON 통신을 지향합니다.
* Llama 3.1의 네이티브 Function Calling이 불안정할 수 있으므로, 반드시 프롬프트 내에 JSON 반환 스키마를 명시하고 `format: 'json'` 파라미터를 넘겨 강제합니다.

```typescript
const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3.1:8b',
    format: 'json',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userInput }
    ],
    options: {
      temperature: 0.1 // 정형화된 데이터 파싱을 위해 낮은 온도 유지
    }
  })
});
```

---

## 6. DB 삭제 금지 (Soft Delete)

모든 DB 액션에서 레코드를 삭제할 때는 물리 삭제 대신 상태값을 변경합니다.

```typescript
// ❌ 절대 금지
await prisma.shipment.delete({ where: { id: targetId } });

// ✅ 올바른 방식
await prisma.shipment.update({
  where: { id: targetId },
  data: { isDeleted: true }
});
```

API에서 데이터를 조회할 때는 항상 `isDeleted: false` 조건을 포함해야 합니다.

```typescript
const activeShipments = await prisma.shipment.findMany({
  where: { isDeleted: false, farmId: currentFarmId }
});
```

---

## 7. AI 코딩 어시스턴트(AI Agent) 지침

이 프로젝트에서 AI가 코드를 생성할 때 지켜야 할 규칙입니다:

1. **Vanilla CSS 사용**: TailwindCSS가 설정되어 있지 않습니다. 스타일은 `.css` 파일이나 CSS Modules를 사용하여 작성하십시오.
2. **"Phase 1 MVP" 범위 준수**: 사용자에게 불필요한 기능(예: 결제 모듈, 외부 인증)을 멋대로 덧붙이지 마십시오.
3. **타입 안전성**: 모든 `any` 사용을 피하고 구체적인 타입을 명시하십시오.
