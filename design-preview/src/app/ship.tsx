'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GAME_CONFIG, type ActionKey } from './gameConfig';

type CrewId = 'nova' | 'engineer' | 'scientist';
type ShipPhase = 'orientation' | 'approach' | 'landed';
type Conversation = { id: CrewId | 'wake'; name: string; lines: string[]; index: number };
type Position = { x: number; y: number };

const CREW: Record<CrewId, { name: string; callsign: string; color: string; x: number; y: number; collisionX: number; collisionY: number; first: string[]; repeat: string[] }> = {
  nova: {
    name: 'COMMANDER NOVA', callsign: 'MISSION COMMAND', color: '#63c9c1', x: 20, y: 35, collisionX: 4, collisionY: 6,
    first: ['NOVA: Easy. You’re aboard the Asterion, headed for Shackleton Base on the Moon.', 'NOVA: You struck your helmet on the hatch during transfer. I thought you were joking when you asked what mission.', 'YOU: I don’t remember signing up for a lunar mission.', 'NOVA: Seven days at the base. Today is Day 0: orientation only. We do not consume supplies until Day 1.'],
    repeat: ['NOVA: Still aboard the Asterion. You’re on the crew manifest for the seven-day lunar mission.', 'NOVA: Take your time. Day 0 is a no-consumption tutorial; the survival simulation starts on Day 1.'],
  },
  engineer: {
    name: 'ENGINEER', callsign: 'LIFE-SUPPORT SYSTEMS', color: '#e0a675', x: 50, y: 35, collisionX: 4, collisionY: 6,
    first: ['ENGINEER: You’re the crew systems trainee. You clipped your helmet on the hatch and forgot the Moon mission?', 'ENGINEER: I’ll show you the recycler, oxygen generator, repair bay, greenhouse, and mission terminal.', 'ENGINEER: Walk up to a console and press E. We can review every cost and output without running the machine.'],
    repeat: ['ENGINEER: The consoles are tutorial-only in transit. Inspect them as often as you like; they don’t reserve or consume anything.'],
  },
  scientist: {
    name: 'SCIENTIST', callsign: 'CREW BIOLOGY', color: '#bca0e3', x: 80, y: 35, collisionX: 4, collisionY: 6,
    first: ['SCIENTIST: You’re on a lunar research mission. You hit your helmet, then asked if the Moon was a real place.', 'SCIENTIST: The greenhouse grows food, while our life-support systems keep the crew supplied.', 'SCIENTIST: Day 0 is frozen: no crew resources are consumed, no crops advance, and no events resolve.', `SCIENTIST: On the Moon, the crew uses ${GAME_CONFIG.crewPerDay.water} L water, ${GAME_CONFIG.crewPerDay.oxygen} kg oxygen, and ${GAME_CONFIG.crewPerDay.food} FP food per day.`, `SCIENTIST: Solar adds ${GAME_CONFIG.energyPerDay.solar} kWh/day, the base uses ${GAME_CONFIG.energyPerDay.baseLoad} kWh/day, and passive greenhouse growth adds ${GAME_CONFIG.greenhouse.passiveFoodGrowth} FP for ${GAME_CONFIG.greenhouse.powerDraw} kWh.`],
    repeat: ['SCIENTIST: On the Moon, watch the water, oxygen, food, power, stamina, and habitat integrity readings each day.'],
  },
};

const SHIP_MACHINES: { key: ActionKey; x: number; y: number; icon: string; label: string; description: string }[] = [
  { key: 'recycler', x: 20, y: 57, icon: '≋', label: 'WATER RECYCLER', description: 'Filters wastewater and returns clean water to the crew reserve.' },
  { key: 'oxygen', x: 40, y: 57, icon: 'O₂', label: 'OXYGEN GENERATOR', description: 'Uses water and electricity to produce breathable oxygen.' },
  { key: 'greenhouse', x: 60, y: 57, icon: '♧', label: 'GREENHOUSE', description: `Tends crops and harvests food. On a simulated surface day, passive growth adds ${GAME_CONFIG.greenhouse.passiveFoodGrowth} FP for ${GAME_CONFIG.greenhouse.powerDraw} kWh. The crop timer is paused during Day 0.` },
  { key: 'repair', x: 80, y: 57, icon: '⚒', label: 'REPAIR BAY', description: 'Restores habitat integrity using stored electrical power.' },
  { key: 'terminal', x: 50, y: 73, icon: '▣', label: 'MISSION TERMINAL', description: 'Runs diagnostics, restores crew stamina, and records a mission scan.' },
];

const COST_NOTE: Partial<Record<ActionKey, string>> = {
  recycler: 'Would use: 5 kWh power', oxygen: 'Would use: 3 L water + 8 kWh power',
  greenhouse: 'Would use: 5 L water + 5 kWh power', repair: 'Would use: 15 kWh power', terminal: 'Would use: 3 kWh power',
};

function amountFor(key: string, value: number) {
  const resource = GAME_CONFIG.resources[key as keyof typeof GAME_CONFIG.resources];
  return `${value.toFixed(resource.digits)} ${resource.unit}`;
}

function amounts(values: Partial<Record<keyof typeof GAME_CONFIG.resources, number>>) {
  return Object.entries(values).map(([key, value]) => amountFor(key, value)).join(' + ') || 'No resource change';
}

function Astronaut({ color, commander = false }: { color: string; commander?: boolean }) {
  return <span className={`ship-astronaut ${commander ? 'ship-commander' : ''}`} aria-hidden="true">
    <i className="ship-pack" /><i className="ship-helmet"><b /></i><i className="ship-suit" style={{ backgroundColor: color }} /><i className="ship-leg ship-leg-left" /><i className="ship-leg ship-leg-right" />
  </span>;
}

export default function ShipTutorial({ onBeginDayOne, onReplay }: { onBeginDayOne: () => void; onReplay: () => void }) {
  const [phase, setPhase] = useState<ShipPhase>('orientation');
  const [player, setPlayer] = useState<Position>({ x: 50, y: 84 });
  const [visitedCrew, setVisitedCrew] = useState<CrewId[]>([]);
  const [visitedMachines, setVisitedMachines] = useState<ActionKey[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>({ id: 'wake', name: 'YOU', lines: ['Where am I?'], index: 0 });
  const [selectedMachine, setSelectedMachine] = useState<ActionKey | null>(null);
  const [message, setMessage] = useState('DAY 0 · Aboard the Asterion. No resources, stamina, crops, or events advance during this tutorial.');
  const [landingStep, setLandingStep] = useState(0);

  const done = visitedCrew.length === Object.keys(CREW).length && visitedMachines.length === SHIP_MACHINES.length;
  const visitedCrewSet = useMemo(() => new Set(visitedCrew), [visitedCrew]);
  const visitedMachineSet = useMemo(() => new Set(visitedMachines), [visitedMachines]);

  const openCrew = useCallback((id: CrewId) => {
    const crew = CREW[id];
    if (Math.hypot(crew.x - player.x, crew.y - player.y) > GAME_CONFIG.world.npc.interactionRadius) {
      setMessage(`Walk closer to ${crew.name}, then press E to talk.`);
      return;
    }
    const repeat = visitedCrewSet.has(id);
    setConversation({ id, name: crew.name, lines: repeat ? crew.repeat : crew.first, index: 0 });
    setSelectedMachine(null);
    setMessage(`Talking with ${crew.name}. Press Space, Enter, or E to continue.`);
  }, [player, visitedCrewSet]);

  const openMachine = useCallback((key: ActionKey) => {
    const machine = SHIP_MACHINES.find((item) => item.key === key);
    if (!machine) return;
    if (Math.hypot(machine.x - player.x, machine.y - player.y) > GAME_CONFIG.world.stationInteractionRadius) {
      setMessage(`Walk closer to ${machine.label}, then press E to inspect it.`);
      return;
    }
    setSelectedMachine(key);
    setConversation(null);
    setVisitedMachines((seen) => seen.includes(key) ? seen : [...seen, key]);
    setMessage(`${machine.label} · Day 0 preview only. This console does not operate during the tutorial.`);
  }, [player]);

  const advanceConversation = useCallback(() => {
    if (!conversation) return;
    if (conversation.index < conversation.lines.length - 1) {
      setConversation((current) => current ? { ...current, index: current.index + 1 } : current);
      return;
    }
    if (conversation.id !== 'wake') setVisitedCrew((seen) => seen.includes(conversation.id as CrewId) ? seen : [...seen, conversation.id as CrewId]);
    setConversation(null);
    setMessage('Walk around the cabin. Talk to all three crew and inspect all five system consoles to complete Day 0.');
  }, [conversation]);

  const interact = useCallback(() => {
    if (conversation) { advanceConversation(); return; }
    const targets = [
      ...Object.entries(CREW).map(([id, crew]) => ({ kind: 'crew' as const, id: id as CrewId, distance: Math.hypot(crew.x - player.x, crew.y - player.y) })),
      ...SHIP_MACHINES.map((machine) => ({ kind: 'machine' as const, id: machine.key, distance: Math.hypot(machine.x - player.x, machine.y - player.y) })),
    ].sort((a, b) => a.distance - b.distance);
    const nearest = targets[0];
    if (!nearest || nearest.distance > GAME_CONFIG.world.stationInteractionRadius) {
      setMessage('Nothing close enough to interact with. Walk up to a crew member or console and press E.');
      return;
    }
    if (nearest.kind === 'crew') openCrew(nearest.id);
    else openMachine(nearest.id);
  }, [advanceConversation, conversation, openCrew, openMachine, player]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (phase !== 'orientation') return;
      const key = event.key.toLowerCase();
      if (conversation && (key === ' ' || key === 'enter' || key === 'e')) {
        event.preventDefault();
        advanceConversation();
        return;
      }
      if (conversation) return;
      const step = GAME_CONFIG.world.moveStep;
      const dx = key === 'arrowleft' || key === 'a' ? -step : key === 'arrowright' || key === 'd' ? step : 0;
      const dy = key === 'arrowup' || key === 'w' ? -step : key === 'arrowdown' || key === 's' ? step : 0;
      if (dx || dy) {
        event.preventDefault();
        setPlayer((current) => {
          const next = { x: Math.max(8, Math.min(92, current.x + dx)), y: Math.max(27, Math.min(88, current.y + dy)) };
          const hitsMachine = SHIP_MACHINES.some((machine) => ((next.x - machine.x) / 5.5) ** 2 + ((next.y - machine.y) / 7) ** 2 < 1);
          const hitsCrew = Object.values(CREW).some((crew) => ((next.x - crew.x) / 3.7) ** 2 + ((next.y - crew.y) / 5.5) ** 2 < 1);
          return hitsMachine || hitsCrew ? current : next;
        });
      } else if (key === 'e') {
        event.preventDefault();
        interact();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advanceConversation, conversation, interact, phase]);

  useEffect(() => {
    if (phase !== 'approach') return;
    const timer = window.setTimeout(() => {
      if (landingStep < 2) setLandingStep((step) => step + 1);
      else setPhase('landed');
    }, 1900);
    return () => window.clearTimeout(timer);
  }, [landingStep, phase]);

  function beginApproach() {
    setConversation(null);
    setSelectedMachine(null);
    setPhase('approach');
    setLandingStep(0);
  }

  const landingCopy = [
    ['LUNAR APPROACH', 'The Asterion swings into low lunar orbit. Shackleton Base appears beyond the glass.'],
    ['DESCENT BURN', 'Commander Nova calls the landing sequence. The cabin shivers as the engines fire.'],
    ['TOUCHDOWN', 'Landing struts lock into the regolith. The seven-day surface mission is ready to begin.'],
  ][landingStep];

  return <main className="game-shell lunar-shell ship-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={(event) => event.preventDefault()}><span className="brand-mark">A</span><span>ASTRA <small>DAY 0 · ASTERION TRANSFER</small></span></a>
      <div className="top-center"><span className="live-dot" /> {phase === 'orientation' ? 'ORIENTATION · NO CONSUMPTION' : phase === 'landed' ? 'LANDING COMPLETE' : 'LUNAR APPROACH'}</div>
      <button className="skip-button" onClick={onReplay}>REPLAY OPENING</button>
    </header>

    {phase === 'orientation' ? <>
      <div className="lunar-top ship-status"><span>DAY <b>00</b> / 07 <small>· TRANSFER TUTORIAL</small></span><span>CREW <b>{visitedCrew.length}</b> / 3</span><span>SYSTEMS <b>{visitedMachines.length}</b> / 5</span></div>
      <div className="ship-layout">
        <section className="ship-map" aria-label="Asterion spacecraft transfer cabin">
          <div className="ship-window"><span>☾</span><b>EARTH–MOON TRANSFER</b><i>✦　 ·　 ✦　 ·　 ✦</i></div>
          <div className="ship-floor" />
          <div className="ship-console ship-pilot-console" aria-hidden="true"><i>FLIGHT DECK</i><b>▥ ▥ ▥</b></div>
          <div className="ship-cot ship-cot-left" aria-hidden="true"><i>CREW BERTH</i><b>▰</b></div><div className="ship-cot ship-cot-right" aria-hidden="true"><i>CREW BERTH</i><b>▰</b></div>
          {SHIP_MACHINES.map((machine) => <button key={machine.key} className={`ship-machine ship-machine-${machine.key} ${selectedMachine === machine.key ? 'ship-machine-selected' : ''} ${visitedMachineSet.has(machine.key) ? 'ship-visited' : ''}`} style={{ left: `${machine.x}%`, top: `${machine.y}%` }} onClick={() => openMachine(machine.key)} aria-label={`Inspect ${machine.label}`}><b>{machine.icon}</b><span>{machine.label}</span></button>)}
          {(Object.entries(CREW) as [CrewId, typeof CREW[CrewId]][]).map(([id, crew]) => <button key={id} className={`ship-npc ${visitedCrewSet.has(id) ? 'ship-visited' : ''}`} style={{ left: `${crew.x}%`, top: `${crew.y}%` }} onClick={() => openCrew(id)} aria-label={`Talk to ${crew.name}`}><Astronaut color={crew.color} commander={id === 'nova'} /><span>{crew.name}</span></button>)}
          <div className="ship-player" style={{ left: `${player.x}%`, top: `${player.y}%` }} aria-label="Player astronaut"><Astronaut color="#5bb6ba" /></div>
          {conversation && <div className="ship-thought"><b>{conversation.name}</b><span>{conversation.lines[conversation.index]}</span>{conversation.lines.length > 1 && <small>{conversation.index + 1} / {conversation.lines.length} · SPACE / ENTER</small>}</div>}
          <div className="ship-map-help">WASD / ARROWS MOVE <i>·</i> E INTERACT <i>·</i> SPACE / ENTER CONTINUE</div>
        </section>
        <aside className="ship-sidebar">
          <section className="ship-card"><h2>DAY 0 BRIEFING</h2><p>Orientation aboard the Asterion. Take your time: this tutorial is repeatable and does not change the lunar mission state.</p><div className="ship-check-row"><b>CREW BRIEFINGS</b><span>{visitedCrew.length} / 3</span></div>{(Object.entries(CREW) as [CrewId, typeof CREW[CrewId]][]).map(([id, crew]) => <div className="ship-progress" key={id}><i className={visitedCrewSet.has(id) ? 'checked' : ''}>{visitedCrewSet.has(id) ? '✓' : '·'}</i><span>{crew.name}</span></div>)}<div className="ship-check-row"><b>SYSTEM CONSOLES</b><span>{visitedMachines.length} / 5</span></div>{SHIP_MACHINES.map((machine) => <div className="ship-progress" key={machine.key}><i className={visitedMachineSet.has(machine.key) ? 'checked' : ''}>{visitedMachineSet.has(machine.key) ? '✓' : '·'}</i><span>{machine.label}</span></div>)}</section>
          {conversation ? <section className="ship-card ship-dialogue"><h2>{conversation.name}</h2><p>{conversation.lines[conversation.index]}</p><button className="ship-primary" onClick={advanceConversation}>{conversation.index < conversation.lines.length - 1 ? 'CONTINUE ↵' : 'CLOSE DIALOGUE ↵'}</button></section> : selectedMachine ? (() => { const machine = SHIP_MACHINES.find((item) => item.key === selectedMachine)!; const operation = GAME_CONFIG.actions[selectedMachine]; return <section className="ship-card ship-dialogue"><button className="panel-close" onClick={() => setSelectedMachine(null)}>×</button><small>DAY 0 · INSPECTION ONLY</small><h2>{machine.label}</h2><p>{machine.description}</p><div className="ship-cost"><span>OPERATION COST</span><b>{amounts(operation.cost)}</b><span>EXPECTED OUTPUT</span><b>{amounts(operation.output)}</b></div><p className="ship-no-run">{COST_NOTE[selectedMachine]} · Nothing is spent during this tutorial. This is a read-only briefing.</p></section>; })() : <section className="ship-card ship-dialogue"><h2>TRANSFER CABIN</h2><p>{message}</p></section>}
          <div className="ship-warning">PROTOTYPE TUTORIAL · NO RESOURCE USE · NO CROP GROWTH · NO EVENTS</div>
          {done && <button className="ship-time-skip" onClick={beginApproach}>TIME SKIP <b>→</b></button>}
        </aside>
      </div>
    </> : <section className={`landing-scene landing-step-${landingStep}`}>
      <div className="landing-window"><span>EARTH</span><i>☾</i><b>SHACKLETON BASE</b><em className="landing-ship">▰</em></div>
      <div className="landing-caption"><small>{phase === 'landed' ? 'DAY 0 COMPLETE' : `APPROACH SEQUENCE 0${landingStep + 1} / 03`}</small><h1>{phase === 'landed' ? 'DAY 1 · LUNAR SURFACE' : landingCopy[0]}</h1><p>{phase === 'landed' ? 'The crew has landed. Day 0 used no supplies and advanced no systems. Your seven-day lunar mission starts now.' : landingCopy[1]}</p>
        {phase === 'landed' ? <button className="ship-time-skip" onClick={onBeginDayOne}>BEGIN DAY 1 <b>→</b></button> : <div className="landing-progress"><i style={{ width: `${((landingStep + 1) / 3) * 100}%` }} /></div>}
      </div>
    </section>}
    <footer className="lunar-foot">PROTOTYPE ONLY · DAY 0 IS A NON-CONSUMING TUTORIAL · FICTIONAL TEST PARAMETERS <button onClick={onReplay}>REPLAY OPENING</button></footer>
  </main>;
}
