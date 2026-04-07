import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  X, Lightbulb, Play, BookOpen, ArrowRight,
  CheckCircle, AlertCircle, Target, GraduationCap
} from "lucide-react"
import { Button } from "./ui/button"
import { cn } from "../lib/utils"

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

// TODO: AI 연동 - 노드별 설명/퀴즈를 LLM으로 동적 생성
const nodeContent: Record<string, {
  explanation: string
  videoTitle: string
  videoDuration: string
  summary: string
  prerequisites: string[]
  quiz: { question: string; options: string[]; answer: number }
}> = {
  "4": {
    explanation: "행렬식(Determinant)은 정사각 행렬에서 계산되는 스칼라 값입니다. 2x2 행렬 [[a,b],[c,d]]의 행렬식은 ad - bc입니다. 반대각선의 곱을 빼는 것을 잊거나 부호 실수를 했을 수 있습니다.",
    videoTitle: "행렬식 완벽 이해하기",
    videoDuration: "3:45",
    summary: "행렬식은 행렬이 공간을 얼마나 확대/축소하는지 나타냅니다.",
    prerequisites: ["행렬 곱셈", "스칼라 연산"],
    quiz: { question: "행렬 [[2,3],[1,4]]의 행렬식은?", options: ["5", "8", "11", "-5"], answer: 0 }
  },
  "5": {
    explanation: "역행렬을 구하려면 행렬식이 0이 아니어야 합니다. 2x2 행렬은 대각 원소 교환 → 반대각 부호 변경 → 행렬식으로 나누기 순서로 구합니다.",
    videoTitle: "역행렬 구하기",
    videoDuration: "4:20",
    summary: "역행렬 A^-1은 A × A^-1 = I를 만족합니다.",
    prerequisites: ["행렬식", "단위행렬"],
    quiz: { question: "det(A) = 0일 때 역행렬은?", options: ["존재하지 않음", "단위행렬", "영행렬", "전치행렬"], answer: 0 }
  },
  "6": {
    explanation: "여인수 전개는 큰 행렬의 행렬식을 작은 행렬들로 분해하여 계산합니다.",
    videoTitle: "여인수 전개 방법",
    videoDuration: "5:10",
    summary: "여인수를 이용하면 어떤 크기의 행렬식도 재귀적으로 계산할 수 있습니다.",
    prerequisites: ["행렬식", "행렬 연산"],
    quiz: { question: "3x3 행렬 여인수 전개 시 필요한 2x2 행렬식 개수는?", options: ["3개", "6개", "9개", "2개"], answer: 0 }
  },
  "7": {
    explanation: "크래머 공식은 행렬식으로 연립방정식의 해를 구합니다. det(A) ≠ 0일 때 사용 가능합니다.",
    videoTitle: "크래머 공식으로 연립방정식 풀기",
    videoDuration: "6:00",
    summary: "Ax = b 형태를 행렬 기법으로 풀 수 있습니다.",
    prerequisites: ["역행렬", "여인수 전개"],
    quiz: { question: "크래머 공식을 사용할 수 없는 경우는?", options: ["det(A) = 0일 때", "det(A) = 1일 때", "det(A) > 0일 때", "det(A) < 0일 때"], answer: 0 }
  },
  "9": {
    explanation: "고유값은 Av = λv를 만족하는 스칼라 λ입니다. det(A - λI) = 0 특성방정식으로 구합니다.",
    videoTitle: "고유값과 고유벡터",
    videoDuration: "5:30",
    summary: "고유값 분해는 행렬의 본질적 성질을 파악하는 핵심 도구입니다.",
    prerequisites: ["행렬식", "선형 변환"],
    quiz: { question: "2x2 행렬의 고유값 개수는 최대?", options: ["2개", "1개", "4개", "무한개"], answer: 0 }
  },
  "10": {
    explanation: "대각화는 P^-1 AP = D 형태로 변환합니다. P는 고유벡터, D는 대각행렬입니다.",
    videoTitle: "행렬의 대각화",
    videoDuration: "4:45",
    summary: "대각화하면 행렬의 거듭제곱 계산이 매우 쉬워집니다.",
    prerequisites: ["고유값"],
    quiz: { question: "행렬이 대각화 가능하려면?", options: ["n개의 선형독립 고유벡터 필요", "모든 고유값이 같아야 함", "대칭행렬이어야 함", "역행렬이 존재해야 함"], answer: 0 }
  },
}

const defaultContent = {
  explanation: "이 개념은 더 심화된 주제를 이해하기 위한 기초입니다. 충분히 이해하고 넘어가세요.",
  videoTitle: "개념 개요",
  videoDuration: "3:00",
  summary: "이 개념을 잘 이해하면 더 복잡한 응용으로 나아갈 수 있습니다.",
  prerequisites: ["기초 수학", "논리적 사고"],
  quiz: { question: "개념 이해도 확인", options: ["이해함", "복습 필요", "어려움", "건너뛰기"], answer: 0 }
}

export function RemedyPanel({ selectedNode, onClose }: RemedyPanelProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    setSelectedAnswer(null)
    setShowResult(false)
  }, [selectedNode?.id])

  useEffect(() => {
    if (!selectedNode) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [selectedNode, onClose])

  const isOpen = selectedNode !== null
  const content = selectedNode ? (nodeContent[selectedNode.id] ?? defaultContent) : null

  if (!isOpen || !content) return null

  const isCorrect = selectedAnswer === content.quiz.answer

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "p-2 rounded-xl shrink-0",
                  selectedNode.type === "missing" && "bg-destructive/15",
                  selectedNode.type === "mastered" && "bg-primary/15",
                  selectedNode.type === "standard" && "bg-secondary"
                )}>
                  {selectedNode.type === "missing" && <AlertCircle className="h-4 w-4 text-destructive" />}
                  {selectedNode.type === "mastered" && <CheckCircle className="h-4 w-4 text-primary" />}
                  {selectedNode.type === "standard" && <Target className="h-4 w-4 text-muted-foreground" />}
                </div>
                <span className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-full",
                  selectedNode.type === "missing" && "bg-destructive/15 text-destructive",
                  selectedNode.type === "mastered" && "bg-primary/15 text-primary",
                  selectedNode.type === "standard" && "bg-secondary text-muted-foreground"
                )}>
                  {selectedNode.type === "missing" && "결손 개념"}
                  {selectedNode.type === "mastered" && "완료"}
                  {selectedNode.type === "standard" && "학습 필요"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground">{selectedNode.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{selectedNode.description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* AI Explanation */}
          {/* TODO: AI 연동 - LLM으로 동적 설명 생성 */}
          <div className={cn(
            "rounded-xl p-4",
            selectedNode.type === "missing"
              ? "bg-amber-50 border border-amber-200"
              : "bg-secondary/50 border border-border"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className={cn("h-4 w-4", selectedNode.type === "missing" ? "text-amber-600" : "text-primary")} />
              <span className="text-sm font-semibold text-foreground">
                {selectedNode.type === "missing" ? "왜 틀렸을까요?" : "개념 설명"}
              </span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{content.explanation}</p>
          </div>

          {/* Micro-Learning Video */}
          {/* TODO: 실제 YouTube/Vimeo 임베드 연동 필요 */}
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
                  <span key={prereq} className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary text-foreground border border-border">
                    {prereq}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quiz */}
          {/* TODO: AI 연동 - 동적 퀴즈 생성 */}
          <div className="rounded-xl border border-border p-4 bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground mb-3">확인 퀴즈</h3>
            <p className="text-sm text-foreground mb-3">{content.quiz.question}</p>
            <div className="space-y-2">
              {content.quiz.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedAnswer(idx); setShowResult(true) }}
                  disabled={showResult}
                  className={cn(
                    "w-full text-left text-sm px-4 py-2.5 rounded-lg border transition-colors",
                    showResult && idx === content.quiz.answer && "bg-green-50 border-green-400 text-green-800",
                    showResult && selectedAnswer === idx && idx !== content.quiz.answer && "bg-red-50 border-red-400 text-red-800",
                    !showResult && "border-border bg-card hover:bg-primary/5 hover:border-primary/30"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            {showResult && (
              <p className={cn("text-sm mt-3 font-medium", isCorrect ? "text-green-600" : "text-red-600")}>
                {isCorrect ? "정답입니다!" : "틀렸습니다. 다시 복습해보세요."}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-muted/30 shrink-0">
          <Button className="w-full h-11 font-medium">
            학습 완료로 표시
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
