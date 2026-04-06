"use client"

import { useState, useCallback } from "react"
import { LeftSidebar } from "@/components/left-sidebar"
import { KnowledgeGraphCanvas } from "@/components/knowledge-graph-canvas"
import { RemedyPanel } from "@/components/remedy-panel"
import { MobileNav } from "@/components/mobile-nav"
import { MobileGraph } from "@/components/mobile-graph"

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

export default function DashboardPage() {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [inputText, setInputText] = useState("")
  const [activeRootCause, setActiveRootCause] = useState<string | null>("4") // Default to Determinants
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([
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

  const handleAnalyze = useCallback(() => {
    if (!inputText.trim()) return
    setIsAnalyzing(true)
    setSelectedNode(null)
    
    // Simulate analysis with dynamic root cause selection
    setTimeout(() => {
      setIsAnalyzing(false)
      
      // Determine which concept is the root cause based on input keywords
      let rootCauseId = "4" // Default: Determinants
      let title = "Determinant Calculation"
      let subject = "Linear Algebra"
      
      const lowerInput = inputText.toLowerCase()
      if (lowerInput.includes("chain rule") || lowerInput.includes("derivative")) {
        rootCauseId = "9"
        title = "Chain Rule"
        subject = "Calculus"
      } else if (lowerInput.includes("tree") || lowerInput.includes("traversal")) {
        rootCauseId = "12"
        title = "Tree Traversal"
        subject = "Data Structures"
      } else if (lowerInput.includes("recursion")) {
        rootCauseId = "11"
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
    }, 2500)
  }, [inputText])

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
          onAnalyze={handleAnalyze}
          recentAnalyses={recentAnalyses}
          onSelectAnalysis={handleSelectAnalysis}
        />

        {/* Center - Knowledge Graph Canvas (Desktop) */}
        <KnowledgeGraphCanvas
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id}
          activeRootCauseId={activeRootCause}
          isAnalyzing={isAnalyzing}
        />

        {/* Center - Knowledge Graph Canvas (Mobile) */}
        <MobileGraph
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id}
          activeRootCauseId={activeRootCause}
          isAnalyzing={isAnalyzing}
          selectedNode={selectedNode}
          onClosePanel={handleClosePanel}
        />

        {/* Right Panel - Remedy & Micro-learning */}
        <RemedyPanel
          selectedNode={selectedNode}
          onClose={handleClosePanel}
        />
      </div>
    </>
  )
}
