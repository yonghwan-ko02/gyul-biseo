<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Gyul-Biseo (귤비서) Agent Context & Hand-off Guide

> **Hello! If you are an AI taking over this project**, read this document entirely to understand the system architecture, established patterns, and database behavior.

## 1. Project Overview
"Talk & Track (Gyul-Biseo)" is an AI-powered ledger system tailored for senior citrus farmers (50s-70s). The user interacts mostly via chat (voice/text). The AI parses these natural language inputs into structured JSON actions to execute CRUD operations on the database.

- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS Modules.
- **Database**: Supabase PostgreSQL with Prisma 5.22.0.
- **LLM**: Local Ollama (Llama 3.1 8B).

## 2. Core Feature Architecture
1. **Chat UI (`/chat`)**: The user talks to the AI.
2. **AI Action Parsing (`/api/chat`)**: Input goes to Ollama. We force a specific JSON schema using `format: 'json'`. The parsed JSON returns an `ActionType`.
3. **Database Execution (`shipment-service.ts` etc.)**: Based on `ActionType` (e.g. `create_shipment`, `create_customer_order`, `create_payment`), Prisma executes DB operations.
4. **Dashboards (`/dashboard`, `/ledger`, `/settlement`)**: These pages query the Prisma database to visualize data using Recharts and Card-based mobile-friendly lists.

## 3. Database Schema Overview
- **Farm**: Stores the farmer's profile and bank account.
- **Customer**: A buyer/client. A Customer is unique by `name` per `farmId`.
- **Shipment**: An order or a shipped package.
  - `status`: "pending" (ordered but not sent) OR "shipped" (sent).
  - `paymentStatus`: "paid", "unpaid", "partial".
  - Soft Delete MUST be used (`isDeleted = true`) instead of hard deletion.

## 4. LLM Action Types (Critical)
Any new intent MUST be added to `src/lib/ai/actions.ts` (e.g., `ActionType`) and `src/lib/ai/prompts.ts`.
Current Actions:
- `create_shipment`: Logs a completed dispatch.
- `create_payment`: Logs money received.
- `create_farm_log`: Logs a farming diary event.
- `query_unpaid`: Asks how much is unpaid.
- `create_customer_order`: When the farmer pastes a KakaoTalk text block of a B2C order. Parses name, phone, address, and creates a "pending" shipment.

## 5. UI/UX Rules
- **DO NOT USE Tailwind**. We use pure CSS / CSS Modules with variables defined in `index.css`.
- Keep text large (var(--font-size-lg) etc). Use high contrast colors.

## 6. How to Continue Development
If you need to add a new feature:
1. Verify if `schema.prisma` needs an update. If so, run `npx prisma migrate dev --name <name>`.
2. Update the Action Types in `actions.ts` and `prompts.ts` if it involves natural language processing.
3. Build the UI in `src/app/(app)/...` as a Server or Client Component using Next.js App Router rules.
