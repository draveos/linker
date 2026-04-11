// ── 교수 대시보드용 모의 학급 데이터 ─────────────────────────────

import { getUserClasses, getGraph, getLiveStudentRecords, type UserClass } from "@/lib/graph-store"

export const TEACHER_INFO = {
  name: "김교수",
  affiliation: "KIT 컴퓨터공학과",
  avatarLetter: "T",
}

export interface MockStudent {
  id: string
  name: string
  mastery: number        // 0-100
  gaps: string[]         // 막히는 개념들
  lastActiveAt: string   // ISO
  analysisCount: number
}

export interface MockClass {
  id: string
  name: string
  subject: string              // 도메인 키워드 (아이콘 매칭용)
  studentCount: number
  avgMastery: number           // 0-100
  weakPoints: Array<{
    concept: string
    strugglingCount: number
  }>
  weeklyAnalyses: number
  lastActivityAt: string
  students: MockStudent[]
  // AI 추천 (정적)
  recommendation: string
  // 학생측에 배포된 SavedGraph id (있으면 폐지 가능)
  linkedGraphId?: string
}

// 학생 이름 풀
const FIRST_NAMES = [
  "민준", "서연", "예린", "지훈", "하윤", "도윤", "서윤", "지우",
  "예준", "시우", "건우", "서준", "하준", "은우", "도현", "지호",
  "선우", "유준", "연우", "진우", "승현", "채원", "지민", "수아",
  "유나", "다은", "소윤", "시윤", "예은", "윤서", "태윤", "이준",
]
const LAST_NAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"]

// 결정적(deterministic) 랜덤 — 같은 seed에서 같은 결과
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function generateStudents(count: number, gaps: string[], seed: number): MockStudent[] {
  const rand = seededRandom(seed)
  return Array.from({ length: count }, (_, i) => {
    const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]
    const lastName = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]
    const mastery = Math.floor(30 + rand() * 65)
    const gapCount = Math.floor(rand() * 3) + 1
    const studentGaps = [...gaps].sort(() => rand() - 0.5).slice(0, gapCount)
    const daysAgo = Math.floor(rand() * 7)
    const hoursAgo = Math.floor(rand() * 24)
    return {
      id: `s-${seed}-${i + 1}`,
      name: `${lastName}${firstName}`,
      mastery,
      gaps: studentGaps,
      lastActiveAt: new Date(
        Date.now() - daysAgo * 24 * 3600 * 1000 - hoursAgo * 3600 * 1000
      ).toISOString(),
      analysisCount: Math.floor(rand() * 12) + 2,
    }
  })
}

export const MOCK_CLASSES: MockClass[] = [
  {
    id: "class-linalg-1",
    name: "선형대수학 (1반)",
    subject: "선형대수학",
    studentCount: 30,
    avgMastery: 68,
    weakPoints: [
      { concept: "행렬식", strugglingCount: 18 },
      { concept: "역행렬", strugglingCount: 12 },
      { concept: "고유값", strugglingCount: 8 },
      { concept: "대각화", strugglingCount: 6 },
      { concept: "선형 변환", strugglingCount: 4 },
    ],
    weeklyAnalyses: 142,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    students: generateStudents(30, ["행렬식", "역행렬", "고유값", "행렬 곱셈", "대각화"], 101),
    recommendation:
      "학급의 60%가 행렬식에서 막혔습니다. 행렬 곱셈 선행 복습 후 ad-bc 공식 집중 강의를 권장합니다.",
    linkedGraphId: "default-linalg",
  },
  {
    id: "class-calculus-2",
    name: "미적분학 (2반)",
    subject: "미적분학",
    studentCount: 24,
    avgMastery: 54,
    weakPoints: [
      { concept: "극한", strugglingCount: 15 },
      { concept: "연쇄 법칙", strugglingCount: 11 },
      { concept: "적분", strugglingCount: 9 },
      { concept: "도함수", strugglingCount: 5 },
      { concept: "미적분 기본정리", strugglingCount: 3 },
    ],
    weeklyAnalyses: 98,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    students: generateStudents(24, ["극한", "연쇄 법칙", "적분", "도함수"], 202),
    recommendation:
      "극한 개념 이해도가 낮습니다. ε-δ 정의보다는 직관적 접근 + 시각화 예제를 먼저 제시하세요.",
    linkedGraphId: "default-calculus",
  },
  {
    id: "class-algo-3",
    name: "자료구조와 알고리즘",
    subject: "알고리즘",
    studentCount: 28,
    avgMastery: 72,
    weakPoints: [
      { concept: "재귀", strugglingCount: 12 },
      { concept: "동적 계획법", strugglingCount: 9 },
      { concept: "그래프 탐색", strugglingCount: 6 },
      { concept: "정렬", strugglingCount: 4 },
      { concept: "해시", strugglingCount: 2 },
    ],
    weeklyAnalyses: 87,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    students: generateStudents(28, ["재귀", "동적 계획법", "그래프 탐색", "정렬"], 303),
    recommendation:
      "재귀 개념에서 DP로 넘어가는 전이 단계가 약합니다. 메모이제이션을 중간 단계로 배치하면 효과적입니다.",
  },
  {
    id: "class-prob-4",
    name: "확률과 통계",
    subject: "확률통계",
    studentCount: 22,
    avgMastery: 61,
    weakPoints: [
      { concept: "베이즈 정리", strugglingCount: 14 },
      { concept: "확률분포", strugglingCount: 8 },
      { concept: "가설검정", strugglingCount: 5 },
      { concept: "기댓값", strugglingCount: 3 },
    ],
    weeklyAnalyses: 54,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    students: generateStudents(22, ["베이즈 정리", "확률분포", "가설검정"], 404),
    recommendation:
      "베이즈 정리의 조건부 확률 직관이 부족합니다. 실생활 예제(의료 검사, 스팸 필터)로 도입하는 것이 좋습니다.",
  },
  {
    id: "class-physics-5",
    name: "일반물리학",
    subject: "물리학",
    studentCount: 26,
    avgMastery: 58,
    weakPoints: [
      { concept: "운동량 보존", strugglingCount: 13 },
      { concept: "전자기 유도", strugglingCount: 10 },
      { concept: "열역학", strugglingCount: 7 },
      { concept: "파동", strugglingCount: 4 },
    ],
    weeklyAnalyses: 76,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    students: generateStudents(26, ["운동량 보존", "전자기 유도", "열역학"], 505),
    recommendation:
      "전자기 유도 단원에서 렌츠 법칙의 방향 결정을 어려워합니다. 오른손 법칙 반복 연습을 권장합니다.",
  },
]

export function getMockClass(id: string): MockClass | undefined {
  const m = MOCK_CLASSES.find((c) => c.id === id)
  if (m) return m
  // 사용자 생성 학급 fallback
  const uc = getUserClasses().find((c) => c.id === id)
  if (uc) return userClassToMockClass(uc)
  return undefined
}

/**
 * 사용자 생성 학급을 MockClass 형태로 어댑트.
 * 학생/약점/통계는 라이브 결손 기록(linker_live_records)으로부터 동적으로 계산된다.
 */
export function userClassToMockClass(uc: UserClass): MockClass {
  const linkedGraph = getGraph(uc.linkedGraphId)
  const liveRecs = getLiveStudentRecords(uc.linkedGraphId)
  const avgMastery = linkedGraph && linkedGraph.nodes.length > 0
    ? Math.round((linkedGraph.masteredNodeIds.length / linkedGraph.nodes.length) * 100)
    : 0

  // 라이브 기록 → 학생별 집계 (이름 기준 deduplicate)
  const byName = new Map<string, MockStudent>()
  liveRecs.forEach((r) => {
    const existing = byName.get(r.studentName)
    if (existing) {
      if (!existing.gaps.includes(r.concept)) existing.gaps.push(r.concept)
      existing.analysisCount += 1
      if (new Date(r.recordedAt).getTime() > new Date(existing.lastActiveAt).getTime()) {
        existing.lastActiveAt = r.recordedAt
      }
    } else {
      byName.set(r.studentName, {
        id: `live-${r.studentName}`,
        name: r.studentName,
        mastery: avgMastery,
        gaps: [r.concept],
        lastActiveAt: r.recordedAt,
        analysisCount: 1,
      })
    }
  })
  const students = Array.from(byName.values())
  // 라이브 기록 0건이어도 본인 1명이 곧 들어올 자리이므로 최소 1로 카운트
  const studentCount = Math.max(1, students.length)

  return {
    id: uc.id,
    name: uc.name,
    subject: uc.subject,
    studentCount,
    avgMastery,
    weakPoints: [],                   // 라이브 기록으로 채워짐 (class detail에서 merge)
    weeklyAnalyses: linkedGraph?.analysisCount ?? 0,
    lastActivityAt: linkedGraph?.updatedAt ?? uc.createdAt,
    students,
    recommendation: students.length === 0
      ? "아직 학생 분석 데이터가 없습니다. 학생 모드에서 그래프 분석을 진행해보세요."
      : `${students.length}명의 학생이 활동 중입니다. 결손 패턴이 누적되면 AI 개입 추천이 더 정확해집니다.`,
    linkedGraphId: uc.linkedGraphId,
  }
}

/** 사용자 학급 + (옵션) mock 학급 통합 리스트 */
export function getAllClassesView(includeMocks: boolean): MockClass[] {
  const userClasses = getUserClasses().map(userClassToMockClass)
  return includeMocks ? [...userClasses, ...MOCK_CLASSES] : userClasses
}
