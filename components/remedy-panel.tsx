"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { X, Lightbulb, Play, BookOpen, ArrowRight, CheckCircle, AlertCircle, Target, GraduationCap, Bot, Shield, RefreshCw, ChevronDown, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AgentTraceEntry, ExitReason } from "@/app/api/analyze-error/route"

export interface SelectedNode {
  id: string
  label: string
  type: "standard" | "mastered" | "missing" | "affected"
  description: string
}

export interface AiRemedyContent {
  explanation: string
  microLearning: {
    title: string
    content: string
    summary: string
    quiz: {
      question: string
      options: string[]
      answerIndex: number
    }
  }
  confidence: number
  traversalPath: string[]
  agentTrace?: AgentTraceEntry[]
  verificationRounds?: number
  exitReason?: ExitReason
}

interface RemedyPanelProps {
  selectedNode: SelectedNode | null
  onClose: () => void
  aiContent?: AiRemedyContent | null
  onMarkMastered?: (nodeId: string) => void
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
    explanation: "행렬식(Determinant)은 정사각 행렬에서 계산되는 스칼라 값입니다. 2x2 행렬 [[a,b],[c,d]]의 행렬식은 ad - bc입니다. 반대각선의 곱을 빼는 것을 잊거나 부호 실수를 했을 수 있습니다.",
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
    explanation: "역행렬을 구하려면 먼저 행렬식을 계산해야 합니다. det(A) = 0이면 역행렬이 존재하지 않습니다. 2x2 행렬의 경우, 대각 원소를 교환하고, 반대각 원소의 부호를 바꾼 후, 행렬식으로 나눕니다.",
    videoTitle: "역행렬 구하기",
    videoDuration: "4:20",
    summary: "역행렬 A^-1은 A x A^-1 = I를 만족합니다. 연립방정식 풀이와 변환에 사용됩니다.",
    prerequisites: ["행렬식", "단위행렬"],
    quiz: {
      question: "det(A) = 0일 때 역행렬은?",
      options: ["존재하지 않음", "단위행렬", "영행렬", "전치행렬"],
      answer: 0
    }
  },
  "6": {
    explanation: "여인수 전개는 큰 행렬의 행렬식을 작은 행렬들로 분해하여 계산하는 방법입니다. 각 원소에 해당 여인수(소행렬식 x 위치에 따른 부호)를 곱합니다.",
    videoTitle: "여인수 전개 방법",
    videoDuration: "5:10",
    summary: "여인수를 사용하면 어떤 크기의 행렬식도 재귀적으로 계산할 수 있습니다.",
    prerequisites: ["행렬식", "행렬 연산"],
    quiz: {
      question: "3x3 행렬의 여인수 전개 시 필요한 2x2 행렬식의 개수는?",
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
      question: "2x2 행렬의 고유값 개수는 최대?",
      options: ["2개", "1개", "4개", "무한개"],
      answer: 0
    }
  },
  "10": {
    explanation: "대각화는 행렬을 P^-1 AP = D 형태로 변환하는 것입니다. D는 대각행렬이고, P는 고유벡터로 구성됩니다. 모든 행렬이 대각화 가능한 것은 아닙니다.",
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

export function RemedyPanel({ selectedNode, onClose, aiContent, onMarkMastered }: RemedyPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showTrace, setShowTrace] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    setSelectedAnswer(null)
    setShowResult(false)
    setShowTrace(false)
  }, [selectedNode?.id])

  const isOpen = selectedNode !== null

  // AI 생성 콘텐츠 우선 사용, 없으면 하드코딩 fallback
  const staticContent = selectedNode ? (nodeContent[selectedNode.id] || defaultContent) : null
  const content = aiContent
    ? {
        explanation: aiContent.explanation,
        videoTitle: aiContent.microLearning.title,
        videoDuration: "3분",
        summary: aiContent.microLearning.summary,
        prerequisites: [],
        microLearningContent: aiContent.microLearning.content,
        quiz: {
          question: aiContent.microLearning.quiz.question,
          options: aiContent.microLearning.quiz.options,
          answer: aiContent.microLearning.quiz.answerIndex,
        },
        confidence: aiContent.confidence,
        traversalPath: aiContent.traversalPath,
      }
    : staticContent
      ? { ...staticContent, microLearningContent: undefined, confidence: undefined, traversalPath: undefined }
      : null

  // 클라이언트에서 한 번 더 Fisher-Yates 셔플 — 특히 하드코딩 fallback 대응
  // selectedNode.id가 바뀔 때마다 새로 셔플
  const shuffledQuiz = useMemo(() => {
    if (!content) return null
    const q = content.quiz
    const correctText = q.options[q.answer]
    const out = [...q.options]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return {
      question: q.question,
      options: out,
      answer: out.indexOf(correctText),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode?.id, !!aiContent])

  const handleAnswerClick = (idx: number) => {
    setSelectedAnswer(idx)
    setShowResult(true)
  }

  if (!isOpen || !content || !shuffledQuiz || !mounted) return null

  const isCorrect = selectedAnswer === shuffledQuiz.answer

  // 학습 완료 버튼 게이트 — 결손 노드는 퀴즈 정답 후에만 클릭 가능
  const isMissingNode = selectedNode.type === "missing"
  const quizPassed = showResult && isCorrect
  const canMarkComplete = !isMissingNode || quizPassed

  const markButtonText =
    isMissingNode && !quizPassed ? "퀴즈를 먼저 풀어주세요" :
    isMissingNode ? "이해 확인됨 · 학습 필요로 이동" :
    selectedNode.type === "mastered" ? "학습 미완료로 되돌리기" :
    "학습 완료로 표시"

  const panelContent = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border shrink-0">
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
          {/* AI Explanation - TODO: AI 연동 필요 */}
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

          {/* AI 분석 추적 (Harness trace) */}
          {aiContent?.agentTrace && aiContent.agentTrace.length > 0 && (() => {
            const trace = aiContent.agentTrace
            const proposerRounds = trace.filter((t) => t.role === "proposer").length
            const totalRounds = Math.max(proposerRounds, 1)
            const exitLabel: Record<ExitReason, { text: string; color: string }> = {
              confidence_high: { text: "높은 확신도로 종료", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
              verifier_agreed: { text: "Verifier 동의로 종료", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
              converged:       { text: "수렴 감지로 종료",    color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
              max_rounds:      { text: "Max 라운드 도달",     color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
            }
            const exit = aiContent.exitReason ? exitLabel[aiContent.exitReason] : null

            return (
            <div className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setShowTrace(!showTrace)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">AI 분석 과정</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showTrace && "rotate-180")} />
              </button>

              {/* 계측 배지 스트립 */}
              <div className="px-4 py-2.5 bg-muted/20 border-t border-border flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  <Bot className="h-2.5 w-2.5" />
                  에이전트 {trace.length}회
                </span>
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-400">
                  <RefreshCw className="h-2.5 w-2.5" />
                  {totalRounds}라운드
                </span>
                {(aiContent.verificationRounds ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    <Shield className="h-2.5 w-2.5" />
                    검증 {aiContent.verificationRounds}회
                  </span>
                )}
                {exit && (
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", exit.color)}>
                    {exit.text}
                  </span>
                )}
              </div>

              {showTrace && (
                <div className="p-4 space-y-3 bg-background">
                  {aiContent.agentTrace.map((entry, i) => {
                    if (entry.role === "proposer") {
                      return (
                        <div key={i} className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                              {entry.round === 1 ? (
                                <Bot className="h-3 w-3 text-white" />
                              ) : (
                                <RefreshCw className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                              Proposer · Round {entry.round}
                            </span>
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              확신도 <strong className="text-foreground">{Math.round(entry.confidence * 100)}%</strong>
                            </span>
                          </div>
                          <div className="pl-7 space-y-1">
                            <p className="text-xs">
                              <span className="text-muted-foreground">제안: </span>
                              <strong className="text-foreground">{entry.nodeLabel}</strong>
                              <span className="text-muted-foreground"> (ID: {entry.nodeId})</span>
                            </p>
                            <p className="text-xs text-foreground/70 leading-relaxed">{entry.reasoning}</p>
                            {entry.triggeredByCritique && (
                              <div className="mt-2 pt-2 border-t border-blue-500/10">
                                <p className="text-[10px] text-muted-foreground italic">
                                  ↑ 검증자의 피드백을 반영하여 재분석됨
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }
                    // verifier
                    return (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg border p-3 space-y-1.5",
                          entry.agree
                            ? "border-green-500/20 bg-green-500/5"
                            : "border-amber-500/20 bg-amber-500/5"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                              entry.agree ? "bg-green-500" : "bg-amber-500"
                            )}
                          >
                            <Shield className="h-3 w-3 text-white" />
                          </div>
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              entry.agree ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"
                            )}
                          >
                            Verifier · Round {entry.round}
                          </span>
                          <span
                            className={cn(
                              "ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                              entry.agree
                                ? "bg-green-500/15 text-green-700 dark:text-green-400"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            )}
                          >
                            {entry.agree ? "✓ 동의" : "✗ 반박"}
                          </span>
                        </div>
                        {entry.critique && (
                          <p className="pl-7 text-xs text-foreground/70 leading-relaxed">{entry.critique}</p>
                        )}
                        {entry.suggestedNodeId && !entry.agree && (
                          <p className="pl-7 text-[10px] text-muted-foreground">
                            대안 노드 ID: <code className="text-foreground">{entry.suggestedNodeId}</code>
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            )
          })()}

          {/* 3-Minute Micro-Learning */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                3분 마이크로 러닝
              </h3>
              {content.confidence !== undefined && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  content.confidence >= 0.8
                    ? "bg-primary/10 text-primary"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                )}>
                  {content.confidence >= 0.8 ? `신뢰도 ${Math.round(content.confidence * 100)}%` : "AI 추정됨"}
                </span>
              )}
            </div>
            {content.microLearningContent ? (
              <div className="rounded-xl bg-gradient-to-br from-primary/5 to-background border border-border p-4">
                <p className="text-sm font-medium text-foreground mb-2">{content.videoTitle}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{content.microLearningContent}</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-background border border-border aspect-video group cursor-pointer hover:shadow-lg transition-shadow">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-primary-foreground ml-1" />
                  </div>
                  <p className="text-sm font-medium text-foreground mt-3">{content.videoTitle}</p>
                  <p className="text-xs text-muted-foreground">{content.videoDuration}</p>
                </div>
              </div>
            )}
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
          <div className={cn(
            "rounded-xl border p-4 transition-colors",
            isMissingNode && !quizPassed && "border-amber-500/30 bg-amber-500/5",
            !(isMissingNode && !quizPassed) && "border-border bg-muted/30"
          )}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">확인 퀴즈</h3>
              {isMissingNode && (
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                  quizPassed
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                )}>
                  {quizPassed ? "✓ 통과" : "필수"}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground mb-3">{shuffledQuiz.question}</p>
            <div className="space-y-2">
              {shuffledQuiz.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerClick(idx)}
                  disabled={showResult}
                  className={cn(
                    "w-full text-left text-sm px-4 py-2.5 rounded-lg border transition-colors",
                    showResult && idx === shuffledQuiz.answer && "bg-green-100 border-green-500 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-300",
                    showResult && selectedAnswer === idx && idx !== shuffledQuiz.answer && "bg-red-100 border-red-500 text-red-800 dark:bg-red-950 dark:border-red-700 dark:text-red-300",
                    !showResult && "border-border bg-card hover:bg-primary/5 hover:border-primary/30"
                  )}
                >
                  <span className="text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + idx)}.</span>
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
          <Button
            disabled={!canMarkComplete}
            className={cn(
              "w-full h-11 font-medium transition-all",
              canMarkComplete
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
            )}
            onClick={() => canMarkComplete && onMarkMastered && selectedNode && onMarkMastered(selectedNode.id)}
          >
            {!canMarkComplete && <Lock className="h-4 w-4 mr-2" />}
            {markButtonText}
            {canMarkComplete && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(panelContent, document.body)
}
