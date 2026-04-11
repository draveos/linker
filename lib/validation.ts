// ── 입력 검증 + injection 방어 ──

export const LIMITS = {
  errorText: 2000,           // 오답 분석 입력
  lectureText: 5000,         // 강의 텍스트
  domain: 100,               // 도메인명
  chatMessage: 1000,         // 챗봇 메시지 1개
  chatHistory: 20,           // 챗봇 대화 히스토리 메시지 수
  chatTotalChars: 10_000,    // 챗봇 전체 입력 합산 (약 2500 tokens)
  nodes: 50,                 // 그래프 노드 개수
  contextMessage: 500,       // 컨텍스트 Q&A 메시지 1개
  contextHistory: 10,        // 컨텍스트 Q&A 히스토리 길이
} as const

// Prompt injection 의심 패턴 — 영어 + 한국어
const INJECTION_PATTERNS: RegExp[] = [
  // 영어
  /ignore\s+(the\s+)?(previous|prior|all|above|earlier)\s+(instructions?|prompts?|rules?|messages?)/i,
  /disregard\s+(the\s+)?(previous|prior|all|above)/i,
  /forget\s+(everything|all|previous|your\s+instructions)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /\bsystem\s*:\s*$/im,
  /\[\s*system\s*\]/i,
  /<<\s*sys\s*>>/i,
  /\bjailbreak\b/i,
  /\bDAN\s*(mode)?\b/,
  /developer\s+mode/i,
  /reveal\s+(the\s+)?(system\s+)?prompt/i,
  /show\s+me\s+your\s+(system\s+)?(instructions?|prompts?)/i,
  /what\s+are\s+your\s+(system\s+)?instructions/i,
  /print\s+(your\s+)?(instructions?|prompts?|rules?)/i,

  // 한국어
  /이전\s*(지시|지침|명령|규칙)\s*(을|은|는)?\s*(무시|잊|지워)/,
  /위\s*(지시|지침|명령|규칙)\s*(을|은|는)?\s*(무시|잊|지워)/,
  /지침\s*(을|은|는)?\s*(무시|무효|잊)/,
  /(너|당신)\s*(의)?\s*역할\s*(을|은|는)?\s*(바꿔|변경|무시|잊)/,
  /(너|당신)\s*는?\s*이제\s*(해커|다른|새로운)/,
  /시스템\s*(프롬프트|지침)\s*(을|은|는)?\s*(보여|알려|출력)/,
  /원래\s*지침\s*(을|은|는)?\s*(공개|출력|보여)/,
]

export interface ValidationResult {
  ok: boolean
  error?: string
}

/** 텍스트 필드 검증: 빈값 / 길이 / injection 패턴 */
export function validateText(
  text: unknown,
  maxLen: number,
  fieldName = "입력"
): ValidationResult {
  if (typeof text !== "string") {
    return { ok: false, error: `${fieldName}이 올바르지 않습니다` }
  }
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, error: `${fieldName}이 비어있습니다` }
  }
  if (text.length > maxLen) {
    return { ok: false, error: `${fieldName}이 너무 깁니다 (${maxLen}자 이하)` }
  }
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, error: "부적절한 입력 패턴이 감지되었습니다" }
    }
  }
  return { ok: true }
}

/** 노드 배열 검증: 형태 / 개수 / 각 필드 */
export function validateNodes(nodes: unknown): ValidationResult {
  if (!Array.isArray(nodes)) {
    return { ok: false, error: "노드가 배열이 아닙니다" }
  }
  if (nodes.length === 0) {
    return { ok: false, error: "노드가 비어있습니다" }
  }
  if (nodes.length > LIMITS.nodes) {
    return { ok: false, error: `노드가 너무 많습니다 (${LIMITS.nodes}개 이하)` }
  }
  for (const n of nodes) {
    if (
      !n || typeof n !== "object" ||
      typeof (n as { id?: unknown }).id !== "string" ||
      typeof (n as { label?: unknown }).label !== "string" ||
      typeof (n as { description?: unknown }).description !== "string" ||
      !Array.isArray((n as { prerequisites?: unknown }).prerequisites)
    ) {
      return { ok: false, error: "노드 형식이 올바르지 않습니다" }
    }
  }
  return { ok: true }
}

/** 챗봇 메시지 배열 검증 */
export function validateChatMessages(messages: unknown): ValidationResult {
  if (!Array.isArray(messages)) {
    return { ok: false, error: "메시지가 배열이 아닙니다" }
  }
  if (messages.length === 0) {
    return { ok: false, error: "메시지가 비어있습니다" }
  }
  if (messages.length > LIMITS.chatHistory) {
    return { ok: false, error: `대화 히스토리가 너무 깁니다 (${LIMITS.chatHistory}개 이하)` }
  }

  let totalChars = 0
  for (const m of messages) {
    if (
      !m || typeof m !== "object" ||
      typeof (m as { role?: unknown }).role !== "string" ||
      typeof (m as { content?: unknown }).content !== "string"
    ) {
      return { ok: false, error: "메시지 형식이 올바르지 않습니다" }
    }
    const content = (m as { content: string }).content
    if (content.length > LIMITS.chatMessage) {
      return { ok: false, error: `메시지가 너무 깁니다 (${LIMITS.chatMessage}자 이하)` }
    }
    totalChars += content.length
    // 각 메시지 내용도 injection 체크
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(content)) {
        return { ok: false, error: "부적절한 입력 패턴이 감지되었습니다" }
      }
    }
  }

  if (totalChars > LIMITS.chatTotalChars) {
    return {
      ok: false,
      error: `전체 입력이 너무 깁니다 (${LIMITS.chatTotalChars}자 이하)`,
    }
  }

  return { ok: true }
}

/** 컨텍스트 검증용 히스토리 배열 검증 */
export function validateContextHistory(history: unknown): ValidationResult {
  if (history === undefined || history === null) return { ok: true }
  if (!Array.isArray(history)) {
    return { ok: false, error: "히스토리가 배열이 아닙니다" }
  }
  if (history.length > LIMITS.contextHistory) {
    return { ok: false, error: `히스토리가 너무 깁니다 (${LIMITS.contextHistory}개 이하)` }
  }
  for (const m of history) {
    if (
      !m || typeof m !== "object" ||
      typeof (m as { role?: unknown }).role !== "string" ||
      typeof (m as { content?: unknown }).content !== "string"
    ) {
      return { ok: false, error: "히스토리 형식이 올바르지 않습니다" }
    }
    const content = (m as { content: string }).content
    if (content.length > LIMITS.contextMessage) {
      return { ok: false, error: `히스토리 메시지가 너무 깁니다` }
    }
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(content)) {
        return { ok: false, error: "부적절한 입력 패턴이 감지되었습니다" }
      }
    }
  }
  return { ok: true }
}

/** 출력에서 사용자 입력을 격리하는 델리미터 포맷 */
export function wrapUserInput(text: string, tag = "USER_INPUT"): string {
  return `<${tag}>\n${text}\n</${tag}>`
}
