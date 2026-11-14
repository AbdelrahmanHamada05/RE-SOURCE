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

type RoomId = 'hub' | 'water' | 'food' | 'power' | 'oxygen';
const NPC = { ...GAME_CONFIG.world.npc, x: 50, y: 72, collisionX: 6, collisionY: 7 };
const ROOM_NAMES: Record<RoomId, { title: string; subtitle: string; accent: string }> = {
  hub: { title: 'CENTRAL HUB', subtitle: 'Shackleton habitat · common area', accent: 'hub' },
  water: { title: 'WATER ROOM', subtitle: 'Recovery, purification & storage', accent: 'water' },
  food: { title: 'GREENHOUSE', subtitle: 'Food production & crop systems', accent: 'food' },
  power: { title: 'POWER ROOM', subtitle: 'Solar distribution & habitat repair', accent: 'power' },
  oxygen: { title: 'OXYGEN ROOM', subtitle: 'Atmosphere generation & monitoring', accent: 'oxygen' },
};
const MACHINE_ROOMS: Record<ActionKey, RoomId> = { recycler: 'water', greenhouse: 'food', repair: 'power', oxygen: 'oxygen', terminal: 'hub' };
const HUB_DOORS: { room: RoomId; x: number; y: number; label: string }[] = [
  { room: 'water', x: 16, y: 51, label: 'WATER' }, { room: 'food', x: 37, y: 51, label: 'FOOD' },
  { room: 'power', x: 63, y: 51, label: 'POWER' }, { room: 'oxygen', x: 84, y: 51, label: 'OXYGEN' },
];
const EXIT_DOOR = { room: 'hub' as RoomId, x: 50, y: 88, label: 'RETURN TO HUB' };
const ROOM_DOORS: Record<RoomId, { room: RoomId; x: number; y: number; label: string }[]> = {
  hub: HUB_DOORS, water: [EXIT_DOOR], food: [EXIT_DOOR], power: [EXIT_DOOR], oxygen: [EXIT_DOOR],
};
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

function stationPosition(key: ActionKey, room: RoomId): { x: number; y: number } | null {
  if (MACHINE_ROOMS[key] !== room) return null;
  return room === 'hub' ? { x: 50, y: 29 } : { x: 50, y: 49 };
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

export default function RoomGame({ onReset }: { onReset: () => void }) {
  const [state, setState] = useState<MissionState>(createNewMission);
  const [room, setRoom] = useState<RoomId>('hub');
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

  const roomStations = useMemo(() => STATIONS.flatMap((station) => {
    const position = stationPosition(station.key, room);
    return position ? [{ station, ...position }] : [];
  }), [room]);
  const roomDoors = ROOM_DOORS[room];
  const proximity = useMemo(() => roomStations
    .map((item) => ({ ...item, distance: Math.hypot(item.x - state.player.x, item.y - state.player.y) }))
    .sort((a, b) => a.distance - b.distance)[0], [roomStations, state.player]);
  const nearbyStation = proximity && proximity.distance <= GAME_CONFIG.world.stationInteractionRadius ? proximity.station : null;
  const nearbyShortfall = nearbyStation ? shortfall(nearbyStation.key, state.resources) : null;
  const nearbyDoor = roomDoors.map((door) => ({ door, distance: Math.hypot(door.x - state.player.x, door.y - state.player.y) })).sort((a, b) => a.distance - b.distance)[0];
  const atMissionTerminal = room === 'hub' && Math.hypot(50 - state.player.x, 29 - state.player.y) <= GAME_CONFIG.world.stationInteractionRadius;
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
    const position = stationPosition(key, room);
    if (!station || !position) return;
    const distance = Math.hypot(position.x - state.player.x, position.y - state.player.y);
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
  }, [insufficientMessage, room, state.player.x, state.player.y, state.resources]);

  const enterRoom = useCallback((nextRoom: RoomId) => {
    setRoom(nextRoom);
    setSelected(null);
    setState((current) => ({ ...current, player: nextRoom === 'hub' ? { x: 50, y: 52 } : { x: 50, y: 72 } }));
    setMessage(`Entered ${ROOM_NAMES[nextRoom].title}. Walk to its main console and press E to inspect it.`);
  }, []);

  const interact = useCallback(() => {
    if (room === 'hub' && Math.hypot(NPC.x - state.player.x, NPC.y - state.player.y) <= NPC.interactionRadius) {
      setMessage(`Commander Nova: Solar adds ${GAME_CONFIG.energyPerDay.solar} kWh at end of day. Crew use ${GAME_CONFIG.crewPerDay.oxygen} kg oxygen each day.`);
      setSelected(null);
      return;
    }
    const nearest = [
      ...roomStations.map((item) => ({ kind: 'machine' as const, item, distance: Math.hypot(item.x - state.player.x, item.y - state.player.y) })),
      ...roomDoors.map((door) => ({ kind: 'door' as const, item: door, distance: Math.hypot(door.x - state.player.x, door.y - state.player.y) })),
      ...(room === 'hub' ? [{ kind: 'crew' as const, item: NPC, distance: Math.hypot(NPC.x - state.player.x, NPC.y - state.player.y) }] : []),
    ]
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest || nearest.distance > GAME_CONFIG.world.stationInteractionRadius) {
      setSelected(null);
      setMessage('Nothing close enough. Walk up to a doorway, console, or Commander Nova, then press E.');
      return;
    }
    if (nearest.kind === 'door') enterRoom(nearest.item.room);
    else if (nearest.kind === 'crew') setMessage(`Commander Nova: Solar adds ${GAME_CONFIG.energyPerDay.solar} kWh daily. Crew use ${GAME_CONFIG.crewPerDay.water} L water, ${GAME_CONFIG.crewPerDay.oxygen} kg oxygen, and ${GAME_CONFIG.crewPerDay.food} FP food.`);
    else openStation(nearest.item.station.key);
  }, [enterRoom, openStation, room, roomDoors, roomStations, state.player]);

  const resetMission = useCallback(() => {
    if (!window.confirm('Start a new 7-day mission? The current ASTRA save will be replaced.')) return;
    localStorage.removeItem(GAME_CONFIG.saveKey);
    setState(createNewMission());
    setRoom('hub');
    setSelected(null);
    setShowReport(false);
    setMessage('New mission started. Commander Nova is standing by.');
  }, []);

  useEffect(() => {
    if (!loaded || state.ended) return;
    const blockedByStation = (x: number, y: number) => roomStations.some((station) => {
      const dx = (x - station.x) / GAME_CONFIG.world.stationCollision.xRadius;
      const dy = (y - station.y) / GAME_CONFIG.world.stationCollision.yRadius;
      return dx * dx + dy * dy < 1;
    });
    const blockedByNpc = (x: number, y: number) => room === 'hub' && (() => {
      const dx = (x - NPC.x) / NPC.collisionX;
      const dy = (y - NPC.y) / NPC.collisionY;
      return dx * dx + dy * dy < 1;
    })();
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
  }, [interact, loaded, room, roomStations, showReport, state.ended]);

  function queueAction(key: ActionKey) {
    if (state.ended) return;
    const station = STATIONS.find((item) => item.key === key);
    const position = stationPosition(key, room);
    if (!station || !position || Math.hypot(position.x - state.player.x, position.y - state.player.y) > GAME_CONFIG.world.stationInteractionRadius) {
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
  const selectedPosition = selected ? stationPosition(selected, room) : null;
  const selectedWithinReach = Boolean(selectedPosition && Math.hypot(selectedPosition.x - state.player.x, selectedPosition.y - state.player.y) <= GAME_CONFIG.world.stationInteractionRadius);

  if (!loaded) return <main className="rs-loading">ASTRA · LOADING FLIGHT LOG…</main>;
  const meta: Record<ResourceKey, { icon: string; name: string }> = { food:{icon:'♧',name:'FOOD'}, water:{icon:'≈',name:'WATER'}, oxygen:{icon:'◉',name:'O₂'}, power:{icon:'ϟ',name:'POWER'}, stamina:{icon:'♥',name:'CREW'}, integrity:{icon:'⬡',name:'HAB'} };
  const objects: Record<RoomId,{name:string;icon:string;x:number;y:number}[]> = {
    hub:[{name:'MOON MAP',icon:'☾',x:20,y:34},{name:'CREW SOFA',icon:'▰',x:80,y:38},{name:'SUPPLY LOCKER',icon:'▣',x:22,y:72}],
    water:[{name:'FILTER TANKS',icon:'▤',x:20,y:37},{name:'WATER CRATES',icon:'▧',x:80,y:37},{name:'PIPE VALVE',icon:'⊙',x:22,y:70}],
    food:[{name:'SEED DRAWER',icon:'▧',x:20,y:37},{name:'GROW LIGHTS',icon:'☼',x:80,y:37},{name:'HARVEST BASKET',icon:'♧',x:22,y:70}],
    power:[{name:'BATTERY BANK',icon:'▥',x:20,y:37},{name:'SOLAR CONTROLS',icon:'ϟ',x:80,y:37},{name:'TOOL BOX',icon:'▣',x:22,y:70}],
    oxygen:[{name:'AIR CYLINDERS',icon:'◉',x:20,y:37},{name:'VENT CONTROLS',icon:'≋',x:80,y:37},{name:'SAMPLE TRAY',icon:'▤',x:22,y:70}],
  };
  const needsHubConsole = room === 'hub' && atMissionTerminal && !state.ended;
  return <main className="rs-game"><section className="rs-screen">
    <header className="rs-hud"><div className="rs-brand"><span>✦</span><b>ASTRA<small>MOONBASE ECHO</small></b></div><div className="rs-day">DAY <b>{String(state.day).padStart(2,'0')}</b><i>/ {GAME_CONFIG.missionDays}</i></div><div className="rs-vitals">{RESOURCE_KEYS.map((key) => <div className={`rs-vital vital-${key}`} key={key}><span>{meta[key].icon}</span><div><small>{meta[key].name}</small><b>{amountText(key,state.resources[key])}</b><i><em style={{width:`${100*state.resources[key]/GAME_CONFIG.resources[key].max}%`}}/></i>{reserved[key]>0&&<sup>−{amountText(key,reserved[key])} HELD</sup>}{pending[key]>0&&<sup>+{amountText(key,pending[key])} PENDING</sup>}</div></div>)}</div><button className="rs-pause" onClick={()=>setMessage('Pause menu: your mission saves automatically. Press a movement key to continue.')}>Ⅱ</button></header>
    <div className={`rs-world room-${room}`}><div className="rs-room-name"><span>✦</span><div><b>{ROOM_NAMES[room].title}</b><small>{ROOM_NAMES[room].subtitle}</small></div><em>☾ LUNAR BASE</em></div>
      <div className="rs-window"><span>·　✦　　·　　✦　·</span><b>●</b><small>{room==='hub'?'SEA OF TRANQUILLITY':ROOM_NAMES[room].title}</small></div><div className="rs-shelf"><i>▰</i><i>▰</i><i>▰</i></div><div className="rs-rug"/><div className="rs-plant">♧<b>▰</b></div><div className="rs-table">FIELD KIT</div>
      {objects[room].map((o)=><button className="rs-prop" key={o.name} style={{left:`${o.x}%`,top:`${o.y}%`}} onClick={()=>setMessage(`${o.name}: a familiar part of the habitat. No operation configured here yet.`)}><b>{o.icon}</b><small>{o.name}</small></button>)}
      {roomDoors.map((door)=><button key={door.room} className={`rs-door ${door.room==='hub'?'door-return':''}`} style={{left:`${door.x}%`,top:`${door.y}%`}} onClick={()=>Math.hypot(door.x-state.player.x,door.y-state.player.y)<=GAME_CONFIG.world.stationInteractionRadius?enterRoom(door.room):setMessage(`Walk to the ${door.label} hatch, then press E.`)}><b>↟</b><small>{door.label}</small></button>)}
      {roomStations.map(({station,x,y})=><button key={station.key} className={`rs-machine ${selected===station.key?'is-selected':''}`} style={{left:`${x}%`,top:`${y}%`}} onClick={()=>openStation(station.key)}><i>{station.icon}</i><b>{station.name}</b><small>PRESS E NEARBY</small></button>)}
      {room==='hub'&&<button className="rs-nova" style={{left:`${NPC.x}%`,top:`${NPC.y}%`}} onClick={()=>{if(Math.hypot(NPC.x-state.player.x,NPC.y-state.player.y)>NPC.interactionRadius){setMessage('Commander Nova is across the hub. Walk closer to talk.');return;}setMessage(`Commander Nova: Solar adds ${GAME_CONFIG.energyPerDay.solar} kWh daily. Crew need ${GAME_CONFIG.crewPerDay.water} L water, ${GAME_CONFIG.crewPerDay.oxygen} kg oxygen, and ${GAME_CONFIG.crewPerDay.food} FP food.`);}}><i>N</i><b>COMMANDER NOVA</b></button>}
      <div className="rs-player" style={{left:`${state.player.x}%`,top:`${state.player.y}%`}} aria-label="Player astronaut"><i/><b/><em/><span/></div>
      {nearbyStation&&<div className={`rs-prompt ${nearbyShortfall?'warn':''}`}><b>{nearbyShortfall?'MACHINE HAS A NOTE':nearbyStation.name}</b><span>{nearbyShortfall?`${amountText(nearbyShortfall.resource,nearbyShortfall.need)} needed · ${amountText(nearbyShortfall.resource,nearbyShortfall.have)} available`:'In range · press E to inspect'}</span></div>}
      {nearbyDoor?.distance<=GAME_CONFIG.world.stationInteractionRadius&&<div className="rs-prompt rs-door-prompt">ENTER {nearbyDoor.door.label} · E</div>}
      <div className="rs-room-foot"><span>JUNIOR CREW · EXPLORATION SHIFT</span><span>{state.queue.length} OPERATIONS PREPARED</span></div>
    </div>
    <footer className="rs-toolbar"><div><b>COMMS</b><span>{message}</span></div><button onClick={()=>setMessage(`Prepared plan: ${state.queue.length} operation(s); outputs arrive after End Day.`)}>FLIGHT LOG <i>{state.queue.length}</i></button><button className="rs-end" disabled={!needsHubConsole} onClick={endDay}>{needsHubConsole?'SIMULATE DAY':'RETURN TO HUB CONSOLE'} ↗</button></footer>
    <div className="rs-controls"><kbd>WASD / ARROWS</kbd> WALK <kbd>E</kbd> INTERACT <span>PROTOTYPE · PARAMETER TEST</span><button onClick={resetMission}>NEW MISSION</button><button onClick={onReset}>REPLAY OPENING</button></div>
  </section>
  {selected&&selectedWithinReach&&<div className="rs-overlay"><section className="rs-machine-window" role="dialog" aria-modal="true"><button className="rs-close" onClick={()=>setSelected(null)}>×</button><header><span>{STATIONS.find(s=>s.key===selected)?.icon}</span><div><small>MOONBASE ECHO · MACHINE INTERFACE</small><h2>{currentStationName}</h2></div><b>{selectedShortfall?'NEEDS SUPPLIES':'READY'}</b></header><p>{GAME_CONFIG.actions[selected].detail}</p><div className="rs-flow"><section><small>INPUT · RESERVED NOW</small><b>{formatAmounts(GAME_CONFIG.actions[selected].cost)}</b></section><span>➜</span><section><small>EXPECTED OUTPUT · END DAY</small><b>{formatAmounts(GAME_CONFIG.actions[selected].output)}</b></section></div>{selectedShortfall&&<div className="rs-alert">⚠ Need {amountText(selectedShortfall.resource,selectedShortfall.need)}; only {amountText(selectedShortfall.resource,selectedShortfall.have)} available.<br/>Machine says: “{MACHINE_SASS[selected][sassTurn[selected]%MACHINE_SASS[selected].length]}”</div>}{state.queue.filter(q=>q.key===selected).map(q=><div className="rs-held" key={q.id}>{GAME_CONFIG.actions[q.key].label} · {formatAmounts(GAME_CONFIG.actions[q.key].cost)} <button onClick={()=>cancelAction(q.id)}>RETRIEVE INPUT ↶</button></div>)}<div className="rs-modal-actions"><button disabled={state.ended||apLeft===0||Boolean(selectedShortfall)} onClick={()=>queueAction(selected)}>RESERVE OPERATION · {apLeft} AP LEFT</button><button onClick={()=>setSelected(null)}>CLOSE</button></div></section></div>}
  {showReport&&<div className="rs-overlay"><section className="rs-modal-window" role="dialog" aria-modal="true"><small>FLIGHT LOG · DAY {state.reportDay} / {GAME_CONFIG.missionDays}</small><h2>{state.failed?'MISSION FAILED':state.ended?'MISSION COMPLETE':'SHIFT REPORT'}</h2>{state.report.map((line,i)=><p key={i}>✦ {line}</p>)}{state.ended?<button onClick={()=>setShowReport(false)}>CLOSE</button>:<button onClick={()=>{setShowReport(false);setRoom('hub');setState(c=>({...c,player:{x:50,y:52}}));}}>BEGIN DAY {state.day}</button>}</section></div>}
  </main>;
}
