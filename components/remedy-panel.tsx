"use client"

import { X, Lightbulb, Play, BookOpen, ArrowRight, CheckCircle, AlertCircle, Target, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface SelectedNode {
  id: string
  label: string
  type: "standard" | "mastered" | "missing"
  description: string
}

interface RemedyPanelProps {
  selectedNode: SelectedNode | null
  onClose: () => void
}

// 마이크로 러닝 콘텐츠 (기획서: 3분 분량)
const nodeContent: Record<string, {
  explanation: string
  videoTitle: string
  videoDuration: string
  summary: string
  prerequisites: string[]
  quiz: { question: string; options: string[]; answer: number }
}> = {
  "4": {
    explanation: "행렬식(Determinant)은 정사각 행렬에서 계산되는 스칼라 값입니다. 2×2 행렬 [[a,b],[c,d]]의 행렬식은 ad - bc입니다. 반대각선의 곱을 빼는 것을 잊거나 부호 실수를 했을 수 있습니다.",
    videoTitle: "행렬식 완벽 이해하기",
    videoDuration: "3:45",
    summary: "행렬식은 행렬이 공간을 얼마나 확대/축소하는지를 나타냅니다. 부호는 방향(회전) 보존 여부를 알려줍니다.",
    prerequisites: ["행렬 곱셈", "스칼라 연산"],
    quiz: {
      question: "행렬 [[2,3],[1,4]]의 행렬식은?",
      options: ["5", "8", "11", "-5"],
      answer: 0
    }
  },
  "5": {
    explanation: "역행렬을 구하려면 먼저 행렬식을 계산해야 합니다. det(A) = 0이면 역행렬이 존재하지 않습니다. 2×2 행렬의 경우, 대각 원소를 교환하고, 반대각 원소의 부호를 바꾼 후, 행렬식으로 나눕니다.",
    videoTitle: "역행렬 구하기",
    videoDuration: "4:20",
    summary: "역행렬 A⁻¹은 A × A⁻¹ = I를 만족합니다. 연립방정식 풀이와 변환에 사용됩니다.",
    prerequisites: ["행렬식", "단위행렬"],
    quiz: {
      question: "det(A) = 0일 때 역행렬은?",
      options: ["존재하지 않음", "단위행렬", "영행렬", "전치행렬"],
      answer: 0
    }
  },
  "6": {
    explanation: "여인수 전개는 큰 행렬의 행렬식을 작은 행렬들로 분해하여 계산하는 방법입니다. 각 원소에 해당 여인수(소행렬식 × 위치에 따른 부호)를 곱합니다.",
    videoTitle: "여인수 전개 방법",
    videoDuration: "5:10",
    summary: "여인수를 사용하면 어떤 크기의 행렬식도 재귀적으로 계산할 수 있습니다.",
    prerequisites: ["행렬식", "행렬 연산"],
    quiz: {
      question: "3×3 행렬의 여인수 전개 시 필요한 2×2 행렬식의 개수는?",
      options: ["3개", "6개", "9개", "2개"],
      answer: 0
    }
  },
  "7": {
    explanation: "크래머 공식은 행렬식을 이용해 연립방정식의 해를 구하는 방법입니다. 각 미지수는 특정 열을 상수항으로 대체한 행렬의 행렬식을 원래 행렬식으로 나눈 값입니다.",
    videoTitle: "크래머 공식으로 연립방정식 풀기",
    videoDuration: "6:00",
    summary: "Ax = b 형태의 시스템을 행렬 기법으로 풀 수 있습니다.",
    prerequisites: ["역행렬", "여인수 전개"],
    quiz: {
      question: "크래머 공식을 사용할 수 없는 경우는?",
      options: ["det(A) = 0일 때", "det(A) = 1일 때", "det(A) > 0일 때", "det(A) < 0일 때"],
      answer: 0
    }
  },
  "9": {
    explanation: "고유값(eigenvalue)은 Av = λv를 만족하는 스칼라 λ입니다. det(A - λI) = 0인 특성방정식을 풀어 구합니다. 고유벡터는 해당 고유값에 대응하는 영이 아닌 벡터입니다.",
    videoTitle: "고유값과 고유벡터",
    videoDuration: "5:30",
    summary: "고유값 분해는 행렬의 본질적인 성질을 파악하는 핵심 도구입니다.",
    prerequisites: ["행렬식", "선형 변환"],
    quiz: {
      question: "2×2 행렬의 고유값 개수는 최대?",
      options: ["2개", "1개", "4개", "무한개"],
      answer: 0
    }
  },
  "10": {
    explanation: "대각화는 행렬을 P⁻¹AP = D 형태로 변환하는 것입니다. D는 대각행렬이고, P는 고유벡터로 구성됩니다. 모든 행렬이 대각화 가능한 것은 아닙니다.",
    videoTitle: "행렬의 대각화",
    videoDuration: "4:45",
    summary: "대각화하면 행렬의 거듭제곱 계산이 매우 쉬워집니다.",
    prerequisites: ["고유값"],
    quiz: {
      question: "행렬이 대각화 가능하려면?",
      options: ["n개의 선형독립인 고유벡터 필요", "모든 고유값이 같아야 함", "대칭행렬이어야 함", "역행렬이 존재해야 함"],
      answer: 0
    }
  },
}

const defaultContent = {
  explanation: "이 개념은 더 심화된 주제를 이해하기 위한 기초가 됩니다. 충분히 이해하고 넘어가세요.",
  videoTitle: "개념 개요",
  videoDuration: "3:00",
  summary: "이 개념을 잘 이해하면 더 복잡한 응용으로 나아갈 수 있습니다.",
  prerequisites: ["기초 수학", "논리적 사고"],
  quiz: {
    question: "개념 이해도 확인",
    options: ["이해함", "복습 필요", "어려움", "건너뛰기"],
    answer: 0
  }
}

export function RemedyPanel({ selectedNode, onClose }: RemedyPanelProps) {
  const isOpen = selectedNode !== null
  const content = selectedNode ? (nodeContent[selectedNode.id] || defaultContent) : null

  if (!isOpen || !content) {
    return (
      <aside className="w-[360px] border-l border-border bg-muted/20 flex items-center justify-center h-full shrink-0 max-lg:hidden">
        <div className="text-center p-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">노드를 클릭하면<br />상세 정보가 표시됩니다</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-[360px] border-l border-border bg-card flex flex-col h-full shrink-0 max-lg:hidden">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={cn(
                  "p-2 rounded-xl",
                  selectedNode.type === "missing" && "bg-destructive/15",
                  selectedNode.type === "mastered" && "bg-primary/15",
                  selectedNode.type === "standard" && "bg-secondary"
                )}
              >
                {selectedNode.type === "missing" && <AlertCircle className="h-5 w-5 text-destructive" />}
                {selectedNode.type === "mastered" && <CheckCircle className="h-5 w-5 text-primary" />}
                {selectedNode.type === "standard" && <Target className="h-5 w-5 text-muted-foreground" />}
              </div>
              <span
                className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-full",
                  selectedNode.type === "missing" && "bg-destructive/15 text-destructive",
                  selectedNode.type === "mastered" && "bg-primary/15 text-primary",
                  selectedNode.type === "standard" && "bg-secondary text-muted-foreground"
                )}
              >
                {selectedNode.type === "missing" && "결손 개념"}
                {selectedNode.type === "mastered" && "완료"}
                {selectedNode.type === "standard" && "학습 필요"}
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground">{selectedNode.label}</h2>
            <p className="text-sm text-muted-foreground mt-1">{selectedNode.description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg shrink-0 hover:bg-secondary"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5 space-y-5">
        {/* AI Explanation */}
        <div
          className={cn(
            "rounded-xl p-4",
            selectedNode.type === "missing"
              ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50"
              : "bg-secondary/50 border border-border"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className={cn("h-4 w-4", selectedNode.type === "missing" ? "text-amber-600" : "text-primary")} />
            <span className="text-sm font-semibold text-foreground">
              {selectedNode.type === "missing" ? "왜 틀렸을까요?" : "개념 설명"}
            </span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{content.explanation}</p>
        </div>

        {/* 3-Minute Micro-Learning Video */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            3분 마이크로 러닝
          </h3>
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-background border border-border aspect-video group cursor-pointer hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-110 transition-transform">
                <Play className="h-6 w-6 text-primary-foreground ml-1" />
              </div>
              <p className="text-sm font-medium text-foreground mt-3">{content.videoTitle}</p>
              <p className="text-xs text-muted-foreground">{content.videoDuration}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{content.summary}</p>
        </div>

        {/* Prerequisites */}
        {content.prerequisites.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              선행 개념
            </h3>
            <div className="flex flex-wrap gap-2">
              {content.prerequisites.map((prereq) => (
                <span
                  key={prereq}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary text-foreground border border-border"
                >
                  {prereq}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Quiz */}
        <div className="rounded-xl border border-border p-4 bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground mb-3">확인 퀴즈</h3>
          <p className="text-sm text-foreground mb-3">{content.quiz.question}</p>
          <div className="space-y-2">
            {content.quiz.options.map((option, idx) => (
              <button
                key={idx}
                className="w-full text-left text-sm px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-border bg-muted/30">
        <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 font-medium">
          학습 완료로 표시
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </aside>
  )
}
