"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { BrainCircuit, ArrowRight, Zap, Play, Grid3x3, Brain, BookOpen, Sparkles, ChevronRight } from "lucide-react"
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

function useScrollParallax() {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  
  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        const elementTop = rect.top
        setOffset(elementTop * 0.5)
      }
    }
    
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])
  
  return { ref, offset }
}

const capabilities = [
  {
    icon: Grid3x3,
    title: "지식 그래프 시각화",
    desc: "개념 간의 연결을 직관적으로 시각화합니다. 학습 진도를 한눈에 파악하세요.",
  },
  {
    icon: Brain,
    title: "AI 근본 원인 분석",
    desc: "표면적 실수가 아닌 핵심 결손 개념을 정확히 추적하고 진단합니다.",
  },
  {
    icon: BookOpen,
    title: "마이크로 러닝",
    desc: "결손 개념을 3분 안에 복습합니다. 짧고 효과적인 학습 콘텐츠.",
  },
  {
    icon: Sparkles,
    title: "개인화 학습 경로",
    desc: "각 학생의 학습 상황에 맞춘 맞춤형 학습 계획을 제공합니다.",
  },
]

const subjects = [
  { label: "선형대수학", concepts: 12, mastery: 28 },
  { label: "미적분학", concepts: 18, mastery: 45 },
  { label: "알고리즘", concepts: 15, mastery: 67 },
  { label: "확률통계", concepts: 14, mastery: 52 },
  { label: "물리학", concepts: 20, mastery: 35 },
  { label: "화학", concepts: 16, mastery: 41 },
]

const demoAreas = [
  { title: "지식 그래프 대시보드", badge: "Interactive" },
  { title: "오답 분석 상세 보고서", badge: "AI-Powered" },
  { title: "개인화 학습 경로", badge: "Adaptive" },
]

export default function LandingPage() {
  const hero = useReveal()
  const heroParallax = useScrollParallax()
  const capRef = useReveal()
  const demoRef = useReveal()
  const statsRef = useReveal()
  const ctaRef = useReveal()

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Premium Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/75 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 bg-gradient-to-br from-primary to-primary/70 rounded-lg shadow-lg shadow-primary/20 group-hover:shadow-xl transition-all">
              <BrainCircuit className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight">Linker</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#demo" className="text-muted-foreground hover:text-foreground transition-colors">
              Demo
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section with Parallax ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-14 overflow-hidden">
        {/* Animated background grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div
          ref={heroParallax.ref}
          className="relative z-10 max-w-4xl mx-auto text-center"
          style={{ transform: `translateY(${heroParallax.offset}px)` }}
        >
          <div
            ref={hero.ref}
            className={cn(
              "transition-all duration-1000",
              hero.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 text-sm font-medium text-primary mb-8 backdrop-blur-sm">
              <Zap className="h-3.5 w-3.5" />
              AI-Powered Learning Intelligence
            </div>

            {/* Main heading with dynamic text */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight mb-6">
              <span className="block">Find the Root Cause</span>
              <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                of Every Wrong Answer
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12 font-light">
              Linker uses AI-powered knowledge graphs to trace learning gaps to their source.
              Forget surface-level mistakes—uncover the core concepts your students are missing.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/app"
                className="group flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all hover:scale-105"
              >
                Start Learning <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#demo"
                className="flex items-center gap-2 border border-border px-8 py-4 rounded-full font-medium hover:bg-muted/50 transition-all"
              >
                <Play className="h-4 w-4" />
                Watch Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute top-1/4 right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/3 left-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />
      </section>

      {/* ── Demo Video Section ── */}
      <section id="demo" className="py-24 px-6">
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
                See It in Action
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Experience the platform that transforms how students learn and teachers teach.
              </p>
            </div>

            {/* Demo carousel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {demoAreas.map((demo, i) => (
                <div
                  key={demo.title}
                  className="group relative rounded-2xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all cursor-pointer h-64"
                  style={{ animationDelay: `${i * 100}ms` }}
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
                      <span>Explore</span>
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

      {/* ── Capabilities Section ── */}
      <section id="features" className="py-24 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div
            ref={capRef.ref}
            className={cn(
              "text-center mb-16 transition-all duration-700",
              capRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Powerful Features Built for Modern Learning
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to identify and close learning gaps efficiently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon
              return (
                <div
                  key={cap.title}
                  className={cn(
                    "group bg-card border border-border rounded-2xl p-8 hover:border-primary/50 hover:shadow-xl transition-all duration-500",
                    capRef.visible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8",
                  )}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {cap.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Subjects Gallery ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div
            ref={statsRef.ref}
            className={cn(
              "text-center mb-16 transition-all duration-700",
              statsRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Support for All Subjects
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From mathematics to sciences, personalized knowledge graphs across all disciplines.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subj, i) => (
              <div
                key={subj.label}
                className={cn(
                  "rounded-2xl p-6 bg-gradient-to-br from-primary/80 to-primary/60 text-white hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group",
                  statsRef.visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                )}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-white/90 transition-colors">
                      {subj.label}
                    </h3>
                    <p className="text-white/70 text-sm">{subj.concepts} concepts</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/80">Mastery</span>
                      <span className="font-semibold">{subj.mastery}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/70 rounded-full transition-all duration-1000"
                        style={{ 
                          width: statsRef.visible ? `${subj.mastery}%` : "0%"
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
            Ready to Transform Learning?
          </h2>
          <p className="text-primary-foreground/90 text-lg mb-12 max-w-xl mx-auto">
            Join educators and students who are already discovering root causes instead of surface symptoms.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 bg-white text-primary px-10 py-4 rounded-full font-bold text-base hover:bg-white/90 shadow-2xl transition-all hover:scale-105"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-12 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-lg">
                <BrainCircuit className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">Linker</span>
            </Link>
            <div className="grid grid-cols-3 gap-8 text-sm">
              <div>
                <p className="font-semibold mb-2">Product</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                  <li><Link href="#" className="hover:text-foreground transition-colors">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">Company</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li><Link href="#" className="hover:text-foreground transition-colors">About</Link></li>
                  <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">Legal</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li><Link href="#" className="hover:text-foreground transition-colors">Privacy</Link></li>
                  <li><Link href="#" className="hover:text-foreground transition-colors">Terms</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8">
            <p className="text-xs text-muted-foreground text-center">
              © 2025 Linker. AI-Powered Knowledge Graph Learning Platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
