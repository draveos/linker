# 🧠 Linker

> **AI 지식 그래프 기반 학습 결손 추적 솔루션**
>
> 학생의 오답을 분석해 지식 그래프의 **근본 원인 노드**를 찾아주고, 맞춤형 마이크로 러닝을 제공합니다.

**2026 KIT 바이브코딩 공모전 출품작** · 교육 AI 솔루션 부문

---

## 🎯 해결하는 문제

**"같은 실수를 반복하는데, 학생도 교사도 근본 원인을 모른다"**

- 학생이 역행렬을 틀리면 "계산 실수"로 넘어가지만, 실제 원인은 **행렬식 개념 결손**인 경우가 대부분
- 2주 뒤 고유값 문제에서 또 행렬식이 나오면 또 틀림 → **반복되는 오답**
- ChatGPT는 질문마다 독립적이라 "이 학생이 어디서 막히는지" 기억하지 못함
- 교사는 30명 학급의 1:1 진단 시간이 없음

→ **Linker**는 지식 그래프 위에서 오답의 근본 원인을 역추적해, 표면 증상이 아닌 핵심 결손을 찾아줍니다.

---

## ✨ 핵심 기능

### 1. 지식 그래프 시각화
개념 간 의존 관계(DAG)를 ReactFlow로 렌더링. 완료/학습필요/결손을 색상으로 구분.

### 2. AI 오답 역추적
오답 텍스트 입력 → AI가 그래프를 역방향 순회 → 근본 원인 노드 특정 + traversal path 애니메이션.

### 3. **Multi-Agent Harness** 🔥
3개 Claude Haiku 에이전트의 협업 루프:

```
Proposer (제안) → Verifier (검증) → Content Generator (콘텐츠)
     ↑_____________↓
   확신도 낮으면 재추론
```

- **조기 종료 4가지**: 확신도/검증자 동의/수렴/max rounds
- **Two-phase optimization**: 루프 중엔 진단만, 콘텐츠는 최종 1회만 → ~54% 토큰 절감

### 4. 퀴즈 게이트
결손 노드는 **확인 퀴즈 정답 후에만** "학습 완료" 버튼 활성화 → 이해 검증 없이 넘어가는 것 방지.

### 5. 강의 텍스트 → 그래프 자동 생성
Claude Sonnet으로 강의 노트를 지식 그래프 JSON으로 변환. 입력 부족 시 Haiku가 추가 질문으로 컨텍스트 보강.

### 6. 학습 프로파일 누적
모든 분석 결과가 저장되어 개인 약점 패턴이 형성됨.

---

## 🚀 Getting Started

### 로컬 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 설정
cp .env.example .env.local  # 없으면 직접 생성
# .env.local 내용:
# ANTHROPIC_API_KEY=sk-ant-...

# 3. 개발 서버
pnpm dev
```

[http://localhost:3000](http://localhost:3000) 접속

### 배포 (Vercel)

```bash
vercel login
vercel
vercel env add ANTHROPIC_API_KEY    # Production/Preview/Development 모두
vercel --prod
```

---

## 🏗️ 기술 스택

| 레이어 | 기술 |
|---|---|
| Frontend | Next.js 16.2 (App Router) + React 19 + TypeScript |
| 스타일 | Tailwind CSS 4 + shadcn/ui |
| 그래프 | ReactFlow 11 |
| AI SDK | @anthropic-ai/sdk 0.87 |
| AI 모델 | Claude Haiku 4.5 + Sonnet 4.6 |
| 저장소 | localStorage (MVP) |
| 배포 | Vercel (Node.js serverless, SSE 지원) |
| 개발 파트너 | Claude Code (Opus 4.6, 1M context) |

---

## 📁 프로젝트 구조

```
app/
├── api/                   # AI API routes
│   ├── analyze-error/     # Multi-Agent SSE 핵심
│   ├── generate-graph/    # Sonnet 그래프 생성
│   ├── chat/              # 챗봇 스트리밍
│   └── validate-context/  # 컨텍스트 Q&A
├── page.tsx               # 랜딩 (애니메이션 데모 목업)
├── home/                  # 그래프 카드 그리드
└── learn/                 # 학습 페이지 (메인)

components/
├── knowledge-graph-canvas.tsx   # ReactFlow 래퍼
├── left-sidebar.tsx             # 오답 입력 + 로그
├── remedy-panel.tsx             # 분석 결과 + agentTrace
└── chatbot.tsx                  # 떠있는 챗봇

lib/
├── graph-store.ts         # localStorage CRUD
└── constants.ts

docs/                      # 공모전 제출 문서
├── AI_REPORT.md           # 양식 기반 리포트
├── architecture.md        # 시스템 구조
├── agents-design.md       # Harness 상세
├── prompt-engineering.md  # 프롬프트 전략
└── ai-collaboration.md    # 개발 과정 기록

CLAUDE.md                  # Claude Code 개발 가이드
```

---

## 📚 문서

- **[AI 빌딩 리포트](docs/AI_REPORT.md)** — 공모전 제출용 상세 리포트
- **[시스템 아키텍처](docs/architecture.md)** — 전체 구조 다이어그램
- **[Multi-Agent 설계](docs/agents-design.md)** — Harness 루프 상세
- **[프롬프트 엔지니어링](docs/prompt-engineering.md)** — 토큰 최적화 전략
- **[AI 협업 기록](docs/ai-collaboration.md)** — Claude Code와의 개발 과정
- **[CLAUDE.md](CLAUDE.md)** — 프로젝트 컨벤션 & 개발 가이드

---

## 🎓 데모 시나리오

튜토리얼 그래프에 3가지 데모 프리셋 제공:

| 프리셋 | 기대 동작 | 검증 루프 |
|---|---|---|
| 🟢 **명확한 오답** | 1라운드 즉시 종료 | Verifier 미발동 |
| 🟡 **모호한 오답** | 2라운드 | Verifier 발동 → 동의 |
| 🔴 **복잡한 오답** | 2-3라운드 | Verifier 반박 → 재추론 |

---

## 🧪 AI 활용 하이라이트

### 모델 계층화 (비용 최적화)
- **Haiku 4.5**: 고빈도 분류/추출 (분석, 검증, 콘텐츠, 챗, Context)
- **Sonnet 4.6**: 저빈도 복잡 추론 (그래프 생성)
- **~70% 토큰 비용 절감** (모두 Sonnet으로 돌리는 경우 대비)

### 압축 프롬프트 포맷
```
# Before (JSON)
{"id":"4","label":"행렬식","description":"...","prerequisites":["3"]}
# After (pipe)
4|행렬식|ad-bc 계산|prereqs:3
```
→ **~40% 토큰 절감**

### Two-phase Proposer
- 루프 중엔 **진단만** (100 tokens)
- 최종 확정 후 Content Generator **1회만** (800 tokens)
- 3라운드 시: 2400 → 1100 tokens (**~54% 절감**)

### 서버 사이드 로그
```
🧠 [Harness] 오답 분석 시작
🔵 [Proposer R1] 행렬식 (conf: 0.72)
⚠️  확신도 < 0.8 → Verifier 호출
🟠 [Verifier] NO — 더 근본적 원인: 행렬 곱셈
🔄 Proposer R2 (critique 반영)
🔵 [Proposer R2] 행렬 곱셈 (conf: 0.91)
✅ [최종] 라운드: 2, 종료: verifier_agreed
```

---

## 📊 성과 지표 (자가 측정)

- **평균 루프 라운드**: 1.5
- **평균 토큰/분석**: ~1,100
- **SSE 지연**: ~80-150ms/이벤트
- **그래프 생성 성공률**: ~95% (Sonnet 1회 호출)

---

## 🛣️ 로드맵 (v2+)

- 교사 대시보드 (학급 단위 약점 집계)
- Supabase 백엔드 이관 (multi-device 동기화)
- Prompt caching으로 추가 토큰 절감
- Content Critic 에이전트 (마이크로 러닝 품질 검증)
- Prerequisite Miner (학습 패턴에서 새 prereq 자동 발견)

---

## 📝 라이선스

Educational use. 공모전 출품작.

---

## 🤝 Built With

이 프로젝트는 **Claude Code (Opus 4.6)와의 지속적인 협업**으로 개발되었습니다. 인간은 비전과 판단을, AI는 구현과 검증을 담당하는 협업 모델의 결과물입니다. 개발 과정 기록은 [docs/ai-collaboration.md](docs/ai-collaboration.md) 참조.
