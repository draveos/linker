# Linker — Claude Code 개발 가이드

## 프로젝트 개요

Linker는 AI 지식 그래프 기반 학습 결손 추적 솔루션입니다. 학생의 오답을 분석해 지식 그래프의 근본 원인 노드를 찾아주고, 맞춤형 마이크로 러닝을 제공합니다.

핵심 차별점: Multi-Agent Harness (Proposer → Verifier → Content Generator) 협업 루프로 단일 AI 호출보다 정확한 진단.

---

## 기술 스택

- 프레임워크: Next.js 16.2 (App Router, Turbopack)
- 언어: TypeScript 5.7 (strict)
- 런타임: React 19 + `@anthropic-ai/sdk` 0.87
- 스타일: Tailwind CSS 4 + shadcn/ui
- 그래프: ReactFlow 11
- 저장: localStorage (해커톤 MVP)
- 배포: Vercel (Node.js serverless, SSE 지원)

## AI 모델

- Haiku 4.5 (`claude-haiku-4-5-20251001`): Proposer / Verifier / Content Gen / Chat / Context Validate
- Sonnet 4.6 (`claude-sonnet-4-6`): Graph Generation (복잡 구조 추론)

## 파일 구조

```
app/
├── api/
│   ├── analyze-error/route.ts      ← Multi-agent SSE (핵심)
│   ├── generate-graph/route.ts     ← Sonnet 그래프 생성
│   ├── chat/route.ts               ← Haiku 스트리밍 챗
│   └── validate-context/route.ts   ← 컨텍스트 보강 Q&A
├── page.tsx                         ← 랜딩
├── login/signup/page.tsx            ← 인증 (데모)
├── home/page.tsx                    ← 홈 캔버스 (그래프 목록)
└── learn/page.tsx                   ← 학습 페이지 (메인)

components/
├── knowledge-graph-canvas.tsx       ← ReactFlow 래퍼 (700+ 줄)
├── left-sidebar.tsx                 ← 오답 입력 + 로그 + 분석
├── remedy-panel.tsx                 ← 분석 결과 모달 (portal)
├── chatbot.tsx                      ← 떠있는 챗봇
└── ui/                              ← shadcn 기본 컴포넌트

lib/
├── graph-store.ts                   ← localStorage CRUD (모든 영속 로직)
├── constants.ts                     ← MAX_CONTEXT_QUESTIONS 등
└── utils.ts                         ← cn() 헬퍼

docs/
├── AI_REPORT.md                     ← 공모전 제출 리포트 (양식 기반)
├── architecture.md                  ← 시스템 구조
├── agents-design.md                 ← Harness 에이전트 상세
├── prompt-engineering.md            ← 프롬프트 전략
└── ai-collaboration.md              ← 개발 과정 기록
```

---

## 핵심 컨벤션

### 노드 상태 3종

노드는 항상 다음 3가지 중 하나:

```ts
type NodeType = "standard" | "mastered" | "missing"
```

- standard (학습 필요): 기본 상태 — 회색
- mastered (완료): `masteredNodeIds`에 포함 — 파란색 (`bg-blue-500`)
- missing (결손): `activeRootCause`와 같은 ID — 빨간색 + pulse

상태 전환 로직:
- `missing` → 퀴즈 통과 후 학습완료 클릭 → `standard` (activeRootCause만 클리어)
- `standard` → 학습완료 클릭 → `mastered`
- `mastered` → 학습완료 클릭 → `standard` (토글 해제)

### 엣지 ID 규칙

엣지 ID는 항상 `${prereqId}-${nodeId}` 포맷.

예: 노드 3이 노드 4의 선행이면 엣지 ID는 `"3-4"`.

### 색상 팔레트 (얕은 네온)

```ts
// 기본 노드
"bg-slate-900 border-indigo-400/50 text-indigo-200 shadow-[0_0_8px_rgba(99,102,241,0.15)]"

// 마스터 노드
"bg-slate-900 border-cyan-400/70 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.22)]"

// 결손 노드
"bg-rose-950 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.55)] animate-pulse"

// 엣지 색상 (CSS 변수 대신 직접 hex — SVG에서 resolve 안 됨)
const EDGE_COLOR_DEFAULT  = "#94a3b8"  // slate-400
const EDGE_COLOR_DANGER   = "#ef4444"  // red-500
const EDGE_COLOR_TRAVERSE = "#f59e0b"  // amber-400
```

### SSE 이벤트 타입

API route에서 export, 프론트에서 `import type`:

```ts
// app/api/analyze-error/route.ts
export type ExitReason = "confidence_high" | "verifier_agreed" | "converged" | "max_rounds"
export type AgentTraceEntry =
  | { role: "proposer"; round: number; nodeId: string; ... }
  | { role: "verifier"; round: number; agree: boolean; ... }
```

### localStorage 키

모두 `linker_` 접두사:

- `linker_graphs` — SavedGraph 배열
- `linker_active_graph_id` — 현재 선택
- `linker_trash` — 삭제된 그래프 (max 3, 7일)
- `linker_error_logs` — 오답 입력 로그 (max 10)
- `linker_recent_analyses` — 분석 기록 (max 5)
- `linker_ai_organize_skip_until` — AI 정리 confirm 스킵 (toDateString)

---

## 상수

```ts
// app/api/analyze-error/route.ts
const MAX_ROUNDS = 3
const CONFIDENCE_THRESHOLD = 0.8

// lib/constants.ts
export const MAX_CONTEXT_QUESTIONS = 3

// lib/graph-store.ts
const MAX_TRASH_ITEMS = 3
const TRASH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ERROR_LOGS = 10
const MAX_ANALYSES = 5
```

---

## 개발 규칙

### 금지 사항

- ❌ `.env.local` 수정/커밋
- ❌ 사용자 확인 없이 `git push`, `git reset --hard`, `rm -rf`
- ❌ 새 파일 생성 (기존 편집 선호)
- ❌ 요구되지 않은 리팩터링/추상화
- ❌ 주석으로 무엇을 하는지 설명 (변수명으로 표현)
- ❌ 프로젝트 무관한 기능 추가

### 권장 사항

- ✅ 기존 파일 Edit 선호
- ✅ 변경 후 `npx tsc --noEmit`으로 타입 체크
- ✅ 여러 파일 동시 수정 (Edit 병렬)
- ✅ 트레이드오프 명시 후 사용자 선택 요청
- ✅ 위험한 작업 전 확인

---

## API 라우트 상수

### analyze-error

- `maxDuration = 60` (Vercel timeout 연장)
- `dynamic = "force-dynamic"` (캐시 방지)
- SSE 응답: `text/event-stream`
- 포맷: `data: ${JSON.stringify(data)}\n\n`

### generate-graph

- `maxDuration = 60`
- Sonnet 호출 + 클라이언트 사이드 `detectCycle()` 검증

---

## 공통 버그/함정

### 1. SVG에서 CSS 변수 미동작
❌ `stroke="hsl(var(--border))"` — 렌더 안 됨
✅ 직접 hex 사용

### 2. Edge hover 영역
엣지 클릭 감지를 위해 투명한 wide path 추가:
```tsx
<path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} />
<path d={edgePath} fill="none" stroke={actualColor} strokeWidth={2} />
```

### 3. Tailwind 동적 클래스 금지
❌ `bg-${color}-500` — Tailwind가 못 찾음
✅ Lookup map:
```ts
const COLORS = {
  blue: { bg: "bg-blue-500" },
  red:  { bg: "bg-red-500" },
}
```

### 4. SSE 파싱
```ts
const parts = buffer.split("\n\n")
buffer = parts.pop() ?? ""   // 마지막은 불완전할 수 있음
for (const part of parts) {
  if (!part.startsWith("data: ")) continue
  const data = JSON.parse(part.slice(6))
  // ...
}
```

### 5. React Hooks 순서
조건부 return 전에 hooks 호출 금지. `useMemo` 등은 항상 맨 위.

### 6. ReactFlow 노드 리빌드
`props.nodes` 레퍼런스 변경 시 rebuild 트리거. 불필요한 리빌드 방지 위해 `prevNodesRef` 패턴 사용.

---

## 빌드/배포

```bash
pnpm install
pnpm build           # 타입 체크 + Turbopack 빌드
pnpm dev             # 개발 서버
```

배포 (Vercel):
1. `vercel login` → `vercel`
2. `vercel env add ANTHROPIC_API_KEY` (Production/Preview/Development)
3. `vercel --prod`

환경 변수: `ANTHROPIC_API_KEY` 필수. Anthropic SDK가 자동으로 `process.env`에서 읽음.

---

## 테스트 시나리오

배포 후 필수 체크:

1. `/` 랜딩 → 스크롤 시 애니메이션 / 3D 캐러셀 / 데모 목업 정상
2. `/login` → "홈으로" 버튼 작동
3. `/home` → 튜토리얼 카드 최상단
4. `/learn` 튜토리얼 진입:
   - 데모 프리셋 "명확한 오답" 클릭 → 분석 실행
   - SSE 스트리밍 정상 (스텝 라벨 변화)
   - 분석 결과 → RemedyPanel → agentTrace 펼치기
   - 퀴즈 정답 후 학습완료 버튼 활성화
5. 그래프 생성 모달 → 100자 미만 입력 → AI 질문 대화 → 생성

---

## 빠른 참조

### 노드 ID 탐색
```ts
const node = graphNodes.find((n) => n.id === someId)
```

### 엣지 ID → prereq
```ts
const [prereqId, nodeId] = edgeId.split("-")
```

### Agent 호출
```ts
const msg = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 200,
  messages: [{ role: "user", content: prompt }],
})
const raw = msg.content[0].type === "text" ? msg.content[0].text : ""
```

### SSE 이벤트 전송
```ts
controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
```

### localStorage 안전 접근
```ts
function isClient() { return typeof window !== "undefined" }

if (isClient()) {
  localStorage.setItem(KEY, JSON.stringify(value))
}
```
