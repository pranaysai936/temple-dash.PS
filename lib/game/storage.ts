import { MODES, type ModeId, type RunnerEngine } from './engine'
export type Settings = { sound: boolean; reducedEffects: boolean; quality: 'high' | 'low'; touch: boolean }
export type RunResult = { mode: ModeId; score: number; distance: number; coins: number; date: string }
export type Progress = { version: 1; coins: number; totalCoins: number; runs: number; best: Record<string, number>; daily: Record<string, number>; recent: RunResult[]; skin: string; unlocked: string[]; settings: Settings }
export const SKINS = [{ id: 'cyan', name: 'Ghost', color: '#4de8dc', cost: 0 }, { id: 'pink', name: 'Afterglow', color: '#f277ac', cost: 100 }, { id: 'gold', name: 'Gold rush', color: '#ffbe63', cost: 250 }]
export const STORAGE_KEY = 'neon-run-progress-v1'
export function defaultProgress(): Progress { return { version: 1, coins: 0, totalCoins: 0, runs: 0, best: {}, daily: {}, recent: [], skin: 'cyan', unlocked: ['cyan'], settings: { sound: false, reducedEffects: false, quality: 'high', touch: false } } }
const number = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
const record = (r: unknown): Record<string, number> => r && typeof r === 'object' && !Array.isArray(r) ? Object.fromEntries(Object.entries(r).slice(-400).filter(([k]) => k.length < 30).map(([k, v]) => [k, number(v)])) : {}
export function parseProgress(raw: string | null): Progress {
  const p = defaultProgress()
  if (!raw) return p
  try {
    const d = JSON.parse(raw)
    if (!d || d.version !== 1) return p
    p.coins = number(d.coins); p.totalCoins = number(d.totalCoins); p.runs = number(d.runs)
    p.best = record(d.best); p.daily = record(d.daily)
    p.unlocked = ['cyan', ...SKINS.filter(s => s.cost > 0 && Array.isArray(d.unlocked) && d.unlocked.includes(s.id)).map(s => s.id)]
    p.skin = p.unlocked.includes(d.skin) ? d.skin : 'cyan'
    if (Array.isArray(d.recent)) p.recent = d.recent.slice(0, 12).filter((r: RunResult) => r && MODES.some(m => m.id === r.mode) && typeof r.date === 'string').map((r: RunResult) => ({ mode: r.mode, score: number(r.score), distance: number(r.distance), coins: number(r.coins), date: r.date.slice(0, 30) }))
    for (const key of ['sound', 'reducedEffects', 'touch'] as const) if (typeof d.settings?.[key] === 'boolean') p.settings[key] = d.settings[key]
    p.settings.quality = d.settings?.quality === 'low' ? 'low' : 'high'
    return p
  } catch { return p }
}
export function loadProgress(): { progress: Progress; available: boolean } {
  try { return { progress: parseProgress(localStorage.getItem(STORAGE_KEY)), available: true } } catch { return { progress: defaultProgress(), available: false } }
}
export function saveProgress(progress: Progress) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); return true } catch { return false } }
export function recordRun(progress: Progress, engine: RunnerEngine): Progress {
  const result: RunResult = { mode: engine.mode, score: Math.floor(engine.score), distance: Math.floor(engine.distance), coins: engine.coins, date: new Date().toISOString() }
  const best = { ...progress.best }
  if (engine.mode !== 'zen') best[engine.mode] = Math.max(best[engine.mode] || 0, result.score)
  return { ...progress, best, coins: progress.coins + result.coins, totalCoins: progress.totalCoins + result.coins, runs: progress.runs + 1, daily: engine.mode === 'daily' ? { ...progress.daily, [engine.dailyDate]: Math.max(progress.daily[engine.dailyDate] || 0, result.score) } : progress.daily, recent: [result, ...progress.recent].slice(0, 12) }
}
export function selectSkin(progress: Progress, id: string): Progress {
  const skin = SKINS.find(s => s.id === id)
  if (!skin) return progress
  if (progress.unlocked.includes(id)) return { ...progress, skin: id }
  if (progress.coins < skin.cost) return progress
  return { ...progress, coins: progress.coins - skin.cost, skin: id, unlocked: [...progress.unlocked, id] }
}
