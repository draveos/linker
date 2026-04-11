import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic()

import { MAX_CONTEXT_QUESTIONS as MAX_QUESTIONS } from "@/lib/constants"
export { MAX_QUESTIONS }

export interface ContextMessage {
  role: "ai" | "user"
  content: string
}

export interface ValidateContextRequest {
  domain: string
  originalText: string
  conversationHistory: ContextMessage[]
  questionCount: number
}

export interface ValidateContextResponse {
  status: "sufficient" | "needs_more" | "irrelevant" | "off_topic"
  question?: string
  enrichedContext?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: ValidateContextRequest = await req.json()
    const { domain, originalText, conversationHistory, questionCount } = body

    // 최대 질문 소진 → 가진 context로 진행
    if (questionCount >= MAX_QUESTIONS) {
      return NextResponse.json({
        status: "sufficient",
        enrichedContext: buildEnrichedContext(originalText, conversationHistory, domain),
      } satisfies ValidateContextResponse)
    }

    const historyText = conversationHistory
      .map((m) => `${m.role === "ai" ? "AI" : "사용자"}: ${m.content}`)
      .join("\n")

    const prompt = `지식 그래프 생성을 위한 컨텍스트 검증 AI입니다.

도메인: ${domain}
사용자 입력: "${originalText}"
${historyText ? `\n대화 기록:\n${historyText}` : ""}

판단 기준:
- sufficient: 구체적 개념이 2개 이상, 3문장 이상 → 그래프 생성 가능
- needs_more: 너무 짧거나 모호함 → 보충 질문 필요
- irrelevant: 마지막 답변이 도메인(${domain})과 약간 동떨어짐
- off_topic: 마지막 답변이 완전히 다른 분야

needs_more일 때 질문은 학습 수준, 범위, 헷갈리는 개념 순으로 물어보세요.
질문은 한 번에 하나만, 짧고 구체적으로.

JSON만 반환:
{"status":"needs_more","question":"어느 수준까지 학습하셨나요? (예: 기초 문법, 함수, 클래스 등)"}`

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text : ""
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("JSON parse failed")

    const result: ValidateContextResponse = JSON.parse(match[0])

    if (result.status === "sufficient") {
      result.enrichedContext = buildEnrichedContext(originalText, conversationHistory, domain)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("validate-context error:", error)
    return NextResponse.json({ status: "sufficient" } satisfies ValidateContextResponse)
  }
}

function buildEnrichedContext(
  originalText: string,
  history: ContextMessage[],
  domain: string
): string {
  const qa: string[] = []
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].role === "ai" && history[i + 1].role === "user") {
      qa.push(`Q: ${history[i].content}\nA: ${history[i + 1].content}`)
    }
  }
  return [
    `도메인: ${domain}`,
    `내용: ${originalText}`,
    ...(qa.length ? [`\n보충 정보:\n${qa.join("\n\n")}`] : []),
  ].join("\n")
}
