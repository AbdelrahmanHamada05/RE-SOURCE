# ASTRA — Junior Astronaut Mission Trainer

**ASTRA** is a 2D top-down, pixel-art lunar-outpost management RPG designed to introduce children aged **7–12** to the challenges of living and working on the Moon.

Players explore a lunar base, interact with its crew and equipment, make mission decisions, and keep the outpost operational through a **7-day simulated mission**.

> **Project note:** ASTRA is an educational game. Its seven-day mission, resource reserves, action costs, event effects, and failure thresholds are gameplay abstractions—not an official NASA mission plan or a validated life-support design.

## Game concept

- Explore a lunar base from a top-down perspective.
- Move the astronaut using **WASD** or the **arrow keys**.
- Interact with machines and objects around the base.
- Talk with Commander Nova and the crew through dialogue and choices.
- Manage water, oxygen, food, power, crew stamina, and base integrity.
- Respond to unexpected events and complete the seven-day mission.

The experience takes inspiration from the exploration and dialogue style of 2D RPGs while using an original ASTRA setting, characters, and gameplay.

## Mission structure

The mission lasts **7 in-game days**:

| Day | Mission focus |
| --- | --- |
| 1 | Meet the crew and learn the base systems |
| 2 | Understand water and oxygen management |
| 3 | Manage food production and power |
| 4 | Respond to an unexpected event |
| 5 | Diagnose and repair equipment |
| 6 | Handle a major survival challenge |
| 7 | Complete the final mission assessment |

The seven-day timeline is a game progression system. It does not attempt to reproduce the Moon's actual day/night cycle.

## Core resources

The player monitors:

- **Water** — crew needs and selected base operations.
- **Oxygen** — breathable oxygen reserves.
- **Food** — represented by Food Points (FP).
- **Power** — energy available to operate equipment.
- **Crew stamina** — the crew's overall condition in the simulation.
- **Base integrity** — the condition of the lunar outpost.

### Provisional gameplay starting balance

The following values are initial design proposals for balancing and playtesting. They are not NASA-prescribed reserves.

| Resource | Proposed starting value | Proposed maximum |
| --- | ---: | ---: |
| Water | 120 L | 200 L |
| Oxygen | 30 kg | 50 kg |
| Food | 100 FP | 150 FP |
| Power | 120 kWh | 200 kWh |
| Crew stamina | 100% | 100% |
| Base integrity | 100% | 100% |

**Food Point definition:** 1 FP represents 1,000 kcal in the game model.

### Player actions

Proposed actions include:

- Recycle water.
- Generate oxygen.
- Grow food.
- Repair the base.
- Rest the crew.
- Respond to mission events.

Action yields and energy/resource costs are tunable gameplay parameters and must be playtested before being treated as balanced.

Crew consumption is intended to be simulated automatically over each game day. The player influences survival through resource planning and mission decisions rather than manually feeding each astronaut.

## Events and mission outcomes

Possible events include solar storms, water leaks, equipment malfunctions, dust accumulation, greenhouse problems, successful harvests, and quiet days.

Events create decisions and consequences within the game simulation. Any event penalties or crew effects are gameplay values, not predictions of actual astronaut exposure or health outcomes.

The mission can be put at risk by resource depletion, loss of crew stamina, or critical damage to the base. Exact thresholds are balancing parameters and may change during development.

## Technology

The planned MVP uses a frontend-only architecture:

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Local storage** for local game saves

The game engine is planned as TypeScript modules for resource calculations, actions, crew simulation, daily progression, random events, and mission outcomes.

A separate backend is not required for the initial single-player MVP. NASA data integrations, if used, should be optional and have fallback behavior so the core game remains playable if an external service is unavailable.

## Planned project structure

```text
src/
├── app/
│   └── page.tsx
├── components/
│   ├── GameWorld.tsx
│   ├── ResourceHUD.tsx
│   ├── DialogueBox.tsx
│   ├── ActionMenu.tsx
│   └── MissionReport.tsx
├── game/
│   ├── engine.ts
│   ├── resources.ts
│   ├── actions.ts
│   ├── events.ts
│   ├── crew.ts
│   └── mission.ts
├── data/
│   └── nasaEvents.ts
└── utils/
    └── saveGame.ts
```

This is the proposed organization; files may be added, removed, or renamed as implementation evolves.

## Scientific references and data context

The project may use public educational and scientific resources to inform its learning content and selected event context:

- [NASA API](https://api.nasa.gov/)
- [NASA DONKI — Space Weather Database](https://ccmc.gsfc.nasa.gov/tools/DONKI/)
- [ISS RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/)
- [NASA Open Science Data Repository](https://osdr.nasa.gov/)
- [NASA Environmental Control and Life Support Systems (ECLSS)](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/)
- [NASA Human-System Standard](https://www.nasa.gov/reference/7-0-habit-ability-functions-vol-2/)
- [NASA Lunar Surface Innovation Initiative](https://www.nasa.gov/lunar-surface-technology/)
- [Canadian Space Agency — Food Production Toolkit](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/)

**Scientific integrity:** NASA/ISS data and educational references provide context; they do not automatically validate ASTRA's lunar scenarios or gameplay parameters. ISS radiation measurements are not lunar-surface exposure measurements, space-weather classifications are not direct astronaut dose measurements, and educational crop examples are not guaranteed lunar crop yields. The game should distinguish sourced reference information, engineering assumptions, and invented gameplay values.

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Edit `src/app/page.tsx` to start changing the application. The page updates as you edit.

## Project status

ASTRA is under development. The seven-day mission structure and resource model are design proposals that require implementation, simulation, and playtesting.

---

Built for **NASA Space Apps Challenge Cairo 2026**.
