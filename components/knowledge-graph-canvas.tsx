"use client"

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
  type EdgeProps,
  getBezierPath,
  BaseEdge,
} from "reactflow"
import "reactflow/dist/style.css"
import { Check, AlertTriangle, Circle, Settings, Save, X, Plus, Sparkles, MessageCircle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// 삭제 확인 팝업 상태
interface DeleteConfirmState {
  type: "node" | "edge" | null
  id: string | null
  name: string
}

// Types
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

// 기초 선형대수학 개념
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

// 완료된 개념 (파란색)
const masteredNodeIds = ["1", "2", "3"]

// 노드 위치
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

// Custom Node Component
function ConceptNode({ data, selected, id }: NodeProps) {
  const { label, nodeType, isAnalyzing, isFiltered, editMode, onDelete } = data

  return (
    <div className="relative group">
      {/* 삭제 버튼 (수정 모드에서만 표시) */}
      {editMode && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.(id, label)
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive hover:bg-destructive/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      
      <div
        className={cn(
          "px-4 py-3 rounded-xl border-2 shadow-lg transition-all duration-300 min-w-[100px] text-center",
          nodeType === "mastered" && "bg-primary text-primary-foreground border-primary shadow-primary/25",
          nodeType === "standard" && "bg-card text-card-foreground border-border hover:border-primary/50",
          nodeType === "missing" && "bg-destructive/10 text-destructive border-destructive shadow-destructive/30 shadow-xl",
          nodeType === "missing" && isAnalyzing && "animate-pulse",
          selected && "ring-2 ring-ring ring-offset-2",
          isFiltered && "opacity-20",
          editMode && "cursor-move"
        )}
      >
        <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2 !border-0" />

        <div className="flex items-center justify-center gap-2">
          {nodeType === "mastered" && <Check className="h-4 w-4" />}
          {nodeType === "missing" && <AlertTriangle className="h-4 w-4" />}
          {nodeType === "standard" && <Circle className="h-3 w-3 opacity-50" />}
          <span className="font-medium text-sm">{label}</span>
        </div>

        <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2 !border-0" />
      </div>
    </div>
  )
}

// Custom Edge with delete button
function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const { editMode, onDeleteEdge } = data || {}

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {editMode && (
        <foreignObject
          width={20}
          height={20}
          x={labelX - 10}
          y={labelY - 10}
          className="overflow-visible"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteEdge?.(id)
            }}
            className="w-5 h-5 bg-destructive hover:bg-destructive/80 text-white rounded-full flex items-center justify-center shadow-md opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </foreignObject>
      )}
    </>
  )
}

const nodeTypes = { concept: ConceptNode } as const
const edgeTypes = { deletable: DeletableEdge } as const

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
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ type: null, id: null, name: "" })
  const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false)

  // 노드 삭제 요청
  const handleDeleteNode = useCallback((nodeId: string, nodeName: string) => {
    if (skipDeleteConfirm) {
      // 바로 삭제
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    } else {
      setDeleteConfirm({ type: "node", id: nodeId, name: nodeName })
    }
  }, [skipDeleteConfirm])

  // 엣지 삭제 요청
  const handleDeleteEdge = useCallback((edgeId: string) => {
    if (skipDeleteConfirm) {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId))
    } else {
      setDeleteConfirm({ type: "edge", id: edgeId, name: "연결선" })
    }
  }, [skipDeleteConfirm])

  // Generate nodes
  const initialNodes: Node[] = useMemo(() => {
    return knowledgeNodes.map((node) => {
      let nodeType: "standard" | "mastered" | "missing" = "standard"
      if (masteredNodeIds.includes(node.id)) nodeType = "mastered"
      else if (node.id === activeRootCauseId) nodeType = "missing"

      const isFiltered = filterType !== "all" && filterType !== nodeType

      return {
        id: node.id,
        type: "concept",
        position: nodePositions[node.id] || { x: 0, y: 0 },
        data: {
          label: node.label,
          nodeType,
          description: node.description,
          isAnalyzing: isAnalyzing && node.id === activeRootCauseId,
          isFiltered,
          editMode,
          onDelete: handleDeleteNode,
        },
        selected: node.id === selectedNodeId,
        draggable: editMode,
      }
    })
  }, [activeRootCauseId, selectedNodeId, isAnalyzing, filterType, editMode, handleDeleteNode])

  // Generate edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = []
    knowledgeNodes.forEach((node) => {
      node.prerequisites.forEach((prereqId) => {
        const isPathToRootCause =
          activeRootCauseId && (node.id === activeRootCauseId || prereqId === activeRootCauseId)

        edges.push({
          id: `${prereqId}-${node.id}`,
          source: prereqId,
          target: node.id,
          type: editMode ? "deletable" : "smoothstep",
          animated: isAnalyzing && isPathToRootCause,
          data: {
            editMode,
            onDeleteEdge: handleDeleteEdge,
          },
          style: {
            stroke: isPathToRootCause ? "hsl(var(--destructive))" : "hsl(var(--border))",
            strokeWidth: isPathToRootCause ? 2.5 : 1.5,
            opacity: filterType !== "all" ? 0.3 : 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isPathToRootCause ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))",
            width: 16,
            height: 16,
          },
        })
      })
    })
    return edges
  }, [activeRootCauseId, isAnalyzing, filterType, editMode, handleDeleteEdge])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when not in edit mode
  useEffect(() => {
    if (!editMode) {
      setNodes(initialNodes)
      setEdges(initialEdges)
    }
  }, [editMode, initialNodes, initialEdges, setNodes, setEdges])

  // Update node data when editMode changes (keep positions)
  useEffect(() => {
    if (editMode) {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          draggable: true,
          data: {
            ...n.data,
            editMode: true,
            onDelete: handleDeleteNode,
          },
        }))
      )
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          type: "deletable",
          data: {
            ...e.data,
            editMode: true,
            onDeleteEdge: handleDeleteEdge,
          },
        }))
      )
    }
  }, [editMode, handleDeleteNode, handleDeleteEdge, setNodes, setEdges])

  // Handle edge connections in edit mode
  const onConnect = useCallback(
    (params: Connection) => {
      if (editMode) {
        setEdges((eds) => addEdge({ 
          ...params, 
          type: "deletable",
          data: { editMode: true, onDeleteEdge: handleDeleteEdge }
        }, eds))
      }
    },
    [editMode, setEdges, handleDeleteEdge]
  )

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (editMode) return // 수정 모드에서는 클릭 이벤트 무시

      const kNode = knowledgeNodes.find((n) => n.id === node.id)
      if (kNode) {
        let nodeType: "standard" | "mastered" | "missing" = "standard"
        if (masteredNodeIds.includes(node.id)) nodeType = "mastered"
        else if (node.id === activeRootCauseId) nodeType = "missing"

        onNodeClick({
          id: node.id,
          label: kNode.label,
          type: nodeType,
          description: kNode.description,
        })
      }
    },
    [onNodeClick, activeRootCauseId, editMode]
  )

  // 수정 모드 진입
  const enterEditMode = () => {
    setSavedNodes([...nodes])
    setSavedEdges([...edges])
    setEditMode(true)
  }

  // 수정 저장
  const saveChanges = () => {
    setSavedNodes(null)
    setSavedEdges(null)
    setEditMode(false)
    // TODO: AI 연동 - 변경된 노드/엣지 정보를 서버에 저장
  }

  // 수정 취소
  const cancelChanges = () => {
    if (savedNodes && savedEdges) {
      setNodes(savedNodes)
      setEdges(savedEdges)
    }
    setSavedNodes(null)
    setSavedEdges(null)
    setEditMode(false)
  }

  // 노드 추가
  const addNewNode = () => {
    const newId = (Math.max(...nodes.map((n) => parseInt(n.id)), 0) + 1).toString()
    const newNode: Node = {
      id: newId,
      type: "concept",
      position: { x: 400, y: 500 },
      data: {
        label: `새 개념 ${newId}`,
        nodeType: "standard",
        description: "새로운 개념",
        isFiltered: false,
        editMode: true,
        onDelete: handleDeleteNode,
      },
      draggable: true,
    }
    setNodes((nds) => [...nds, newNode])
  }

  // 삭제 확정
  const executeDelete = () => {
    if (deleteConfirm.id) {
      if (deleteConfirm.type === "node") {
        setNodes((nds) => nds.filter((n) => n.id !== deleteConfirm.id))
        setEdges((eds) => eds.filter((e) => e.source !== deleteConfirm.id && e.target !== deleteConfirm.id))
      } else if (deleteConfirm.type === "edge") {
        setEdges((eds) => eds.filter((e) => e.id !== deleteConfirm.id))
      }
    }
    setDeleteConfirm({ type: null, id: null, name: "" })
  }

  // 삭제 취소
  const cancelDelete = () => {
    setDeleteConfirm({ type: null, id: null, name: "" })
  }

  // AI 정리 요청
  const requestAiOrganize = () => {
    setShowAiSuggestion(true)
    // TODO: AI 연동 - AI가 노드 위치와 연결을 분석하여 최적화된 배치 제안
  }

  const analysisSteps = [
    "문제를 관련 개념에 매핑 중...",
    "풀이 과정 분석 및 오류 탐지 중...",
    "선행 개념 의존성 추적 중...",
    "결손 개념 확정 완료",
  ]

  // 필터 토글
  const toggleFilter = (type: "mastered" | "standard" | "missing") => {
    setFilterType((prev) => (prev === type ? "all" : type))
  }

  return (
    <div className="flex-1 h-full w-full relative">
      <div style={{ width: "100%", height: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.5}
          maxZoom={1.5}
          className="bg-muted/30"
          proOptions={{ hideAttribution: true }}
          nodesDraggable={editMode}
          nodesConnectable={editMode}
          elementsSelectable={editMode}
          panOnDrag={!editMode}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          selectNodesOnDrag={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(var(--border))" />
          <Controls
            className="!bg-card !border-border !rounded-xl !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!rounded-lg [&>button:hover]:!bg-muted"
            showInteractive={false}
          />
        </ReactFlow>
      </div>

      {/* Analysis Progress Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex flex-col items-center gap-5">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />

              <div className="w-full space-y-2">
                {analysisSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg transition-all",
                      idx <= (analysisStep ?? 0)
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-muted/50 border border-transparent opacity-40"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                        idx <= (analysisStep ?? 0)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground text-muted-foreground"
                      )}
                    >
                      {idx < (analysisStep ?? 0) ? <Check className="h-3 w-3" /> : idx + 1}
                    </div>
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Title & Edit Mode Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg">
          <h2 className="text-base font-bold text-foreground">지식 그래프</h2>
          <p className="text-xs text-muted-foreground">기초 선형대수학</p>
        </div>

        {editMode ? (
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-2 shadow-lg flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={addNewNode}>
              <Plus className="h-4 w-4 mr-1" />
              노드 추가
            </Button>
            <Button size="sm" variant="outline" onClick={requestAiOrganize}>
              <Sparkles className="h-4 w-4 mr-1" />
              AI 정리
            </Button>
            <Button size="sm" variant="default" onClick={saveChanges}>
              <Save className="h-4 w-4 mr-1" />
              저장
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelChanges}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="bg-card/95 backdrop-blur-sm border-border shadow-lg w-fit"
            onClick={enterEditMode}
          >
            <Settings className="h-4 w-4 mr-1" />
            수정 모드
          </Button>
        )}
      </div>

      {/* Legend with Filter */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg space-y-2">
          <button
            onClick={() => toggleFilter("mastered")}
            className={cn(
              "flex items-center gap-2 text-xs w-full px-2 py-1 rounded-lg transition-colors",
              filterType === "mastered" ? "bg-primary/15" : "hover:bg-muted"
            )}
          >
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">완료된 개념</span>
          </button>
          <button
            onClick={() => toggleFilter("standard")}
            className={cn(
              "flex items-center gap-2 text-xs w-full px-2 py-1 rounded-lg transition-colors",
              filterType === "standard" ? "bg-muted-foreground/15" : "hover:bg-muted"
            )}
          >
            <div className="w-3 h-3 rounded-full bg-muted-foreground/30 border border-border" />
            <span className="text-muted-foreground">학습 필요</span>
          </button>
          <button
            onClick={() => toggleFilter("missing")}
            className={cn(
              "flex items-center gap-2 text-xs w-full px-2 py-1 rounded-lg transition-colors",
              filterType === "missing" ? "bg-destructive/15" : "hover:bg-muted"
            )}
          >
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">결손 개념</span>
          </button>
        </div>
      </div>

      {/* AI Suggestion Bubble */}
      {showAiSuggestion && (
        <div className="absolute bottom-20 right-4 z-20 max-w-xs animate-in slide-in-from-bottom-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full shrink-0">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground leading-relaxed">
                  보니까 <strong>행렬식</strong> 개념에서 자주 막히시는 것 같아요! 
                  <strong> 행렬 곱셈</strong>부터 차근차근 복습해볼까요?
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="default" className="h-8">
                    네, 시작할게요
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowAiSuggestion(false)}>
                    나중에
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {deleteConfirm.id && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-destructive/10 rounded-full">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {deleteConfirm.type === "node" ? "노드 삭제" : "연결선 삭제"}
              </h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              <strong className="text-foreground">{deleteConfirm.name}</strong>을(를) 정말로 삭제하시겠습니까?
              {deleteConfirm.type === "node" && (
                <>
                  <br />
                  <span className="text-xs">연결된 모든 엣지도 함께 삭제됩니다.</span>
                </>
              )}
            </p>

            <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipDeleteConfirm}
                onChange={(e) => setSkipDeleteConfirm(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-xs text-muted-foreground">오늘은 다시 묻지 않기</span>
            </label>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={cancelDelete}>
                취소
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={executeDelete}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
