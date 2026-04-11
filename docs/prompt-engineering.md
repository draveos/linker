# 프롬프트 엔지니어링 전략

## 1. 압축 노드 포맷

### Before (JSON)
```json
{
  "nodes": [
    { "id": "1", "label": "벡터", "description": "벡터의 기본 개념과 연산", "prerequisites": [] },
    { "id": "2", "label": "행렬", "description": "행렬의 정의와 기본 연산", "prerequisites": ["1"] },
    ...
  ]
}
```
한 노드당 약 60-80 토큰.

### After (파이프 구분자)
```
1|벡터|벡터의 기본 개념과 연산|prereqs:-
2|행렬|행렬의 정의와 기본 연산|prereqs:1
3|행렬 곱셈|행렬 간의 곱셈 연산|prereqs:2
4|행렬식|행렬식(Determinant) 계산법|prereqs:3
```
한 노드당 약 30-40 토큰. 약 40% 절감.

### 구현
```ts
function compactNodes(nodes: GraphNode[]): string {
  return nodes
    .map((n) => {
      const desc = n.description.length > 40
        ? n.description.slice(0, 40) + "…"
        : n.description
      return `${n.id}|${n.label}|${desc}|prereqs:${n.prerequisites.join(",") || "-"}`
    })
    .join("\n")
}
```

## 2. Proposer 프롬프트

```
학생의 오답에서 가장 근본적인 결손 개념 1개를 찾으세요.

## 노드 (형식: id|이름|설명|prereqs)
{compactNodes}

## 오답
{errorText}

## 검증자 피드백 (반드시 반영)   ← 루프 R2+에서만 주입
{critique}

## 지침
- prerequisites를 역방향으로 거슬러 가장 근본 원인 찾기
- reasoning은 1-2문장으로 간결히

JSON만 반환:
{"nodeId":"ID","nodeLabel":"이름","confidence":0.85,"reasoning":"간결한 판단 근거"}
```

핵심:
- "JSON만 반환"을 두 번 강조 (제목 + 마지막)
- Reasoning 길이 제한으로 토큰 낭비 방지
- critique는 있을 때만 섹션 추가 (없을 땐 빈 문자열)

## 3. Verifier 프롬프트

```
오답 분석을 검증하세요. 더 근본적 원인이 있을 때만 반박.

## 노드
{compactNodes}

## 오답
{errorText}

## 제안 분석
- 노드: {proposal.nodeLabel} ({proposal.nodeId})
- 확신도: {proposal.confidence}
- 이유: {proposal.reasoning}
- 이 노드의 선행 개념: {prereqInfo}   ← 핵심

## 판단
- 선행 개념({prereqInfo}) 중 더 근본적 결손이 있는가?
- 오답 패턴이 제안 노드로 완전히 설명되는가?
- 애매하면 agree=true (false alarm 방지)

JSON만:
{"agree":true,"critique":"반박 시에만 이유","suggestedNodeId":"반박 시 대안 ID"}
```

핵심 트릭 — 선행 개념 별도 주입:
```ts
const proposedNode = nodes.find((n) => n.id === proposal.nodeId)
const prereqInfo = proposedNode?.prerequisites
  .map((pid) => {
    const n = nodes.find((x) => x.id === pid)
    return n ? `${n.id}:${n.label}` : pid
  })
  .join(", ") || "없음"
```

Verifier가 전체 노드 리스트에서 prereq를 찾아내지 않아도 되도록 사전 계산해서 직접 주입. → 더 정확한 판단 + 토큰 절약.

False Alarm 방지 문구: "애매하면 agree=true" — 과도한 루프를 막는 가장 중요한 지시.

## 4. Content Generator 프롬프트

```
확정된 결손 개념에 대한 학습 콘텐츠를 생성하세요.

## 결손 개념
- ID: {finalNodeId}
- 이름: {finalNodeLabel}
- 설명: {node.description}

## 전체 노드
{compactNodes}

## 학생의 오답
{errorText}

JSON만 반환:
{
  "explanation": "학생에게 직접 말하는 톤 2-3문장 (왜 이 개념이 결손인지)",
  "microLearning": {
    "title": "3-5단어 제목",
    "content": "핵심 개념 설명 200자 내외",
    "summary": "한 줄 요약",
    "quiz": {
      "question": "확인 퀴즈",
      "options": ["선택지1","선택지2","선택지3","선택지4"],
      "answerIndex": 0
    }
  },
  "traversalPath": ["최상위ID","중간ID","{finalNodeId}"]
}
```

핵심:
- 출력 스키마를 예시로 명시 (주석 포함)
- 각 필드마다 길이 가이드 ("2-3문장", "200자 내외")
- `traversalPath`의 마지막 요소가 반드시 finalNodeId임을 스키마에 명시

## 5. Context Validator (그래프 생성 시)

사용자 입력이 100자 미만일 때 Haiku가 추가 질문으로 컨텍스트 보강.

### 상태 머신
```
status = "needs_more" | "sufficient" | "irrelevant" | "off_topic"
```

- `needs_more`: 추가 질문 있음 (최대 3회)
- `sufficient`: 그래프 생성 가능
- `irrelevant`: 도메인과 연관 적음 (사용자 확인 필요)
- `off_topic`: 완전히 다른 주제 (사용자 확인 필요)

### 프롬프트 핵심
```
다음 정보로 지식 그래프를 생성하기에 충분한지 판단하세요.

도메인: {domain}
원본 텍스트: {originalText}
추가 Q&A: {conversationHistory}
현재까지 질문 수: {questionCount}/3

판단:
1. 충분 → status: "sufficient", enrichedContext에 정제된 텍스트
2. 부족 → status: "needs_more", question에 구체적 질문
3. 도메인 연관 없음 → status: "irrelevant"
4. 완전히 다른 주제 → status: "off_topic"
```

## 6. 그래프 생성 (Sonnet)

Sonnet은 Haiku보다 더 강력하지만, 출력 스키마 준수가 느슨할 수 있음. 예시 JSON을 프롬프트에 포함하는 것이 핵심.

```
강의 텍스트로부터 지식 그래프를 생성하세요.

## 입력
도메인: {domain}
텍스트: {lectureText}

## 규칙
1. 10-15개 내외의 핵심 노드
2. prerequisites는 반드시 DAG (사이클 금지)
3. id는 숫자 문자열 ("1", "2", ...)
4. 기초 개념부터 고급 개념 순서로

## 출력 예시
{
  "domain": "기초 선형대수학",
  "nodes": [
    { "id": "1", "label": "벡터", "description": "...", "prerequisites": [] },
    { "id": "2", "label": "행렬", "description": "...", "prerequisites": ["1"] }
  ]
}

JSON만 반환.
```

클라이언트 사이드 검증:
- `detectCycle()` 함수로 사이클 검사
- 실패 시 에러 반환 (Sonnet 재호출 없음)

## 7. Chat (Chatbot)

Haiku streaming, 2가지 모드:

### 질문 모드
```
당신은 교육 AI 튜터입니다. 학생이 지식 그래프 위에서 학습 중입니다.

## 현재 그래프
도메인: {domain}
노드: {nodes.map(n => n.label).join(", ")}

## 지침
- 그래프 개념 범위 안에서 답변
- 간결하게 (3문장 이내)
- 한국어로
```

### 문제풀이 모드
```
당신은 교육 AI 문제 출제자입니다. 학생에게 연습 문제를 내주세요.

## 현재 그래프
{...}

## 지침
- 학생 수준에 맞는 문제 출제
- 답을 미리 알려주지 말 것
- 학생의 답변을 들으면 힌트 제공
```

## 8. 프롬프트 관리 원칙

1. 모든 프롬프트는 소스 코드 안에 — 별도 config 파일 X
2. 상수 명명: `CONFIDENCE_THRESHOLD`, `MAX_ROUNDS` 등으로 magic number 제거
3. "JSON만 반환"은 반드시 두 번 강조 — 프롬프트 상단 + 하단
4. 출력 스키마는 예시 형태로 — 필드 설명은 주석으로
5. 제약은 명시적으로 — "애매하면 true", "없으면 빈 문자열" 등

## 9. 향후 개선 아이디어

- Prompt caching (Anthropic beta): 노드 리스트는 매 호출마다 동일 → 캐시하면 입력 토큰 비용 감소
- Structured output (tools API): JSON 파싱 에러 원천 차단
- A/B 테스트: 프롬프트 변형을 Git 브랜치로 관리해 confidence 분포 비교
