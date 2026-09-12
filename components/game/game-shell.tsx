'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Coins, Gamepad2, Settings as SettingsIcon, ShieldCheck, Trophy, UserRound, Zap } from 'lucide-react'
import { Lobby } from './lobby'
import { HelpDialog, Locker, Records, SettingsDialog } from './panels'
import { RunnerEngine, type ModeId } from '@/lib/game/engine'
import { defaultProgress, loadProgress, recordRun, saveProgress, selectSkin, type Progress } from '@/lib/game/storage'
import { cn } from '@/lib/utils'

const PlayScreen = dynamic(() => import('./play-screen'), { ssr: false, loading: () => <div className="game-loading"><Zap /><h2>Entering New Eden</h2><p>Warming up the city...</p></div> })
type View = 'play' | 'records' | 'locker'

export function GameShell() {
  const [view, setView] = useState<View>('play')
  const [selected, setSelected] = useState<ModeId>('endless')
  const [progress, setProgress] = useState<Progress>(defaultProgress)
  const [ready, setReady] = useState(false)
  const [available, setAvailable] = useState(true)
  const [help, setHelp] = useState(false)
  const [settings, setSettings] = useState(false)
  const [engine, setEngine] = useState<RunnerEngine | null>(null)
  useEffect(() => { const result = loadProgress(); setProgress(result.progress); setAvailable(result.available); setReady(true) }, [])
  const update = useCallback((updater: (p: Progress) => Progress) => setProgress(p => updater(p)), [])
  useEffect(() => { if (ready && !saveProgress(progress)) setAvailable(false) }, [progress, ready])
  const start = (mode: ModeId) => { if (!ready) return; setSelected(mode); setEngine(new RunnerEngine(mode)) }
  const complete = useCallback((run: RunnerEngine) => update(p => recordRun(p, run)), [update])
  return <div className={cn('game-app', progress.settings.reducedEffects && 'reduced-effects')}>
    {engine ? <PlayScreen key={engine.id} engine={engine} settings={progress.settings} skin={progress.skin} best={engine.mode === 'daily' ? progress.daily[engine.dailyDate] || 0 : progress.best[engine.mode] || 0} onComplete={complete} onExit={() => setEngine(null)} onRetry={() => start(engine.mode)} /> : <>
      <header className="site-header"><button className="wordmark" aria-label="Neon Run home" onClick={() => setView('play')}><span className="brand-symbol"><Zap fill="currentColor" strokeWidth={0} /></span>NEON<span>RUN</span><sup>®</sup></button><nav aria-label="Main navigation">{[{ id: 'play' as const, label: 'Play', icon: Gamepad2 }, { id: 'records' as const, label: 'My records', icon: Trophy }, { id: 'locker' as const, label: 'Locker', icon: UserRound }].map(item => <button key={item.id} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)} className={cn('nav-item', view === item.id && 'active')}><item.icon size={15} />{item.label}</button>)}</nav><div className="header-actions"><span className="saved-indicator"><span className="status-dot" /> LOCAL SAVE</span><span className="header-coins"><Coins size={16} /> {progress.coins.toLocaleString()}</span><span className="header-divider" /><button className="icon-button" onClick={() => setSettings(true)} aria-label="Open settings"><SettingsIcon size={18} /></button><button className="profile-button" onClick={() => setView('locker')} aria-label="Open your locker"><UserRound size={17} /></button></div></header>
      {!available && <div role="status" className="storage-warning">Device storage is unavailable. You can play, but progress will last only for this session.</div>}
      {view === 'play' ? <Lobby selected={selected} onSelect={setSelected} onStart={start} onHelp={() => setHelp(true)} onRecords={() => setView('records')} progress={progress} /> : view === 'records' ? <Records progress={progress} onStart={start} /> : <Locker progress={progress} onSelect={id => update(p => selectSkin(p, id))} />}
      {view !== 'play' && <footer className="secondary-footer"><ShieldCheck size={13} /> Saved on this device. Made for your next personal best.</footer>}
    </>}
    <HelpDialog open={help} onOpenChange={setHelp} />
    <SettingsDialog open={settings} onOpenChange={setSettings} settings={progress.settings} onChange={s => update(p => ({ ...p, settings: s }))} />
  </div>
}
