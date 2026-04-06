"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { LeftSidebar } from "@/components/left-sidebar"
import { KnowledgeGraphCanvas } from "@/components/knowledge-graph-canvas"
import { RemedyPanel } from "@/components/remedy-panel"
import { MobileNav } from "@/components/mobile-nav"
import { MobileGraph } from "@/components/mobile-graph"
import { QuizModal } from "@/components/quiz-modal"
import { ProgressDashboard } from "@/components/progress-dashboard"

export interface Analysis {
  id: string
  title: string
  subject: string
  timestamp: Date
  rootCauseNodeId?: string
}

export interface SelectedNode {
  id: string
  label: string
  type: "standard" | "mastered" | "missing"
  description?: string
}

export interface NodePosition {
  id: string
  x: number
  y: number
}

export default function DashboardPage() {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [inputText, setInputText] = useState("")
  const [activeRootCause, setActiveRootCause] = useState<string | null>("4")
  const [showQuiz, setShowQuiz] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([])
  const [editMode, setEditMode] = useState(false)
  const [filterType, setFilterType] = useState<"all" | "mastered" | "concept" | "root-cause">("all")
  const [analysisHistory, setAnalysisHistory] = useState<Analysis[]>([
    {
      id: "1",
      title: "Matrix Inversion",
      subject: "Linear Algebra",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      rootCauseNodeId: "4",
    },
    {
      id: "2",
      title: "Chain Rule",
      subject: "Calculus",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      rootCauseNodeId: "9",
    },
    {
      id: "3",
      title: "Tree Traversal",
      subject: "Data Structures",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      rootCauseNodeId: "12",
    },
  ])
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>(analysisHistory)
  const analysisTimeoutRef = useRef<NodeJS.Timeout>()

  const handleAnalyze = useCallback(() => {
    if (!inputText.trim()) return
    setIsAnalyzing(true)
    setAnalysisStep(0)
    setSelectedNode(null)
    
    // Step 1: Mapping problem
    analysisTimeoutRef.current = setTimeout(() => {
      setAnalysisStep(1)
      
      // Step 2: Analyzing reasoning
      analysisTimeoutRef.current = setTimeout(() => {
        setAnalysisStep(2)
        
        // Step 3: Tracing dependencies
        analysisTimeoutRef.current = setTimeout(() => {
          setAnalysisStep(3)
          
          // Step 4: Complete analysis
          analysisTimeoutRef.current = setTimeout(() => {
            setIsAnalyzing(false)
            setAnalysisStep(0)
            
            // Determine root cause based on keywords
            let rootCauseId = "4"
            let title = "Determinant Calculation"
            let subject = "Linear Algebra"
            
            const lowerInput = inputText.toLowerCase()
            if (lowerInput.includes("chain rule") || lowerInput.includes("derivative")) {
              rootCauseId = "9"
              title = "Chain Rule"
              subject = "Calculus"
            } else if (lowerInput.includes("tree") || lowerInput.includes("traversal")) {
              rootCauseId = "16"
              title = "Tree Traversal"
              subject = "Data Structures"
            } else if (lowerInput.includes("recursion")) {
              rootCauseId = "14"
              title = "Recursion"
              subject = "Data Structures"
            } else if (lowerInput.includes("inverse") || lowerInput.includes("inversion")) {
              rootCauseId = "5"
              title = "Matrix Inverse"
              subject = "Linear Algebra"
            }
            
            setActiveRootCause(rootCauseId)
            
            const newAnalysis: Analysis = {
              id: Date.now().toString(),
              title,
              subject,
              timestamp: new Date(),
              rootCauseNodeId: rootCauseId,
            }
            setRecentAnalyses((prev) => [newAnalysis, ...prev.slice(0, 4)])
            setAnalysisHistory((prev) => [newAnalysis, ...prev])
          }, 700)
        }, 700)
      }, 700)
    }, 700)
  }, [inputText])

  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current)
      }
    }
  }, [])

  const handleNodeClick = useCallback((node: SelectedNode) => {
    setSelectedNode(node)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleSelectAnalysis = useCallback((analysis: Analysis) => {
    if (analysis.rootCauseNodeId) {
      setActiveRootCause(analysis.rootCauseNodeId)
    }
  }, [])

  const handleNodePositionChange = useCallback((positions: NodePosition[]) => {
    setNodePositions(positions)
  }, [])

  return (
    <>
      {/* Mobile Navigation */}
      <MobileNav
        inputText={inputText}
        setInputText={setInputText}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyze}
        recentAnalyses={recentAnalyses}
        onSelectAnalysis={handleSelectAnalysis}
      />

      {/* Desktop Layout */}
      <div className="flex h-screen bg-background overflow-hidden max-md:pt-[72px]">
        {/* Left Sidebar - Error Analyzer */}
        <LeftSidebar
          inputText={inputText}
          setInputText={setInputText}
          isAnalyzing={isAnalyzing}
          analysisStep={analysisStep}
          onAnalyze={handleAnalyze}
          recentAnalyses={recentAnalyses}
          onSelectAnalysis={handleSelectAnalysis}
          onShowProgress={() => setShowProgress(true)}
          editMode={editMode}
          setEditMode={setEditMode}
          filterType={filterType}
          setFilterType={setFilterType}
        />

        {/* Center - Knowledge Graph Canvas (Desktop) */}
        <KnowledgeGraphCanvas
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id}
          activeRootCauseId={activeRootCause}
          isAnalyzing={isAnalyzing}
          analysisStep={analysisStep}
          editMode={editMode}
          filterType={filterType}
          setFilterType={setFilterType}
          onNodePositionChange={handleNodePositionChange}
          onOpenQuiz={() => setShowQuiz(true)}
        />

        {/* Center - Knowledge Graph Canvas (Mobile) */}
        <MobileGraph
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id}
          activeRootCauseId={activeRootCause}
          isAnalyzing={isAnalyzing}
          selectedNode={selectedNode}
          onClosePanel={handleClosePanel}
          editMode={editMode}
          setEditMode={setEditMode}
          filterType={filterType}
          setFilterType={setFilterType}
          onOpenQuiz={() => setShowQuiz(true)}
        />

        {/* Right Panel - Remedy & Micro-learning */}
        <RemedyPanel
          selectedNode={selectedNode}
          onClose={handleClosePanel}
          onOpenQuiz={() => setShowQuiz(true)}
        />
      </div>

      {/* Quiz Modal */}
      <QuizModal
        isOpen={showQuiz}
        onClose={() => setShowQuiz(false)}
        selectedNode={selectedNode}
      />

      {/* Progress Dashboard Modal */}
      <ProgressDashboard
        isOpen={showProgress}
        onClose={() => setShowProgress(false)}
        analysisHistory={analysisHistory}
      />
    </>
  )
}
