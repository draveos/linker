"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { LeftSidebar, type Analysis } from "@/components/left-sidebar"
import { KnowledgeGraphCanvas, type SelectedNodeData } from "@/components/knowledge-graph-canvas"
import { RemedyPanel, type SelectedNode } from "@/components/remedy-panel"

export default function LinkerPage() {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [inputText, setInputText] = useState("")
  const [activeRootCause, setActiveRootCause] = useState<string | null>(null)
  const analysisTimeoutRef = useRef<NodeJS.Timeout>()

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

  // 오답 분석 함수 (기획서: 4단계 분석 프로세스)
  // TODO: AI 연동 - 실제 AI가 오답을 분석하고 결손 개념을 찾아내는 로직 필요
  const handleAnalyze = useCallback(() => {
    if (!inputText.trim()) return
    setIsAnalyzing(true)
    setAnalysisStep(0)
    setSelectedNode(null)
    setActiveRootCause(null)

    // Step 1: 개념 매핑
    analysisTimeoutRef.current = setTimeout(() => {
      setAnalysisStep(1)

      // Step 2: 풀이 분석
      analysisTimeoutRef.current = setTimeout(() => {
        setAnalysisStep(2)

        // Step 3: 의존성 추적
        analysisTimeoutRef.current = setTimeout(() => {
          setAnalysisStep(3)

          // Step 4: 결손 개념 확정
          analysisTimeoutRef.current = setTimeout(() => {
            setIsAnalyzing(false)
            setAnalysisStep(0)

            // TODO: AI 연동 - 입력 텍스트 기반 결손 노드 결정 (현재는 하드코딩)
            let rootCauseId = "4" // 기본: 행렬식
            let title = "행렬식 계산 오류"

            const lowerInput = inputText.toLowerCase()
            if (lowerInput.includes("역행렬") || lowerInput.includes("inverse")) {
              rootCauseId = "5"
              title = "역행렬 계산 오류"
            } else if (lowerInput.includes("여인수") || lowerInput.includes("cofactor")) {
              rootCauseId = "6"
              title = "여인수 전개 오류"
            } else if (lowerInput.includes("크래머") || lowerInput.includes("연립")) {
              rootCauseId = "7"
              title = "크래머 공식 적용 오류"
            } else if (lowerInput.includes("고유값") || lowerInput.includes("eigen")) {
              rootCauseId = "9"
              title = "고유값 계산 오류"
            } else if (lowerInput.includes("대각화") || lowerInput.includes("diagonal")) {
              rootCauseId = "10"
              title = "대각화 과정 오류"
            }

            setActiveRootCause(rootCauseId)

            // 분석 기록 추가
            const newAnalysis: Analysis = {
              id: Date.now().toString(),
              title,
              subject: "선형대수학",
              timestamp: new Date(),
              rootCauseNodeId: rootCauseId,
            }
            setRecentAnalyses((prev) => [newAnalysis, ...prev.slice(0, 4)])
          }, 800)
        }, 800)
      }, 800)
    }, 800)
  }, [inputText])

  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current)
      }
    }
  }, [])

  const handleNodeClick = useCallback((node: SelectedNodeData) => {
    setSelectedNode({
      id: node.id,
      label: node.label,
      type: node.type,
      description: node.description,
    })
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleSelectAnalysis = useCallback((analysis: Analysis) => {
    if (analysis.rootCauseNodeId) {
      setActiveRootCause(analysis.rootCauseNodeId)
    }
  }, [])

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      {/* 좌측 사이드바 - 오답 입력 & 분석 */}
      <LeftSidebar
        inputText={inputText}
        setInputText={setInputText}
        isAnalyzing={isAnalyzing}
        analysisStep={analysisStep}
        onAnalyze={handleAnalyze}
        recentAnalyses={recentAnalyses}
        onSelectAnalysis={handleSelectAnalysis}
      />

      {/* 중앙 - React Flow 지식 그래프 (전체 화면 사용) */}
      <main className="flex-1 h-full w-full min-w-0">
        <KnowledgeGraphCanvas
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id}
          activeRootCauseId={activeRootCause}
          isAnalyzing={isAnalyzing}
          analysisStep={analysisStep}
        />
      </main>

      {/* 우측 패널 - 마이크로 러닝 (팝업 형태) */}
      <RemedyPanel
        selectedNode={selectedNode}
        onClose={handleClosePanel}
      />
    </div>
  )
}
