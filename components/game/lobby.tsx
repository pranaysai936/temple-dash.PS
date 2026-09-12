'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Check, ChevronRight, CircleHelp, Coins, Flame, Gamepad2, Infinity as InfinityIcon, Leaf, Monitor, Play, ShieldCheck, Sparkles, Target, Timer, Trophy, Zap } from 'lucide-react'
import Image from 'next/image'
import { MODES, utcDate, type ModeId } from '@/lib/game/engine'
import { type Progress } from '@/lib/game/storage'
import { cn } from '@/lib/utils'

export const modeIcons = { endless: InfinityIcon, time: Timer, hardcore: Flame, daily: Target, zen: Leaf }
export function Lobby({ selected, onSelect, onStart, onHelp, onRecords, progress }: { selected: ModeId; onSelect: (id: ModeId) => void; onStart: (id: ModeId) => void; onHelp: () => void; onRecords: () => void; progress: Progress }) {
  const mode = MODES.find(m => m.id === selected)!
  const Icon = modeIcons[selected]
  const best = Math.max(0, ...Object.values(progress.best))
  return <main className="lobby-container">
    <div className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> THE STREETS ARE WAITING</div><h1>Your next run starts here.</h1></div><div className="session-tag"><Monitor size={13} /><span>PLAY IN YOUR BROWSER</span><span className="tiny-divider" /><span>NO DOWNLOADS</span></div></div>
    <div className="lobby-grid"><div className="lobby-primary">
      <section className="hero-panel" aria-label="Welcome to Neon Run">
        <Image src="/images/neon-city.png" alt="A cyberpunk runner surveys a luminous city from a rooftop" fill priority sizes="(max-width: 900px) 100vw, 75vw" className="hero-art" />
        <div className="hero-shade" />
        <div className="hero-content"><div className="hero-label"><span /> WELCOME TO NEW EDEN <span className="label-rule" /></div><h2>THE CITY NEVER STOPS.<br /><span>NEITHER DO YOU.</span></h2><p>Own the rooftops. Outrun the ordinary.<br />Find your limit. Then leave it behind.</p><div className="hero-actions"><button className="launch-button" onClick={() => onStart(selected)}><Play size={16} fill="currentColor" /> LET&apos;S RUN <ArrowRight size={18} /></button><button className="how-button" onClick={onHelp}><CircleHelp size={15} /> How to play</button></div><div className="hero-mode"><Icon size={13} /><span>{mode.name}</span><span className="hero-mode-dot" /><span>{selected === 'zen' ? 'No pressure. Just flow.' : 'Your next personal best awaits.'}</span></div></div>
        <div className="hero-location"><span className="status-dot" /> NEW EDEN / NIGHT DISTRICT <ArrowUpRight size={12} /></div>
        <div className="hero-coordinate">35°41′ N &nbsp; 139°41′ E</div>
      </section>
      <section className="modes-section" aria-labelledby="modes-heading"><div className="section-heading"><h2 id="modes-heading">Choose your challenge<span>05 MODES</span></h2><span className="small-muted">Different rules. Same rush.</span></div>
        <div className="mode-grid" role="radiogroup" aria-label="Game mode">{MODES.map((m, index) => { const ModeIcon = modeIcons[m.id]; return <button key={m.id} role="radio" aria-checked={selected === m.id} onClick={() => onSelect(m.id)} className={cn('mode-card', selected === m.id && 'selected')} style={{ '--mode-color': m.color } as React.CSSProperties} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = (index + (e.key === 'ArrowRight' ? 1 : 4)) % 5; onSelect(MODES[next].id); (e.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus() } }}>
          <div className={cn('mode-art', `art-${m.id}`)}><Image src={m.image} fill sizes="(max-width: 650px) 45vw, 16vw" alt="" /><span className="mode-art-shade" /><ModeIcon className="mode-art-icon" strokeWidth={1.6} /><span className="mode-number">0{index + 1}</span>{selected === m.id && <span className="mode-selected"><Check size={11} /></span>}</div>
          <div className="mode-info"><h3>{m.name}</h3><p>{m.description}</p><div className="mode-caption">{m.id === 'endless' ? 'CLASSIC' : m.id === 'time' ? '60 SECONDS' : m.id === 'hardcore' ? '3× SCORE' : m.id === 'daily' ? 'DAILY RESET' : 'NO LIMITS'}<ArrowUpRight size={12} /></div></div>
        </button> })}</div>
        <div className="selected-mode-description"><Icon size={14} /><p><strong>{mode.name}.</strong> {mode.detail}</p></div>
      </section>
    </div>
    <aside className="lobby-sidebar">
      <section className="daily-panel"><div className="sidebar-card-heading"><span className="daily-icon"><Target size={17} /></span><span>THE DAILY RUN</span><span className="daily-live">DAILY</span></div><div className="daily-art"><Image src="/images/neon-city.png" fill sizes="280px" alt="Purple neon towers in the night district" /><span /><div className="daily-art-label">NIGHT SHIFT<span>NEW EDEN • SECTOR 07</span></div></div><div className="daily-content"><div className="daily-date"><span>ONE ROUTE. MAKE IT YOURS.</span><Sparkles size={13} /></div><h3>A different kind of rush.</h3><p>A new seeded route every day.<br />90 seconds to leave your mark.</p><div className="daily-reset"><Timer size={13} /> Resets at 00:00 UTC<span>{utcDate().slice(5).replace('-', ' / ')}</span></div><button className="daily-button" onClick={() => onStart('daily')}>Take the challenge <ArrowUpRight size={15} /></button></div></section>
      <section className="best-panel"><div className="sidebar-card-heading"><Trophy size={16} /><span>YOUR PERSONAL BEST</span></div><div className="best-score">{best.toLocaleString()}<span>PTS</span></div><p>{best ? 'The only competition is yesterday’s you.' : 'Every legend starts with a first run.'}</p><div className="best-meta"><span><Zap size={13} /> {progress.runs} runs</span><span><Coins size={13} /> {progress.totalCoins.toLocaleString()} collected</span></div><button onClick={onRecords} className="records-link">View your records <ArrowRight size={14} /></button></section>
    </aside></div>
    <div className="bottom-strip"><div className="bottom-brand"><Gamepad2 size={19} /><span>Easy to learn.<strong> Impossible to stand still.</strong></span></div><div className="quick-controls"><span><kbd><ArrowLeft /></kbd><kbd><ArrowRight /></kbd> Move</span><span><kbd><ArrowUp /></kbd> Jump</span><span><kbd><ArrowDown /></kbd> Slide</span><button onClick={onHelp}>All controls <ChevronRight size={12} /></button></div></div>
    <footer className="site-footer"><span>NEON RUN <span className="footer-version">/ V 1.0</span></span><span><ShieldCheck size={12} /> Your progress stays on this device.</span><span>BUILT FOR THE CHASE.</span></footer>
  </main>
}
