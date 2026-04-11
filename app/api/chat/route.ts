import Anthropic from "@anthropic-ai/sdk"
import { NextRequest } from "next/server"

const client = new Anthropic()

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  domain: string
  nodes: { label: string; description: string }[]
  mode: "question" | "quiz"
}

export async function POST(req: NextRequest) {
  const { messages, domain, nodes, mode }: ChatRequest = await req.json()

  const nodeList = nodes
    .map((n) => `• ${n.label}: ${n.description}`)
    .join("\n")

  const systemPrompt =
    mode === "question"
      ? `당신은 ${domain} 학습을 돕는 AI 튜터입니다. 아래 지식 그래프를 참고하여 학생 질문에 답하세요.

현재 그래프:
${nodeList}

규칙:
- 2~3문장으로 간결하게
- 그래프 개념을 중심으로 설명
- 모르는 내용은 솔직하게`
      : `당신은 ${domain} 문제풀이 AI 튜터입니다. 아래 개념들로 문제를 출제하고 풀이를 도와주세요.

현재 그래프:
${nodeList}

규칙:
- 문제 출제 시 난이도 명시 (기초/심화)
- 학생 답변에 힌트 먼저, 정답은 요청 시에만
- 격려하는 톤 유지`

  const stream = await client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: systemPrompt,
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
