"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { LeftSidebar, type Analysis } from "@/components/left-sidebar"
import { KnowledgeGraphCanvas, type SelectedNodeData, type KnowledgeNode } from "@/components/knowledge-graph-canvas"
import { RemedyPanel, type SelectedNode, type AiRemedyContent } from "@/components/remedy-panel"
import { Chatbot } from "@/components/chatbot"
import type { AnalyzeErrorResponse } from "@/app/api/analyze-error/route"
import type { GenerateGraphResponse } from "@/app/api/generate-graph/route"

// 기본 선형대수학 그래프 (데모용 초기값)
const DEFAULT_NODES: KnowledgeNode[] = [
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

const DEFAULT_MASTERED = ["1", "2", "3"]

export default function LinkerDashboard() {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [inputText, setInputText] = useState("")
  const [activeRootCause, setActiveRootCause] = useState<string | null>(null)
  // nodeId별 AI 콘텐츠 캐시 - 다른 노드 눌러도 사라지지 않음
  const [aiContentMap, setAiContentMap] = useState<Record<string, AiRemedyContent>>({})
  const [graphNodes, setGraphNodes] = useState<KnowledgeNode[]>(DEFAULT_NODES)
  const [masteredNodeIds, setMasteredNodeIds] = useState<string[]>(DEFAULT_MASTERED)
  const [graphDomain, setGraphDomain] = useState("기초 선형대수학")
  const [isGeneratingGraph, setIsGeneratingGraph] = useState(false)
  const [graphToast, setGraphToast] = useState<{ status: "loading" | "success" | "error"; visible: boolean } | null>(null)
  const [toastProgress, setToastProgress] = useState(0)
  const progressTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hideTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // 가짜 진행바 — 로딩 중 0→90% 증가, 완료 시 100%
  useEffect(() => {
    if (graphToast?.status === "loading") {
      setToastProgress(0)
      let current = 0
      progressTimerRef.current = setInterval(() => {
        current += Math.random() * 8 + 2
        if (current >= 90) { current = 90; clearInterval(progressTimerRef.current) }
        setToastProgress(current)
      }, 250)
    } else if (graphToast?.status === "success" || graphToast?.status === "error") {
      clearInterval(progressTimerRef.current)
      setToastProgress(100)
      hideTimerRef.current = setTimeout(() => {
        setGraphToast((t) => t ? { ...t, visible: false } : null)
      }, 1500)
    }
    return () => {
      clearInterval(progressTimerRef.current)
      clearTimeout(hideTimerRef.current)
    }
  }, [graphToast?.status])

  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([
    {
      id: "1",
      title: "역행렬 계산 오류",
      subject: "선형대수학",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      rootCauseNodeId: "4",
    },
    {
      id: "2",
      title: "행렬식 부호 실수",
      subject: "선형대수학",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      rootCauseNodeId: "4",
    },
  ])

  // 오답 분석 (AI 실제 연동)
  const handleAnalyze = useCallback(async () => {
    if (!inputText.trim()) return
    setIsAnalyzing(true)
    setAnalysisStep(0)
    setSelectedNode(null)
    setActiveRootCause(null)

    try {
      setAnalysisStep(1) // 개념 매핑 중

      const response = await fetch("/api/analyze-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorText: inputText,
          nodes: graphNodes,
        }),
      })

      setAnalysisStep(2) // 풀이 분석 중

      if (!response.ok) throw new Error("분석 API 오류")

      const result: AnalyzeErrorResponse = await response.json()

      setAnalysisStep(3) // 결손 개념 확정

      await new Promise((r) => setTimeout(r, 500)) // 애니메이션용 짧은 딜레이

      setIsAnalyzing(false)
      setAnalysisStep(0)
      setActiveRootCause(result.rootCauseNodeId)

      // AI 콘텐츠를 nodeId 키로 캐싱 - 다른 노드 눌렀다 돌아와도 유지됨
      setAiContentMap((prev) => ({
        ...prev,
        [result.rootCauseNodeId]: {
          explanation: result.explanation,
          microLearning: result.microLearning,
          confidence: result.confidence,
          traversalPath: result.traversalPath,
        },
      }))

      // 결손 노드 자동 선택 → 패널 오픈
      const rootNode = graphNodes.find((n) => n.id === result.rootCauseNodeId)
      if (rootNode) {
        setSelectedNode({
          id: rootNode.id,
          label: rootNode.label,
          type: "missing",
          description: rootNode.description,
        })
      }

      // 분석 기록 추가
      const newAnalysis: Analysis = {
        id: Date.now().toString(),
        title: result.rootCauseLabel + " 결손 탐지",
        subject: graphDomain,
        timestamp: new Date(),
        rootCauseNodeId: result.rootCauseNodeId,
      }
      setRecentAnalyses((prev) => [newAnalysis, ...prev.slice(0, 4)])
    } catch (error) {
      console.error("분석 오류:", error)
      setIsAnalyzing(false)
      setAnalysisStep(0)
    }
  }, [inputText, graphNodes, graphDomain])

  // 강의 텍스트로 그래프 생성
  const handleGenerateGraph = useCallback(async (lectureText: string, domain: string) => {
    setIsGeneratingGraph(true)
    setActiveRootCause(null)
    setSelectedNode(null)
    setAiContentMap({})
    setGraphToast({ status: "loading", visible: true })

    try {
      const response = await fetch("/api/generate-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureText, domain }),
      })

      if (!response.ok) throw new Error("그래프 생성 API 오류")

      const result: GenerateGraphResponse = await response.json()
      setGraphNodes(result.nodes)
      setGraphDomain(result.domain)
      setMasteredNodeIds([])
      setGraphToast({ status: "success", visible: true })
    } catch (error) {
      console.error("그래프 생성 오류:", error)
      setGraphToast({ status: "error", visible: true })
    } finally {
      setIsGeneratingGraph(false)
    }
  }, [])

  const handleNodeClick = useCallback(
    (node: SelectedNodeData) => {
      setSelectedNode({
        id: node.id,
        label: node.label,
        type: node.type,
        description: node.description,
      })
    },
    []
  )

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleSelectAnalysis = useCallback(
    (analysis: Analysis) => {
      if (analysis.rootCauseNodeId) {
        setActiveRootCause(analysis.rootCauseNodeId)
        const rootNode = graphNodes.find((n) => n.id === analysis.rootCauseNodeId)
        if (rootNode) {
          setSelectedNode({
            id: rootNode.id,
            label: rootNode.label,
            type: "missing",
            description: rootNode.description,
          })
        }
      }
    },
    [graphNodes]
  )

  const handleMarkMastered = useCallback((nodeId: string) => {
    setMasteredNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    )
    setSelectedNode(null)
    setActiveRootCause(null)
  }, [])

  const handleDeleteAnalysis = useCallback((id: string) => {
    setRecentAnalyses((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      <LeftSidebar
        inputText={inputText}
        setInputText={setInputText}
        isAnalyzing={isAnalyzing}
        analysisStep={analysisStep}
        onAnalyze={handleAnalyze}
        onGenerateGraph={handleGenerateGraph}
        isGeneratingGraph={isGeneratingGraph}
        recentAnalyses={recentAnalyses}
        onSelectAnalysis={handleSelectAnalysis}
        onDeleteAnalysis={handleDeleteAnalysis}
        graphDomain={graphDomain}
      />

      <main className="flex-1 h-full w-full min-w-0">
        <KnowledgeGraphCanvas
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id}
          activeRootCauseId={activeRootCause}
          isAnalyzing={isAnalyzing}
          analysisStep={analysisStep}
          nodes={graphNodes}
          masteredNodeIds={masteredNodeIds}
          domain={graphDomain}
        />
      </main>

      <RemedyPanel
        selectedNode={selectedNode}
        onClose={handleClosePanel}
        aiContent={selectedNode ? (aiContentMap[selectedNode.id] ?? null) : null}
        onMarkMastered={handleMarkMastered}
      />

      <Chatbot graphNodes={graphNodes} graphDomain={graphDomain} />

      {/* 그래프 생성 토스트 */}
      {graphToast && (
        <div className={cn(
          "fixed bottom-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-500",
          graphToast.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}>
          <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-2.5 min-w-[200px] space-y-1.5">
            <p className="text-xs font-medium text-foreground">
              {graphToast.status === "loading" && "그래프 생성 중..."}
              {graphToast.status === "success" && "그래프 생성 완료"}
              {graphToast.status === "error" && "생성에 실패했습니다"}
            </p>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300 ease-out",
                  graphToast.status === "loading" && "bg-primary",
                  graphToast.status === "success" && "bg-green-500",
                  graphToast.status === "error" && "bg-destructive",
                )}
                style={{ width: `${toastProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
