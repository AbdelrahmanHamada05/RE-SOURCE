// Provisional values for quick balancing. These are fictional gameplay values,
// not NASA guidance or validated life-support specifications.
export const GAME_CONFIG = {
  missionDays: 7,
  actionPointsPerDay: 2,
  saveKey: 'astra-mission-v1',
  world: {
    npc: { x: 50, y: 47, collisionX: 5, collisionY: 6, interactionRadius: 13 },
    moveStep: 2.5,
    bounds: { minX: 7, maxX: 93, minY: 10, maxY: 90 },
    stationCollision: { xRadius: 7.5, yRadius: 8.5 },
    stationInteractionRadius: 12,
  },
  resources: {
    water: { label: 'Water', unit: 'L', start: 120, max: 160, digits: 2 },
    oxygen: { label: 'Oxygen', unit: 'kg', start: 30, max: 60, digits: 2 },
    food: { label: 'Food', unit: 'FP', start: 100, max: 160, digits: 0 },
    power: { label: 'Power', unit: 'kWh', start: 120, max: 120, digits: 0 },
    stamina: { label: 'Crew stamina', unit: '%', start: 100, max: 100, digits: 0 },
    integrity: { label: 'Base integrity', unit: '%', start: 100, max: 100, digits: 0 },
  },
  crewPerDay: { water: 15.14, oxygen: 3.32, food: 12.14 },
  energyPerDay: { solar: 25, baseLoad: 10 },
  greenhouse: { passiveFoodGrowth: 4, powerDraw: 2 },
  penalties: { noWaterStamina: 40, noFoodStamina: 25 },
  events: [
    { day: 2, label: 'Solar dust veil', powerLoss: 8, integrityLoss: 0, staminaLoss: 0 },
    { day: 4, label: 'Micrometeorite scrape', powerLoss: 0, integrityLoss: 10, staminaLoss: 0 },
    { day: 6, label: 'Long comms shift', powerLoss: 0, integrityLoss: 0, staminaLoss: 5 },
  ],
  actions: {
    recycler: { label: 'Recycle water', cost: { power: 5 }, output: { water: 20 }, detail: 'Reserve 5 kWh to recover 20 L of water.' },
    oxygen: { label: 'Generate oxygen', cost: { water: 3, power: 8 }, output: { oxygen: 6 }, detail: 'Reserve 3 L and 8 kWh to generate 6 kg of oxygen.' },
    greenhouse: { label: 'Tend and harvest', cost: { water: 5, power: 5 }, output: { food: 20 }, detail: 'Reserve 5 L and 5 kWh to harvest 20 food points.' },
    repair: { label: 'Repair habitat', cost: { power: 15 }, output: { integrity: 20 }, detail: 'Reserve 15 kWh to restore 20% base integrity.' },
    terminal: { label: 'Run diagnostics', cost: { power: 3 }, output: { stamina: 10 }, detail: 'Reserve 3 kWh to restore 10% crew stamina and log a scan.' },
  },
  penaltiesAtZero: {
    oxygen: 'MISSION FAILURE — oxygen exhausted.',
    integrity: 'MISSION FAILURE — habitat integrity lost.',
    stamina: 'MISSION FAILURE — crew stamina exhausted.',
  },
} as const;

export type ResourceKey = keyof typeof GAME_CONFIG.resources;
export type ActionKey = keyof typeof GAME_CONFIG.actions;
export type ResourceAmounts = Record<ResourceKey, number>;
export type QueuedAction = { id: number; key: ActionKey };
export type PlayerPosition = { x: number; y: number };
export type MissionState = {
  day: number;
  reportDay: number;
  resources: ResourceAmounts;
  queue: QueuedAction[];
  player: PlayerPosition;
  report: string[];
  ended: boolean;
  failed: boolean;
  failureReason: string;
  missionScans: number;
};

export const STARTING_RESOURCES: ResourceAmounts = {
  water: GAME_CONFIG.resources.water.start,
  oxygen: GAME_CONFIG.resources.oxygen.start,
  food: GAME_CONFIG.resources.food.start,
  power: GAME_CONFIG.resources.power.start,
  stamina: GAME_CONFIG.resources.stamina.start,
  integrity: GAME_CONFIG.resources.integrity.start,
};

export const STATIONS: { key: ActionKey; x: number; y: number; icon: string; name: string }[] = [
  { key: 'recycler', x: 23, y: 30, icon: '≋', name: 'WATER RECYCLER' },
  { key: 'oxygen', x: 76, y: 28, icon: 'O₂', name: 'OXYGEN GENERATOR' },
  { key: 'greenhouse', x: 24, y: 72, icon: '♧', name: 'GREENHOUSE' },
  { key: 'terminal', x: 76, y: 72, icon: '▣', name: 'POWER / MISSION TERMINAL' },
  { key: 'repair', x: 50, y: 18, icon: '⚒', name: 'REPAIR BAY' },
];

export const STARTING_PLAYER: PlayerPosition = { x: 50, y: 52 };

export function createNewMission(): MissionState {
  return {
    day: 1,
    reportDay: 0,
    resources: { ...STARTING_RESOURCES },
    queue: [],
    player: { ...STARTING_PLAYER },
    report: [],
    ended: false,
    failed: false,
    failureReason: '',
    missionScans: 0,
  };
}
