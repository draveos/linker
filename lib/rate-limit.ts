// ── In-memory rate limiter (per IP, sliding window) ──
//
// 주의: Vercel serverless에선 인스턴스마다 별개의 Map을 갖습니다.
// Cold start / 멀티 인스턴스 환경에서 완벽하지 않지만,
// casual abuse / cost bombing을 막기엔 충분합니다.
// 엄격한 보호가 필요하면 Upstash Redis로 이관 권장.

import type { NextRequest } from "next/server"

interface WindowConfig {
  windowMs: number
  maxRequests: number
}

const CONFIGS: Record<string, WindowConfig> = {
  analyze:  { windowMs: 60_000, maxRequests: 15 },   // 60초에 15회
  generate: { windowMs: 60_000, maxRequests: 5 },    // 60초에 5회 (Sonnet, 비용 큼)
  chat:     { windowMs: 60_000, maxRequests: 30 },   // 60초에 30회 (짧은 호출)
  context:  { windowMs: 60_000, maxRequests: 10 },   // 60초에 10회
}

// 메모리 저장소: IP → 요청 타임스탬프 배열
const stores: Record<string, Map<string, number[]>> = {
  analyze: new Map(),
  generate: new Map(),
  chat: new Map(),
  context: new Map(),
}

export type RateLimitBucket = keyof typeof CONFIGS

/** 요청자 IP 추출 — x-forwarded-for 헤더 첫번째 값 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  const real = req.headers.get("x-real-ip")
  if (real) return real
  return "unknown"
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetIn: number  // ms until oldest request expires
}

/**
 * 특정 bucket에서 IP의 요청 허용 여부 확인.
 * 허용 시 타임스탬프 기록 + true 반환.
 * 초과 시 false 반환 (기록 안 함).
 */
export function checkRateLimit(ip: string, bucket: RateLimitBucket): RateLimitResult {
  const config = CONFIGS[bucket]
  const store = stores[bucket]
  const now = Date.now()

  const timestamps = store.get(ip) ?? []
  // 윈도우 바깥 기록 정리
  const recent = timestamps.filter((t) => now - t < config.windowMs)

  if (recent.length >= config.maxRequests) {
    const oldestInWindow = recent[0]
    return {
      ok: false,
      remaining: 0,
      resetIn: config.windowMs - (now - oldestInWindow),
    }
  }

  recent.push(now)
  store.set(ip, recent)

  // 주기적 클린업 (과도한 메모리 사용 방지) — 맵이 1000개 넘으면 오래된 것 제거
  if (store.size > 1000) {
    for (const [key, value] of store.entries()) {
      const filtered = value.filter((t) => now - t < config.windowMs)
      if (filtered.length === 0) store.delete(key)
      else store.set(key, filtered)
    }
  }

  return {
    ok: true,
    remaining: config.maxRequests - recent.length,
    resetIn: config.windowMs,
  }
}
