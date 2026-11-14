'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GAME_CONFIG,
  STATIONS,
  STARTING_PLAYER,
  createNewMission,
  type ActionKey,
  type MissionState,
  type ResourceAmounts,
  type ResourceKey,
} from './gameConfig';

const NPC = GAME_CONFIG.world.npc;
const RESOURCE_KEYS = Object.keys(GAME_CONFIG.resources) as ResourceKey[];
const MACHINE_SASS: Record<ActionKey, string[]> = {
  recycler: ["Water's not free, astronaut. Neither is my attitude.", "I'd recycle your excuses, but this unit only handles water.", "Low power. Guess we're back to collecting moon dew. Uh-huh."],
  oxygen: ["Need water and power. I can't breathe enthusiasm into oxygen.", "Oxygen production paused. Your lungs may file a complaint.", "Come back with supplies. I'm a generator, not a miracle."],
  greenhouse: ["Five liters short. The plants are thirsty, and frankly, so am I.", "No power, no harvest. These tomatoes refuse to photosynthesize on vibes.", "Out of water? Great, another salad made of disappointment."],
  repair: ["Need more power before I can fix this place. Shocking, I know.", "Repair bay offline. The duct tape budget is also looking grim.", "No charge, no repairs. The habitat will have to stay charmingly dented."],
  terminal: ["Three kilowatts short. Have you tried turning the sun off and on?", "Diagnostics need power. I refuse to think this hard on an empty battery.", "Power first, answers later. That's also my personal motto."],
};
const zeroAmounts = (): ResourceAmounts => ({ water: 0, oxygen: 0, food: 0, power: 0, stamina: 0, integrity: 0 });
const amountText = (resource: ResourceKey, amount: number) => `${amount.toFixed(GAME_CONFIG.resources[resource].digits)} ${GAME_CONFIG.resources[resource].unit}`;

function shortfall(key: ActionKey, stock: ResourceAmounts) {
  const costs = GAME_CONFIG.actions[key].cost;
  for (const [resource, rawNeed] of Object.entries(costs)) {
    const resourceKey = resource as ResourceKey;
    const need = rawNeed as number;
    if (stock[resourceKey] < need) return { resource: resourceKey, need, have: stock[resourceKey] };
  }
  return null;
}

function addCapped(stock: ResourceAmounts, resource: ResourceKey, amount: number) {
  const max = GAME_CONFIG.resources[resource].max;
  const accepted = Math.max(0, Math.min(amount, max - stock[resource]));
  stock[resource] += accepted;
  return amount - accepted;
}

function formatAmounts(values: Partial<ResourceAmounts>) {
  const entries = RESOURCE_KEYS.filter((key) => (values[key] ?? 0) !== 0);
  return entries.map((key) => `${(values[key] ?? 0) > 0 ? '+' : ''}${amountText(key, values[key] ?? 0)}`).join(' · ') || 'No resource change';
}

function restoredSave(value: unknown): MissionState | null {
  if (!value || typeof value !== 'object') return null;
  const saved = value as Partial<MissionState>;
  if (!Number.isInteger(saved.day) || !saved.resources || !Array.isArray(saved.queue)) return null;
  if (!RESOURCE_KEYS.every((key) => Number.isFinite(saved.resources?.[key]))) return null;
  const validQueue = saved.queue.every((item) => item && item.key in GAME_CONFIG.actions && Number.isFinite(item.id));
  if (!validQueue) return null;
  return {
    ...createNewMission(),
    ...saved,
    resources: { ...createNewMission().resources, ...saved.resources },
    queue: saved.queue,
    player: saved.player && Number.isFinite(saved.player.x) && Number.isFinite(saved.player.y) ? saved.player : { ...STARTING_PLAYER },
    report: Array.isArray(saved.report) ? saved.report : [],
  };
}

export default function LunarGame({ onReset }: { onReset: () => void }) {
  const [state, setState] = useState<MissionState>(createNewMission);
  const [message, setMessage] = useState('Commander Nova: Welcome to Shackleton Base. Walk up to a station, press E, then reserve up to two actions.');
  const [selected, setSelected] = useState<ActionKey | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sassTurn, setSassTurn] = useState<Record<ActionKey, number>>({ recycler: 0, oxygen: 0, greenhouse: 0, repair: 0, terminal: 0 });

  const insufficientMessage = useCallback((key: ActionKey, missing: NonNullable<ReturnType<typeof shortfall>>) => {
    const lines = MACHINE_SASS[key];
    const line = lines[sassTurn[key] % lines.length];
    setSassTurn((turns) => ({ ...turns, [key]: turns[key] + 1 }));
    return `${STATIONS.find((item) => item.key === key)?.name}: ${line} Need ${amountText(missing.resource, missing.need)} ${GAME_CONFIG.resources[missing.resource].label.toLowerCase()}, have ${amountText(missing.resource, missing.have)}.`;
  }, [sassTurn]);

  const reserved = useMemo(() => state.queue.reduce((totals, queued) => {
    for (const [resource, amount] of Object.entries(GAME_CONFIG.actions[queued.key].cost)) totals[resource as ResourceKey] += amount as number;
    return totals;
  }, zeroAmounts()), [state.queue]);

  const pending = useMemo(() => state.queue.reduce((totals, queued) => {
    for (const [resource, amount] of Object.entries(GAME_CONFIG.actions[queued.key].output)) totals[resource as ResourceKey] += amount as number;
    return totals;
  }, zeroAmounts()), [state.queue]);

  const proximity = useMemo(() => STATIONS
    .map((station) => ({ station, distance: Math.hypot(station.x - state.player.x, station.y - state.player.y) }))
    .sort((a, b) => a.distance - b.distance)[0], [state.player]);
  const nearbyStation = proximity && proximity.distance <= GAME_CONFIG.world.stationInteractionRadius ? proximity.station : null;
  const nearbyShortfall = nearbyStation ? shortfall(nearbyStation.key, state.resources) : null;
  const apLeft = Math.max(0, GAME_CONFIG.actionPointsPerDay - state.queue.length);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(GAME_CONFIG.saveKey);
        if (stored) {
          const valid = restoredSave(JSON.parse(stored));
          if (valid) setState(valid);
        }
      } catch {
        localStorage.removeItem(GAME_CONFIG.saveKey);
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(GAME_CONFIG.saveKey, JSON.stringify(state));
  }, [loaded, state]);

  const openStation = useCallback((key: ActionKey) => {
    const station = STATIONS.find((item) => item.key === key);
    if (!station) return;
    const distance = Math.hypot(station.x - state.player.x, station.y - state.player.y);
    if (distance > GAME_CONFIG.world.stationInteractionRadius) {
      setSelected(null);
      setMessage(`Too far from ${station.name}. Walk right up to the machine, then press E.`);
      return;
    }
    setSelected(key);
    const missing = shortfall(key, state.resources);
    setMessage(missing
      ? insufficientMessage(key, missing)
      : `${station.name}: ${GAME_CONFIG.actions[key].detail} Press E nearby to inspect, then reserve the operation.`);
  }, [insufficientMessage, state.player.x, state.player.y, state.resources]);

  const interact = useCallback(() => {
    if (Math.hypot(NPC.x - state.player.x, NPC.y - state.player.y) <= NPC.interactionRadius) {
      setMessage(`Commander Nova: Solar adds ${GAME_CONFIG.energyPerDay.solar} kWh at end of day. Crew use ${GAME_CONFIG.crewPerDay.oxygen} kg oxygen each day.`);
      setSelected(null);
      return;
    }
    const nearest = STATIONS.map((station) => ({ station, distance: Math.hypot(station.x - state.player.x, station.y - state.player.y) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest || nearest.distance > GAME_CONFIG.world.stationInteractionRadius) {
      setSelected(null);
      setMessage('No station close enough. Walk nearer to a machine and press E.');
      return;
    }
    openStation(nearest.station.key);
  }, [openStation, state.player]);

  const resetMission = useCallback(() => {
    if (!window.confirm('Start a new 7-day mission? The current ASTRA save will be replaced.')) return;
    localStorage.removeItem(GAME_CONFIG.saveKey);
    setState(createNewMission());
    setSelected(null);
    setShowReport(false);
    setMessage('New mission started. Commander Nova is standing by.');
  }, []);

  useEffect(() => {
    if (!loaded || state.ended) return;
    const blockedByStation = (x: number, y: number) => STATIONS.some((station) => {
      const dx = (x - station.x) / GAME_CONFIG.world.stationCollision.xRadius;
      const dy = (y - station.y) / GAME_CONFIG.world.stationCollision.yRadius;
      return dx * dx + dy * dy < 1;
    });
    const blockedByNpc = (x: number, y: number) => {
      const dx = (x - NPC.x) / NPC.collisionX;
      const dy = (y - NPC.y) / NPC.collisionY;
      return dx * dx + dy * dy < 1;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (showReport) return;
      const key = event.key.toLowerCase();
      const step = GAME_CONFIG.world.moveStep;
      const dx = key === 'arrowleft' || key === 'a' ? -step : key === 'arrowright' || key === 'd' ? step : 0;
      const dy = key === 'arrowup' || key === 'w' ? -step : key === 'arrowdown' || key === 's' ? step : 0;
      if (dx !== 0 || dy !== 0) {
        event.preventDefault();
        setState((current) => {
          const next = {
            x: Math.max(GAME_CONFIG.world.bounds.minX, Math.min(GAME_CONFIG.world.bounds.maxX, current.player.x + dx)),
            y: Math.max(GAME_CONFIG.world.bounds.minY, Math.min(GAME_CONFIG.world.bounds.maxY, current.player.y + dy)),
          };
          if (blockedByStation(next.x, next.y) || blockedByNpc(next.x, next.y)) return current;
          return { ...current, player: next };
        });
      } else if (key === 'e') {
        event.preventDefault();
        interact();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [interact, loaded, showReport, state.ended]);

  function queueAction(key: ActionKey) {
    if (state.ended) return;
    const station = STATIONS.find((item) => item.key === key);
    if (!station || Math.hypot(station.x - state.player.x, station.y - state.player.y) > GAME_CONFIG.world.stationInteractionRadius) {
      setSelected(null);
      setMessage(`Too far away to operate ${station?.name ?? 'that machine'}. Walk closer first.`);
      return;
    }
    if (state.queue.length >= GAME_CONFIG.actionPointsPerDay) {
      setMessage('No action points remain today. Cancel an operation or end the day.');
      return;
    }
    const missing = shortfall(key, state.resources);
    if (missing) {
      setMessage(insufficientMessage(key, missing));
      return;
    }
    const action = GAME_CONFIG.actions[key];
    const queuedId = Date.now();
    setState((current) => {
      if (current.ended || current.queue.length >= GAME_CONFIG.actionPointsPerDay || shortfall(key, current.resources)) return current;
      const nextResources = { ...current.resources };
      for (const [resource, amount] of Object.entries(action.cost)) nextResources[resource as ResourceKey] -= amount as number;
      return { ...current, resources: nextResources, queue: [...current.queue, { id: queuedId, key }] };
    });
    setMessage(`${action.label} reserved. ${formatAmounts(action.cost)} is deducted from available stock now; output arrives at End Day.`);
    setSelected(null);
  }

  function cancelAction(id: number) {
    const item = state.queue.find((queued) => queued.id === id);
    if (!item) return;
    setState((current) => {
      const currentItem = current.queue.find((queued) => queued.id === id);
      if (!currentItem) return current;
      const refunded = { ...current.resources };
      for (const [resource, amount] of Object.entries(GAME_CONFIG.actions[currentItem.key].cost)) refunded[resource as ResourceKey] += amount as number;
      return { ...current, resources: refunded, queue: current.queue.filter((queued) => queued.id !== id) };
    });
    setMessage(`${GAME_CONFIG.actions[item.key].label} cancelled. Its resources and action point are refunded.`);
  }

  function endDay() {
    if (state.ended) return;
    setState((current) => {
      if (current.ended) return current;
      const stock = { ...current.resources };
      const report: string[] = [];
      let missionScans = current.missionScans;

      for (const queued of current.queue) {
        const action = GAME_CONFIG.actions[queued.key];
        for (const [resource, amount] of Object.entries(action.output)) {
          const key = resource as ResourceKey;
          const overflow = addCapped(stock, key, amount as number);
          report.push(`${action.label}: ${formatAmounts({ [key]: (amount as number) - overflow })} delivered.`);
          if (overflow > 0) report.push(`${GAME_CONFIG.resources[key].label} storage full; ${amountText(key, overflow)} could not be stored.`);
        }
        if (queued.key === 'terminal') missionScans += 1;
      }

      const baseDraw = Math.min(stock.power, GAME_CONFIG.energyPerDay.baseLoad);
      stock.power = Math.max(0, stock.power - baseDraw);
      const solarStored = GAME_CONFIG.energyPerDay.solar - addCapped(stock, 'power', GAME_CONFIG.energyPerDay.solar);
      report.push(`Base load −${baseDraw} kWh · solar generated +${GAME_CONFIG.energyPerDay.solar} kWh (stored ${solarStored} kWh).`);

      if (stock.integrity > 0 && stock.power >= GAME_CONFIG.greenhouse.powerDraw) {
        stock.power -= GAME_CONFIG.greenhouse.powerDraw;
        const overflow = addCapped(stock, 'food', GAME_CONFIG.greenhouse.passiveFoodGrowth);
        report.push(`Greenhouse growth +${GAME_CONFIG.greenhouse.passiveFoodGrowth - overflow} FP; −${GAME_CONFIG.greenhouse.powerDraw} kWh.`);
        if (overflow > 0) report.push(`Food storage full; ${amountText('food', overflow)} crop could not be stored.`);
      } else {
        report.push('Greenhouse idle — no power or habitat integrity.');
      }

      const waterUsed = Math.min(stock.water, GAME_CONFIG.crewPerDay.water);
      stock.water = Math.max(0, stock.water - GAME_CONFIG.crewPerDay.water);
      const oxygenUsed = Math.min(stock.oxygen, GAME_CONFIG.crewPerDay.oxygen);
      stock.oxygen = Math.max(0, stock.oxygen - GAME_CONFIG.crewPerDay.oxygen);
      const foodUsed = Math.min(stock.food, GAME_CONFIG.crewPerDay.food);
      stock.food = Math.max(0, stock.food - GAME_CONFIG.crewPerDay.food);
      report.push(`Crew consumed ${amountText('water', waterUsed)}, ${amountText('oxygen', oxygenUsed)}, and ${amountText('food', foodUsed)}.`);

      if (waterUsed < GAME_CONFIG.crewPerDay.water) {
        stock.stamina = Math.max(0, stock.stamina - GAME_CONFIG.penalties.noWaterStamina);
        report.push(`Water shortage: crew stamina −${GAME_CONFIG.penalties.noWaterStamina}%.`);
      }
      if (foodUsed < GAME_CONFIG.crewPerDay.food) {
        stock.stamina = Math.max(0, stock.stamina - GAME_CONFIG.penalties.noFoodStamina);
        report.push(`Food shortage: crew stamina −${GAME_CONFIG.penalties.noFoodStamina}%.`);
      }

      const event = GAME_CONFIG.events.find((item) => item.day === current.day);
      if (event) {
        if (event.powerLoss > 0) stock.power = Math.max(0, stock.power - event.powerLoss);
        if (event.integrityLoss > 0) stock.integrity = Math.max(0, stock.integrity - event.integrityLoss);
        if (event.staminaLoss > 0) stock.stamina = Math.max(0, stock.stamina - event.staminaLoss);
        report.push(`${event.label}: ${[
          event.powerLoss > 0 ? `−${event.powerLoss} kWh power` : '',
          event.integrityLoss > 0 ? `−${event.integrityLoss}% integrity` : '',
          event.staminaLoss > 0 ? `−${event.staminaLoss}% stamina` : '',
        ].filter(Boolean).join(' · ')}.`);
      } else {
        report.push('No major event reported.');
      }

      if (stock.power <= 0) report.push('Power is at zero: powered machines are offline until charge returns.');
      const failure = stock.oxygen <= 0
        ? GAME_CONFIG.penaltiesAtZero.oxygen
        : stock.integrity <= 0
          ? GAME_CONFIG.penaltiesAtZero.integrity
          : stock.stamina <= 0 ? GAME_CONFIG.penaltiesAtZero.stamina : '';
      if (failure) report.push(failure);
      const missionComplete = !failure && current.day >= GAME_CONFIG.missionDays;
      if (missionComplete) report.push('SEVEN-DAY MISSION COMPLETE. Shackleton Base remains operational.');

      return {
        ...current,
        day: current.day >= GAME_CONFIG.missionDays ? current.day : current.day + 1,
        reportDay: current.day,
        resources: stock,
        queue: [],
        report,
        missionScans,
        ended: Boolean(failure) || missionComplete,
        failed: Boolean(failure),
        failureReason: failure || (missionComplete ? 'MISSION COMPLETE' : ''),
      };
    });
    setSelected(null);
    setShowReport(true);
  }

  const currentStationName = selected ? STATIONS.find((item) => item.key === selected)?.name : null;
  const selectedShortfall = selected ? shortfall(selected, state.resources) : null;
  const selectedWithinReach = Boolean(selected && STATIONS.some((station) => station.key === selected && Math.hypot(station.x - state.player.x, station.y - state.player.y) <= GAME_CONFIG.world.stationInteractionRadius));

  if (!loaded) return <main className="game-shell lunar-shell"><div className="save-loading">LOADING MISSION SAVE…</div></main>;

  return <main className="game-shell lunar-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">A</span><span>ASTRA <small>PROTOTYPE · PARAMETER TEST</small></span></a>
      <div className="top-center"><span className="live-dot" /> SHACKLETON BASE <i /> {state.ended ? state.failureReason : 'MISSION ACTIVE'}</div>
      <div className="top-actions"><button className="skip-button" onClick={resetMission}>NEW MISSION</button></div>
    </header>

    <div className="lunar-top"><span>DAY <b>{state.day}</b> / {GAME_CONFIG.missionDays} <small>· PROVISIONAL VALUES</small></span><span>AP <b>{apLeft}</b> / {GAME_CONFIG.actionPointsPerDay}</span><span>SCANS <b>{state.missionScans}</b></span></div>

    <div className="lunar-layout">
      <section className="base-map" aria-label="Explorable Shackleton lunar base map">
        <div className="map-title">SHACKLETON HABITAT <span>SECTOR A · PRESSURIZED</span></div>
        <div className="window-wall"><span>✦　 ·　 ✦　 ·　 ✦</span><b>MOONBASE ECHO</b><span>✦　 ·　 ✦　 ·　 ✦</span></div>
        <div className="floor-grid" />
        <div className="base-rug" aria-hidden="true" /><div className="plant-pot" aria-hidden="true"><i>✦</i><b>⌁</b></div>
        <div className="workbench" aria-hidden="true"><i>FIELD KIT</i><b>▱</b></div>
        {STATIONS.map((station) => <button key={station.key} className={`station station-${station.key} ${selected === station.key ? 'station-selected' : ''}`} style={{ left: `${station.x}%`, top: `${station.y}%` }} onClick={() => openStation(station.key)} aria-label={`Focus ${station.name}`}><b>{station.icon}</b><span>{station.name}</span></button>)}
        <button className="npc" style={{ left: `${NPC.x}%`, top: `${NPC.y}%` }} onClick={() => { setSelected(null); setMessage(`Commander Nova: Solar adds ${GAME_CONFIG.energyPerDay.solar} kWh daily. Crew use ${GAME_CONFIG.crewPerDay.oxygen} kg oxygen, ${GAME_CONFIG.crewPerDay.water} L water, and ${GAME_CONFIG.crewPerDay.food} FP food each day.`); }}><b>N</b><span>COMMANDER NOVA</span></button>
        <div className="player" style={{ left: `${state.player.x}%`, top: `${state.player.y}%` }} aria-label="Player astronaut"><i className="astronaut-pack" /><i className="astronaut-helmet"><b /></i><i className="astronaut-suit" /><i className="astronaut-leg leg-left" /><i className="astronaut-leg leg-right" /></div>
        {nearbyStation && <div className={`proximity-alert ${nearbyShortfall ? 'resource-low' : ''}`}><b>{nearbyShortfall ? 'RESOURCE ALERT' : nearbyStation.name}</b><span>{nearbyShortfall ? `Need ${amountText(nearbyShortfall.resource, nearbyShortfall.need)} · have ${amountText(nearbyShortfall.resource, nearbyShortfall.have)}` : `${apLeft} AP available · press E to interact`}</span></div>}
        <div className="map-help">WASD / ARROWS MOVE <i>·</i> E INTERACT <i>·</i> CLICK STATION TO FOCUS</div>
      </section>

      <aside className="base-sidebar">
        <section className="resource-card"><h2>BASE INVENTORY <small>AVAILABLE · RESERVED · PENDING</small></h2>
          <div className="resource-legend"><span>RESOURCE</span><span>AVAILABLE</span><span>HELD</span><span>PENDING</span></div>
          {RESOURCE_KEYS.map((key) => <div className="resource-row" key={key}><span>{GAME_CONFIG.resources[key].label}</span><b>{amountText(key, state.resources[key])}</b><em>{reserved[key] > 0 ? `−${amountText(key, reserved[key])}` : '—'}</em><i>{pending[key] > 0 ? `+${amountText(key, pending[key])}` : '—'}</i></div>)}
        </section>

        <section className="queue-card"><h2>TODAY’S PLAN <small>{state.queue.length}/{GAME_CONFIG.actionPointsPerDay} ACTIONS</small></h2>
          {state.queue.length === 0 ? <p className="empty-queue">No operations reserved. Walk to a station and choose a task.</p> : state.queue.map((queued, index) => {
            const operation = GAME_CONFIG.actions[queued.key];
            return <div className="queued-action" key={queued.id}><span>{String(index + 1).padStart(2, '0')}</span><div><b>{operation.label}</b><small>Held: {formatAmounts(operation.cost)} · Arrives at End Day: {formatAmounts(operation.output)}</small></div><button onClick={() => cancelAction(queued.id)} aria-label={`Cancel ${operation.label} and refund resources`}>×</button></div>;
          })}
          <button className="end-day" disabled={state.ended} onClick={endDay}>END DAY · RESOLVE QUEUE <b>↗</b></button>
          {state.ended && <button className="end-day new-mission-inline" onClick={resetMission}>START NEW MISSION</button>}
        </section>
      </aside>
    </div>

    <div className="message-bar" aria-live="polite"><span>COMMS</span>{message}</div>
    {selected && selectedWithinReach && <div className="operation-panel" role="dialog" aria-label={`${currentStationName} operation`}>
      <button className="panel-close" onClick={() => setSelected(null)} aria-label="Close station panel">×</button>
      <small>STATION OPERATION · {apLeft} AP LEFT</small><h3>{currentStationName}</h3>
      <p>{GAME_CONFIG.actions[selected].detail}</p>
      <div className="operation-costs"><span>RESERVE COST</span><b>{formatAmounts(GAME_CONFIG.actions[selected].cost)}</b><span>PENDING OUTPUT</span><b>{formatAmounts(GAME_CONFIG.actions[selected].output)}</b></div>
      {selectedShortfall && <p className="operation-warning">INSUFFICIENT {GAME_CONFIG.resources[selectedShortfall.resource].label.toUpperCase()}: need {amountText(selectedShortfall.resource, selectedShortfall.need)}, available {amountText(selectedShortfall.resource, selectedShortfall.have)}.</p>}
      {apLeft === 0 && <p className="operation-warning">NO ACTION POINTS LEFT TODAY.</p>}
      <button className={selectedShortfall ? 'resource-attempt' : ''} disabled={state.ended || apLeft === 0} onClick={() => queueAction(selected)}>{selectedShortfall ? 'TRY OPERATION · ASK MACHINE' : 'RESERVE NOW'} <b>· 1 AP</b></button>
      <button className="cancel-operation" onClick={() => setSelected(null)}>BACK TO BASE</button>
    </div>}

    <footer className="lunar-foot">PROTOTYPE ONLY · FOR TESTING GAME PARAMETERS · FICTIONAL VALUES, NOT NASA-VALIDATED <button onClick={onReset}>REPLAY OPENING STORY</button></footer>

    {showReport && <div className="report-backdrop"><section className="report-modal" role="dialog" aria-modal="true" aria-label="End of day report"><small>END OF DAY · DAY {state.reportDay} / {GAME_CONFIG.missionDays}</small><h2>{state.failed ? 'MISSION FAILED' : state.ended ? 'MISSION COMPLETE' : 'SHIFT REPORT'}</h2>{state.report.map((line, index) => <p key={index}>✦ {line}</p>)}{state.ended ? <button onClick={() => setShowReport(false)}>CLOSE REPORT</button> : <button onClick={() => setShowReport(false)}>BEGIN DAY {state.day}</button>}</section></div>}
  </main>;
}
