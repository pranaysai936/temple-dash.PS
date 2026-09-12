'use client'

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Coins, Flag, Home, Magnet, Pause, Play, RotateCcw, Shield, Timer, Trophy, Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MODES, type Action, type RunnerEngine, type Snapshot } from '@/lib/game/engine'
import { type Settings } from '@/lib/game/storage'
import { cn } from '@/lib/utils'

const RunnerScene = dynamic(() => import('./runner-scene'), { ssr: false })
class GraphicsBoundary extends Component<{ children: ReactNode; onExit: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <div className="graphics-error"><Zap size={40} /><h2>The city needs a graphics connection.</h2><p>WebGL could not start. Try a browser with hardware acceleration enabled, or select low graphics in settings.</p><button className="launch-button" onClick={this.props.onExit}>Back to lobby</button></div> : this.props.children }
}

export default function PlayScreen({ engine, settings, skin, best, onComplete, onExit, onRetry }: { engine: RunnerEngine; settings: Settings; skin: string; best: number; onComplete: (engine: RunnerEngine) => void; onExit: () => void; onRetry: () => void }) {
  const [hud, setHud] = useState<Snapshot>(() => engine.snapshot())
  const [loaded, setLoaded] = useState(false)
  const recorded = useRef(false)
  const startingBest = useRef(best)
  const audio = useRef<AudioContext | null>(null)
  const initialTouch = useRef({ x: 0, y: 0 })
  const mode = MODES.find(m => m.id === engine.mode)!
  const emit = useCallback((event: 'coin' | 'hit' | 'power') => {
    if (!settings.sound || !audio.current || audio.current.state !== 'running') return
    const context = audio.current
    const oscillator = context.createOscillator(); const gain = context.createGain()
    oscillator.type = event === 'hit' ? 'sawtooth' : 'sine'
    oscillator.frequency.setValueAtTime(event === 'coin' ? 880 : event === 'power' ? 520 : 130, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(event === 'hit' ? 40 : 1400, context.currentTime + .12)
    gain.gain.setValueAtTime(.035, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .15)
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .16)
  }, [settings.sound])
  const onFrame = useCallback((snapshot: Snapshot) => {
    setHud(snapshot)
    if (snapshot.phase === 'results' && !recorded.current) { recorded.current = true; onComplete(engine) }
  }, [engine, onComplete])
  const togglePause = useCallback(() => { engine.phase === 'paused' ? engine.resume() : engine.pause(); onFrame(engine.snapshot()) }, [engine, onFrame])
  const finish = () => { engine.finish(); onFrame(engine.snapshot()) }
  useEffect(() => {
    if (settings.sound) {
      try { audio.current = new AudioContext(); void audio.current.resume().catch(() => {}) } catch { /* Audio is optional when the browser blocks the audio context. */ }
    }
    const unlockAudio = () => { if (audio.current?.state === 'suspended') void audio.current.resume().catch(() => {}) }
    const key = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229 || (e.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName))) return
      unlockAudio()
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { e.preventDefault(); if (engine.phase !== 'results') togglePause(); return }
      if (engine.phase !== 'running' || e.repeat) return
      const action: Record<string, Action> = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', ArrowDown: 'slide', s: 'slide', S: 'slide' }
      if (action[e.key]) { e.preventDefault(); engine.action(action[e.key]) }
    }
    const visibility = () => { if (document.hidden) { engine.pause(); onFrame(engine.snapshot()) } }
    window.addEventListener('keydown', key); window.addEventListener('pointerdown', unlockAudio); document.addEventListener('visibilitychange', visibility)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', unlockAudio); document.removeEventListener('visibilitychange', visibility); void audio.current?.close().catch(() => {}) }
  }, [engine, onFrame, settings.sound, togglePause])
  const active = hud.phase === 'running' || hud.phase === 'countdown'
  return <main className="play-screen" aria-label={`${mode.name} gameplay`}>
    <div className="game-canvas" onTouchStart={e => { initialTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }} onTouchEnd={e => { const dx = e.changedTouches[0].clientX - initialTouch.current.x; const dy = e.changedTouches[0].clientY - initialTouch.current.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return; engine.action(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'slide' : 'jump') }}><GraphicsBoundary onExit={onExit}><RunnerScene engine={engine} settings={settings} skin={skin} onFrame={onFrame} onEvent={emit} onReady={() => setLoaded(true)} /></GraphicsBoundary></div>
    {loaded && <>
      <header className="game-hud"><div className="hud-left"><span className="hud-logo"><Zap size={20} fill="currentColor" /> NEON RUN</span><span className="hud-mode">{mode.name}<small>NEW EDEN / NIGHT DISTRICT</small></span></div><div className="hud-stats"><div><span>{engine.mode === 'zen' ? 'DISTANCE' : 'SCORE'}</span><strong>{engine.mode === 'zen' ? `${hud.distance.toLocaleString()} m` : hud.score.toLocaleString().padStart(6, '0')}</strong></div><div className="hud-coins"><Coins size={16} /><strong>{hud.coins}</strong></div>{(engine.mode === 'time' || engine.mode === 'daily') && <div className={cn('hud-timer', hud.time < 10 && 'urgent')}><Timer size={17} /><strong>{hud.time}s</strong></div>}<button className="pause-button" aria-label="Pause game" onClick={togglePause} disabled={!active}><Pause size={20} /></button></div></header>
      {hud.phase === 'countdown' && <div className="countdown-overlay" aria-live="polite"><span>FIND YOUR FLOW</span><strong>{Math.max(1, hud.countdown)}</strong><p>Arrows / WASD to move · Swipe on mobile</p></div>}
      {hud.phase === 'running' && <><div className="powerup-hud">{([{ key: 'shield', icon: Shield, label: 'Shield' }, { key: 'magnet', icon: Magnet, label: 'Magnet' }, { key: 'double', icon: Zap, label: '2× score' }] as const).map(p => hud[p.key] > 0 && <div key={p.key}><p.icon size={15} /><span>{p.label}</span><strong>{Math.ceil(hud[p.key])}s</strong></div>)}</div><div className="run-message" aria-live="polite">{hud.message}</div><div className="game-bottom"><span>{hud.distance.toLocaleString()} M <small>/ {Math.round(hud.speed * 3.6)} KM/H</small></span><span>{engine.mode === 'hardcore' ? '3× SCORE · ONE LIFE' : engine.mode === 'zen' ? 'BREATHE. YOU HAVE ALL THE TIME.' : 'KEEP YOUR EYES ON THE NEXT ROOFTOP.'}</span>{engine.mode === 'zen' ? <button onClick={finish}><Flag size={14} /> Finish practice</button> : <span><kbd>ESC</kbd> Pause</span>}</div></>}
      {hud.invincible > 1.75 && !settings.reducedEffects && <div className="hit-flash" />}
      {active && <div className={cn('touch-controls', settings.touch && 'always-show')} aria-label="Touch controls">{[{ action: 'left' as const, icon: ArrowLeft, label: 'Move left' }, { action: 'jump' as const, icon: ArrowUp, label: 'Jump' }, { action: 'slide' as const, icon: ArrowDown, label: 'Slide' }, { action: 'right' as const, icon: ArrowRight, label: 'Move right' }].map(c => <button key={c.action} aria-label={c.label} onPointerDown={e => { e.preventDefault(); engine.action(c.action) }}><c.icon size={24} /></button>)}</div>}
    </>}
    {!loaded && <div className="scene-loading"><Zap size={34} /><span>BUILDING THE NIGHT DISTRICT...</span><button className="how-button" onClick={onExit}>Back to lobby</button></div>}
    <Dialog open={hud.phase === 'paused'} onOpenChange={open => { if (!open && engine.phase === 'paused') { engine.resume(); onFrame(engine.snapshot()) } }}><DialogContent showCloseButton={false} className="sm:max-w-md"><DialogHeader><DialogTitle>Catch your breath.</DialogTitle><DialogDescription>The city can wait. Your run is paused.</DialogDescription></DialogHeader><div className="pause-summary"><span>{hud.score.toLocaleString()}<small>POINTS</small></span><span>{hud.distance} m<small>DISTANCE</small></span><span>{hud.coins}<small>COINS</small></span></div><button className="launch-button full-button" onClick={togglePause}><Play size={16} fill="currentColor" /> Resume run</button><button className="secondary-game-button" onClick={finish}><Flag size={15} /> End run & save progress</button><p className="panel-note">All timers and power-ups are frozen while paused.</p></DialogContent></Dialog>
    <Dialog open={hud.phase === 'results'} onOpenChange={() => {}}><DialogContent showCloseButton={false} className="sm:max-w-md"><DialogHeader><div className="result-icon"><Trophy size={25} /></div><DialogTitle>{engine.mode === 'zen' ? 'That was your moment.' : engine.mode === 'daily' && engine.time <= 0 ? 'Night shift complete.' : 'One run closer to legendary.'}</DialogTitle><DialogDescription>{mode.name} · New Eden</DialogDescription></DialogHeader><div className="result-score"><span>{engine.mode === 'zen' ? 'DISTANCE TRAVELLED' : hud.score > startingBest.current ? 'NEW PERSONAL BEST' : 'FINAL SCORE'}</span><strong>{engine.mode === 'zen' ? `${hud.distance.toLocaleString()} m` : hud.score.toLocaleString()}</strong></div><div className="result-stats"><span>{hud.distance.toLocaleString()} m<small>DISTANCE</small></span><span><Coins size={16} /> +{hud.coins}<small>COINS EARNED</small></span><span>{Math.floor(engine.elapsed)}s<small>RUN TIME</small></span></div><button className="launch-button full-button" onClick={onRetry}><RotateCcw size={16} /> Run it back <ArrowRight size={16} /></button><button className="secondary-game-button" onClick={onExit}><Home size={15} /> Back to lobby</button><p className="panel-note">Progress added to your device records.</p></DialogContent></Dialog>
  </main>
}
