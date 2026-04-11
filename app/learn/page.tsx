"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, X, AlertTriangle, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { LeftSidebar, type Analysis } from "@/components/left-sidebar"
import { KnowledgeGraphCanvas, type SelectedNodeData, type KnowledgeNode } from "@/components/knowledge-graph-canvas"
import { RemedyPanel, type SelectedNode, type AiRemedyContent } from "@/components/remedy-panel"
import { Chatbot } from "@/components/chatbot"
import type { AnalyzeErrorResponse } from "@/app/api/analyze-error/route"
import {
  getAllGraphs,
  getActiveGraphId,
  saveGraph,
  DEFAULT_NODES,
  getRecentAnalyses,
  saveRecentAnalysis,
  recordStudentWeakness,
  deleteRecentAnalysis,
  resetTutorialGraph,
  saveErrorLog,
  updateErrorLogResult,
  getNotifications,
  type SavedGraph,
  type ErrorLog,
  type Notification,
} from "@/lib/graph-store"

const DEFAULT_MASTERED = ["1", "2", "3"]

export default function LearnPage() {
  const router = useRouter()
  const [fading, setFading] = useState(false)

  // 그래프 상태
  const [activeGraphId, setActiveGraphId] = useState<string>("default-linalg")
  const [graphNodes, setGraphNodes] = useState<KnowledgeNode[]>(DEFAULT_NODES)
  const [masteredNodeIds, setMasteredNodeIds] = useState<string[]>(DEFAULT_MASTERED)
  const [graphDomain, setGraphDomain] = useState("기초 선형대수학")
  const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [isTutorial, setIsTutorial] = useState(false)

  // 오답 로그/분석 기록 복원 스냅샷 — "원래대로" 버튼용
  const [restoreSnapshot, setRestoreSnapshot] = useState<{
    inputText: string
    activeRootCause: string | null
    selectedNode: SelectedNode | null
    aiContentMap: Record<string, AiRemedyContent>
  } | null>(null)

  // 사용자 피드백 에러 메시지 (분석 실패 / 빈 그래프 등)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 교수 알림 라이브 토스트 (다른 탭/storage 이벤트 → 학생 학습 중에도 즉시 표시)
  const [incomingNotif, setIncomingNotif] = useState<Notification | null>(null)
  const lastSeenNotifIdRef = useRef<string | null>(null)
  const notifInitRef = useRef(true)

  useEffect(() => {
    // 초기 마운트 시 최신 알림 id 기록 — 토스트 발화 방지
    const list = getNotifications()
    lastSeenNotifIdRef.current = list[0]?.id ?? null
    notifInitRef.current = false

    const checkNew = () => {
      const fresh = getNotifications()
      const newest = fresh[0]
      if (newest && newest.id !== lastSeenNotifIdRef.current) {
        lastSeenNotifIdRef.current = newest.id
        setIncomingNotif(newest)
      }
    }

    const handler = (e: StorageEvent) => {
      if (e.key === "linker_notifications") checkNew()
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  // 토스트 자동 dismiss
  useEffect(() => {
    if (!incomingNotif) return
    const t = setTimeout(() => setIncomingNotif(null), 8000)
    return () => clearTimeout(t)
  }, [incomingNotif])

  // 에러 자동 dismiss (6초 후)
  useEffect(() => {
    if (!errorMessage) return
    const t = setTimeout(() => setErrorMessage(null), 6000)
    return () => clearTimeout(t)
  }, [errorMessage])

  // UI 상태
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [analysisStepLabels, setAnalysisStepLabels] = useState<string[]>([])
  const [inputText, setInputText] = useState("")
  const [activeRootCause, setActiveRootCause] = useState<string | null>(null)
  const [aiContentMap, setAiContentMap] = useState<Record<string, AiRemedyContent>>({})
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([])

  const saveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // localStorage에서 active 그래프 + 해당 그래프의 분석 기록 로드
  useEffect(() => {
    const id = getActiveGraphId()
    let loadedGraphId = "default-linalg"
    if (id) {
      const graphs = getAllGraphs()
      const found = graphs.find((g: SavedGraph) => g.id === id)
      if (found) {
        loadedGraphId = found.id
        setActiveGraphId(found.id)
        setGraphNodes(found.nodes)
        setMasteredNodeIds(found.masteredNodeIds)
        setGraphDomain(found.domain)
        setIsTutorial(!!found.isTutorial)
        if (found.nodePositions) setSavedPositions(found.nodePositions)
      }
    }

    // 현재 그래프의 분석 기록만 복원
    const stored = getRecentAnalyses(loadedGraphId)
    setRecentAnalyses(
      stored.map((s) => ({
        id: s.id,
        title: s.title,
        subject: s.subject,
        timestamp: new Date(s.timestamp),
        rootCauseNodeId: s.rootCauseNodeId,
      }))
    )
  }, [])

  // masteredNodeIds 변경 시 debounce 저장
  useEffect(() => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const graphs = getAllGraphs()
      const found = graphs.find((g: SavedGraph) => g.id === activeGraphId)
      if (found) saveGraph({ ...found, masteredNodeIds, nodes: graphNodes, domain: graphDomain })
    }, 500)
    return () => clearTimeout(saveTimerRef.current)
  }, [masteredNodeIds]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoHome = useCallback(() => {
    setFading(true)
    setTimeout(() => router.push("/home"), 350)
  }, [router])

  const handleAnalyze = useCallback(async () => {
    if (!inputText.trim()) return

    // Pre-check: 빈 그래프 — API 호출 전에 차단
    if (graphNodes.length === 0) {
      setErrorMessage("이 그래프에는 개념이 없어요. 먼저 캔버스에서 개념을 추가하거나 새 그래프를 생성해주세요.")
      return
    }

    setIsAnalyzing(true)
    setAnalysisStep(0)
    setAnalysisStepLabels([])
    setSelectedNode(null)
    setActiveRootCause(null)
    setRestoreSnapshot(null)   // 새 분석 시작 → 스냅샷 무효화
    setErrorMessage(null)       // 이전 에러 클리어

    // 입력 시점에 로그 저장 (결과는 분석 완료 후 병합)
    const logId = saveErrorLog(inputText, graphDomain, activeGraphId)

    try {
      const response = await fetch("/api/analyze-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorText: inputText, nodes: graphNodes }),
      })

      if (!response.ok || !response.body) {
        // 서버가 에러 응답 (400/429/500 등)
        if (response.status === 429) {
          throw new Error("요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.")
        }
        if (response.status === 400) {
          throw new Error("입력 형식이 올바르지 않습니다.")
        }
        throw new Error("분석 서버 오류. 잠시 후 다시 시도해주세요.")
      }

      // ── SSE 스트림 읽기 ──────────────────────────────────
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let result: AnalyzeErrorResponse | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith("data: ")) continue
          const data = JSON.parse(line.slice(6))

          if (data.type === "step") {
            setAnalysisStep(data.step)
            setAnalysisStepLabels((prev) => {
              const next = [...prev]
              next[data.step - 1] = data.label
              return next
            })
          } else if (data.type === "trace") {
            // trace 이벤트는 브라우저 콘솔에도 출력 (디버그용)
            console.log("[Harness trace]", data.entry)
          } else if (data.type === "result") {
            result = data as AnalyzeErrorResponse
          } else if (data.type === "error") {
            throw new Error(data.message || "분석 중 오류가 발생했습니다")
          }
        }
      }

      if (!result) throw new Error("결과 없음")

      // 로그에 결과 병합
      if (logId) updateErrorLogResult(logId, result)

      // ── 결과 처리 ─────────────────────────────────────────
      await new Promise((r) => setTimeout(r, 400))
      setIsAnalyzing(false)
      setAnalysisStep(0)
      setActiveRootCause(result.rootCauseNodeId)
      setAiContentMap((prev) => ({
        ...prev,
        [result!.rootCauseNodeId]: {
          explanation: result!.explanation,
          microLearning: result!.microLearning,
          confidence: result!.confidence,
          traversalPath: result!.traversalPath,
          agentTrace: result!.agentTrace,
          verificationRounds: result!.verificationRounds,
          exitReason: result!.exitReason,
        },
      }))
      const rootNode = graphNodes.find((n) => n.id === result.rootCauseNodeId)
      if (rootNode) {
        setSelectedNode({ id: rootNode.id, label: rootNode.label, type: "missing", description: rootNode.description })
      }
      const badge = (result.verificationRounds ?? 0) > 0 ? " (검증됨)" : ""
      const newAnalysis: Analysis = {
        id: Date.now().toString(),
        title: result.rootCauseLabel + " 결손 탐지" + badge,
        subject: graphDomain,
        timestamp: new Date(),
        rootCauseNodeId: result.rootCauseNodeId,
      }
      setRecentAnalyses((prev) => [newAnalysis, ...prev.slice(0, 4)])
      // 영속화 (graphId 포함)
      saveRecentAnalysis({
        id: newAnalysis.id,
        graphId: activeGraphId,
        title: newAnalysis.title,
        subject: newAnalysis.subject,
        timestamp: newAnalysis.timestamp.toISOString(),
        rootCauseNodeId: newAnalysis.rootCauseNodeId,
      })

      // 분석 횟수 저장
      const graphs = getAllGraphs()
      const found = graphs.find((g: SavedGraph) => g.id === activeGraphId)
      if (found) saveGraph({ ...found, analysisCount: (found.analysisCount || 0) + 1, nodes: graphNodes, masteredNodeIds, domain: graphDomain })

      // 양방향 데이터 루프 — 교수 대시보드의 약점 분포에 즉시 반영
      recordStudentWeakness({
        graphId: activeGraphId,
        concept: result.rootCauseLabel,
        conceptNodeId: result.rootCauseNodeId,
      })
    } catch (error) {
      console.error("분석 오류:", error)
      setIsAnalyzing(false)
      setAnalysisStep(0)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      )
    }
  }, [inputText, graphNodes, graphDomain, activeGraphId, masteredNodeIds])

  const handleNodeClick = useCallback((node: SelectedNodeData) => {
    setSelectedNode({ id: node.id, label: node.label, type: node.type, description: node.description })
  }, [])

  const handleClosePanel = useCallback(() => setSelectedNode(null), [])

  const handleSelectAnalysis = useCallback((analysis: Analysis) => {
    if (analysis.rootCauseNodeId) {
      setRestoreSnapshot((prev) => prev ?? {
        inputText,
        activeRootCause,
        selectedNode,
        aiContentMap: { ...aiContentMap },
      })
      setActiveRootCause(analysis.rootCauseNodeId)
      const rootNode = graphNodes.find((n) => n.id === analysis.rootCauseNodeId)
      if (rootNode) setSelectedNode({ id: rootNode.id, label: rootNode.label, type: "missing", description: rootNode.description })
    }
  }, [graphNodes, inputText, activeRootCause, selectedNode, aiContentMap])

  const handleMarkMastered = useCallback((nodeId: string) => {
    // 결손 노드(activeRootCause): 학습 필요로 이동 (완료로 바로 안 감, 퀴즈 후에만 여기 도달)
    // 완료 노드: 학습 필요로 토글
    // 학습 필요 노드: 완료로 토글
    if (activeRootCause === nodeId) {
      setActiveRootCause(null)
      // masteredNodeIds는 건드리지 않음 → standard(학습 필요)로 남음
    } else {
      setMasteredNodeIds((prev) =>
        prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
      )
    }
    setSelectedNode(null)
  }, [activeRootCause])

  const handleDeleteAnalysis = useCallback((id: string) => {
    setRecentAnalyses((prev) => prev.filter((a) => a.id !== id))
    deleteRecentAnalysis(id)
  }, [])

  // 오답 로그 클릭 → 스냅샷 저장 후 전체 분석 상태 복원
  const handleSelectErrorLog = useCallback((log: ErrorLog) => {
    // 현재 상태 스냅샷 (이미 스냅샷이 있으면 기존 것 유지 — 중첩 복원 방지)
    setRestoreSnapshot((prev) => prev ?? {
      inputText,
      activeRootCause,
      selectedNode,
      aiContentMap: { ...aiContentMap },
    })

    setInputText(log.text)
    if (!log.result) return

    const r = log.result
    setAiContentMap((prev) => ({
      ...prev,
      [r.rootCauseNodeId]: {
        explanation: r.explanation,
        microLearning: r.microLearning,
        confidence: r.confidence,
        traversalPath: r.traversalPath,
        agentTrace: r.agentTrace,
        verificationRounds: r.verificationRounds,
        exitReason: r.exitReason,
      },
    }))
    setActiveRootCause(r.rootCauseNodeId)

    const node = graphNodes.find((n) => n.id === r.rootCauseNodeId)
    if (node) {
      setSelectedNode({
        id: node.id,
        label: node.label,
        type: "missing",
        description: node.description,
      })
    }
  }, [graphNodes, inputText, activeRootCause, selectedNode, aiContentMap])

  // 원래 상태로 돌아가기
  const handleRestoreOriginal = useCallback(() => {
    if (!restoreSnapshot) return
    setInputText(restoreSnapshot.inputText)
    setActiveRootCause(restoreSnapshot.activeRootCause)
    setSelectedNode(restoreSnapshot.selectedNode)
    setAiContentMap(restoreSnapshot.aiContentMap)
    setRestoreSnapshot(null)
  }, [restoreSnapshot])

  // 튜토리얼 데모 상태 완전 초기화
  const handleDemoReset = useCallback(() => {
    const fresh = resetTutorialGraph()
    if (!fresh) return
    setGraphNodes(fresh.nodes)
    setMasteredNodeIds(fresh.masteredNodeIds)
    setGraphDomain(fresh.domain)
    setSavedPositions({})
    setAiContentMap({})
    setActiveRootCause(null)
    setSelectedNode(null)
    setRecentAnalyses([])
    setInputText("")
    setAnalysisStep(0)
    setAnalysisStepLabels([])
    setErrorMessage(null)
  }, [])

  // 캔버스 수정 모드 저장 — 노드 구조 + 위치 persist
  const handleSaveGraph = useCallback(
    (newNodes: KnowledgeNode[], positions: Record<string, { x: number; y: number }>) => {
      setGraphNodes(newNodes)
      setSavedPositions(positions)
      const graphs = getAllGraphs()
      const found = graphs.find((g: SavedGraph) => g.id === activeGraphId)
      if (found) {
        saveGraph({
          ...found,
          nodes: newNodes,
          nodePositions: positions,
          masteredNodeIds,
          domain: graphDomain,
        })
      }
    },
    [activeGraphId, masteredNodeIds, graphDomain]
  )

  return (
    <div className={cn(
      "flex h-screen w-screen bg-background overflow-hidden transition-opacity duration-300",
      "animate-in fade-in duration-500",
      fading ? "opacity-0" : "opacity-100"
    )}>
      <LeftSidebar
        inputText={inputText}
        setInputText={setInputText}
        isAnalyzing={isAnalyzing}
        analysisStep={analysisStep}
        onAnalyze={handleAnalyze}
        recentAnalyses={recentAnalyses}
        onSelectAnalysis={handleSelectAnalysis}
        onDeleteAnalysis={handleDeleteAnalysis}
        graphId={activeGraphId}
        graphDomain={graphDomain}
        onGoHome={handleGoHome}
        showPresets={isTutorial}
        onDemoReset={handleDemoReset}
        onSelectErrorLog={handleSelectErrorLog}
      />

      <main className="flex-1 h-full w-full min-w-0">
        <KnowledgeGraphCanvas
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id}
          activeRootCauseId={activeRootCause}
          isAnalyzing={isAnalyzing}
          analysisStep={analysisStep}
          analysisStepLabels={analysisStepLabels}
          nodes={graphNodes}
          masteredNodeIds={masteredNodeIds}
          domain={graphDomain}
          traversalPath={activeRootCause ? (aiContentMap[activeRootCause]?.traversalPath ?? null) : null}
          savedPositions={savedPositions}
          onSaveGraph={handleSaveGraph}
        />
      </main>

      <RemedyPanel
        selectedNode={selectedNode}
        onClose={handleClosePanel}
        aiContent={selectedNode ? (aiContentMap[selectedNode.id] ?? null) : null}
        onMarkMastered={handleMarkMastered}
      />

      <Chatbot graphNodes={graphNodes} graphDomain={graphDomain} />

      {/* 교수 알림 라이브 토스트 (storage 이벤트로 도착) */}
      {incomingNotif && (
        <button
          onClick={() => { setFading(true); setTimeout(() => router.push("/home"), 300) }}
          className="fixed top-5 right-5 z-[100] max-w-sm text-left animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="bg-card border border-primary/40 rounded-2xl shadow-2xl shadow-primary/20 p-4 flex items-start gap-3 hover:border-primary transition-colors">
            <div className="p-2 rounded-lg bg-primary/15 border border-primary/30 shrink-0">
              <Bell className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {incomingNotif.fromInstitution && (
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                    {incomingNotif.fromInstitution}
                  </span>
                )}
                <span className="text-[9px] text-muted-foreground/70">방금 도착</span>
              </div>
              <p className="text-xs font-bold text-foreground line-clamp-1 mb-0.5">
                {incomingNotif.title}
              </p>
              <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                {incomingNotif.body}
              </p>
              <p className="text-[9px] text-primary mt-1.5 font-semibold">
                탭하여 알림함 열기 →
              </p>
            </div>
            <span
              onClick={(e) => { e.stopPropagation(); setIncomingNotif(null) }}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded shrink-0"
            >
              <X className="h-3 w-3" />
            </span>
          </div>
        </button>
      )}

      {/* 에러 토스트 — 빈 그래프, 분석 실패, rate limit 등 */}
      {errorMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-3 fade-in duration-200 max-w-md mx-4">
          <div className="flex items-start gap-3 bg-card border border-destructive/30 rounded-xl shadow-2xl px-4 py-3">
            <div className="p-1 bg-destructive/10 rounded-lg shrink-0">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm text-foreground flex-1 leading-relaxed">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
              aria-label="닫기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 복원 배너 — 오답 로그/분석 기록에서 이전 상태로 들어왔을 때 표시 */}
      {restoreSnapshot && (
        <div className={cn(
          "fixed left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-3 fade-in duration-200",
          errorMessage ? "bottom-20" : "bottom-5"
        )}>
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl shadow-2xl px-4 py-2.5">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">이전 분석으로 전환됨</span>
            <button
              onClick={handleRestoreOriginal}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/10"
            >
              <RotateCcw className="h-3 w-3" />
              원래대로
            </button>
            <button
              onClick={() => setRestoreSnapshot(null)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
