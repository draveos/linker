"use client"

import { useState } from "react"
import { LeftSidebar } from "@/components/left-sidebar"
import { KnowledgeGraphCanvas } from "@/components/knowledge-graph-canvas"
import { RemedyPanel } from "@/components/remedy-panel"

export interface Analysis {
  id: string
  title: string
  subject: string
  timestamp: Date
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
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([
    {
      id: "1",
      title: "Matrix Inversion",
      subject: "Linear Algebra",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: "2",
      title: "Chain Rule",
      subject: "Calculus",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      id: "3",
      title: "Quadratic Formula",
      subject: "Algebra",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  ])

  const handleAnalyze = () => {
    if (!inputText.trim()) return
    setIsAnalyzing(true)
    
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false)
      const newAnalysis: Analysis = {
        id: Date.now().toString(),
        title: "New Analysis",
        subject: "Mathematics",
        timestamp: new Date(),
      }
      setRecentAnalyses((prev) => [newAnalysis, ...prev])
    }, 2000)
  }

  const handleNodeClick = (node: SelectedNode) => {
    setSelectedNode(node)
  }

  const handleClosePanel = () => {
    setSelectedNode(null)
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar - Error Analyzer */}
      <LeftSidebar
        inputText={inputText}
        setInputText={setInputText}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyze}
        recentAnalyses={recentAnalyses}
      />

      {/* Center - Knowledge Graph Canvas */}
      <KnowledgeGraphCanvas
        onNodeClick={handleNodeClick}
        selectedNodeId={selectedNode?.id}
      />

      {/* Right Panel - Remedy & Micro-learning */}
      <RemedyPanel
        selectedNode={selectedNode}
        onClose={handleClosePanel}
      />
    </div>
  )
}
