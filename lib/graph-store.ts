import type { KnowledgeNode } from "@/components/knowledge-graph-canvas"
import type { AnalyzeErrorResponse } from "@/app/api/analyze-error/route"

// ── Types ──────────────────────────────────────────────────────

export interface SavedGraph {
  id: string
  domain: string
  nodes: KnowledgeNode[]
  masteredNodeIds: string[]
  analysisCount: number
  createdAt: string
  updatedAt: string
  lastViewedAt?: string
  nodePositions?: Record<string, { x: number; y: number }>
  isTutorial?: boolean   // 튜토리얼/데모 그래프 — 삭제 불가, 데모 예시 + 리셋 버튼 제공
  // ── 교육기관 제공 그래프 ──
  institution?: string       // 발급 기관 (예: "KIT 컴퓨터공학과")
  instructorName?: string    // 담당 교수
  retired?: boolean          // 교수가 폐지한 후에야 학생이 삭제 가능
  retiredAt?: string
}

/**
 * 교수가 직접 만든 학급 — mock 데이터와 별개로 localStorage에 저장.
 * 두 탭(교수/학생) 데모용으로, 백엔드 도입 시 실제 학급 관리가 들어올 자리.
 */
export interface UserClass {
  id: string
  name: string
  subject: string         // 도메인 키워드 (아이콘 매칭)
  linkedGraphId: string
  createdAt: string
}

/**
 * 학생이 실제로 분석을 돌려 발견한 결손 — 교수 대시보드의 weak point 분포에 실시간 누적된다.
 * 양방향 데이터 루프의 핵심 (학생 분석 → 교수 통계).
 */
export interface LiveStudentRecord {
  id: string
  graphId: string
  concept: string          // 결손 노드 라벨 (matchable to mock weakPoints)
  conceptNodeId: string
  studentName: string      // 데모용 — 익명 풀에서 랜덤
  recordedAt: string
}

export interface LearningInsights {
  totalAnalyses: number
  topWeaknesses: Array<{ concept: string; count: number; nodeId: string }>
  masteryPct: number
  frontierNode: { id: string; label: string; description: string } | null   // 다음 학습 추천
  recentTrend: "up" | "flat" | "new"   // 단순 휴리스틱
}

export interface Notification {
  id: string
  kind: "intervention" | "message" | "retire" | "system"
  title: string
  body: string
  fromName?: string          // 보낸 사람 (예: "김교수")
  fromInstitution?: string   // 발신 기관
  classId?: string           // 연관 mock class
  graphId?: string           // 연관 그래프
  sentAt: string             // ISO
  read: boolean
}

export interface TrashItem {
  graph: SavedGraph
  deletedAt: string
}

export interface ErrorLog {
  id: string
  graphId?: string        // 그래프별 스코핑 (optional for migration)
  text: string
  domain: string
  savedAt: string
  result?: AnalyzeErrorResponse
}

export interface StoredAnalysis {
  id: string
  graphId?: string        // 그래프별 스코핑 (optional for migration)
  title: string
  subject: string
  timestamp: string       // ISO
  rootCauseNodeId?: string
}

// ── Keys / Constants ───────────────────────────────────────────

const STORE_KEY  = "linker_graphs"
const ACTIVE_KEY = "linker_active_graph_id"
const TRASH_KEY  = "linker_trash"
const ERROR_LOG_KEY = "linker_error_logs"
const ANALYSIS_KEY = "linker_recent_analyses"
const ROLE_KEY   = "linker_role"
const NOTIF_KEY  = "linker_notifications"
const LIVE_REC_KEY = "linker_live_records"
const USER_CLASS_KEY = "linker_user_classes"
const MAX_NOTIFICATIONS = 30
const MAX_LIVE_RECORDS = 50
const MAX_USER_CLASSES = 10

// 학생 익명 표시용 — 데모 리얼리즘
const ANON_STUDENT_NAMES = [
  "민준", "서연", "예린", "지훈", "하윤", "도윤", "서윤",
  "지우", "예준", "시우", "건우", "서준", "유나", "다은",
]

export type UserRole = "student" | "teacher"

export function getUserRole(): UserRole {
  if (!isClient()) return "student"
  const r = localStorage.getItem(ROLE_KEY)
  return r === "teacher" ? "teacher" : "student"
}

export function setUserRole(role: UserRole): void {
  if (!isClient()) return
  localStorage.setItem(ROLE_KEY, role)
}

const MAX_TRASH_ITEMS   = 3
const TRASH_EXPIRY_MS   = 7 * 24 * 60 * 60 * 1000   // 7일
const MAX_ERROR_LOGS    = 10
const MAX_ANALYSES      = 5

// ── Seed graphs ────────────────────────────────────────────────

export const DEFAULT_NODES: KnowledgeNode[] = [
  { id: "1", label: "벡터", description: "벡터의 기본 개념과 연산", prerequisites: [], confidence: 1 },
  { id: "2", label: "행렬", description: "행렬의 정의와 기본 연산", prerequisites: ["1"], confidence: 1 },
  { id: "3", label: "행렬 곱셈", description: "행렬 간의 곱셈 연산", prerequisites: ["2"], confidence: 1 },
  { id: "4", label: "행렬식", description: "행렬식(Determinant) 계산법", prerequisites: ["3"], confidence: 1 },
  { id: "5", label: "역행렬", description: "역행렬의 존재 조건과 계산", prerequisites: ["4"], confidence: 1 },
  { id: "6", label: "여인수 전개", description: "여인수를 이용한 행렬식 계산", prerequisites: ["4"], confidence: 1 },
  { id: "7", label: "크래머 공식", description: "행렬식을 이용한 연립방정식 풀이", prerequisites: ["5", "6"], confidence: 1 },
  { id: "8", label: "선형 변환", description: "행렬을 이용한 선형 변환", prerequisites: ["3"], confidence: 1 },
  { id: "9", label: "고유값", description: "고유값과 고유벡터 계산", prerequisites: ["4", "8"], confidence: 1 },
  { id: "10", label: "대각화", description: "행렬의 대각화", prerequisites: ["9"], confidence: 1 },
]

const SEED_GRAPHS: SavedGraph[] = [
  {
    id: "default-linalg",
    domain: "기초 선형대수학 (튜토리얼)",
    nodes: DEFAULT_NODES,
    masteredNodeIds: ["1", "2", "3"],
    analysisCount: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    lastViewedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isTutorial: true,
    institution: "KIT 컴퓨터공학과",
    instructorName: "김교수",
  },
  {
    id: "default-calculus",
    domain: "미적분학 기초",
    nodes: [
      { id: "1", label: "극한", description: "수열과 함수의 극한값", prerequisites: [], confidence: 1 },
      { id: "2", label: "연속성", description: "함수의 연속과 불연속", prerequisites: ["1"], confidence: 1 },
      { id: "3", label: "도함수", description: "미분의 정의와 기본 공식", prerequisites: ["2"], confidence: 1 },
      { id: "4", label: "연쇄 법칙", description: "합성함수의 미분법", prerequisites: ["3"], confidence: 1 },
      { id: "5", label: "적분", description: "정적분과 부정적분", prerequisites: ["3"], confidence: 1 },
      { id: "6", label: "미적분 기본정리", description: "미분과 적분의 관계", prerequisites: ["4", "5"], confidence: 1 },
    ],
    masteredNodeIds: ["1"],
    analysisCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    institution: "KIT 컴퓨터공학과",
    instructorName: "김교수",
  },
]

/** 학생이 그래프를 삭제할 수 있는지 — 폐지되면 어떤 경우든 가능, 그 외 튜토리얼·기관 발급은 보호 */
export function isGraphDeletable(graph: SavedGraph): boolean {
  if (graph.retired) return true
  if (graph.isTutorial) return false
  if (graph.institution) return false
  return true
}

// ── Helpers ────────────────────────────────────────────────────

function isClient() { return typeof window !== "undefined" }

// ── Graph CRUD ─────────────────────────────────────────────────

export function getAllGraphs(): SavedGraph[] {
  if (!isClient()) return SEED_GRAPHS
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) {
      localStorage.setItem(STORE_KEY, JSON.stringify(SEED_GRAPHS))
      return SEED_GRAPHS
    }
    const stored = JSON.parse(raw) as SavedGraph[]
    // 마이그레이션: seed 그래프에 isTutorial / institution 플래그 주입
    return stored.map((g) => {
      const seed = SEED_GRAPHS.find((s) => s.id === g.id)
      if (!seed) return g
      return {
        ...g,
        isTutorial: g.isTutorial ?? seed.isTutorial,
        institution: g.institution ?? seed.institution,
        instructorName: g.instructorName ?? seed.instructorName,
      }
    })
  } catch { return SEED_GRAPHS }
}

export function getGraph(id: string): SavedGraph | null {
  return getAllGraphs().find((g) => g.id === id) ?? null
}

export function saveGraph(graph: SavedGraph): void {
  if (!isClient()) return
  try {
    const all = getAllGraphs()
    const idx = all.findIndex((g) => g.id === graph.id)
    const updated = { ...graph, updatedAt: new Date().toISOString() }
    if (idx >= 0) all[idx] = updated
    else all.unshift(updated)
    localStorage.setItem(STORE_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

export function createGraph(
  domain: string,
  nodes: KnowledgeNode[],
  opts?: { institution?: string; instructorName?: string }
): SavedGraph {
  const graph: SavedGraph = {
    id: `graph-${Date.now()}`,
    domain,
    nodes,
    masteredNodeIds: [],
    analysisCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(opts?.institution ? { institution: opts.institution } : {}),
    ...(opts?.instructorName ? { instructorName: opts.instructorName } : {}),
  }
  saveGraph(graph)
  return graph
}

// ── Active graph ───────────────────────────────────────────────

/**
 * activeGraphId는 sessionStorage 사용 — 탭별로 격리.
 * 탭 A(학생)와 탭 B(교수)가 서로 다른 그래프를 열어도 충돌하지 않음.
 */
export function getActiveGraphId(): string | null {
  if (!isClient()) return null
  return sessionStorage.getItem(ACTIVE_KEY) ?? localStorage.getItem(ACTIVE_KEY)
}

export function setActiveGraphId(id: string): void {
  if (!isClient()) return
  sessionStorage.setItem(ACTIVE_KEY, id)
  localStorage.setItem(ACTIVE_KEY, id)   // 새 탭 열 때 fallback
  // lastViewedAt 갱신
  const all = getAllGraphs()
  const idx = all.findIndex((g) => g.id === id)
  if (idx >= 0) {
    all[idx] = { ...all[idx], lastViewedAt: new Date().toISOString() }
    localStorage.setItem(STORE_KEY, JSON.stringify(all))
  }
}

export function clearActiveGraphId(): void {
  if (!isClient()) return
  sessionStorage.removeItem(ACTIVE_KEY)
  localStorage.removeItem(ACTIVE_KEY)
}

export function getRecentlyViewed(limit = 3): SavedGraph[] {
  return getAllGraphs()
    .filter((g) => g.lastViewedAt)
    .sort((a, b) => new Date(b.lastViewedAt!).getTime() - new Date(a.lastViewedAt!).getTime())
    .slice(0, limit)
}

// ── Trash ──────────────────────────────────────────────────────

function getRawTrash(): TrashItem[] {
  if (!isClient()) return []
  try {
    return JSON.parse(localStorage.getItem(TRASH_KEY) ?? "[]") as TrashItem[]
  } catch { return [] }
}

function saveRawTrash(items: TrashItem[]): void {
  if (!isClient()) return
  localStorage.setItem(TRASH_KEY, JSON.stringify(items))
}

/** 만료(7일 초과) 항목 자동 정리 후 반환 */
export function getTrash(): TrashItem[] {
  const now = Date.now()
  const valid = getRawTrash().filter(
    (t) => now - new Date(t.deletedAt).getTime() < TRASH_EXPIRY_MS
  )
  saveRawTrash(valid)
  return valid
}

export function moveToTrash(id: string): void {
  if (!isClient()) return
  const graph = getGraph(id)
  if (!graph) return
  if (!isGraphDeletable(graph)) return   // 튜토리얼·기관 발급(미폐지) 그래프는 삭제 금지

  // 그래프 목록에서 제거
  const all = getAllGraphs().filter((g) => g.id !== id)
  localStorage.setItem(STORE_KEY, JSON.stringify(all))
  if (getActiveGraphId() === id) clearActiveGraphId()

  // 휴지통에 추가 (최신이 앞)
  let trash = getTrash()
  trash = [{ graph, deletedAt: new Date().toISOString() }, ...trash]

  // MAX_TRASH_ITEMS 초과 시 가장 오래된 것 제거
  if (trash.length > MAX_TRASH_ITEMS) trash = trash.slice(0, MAX_TRASH_ITEMS)

  saveRawTrash(trash)
}

// ── Tutorial reset ─────────────────────────────────────────────

/**
 * 튜토리얼 그래프를 seed 상태로 완전 초기화.
 * - 노드 구조, 위치, 마스터 상태, 분석 횟수 리셋
 * - recentAnalyses 전체 삭제
 */
export function resetTutorialGraph(): SavedGraph | null {
  if (!isClient()) return null
  const original = SEED_GRAPHS.find((g) => g.isTutorial)
  if (!original) return null

  const fresh: SavedGraph = {
    ...original,
    nodes: [...DEFAULT_NODES],           // fresh copy
    masteredNodeIds: [...original.masteredNodeIds],
    analysisCount: 0,
    updatedAt: new Date().toISOString(),
    lastViewedAt: new Date().toISOString(),
    nodePositions: undefined,
    isTutorial: true,
  }
  saveGraph(fresh)
  localStorage.removeItem(ANALYSIS_KEY)
  return fresh
}

export function restoreFromTrash(id: string): void {
  if (!isClient()) return
  const trash = getTrash()
  const item = trash.find((t) => t.graph.id === id)
  if (!item) return
  saveGraph(item.graph)
  saveRawTrash(trash.filter((t) => t.graph.id !== id))
}

export function emptyTrash(): void {
  if (!isClient()) return
  localStorage.removeItem(TRASH_KEY)
}

// ── Error logs (그래프별 스코핑) ───────────────────────────────

function getAllErrorLogs(): ErrorLog[] {
  if (!isClient()) return []
  try {
    return JSON.parse(localStorage.getItem(ERROR_LOG_KEY) ?? "[]") as ErrorLog[]
  } catch { return [] }
}

/** 특정 그래프의 오답 로그만 반환 */
export function getErrorLogs(graphId: string): ErrorLog[] {
  return getAllErrorLogs().filter((l) => l.graphId === graphId)
}

/** 입력 시점에 저장하고 id 반환. 그래프별로 격리. */
export function saveErrorLog(text: string, domain: string, graphId: string): string {
  if (!isClient()) return ""
  const id = Date.now().toString()
  const log: ErrorLog = {
    id,
    graphId,
    text: text.trim(),
    domain,
    savedAt: new Date().toISOString(),
  }
  const all = getAllErrorLogs()
  // 현재 그래프의 로그만 limit 적용, 다른 그래프는 그대로 유지
  const sameGraph = [log, ...all.filter((l) => l.graphId === graphId)].slice(0, MAX_ERROR_LOGS)
  const otherGraphs = all.filter((l) => l.graphId !== graphId)
  localStorage.setItem(ERROR_LOG_KEY, JSON.stringify([...sameGraph, ...otherGraphs]))
  return id
}

/** 분석 성공 후 결과를 기존 로그에 병합 (graphId 무관, id로 찾음) */
export function updateErrorLogResult(id: string, result: AnalyzeErrorResponse): void {
  if (!isClient()) return
  const all = getAllErrorLogs().map((l) => (l.id === id ? { ...l, result } : l))
  localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(all))
}

export function deleteErrorLog(id: string): void {
  if (!isClient()) return
  const all = getAllErrorLogs().filter((l) => l.id !== id)
  localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(all))
}

// ── Recent analyses (그래프별 스코핑) ──────────────────────────

function getAllStoredAnalyses(): StoredAnalysis[] {
  if (!isClient()) return []
  try {
    return JSON.parse(localStorage.getItem(ANALYSIS_KEY) ?? "[]") as StoredAnalysis[]
  } catch { return [] }
}

/** 특정 그래프의 분석 기록만 반환 */
export function getRecentAnalyses(graphId: string): StoredAnalysis[] {
  return getAllStoredAnalyses().filter((a) => a.graphId === graphId)
}

export function saveRecentAnalysis(analysis: StoredAnalysis): void {
  if (!isClient() || !analysis.graphId) return
  const all = getAllStoredAnalyses()
  // 같은 그래프의 분석만 limit 적용
  const sameGraph = [analysis, ...all.filter((a) => a.graphId === analysis.graphId && a.id !== analysis.id)]
    .slice(0, MAX_ANALYSES)
  const otherGraphs = all.filter((a) => a.graphId !== analysis.graphId)
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify([...sameGraph, ...otherGraphs]))
}

export function deleteRecentAnalysis(id: string): void {
  if (!isClient()) return
  const all = getAllStoredAnalyses().filter((a) => a.id !== id)
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(all))
}

// ── 그래프 폐지 (교수측) ───────────────────────────────────────

export function retireGraph(id: string): void {
  if (!isClient()) return
  const all = getAllGraphs()
  const idx = all.findIndex((g) => g.id === id)
  if (idx < 0) return
  all[idx] = {
    ...all[idx],
    retired: true,
    retiredAt: new Date().toISOString(),
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(all))
}

export function unretireGraph(id: string): void {
  if (!isClient()) return
  const all = getAllGraphs()
  const idx = all.findIndex((g) => g.id === id)
  if (idx < 0) return
  const { retired: _r, retiredAt: _ra, ...rest } = all[idx]
  all[idx] = rest
  localStorage.setItem(STORE_KEY, JSON.stringify(all))
}

// ── User-created classes (교수 직접 생성, 백엔드 미스왑) ──────

export function getUserClasses(): UserClass[] {
  if (!isClient()) return []
  try {
    return JSON.parse(localStorage.getItem(USER_CLASS_KEY) ?? "[]") as UserClass[]
  } catch { return [] }
}

export function createUserClass(input: Omit<UserClass, "id" | "createdAt">): UserClass {
  const cls: UserClass = {
    ...input,
    id: `user-class-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  }
  if (!isClient()) return cls
  const all = [cls, ...getUserClasses()].slice(0, MAX_USER_CLASSES)
  localStorage.setItem(USER_CLASS_KEY, JSON.stringify(all))
  return cls
}

export function deleteUserClass(id: string): void {
  if (!isClient()) return
  const all = getUserClasses().filter((c) => c.id !== id)
  localStorage.setItem(USER_CLASS_KEY, JSON.stringify(all))
}

// ── Live student weakness records (학생 → 교수 양방향 루프) ────

export function getLiveStudentRecords(graphId?: string): LiveStudentRecord[] {
  if (!isClient()) return []
  try {
    const all = JSON.parse(localStorage.getItem(LIVE_REC_KEY) ?? "[]") as LiveStudentRecord[]
    return graphId ? all.filter((r) => r.graphId === graphId) : all
  } catch { return [] }
}

export function recordStudentWeakness(input: {
  graphId: string
  concept: string
  conceptNodeId: string
}): LiveStudentRecord {
  const rec: LiveStudentRecord = {
    ...input,
    id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    studentName: ANON_STUDENT_NAMES[Math.floor(Math.random() * ANON_STUDENT_NAMES.length)],
    recordedAt: new Date().toISOString(),
  }
  if (!isClient()) return rec
  const all = [rec, ...getLiveStudentRecords()].slice(0, MAX_LIVE_RECORDS)
  localStorage.setItem(LIVE_REC_KEY, JSON.stringify(all))
  return rec
}

export function clearLiveStudentRecords(): void {
  if (!isClient()) return
  localStorage.removeItem(LIVE_REC_KEY)
}

// ── Learning insights (학생 메타인지 대시보드) ─────────────────

/**
 * 분석 기록과 그래프 상태를 합쳐 학생용 메타인지 데이터 산출.
 * frontierNode = 모든 prerequisite가 마스터되었지만 본인은 아직 모르는 노드 (학습 frontier).
 */
export function getLearningInsights(graph: SavedGraph): LearningInsights {
  const analyses = getRecentAnalyses(graph.id)
  const totalAnalyses = graph.analysisCount > 0 ? graph.analysisCount : analyses.length

  // top 약점 — 분석 기록의 rootCauseNodeId를 빈도 카운트
  const counts = new Map<string, { count: number; nodeId: string; concept: string }>()
  analyses.forEach((a) => {
    if (!a.rootCauseNodeId) return
    const node = graph.nodes.find((n) => n.id === a.rootCauseNodeId)
    if (!node) return
    const prev = counts.get(node.label)
    if (prev) prev.count += 1
    else counts.set(node.label, { count: 1, nodeId: node.id, concept: node.label })
  })
  const topWeaknesses = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  // mastery
  const masteryPct = graph.nodes.length === 0
    ? 0
    : Math.round((graph.masteredNodeIds.length / graph.nodes.length) * 100)

  // frontier — 모든 prereq가 mastered, 본인은 not mastered
  const masteredSet = new Set(graph.masteredNodeIds)
  const frontierCandidates = graph.nodes
    .filter((n) => !masteredSet.has(n.id))
    .filter((n) => n.prerequisites.length > 0 && n.prerequisites.every((p) => masteredSet.has(p)))
  const frontierNode = frontierCandidates[0]
    ? {
        id: frontierCandidates[0].id,
        label: frontierCandidates[0].label,
        description: frontierCandidates[0].description,
      }
    : null

  // trend — 단순 휴리스틱: 분석 0 → new, mastery 50%↑ → up, else flat
  const recentTrend: "up" | "flat" | "new" =
    totalAnalyses === 0 ? "new" : masteryPct >= 50 ? "up" : "flat"

  return { totalAnalyses, topWeaknesses, masteryPct, frontierNode, recentTrend }
}

// ── Notifications (교수 → 학생) ────────────────────────────────

export function getNotifications(): Notification[] {
  if (!isClient()) return []
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? "[]") as Notification[]
  } catch { return [] }
}

export function getUnreadNotificationCount(): number {
  return getNotifications().filter((n) => !n.read).length
}

export function sendNotification(input: Omit<Notification, "id" | "sentAt" | "read">): Notification {
  const notif: Notification = {
    ...input,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sentAt: new Date().toISOString(),
    read: false,
  }
  if (!isClient()) return notif
  const all = [notif, ...getNotifications()].slice(0, MAX_NOTIFICATIONS)
  localStorage.setItem(NOTIF_KEY, JSON.stringify(all))
  return notif
}

export function markNotificationRead(id: string): void {
  if (!isClient()) return
  const all = getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n))
  localStorage.setItem(NOTIF_KEY, JSON.stringify(all))
}

export function markAllNotificationsRead(): void {
  if (!isClient()) return
  const all = getNotifications().map((n) => ({ ...n, read: true }))
  localStorage.setItem(NOTIF_KEY, JSON.stringify(all))
}

export function deleteNotification(id: string): void {
  if (!isClient()) return
  const all = getNotifications().filter((n) => n.id !== id)
  localStorage.setItem(NOTIF_KEY, JSON.stringify(all))
}

export function clearAllNotifications(): void {
  if (!isClient()) return
  localStorage.removeItem(NOTIF_KEY)
}

// ── 노드 코멘트 (교수 → 학생 피드백) ────────────────────────

const COMMENT_KEY = "linker_node_comments"
const MAX_COMMENTS_PER_NODE = 20

export interface NodeComment {
  id: string
  nodeId: string
  graphId: string
  authorName: string
  authorRole: "teacher" | "student"
  text: string
  timestamp: string
}

export function getNodeComments(graphId: string, nodeId?: string): NodeComment[] {
  if (!isClient()) return []
  try {
    const all = JSON.parse(localStorage.getItem(COMMENT_KEY) ?? "[]") as NodeComment[]
    const forGraph = all.filter((c) => c.graphId === graphId)
    return nodeId ? forGraph.filter((c) => c.nodeId === nodeId) : forGraph
  } catch { return [] }
}

export function addNodeComment(input: Omit<NodeComment, "id" | "timestamp">): NodeComment {
  const comment: NodeComment = {
    ...input,
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
  }
  if (!isClient()) return comment
  const all = JSON.parse(localStorage.getItem(COMMENT_KEY) ?? "[]") as NodeComment[]
  // 같은 노드의 코멘트 수 제한
  const sameNode = all.filter((c) => c.graphId === input.graphId && c.nodeId === input.nodeId)
  const others = all.filter((c) => !(c.graphId === input.graphId && c.nodeId === input.nodeId))
  const trimmed = [comment, ...sameNode].slice(0, MAX_COMMENTS_PER_NODE)
  localStorage.setItem(COMMENT_KEY, JSON.stringify([...trimmed, ...others]))
  return comment
}

export function getNodesWithComments(graphId: string): Set<string> {
  const comments = getNodeComments(graphId)
  return new Set(comments.map((c) => c.nodeId))
}

// ── 교수 제작 퀴즈 ─────────────────────────────────────────────

const CUSTOM_QUIZ_KEY = "linker_custom_quizzes"

export interface CustomQuiz {
  id: string
  graphId: string
  nodeId: string
  nodeLabel: string
  question: string
  options: string[]
  answerIndex: number
  createdBy: string
  createdAt: string
}

export function getCustomQuizzes(graphId: string, nodeId?: string): CustomQuiz[] {
  if (!isClient()) return []
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOM_QUIZ_KEY) ?? "[]") as CustomQuiz[]
    const forGraph = all.filter((q) => q.graphId === graphId)
    return nodeId ? forGraph.filter((q) => q.nodeId === nodeId) : forGraph
  } catch { return [] }
}

export function addCustomQuiz(input: Omit<CustomQuiz, "id" | "createdAt">): CustomQuiz {
  const quiz: CustomQuiz = {
    ...input,
    id: `cquiz-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    createdAt: new Date().toISOString(),
  }
  if (!isClient()) return quiz
  const all: CustomQuiz[] = [quiz, ...(JSON.parse(localStorage.getItem(CUSTOM_QUIZ_KEY) ?? "[]") as CustomQuiz[])]
  localStorage.setItem(CUSTOM_QUIZ_KEY, JSON.stringify(all))
  return quiz
}

export function deleteCustomQuiz(id: string): void {
  if (!isClient()) return
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOM_QUIZ_KEY) ?? "[]") as CustomQuiz[]
    localStorage.setItem(CUSTOM_QUIZ_KEY, JSON.stringify(all.filter((q) => q.id !== id)))
  } catch { /* ignore */ }
}

// ── 퀴즈 기록 (오답 노트) ─────────────────────────────────────

const QUIZ_KEY = "linker_quiz_history"
const MAX_QUIZ_HISTORY = 10

export interface QuizAttempt {
  id: string
  graphId: string
  nodeId: string
  nodeLabel: string
  question: string
  options: string[]
  selectedAnswer: number
  correctAnswer: number
  isCorrect: boolean
  timestamp: string
}

export function getQuizHistory(graphId?: string): QuizAttempt[] {
  if (!isClient()) return []
  try {
    const all = JSON.parse(localStorage.getItem(QUIZ_KEY) ?? "[]") as QuizAttempt[]
    return graphId ? all.filter((q) => q.graphId === graphId) : all
  } catch { return [] }
}

export function getWrongAnswers(graphId?: string): QuizAttempt[] {
  return getQuizHistory(graphId).filter((q) => !q.isCorrect)
}

export function saveQuizAttempt(attempt: Omit<QuizAttempt, "id" | "timestamp">): QuizAttempt {
  const full: QuizAttempt = {
    ...attempt,
    id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
  }
  if (!isClient()) return full
  const all = [full, ...getQuizHistory()].slice(0, MAX_QUIZ_HISTORY)
  localStorage.setItem(QUIZ_KEY, JSON.stringify(all))
  return full
}

export function getNodeQuizStats(graphId: string, nodeId: string): { total: number; correct: number; wrong: number } {
  const attempts = getQuizHistory(graphId).filter((q) => q.nodeId === nodeId)
  const correct = attempts.filter((q) => q.isCorrect).length
  return { total: attempts.length, correct, wrong: attempts.length - correct }
}

// ── 데모 전체 리셋 ─────────────────────────────────────────────

/**
 * 모든 `linker_*` 키 제거 → seed 상태로 복귀.
 * 다음 getAllGraphs() 호출 시 SEED_GRAPHS가 자동 재주입된다.
 */
export function resetDemoState(): void {
  if (!isClient()) return
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith("linker_")) keys.push(k)
  }
  keys.forEach((k) => localStorage.removeItem(k))
}
