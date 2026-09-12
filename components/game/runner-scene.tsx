'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RunnerEngine, randomGenerator, type EntityKind, type Snapshot } from '@/lib/game/engine'
import { SKINS, type Settings } from '@/lib/game/storage'

const kinds: EntityKind[] = ['barrier', 'overhead', 'gap', 'coin', 'shield', 'magnet', 'double', 'time']
const colors: Record<EntityKind, string> = { barrier: '#ff5488', overhead: '#ffb24e', gap: '#df315d', coin: '#ffcb67', shield: '#569bff', magnet: '#b88aff', double: '#83ffaa', time: '#53eff3' }
const dummy = new THREE.Object3D()

function Box({ position, size, color, glow = false }: { position: [number, number, number]; size: [number, number, number]; color: string; glow?: boolean }) {
  return <mesh position={position}><boxGeometry args={size} />{glow ? <meshBasicMaterial color={color} /> : <meshStandardMaterial color={color} roughness={.65} metalness={.45} />}</mesh>
}

function Buildings({ quality, engine }: { quality: Settings['quality']; engine: RunnerEngine }) {
  const group = useRef<THREE.Group>(null)
  const buildings = useMemo(() => { const rand = randomGenerator(91); return Array.from({ length: quality === 'low' ? 22 : 42 }, (_, i) => ({ x: (i % 2 ? -1 : 1) * (6.2 + rand() * 11), z: -Math.floor(i / 2) * 12, height: 8 + rand() * 33, width: 3 + rand() * 4, color: i % 5 === 0 ? '#d45799' : '#40b9c0', sign: i % 4 === 0 })) }, [quality])
  useFrame(() => { if (!group.current) return; group.current.children.forEach((child, i) => { child.position.z = 15 - ((-buildings[i].z - engine.distance * .6 + 60000) % 252) }) })
  return <group ref={group}>{buildings.map((b, i) => <group key={i} position={[b.x, b.height / 2 - 6, b.z]}><Box position={[0, 0, 0]} size={[b.width, b.height, 7]} color={i % 3 === 0 ? '#182b3c' : '#111d2a'} /><Box position={[-b.width / 2, 0, 3.55]} size={[.075, b.height, .05]} color={b.color} glow />{Array.from({ length: quality === 'low' ? 4 : 8 }, (_, j) => <Box key={j} position={[0, -b.height / 2 + (j + 1) * b.height / 9, 3.54]} size={[b.width * .72, .1, .05]} color={j % 3 === 0 ? '#326874' : b.color} glow />)}{b.sign && <><Box position={[0, 1, 3.8]} size={[b.width * .7, 3.8, .15]} color="#122432" /><Box position={[0, 1, 3.91]} size={[b.width * .55, 3.4, .03]} color={b.color} glow /><Box position={[0, 1, 3.94]} size={[b.width * .4, 3.1, .03]} color="#172335" />{[0, 1, 2].map(n => <Box key={n} position={[0, n, 4]} size={[b.width * .26, .12, .05]} color={b.color} glow />)}</>}</group>)}</group>
}

function CityWorld({ engine, settings, skin, onFrame, onEvent }: { engine: RunnerEngine; settings: Settings; skin: string; onFrame: (s: Snapshot) => void; onEvent: (event: 'coin' | 'hit' | 'power') => void }) {
  const player = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const shield = useRef<THREE.Mesh>(null)
  const tiles = useRef<THREE.InstancedMesh>(null)
  const roadLines = useRef<THREE.InstancedMesh>(null)
  const obstacles = useRef<Partial<Record<EntityKind, THREE.InstancedMesh>>>({})
  const accumulator = useRef(0)
  const lastPhase = useRef(engine.phase)
  const accent = SKINS.find(s => s.id === skin)?.color || '#4de8dc'
  useFrame((_, rawDelta) => {
    engine.step(rawDelta)
    const playing = engine.phase === 'running'
    accumulator.current += rawDelta
    if (accumulator.current > .08 || lastPhase.current !== engine.phase) { onFrame(engine.snapshot()); accumulator.current = 0; lastPhase.current = engine.phase }
    for (const event of engine.events.splice(0)) onEvent(event)
    if (player.current) {
      const stride = playing ? Math.sin(engine.elapsed * 18) * .65 : 0
      player.current.position.set(engine.x, engine.y + (engine.slide > 0 ? .15 : .04), 0)
      player.current.scale.y = engine.slide > 0 ? .43 : 1
      player.current.rotation.z = -(engine.lane * 2.4 - engine.x) * .10
      player.current.visible = settings.reducedEffects || engine.invincible <= 0 || Math.floor(engine.elapsed * 9) % 2 === 0
      if (leftLeg.current) leftLeg.current.rotation.x = engine.jump > 0 ? -.7 : stride
      if (rightLeg.current) rightLeg.current.rotation.x = engine.jump > 0 ? .5 : -stride
      if (leftArm.current) leftArm.current.rotation.x = -stride
      if (rightArm.current) rightArm.current.rotation.x = stride
    }
    if (shield.current) { shield.current.visible = engine.shield > 0; shield.current.position.set(engine.x, engine.y + 1.1, 0) }
    if (tiles.current) { for (let i = 0; i < 70; i++) { dummy.position.set(0, -.15, 10 - ((i * 4 - engine.distance + 60000) % 280)); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); tiles.current.setMatrixAt(i, dummy.matrix) }; tiles.current.instanceMatrix.needsUpdate = true }
    if (roadLines.current) { for (let i = 0; i < 100; i++) { dummy.position.set(i % 2 ? -1.2 : 1.2, .006, 10 - ((Math.floor(i / 2) * 5 - engine.distance + 60000) % 250)); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); roadLines.current.setMatrixAt(i, dummy.matrix) }; roadLines.current.instanceMatrix.needsUpdate = true }
    for (const kind of kinds) {
      const mesh = obstacles.current[kind]
      if (!mesh) continue
      let index = 0
      for (const item of engine.entities) {
        if (item.kind !== kind || item.hit || index >= 100) continue
        const pickup = !['barrier', 'overhead', 'gap'].includes(kind)
        dummy.position.set(item.lane * 2.4, kind === 'overhead' ? 1.65 : kind === 'gap' ? .02 : pickup ? 1.05 : .58, engine.distance - item.at)
        dummy.scale.set(kind === 'barrier' ? 1.85 : kind === 'overhead' ? 2 : kind === 'gap' ? 2.2 : .48, kind === 'barrier' ? 1.15 : kind === 'overhead' ? .55 : kind === 'gap' ? .04 : .48, kind === 'gap' ? 2.1 : kind === 'barrier' ? .8 : kind === 'overhead' ? .6 : .48)
        dummy.rotation.set(0, pickup && !settings.reducedEffects ? engine.elapsed * 2 : 0, 0)
        dummy.updateMatrix(); mesh.setMatrixAt(index++, dummy.matrix)
      }
      mesh.count = index; mesh.instanceMatrix.needsUpdate = true
    }
  })
  return <>
    <color attach="background" args={['#08101c']} /><fog attach="fog" args={['#0c1b2c', 32, 165]} />
    <ambientLight intensity={1.5} color="#8dbed4" /><directionalLight position={[2, 12, 8]} intensity={3} color="#99f9ed" /><pointLight position={[-5, 4, -12]} intensity={45} color="#ff459f" distance={25} />
    <Buildings engine={engine} quality={settings.quality} />
    <Box position={[0, -.3, -100]} size={[7.6, .4, 260]} color="#1b2b36" />
    <Box position={[-3.8, .02, -100]} size={[.09, .09, 260]} color="#51eadb" glow /><Box position={[3.8, .02, -100]} size={[.09, .09, 260]} color="#51eadb" glow />
    <Box position={[-4.1, -.5, -100]} size={[.25, 1, 260]} color="#16354b" /><Box position={[4.1, -.5, -100]} size={[.25, 1, 260]} color="#16354b" />
    <instancedMesh ref={tiles} args={[undefined, undefined, 70]} frustumCulled={false}><boxGeometry args={[7.5, .25, 3.92]} /><meshStandardMaterial color="#24343e" metalness={.6} roughness={.4} /></instancedMesh>
    <instancedMesh ref={roadLines} args={[undefined, undefined, 100]} frustumCulled={false}><boxGeometry args={[.04, .02, 2]} /><meshBasicMaterial color="#47828d" /></instancedMesh>
    {kinds.map(kind => <instancedMesh key={kind} ref={ref => { if (ref) obstacles.current[kind] = ref }} args={[undefined, undefined, 100]} frustumCulled={false}>{kind === 'coin' ? <octahedronGeometry args={[.65, 0]} /> : ['shield', 'magnet', 'double', 'time'].includes(kind) ? <icosahedronGeometry args={[.8, 0]} /> : <boxGeometry />}<meshStandardMaterial color={kind === 'gap' ? '#1b0915' : colors[kind]} emissive={colors[kind]} emissiveIntensity={kind === 'gap' ? .12 : .45} metalness={.6} roughness={.3} /></instancedMesh>)}
    <group ref={player}>
      <group ref={leftLeg} position={[-.22, .85, 0]}><Box position={[0, -.35, 0]} size={[.29, .7, .32]} color="#121c29" /><Box position={[0, -.72, .09]} size={[.33, .16, .52]} color="#1f3443" /><Box position={[0, -.79, .1]} size={[.35, .035, .52]} color={accent} glow /></group>
      <group ref={rightLeg} position={[.22, .85, 0]}><Box position={[0, -.35, 0]} size={[.29, .7, .32]} color="#121c29" /><Box position={[0, -.72, .09]} size={[.33, .16, .52]} color="#1f3443" /><Box position={[0, -.79, .1]} size={[.35, .035, .52]} color={accent} glow /></group>
      <Box position={[0, 1.2, 0]} size={[.72, .8, .43]} color="#172332" /><Box position={[0, 1.3, .23]} size={[.46, .45, .035]} color="#243b4b" /><Box position={[0, 1.35, .255]} size={[.065, .36, .025]} color={accent} glow /><Box position={[0, 1.1, .255]} size={[.43, .06, .025]} color={accent} glow />
      <group ref={leftArm} position={[-.49, 1.48, 0]}><Box position={[0, -.3, 0]} size={[.23, .67, .25]} color="#172332" /><Box position={[0, -.07, 0]} size={[.25, .09, .27]} color={accent} glow /></group>
      <group ref={rightArm} position={[.49, 1.48, 0]}><Box position={[0, -.3, 0]} size={[.23, .67, .25]} color="#172332" /><Box position={[0, -.07, 0]} size={[.25, .09, .27]} color={accent} glow /></group>
      <mesh position={[0, 1.95, 0]}><boxGeometry args={[.51, .55, .49]} /><meshStandardMaterial color="#142438" metalness={.7} roughness={.3} /></mesh><Box position={[0, 1.97, .25]} size={[.35, .05, .02]} color={accent} glow /><Box position={[0, 1.68, 0]} size={[.65, .08, .46]} color={accent} glow />
    </group>
    <mesh ref={shield} visible={false}><sphereGeometry args={[1.5, 16, 12]} /><meshBasicMaterial color="#66aaff" wireframe transparent opacity={.2} /></mesh>
  </>
}

export default function RunnerScene(props: { engine: RunnerEngine; settings: Settings; skin: string; onFrame: (s: Snapshot) => void; onEvent: (event: 'coin' | 'hit' | 'power') => void; onReady: () => void }) {
  return <Canvas dpr={props.settings.quality === 'low' ? 1 : [1, 1.5]} camera={{ position: [0, 4.4, 8.8], fov: 62, near: .1, far: 300 }} gl={{ antialias: props.settings.quality === 'high', powerPreference: 'high-performance' }} onCreated={({ camera, gl }) => { camera.lookAt(0, 1.5, -18); gl.setClearColor('#08101c'); props.onReady() }}><CityWorld {...props} /></Canvas>
}
