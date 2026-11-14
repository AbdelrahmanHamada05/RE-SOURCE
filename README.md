# RE:SOURCE - Junior Astronaut Mission Trainer

RE:SOURCE is a browser game about the systems and decisions involved in a simulated lunar outpost mission. The opening story leads into a no-consumption spacecraft tutorial (Day 0), then a seven-day survival simulation (Days 1-7).

All resource values, crop yields, hazards, and mission outcomes are game parameters. They are not NASA operating procedures, measurements, or validated life-support guidance.

## Run the game

Requirements: Node.js with npm.

From the project folder, install the locked dependencies once and start the development server:

    npm install
    npm run dev

Open http://localhost:3000. To make a production build, run npm run build, then npm run start.

The same Next.js project is in Desktop/re_source. The original working Git repository remains in Desktop/astra and its origin points to the GitHub repository RE-SOURCE.

## What runs at the home page

The canonical game is the complete, self-contained browser game in public/mission-trainer.html. Next.js serves files under public from the site root, so this file is available at /mission-trainer.html. The App Router home page in src/app/page.tsx fills the viewport with an iframe that opens that URL. The iframe keeps the original HTML, CSS, canvas art, and JavaScript together and avoids rewriting the game engine during the migration.

The root layout in src/app/layout.tsx supplies the document metadata and global stylesheet. The app page is a small React server component; the game itself runs in the browser from the static HTML file.

## Main game flow

1. The visual-novel opening introduces the lunar-resource question in the classroom, continues through the trip home and bedroom, then transitions into the spacecraft.
2. Day 0 is a safe tutorial. The player speaks with Commander Nova, the Engineer, and the Scientist and inspects machines. No daily crew usage, crop growth, events, or survival failure is applied during this phase.
3. The lunar landing starts Day 1. The player explores the base and plans machine actions while monitoring the HUD.
4. Ending each day applies the queued actions and daily simulation, produces a report, resolves the day's configured event, and advances the mission.
5. Reaching the end of Day 7 completes the mission if the survival checks still pass. Critical depletion or habitat failure can end it earlier.

The current Day 0 completion check requires all three crew conversations and inspection of at least three machines. The HUD tracks inspection progress across the five tutorial machines.

## Full-screen desktop version (Windows)

The project can also be packaged as a standalone Windows executable. It opens the canonical game fullscreen and hides the desktop menu bar. Use Escape while playing to open the pause menu. From there, Resume returns to play, Main Menu returns to the title screen, and Exit Game closes the desktop app. Escape from the title screen exits the desktop app. The browser version remains available at `/mission-trainer.html`; browsers may restrict closing their own tab, so its Exit Game action explains that limitation.

To run the desktop app locally during development:

    npm install
    npm run desktop:dev

To create the portable 64-bit Windows executable:

    npm run desktop:package

The output is written to `dist/desktop/RE-SOURCE-Mission-Trainer-0.1.0-x64.exe`. It can be shared as a single downloadable file; recipients do not need Node.js or a separate game installation. The `dist/desktop/` build output is excluded from Git. Published downloads are attached to GitHub Releases.

Desktop wrapper details:

- `desktop/main.cjs` creates the fullscreen Electron window, loads the canonical HTML game, handles app quit and fullscreen requests, and applies the window security settings.
- `desktop/preload.cjs` exposes only the small desktop bridge needed by the game: app identity, settings, quit, and fullscreen toggle. The game page does not receive direct Node.js access.
- `desktop/desktop-settings.json` controls the app title, initial window dimensions, fullscreen behavior, background color, and Escape menu labels. JSON does not support comments; the settings are documented here.
- `package.json` defines `desktop:dev` and `desktop:package` and configures electron-builder to include the wrapper and public game assets in the portable executable.

## Controls and interface

- Arrow keys move the astronaut through the rooms; movement is collision-checked against walls, furniture, and room bounds.
- Enter opens the nearby object or machine. The interaction prompt also works with a pointer click.
- Enter, Space, or Right Arrow advances dialogue. In desktop play, Escape opens the pause menu; from the title screen it exits the app. In a browser, Escape opens the game pause or exit menu.
- Machine dialogs show what a machine does, what goes in, what comes out, and when an output becomes available.
- Queued inputs are reserved when an action is inserted. The pending-action dialog lets the player cancel queued work and refund its reserved costs.
- The Crew Galley is immediate: consuming food or water restores stamina at once and cannot be undone.
- Day 0 tutorials are informational and do not reserve or consume supplies.

The updated machine interface uses the shared MACHINE_INFO descriptions and the shared machine-menu renderer. Resource chips identify inputs, shortages, and outputs. Greenhouse dialogs reflect each bed's Empty, Growing, or Mature state and allow switching between the two beds.

## Game balance and resource model

The main HTML game defines its settings in the JavaScript CONFIG object near the beginning of its script. These are the current starting values and limits:

| Resource | Start | Maximum | Unit |
| --- | ---: | ---: | --- |
| Water | 100 | 150 | L |
| Oxygen | 28 | 40 | kg |
| Food | 80 | 120 | FP |
| Power | 60 | 100 | kWh |
| Base integrity | 100 | 100 | % |
| Crew stamina | 100 | 100 | % |

Food Points are a game unit; 1 FP is described as approximately 1,000 kcal. The simulated crew of four uses 15.14 L of water, 3.32 kg of oxygen, and 12.14 FP of food per day. Solar generation adds 25 kWh per day and the base load uses 10 kWh, for a nominal net gain of 15 kWh before machine actions and events. The greenhouse begins with six seeds and six nutrient packs.

### Machine and crew actions

| Action | Inputs | Result | Timing |
| --- | --- | --- | --- |
| Recycle water | 3 kWh Power, 3% Stamina | +10 L Water | After end-day simulation |
| Generate oxygen | 2.25 L Water, 6 kWh Power, 3% Stamina | +4 kg Oxygen | After end-day simulation |
| Repair base | 10 kWh Power, 20% Stamina | +20% Base Integrity, capped at 100% | After end-day simulation |
| Plant a crop | 8 L Water, 8 kWh Power, 20% Stamina, 1 Seed, 1 Nutrient pack | Starts a 3-day grow timer | After end-day simulation |
| Harvest a mature crop | 23% Stamina | +15 FP Food; bed returns to Empty | After end-day simulation |
| Eat a ration | 2 FP Food | +3% Stamina | Immediate |
| Drink water | 2 L Water | +3% Stamina | Immediate |

The two greenhouse beds track independent crop stages. Each day's simulation advances growing crops. Queued actions reserve costs when added; cancelling one refunds its reserved costs. The galley actions are immediate and follow separate validation rules.

The CONFIG object also contains daily events, random disaster definitions, resource caps, machine requirements, and depletion penalties. The exact event effects and thresholds are gameplay balancing values and may change as the game is tuned.

## JavaScript code map

All canonical game logic is in the inline script of public/mission-trainer.html. The file is an ordinary HTML document and can also be opened directly in a browser, although running the Next.js app is the intended project workflow.

| Module or function | Responsibility |
| --- | --- |
| fmt | Displays resource amounts without unnecessary decimal zeroes. |
| CONFIG | Central source for resources, units, starting amounts, machine costs and yields, crop timing, crew usage, power balance, and events. |
| GameState | Creates and owns the current mission state, validates saved state, resets or restores a game, and serializes it for local storage. |
| GameLogicService | Applies Day 0 rules, sustenance, action validation and reservation, refunds, crop progression, daily consumption, events, survival checks, and victory/failure rules. |
| AudioEngine | Creates short interface, movement, interaction, and transition sounds with the Web Audio API. |
| PixelArt | Draws and caches pixel-art sprites, character variants, machines, room props, and small HUD icons on canvases. |
| RoomDefinitions | Describes the classroom, street, bedroom, spacecraft, lunar base, objects, doors, interaction positions, and room transitions. |
| DialogueSystem | Displays speaker dialogue, advances lines, presents choices, and handles keyboard input for conversations. |
| VN | Draws the illustrated opening with a canvas, animated scene backgrounds, character sprites, choice branches, typewriter dialogue, and skip behavior. |
| StoryManager | Moves the story between Earth, sleep, spacecraft Day 0, landing, survival, and mission outcomes; it also tracks tutorial conversations. |
| Renderer | Draws the title screen, rooms, astronaut, lunar surface, HUD scene art, transitions, cutscenes, and overlays. |
| UIManager | Builds the HUD, menus, resource chips, machine tutorials, pending-action queue, end-day report, settings, and victory/failure dialogs. |
| GameController | Reads movement and interaction input, applies collision checks, selects the nearest interactable object, updates animations, and runs the animation loop. |

The updated story artwork adds a bright two-pane classroom window and a warmer bedroom scene. The updated character renderer paints the student and teacher from pixel blocks, and the suit palette gives the helmet a darker visor with a light reflection. These are visual changes; they do not alter the resource simulation.

The new shared machine menu is built from MACHINE_INFO, mmChips, mmCosts, and openMachineMenu. The same layout is used by water, oxygen, repair, greenhouse, and galley panels so each machine explains its purpose, inputs, outputs, timing, status, and available actions consistently.

## State, saves, JSON, and configuration files

There is no separate JSON file containing the main game's story or balance settings. The main game uses the JavaScript CONFIG object for those settings. Saves are JSON text stored in the browser's localStorage under RE:SOURCE_SAVE_V1. The save includes the mission phase and day, current room and astronaut position, resources, tutorial/story flags, crop beds, pending actions, and the latest report. The loader parses and checks required resource values, room identity, and array state before accepting a saved game.

The root project configuration files are JSON or TypeScript configuration, not game data:

| File | Purpose |
| --- | --- |
| package.json | Package name, installed runtime/development dependencies, and npm scripts. |
| package-lock.json | Exact dependency versions and dependency tree used by npm install. |
| tsconfig.json | TypeScript compiler options for the Next.js app. |
| next.config.ts | Next.js project settings. |
| eslint.config.mjs | Lint rules. |
| .gitignore | Excludes dependencies, build output, local secrets, and generated files from Git. |

JSON syntax does not allow comments. The package and TypeScript JSON files are therefore explained here instead of being edited into invalid JSON.

## React code and retained prototypes

The canonical game is vanilla JavaScript in the HTML file, not a React rewrite. React and Next.js provide the project shell and routes.

- src/app/page.tsx: React server component that embeds the canonical HTML game in a full-viewport iframe.
- src/app/layout.tsx: Root App Router layout and browser metadata.
- src/app/prototype/page.tsx: Preserved interactive React prototype available at /prototype. It contains the separate React story presentation and mounts the React lunar game and ship tutorial.
- src/app/game.tsx: React implementation of the prototype's seven-day base game, including movement, stations, action queue, daily simulation, reports, and mission state.
- src/app/gameConfig.ts: Typed TypeScript gameplay configuration for that React prototype. Its parameter values are separate from the canonical HTML game's CONFIG values.
- src/app/ship.tsx: React Day 0 ship walkthrough and landing sequence used by the prototype.
- design-preview/: Separate room-based Next.js visual prototype and its own settings. It is kept as a source project and is not loaded by the canonical home page.

Keep the distinction clear when editing balance: the main game uses public/mission-trainer.html; the React prototype uses src/app/gameConfig.ts. Updating one does not automatically update the other.

## Editing and commenting code

The HTML file already groups the engine into named modules and documents many rules next to their implementation. New comments explain the revised visual helpers and the shared machine-menu renderer. The README maps each major module and describes the resource and save data flow.

For additional source comments, use JavaScript // or /* ... */ comments inside the script, CSS comments inside the style block, and HTML comments in markup. Do not put comments inside a JavaScript template string unless the comment is meant to be rendered as part of the generated HTML. Do not add comment syntax to JSON files; the JSON parser will reject it.

## Testing and build

The production web build command is:

    npm run build

The project also exposes npm run lint. Values in the game are fictional and should be tested as gameplay rules, not interpreted as engineering guidance. The Windows packaging command is `npm run desktop:package`; see the desktop version section for output and sharing details.

## Project tree

    public/mission-trainer.html   Canonical game source and browser runtime
    src/app/page.tsx              Next.js home page and full-screen game iframe
    src/app/layout.tsx            Root layout and metadata
    src/app/prototype/page.tsx     Preserved React prototype route
    src/app/game.tsx               React prototype lunar game
    src/app/gameConfig.ts          React prototype tuning data
    src/app/ship.tsx               React prototype Day 0 ship tutorial
    design-preview/                Independent room-based React prototype
    package.json                  Package scripts and dependency names
    package-lock.json             Exact npm dependency lock
    next.config.ts                Next.js configuration
    tsconfig.json                 TypeScript configuration
    eslint.config.mjs              Lint configuration
    .gitignore                     Git exclusions
    README.md                      Project guide

Built for NASA Space Apps Challenge Cairo 2026.
