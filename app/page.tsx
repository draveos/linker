"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { BrainCircuit, ArrowRight, Play, Grid3x3, Brain, BookOpen, Sparkles, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Reveal on scroll hook ──
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

// ── Scroll-based roadmap progress hook ──
function useRoadmapProgress(itemCount: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [activeNodes, setActiveNodes] = useState<boolean[]>(new Array(itemCount).fill(false))
  const [fadingNodes, setFadingNodes] = useState<boolean[]>(new Array(itemCount).fill(false))
  const prevActiveRef = useRef<boolean[]>(new Array(itemCount).fill(false))

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight

      // Calculate how much of the section is visible
      const sectionTop = rect.top
      const sectionHeight = rect.height

      // Start when section enters viewport, complete when it's about to leave
      const scrollProgress = Math.max(0, Math.min(1,
          (windowHeight * 0.6 - sectionTop) / (sectionHeight * 0.8)
      ))

      setProgress(scrollProgress)

      // Calculate which nodes should be active based on progress
      const newActiveNodes = new Array(itemCount).fill(false).map((_, i) => {
        const nodeThreshold = (i + 0.5) / itemCount
        return scrollProgress >= nodeThreshold
      })

      // Detect nodes that just turned off (for fading effect)
      const newFadingNodes = new Array(itemCount).fill(false).map((_, i) => {
        return prevActiveRef.current[i] && !newActiveNodes[i]
      })

      // Clear fading state after animation
      if (newFadingNodes.some(f => f)) {
        setTimeout(() => {
          setFadingNodes(new Array(itemCount).fill(false))
        }, 500)
      }

      setFadingNodes(newFadingNodes)
      setActiveNodes(newActiveNodes)
      prevActiveRef.current = newActiveNodes
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() // Initial check
    return () => window.removeEventListener("scroll", handleScroll)
  }, [itemCount])

  return { containerRef, progress, activeNodes, fadingNodes }
}

// ── Features data (roadmap style) ──
const capabilities = [
  {
    icon: Grid3x3,
    title: "지식 그래프 시각화",
    desc: "개념 간의 연결을 직관적으로 시각화합니다. 학습 진도를 한눈에 파악하세요.",
    step: 1,
  },
  {
    icon: Brain,
    title: "AI 근본 원인 분석",
    desc: "표면적 실수가 아닌 핵심 결손 개념을 정확히 추적하고 진단합니다.",
    step: 2,
  },
  {
    icon: BookOpen,
    title: "마이크로 러닝",
    desc: "결손 개념을 3분 안에 복습합니다. 짧고 효과적인 학습 콘텐츠.",
    step: 3,
  },
  {
    icon: Sparkles,
    title: "개인화 학습 경로",
    desc: "각 학생의 학습 상황에 맞춘 맞춤형 학습 계획을 제공합니다.",
    step: 4,
  },
]

// ── Subjects for 3D carousel ──
const subjects = [
  { label: "선형대수학", desc: "벡터, 행렬, 고유값" },
  { label: "미적분학", desc: "미분, 적분, 극한" },
  { label: "알고리즘", desc: "정렬, 탐색, 그래프" },
  { label: "확률통계", desc: "확률분포, 추론, 회귀" },
  { label: "물리학", desc: "역학, 전자기학, 열역학" },
  { label: "화학", desc: "유기화학, 무기화학" },
  { label: "생물학", desc: "세포, 유전, 생태학" },
  { label: "컴퓨터 구조", desc: "CPU, 메모리, 캐시" },
  { label: "운영체제", desc: "프로세스, 스레드, 메모리" },
  { label: "데이터베이스", desc: "SQL, 정규화, 트랜잭션" },
  { label: "네트워크", desc: "TCP/IP, HTTP, 소켓" },
  { label: "머신러닝", desc: "회귀, 분류, 클러스터링" },
]

// ── Demo areas ──
const demoAreas = [
  { title: "지식 그래프 대시보드", badge: "Interactive" },
  { title: "오답 분석 상세 보고서", badge: "AI-Powered" },
  { title: "개인화 학습 경로", badge: "Adaptive" },
]

// ── Simple Carousel Component (arrows + dots only) ──
function SubjectCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const totalItems = subjects.length
  const visibleCount = 5

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalItems)
  }

  const getCardStyle = (index: number) => {
    let diff = index - currentIndex
    if (diff > totalItems / 2) diff -= totalItems
    if (diff < -totalItems / 2) diff += totalItems

    const absPos = Math.abs(diff)
    const isVisible = absPos <= Math.floor(visibleCount / 2)

    if (!isVisible) {
      return {
        transform: `translateX(${diff * 100}%) scale(0.5) rotateY(${diff * 15}deg)`,
        opacity: 0,
        zIndex: 0,
        pointerEvents: "none" as const,
      }
    }

    const scale = 1 - absPos * 0.15
    const translateX = diff * 130
    const translateZ = -absPos * 80
    const rotateY = diff * -10
    const opacity = 1 - absPos * 0.25

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex: visibleCount - absPos,
      pointerEvents: absPos === 0 ? ("auto" as const) : ("none" as const),
    }
  }

  return (
      <div className="relative w-full py-16">
        {/* 3D Carousel Container */}
        <div
            className="relative h-56 w-full select-none"
            style={{ perspective: "1200px" }}
        >
          <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
            {subjects.map((subject, index) => (
                <div
                    key={subject.label}
                    className={cn(
                        "absolute w-56 h-40 rounded-2xl p-5 transition-all duration-500 ease-out",
                        "bg-gradient-to-br from-card to-muted border border-border",
                        "shadow-xl",
                        index === currentIndex && "ring-2 ring-primary/50"
                    )}
                    style={getCardStyle(index)}
                >
                  <div className="h-full flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1">{subject.label}</h3>
                      <p className="text-xs text-muted-foreground">{subject.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 text-primary text-xs font-medium">
                      <span>탐색하기</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>

        {/* Navigation - Arrows + Dots only */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
              onClick={handlePrev}
              className="p-3 rounded-full border border-border hover:bg-muted hover:border-primary/30 transition-all"
              aria-label="이전"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Dots indicator */}
          <div className="flex gap-1.5">
            {subjects.map((_, index) => (
                <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        index === currentIndex
                            ? "bg-primary w-6"
                            : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
                    )}
                    aria-label={`슬라이드 ${index + 1}`}
                />
            ))}
          </div>

          <button
              onClick={handleNext}
              className="p-3 rounded-full border border-border hover:bg-muted hover:border-primary/30 transition-all"
              aria-label="다음"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
  )
}

// ── Roadmap Section Component with Scroll Animation ──
function RoadmapSection() {
  const { containerRef, progress, activeNodes, fadingNodes } = useRoadmapProgress(capabilities.length)
  const titleRef = useReveal()

  return (
      <section id="features" className="py-24 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div
              ref={titleRef.ref}
              className={cn(
                  "text-center mb-20 transition-all duration-700",
                  titleRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
          >
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              학습의 새로운 방식
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              학습 격차를 찾고 효과적으로 메우는 4단계 과정
            </p>
          </div>

          {/* Roadmap with scroll-based lighting */}
          <div ref={containerRef} className="relative">
            {/* Background line (gray) */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-border hidden md:block" />

            {/* Progress line (animated, primary color) */}
            <div
                className="absolute left-8 top-8 w-0.5 bg-gradient-to-b from-primary via-primary to-primary/50 hidden md:block transition-all duration-300 ease-out"
                style={{
                  height: `calc(${Math.min(progress * 100, 100)}% - 64px)`,
                  boxShadow: progress > 0 ? '0 0 12px var(--primary), 0 0 24px var(--primary)' : 'none'
                }}
            />

            <div className="space-y-12">
              {capabilities.map((cap, i) => {
                const Icon = cap.icon
                const isActive = activeNodes[i]
                const isFading = fadingNodes[i]

                return (
                    <div
                        key={cap.title}
                        className={cn(
                            "relative flex gap-8 items-start transition-all duration-500",
                            titleRef.visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                        )}
                        style={{ transitionDelay: `${i * 100}ms` }}
                    >
                      {/* Node circle with light-up effect */}
                      <div className="relative z-10 flex-shrink-0">
                        {/* Glow effect when active */}
                        <div
                            className={cn(
                                "absolute inset-0 rounded-full transition-all duration-500",
                                isActive && "animate-ping-once"
                            )}
                            style={{
                              background: isActive ? 'var(--primary)' : 'transparent',
                              opacity: isActive ? 0.3 : 0,
                              transform: isActive ? 'scale(1.5)' : 'scale(1)',
                              filter: isActive ? 'blur(8px)' : 'none'
                            }}
                        />

                        {/* Main node circle - WHITE background to cover line */}
                        <div
                            className={cn(
                                "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                                isActive
                                    ? "bg-primary border-primary shadow-lg shadow-primary/40"
                                    : isFading
                                        ? "bg-card border-primary/50 animate-flicker"
                                        : "bg-card border-border"
                            )}
                        >
                          <Icon
                              className={cn(
                                  "h-7 w-7 transition-all duration-500",
                                  isActive
                                      ? "text-primary-foreground scale-110"
                                      : "text-muted-foreground"
                              )}
                          />
                        </div>

                        {/* Step number badge */}
                        <div
                            className={cn(
                                "absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-500",
                                isActive
                                    ? "bg-white text-primary shadow-lg"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                          {cap.step}
                        </div>
                      </div>

                      {/* Content card */}
                      <div
                          className={cn(
                              "flex-1 bg-card border rounded-2xl p-6 transition-all duration-500 group",
                              isActive
                                  ? "border-primary/50 shadow-lg shadow-primary/10"
                                  : "border-border hover:border-primary/30"
                          )}
                      >
                        <h3
                            className={cn(
                                "text-xl font-bold mb-2 transition-colors duration-500",
                                isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                            )}
                        >
                          {cap.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {cap.desc}
                        </p>
                      </div>
                    </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
  )
}

// ── Main Landing Page ──
export default function LandingPage() {
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [heroTextVisible, setHeroTextVisible] = useState(false)
  const demoRef = useReveal()
  const subjectsRef = useReveal()
  const ctaRef = useReveal()

  // RT-2 style hero animation sequence
  useEffect(() => {
    const timer1 = setTimeout(() => setHeroLoaded(true), 300)
    const timer2 = setTimeout(() => setHeroTextVisible(true), 800)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        {/* ── Navbar ── */}
        <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-1.5 bg-gradient-to-br from-primary to-primary/70 rounded-lg shadow-lg shadow-primary/20 group-hover:shadow-xl transition-all">
                <BrainCircuit className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">Linker</span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm">
              <Link href="#features" className="text-white/70 hover:text-white transition-colors">
                기능
              </Link>
              <Link href="#demo" className="text-white/70 hover:text-white transition-colors">
                데모
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link
                  href="/login"
                  className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1.5"
              >
                로그인
              </Link>
              <Link
                  href="/signup"
                  className="text-sm bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-white/90 transition-all"
              >
                무료 시작
              </Link>
            </div>
          </div>
        </nav>

        {/* ── RT-2 Style Full-Screen Hero with Video Background ── */}
        <section className="relative h-screen w-full overflow-hidden">
          {/* Video Background (placeholder - dark gradient for now) */}
          <div
              className={cn(
                  "absolute inset-0 transition-opacity duration-1000",
                  heroLoaded ? "opacity-100" : "opacity-0"
              )}
          >
            {/* Video placeholder - replace with actual video */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                poster=""
            >
              {/* <source src="/videos/hero.mp4" type="video/mp4" /> */}
            </video>

            {/* Gradient overlay for video placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-black via-black/95 to-primary/30" />

            {/* Animated grid pattern */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <pattern id="heroGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#heroGrid)" />
              </svg>
            </div>
          </div>

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Hero Content - RT-2 style fade in */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
            <div
                className={cn(
                    "max-w-4xl mx-auto transition-all duration-1000 ease-out",
                    heroTextVisible
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-12"
                )}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-none mb-6 text-white">
                <span className="block">오답의</span>
                <span className="block bg-gradient-to-r from-primary via-primary/80 to-white bg-clip-text text-transparent">
                근본 원인을 찾습니다
              </span>
              </h1>

              <p
                  className={cn(
                      "text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-10 transition-all duration-1000 delay-300",
                      heroTextVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  )}
              >
                AI 지식 그래프로 학습 격차를 근본 원인까지 추적합니다.
                표면적 실수가 아닌, 진짜 부족한 개념을 찾아드립니다.
              </p>

              <div
                  className={cn(
                      "flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-500",
                      heroTextVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  )}
              >
                <Link
                    href="/signup"
                    className="group flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-semibold shadow-2xl hover:shadow-white/20 transition-all hover:scale-105"
                >
                  무료로 시작하기 <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                    href="#demo"
                    className="flex items-center gap-2 border border-white/30 text-white px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-all"
                >
                  <Play className="h-4 w-4" />
                  데모 보기
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div
              className={cn(
                  "absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 transition-all duration-1000 delay-700",
                  heroTextVisible ? "opacity-100" : "opacity-0"
              )}
          >
            <span className="text-xs tracking-widest uppercase">스크롤</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </div>
        </section>

        {/* ── Demo Video Section ── */}
        <section id="demo" className="py-24 px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <div
                ref={demoRef.ref}
                className={cn(
                    "transition-all duration-700",
                    demoRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                  직접 확인하세요
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  학생은 어떻게 배우고, 선생님은 어떻게 가르치는지 바꿉니다.
                </p>
              </div>

              {/* Demo carousel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {demoAreas.map((demo, i) => (
                    <div
                        key={demo.title}
                        className={cn(
                            "group relative rounded-2xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all cursor-pointer h-64",
                            demoRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                        )}
                        style={{ transitionDelay: `${i * 100}ms` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="p-6 h-full flex flex-col justify-between relative z-10">
                        <div>
                      <span className="text-xs font-semibold text-primary/80 bg-primary/10 px-3 py-1 rounded-full">
                        {demo.badge}
                      </span>
                        </div>
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          {demo.title}
                        </h3>
                        <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>탐색</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                ))}
              </div>

              {/* Main video placeholder */}
              <div className="relative rounded-3xl overflow-hidden border border-border/50 shadow-2xl bg-muted aspect-video group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                    <Play className="h-10 w-10 text-white ml-1" />
                  </div>
                </div>
                <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full font-medium">
                  LIVE DEMO
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features Section - Roadmap Style with Scroll Animation ── */}
        <RoadmapSection />

        {/* ── Subjects Gallery - 3D Carousel ── */}
        <section className="py-24 px-6 bg-background overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div
                ref={subjectsRef.ref}
                className={cn(
                    "text-center mb-8 transition-all duration-700",
                    subjectsRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
            >
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                모든 과목 지원
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                수학, 과학, 공학 전 분야에 걸쳐 개인화된 지식 그래프를 생성합니다.
              </p>
            </div>

            <SubjectCarousel />
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-32 px-6 bg-gradient-to-br from-primary/95 to-primary">
          <div
              ref={ctaRef.ref}
              className={cn(
                  "max-w-3xl mx-auto text-center transition-all duration-700",
                  ctaRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-primary-foreground tracking-tight mb-6">
              학습의 변화를 시작하세요
            </h2>
            <p className="text-primary-foreground/90 text-lg mb-12 max-w-xl mx-auto">
              이미 많은 교육자와 학생들이 표면적 증상이 아닌 근본 원인을 찾고 있습니다.
            </p>
            <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-white text-primary px-10 py-4 rounded-full font-bold text-base hover:bg-white/90 shadow-2xl transition-all hover:scale-105"
            >
              무료로 시작하기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── Minimal Footer ── */}
        <footer className="border-t border-border py-8 px-6 bg-muted/20">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-lg">
                <BrainCircuit className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">Linker</span>
            </Link>
            <p className="text-xs text-muted-foreground">
              © 2025 Linker. AI 기반 지식 그래프 학습 플랫폼.
            </p>
          </div>
        </footer>
      </div>
  )
}
