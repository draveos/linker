import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

// Sonnet 그래프 생성은 10-20초 소요 가능
export const maxDuration = 60

const client = new Anthropic()

export interface GenerateGraphRequest {
  lectureText: string
  domain?: string
}

export interface GeneratedNode {
  id: string
  label: string
  description: string
  prerequisites: string[]
  confidence: number
}

export interface GenerateGraphResponse {
  nodes: GeneratedNode[]
  domain: string
  totalConcepts: number
  warnings: string[]
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateGraphRequest = await req.json()
    const { lectureText, domain = "일반" } = body

    if (!lectureText) {
      return NextResponse.json({ error: "lectureText is required" }, { status: 400 })
    }

    const prompt = `당신은 교육 콘텐츠 분석 AI입니다. 강의 텍스트에서 핵심 개념을 추출하고 지식 그래프를 생성합니다.

## 강의 텍스트
${lectureText}

## 분석 지침
1. 텍스트에서 핵심 개념을 8~12개 추출하세요
2. 각 개념 간의 선행 의존성(prerequisite)을 파악하세요
3. 순환 참조(A→B→A)가 없도록 검증하세요
4. 가장 기초적인 개념은 prerequisites가 빈 배열입니다
5. 확신도(confidence)가 낮은 개념(0.8 미만)은 표시하세요

## 응답 형식 (반드시 아래 JSON만 반환, 다른 텍스트 없이)
{
  "nodes": [
    {
      "id": "1",
      "label": "개념명",
      "description": "개념 설명 (한 문장)",
      "prerequisites": [],
      "confidence": 0.95
    },
    {
      "id": "2",
      "label": "개념명2",
      "description": "개념 설명",
      "prerequisites": ["1"],
      "confidence": 0.88
    }
  ],
  "domain": "${domain}",
  "totalConcepts": 10,
  "warnings": ["순환 참조 없음 확인됨"]
}`

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    })

    const rawText = message.content[0].type === "text" ? message.content[0].text : ""
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("AI 응답에서 JSON을 파싱할 수 없습니다")
    }

    const result: GenerateGraphResponse = JSON.parse(jsonMatch[0])

    // 순환 참조 검증
    const hasCycle = detectCycle(result.nodes)
    if (hasCycle) {
      result.warnings.push("⚠️ 순환 참조가 감지되었습니다. 그래프를 확인하세요.")
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("generate-graph error:", error)
    return NextResponse.json({ error: "그래프 생성 중 오류가 발생했습니다" }, { status: 500 })
  }
}

function detectCycle(nodes: GeneratedNode[]): boolean {
  const visited = new Set<string>()
  const recStack = new Set<string>()

  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    recStack.add(nodeId)

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return false

    for (const prereqId of node.prerequisites) {
      if (!visited.has(prereqId)) {
        if (dfs(prereqId)) return true
      } else if (recStack.has(prereqId)) {
        return true
      }
    }

    recStack.delete(nodeId)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true
    }
  }

  return false
}
