import { useCallback, useMemo, useEffect, useState } from "react"
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  BackgroundVariant,
  addEdge,
  Connection,
  type NodeProps,
} from "reactflow"
import "reactflow/dist/style.css"
import { Check, AlertTriangle, Circle, Settings, Save, X, Plus, Sparkles, MessageCircle } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"

export interface KnowledgeNode {
  id: string
  label: string
  description: string
  prerequisites: string[]
}

export interface SelectedNodeData {
  id: string
  label: string
  type: "standard" | "mastered" | "missing"
  description: string
}

interface KnowledgeGraphCanvasProps {
  onNodeClick: (node: SelectedNodeData) => void
  selectedNodeId?: string
  activeRootCauseId?: string | null
  isAnalyzing?: boolean
  analysisStep?: number
}

const knowledgeNodes: KnowledgeNode[] = [
  { id: "1", label: "벡터", description: "벡터의 기본 개념과 연산", prerequisites: [] },
  { id: "2", label: "행렬", description: "행렬의 정의와 기본 연산", prerequisites: ["1"] },
  { id: "3", label: "행렬 곱셈", description: "행렬 간의 곱셈 연산", prerequisites: ["2"] },
  { id: "4", label: "행렬식", description: "행렬식(Determinant) 계산법", prerequisites: ["3"] },
  { id: "5", label: "역행렬", description: "역행렬의 존재 조건과 계산", prerequisites: ["4"] },
  { id: "6", label: "여인수 전개", description: "여인수를 이용한 행렬식 계산", prerequisites: ["4"] },
  { id: "7", label: "크래머 공식", description: "행렬식을 이용한 연립방정식 풀이", prerequisites: ["5", "6"] },
  { id: "8", label: "선형 변환", description: "행렬을 이용한 선형 변환", prerequisites: ["3"] },
  { id: "9", label: "고유값", description: "고유값과 고유벡터 계산", prerequisites: ["4", "8"] },
  { id: "10", label: "대각화", description: "행렬의 대각화", prerequisites: ["9"] },
]

const masteredNodeIds = ["1", "2", "3"]

const nodePositions: Record<string, { x: number; y: number }> = {
  "1": { x: 400, y: 50 },
  "2": { x: 400, y: 130 },
  "3": { x: 280, y: 210 },
  "8": { x: 520, y: 210 },
  "4": { x: 400, y: 290 },
  "5": { x: 280, y: 370 },
  "6": { x: 520, y: 370 },
  "9": { x: 520, y: 290 },
  "7": { x: 400, y: 450 },
  "10": { x: 520, y: 450 },
}

function ConceptNode({ data, selected }: NodeProps) {
  const { label, nodeType, isAnalyzing, isFiltered, editMode } = data
  return (
    <div
      className={cn(
        "px-4 py-3 rounded-xl border-2 shadow-lg transition-all duration-300 min-w-[110px] text-center select-none",
        nodeType === "mastered" && "bg-primary text-primary-foreground border-primary shadow-primary/25",
        nodeType === "standard" && "bg-white text-gray-800 border-gray-200 hover:border-indigo-400",
        nodeType === "missing" && "bg-red-50 text-red-700 border-red-400 shadow-red-200 shadow-xl",
        nodeType === "missing" && isAnalyzing && "animate-pulse",
        selected && !editMode && "ring-2 ring-offset-2 ring-indigo-400",
        isFiltered && "opacity-20 pointer-events-none",
        editMode && "cursor-grab active:cursor-grabbing ring-2 ring-dashed ring-gray-300"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2 !border-0" />
      <div className="flex items-center justify-center gap-2">
        {nodeType === "mastered" && <Check className="h-4 w-4" />}
        {nodeType === "missing" && <AlertTriangle className="h-4 w-4" />}
        {nodeType === "standard" && <Circle className="h-3 w-3 opacity-40" />}
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2 !border-0" />
    </div>
  )
}

const nodeTypes = { concept: ConceptNode } as const

const analysisSteps = [
  "문제를 관련 개념에 매핑 중...",
  "풀이 과정 분석 및 오류 탐지 중...",
  "선행 개념 의존성 추적 중...",
  "결손 개념 확정 완료",
]

export function KnowledgeGraphCanvas({
  onNodeClick,
  selectedNodeId,
  activeRootCauseId,
  isAnalyzing,
  analysisStep,
}: KnowledgeGraphCanvasProps) {
  const [editMode, setEditMode] = useState(false)
  const [savedNodes, setSavedNodes] = useState<Node[] | null>(null)
  const [savedEdges, setSavedEdges] = useState<Edge[] | null>(null)
  const [filterType, setFilterType] = useState<"all" | "mastered" | "standard" | "missing">("all")
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)

  const buildNodes = useCallback((): Node[] => {
    return knowledgeNodes.map((node) => {
      let nodeType: "standard" | "mastered" | "missing" = "standard"
      if (masteredNodeIds.includes(node.id)) nodeType = "mastered"
      else if (node.id === activeRootCauseId) nodeType = "missing"
      const isFiltered = filterType !== "all" && filterType !== nodeType
      return {
        id: node.id,
        type: "concept",
        position: nodePositions[node.id] ?? { x: 0, y: 0 },
        data: {
          label: node.label,
          nodeType,
          description: node.description,
          isAnalyzing: isAnalyzing && node.id === activeRootCauseId,
          isFiltered,
          editMode,
        },
        draggable: editMode,
      }
    })
  }, [activeRootCauseId, isAnalyzing, filterType, editMode])

  const buildEdges = useCallback((): Edge[] => {
    return knowledgeNodes.flatMap((node) =>
      node.prerequisites.map((prereqId) => {
        const isPath =
          !!activeRootCauseId &&
          (node.id === activeRootCauseId || prereqId === activeRootCauseId)
        return {
          id: `${prereqId}-${node.id}`,
          source: prereqId,
          target: node.id,
          type: "smoothstep",
          animated: !!(isAnalyzing && isPath),
          style: {
            stroke: isPath ? "#ef4444" : "#d1d5db",
            strokeWidth: isPath ? 2.5 : 1.5,
            opacity: filterType !== "all" ? 0.2 : 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isPath ? "#ef4444" : "#9ca3af",
            width: 16,
            height: 16,
          },
        }
      })
    )
  }, [activeRootCauseId, isAnalyzing, filterType])

  const [nodes, setNodes, onNodesChange] = useNodesState(useMemo(() => buildNodes(), []))
  const [edges, setEdges, onEdgesChange] = useEdgesState(useMemo(() => buildEdges(), []))

  useEffect(() => {
    if (!editMode) {
      setNodes(buildNodes())
      setEdges(buildEdges())
    }
  }, [buildNodes, buildEdges, editMode, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) => {
      if (editMode) setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds))
    },
    [editMode, setEdges]
  )

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (editMode) return
      const kNode = knowledgeNodes.find((n) => n.id === node.id)
      if (!kNode) return
      let nodeType: "standard" | "mastered" | "missing" = "standard"
      if (masteredNodeIds.includes(node.id)) nodeType = "mastered"
      else if (node.id === activeRootCauseId) nodeType = "missing"
      onNodeClick({ id: node.id, label: kNode.label, type: nodeType, description: kNode.description })
    },
    [onNodeClick, activeRootCauseId, editMode]
  )

  const enterEditMode = () => {
    setSavedNodes([...nodes])
    setSavedEdges([...edges])
    setEditMode(true)
  }

  const saveChanges = () => {
    setSavedNodes(null)
    setSavedEdges(null)
    setEditMode(false)
    // TODO: AI 연동 - 변경된 노드/엣지를 서버에 저장
  }

  const cancelChanges = () => {
    if (savedNodes) setNodes(savedNodes)
    if (savedEdges) setEdges(savedEdges)
    setSavedNodes(null)
    setSavedEdges(null)
    setEditMode(false)
  }

  const addNewNode = () => {
    const newId = (Math.max(...nodes.map((n) => parseInt(n.id)), 0) + 1).toString()
    setNodes((nds) => [
      ...nds,
      {
        id: newId,
        type: "concept",
        position: { x: 400, y: 540 },
        data: { label: `새 개념 ${newId}`, nodeType: "standard", description: "새로운 개념", isFiltered: false, editMode: true },
        draggable: true,
      },
    ])
  }

  const toggleFilter = (type: "mastered" | "standard" | "missing") => {
    setFilterType((prev) => (prev === type ? "all" : type))
  }

  return (
    <div className="flex-1 relative" style={{ minHeight: 0 }}>
      <div style={{ width: "100%", height: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={editMode ? onNodesChange : undefined}
          onEdgesChange={editMode ? onEdgesChange : undefined}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={editMode}
          nodesConnectable={editMode}
          elementsSelectable={!editMode}
          style={{ background: "#f8fafc" }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
          <Controls
            showInteractive={false}
            className="!rounded-xl !shadow-lg !border-gray-200"
          />
        </ReactFlow>
      </div>

      {/* Analysis Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl w-full max-w-sm mx-4">
            <div className="flex flex-col items-center gap-5">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
              <div className="w-full space-y-2">
                {analysisSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg transition-all",
                      idx <= (analysisStep ?? 0) ? "bg-indigo-50 border border-indigo-200" : "opacity-30"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                      idx < (analysisStep ?? 0) ? "bg-indigo-500 border-indigo-500 text-white" :
                      idx === (analysisStep ?? 0) ? "border-indigo-500 text-indigo-500" :
                      "border-gray-300 text-gray-400"
                    )}>
                      {idx < (analysisStep ?? 0) ? <Check className="h-3 w-3" /> : idx + 1}
                    </div>
                    <span className="text-sm text-gray-700">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Title + Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-2.5 shadow-md">
          <h2 className="text-sm font-bold text-gray-900">지식 그래프</h2>
          <p className="text-xs text-gray-500">클릭하여 개념 탐색</p>
        </div>

        {editMode ? (
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-2 shadow-md flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={addNewNode} className="h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> 추가
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAiSuggestion(true)} className="h-8 text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> AI 정리
            </Button>
            <Button size="sm" onClick={saveChanges} className="h-8 text-xs">
              <Save className="h-3.5 w-3.5 mr-1" /> 저장
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelChanges} className="h-8 text-xs text-gray-500">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="bg-white/95 backdrop-blur-sm shadow-md text-xs h-8 w-fit"
            onClick={enterEditMode}
          >
            <Settings className="h-3.5 w-3.5 mr-1" /> 수정 모드
          </Button>
        )}
      </div>

      {/* Legend / Filter */}
      <div className="absolute top-3 right-3 z-10">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-3 shadow-md space-y-1.5">
          {([
            { type: "mastered", color: "bg-indigo-500", label: "완료된 개념" },
            { type: "standard", color: "bg-gray-300 border border-gray-400", label: "학습 필요" },
            { type: "missing", color: "bg-red-500", label: "결손 개념" },
          ] as const).map(({ type, color, label }) => (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className={cn(
                "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-xs transition-colors",
                filterType === type ? "bg-gray-100 font-semibold" : "hover:bg-gray-50 text-gray-600"
              )}
            >
              <div className={cn("w-3 h-3 rounded-full shrink-0", color)} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Suggestion Bubble */}
      {showAiSuggestion && (
        <div className="absolute bottom-16 right-3 z-20 w-72">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-50 rounded-full shrink-0">
                <MessageCircle className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="flex-1">
                {/* TODO: AI 연동 - 사용자 학습 이력 기반 동적 메시지 생성 */}
                <p className="text-sm text-gray-700 leading-relaxed">
                  <strong>행렬식</strong> 개념에서 자주 막히시는 것 같아요! 
                  <strong> 행렬 곱셈</strong>부터 차근차근 다시 시작해볼까요?
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="h-7 text-xs flex-1">시작할게요</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAiSuggestion(false)}>
                    나중에
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
