"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { X, Lightbulb, Play, BookOpen, ArrowRight, CheckCircle, AlertCircle, Target, GraduationCap, Bot, Shield, RefreshCw, ChevronDown, Lock, Pencil, Save, Video, Link2, Plus, Trash2, ExternalLink, ShieldAlert, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AgentTraceEntry, ExitReason } from "@/app/api/analyze-error/route"
import { saveQuizAttempt, getNodeQuizStats, getNodeComments, addNodeComment, hideItemForRole, filterByRole, sendNotification, getCustomQuizzes, addCustomQuiz, getUserRole, type NodeComment, type CustomQuiz } from "@/lib/graph-store"

// ── URL 안전 검증 + YouTube 썸네일 ──

const ALLOWED_DOMAINS = [
  "youtube.com", "youtu.be", "vimeo.com",
  "docs.google.com", "drive.google.com", "notion.so",
  "github.com", "naver.com", "tistory.com", "khan.org",
  "wikipedia.org", "ko.wikipedia.org",
]

function isUrlSafe(url: string): { safe: boolean; domain: string } {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { safe: false, domain: parsed.hostname }
    const domain = parsed.hostname.replace(/^www\./, "")
    const allowed = ALLOWED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))
    return { safe: allowed, domain }
  } catch {
    return { safe: false, domain: "invalid" }
  }
}

function getYoutubeThumbnail(url: string): string | null {
  try {
    const parsed = new URL(url)
    let videoId: string | null = null
    if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v")
    } else if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1)
    }
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null
  } catch {
    return null
  }
}

function SafeLink({ url, children, className }: { url: string; children: React.ReactNode; className?: string }) {
  const { safe, domain } = isUrlSafe(url)
  const thumb = getYoutubeThumbnail(url)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!safe) {
      if (!confirm(`⚠ 신뢰할 수 없는 외부 링크입니다.\n\n도메인: ${domain}\nURL: ${url}\n\n이동하시겠습니까?`)) return
    } else {
      if (!confirm(`외부 링크로 이동합니다.\n\n${domain}\n\n이동하시겠습니까?`)) return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="space-y-1.5">
      {thumb && (
        <button onClick={handleClick} className="w-full rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-colors">
          <img src={thumb} alt="영상 썸네일" className="w-full h-auto" />
        </button>
      )}
      <button onClick={handleClick} className={cn("flex items-center gap-2 text-xs hover:underline", className)}>
        {children}
        {!safe && <ShieldAlert className="h-3 w-3 text-amber-500" />}
        <ExternalLink className="h-2.5 w-2.5 opacity-50" />
      </button>
    </div>
  )
}

export interface SelectedNode {
  id: string
  label: string
  type: "standard" | "mastered" | "missing" | "affected"
  description: string
  content?: string
  videoUrl?: string
  attachments?: string[]
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

export interface NodeContentUpdate {
  nodeId: string
  description?: string
  content?: string
  videoUrl?: string
  attachments?: string[]
}

interface RemedyPanelProps {
  selectedNode: SelectedNode | null
  onClose: () => void
  aiContent?: AiRemedyContent | null
  onMarkMastered?: (nodeId: string) => void
  onUpdateNode?: (update: NodeContentUpdate) => void
  graphId?: string           // 퀴즈 기록 저장용
  isTeacherMode?: boolean    // 교수 모드 — 코멘트 작성 가능
  teacherName?: string       // 교수 이름 (코멘트용)
  commentsVersion?: number   // 외부에서 코멘트 변경 시 갱신 트리거
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

export function RemedyPanel({ selectedNode, onClose, aiContent, onMarkMastered, onUpdateNode, graphId, isTeacherMode, teacherName, commentsVersion }: RemedyPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showTrace, setShowTrace] = useState(false)

  // 노드 콘텐츠 편집 모드
  const [isEditing, setIsEditing] = useState(false)
  const [editDesc, setEditDesc] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editVideoUrl, setEditVideoUrl] = useState("")
  const [editAttachments, setEditAttachments] = useState<string[]>([])
  const [newAttachment, setNewAttachment] = useState("")

  // 코멘트
  const [comments, setComments] = useState<NodeComment[]>([])
  const [commentInput, setCommentInput] = useState("")

  // 교수 퀴즈 제작
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([])
  const [showQuizForm, setShowQuizForm] = useState(false)
  const [qQuestion, setQQuestion] = useState("")
  const [qOptions, setQOptions] = useState(["", "", "", ""])
  const [qAnswer, setQAnswer] = useState(0)

  // AI 퀴즈 생성
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    setSelectedAnswer(null)
    setShowResult(false)
    setShowTrace(false)
    setIsEditing(false)
    setCommentInput("")
    if (selectedNode) {
      setEditDesc(selectedNode.description)
      setEditContent(selectedNode.content ?? "")
      setEditVideoUrl(selectedNode.videoUrl ?? "")
      setEditAttachments(selectedNode.attachments ?? [])
    }
    if (graphId && selectedNode) {
      const role = isTeacherMode ? "teacher" as const : "student" as const
      setComments(filterByRole(getNodeComments(graphId, selectedNode.id), role))
      setCustomQuizzes(getCustomQuizzes(graphId, selectedNode.id))
    }
    setShowQuizForm(false)
    setQQuestion("")
    setQOptions(["", "", "", ""])
    setQAnswer(0)
  }, [selectedNode?.id, graphId, commentsVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateAiQuiz = async () => {
    if (!graphId || !selectedNode || isGeneratingQuiz) return
    setIsGeneratingQuiz(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `"${selectedNode.label}" 개념에 대한 확인 퀴즈를 만들어주세요. 반드시 다음 형식으로만 답변하세요:\n문제: (문제 텍스트)\nA. (선택지)\nB. (선택지)\nC. (선택지)\nD. (선택지)\n정답: (A/B/C/D)\n\n개념 설명: ${selectedNode.description}`,
          }],
          domain: selectedNode.label,
          nodes: [],
          mode: "quiz",
        }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
      }
      // 파싱: 문제, A-D 선택지, 정답
      const qMatch = text.match(/문제[:：]\s*([\s\S]+?)(?=\n[A-D])/)
      const optMatches = [...text.matchAll(/([A-D])[\.\)]\s*(.+)/g)]
      const ansMatch = text.match(/정답[:：]\s*([A-D])/)
      if (qMatch && optMatches.length >= 4 && ansMatch) {
        const question = qMatch[1].trim()
        const options = optMatches.slice(0, 4).map((m) => m[2].trim())
        const answerIndex = ansMatch[1].charCodeAt(0) - 65
        const quiz = addCustomQuiz({
          graphId,
          nodeId: selectedNode.id,
          nodeLabel: selectedNode.label,
          question,
          options,
          answerIndex,
          createdBy: "AI 자동 생성",
        })
        setCustomQuizzes((prev) => [quiz, ...prev])
      }
    } catch { /* 실패 시 조용히 */ }
    finally { setIsGeneratingQuiz(false) }
  }

  const handleCreateQuiz = () => {
    if (!qQuestion.trim() || !graphId || !selectedNode) return
    if (qOptions.some((o) => !o.trim())) return
    const quiz = addCustomQuiz({
      graphId,
      nodeId: selectedNode.id,
      nodeLabel: selectedNode.label,
      question: qQuestion.trim(),
      options: qOptions.map((o) => o.trim()),
      answerIndex: qAnswer,
      createdBy: teacherName ?? "교수",
    })
    setCustomQuizzes((prev) => [quiz, ...prev])
    setShowQuizForm(false)
    setQQuestion("")
    setQOptions(["", "", "", ""])
    setQAnswer(0)
    sendNotification({
      kind: "message",
      title: `${selectedNode.label}에 새 퀴즈가 추가되었습니다`,
      body: qQuestion.trim().slice(0, 80),
      fromName: teacherName,
      graphId,
    })
  }

  const handleAddComment = () => {
    if (!commentInput.trim() || !graphId || !selectedNode) return
    const authorRole = isTeacherMode ? "teacher" as const : "student" as const
    const authorName = isTeacherMode && teacherName ? teacherName : "학생"
    const comment = addNodeComment({
      nodeId: selectedNode.id,
      graphId,
      authorName,
      authorRole,
      text: commentInput.trim(),
    })
    setComments((prev) => [comment, ...prev])
    setCommentInput("")
    // 교수 → 학생 알림
    if (isTeacherMode) {
      sendNotification({
        kind: "message",
        title: `${selectedNode.label}에 교수 피드백`,
        body: commentInput.trim().slice(0, 100),
        fromName: teacherName,
        graphId,
      })
    }
    // 학생 → 교수 답변 알림
    if (!isTeacherMode) {
      sendNotification({
        kind: "message",
        title: `학생이 ${selectedNode.label}에 답변했습니다`,
        body: commentInput.trim().slice(0, 100),
        fromName: "학생",
        graphId,
      })
    }
  }

  const handleSaveEdit = () => {
    if (!selectedNode || !onUpdateNode) return
    onUpdateNode({
      nodeId: selectedNode.id,
      description: editDesc,
      content: editContent || undefined,
      videoUrl: editVideoUrl || undefined,
      attachments: editAttachments.length > 0 ? editAttachments : undefined,
    })
    setIsEditing(false)
  }

  const handleAddAttachment = () => {
    if (!newAttachment.trim()) return
    setEditAttachments((prev) => [...prev, newAttachment.trim()])
    setNewAttachment("")
  }

  const isOpen = selectedNode !== null

  // AI 생성 콘텐츠 우선 사용, 없으면 하드코딩 fallback
  const staticContent = selectedNode ? (nodeContent[selectedNode.id] || defaultContent) : null
  const content = aiContent
    ? {
        explanation: aiContent.explanation,
        videoTitle: aiContent.microLearning?.title ?? "",
        videoDuration: "3분",
        summary: aiContent.microLearning?.summary ?? "",
        prerequisites: [],
        microLearningContent: aiContent.microLearning?.content,
        quiz: aiContent.microLearning?.quiz
          ? {
              question: aiContent.microLearning.quiz.question ?? "확인 퀴즈",
              options: aiContent.microLearning.quiz.options ?? ["A", "B", "C", "D"],
              answer: aiContent.microLearning.quiz.answerIndex ?? 0,
            }
          : staticContent?.quiz ?? { question: "확인 퀴즈", options: ["A", "B", "C", "D"], answer: 0 },
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
    if (!q?.options?.length || !q.question) return null
    const clampedAnswer = Math.max(0, Math.min(q.answer, q.options.length - 1))
    const correctText = q.options[clampedAnswer]
    const out = [...q.options]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    const newIdx = out.indexOf(correctText)
    return {
      question: q.question,
      options: out,
      answer: newIdx >= 0 ? newIdx : 0,   // fallback to 0 if somehow not found
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode?.id, !!aiContent])

  const handleAnswerClick = (idx: number) => {
    setSelectedAnswer(idx)
    setShowResult(true)
    // 퀴즈 기록 저장
    if (graphId && selectedNode && shuffledQuiz) {
      saveQuizAttempt({
        graphId,
        nodeId: selectedNode.id,
        nodeLabel: selectedNode.label,
        question: shuffledQuiz.question,
        options: shuffledQuiz.options,
        selectedAnswer: idx,
        correctAnswer: shuffledQuiz.answer,
        isCorrect: idx === shuffledQuiz.answer,
      })
    }
  }

  const handleRetryQuiz = () => {
    setSelectedAnswer(null)
    setShowResult(false)
  }

  if (!isOpen || !content || !shuffledQuiz || !mounted) return null

  const isCorrect = selectedAnswer === shuffledQuiz.answer
  const quizStats = graphId && selectedNode
    ? getNodeQuizStats(graphId, selectedNode.id)
    : null

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
            <div className="flex items-center gap-1 shrink-0">
              {onUpdateNode && !isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"
                  onClick={() => setIsEditing(true)}
                  title="노드 콘텐츠 편집"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* 노드 콘텐츠 편집 모드 */}
          {isEditing && (
            <div className="space-y-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/[0.03]">
              <div className="flex items-center gap-2 mb-1">
                <Pencil className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">콘텐츠 편집</p>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-foreground block mb-1">개념 설명</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-foreground block mb-1">학습 노트</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  placeholder="추가 학습 자료, 핵심 공식, 참고 내용 등을 자유롭게 입력하세요..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-foreground block mb-1 flex items-center gap-1">
                  <Video className="h-3 w-3" /> 강의 영상 URL
                </label>
                <input
                  type="url"
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-foreground block mb-1 flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> 참고 자료 링크
                </label>
                <div className="space-y-1.5 mb-2">
                  {editAttachments.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 border border-border rounded-lg px-2.5 py-1.5">
                      <span className="flex-1 truncate text-foreground">{url}</span>
                      <button onClick={() => setEditAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={newAttachment}
                    onChange={(e) => setNewAttachment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAttachment()}
                    placeholder="https://..."
                    className="flex-1 px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  />
                  <button
                    onClick={handleAddAttachment}
                    disabled={!newAttachment.trim()}
                    className="h-7 px-2.5 rounded-lg bg-muted border border-border text-xs text-foreground hover:bg-muted/80 disabled:opacity-40 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> 추가
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 h-8 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                >
                  <Save className="h-3 w-3" />
                  저장
                </button>
              </div>
            </div>
          )}

          {/* 저장된 학습 노트 / 영상 / 자료 표시 (비편집 모드) */}
          {!isEditing && (selectedNode.content || selectedNode.videoUrl || (selectedNode.attachments?.length ?? 0) > 0) && (
            <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> 학습 자료
              </p>
              {selectedNode.content && (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{selectedNode.content}</p>
              )}
              {selectedNode.videoUrl && (
                <SafeLink url={selectedNode.videoUrl} className="text-primary">
                  <Video className="h-3.5 w-3.5" />
                  강의 영상 열기
                </SafeLink>
              )}
              {selectedNode.attachments?.map((url, i) => (
                <SafeLink key={i} url={url} className="text-primary">
                  <Link2 className="h-3 w-3" />
                  {url}
                </SafeLink>
              ))}
            </div>
          )}
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

          {/* AI 신뢰도 + 요약 */}
          {content.confidence !== undefined && (
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs px-2.5 py-1 rounded-full font-medium",
                content.confidence >= 0.8
                  ? "bg-primary/10 text-primary"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              )}>
                {content.confidence >= 0.8 ? `신뢰도 ${Math.round(content.confidence * 100)}%` : "AI 추정됨"}
              </span>
            </div>
          )}
          {content.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed">{content.summary}</p>
          )}

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

          {/* 코멘트 / 피드백 */}
          {graphId && (comments.length > 0 || isTeacherMode) && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                💬 {isTeacherMode ? "학생에게 피드백" : "교수 피드백"}
                {comments.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono ml-1">{comments.length}</span>
                )}
              </h3>

              {/* 코멘트 목록 */}
              {comments.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs leading-relaxed group/comment relative",
                        c.authorRole === "teacher"
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted border border-border"
                      )}
                    >
                      <button
                        onClick={() => {
                          if (confirm("이 피드백을 숨기시겠습니까? (상대방에겐 유지됩니다)")) {
                            const role = isTeacherMode ? "teacher" as const : "student" as const
                            hideItemForRole(c.id, role)
                            setComments((prev) => prev.filter((x) => x.id !== c.id))
                          }
                        }}
                        className="absolute top-1.5 right-1.5 p-0.5 rounded text-transparent group-hover/comment:text-destructive/60 hover:!text-destructive transition-colors"
                        title="숨기기"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                      <div className="flex items-center gap-1.5 mb-1 pr-4">
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                          c.authorRole === "teacher"
                            ? "bg-primary/20 text-primary"
                            : "bg-muted-foreground/10 text-muted-foreground"
                        )}>
                          {c.authorRole === "teacher" ? "교수" : "학생"}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{c.authorName}</span>
                        <span className="text-[9px] text-muted-foreground/50 ml-auto">
                          {new Date(c.timestamp).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-foreground">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 입력 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder={isTeacherMode ? "학생에게 피드백 남기기..." : "코멘트 남기기..."}
                  className="flex-1 px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentInput.trim()}
                  className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  전송
                </button>
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
              <div className="mt-3 space-y-2">
                <p className={cn("text-sm font-medium", isCorrect ? "text-green-600" : "text-red-600")}>
                  {isCorrect ? "정답입니다!" : "틀렸습니다. 다시 복습해보세요."}
                </p>
                <button
                  onClick={handleRetryQuiz}
                  className="text-[10px] text-primary hover:underline font-medium flex items-center gap-1"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  다시 풀기
                </button>
              </div>
            )}

            {/* 퀴즈 통계 */}
            {quizStats && quizStats.total > 0 && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>이 개념 퀴즈:</span>
                <span className="text-green-600 font-semibold">{quizStats.correct}맞춤</span>
                <span className="text-red-500 font-semibold">{quizStats.wrong}틀림</span>
                <span className="text-foreground font-mono">({quizStats.total}회)</span>
              </div>
            )}
          </div>

          {/* AI 퀴즈 자동 생성 버튼 — 커스텀 퀴즈가 없을 때 */}
          {graphId && customQuizzes.length === 0 && !aiContent && (
            <button
              onClick={handleGenerateAiQuiz}
              disabled={isGeneratingQuiz}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-amber-500/30 text-amber-600 text-xs font-medium hover:bg-amber-500/5 transition-colors disabled:opacity-50"
            >
              {isGeneratingQuiz ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                  퀴즈 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  이 개념에 맞는 AI 퀴즈 생성
                </>
              )}
            </button>
          )}

          {/* 교수 제작 퀴즈 목록 (학생에게도 보임) */}
          {customQuizzes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                교수 출제 퀴즈 ({customQuizzes.length})
              </p>
              {customQuizzes.map((cq) => (
                <div key={cq.id} className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">{cq.question}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {cq.options.map((opt, i) => (
                      <div
                        key={i}
                        className={cn(
                          "text-[10px] px-2 py-1.5 rounded-lg border",
                          i === cq.answerIndex
                            ? "border-green-500/40 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 font-semibold"
                            : "border-border bg-muted/20 text-muted-foreground"
                        )}
                      >
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground">출제: {cq.createdBy}</p>
                </div>
              ))}
            </div>
          )}

          {/* 교수 퀴즈 제작 폼 (teacher mode only) */}
          {isTeacherMode && graphId && (
            <div>
              {!showQuizForm ? (
                <button
                  onClick={() => setShowQuizForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-primary/30 text-primary text-xs font-medium hover:bg-primary/5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  이 개념에 퀴즈 추가
                </button>
              ) : (
                <div className="rounded-xl border-2 border-primary/30 bg-primary/[0.03] p-4 space-y-3">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">퀴즈 제작</p>
                  <input
                    type="text"
                    value={qQuestion}
                    onChange={(e) => setQQuestion(e.target.value)}
                    placeholder="문제를 입력하세요"
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  />
                  {qOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        onClick={() => setQAnswer(i)}
                        className={cn(
                          "w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 border-2 transition-colors",
                          i === qAnswer
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-border text-muted-foreground hover:border-primary"
                        )}
                      >
                        {String.fromCharCode(65 + i)}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...qOptions]
                          next[i] = e.target.value
                          setQOptions(next)
                        }}
                        placeholder={`선택지 ${String.fromCharCode(65 + i)}`}
                        className="flex-1 px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                      />
                    </div>
                  ))}
                  <p className="text-[9px] text-muted-foreground">녹색 원 = 정답. 클릭하여 변경.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setShowQuizForm(false)}
                      className="flex-1 h-8 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleCreateQuiz}
                      disabled={!qQuestion.trim() || qOptions.some((o) => !o.trim())}
                      className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
                    >
                      퀴즈 저장
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
