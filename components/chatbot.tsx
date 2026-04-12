"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle, X, Send, BookOpen, HelpCircle, ChevronDown, History, AlertTriangle, ImagePlus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { KnowledgeNode } from "@/components/knowledge-graph-canvas"
import type { ChatMessage } from "@/app/api/chat/route"

interface ChatbotProps {
  graphNodes: KnowledgeNode[]
  graphDomain: string
}

interface ChatLog {
  id: string
  mode: "question" | "quiz" | "recommend"
  messages: ChatMessage[]
  timestamp: Date
  preview: string
}

const WELCOME: Record<"question" | "quiz" | "recommend", string> = {
  question: "안녕하세요! 그래프에 있는 개념에 대해 뭐든 물어보세요.",
  quiz: "문제풀이 모드입니다. 개념을 연습할 문제를 출제해드릴게요. 준비되셨나요?",
  recommend: "자료를 기반으로 추가할 개념 노드를 추천해드립니다. 이미지나 텍스트를 보내주세요.",
}

const MAX_LOGS = 5

function formatTime(date: Date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
}

export function Chatbot({ graphNodes, graphDomain }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<"question" | "quiz" | "recommend">("question")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [logs, setLogs] = useState<ChatLog[]>([])
  const [showLogSidebar, setShowLogSidebar] = useState(false)
  const [chatImage, setChatImage] = useState<File | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const chatFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  const saveToLog = useCallback((currentMode: "question" | "quiz" | "recommend" = mode, currentMessages: ChatMessage[] = messages) => {
    if (currentMessages.length === 0) return
    const firstUserMsg = currentMessages.find((m) => m.role === "user")
    if (!firstUserMsg) return

    const newLog: ChatLog = {
      id: Date.now().toString(),
      mode: currentMode,
      messages: currentMessages,
      timestamp: new Date(),
      preview: firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? "…" : ""),
    }

    setLogs((prev) => {
      const updated = [newLog, ...prev]
      return updated.slice(0, MAX_LOGS)
    })
  }, [])

  const handleModeSwitch = useCallback((newMode: "question" | "quiz" | "recommend") => {
    if (newMode === mode) return
    saveToLog(mode, messages)
    setMode(newMode)
    setMessages([])
  }, [mode, messages, saveToLog])

  const handleRestoreLog = useCallback((log: ChatLog) => {
    saveToLog(mode, messages)
    setMode(log.mode)
    setMessages(log.messages)
    setLogs((prev) => prev.filter((l) => l.id !== log.id))
    setShowLogSidebar(false)
  }, [mode, messages, saveToLog])

  const handleSend = useCallback(async () => {
    const hasText = input.trim().length > 0
    const hasImage = !!chatImage
    if ((!hasText && !hasImage) || isStreaming) return

    const msgText = hasText
      ? input.trim()
      : mode === "recommend"
        ? `[이미지 첨부] 이 자료를 분석해서 추가할 개념 노드를 추천해주세요.`
        : `[이미지 첨부]`
    const userMsg: ChatMessage = { role: "user", content: msgText }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsStreaming(true)

    // 이미지 → base64
    let imageBase64: string | undefined
    let imageMimeType: string | undefined
    if (chatImage) {
      imageMimeType = chatImage.type
      const buf = await chatImage.arrayBuffer()
      imageBase64 = btoa(new Uint8Array(buf).reduce((d, b) => d + String.fromCharCode(b), ""))
      setChatImage(null)
    }

    const allMessages = [...messages, userMsg]
    const assistantMsg: ChatMessage = { role: "assistant", content: "" }
    setMessages((prev) => [...prev, assistantMsg])

    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          domain: graphDomain,
          nodes: graphNodes.map((n) => ({ label: n.label, description: n.description })),
          mode,
          ...(imageBase64 ? { imageBase64, imageMimeType } : {}),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error("chat API error")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: accumulated },
        ])
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "죄송해요, 오류가 발생했어요. 다시 시도해주세요." },
        ])
      }
    } finally {
      setIsStreaming(false)
    }
  }, [input, chatImage, isStreaming, messages, graphDomain, graphNodes, mode])

  const handleClose = () => {
    abortRef.current?.abort()
    setIsOpen(false)
    setShowLogSidebar(false)
  }

  const atLogLimit = logs.length === MAX_LOGS

  return (
    <>
      {/* 플로팅 버튼 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* 전체 컨테이너: 로그 사이드바 + 채팅 패널 */}
      <div className={cn(
        "fixed bottom-6 right-6 z-40 flex items-end gap-2 transition-all duration-300 origin-bottom-right",
        isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
      )}>

        {/* 로그 사이드바 */}
        <div className={cn(
          "bg-card border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right overflow-hidden",
          showLogSidebar ? "w-52 opacity-100" : "w-0 opacity-0 pointer-events-none border-0"
        )}
          style={{ maxHeight: "480px" }}
        >
          <div className="px-3 py-2.5 border-b border-border shrink-0">
            <p className="text-xs font-semibold text-foreground">대화 로그</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">클릭하면 복원됩니다</p>
          </div>

          <div className="flex-1 overflow-auto min-h-0 p-2 space-y-1.5">
            {logs.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-4">
                저장된 로그가 없어요
              </p>
            ) : (
              <>
                {atLogLimit && (
                  <div className="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5 mb-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-snug">
                      다음 로그는 지워질 예정입니다!
                    </p>
                  </div>
                )}
                {logs.map((log, i) => (
                  <button
                    key={log.id}
                    onClick={() => handleRestoreLog(log)}
                    className={cn(
                      "w-full text-left px-2.5 py-2 rounded-xl border transition-colors hover:bg-muted/60 space-y-1",
                      atLogLimit && i === logs.length - 1
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-background"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
                        log.mode === "quiz"
                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                          : "bg-primary/15 text-primary"
                      )}>
                        {log.mode === "quiz" ? "문제풀이" : "질문"}
                      </span>
                      <span className="text-[9px] text-muted-foreground ml-auto">{formatTime(log.timestamp)}</span>
                    </div>
                    <p className="text-[10px] text-foreground leading-snug line-clamp-2">{log.preview}</p>
                    <p className="text-[9px] text-muted-foreground">{log.messages.length}개 메시지</p>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 채팅 패널 */}
        <div className="w-80 bg-card border border-border rounded-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: "480px" }}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            {/* 모드 토글 */}
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              <button
                onClick={() => handleModeSwitch("question")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  mode === "question" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <HelpCircle className="h-3 w-3" />
                질문
              </button>
              <button
                onClick={() => handleModeSwitch("quiz")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  mode === "quiz" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BookOpen className="h-3 w-3" />
                문제풀이
              </button>
              <button
                onClick={() => handleModeSwitch("recommend")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  mode === "recommend" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="h-3 w-3" />
                노드 추천
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* 로그 토글 */}
              <button
                onClick={() => setShowLogSidebar((v) => !v)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors relative",
                  showLogSidebar
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-muted-foreground"
                )}
                title="대화 로그"
              >
                <History className="h-4 w-4" />
                {logs.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                    {logs.length}
                  </span>
                )}
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-auto p-3 space-y-2 min-h-0">
            {/* 웰컴 메시지 */}
            <div className="flex justify-start">
              <div className="bg-muted text-foreground text-xs px-3 py-2 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed">
                {WELCOME[mode]}
              </div>
            </div>

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "text-xs px-3 py-2 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                )}>
                  {msg.content}
                  {/* 스트리밍 커서 */}
                  {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                    <span className="inline-block w-0.5 h-3 bg-current ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            ))}

            {/* 빈 assistant 버블 로딩 */}
            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground text-xs px-3 py-2 rounded-2xl rounded-tl-sm flex gap-1">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce [animation-delay:0.1s]">·</span>
                  <span className="animate-bounce [animation-delay:0.2s]">·</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="px-3 pb-3 pt-2 border-t border-border shrink-0 space-y-2">
            {/* 이미지 프리뷰 */}
            {chatImage && (
              <div className="relative rounded-lg border border-primary/30 overflow-hidden">
                <img src={URL.createObjectURL(chatImage)} alt="" className="w-full max-h-24 object-contain bg-muted/30" />
                <button
                  onClick={() => setChatImage(null)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-card/90 border border-border flex items-center justify-center text-muted-foreground hover:text-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )}

            <input
              ref={chatFileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f && f.size <= 10 * 1024 * 1024) setChatImage(f)
                e.target.value = ""
              }}
            />

            <div
              className="flex gap-1.5"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f && f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024) setChatImage(f)
              }}
            >
              <button
                onClick={() => chatFileRef.current?.click()}
                disabled={isStreaming}
                className="h-8 w-8 shrink-0 rounded-xl border border-border bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                title="이미지/자료 첨부 (드래그도 가능)"
              >
                <ImagePlus className="h-3.5 w-3.5" />
              </button>
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  mode === "recommend" ? "자료 설명 또는 이미지 첨부..." :
                  mode === "question" ? "질문을 입력하세요..." : "답변을 입력하세요..."
                }
                className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                disabled={isStreaming}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0 rounded-xl"
                onClick={handleSend}
                disabled={(!input.trim() && !chatImage) || isStreaming}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* 모드: 노드 추천 토글 */}
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => { if (mode !== "recommend") { saveToLog(); setMode("recommend"); setMessages([]) } else { saveToLog(); setMode("question"); setMessages([]) } }}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-1",
                  mode === "recommend"
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground/50 hover:text-primary"
                )}
              >
                <Sparkles className="h-2.5 w-2.5" />
                노드 추천
              </button>
              <span className="text-[9px] text-muted-foreground/30">·</span>
              <p className="text-[10px] text-muted-foreground/50">
                {graphDomain}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
