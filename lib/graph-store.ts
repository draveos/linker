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
}

export interface TrashItem {
  graph: SavedGraph
  deletedAt: string
}

export interface ErrorLog {
  id: string
  text: string
  domain: string
  savedAt: string
  result?: AnalyzeErrorResponse   // 분석 완료 후 결과 포함
}

export interface StoredAnalysis {
  id: string
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
  },
]

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
    // 마이그레이션: 기존 유저의 default-linalg에 isTutorial 플래그 주입
    return stored.map((g) =>
      g.id === "default-linalg" && !g.isTutorial ? { ...g, isTutorial: true } : g
    )
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

export function createGraph(domain: string, nodes: KnowledgeNode[]): SavedGraph {
  const graph: SavedGraph = {
    id: `graph-${Date.now()}`,
    domain,
    nodes,
    masteredNodeIds: [],
    analysisCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  saveGraph(graph)
  return graph
}

// ── Active graph ───────────────────────────────────────────────

export function getActiveGraphId(): string | null {
  if (!isClient()) return null
  return localStorage.getItem(ACTIVE_KEY)
}

export function setActiveGraphId(id: string): void {
  if (!isClient()) return
  localStorage.setItem(ACTIVE_KEY, id)
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
  if (graph.isTutorial) return   // 튜토리얼 그래프는 삭제 금지

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

// ── Error logs ─────────────────────────────────────────────────

export function getErrorLogs(): ErrorLog[] {
  if (!isClient()) return []
  try {
    return JSON.parse(localStorage.getItem(ERROR_LOG_KEY) ?? "[]") as ErrorLog[]
  } catch { return [] }
}

/** 입력 시점에 저장하고 id 반환. 나중에 updateErrorLogResult로 결과 붙임. */
export function saveErrorLog(text: string, domain: string): string {
  if (!isClient()) return ""
  const id = Date.now().toString()
  const log: ErrorLog = {
    id,
    text: text.trim(),
    domain,
    savedAt: new Date().toISOString(),
  }
  const all = [log, ...getErrorLogs()].slice(0, MAX_ERROR_LOGS)
  localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(all))
  return id
}

/** 분석 성공 후 결과를 기존 로그에 병합 */
export function updateErrorLogResult(id: string, result: AnalyzeErrorResponse): void {
  if (!isClient()) return
  const all = getErrorLogs().map((l) => (l.id === id ? { ...l, result } : l))
  localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(all))
}

export function deleteErrorLog(id: string): void {
  if (!isClient()) return
  const all = getErrorLogs().filter((l) => l.id !== id)
  localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(all))
}

// ── Recent analyses ────────────────────────────────────────────

export function getRecentAnalyses(): StoredAnalysis[] {
  if (!isClient()) return []
  try {
    return JSON.parse(localStorage.getItem(ANALYSIS_KEY) ?? "[]") as StoredAnalysis[]
  } catch { return [] }
}

export function saveRecentAnalysis(analysis: StoredAnalysis): void {
  if (!isClient()) return
  const all = [analysis, ...getRecentAnalyses().filter((a) => a.id !== analysis.id)]
    .slice(0, MAX_ANALYSES)
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(all))
}

export function deleteRecentAnalysis(id: string): void {
  if (!isClient()) return
  const all = getRecentAnalyses().filter((a) => a.id !== id)
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(all))
}
