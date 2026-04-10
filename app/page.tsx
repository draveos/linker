"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { BrainCircuit, ArrowRight, Network, Zap, GraduationCap, ChevronDown, Play } from "lucide-react"
import { cn } from "@/lib/utils"

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

const features = [
  {
    icon: Network,
    title: "지식 그래프",
    desc: "개념 간의 연결을 시각화합니다. 무엇을 알고 무엇이 부족한지 한눈에 파악하세요.",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  {
    icon: Zap,
    title: "AI 근본 원인 분석",
    desc: "오답의 근본 원인을 추적합니다. 표면적 실수가 아닌 핵심 결손 개념을 찾아냅니다.",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  {
    icon: GraduationCap,
    title: "마이크로 러닝",
    desc: "결손 개념을 3분 안에 복습합니다. 퀴즈와 설명으로 빠르게 이해를 다집니다.",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
]

const gallery = [
  { label: "선형대수학", nodes: 10, mastery: 30, color: "from-blue-500 to-indigo-600" },
  { label: "미적분학 기초", nodes: 6, mastery: 17, color: "from-emerald-500 to-teal-600" },
  { label: "알고리즘", nodes: 8, mastery: 62, color: "from-orange-500 to-amber-600" },
  { label: "확률통계", nodes: 9, mastery: 44, color: "from-purple-500 to-violet-600" },
]

export default function LandingPage() {
  const hero = useReveal()
  const featRef = useReveal()
  const galleryRef = useReveal()
  const ctaRef = useReveal()

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg shadow-md shadow-primary/20">
              <BrainCircuit className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Linker</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div
          ref={hero.ref}
          className={cn(
            "relative z-10 transition-all duration-700",
            hero.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-8">
            <Zap className="h-3.5 w-3.5" />
            AI 기반 학습 격차 분석
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            오답의 <span className="text-primary">근본 원인</span>을<br />찾아드립니다.
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            Linker는 AI 지식 그래프로 학생의 오답을 분석하고,<br className="hidden sm:block" />
            표면적 실수가 아닌 결손 개념을 정확히 추적합니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/signup"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-2xl font-semibold text-base hover:bg-primary/90 shadow-xl shadow-primary/30 transition-all hover:scale-105"
            >
              지금 시작하기 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 border border-border px-7 py-3.5 rounded-2xl font-medium text-base hover:bg-muted transition-colors"
            >
              데모 보기
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground animate-bounce">
          <span className="text-xs">스크롤</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </section>

      {/* ── Video / App preview ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-border shadow-2xl bg-muted aspect-video group cursor-pointer">
            {/* Placeholder — 실제 영상으로 교체 예정 */}
            <video
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              poster=""
            >
              {/* <source src="/demo.mp4" type="video/mp4" /> */}
            </video>

            {/* Overlay — 영상 없을 때 보임 */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-600/20 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
              <p className="text-white/80 text-sm mt-4 font-medium">데모 영상 (준비 중)</p>
            </div>

            {/* Floating badge */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium">
              LIVE DEMO
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div
            ref={featRef.ref}
            className={cn(
              "text-center mb-14 transition-all duration-700",
              featRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              어떻게 작동하나요?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">
              세 단계로 학습 격차를 분석하고 정확한 복습을 제공합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className={cn(
                    "bg-card border border-border rounded-2xl p-7 transition-all duration-700",
                    featRef.visible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8",
                  )}
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center mb-5", f.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Gallery — graph preview cards ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div
            ref={galleryRef.ref}
            className={cn(
              "text-center mb-14 transition-all duration-700",
              galleryRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              다양한 과목 지원
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">
              수학, 과학, 공학 전 과목에 걸쳐 개인화 지식 그래프를 생성합니다.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {gallery.map((g, i) => (
              <div
                key={g.label}
                className={cn(
                  "rounded-2xl p-6 bg-gradient-to-br text-white transition-all duration-700 hover:-translate-y-1 hover:shadow-xl",
                  g.color,
                  galleryRef.visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                )}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <p className="text-white/70 text-xs font-medium mb-1">{g.nodes}개 개념</p>
                <h4 className="font-bold text-base leading-tight mb-4">{g.label}</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-white/70">
                    <span>숙련도</span><span>{g.mastery}%</span>
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/70 rounded-full transition-all duration-1000"
                      style={{ width: galleryRef.visible ? `${g.mastery}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary to-primary/70">
        <div
          ref={ctaRef.ref}
          className={cn(
            "max-w-2xl mx-auto text-center transition-all duration-700",
            ctaRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <h2 className="text-4xl font-extrabold text-primary-foreground tracking-tight mb-4">
            지금 시작하세요
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-10">
            무료로 가입하고 AI 지식 그래프 학습을 경험하세요.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-2xl font-bold text-base hover:bg-white/90 shadow-2xl transition-all hover:scale-105"
          >
            무료로 시작하기 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-primary rounded-md">
              <BrainCircuit className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground">Linker</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 Linker. AI-Powered Knowledge Graph Learning.
          </p>
        </div>
      </footer>
    </div>
  )
}
