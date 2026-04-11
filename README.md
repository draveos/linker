<div align="center">

# 🧠 Linker

### AI 지식 그래프 기반 학습 결손 추적 솔루션

오답을 보고 *"계산 실수"*로 넘기는 시대는 끝났습니다.
Linker는 학생의 오답을 지식 그래프 위에서 역추적해 진짜 막힌 개념을 찾아주고, 3분 마이크로 러닝으로 즉시 메꿔줍니다.

2026 KIT 바이브코딩 공모전 출품작 · 교육 AI 솔루션 부문

[데모 영상](#데모) · [핵심 기능](#핵심-기능) · [Multi-Agent Harness](#multi-agent-harness--동작-원리) · [기술 스택](#기술-스택) · [AI 리포트](docs/AI_REPORT.md)

---

</div>

## 해결하는 문제

> "같은 실수를 반복하는데, 학생도 교사도 근본 원인을 모른다"

학생이 역행렬을 틀리면 *"계산 실수네"*로 넘어갑니다. 2주 뒤 고유값 문제에서 또 행렬식이 나오면 또 틀립니다. 진짜 원인은 행렬식의 부호 규칙 결손 — 표면 증상이 아닌 근본 원인입니다.

| 페인 포인트 | 기존 해결책의 한계 |
|---|---|
| 같은 실수의 무한 반복 | "계산 실수"로 진단이 끝남 |
| 개념 의존성을 머릿속에 못 그림 | 정적 커리큘럼 트리만 제공 |
| ChatGPT는 누적 약점을 기억 못 함 | 질문마다 독립 세션 |
| 교사 1:1 진단 시간 부족 | 30명 × 5분 = 한 학급에 2.5시간 |

→ Linker는 그래프 역추적 + Multi-Agent 검증으로 진짜 결손 노드를 찾고, 퀴즈 게이트로 이해를 검증한 뒤에만 마스터 처리합니다. 학생의 분석 결과는 같은 학급을 운영하는 교수의 대시보드로 실시간 흘러가, 교수가 약점 패턴을 보고 개입 알림을 직접 보낼 수 있습니다.

---

## 데모

`public/` 디렉터리에 실제 동작 영상이 포함되어 있습니다.

| 영상 | 보여주는 것 |
|---|---|
| [`hero_thumbnale.mp4`](public/hero_thumbnale.mp4) | 랜딩 페이지 히어로 데모 |
| [`graph_generation_demo.mp4`](public/graph_generation_demo.mp4) | 강의 텍스트 → Sonnet으로 그래프 자동 생성 |
| [`analysis_report_demo.mp4`](public/analysis_report_demo.mp4) | 오답 입력 → Multi-Agent 분석 → 근본 원인 + 마이크로 러닝 |

라이브 시연은 `pnpm dev` 실행 후 `http://localhost:3000`에서 가능합니다.

---

## 핵심 기능

### 1. 학생/교수 듀얼 워크스페이스 + 양방향 데이터 루프
로그인 시 학생 또는 교수 역할을 선택. 같은 인프라 위에서 두 페르소나가 실시간으로 연결됩니다.

- 학생 → `/home` 그래프 캔버스 + `/learn` 진단·학습 모드
- 교수 → `/teacher` 학급 대시보드 + `/teacher/class/[id]` 학급 약점 분포 + 개입 액션
- 학생이 오답을 분석하면 → `LiveStudentRecord`가 그래프에 누적 → 교수 대시보드의 약점 분포가 탭 간 storage 이벤트로 즉시 갱신
- 교수가 개입 알림을 보내면 → 학생 홈 우상단 벨 아이콘에 unread badge + 토스트로 즉시 표시

### 2. 학급 라이프사이클 관리 (생성 → 운영 → 폐지)
교수가 실제 학급을 만들고 그래프와 연결, 운영 후 강좌 종료 시 폐지까지 한 흐름:

- `CreateClassModal`로 학급 + 도메인 + 연결할 그래프 지정
- 학급 상세에서 학생들의 누적 약점 분포 + 도메인 추천 개입 액션 확인
- 강좌 종료 시 `retireGraph`로 폐지 → 학생에게 알림 → 학생이 직접 삭제 가능
- 데모 모드 토글 (mock 5개 학급)과 실제 학급이 통합 리스트로 표시 — 시연/실사용 모두 대응

### 3. Multi-Agent Harness — 핵심 차별화
3개 Claude Haiku 4.5 에이전트의 협업 루프로 단일 호출보다 정확한 진단:

```
Proposer (제안)  →  Verifier (검증)  →  Content Generator (콘텐츠)
        ↑________________↓
   confidence < 0.8이면 critique 반영해 재추론 (최대 3 라운드)
```

- 조기 종료 4가지: `confidence_high` / `verifier_agreed` / `converged` / `max_rounds`
- Two-phase optimization: 루프 중엔 진단만, 콘텐츠는 최종 1회 → ~54% 토큰 절감
- SSE 실시간 스트리밍: 사용자가 "AI가 지금 뭘 하는지" 인지 가능 (블랙박스 방지)

### 4. 동적 지식 그래프 (DAG 시각화)
ReactFlow 11 위에서 개념 간 의존 관계를 실시간 렌더링.

- 3가지 노드 상태: `mastered` (파란), `standard` (회색), `missing` (빨강 + pulse)
- 노드 추가/삭제/이름변경/드래그 + AI 자동 정리 모드
- 도메인별 컬러/아이콘 테마 (선형대수, 미적분, 알고리즘, 분자생물학 등)

### 5. 퀴즈 게이트 — 이해 검증 없이 못 넘어감
결손 노드는 확인 퀴즈 정답 후에만 "학습 완료" 버튼이 활성화됩니다. *"대충 알겠다"*로 넘어가는 메타인지 함정을 차단합니다.

### 6. 강의 텍스트 → 그래프 자동 생성
Claude Sonnet 4.6이 강의 노트를 DAG JSON으로 변환. 입력이 100자 미만이면 Haiku가 추가 질문(최대 3회)으로 컨텍스트를 보강한 뒤 Sonnet 1회 호출로 품질 확보.

### 7. 개인 학습 인사이트 + Frontier 추천
`getLearningInsights`가 그래프별로 누적된 분석 기록을 자동 집계해 학생 홈에 표시합니다.

- 누적 분석 횟수, 마스터 비율, top weakness 3개
- Frontier node — 다음으로 학습하기 좋은 노드 자동 추천
- *"내가 행렬식에서 3번 막혔구나"* 같은 개인 약점 패턴이 시간이 지날수록 풍부해짐
- 모든 오답·분석·trace는 그래프별로 격리된 로그에 저장되어 교차 유출 차단

### 8. 알림 / 개입 시스템
`Notification` 타입과 SSE 같은 라이브 토스트로 교수↔학생 사이의 실시간 메시징:

- 교수가 학급 상세에서 개입 액션 확인 → `sendNotification`으로 학생들에게 일괄 발송
- 학생 홈 우상단 벨 아이콘 + unread badge + 새 알림 수신 토스트
- 모달로 본문 확인, 일괄 읽음 처리 / 개별 삭제 / 전체 삭제

### 9. 5단계 온보딩 슬라이드쇼
첫 로그인 시 인터랙티브 애니메이션으로 핵심 가치 전달. 가상 마우스 커서가 캔버스에서 노드를 추가·연결하는 *"flawless"* 데모, 멀티 에이전트 4-phase 시뮬레이션, 퀴즈 idle→오답→정답 사이클 등.

---

## Getting Started

### 로컬 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수
cp .env.example .env.local  # 없으면 직접 생성
# .env.local 내용:
# ANTHROPIC_API_KEY=sk-ant-...

# 3. 개발 서버
pnpm dev
```

→ [http://localhost:3000](http://localhost:3000)

### 프로덕션 배포 (Vercel)

```bash
vercel login
vercel
vercel env add ANTHROPIC_API_KEY    # Production / Preview / Development 모두
vercel --prod
```

> Vercel 설정 주의: `analyze-error` API 라우트는 `maxDuration = 60`을 사용합니다 (멀티 에이전트 루프가 기본 10초를 넘을 수 있음).

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| Frontend | Next.js 16.2 (App Router · Turbopack) · React 19 · TypeScript 5.7 |
| 스타일 | Tailwind CSS 4 + shadcn/ui (Radix UI 기반) |
| 그래프 | ReactFlow 11 |
| AI SDK | @anthropic-ai/sdk 0.87 |
| AI 모델 | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) + Sonnet 4.6 (`claude-sonnet-4-6`) |
| 저장소 | localStorage (해커톤 MVP) → v2 Supabase 계획 |
| 스트리밍 | Server-Sent Events (Vercel Node.js Serverless 지원) |
| 개발 파트너 | Claude Code (Opus 4.6 · 1M context) + v0.app (초기 UI 프로토타입) |

---

## 프로젝트 구조

```
app/
├── api/
│   ├── analyze-error/      # Multi-Agent Harness SSE (핵심)
│   ├── generate-graph/     # Sonnet 그래프 생성
│   ├── chat/               # Haiku 챗봇 스트리밍
│   └── validate-context/   # 컨텍스트 보강 Q&A
├── page.tsx                # 랜딩 (3D 캐러셀 + 데모 영상)
├── login/  signup/         # 인증 + 역할 선택 (학생/교수)
├── onboarding/             # 5단계 인터랙티브 슬라이드쇼
├── home/                   # 학생 — 그래프 카드 그리드
├── learn/                  # 학생 — 학습 페이지 (메인)
└── teacher/
    ├── page.tsx            # 교수 — 학급 대시보드 (생성/삭제/데모 토글)
    └── class/[id]/         # 교수 — 학급 상세 (live 약점 분포 + 개입 액션 + 그래프 폐지)

components/
├── knowledge-graph-canvas.tsx   # ReactFlow 래퍼 (700+ 줄)
├── left-sidebar.tsx             # 오답 입력 + 분석 기록
├── remedy-panel.tsx             # 분석 결과 + agentTrace 패널
├── chatbot.tsx                  # 떠있는 챗봇
└── ui/                          # shadcn 컴포넌트

lib/
├── graph-store.ts          # localStorage CRUD — 그래프 / 학급 / 알림 / live records / insights
├── mock-classes.ts         # 교수 대시보드 데모 데이터 (5개 학급 · 130명 학생)
├── validation.ts           # 입력 검증 + prompt injection 방어
├── rate-limit.ts           # IP 기반 rate limit
├── constants.ts
└── utils.ts                # cn() 헬퍼

docs/
├── AI_REPORT.md            # 공모전 제출 리포트 (양식 기반)
├── architecture.md         # 시스템 구조
├── agents-design.md        # Harness 에이전트 상세
├── prompt-engineering.md   # 프롬프트 전략
└── ai-collaboration.md     # 개발 과정 기록

CLAUDE.md                   # Claude Code 개발 지침
```

---

## Multi-Agent Harness — 동작 원리

### 에이전트 분업

| Agent | 모델 | 역할 | max_tokens |
|---|---|---|---|
| Proposer | Haiku 4.5 | 그래프 역추적으로 근본 원인 후보 제안 | 200 |
| Verifier | Haiku 4.5 | 비판적 검토 — 더 근본적 prereq가 없는지 검증 | 200 |
| Content Gen | Haiku 4.5 | 확정된 결손 개념의 마이크로 러닝 + 퀴즈 생성 | 800 |

### 루프 다이어그램

```
[Step 1] 오류 패턴 분석
    ↓
[Step 2] Proposer R1  ──→  confidence ≥ 0.8 ? ──YES──→ Step 5
    ↓ NO
[Step 3] Verifier R1  ──→  agree ?           ──YES──→ Step 5
    ↓ NO
[Step 4] Proposer R2 (+ critique)
    ↓
   ... (최대 3 라운드)
    ↓
[Step 5] Content Generator (1회만 호출)
    ↓
   최종 결과
```

### 조기 종료 4가지 (토큰 낭비 차단)

| ExitReason | 조건 |
|---|---|
| `confidence_high` | Proposer confidence ≥ 0.8 → 즉시 종료 |
| `verifier_agreed` | Verifier가 동의 → 종료 |
| `converged` | 같은 노드 2회 연속 제안 → 수렴 인지 |
| `max_rounds` | 3 라운드 도달 → 강제 종료 |

### 서버 디버그 로그 (실제 출력)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Harness] 오답 분석 시작
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Proposer R1]  노드: 행렬식 (ID: 4)  · conf 0.72
   추론: 학생이 ad-bc 공식의 부호 순서를...
[!] confidence < 0.8 → Verifier 호출
[Verifier]     동의: NO
   반박: 실제로는 행렬 곱셈 순서가 더 근본적...
[*] Proposer 재호출 (critique 반영)
[Proposer R2]  노드: 행렬 곱셈 (ID: 3)  · conf 0.91
[최종] 행렬 곱셈 (라운드: 2 · trace 3개 · exit: confidence_high)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 토큰 효율 — 측정된 최적화

### ① 모델 계층화

| 모델 | 용도 | 호출 빈도 | 토큰/호출 |
|---|---|---|---|
| Haiku 4.5 | 분석 · 검증 · 콘텐츠 · 챗봇 · 컨텍스트 | 많음 (~15) | 200–800 |
| Sonnet 4.6 | 그래프 생성 (구조적 추론) | 적음 (1) | 2000–4000 |

→ 모든 작업을 Sonnet으로 돌리는 경우 대비 ~70% 토큰 비용 절감 (추정)

### ② Two-phase Proposer (핵심 최적화)

```
Before:  Proposer가 매 루프마다 explanation + microLearning + quiz까지 생성
         3 × 800tok = 2,400 tok

After :  루프 중엔 진단만 (100tok) · Content Gen은 최종 1회만 (800tok)
         3 × 100 + 800 = 1,100 tok    ← ~54% 절감
```

### ③ 압축 프롬프트 포맷

```diff
- {"id":"4","label":"행렬식","description":"ad-bc 계산","prerequisites":["3"]}
+ 4|행렬식|ad-bc 계산|prereqs:3
```

→ 노드 리스트 직렬화에서 ~40% 토큰 절감.

### ④ 조기 종료 + max_tokens 엄격 제한

평균 1.5 라운드에서 종료 → 최악(3 라운드) 대비 추가 ~50% 토큰 절감.

---

## 성과 지표 (자가 측정)

| 지표 | 값 |
|---|---|
| 평균 루프 라운드 | 1.5 |
| 평균 토큰 / 분석 | ~1,100 |
| SSE 이벤트 지연 | 80–150ms |
| 그래프 생성 성공률 | ~95% (Sonnet 1회 호출 기준) |
| 멀티 에이전트 루프 max duration | 60s (Vercel serverless) |

---

## 기존 솔루션 대비

| 기능 | ChatGPT/Gemini | 기존 LMS | Linker |
|---|:-:|:-:|:-:|
| 학습 구조 시각화 | X | △ 정적 트리 | O 동적 DAG |
| 근본 원인 추적 | X 질문별 독립 | X | O 그래프 역추적 + Verifier |
| 학습 이력 누적 | X | △ 점수만 | O 개념별 약점 프로파일 |
| 자동 마이크로 러닝 | △ 수동 요청 | X | O 결손 노드에 자동 생성 |
| 이해 검증 게이트 | X | △ 일괄 채점 | O 퀴즈 통과 필수 |
| 멀티 에이전트 품질 보장 | X | X | O Proposer-Verifier 루프 |
| 교수 1:N 진단 도구 | X | △ 성적표 | O 학급 생성 + 실시간 약점 분포 + 개입 알림 |
| 양방향 학생↔교수 데이터 루프 | X | X | O 학생 분석 → 교수 대시보드 즉시 갱신 |

---

## 데모 시나리오

튜토리얼 그래프에 3가지 데모 프리셋이 포함되어 있어 Harness 동작을 즉시 검증할 수 있습니다:

| 프리셋 | 기대 동작 | 검증 루프 |
|---|---|---|
| 명확한 오답 | 1라운드 즉시 종료 | Verifier 미발동 (confidence_high) |
| 모호한 오답 | 2라운드 | Verifier 발동 → 동의 |
| 복잡한 오답 | 2–3라운드 | Verifier 반박 → 재추론 → converged |

---

## 보안 & 안정성

- Prompt Injection 방어 — `lib/validation.ts`에서 입력 sanitize + delimiter wrapping
- IP 기반 Rate Limit — `lib/rate-limit.ts`로 분당 호출 제한
- 그래프별 데이터 격리 — 오답·분석·진행도가 graphId로 스코핑되어 교차 유출 차단
- 빈 그래프 / 에러 처리 — API 호출 전 pre-check + 사용자 친화적 토스트 메시지
- 타입 안전 SSE — `AgentTraceEntry` 유니온 타입을 API route에서 export → 프론트가 `import type`으로 재사용

---

## 로드맵

### v1 (현재 — 해커톤 제출본)
- [x] Multi-Agent Harness (Proposer · Verifier · Content Gen)
- [x] 학생/교수 듀얼 워크스페이스 + 양방향 데이터 루프
- [x] 동적 지식 그래프 + 퀴즈 게이트
- [x] 강의 텍스트 → 그래프 자동 생성
- [x] 5단계 인터랙티브 온보딩
- [x] 그래프별 학습 프로파일 누적 + Frontier 추천
- [x] 교수 학급 생성/관리 + 약점 분포 실시간 업데이트
- [x] 알림 / 개입 시스템 (교수 → 학생 직접 메시징)
- [x] 그래프 폐지 라이프사이클 (강좌 종료 → retire → 학생 알림)
- [x] 데모 모드 (mock 5개 학급) ↔ 실사용 학급 통합 뷰

### v2
- [ ] Supabase 백엔드 (multi-device 동기화 · 실제 학생 데이터 · 다중 사용자)
- [ ] WebSocket 또는 SSE로 탭 간 동기화 → 서버 푸시 동기화로 확장
- [ ] Prompt Caching으로 추가 토큰 절감
- [ ] Content Critic 에이전트 (마이크로 러닝 품질 검증)
- [ ] Prerequisite Miner (학습 패턴에서 새 prereq 자동 발견)
- [ ] 학급 단위 누적 분석 리포트 (주간/월간 PDF export)

---

## 더 읽기

- [AI 빌딩 리포트](docs/AI_REPORT.md) — 공모전 제출용 상세 리포트
- [시스템 아키텍처](docs/architecture.md) — 전체 구조 다이어그램
- [Multi-Agent 설계](docs/agents-design.md) — Harness 루프 상세
- [프롬프트 엔지니어링](docs/prompt-engineering.md) — 토큰 최적화 전략
- [AI 협업 기록](docs/ai-collaboration.md) — Claude Code와의 개발 과정
- [CLAUDE.md](CLAUDE.md) — 프로젝트 컨벤션 & 개발 가이드

---

## Built With Claude Code

이 프로젝트는 Claude Code (Opus 4.6 · 1M context)와의 지속적인 페어 프로그래밍으로 개발되었습니다.

> 인간은 비전·판단·UX 결정을 담당하고, AI는 구현·타입 체크·트레이드오프 분석을 담당합니다. 단순 코드 생성기가 아닌 추론하는 페어로 활용한 것이 핵심이며, 전체 코드의 약 80%가 Claude Code로부터 생성/수정되었습니다.

세션별 의사결정과 트레이드오프 논의는 [docs/ai-collaboration.md](docs/ai-collaboration.md)에 정리되어 있습니다.

---

## 라이선스

Educational use. 2026 KIT 바이브코딩 공모전 출품작.

---

<div align="center">

같은 실수를 반복하지 않는 학습.
*Linker가 그 차이를 만듭니다.*

</div>
