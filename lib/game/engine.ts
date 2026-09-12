export type ModeId = 'endless' | 'time' | 'hardcore' | 'daily' | 'zen'
export type Phase = 'countdown' | 'running' | 'paused' | 'results'
export type Action = 'left' | 'right' | 'jump' | 'slide'
export type EntityKind = 'barrier' | 'overhead' | 'gap' | 'coin' | 'shield' | 'magnet' | 'double' | 'time'
export type Entity = { id: number; kind: EntityKind; lane: number; at: number; hit: boolean }
export const MODES: { id: ModeId; name: string; label: string; description: string; detail: string; color: string; image: string }[] = [
  { id: 'endless', name: 'Endless run', label: 'THE ORIGINAL', description: 'No finish line. Just you and the city.', detail: 'Dodge, jump, and slide. The city gets faster the longer you survive. One collision ends your run unless you have a shield.', color: '#4de8dc', image: '/images/neon-city.png' },
  { id: 'time', name: 'Time attack', label: 'BEAT THE CLOCK', description: 'Every second is a second chance.', detail: 'Start with 60 seconds. Cyan clock pickups add 5 seconds (up to 90). Collisions cost 8 seconds. Chase your highest score before time runs out.', color: '#f6b55c', image: '/images/neon-highway.png' },
  { id: 'hardcore', name: 'Hardcore', label: 'HIGH RISK. HIGH REWARD.', description: 'One life. No room for hesitation.', detail: 'Start at high speed, face closer obstacles, and earn a 3× score multiplier. No shields. One mistake and it is over.', color: '#ee7599', image: '/images/neon-highway.png' },
  { id: 'daily', name: 'Daily challenge', label: 'A NEW ROUTE DAILY', description: 'One city. One course. Make it count.', detail: 'Survive a fixed 90-second route. The same UTC date always generates the same course and pickups. Your daily personal best resets at 00:00 UTC.', color: '#b79af5', image: '/images/neon-city.png' },
  { id: 'zen', name: 'Zen practice', label: 'FIND YOUR FLOW', description: 'Lose yourself. Not your progress.', detail: 'A relaxed, fixed pace with no elimination and no competitive score. Practice every move, collect coins, and finish whenever you like.', color: '#75d5b1', image: '/images/zen-city.png' },
]
export function utcDate() { return new Date().toISOString().slice(0, 10) }
export function seedFrom(text: string) { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }
export function randomGenerator(seed: number) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
export type Snapshot = { phase: Phase; countdown: number; score: number; distance: number; coins: number; time: number; shield: number; magnet: number; double: number; speed: number; invincible: number; message: string }
export class RunnerEngine {
  readonly id = Math.random().toString(36).slice(2)
  phase: Phase = 'countdown'
  previousPhase: 'running' | 'countdown' = 'countdown'
  countdown = 3
  score = 0
  distance = 0
  coins = 0
  elapsed = 0
  time = 60
  lane = 0
  x = 0
  y = 0
  jump = 0
  slide = 0
  shield = 0
  magnet = 0
  double = 0
  invincible = 0
  message = ''
  messageTime = 0
  entities: Entity[] = []
  nextAt = 42
  nextId = 0
  events: ('coin' | 'hit' | 'power')[] = []
  readonly dailyDate: string
  readonly random: () => number
  constructor(public mode: ModeId, date = utcDate(), seed = Math.floor(Math.random() * 1000000000)) {
    this.dailyDate = date
    this.random = randomGenerator(mode === 'daily' ? seedFrom(date) : seed)
    if (mode === 'daily') this.time = 90
    this.populate()
  }
  get speed() { return this.mode === 'zen' ? 14 : this.mode === 'daily' ? 21 : Math.min(35, (this.mode === 'hardcore' ? 27 : 18) + this.elapsed * .12) }
  notify(message: string) { this.message = message; this.messageTime = 1.6 }
  action(action: Action) {
    if (this.phase !== 'running') return
    if (action === 'left') this.lane = Math.max(-1, this.lane - 1)
    if (action === 'right') this.lane = Math.min(1, this.lane + 1)
    if (action === 'jump' && this.jump <= 0) { this.jump = .85; this.slide = 0 }
    if (action === 'slide' && this.jump <= 0) this.slide = .8
  }
  pause() { if (this.phase === 'running' || this.phase === 'countdown') { this.previousPhase = this.phase; this.phase = 'paused' } }
  resume() { if (this.phase === 'paused') this.phase = this.previousPhase }
  finish() { this.phase = 'results' }
  populate() {
    while (this.nextAt < this.distance + 220) {
      const safe = Math.floor(this.random() * 3) - 1
      const blocked = (safe + 1 + Math.floor(this.random() * 2) + 1) % 3 - 1
      const types: EntityKind[] = ['barrier', 'overhead', 'gap']
      const type = types[Math.floor(this.random() * 3)]
      this.entities.push({ id: this.nextId++, kind: type, lane: blocked, at: this.nextAt, hit: false })
      if (this.random() > .5) {
        const second = [-1, 0, 1].find(l => l !== safe && l !== blocked)!
        this.entities.push({ id: this.nextId++, kind: types[Math.floor(this.random() * 3)], lane: second, at: this.nextAt, hit: false })
      }
      for (let n = 0; n < 3; n++) this.entities.push({ id: this.nextId++, kind: 'coin', lane: safe, at: this.nextAt + n * 2.7, hit: false })
      const power = this.random()
      if (power > .65) {
        const kinds: EntityKind[] = this.mode === 'hardcore' ? ['magnet', 'double'] : this.mode === 'time' ? ['time', 'time', 'shield', 'magnet', 'double'] : ['shield', 'magnet', 'double']
        this.entities.push({ id: this.nextId++, kind: kinds[Math.floor(this.random() * kinds.length)], lane: safe, at: this.nextAt + 10, hit: false })
      }
      this.nextAt += this.mode === 'hardcore' ? 23 : 30
    }
  }
  step(delta: number) {
    const dt = Math.min(Math.max(delta, 0), .05)
    if (this.phase === 'countdown') { this.countdown -= dt; if (this.countdown <= 0) this.phase = 'running'; return }
    if (this.phase !== 'running') return
    this.elapsed += dt
    this.distance += dt * this.speed
    this.x += (this.lane * 2.4 - this.x) * Math.min(1, dt * 17)
    this.jump = Math.max(0, this.jump - dt)
    this.slide = Math.max(0, this.slide - dt)
    this.y = this.jump > 0 ? Math.sin((1 - this.jump / .85) * Math.PI) * 2.5 : 0
    this.shield = Math.max(0, this.shield - dt)
    this.magnet = Math.max(0, this.magnet - dt)
    this.double = Math.max(0, this.double - dt)
    this.invincible = Math.max(0, this.invincible - dt)
    this.messageTime -= dt
    if (this.messageTime <= 0) this.message = ''
    if (this.mode !== 'zen') this.score += dt * this.speed * (this.mode === 'hardcore' ? 3 : 1) * (this.double > 0 ? 2 : 1)
    if (this.mode === 'time' || this.mode === 'daily') { this.time = Math.max(0, this.time - dt); if (this.time === 0) { this.notify(this.mode === 'daily' ? 'DAILY ROUTE COMPLETE' : 'TIME IS UP'); this.finish(); return } }
    for (const e of this.entities) {
      if (e.hit || Math.abs(e.at - this.distance) > 1.2) continue
      const inLane = Math.abs(e.lane * 2.4 - this.x) < .85
      if (e.kind === 'coin' && (inLane || this.magnet > 0)) {
        e.hit = true; this.coins++; if (this.mode !== 'zen') this.score += 25 * (this.double > 0 ? 2 : 1); this.events.push('coin'); continue
      }
      if (!inLane) continue
      if (e.kind === 'barrier' || e.kind === 'gap' || e.kind === 'overhead') {
        if (e.kind === 'overhead' ? this.slide > 0 : this.y > 1.0) continue
        if (this.invincible > 0) continue
        e.hit = true
        this.events.push('hit')
        if (this.shield > 0) { this.shield = 0; this.invincible = 2; this.notify('SHIELD ABSORBED THE HIT') }
        else if (this.mode === 'time') { this.time = Math.max(0, this.time - 8); this.invincible = 2; this.notify('COLLISION  −8 SECONDS'); if (this.time === 0) this.finish() }
        else if (this.mode === 'zen') { this.invincible = 2; this.notify('KEEP GOING. FIND YOUR FLOW.') }
        else { this.notify('RUN COMPLETE'); this.finish(); break }
      } else if (e.kind !== 'coin') {
        e.hit = true; this.events.push('power')
        if (e.kind === 'time') { this.time = Math.min(90, this.time + 5); this.notify('+5 SECONDS') }
        else { this[e.kind] = 12; this.notify(e.kind === 'double' ? '2× SCORE ACTIVATED' : `${e.kind.toUpperCase()} ACTIVATED`) }
      }
    }
    this.entities = this.entities.filter(e => e.at > this.distance - 10)
    this.populate()
  }
  snapshot(): Snapshot { return { phase: this.phase, countdown: Math.ceil(this.countdown), score: Math.floor(this.score), distance: Math.floor(this.distance), coins: this.coins, time: Math.ceil(this.time), shield: this.shield, magnet: this.magnet, double: this.double, speed: this.speed, invincible: this.invincible, message: this.message } }
}
