# Multi-Agent Harness 설계

## 왜 Multi-Agent인가

**단일 호출의 한계**:
- Claude Haiku 4.5 단일 호출로 오답을 분석하면, 애매한 케이스(여러 개념이 얽힌 오답)에서 **표면 증상에 가까운 노드**를 근본 원인으로 지목하는 경우가 있음
- 예: "대각화가 안 돼요" → 단일 호출은 "대각화" 노드 반환하지만, 실제 원인은 상위 **고유값** 혹은 **선형 변환** 개념 결손

**Harness 접근**:
- Proposer의 제안을 **Verifier**가 비판적으로 검토
- Verifier가 반박하면 Proposer가 critique를 반영해 **재추론**
- 최대 3 라운드 루프로 수렴 보장

## 에이전트 역할

### 1. Proposer

**목표**: 오답 텍스트로부터 근본 원인 노드 1개 제안

**입력**:
- 오답 텍스트 (학생이 입력)
- 지식 그래프 노드 리스트 (압축 포맷)
- [선택] 이전 Verifier의 critique

**출력** (JSON):
```json
{
  "nodeId": "4",
  "nodeLabel": "행렬식",
  "confidence": 0.72,
  "reasoning": "학생이 ad-bc 공식을 혼동하고 있어 행렬식 개념 결손으로 판단됨"
}
```

**프롬프트 핵심**:
- "prerequisites를 역방향으로 거슬러 가장 근본 원인 찾기"
- Reasoning 1-2문장 제한
- 이전 critique 있으면 "반드시 반영"

**max_tokens**: 200

### 2. Verifier

**목표**: Proposer 제안 검토, 더 근본적 원인이 있는지 확인

**입력**:
- 오답 텍스트
- Proposer의 제안 (nodeId, reasoning, confidence)
- 제안된 노드의 선행 개념 목록 (별도 강조)

**출력** (JSON):
```json
{
  "agree": false,
  "critique": "행렬식 노드의 선행 개념인 '행렬 곱셈'이 더 근본적 원인일 수 있음. 학생이 곱셈 순서를 착각한 흔적이 있음.",
  "suggestedNodeId": "3"
}
```

**프롬프트 핵심**:
- "선행 개념 중 더 근본적 결손이 있는가?"
- **"애매하면 agree=true로 편향"** (false alarm 방지)
- Critique는 반박 시에만

**max_tokens**: 200

### 3. Content Generator

**목표**: 확정된 결손 개념에 대한 최종 학습 콘텐츠 생성

**입력**:
- 확정된 결손 노드 (id, label, description)
- 전체 노드 리스트
- 학생의 오답 텍스트

**출력** (JSON):
```json
{
  "explanation": "학생에게 직접 말하는 설명 (2-3문장)",
  "microLearning": {
    "title": "...",
    "content": "200자 내외",
    "summary": "한 줄",
    "quiz": {
      "question": "...",
      "options": ["a", "b", "c", "d"],
      "answerIndex": 0
    }
  },
  "traversalPath": ["1", "2", "4"]
}
```

**max_tokens**: 800

**핵심 설계 포인트**:
- **Proposer/Verifier 루프와 완전 분리**
- 루프 중엔 호출되지 않음 → 루프 횟수와 무관하게 콘텐츠는 1회만 생성
- 버려지는 토큰 0

## 루프 로직

```ts
let proposal, critique
let round = 0
const MAX_ROUNDS = 3

while (round < MAX_ROUNDS) {
  round++

  // Proposer 실행
  proposal = await runProposer(errorText, nodes, critique)

  // Exit 1: 확신도 충분
  if (proposal.confidence >= 0.8) break

  // Exit 2: 수렴 감지 (같은 노드 2회 연속)
  if (previousNodeId === proposal.nodeId && round > 1) break
  previousNodeId = proposal.nodeId

  // Exit 3: max rounds
  if (round === MAX_ROUNDS) break

  // Verifier 실행
  const verify = await runVerifier(proposal, errorText, nodes)

  // Exit 4: Verifier 동의
  if (verify.agree) break

  // 다음 라운드: critique 주입
  critique = verify.critique
}

// 루프 종료 후 최종 콘텐츠 생성 (1회)
const content = await runContentGenerator(proposal.nodeId, proposal.nodeLabel, errorText, nodes)
```

## 조기 종료 조건 4가지

| 종료 사유 | 조건 | 빈도 (추정) | 라운드 |
|---|---|---|---|
| `confidence_high` | Proposer confidence ≥ 0.8 | 60% | 1 |
| `verifier_agreed` | Verifier가 동의 | 25% | 1 |
| `converged` | 같은 노드 2회 연속 제안 | 5% | 2 |
| `max_rounds` | 3 라운드 도달 | 10% | 3 |

**평균 라운드**: 약 1.5

## 토큰 비용 비교

### Before (단일 Proposer가 콘텐츠까지)
- R1: 800tok (full content)
- R2 (필요 시): 800tok
- R3 (필요 시): 800tok
- **최악 시나리오**: 2,400tok

### After (Two-phase Proposer + Content Generator 분리)
- R1 Proposer: 100tok
- Verifier: 200tok
- R2 Proposer: 100tok
- Verifier: 200tok
- R3 Proposer: 100tok
- Content Gen: 800tok
- **최악 시나리오**: 1,500tok (약 37% 절감)

### 평균 시나리오 (1.5 라운드)
- After: ~1,100tok
- 단일 Proposer 방식 (기존): ~1,600tok
- 절감: ~30%

## SSE 이벤트 흐름

```
Client → POST /api/analyze-error
Server → SSE 시작

< data: {"type":"step","step":1,"label":"오류 패턴 분석 중..."}
< data: {"type":"step","step":2,"label":"근본 원인 추론 중..."}
< data: {"type":"trace","entry":{"role":"proposer","round":1,...}}
# confidence 낮을 때만:
< data: {"type":"step","step":3,"label":"AI 교차 검증 중 (R1)..."}
< data: {"type":"trace","entry":{"role":"verifier","round":1,...}}
# verifier 반박 시만:
< data: {"type":"step","step":2,"label":"재추론 중 (R2)..."}
< data: {"type":"trace","entry":{"role":"proposer","round":2,...,"triggeredByCritique":"..."}}
# 최종:
< data: {"type":"step","step":5,"label":"학습 콘텐츠 생성 중..."}
< data: {"type":"result", ...}

Server → stream close
```

## 실시간 UI 반영

### Canvas Analysis Overlay
- `analysisStep`에 따라 스텝 체크리스트 갱신
- Step 3/4 (verifier/re-propose)는 **amber 색**으로 구분
- 스피너 옆 "AI" 뱃지로 검증 루프 진입 표시

### RemedyPanel AgentTrace 섹션
- 분석 완료 후 `agentTrace` 배열로 각 에이전트 호출을 시각화
- Proposer 카드(파란색) / Verifier 카드(초록 동의 / 앰버 반박)
- 토큰 수, 라운드, 종료 사유 등 메트릭 배지
- 펼치기/접기 가능

## 확장 아이디어 (v2)

- **Content Critic**: Content Generator 출력을 별도 에이전트가 검증 (마이크로 러닝 품질)
- **Prerequisite Miner**: 사용자의 오답 패턴에서 새로운 prereq 관계를 자동 발견
- **Adaptive Difficulty**: Verifier 반박 빈도가 높은 도메인에서 자동으로 max_rounds 증가
