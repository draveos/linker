import { useState, useCallback, useRef, useEffect } from "react"
import { LeftSidebar, type Analysis } from "./components/left-sidebar"
import { KnowledgeGraphCanvas, type SelectedNodeData } from "./components/knowledge-graph-canvas"
import { RemedyPanel, type SelectedNode } from "./components/remedy-panel"

export default function App() {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [inputText, setInputText] = useState("")
  const [activeRootCause, setActiveRootCause] = useState<string | null>(null)
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([
    { id: "1", title: "역행렬 계산 오류", subject: "선형대수학", timestamp: "30분 전", rootCauseId: "4" },
    { id: "2", title: "행렬식 부호 실수", subject: "선형대수학", timestamp: "2시간 전", rootCauseId: "4" },
  ])

  // TODO: AI 연동 - 실제 LLM이 오답 분석하여 결손 개념 결정
  const handleAnalyze = useCallback(() => {
    if (!inputText.trim()) return
    setIsAnalyzing(true)
    setAnalysisStep(0)
    setSelectedNode(null)
    setActiveRootCause(null)

    const stepDelay = 700
    let step = 0
    const tick = () => {
      step += 1
      if (step < 4) {
        setAnalysisStep(step)
        analysisTimeoutRef.current = setTimeout(tick, stepDelay)
      } else {
        setIsAnalyzing(false)
        setAnalysisStep(0)

        // 키워드 기반 결손 노드 결정 (AI 연동 전 임시)
        const lower = inputText.toLowerCase()
        let rootCauseId = "4"
        let title = "행렬식 계산 오류"
        if (lower.includes("역행렬") || lower.includes("inverse")) { rootCauseId = "5"; title = "역행렬 계산 오류" }
        else if (lower.includes("여인수") || lower.includes("cofactor")) { rootCauseId = "6"; title = "여인수 전개 오류" }
        else if (lower.includes("크래머") || lower.includes("연립")) { rootCauseId = "7"; title = "크래머 공식 적용 오류" }
        else if (lower.includes("고유값") || lower.includes("eigen")) { rootCauseId = "9"; title = "고유값 계산 오류" }
        else if (lower.includes("대각화") || lower.includes("diagonal")) { rootCauseId = "10"; title = "대각화 과정 오류" }

        setActiveRootCause(rootCauseId)
        const newAnalysis: Analysis = {
          id: Date.now().toString(),
          title,
          subject: "선형대수학",
          timestamp: "방금",
          rootCauseId,
        }
        setRecentAnalyses((prev) => [newAnalysis, ...prev.slice(0, 3)])
      }
    }
    analysisTimeoutRef.current = setTimeout(tick, stepDelay)
  }, [inputText])

  useEffect(() => {
    return () => { if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current) }
  }, [])

  const handleNodeClick = useCallback((node: SelectedNodeData) => {
    setSelectedNode({ id: node.id, label: node.label, type: node.type, description: node.description })
  }, [])

  const handleSelectAnalysis = useCallback((analysis: Analysis) => {
    setActiveRootCause(analysis.rootCauseId)
  }, [])

  return (
    <div className="flex h-screen w-screen bg-gray-50 overflow-hidden">
      <LeftSidebar
        inputText={inputText}
        setInputText={setInputText}
        isAnalyzing={isAnalyzing}
        analysisStep={analysisStep}
        onAnalyze={handleAnalyze}
        recentAnalyses={recentAnalyses}
        onSelectAnalysis={handleSelectAnalysis}
      />

      <main className="flex-1 min-w-0" style={{ height: "100vh" }}>
        <KnowledgeGraphCanvas
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id}
          activeRootCauseId={activeRootCause}
          isAnalyzing={isAnalyzing}
          analysisStep={analysisStep}
        />
      </main>

      <RemedyPanel
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  )
}
