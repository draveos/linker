# Linker 시스템 아키텍처

## 1. 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                        │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────┐        │
│  │ Landing  │  │  Home Canvas  │  │  Learn Page  │        │
│  │    /     │  │    /home      │  │    /learn    │        │
│  └──────────┘  └───────────────┘  └──────────────┘        │
│         │              │                  │                │
│         ▼              ▼                  ▼                │
│  ┌─────────────────────────────────────────────────┐       │
│  │  React State + localStorage (lib/graph-store)   │       │
│  └─────────────────────────────────────────────────┘       │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP + SSE (ReadableStream)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                Next.js API Routes (Server)                  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────┐     │
│  │/analyze-error  │  │/generate-graph │  │  /chat   │     │
│  │ SSE multi-agent│  │ Sonnet call    │  │ streaming│     │
│  └────────┬───────┘  └────────┬───────┘  └────┬─────┘     │
│           │                    │                │           │
│           ▼                    ▼                ▼           │
│  ┌──────────────────────────────────────────────────┐      │
│  │  @anthropic-ai/sdk (Haiku 4.5 + Sonnet 4.6)     │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                 Anthropic API (Claude)
```

## 2. 라우팅 구조

```
/                → 랜딩 페이지 (히어로, 애니메이션 데모 목업, 3D 캐러셀)
/login           → 로그인 (데모용, 인증 없음)
/signup          → 회원가입 (데모용)
/home            → 홈 캔버스 (그래프 카드 그리드, 휴지통, 최근 열람)
/learn           → 학습 페이지 (사이드바 + 그래프 캔버스 + RemedyPanel + Chatbot)

/api/analyze-error    → Multi-agent Harness (SSE)
/api/generate-graph   → 그래프 생성 (Sonnet, JSON)
/api/chat             → 챗봇 (Haiku, streaming)
/api/validate-context → 컨텍스트 검증 (Haiku, JSON)
```

## 3. 컴포넌트 트리

### `/learn` 페이지

```
LearnPage
├── LeftSidebar
│   ├── 오답 입력 (textarea)
│   ├── 데모 프리셋 (튜토리얼만)
│   ├── 결손 개념 분석 버튼
│   ├── 정보 패널 (현재 그래프)
│   └── 최근 분석 기록
├── KnowledgeGraphCanvas (ReactFlow)
│   ├── ConceptNode (custom)
│   ├── DeletableEdge (custom)
│   ├── Analysis Overlay (isAnalyzing)
│   ├── Edit Mode Controls
│   ├── Legend / Filter
│   └── AI 정리 Modal + Toast
├── RemedyPanel (portal)
│   ├── Header (노드 정보 + 뱃지)
│   ├── Explanation
│   ├── AI 분석 과정 trace (접기)
│   ├── 마이크로 러닝
│   ├── 퀴즈 (게이트)
│   └── Footer (학습 완료 버튼)
├── Chatbot
│   ├── 로그 사이드바
│   ├── 모드 토글 (질문 / 문제풀이)
│   └── 스트리밍 메시지
└── 복원 배너 (restoreSnapshot 활성 시)
```

## 4. 상태 관리

### 로컬 (React state)
- `graphNodes`, `masteredNodeIds`, `graphDomain` — 현재 그래프
- `selectedNode`, `activeRootCause` — UI 상태
- `aiContentMap` — 노드별 AI 분석 결과 캐시
- `recentAnalyses` — 세션 내 분석 목록
- `restoreSnapshot` — 이전 상태 복원용
- `analysisStep`, `analysisStepLabels` — SSE 진행 상태

### 영속 (localStorage via `lib/graph-store.ts`)
- `linker_graphs` — 저장된 그래프 목록
- `linker_active_graph_id` — 현재 선택된 그래프 ID
- `linker_trash` — 삭제된 그래프 (최대 3개, 7일 만료)
- `linker_error_logs` — 오답 입력 로그 (최대 10개, 분석 결과 포함)
- `linker_recent_analyses` — 분석 기록 (최대 5개)
- `linker_ai_organize_skip_until` — AI 정리 confirm 스킵 flag

## 5. Multi-Agent Harness 상세

[→ agents-design.md 참조](./agents-design.md)

## 6. 데이터 모델

### KnowledgeNode
```ts
interface KnowledgeNode {
  id: string
  label: string
  description: string
  prerequisites: string[]    // 다른 노드 ID들
  confidence?: number        // 0~1, Sonnet이 생성 시 부여
}
```

### SavedGraph
```ts
interface SavedGraph {
  id: string
  domain: string
  nodes: KnowledgeNode[]
  masteredNodeIds: string[]
  analysisCount: number
  createdAt: string          // ISO
  updatedAt: string
  lastViewedAt?: string
  nodePositions?: Record<string, { x: number; y: number }>
  isTutorial?: boolean       // 튜토리얼 그래프 보호
}
```

### AnalyzeErrorResponse
```ts
interface AnalyzeErrorResponse {
  rootCauseNodeId: string
  rootCauseLabel: string
  explanation: string
  microLearning: { title, content, summary, quiz }
  confidence: number
  traversalPath: string[]
  verificationRounds?: number
  agentTrace?: AgentTraceEntry[]
  exitReason?: ExitReason
}
```

## 7. 주요 설계 결정

### A. 왜 Next.js App Router?
- Server Components + Server Actions로 AI API 호출을 서버에 격리
- SSE streaming 기본 지원 (ReadableStream)
- Vercel 배포 최적화

### B. 왜 ReactFlow?
- DAG 시각화에 검증된 라이브러리
- 드래그 / 연결 / 커스텀 노드·엣지 모두 지원
- 서버 사이드 렌더링 불필요 (canvas는 client 전용)

### C. 왜 localStorage만 (백엔드 없음)?
- 해커톤 MVP 스코프
- 단일 사용자 시나리오로 충분
- v2에선 Supabase 이관 계획

### D. 왜 SSE (WebSocket 아님)?
- 단방향 스트리밍(서버 → 클라이언트)으로 충분
- HTTP 기반 → Vercel serverless와 호환
- 재연결 로직 간단

### E. 왜 Multi-Agent Harness?
- 단일 Haiku 호출 시 애매한 오답에서 근본 원인 오판 빈번
- Verifier를 붙이면 "더 근본적 원인이 있는지" 재검토 가능
- 확신도 높을 땐 스킵 → 평균 비용 증가 최소화
