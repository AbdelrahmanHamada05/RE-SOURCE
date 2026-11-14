'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import LunarGame from './game';

type Scene = 'classroom' | 'walk' | 'bedroom' | 'ship';
type Choice = 'mock' | 'believe' | 'maybe';

const scenes: Scene[] = ['classroom', 'walk', 'bedroom', 'ship'];
const sceneLabels: Record<Scene, string> = {
  classroom: 'ORBITAL HISTORY · PERIOD 04',
  walk: 'THE LONG WAY HOME',
  bedroom: 'THAT NIGHT',
  ship: 'UNKNOWN ORBIT · 06:17',
};

const dialogue: Record<Scene, string[]> = {
  classroom: [
    'The Moon was never meant to be a second home.',
    'Then the oceans rose, the harvests failed, and home had to become bigger.',
    'Today, more than twelve thousand people live beneath the lunar glass.',
    'MARA: So… would you actually go up there?',
  ],
  walk: [
    'The last bell spills you into a city washed in evening gold.',
    'The Moon hangs above the rooftops. Somehow it looks closer tonight.',
    'You take the long way home, with the question still following.',
  ],
  bedroom: [
    'A half-finished assignment. A dim window. The ordinary weight of tomorrow.',
    'Outside, the Moon slips behind a cloud.',
    'Your eyes close before the city does…',
  ],
  ship: [
    'BEEP. BEEP. BEEP.',
    'Red light. Cold glass. A world of stars where your ceiling should be.',
    'A silver crescent turns slowly beyond the viewport.',
    'COMMANDER NOVA: Easy. You’re aboard the Asterion. I’m Commander Nova.',
    'COMMANDER NOVA: You made it. Welcome to the Moon.',
  ],
};

function MapSprite({ x, y, color = '#5cb5ad', hair = '#293044' }: { x: number; y: number; color?: string; hair?: string }) {
  return <g transform={`translate(${x} ${y})`} shapeRendering="crispEdges" aria-hidden="true">
    <rect x="5" y="0" width="14" height="5" fill="#171e2d" /><rect x="3" y="4" width="18" height="10" fill={hair} />
    <rect x="6" y="6" width="12" height="7" fill="#dca77e" /><rect x="8" y="9" width="2" height="2" fill="#263044" /><rect x="14" y="9" width="2" height="2" fill="#263044" />
    <rect x="5" y="14" width="14" height="3" fill="#202b3d" /><rect x="4" y="16" width="16" height="10" fill={color} />
    <rect x="1" y="17" width="4" height="7" fill={color} /><rect x="19" y="17" width="4" height="7" fill={color} />
    <rect x="5" y="25" width="6" height="5" fill="#d2bd93" /><rect x="13" y="25" width="6" height="5" fill="#d2bd93" />
    <rect x="4" y="29" width="7" height="3" fill="#20283a" /><rect x="13" y="29" width="7" height="3" fill="#20283a" />
  </g>;
}

function TypewriterText({ text, complete, onComplete, onGlyph }: { text: string; complete: boolean; onComplete: () => void; onGlyph: (character: string) => void }) {
  if (complete) return <p className="dialogue-text" aria-live="polite">{text}</p>;
  return <p className="dialogue-text" aria-live="polite">{Array.from(text).map((character, index) => <span key={index} className="type-glyph" style={{ animationDelay: `${index * 42}ms` }} onAnimationStart={() => { if (!/\s|[.,!?…:;]/u.test(character)) onGlyph(character); }} onAnimationEnd={index === text.length - 1 ? onComplete : undefined}>{character === ' ' ? '\u00a0' : character}</span>)}<span className="type-cursor" aria-hidden="true">▌</span></p>;
}

function SceneArt({ scene, step }: { scene: Scene; step: number }) {
  return (
    <div className={`scene-art scene-${scene}`} aria-label={`${sceneLabels[scene]} top-down pixel-art scene`}>
      <svg className="scene-map" viewBox="0 0 960 400" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true" shapeRendering="crispEdges">
        <defs>
          <pattern id="room-tiles" width="96" height="96" patternUnits="userSpaceOnUse"><rect width="96" height="96" fill="#293448"/><rect width="48" height="48" fill="#354158"/><rect x="48" y="48" width="48" height="48" fill="#354158"/><path d="M48 0V96M0 48H96" stroke="#1c273a" strokeWidth="2" opacity=".6"/></pattern>
          <pattern id="ship-tiles" width="96" height="96" patternUnits="userSpaceOnUse"><rect width="96" height="96" fill="#202b3e"/><rect width="48" height="48" fill="#2b364a"/><rect x="48" y="48" width="48" height="48" fill="#2b364a"/><path d="M48 0V96M0 48H96" stroke="#526077" strokeWidth="2" opacity=".45"/></pattern>
          <pattern id="street-tiles" width="96" height="96" patternUnits="userSpaceOnUse"><rect width="96" height="96" fill="#354052"/><rect width="48" height="48" fill="#414b5c"/><rect x="48" y="48" width="48" height="48" fill="#414b5c"/><path d="M48 0V96M0 48H96" stroke="#263145" strokeWidth="2"/></pattern>
          <pattern id="bedroom-tiles" width="96" height="96" patternUnits="userSpaceOnUse"><rect width="96" height="96" fill="#373950"/><rect width="48" height="48" fill="#44455e"/><rect x="48" y="48" width="48" height="48" fill="#44455e"/><path d="M48 0V96M0 48H96" stroke="#292d42" strokeWidth="2"/></pattern>
        </defs>
        <rect width="960" height="400" fill={scene === 'ship' ? 'url(#ship-tiles)' : scene === 'walk' ? 'url(#street-tiles)' : scene === 'bedroom' ? 'url(#bedroom-tiles)' : 'url(#room-tiles)'} />
        {scene === 'classroom' && <>
          <rect width="960" height="38" fill="#657187"/><rect y="36" width="960" height="8" fill="#1c263a"/><rect x="12" y="44" width="8" height="342" fill="#202a3e"/><rect x="940" y="44" width="8" height="342" fill="#202a3e"/>
          <rect x="46" y="8" width="160" height="25" fill="#26334a"/><rect x="56" y="11" width="140" height="16" fill="#7690a0"/><rect x="61" y="14" width="32" height="10" fill="#d7a9a1"/>
          <rect x="650" y="11" width="206" height="24" fill="#6d5947"/><rect x="659" y="15" width="188" height="14" fill="#2d5b4d"/><text x="678" y="25" className="map-text">LUNAR ERA · 12,408</text>
          <rect x="424" y="81" width="112" height="43" fill="#74503d"/><rect x="432" y="87" width="96" height="29" fill="#8e6247"/><rect x="450" y="124" width="60" height="9" fill="#202b3f"/>
          <rect x="280" y="161" width="95" height="52" fill="#597083"/><rect x="289" y="169" width="77" height="36" fill="#42566d"/><rect x="584" y="161" width="95" height="52" fill="#597083"/><rect x="593" y="169" width="77" height="36" fill="#42566d"/>
          <rect x="180" y="263" width="115" height="53" fill="#617387"/><rect x="190" y="271" width="95" height="37" fill="#475e72"/><rect x="385" y="263" width="115" height="53" fill="#617387"/><rect x="395" y="271" width="95" height="37" fill="#475e72"/><rect x="665" y="263" width="115" height="53" fill="#617387"/><rect x="675" y="271" width="95" height="37" fill="#475e72"/>
          <MapSprite x={467} y={139} color="#c9a96f" hair="#39313a"/><MapSprite x={221} y={223} color="#65a7b1"/><MapSprite x={426} y={223} color="#ba7768"/><MapSprite x={706} y={223} color="#719b83"/>
        </>}
        {scene === 'walk' && <>
          <rect x="0" y="0" width="960" height="48" fill="#727b89"/><rect x="0" y="42" width="960" height="8" fill="#252f43"/>
          <rect x="55" y="72" width="185" height="105" fill="#686d7a"/><rect x="65" y="82" width="165" height="86" fill="#8d8179"/><rect x="72" y="91" width="50" height="31" fill="#d0af7e"/><rect x="144" y="91" width="72" height="31" fill="#46566d"/>
          <rect x="713" y="67" width="186" height="122" fill="#656a78"/><rect x="724" y="78" width="164" height="99" fill="#88776f"/><rect x="746" y="91" width="50" height="38" fill="#46566d"/><rect x="812" y="91" width="55" height="38" fill="#46566d"/>
          <rect x="363" y="48" width="234" height="352" fill="#806b60"/><path d="M363 96H597M363 144H597M363 192H597M363 240H597M363 288H597M363 336H597" stroke="#6e5b55" strokeWidth="4"/>
          <rect x="332" y="48" width="9" height="352" fill="#b09276"/><rect x="619" y="48" width="9" height="352" fill="#b09276"/>
          <rect x="82" y="243" width="78" height="45" fill="#50647d"/><rect x="92" y="252" width="58" height="8" fill="#8ca2b6"/><rect x="798" y="245" width="74" height="45" fill="#50647d"/><rect x="808" y="254" width="54" height="8" fill="#8ca2b6"/>
          <path d="M770 190h36v36h-36zM779 199h18v18h-18z" fill="#d6bd8c"/><MapSprite x={469} y={243} color="#b97b68"/>
        </>}
        {scene === 'bedroom' && <>
          <rect width="960" height="38" fill="#626d82"/><rect y="36" width="960" height="8" fill="#242d43"/>
          <rect x="75" y="74" width="170" height="78" fill="#59677e"/><rect x="84" y="83" width="152" height="60" fill="#25314b"/><rect x="99" y="98" width="32" height="30" fill="#f1d193"/>
          <rect x="680" y="58" width="105" height="80" fill="#8c6251"/><rect x="689" y="67" width="87" height="62" fill="#b87d64"/><text x="706" y="103" className="map-text">DREAM</text>
          <rect x="335" y="118" width="300" height="218" fill="#20283b"/><rect x="350" y="104" width="270" height="206" fill="#87684e"/><rect x="361" y="114" width="248" height="184" fill="#574a4c"/><rect x="372" y="124" width="104" height="58" fill="#d7d3cb"/><rect x="379" y="130" width="90" height="45" fill="#80909e"/><rect x="487" y="114" width="122" height="184" fill="#617184"/><rect x="487" y="208" width="122" height="90" fill="#526476"/>
          <rect x="742" y="208" width="105" height="92" fill="#77573f"/><rect x="733" y="199" width="123" height="13" fill="#ad8057"/><rect x="754" y="224" width="82" height="48" fill="#443c3c"/><MapSprite x={525} y={190} color="#d2bd93" hair="#665054"/>
        </>}
        {scene === 'ship' && <>
          <rect x="0" y="0" width="960" height="38" fill="#48566d"/><rect y="36" width="960" height="8" fill="#161f32"/>
          <rect x="34" y="67" width="184" height="76" fill="#53627b"/><rect x="44" y="77" width="164" height="56" fill="#202b42"/><path d="M85 124l25-24 23 18 28-28 39 34z" fill="#677b96"/><rect x="55" y="138" width="138" height="7" fill="#e2be84"/>
          <rect x="315" y="66" width="148" height="54" fill="#52627a"/><rect x="325" y="76" width="128" height="34" fill="#253149"/><circle cx="389" cy="93" r="11" fill="#e1c88c"/>
          <rect x="522" y="65" width="130" height="51" fill="#596781"/><rect x="533" y="75" width="108" height="31" fill="#27334b"/><rect x="560" y="82" width="12" height="12" fill="#69bdaa"/>
          <rect x="736" y="72" width="172" height="182" fill="#3e4a60"/><rect x="746" y="82" width="152" height="162" fill="#273248"/><path d="M772 205h102v25H772zM788 130h70v70h-70z" fill="#b7b9bb"/><path d="M799 139h48v49h-48z" fill="#858d99"/>
          <rect x="259" y="267" width="440" height="72" fill="#56657b"/><rect x="270" y="278" width="418" height="50" fill="#1f2a3f"/><rect x="285" y="290" width="42" height="13" fill="#54b5a9"/><rect x="341" y="290" width="42" height="13" fill="#e9c064"/><rect x="397" y="290" width="42" height="13" fill="#d47e73"/><rect x="566" y="289" width="102" height="16" fill="#536983"/>
          <MapSprite x={461} y={202} color="#c9a96f" hair="#343548"/>{step >= 3 && <MapSprite x={785} y={278} color="#71849b" hair="#ddd4bd"/>}
          {step === 0 && <><rect x="864" y="22" width="10" height="10" fill="#ee7264"/><rect x="876" y="22" width="10" height="10" fill="#ee7264"/></>}
        </>}
        <rect x="4" y="4" width="952" height="392" fill="none" stroke="#63728b" strokeWidth="8"/>
      </svg>
      <div className="scene-alerts" aria-label="Mission alerts">
        <span className="alerts-heading"><i /> {scene === 'ship' ? 'FLIGHT ALERTS' : 'FIELD NOTES'}</span>
        {scene === 'ship' ? <><span><b>01</b> O₂ NOMINAL</span><span><b>02</b> LUNAR ORBIT</span><span className="alert-current"><b>!</b> CREW AWAKE</span></> : scene === 'classroom' ? <><span><b>01</b> CLASS 04</span><span><b>02</b> LUNAR ERA</span><span><b>03</b> 12,408 RESIDENTS</span></> : scene === 'walk' ? <><span><b>01</b> SUNSET</span><span><b>02</b> MOON VISIBLE</span></> : <><span><b>01</b> LIGHTS OUT</span><span><b>02</b> ALARM SET</span></>}
      </div>
    </div>
  );
}

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [choice, setChoice] = useState<Choice>('maybe');
  const [chosen, setChosen] = useState<Choice | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isTyping, setIsTyping] = useState(true);
  const [showFullText, setShowFullText] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);
  const audioUnlocked = useRef(false);
  const scene = scenes[sceneIndex];
  const lines = dialogue[scene];
  const response = chosen === 'mock'
    ? 'YOU: The Moon? Sounds like a rock with a very expensive roof.'
    : chosen === 'believe'
      ? 'YOU: I think I’d go. I want to see what we can build up there.'
      : 'YOU: Maybe. I’d have to see it for myself.';
  const currentText = scene === 'classroom' && lineIndex === 4 && chosen
    ? response
    : lineIndex < lines.length ? lines[lineIndex] : '';
  const choiceActive = scene === 'classroom' && lineIndex === 3 && chosen === null && !isTyping;
  const done = scene === 'ship' && lineIndex >= lines.length;

  const unlockAudio = useCallback(() => {
    audioUnlocked.current = true;
    if (!audioContext.current && typeof window !== 'undefined' && window.AudioContext) {
      audioContext.current = new window.AudioContext();
    }
    if (audioContext.current?.state === 'suspended') void audioContext.current.resume();
  }, []);

  const playTextBlip = useCallback((character: string) => {
    const audio = audioContext.current;
    if (!soundOn || !audioUnlocked.current || !audio || audio.state !== 'running') return;
    const now = audio.currentTime;
    const voice = scene === 'ship' ? 460 : scene === 'walk' || scene === 'bedroom' ? 385 : 520;
    const pitch = voice + (character.toLowerCase().charCodeAt(0) % 6) * 21;
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(pitch, now);
    oscillator.frequency.exponentialRampToValueAtTime(pitch * 0.84, now + 0.035);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.055, now + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    oscillator.connect(envelope);
    envelope.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.042);
  }, [scene, soundOn]);

  const toggleSound = useCallback(() => {
    if (!soundOn) unlockAudio();
    setSoundOn((enabled) => !enabled);
  }, [soundOn, unlockAudio]);

  const advance = useCallback(() => {
    if (isTransitioning || done) return;
    if (isTyping) {
      setIsTyping(false);
      setShowFullText(true);
      return;
    }
    if (choiceActive) {
      setChosen(choice);
      setIsTyping(true);
      setShowFullText(false);
      setLineIndex((n) => n + 1);
      return;
    }
    if (lineIndex < lines.length - 1) {
      setIsTyping(true);
      setShowFullText(false);
      setLineIndex((n) => n + 1);
      return;
    }
    if (sceneIndex < scenes.length - 1) {
      setIsTransitioning(true);
      window.setTimeout(() => {
        setSceneIndex((n) => n + 1);
        setLineIndex(0);
        setIsTyping(true);
        setShowFullText(false);
        setIsTransitioning(false);
      }, 520);
    } else {
      setLineIndex(lines.length);
    }
  }, [choice, choiceActive, done, isTyping, isTransitioning, lineIndex, lines.length, sceneIndex]);

  const skip = useCallback(() => {
    setSceneIndex(scenes.length - 1);
    setLineIndex(dialogue.ship.length - 1);
    setIsTyping(true);
    setShowFullText(false);
    setChosen('maybe');
    setIsTransitioning(false);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (gameStarted) return;
      unlockAudio();
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        if (choiceActive) setChoice((v) => v === 'mock' ? 'maybe' : v === 'believe' ? 'mock' : 'believe');
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        if (choiceActive) setChoice((v) => v === 'mock' ? 'believe' : v === 'believe' ? 'maybe' : 'mock');
      } else if (['1', '2', '3'].includes(event.key) && choiceActive) {
        setChoice((['mock', 'believe', 'maybe'] as Choice[])[Number(event.key) - 1]);
      } else if (event.key.toLowerCase() === 'm') {
        setSoundOn((enabled) => !enabled);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); advance();
      } else if (event.key.toLowerCase() === 's' || event.key === 'Escape') {
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, choiceActive, gameStarted, skip, unlockAudio]);

  if (gameStarted) return <LunarGame onReset={() => { setGameStarted(false); setSceneIndex(0); setLineIndex(0); setIsTyping(true); setShowFullText(false); setChosen(null); }} />;

  return (
    <main className="game-shell">
      <header className="topbar"><a className="brand" href="#" aria-label="Astra opening"><span className="brand-mark">A</span><span>ASTRA <small>PROTOTYPE · PARAMETER TEST</small></span></a><div className="top-center"><span className="live-dot" /> STORY MODE <i /> OPENING CHAPTER</div><div className="top-actions"><button className="sound-toggle" onClick={() => { unlockAudio(); toggleSound(); }} aria-pressed={soundOn}>{soundOn ? '♪ SOUND ON' : '♪ SOUND OFF'}</button><button className="skip-button" onClick={() => { unlockAudio(); skip(); }}>SKIP INTRO <span>ESC</span></button></div></header>
      <section className={`stage ${isTransitioning ? 'transitioning' : ''}`}>
        <div className="stage-top"><span className="day-count">MISSION <b>01</b> <i>/</i> 07</span><div className="hud-meters"><span className="hud-meter oxygen"><b>O₂</b><i>{Array.from({ length: 10 }, (_, index) => <em key={index} className={index < 8 ? 'filled' : ''} />)}</i></span><span className="hud-meter food"><b>FOOD</b><i>{Array.from({ length: 10 }, (_, index) => <em key={index} className={index < 6 ? 'filled' : ''} />)}</i></span><span className="hud-meter power"><b>POWER</b><i>{Array.from({ length: 10 }, (_, index) => <em key={index} className={index < 7 ? 'filled' : ''} />)}</i></span></div></div>
        <SceneArt scene={scene} step={lineIndex} />
        <div className="stage-caption"><span className="caption-line" /> <span>{scene === 'classroom' ? 'WESTBROOK SECONDARY · EARTH' : scene === 'walk' ? 'EARTH · EVENING' : scene === 'bedroom' ? 'EARTH · 23:48' : 'LUNAR TRANSFER VESSEL'}</span></div>
        <div className="progress-track"><span style={{ width: `${Math.min(100, ((sceneIndex + (lineIndex + 1) / (lines.length + 1)) / scenes.length) * 100)}%` }} /></div>
      </section>
      <section className="dialogue-layout">
        <div className="dialogue-card">
          <div className="speaker-row"><div className={`speaker-avatar ${scene === 'ship' ? 'nova-avatar' : scene === 'walk' || scene === 'bedroom' ? 'narrator-avatar' : 'teacher-avatar'}`}><span>{scene === 'ship' ? 'N' : scene === 'walk' || scene === 'bedroom' ? '✦' : 'M'}</span></div><div><span className="speaker-name">{scene === 'ship' && lineIndex >= 3 ? 'COMMANDER NOVA' : scene === 'walk' || scene === 'bedroom' ? 'NARRATOR' : lineIndex === 3 ? 'MARA' : 'MS. VALE'}</span><span className="speaker-sub">{scene === 'ship' ? 'FLIGHT COMMAND' : scene === 'walk' || scene === 'bedroom' ? 'FIELD JOURNAL' : lineIndex === 3 ? 'YOUR CLASSMATE' : 'ORBITAL HISTORY'}</span></div><span className="dialogue-index">{String(lineIndex + 1).padStart(2, '0')} <i>/</i> {String(lines.length).padStart(2, '0')}</span></div>
          <div className="dialogue-content">
            {currentText ? <TypewriterText key={`${scene}-${lineIndex}-${currentText}`} text={currentText} complete={showFullText} onComplete={() => { setIsTyping(false); setShowFullText(true); }} onGlyph={playTextBlip} /> : <div className="end-message"><span>✦</span><strong>YOUR STORY BEGINS</strong><small>The airlock cycles. Shackleton Base waits beneath the lunar horizon.</small><button className="start-mission" onClick={() => setGameStarted(true)}>✦ &nbsp; BEGIN 7-DAY MISSION</button><button onClick={() => { unlockAudio(); setSceneIndex(0); setLineIndex(0); setIsTyping(true); setShowFullText(false); setChosen(null); }}>↺ &nbsp; REPLAY OPENING</button></div>}
            {choiceActive && <div className="choice-list">{([{ id: 'mock', label: 'Make a joke', glyph: '◈' }, { id: 'believe', label: 'Say you’d go', glyph: '✦' }, { id: 'maybe', label: 'Stay unsure', glyph: '◇' }] as { id: Choice; label: string; glyph: string }[]).map((item, index) => <button key={item.id} className={`choice ${choice === item.id ? 'selected' : ''}`} onMouseEnter={() => setChoice(item.id)} onClick={() => { unlockAudio(); setChoice(item.id); setChosen(item.id); setIsTyping(true); setShowFullText(false); setLineIndex(4); }}><span className="choice-arrow">{choice === item.id ? '▶' : item.glyph}</span><span>{item.label}</span><kbd>{index + 1}</kbd></button>)}</div>}
          </div>
          {!done && <button className="advance-button" onClick={() => { unlockAudio(); advance(); }}><span>{isTyping ? 'FINISH TEXT' : choiceActive ? 'CONFIRM' : 'CONTINUE'}</span><b>↵</b></button>}
        </div>
        <aside className="side-notes"><div className="notes-heading">MISSION LOG <span>01—04</span></div><div className="log-step active"><span className="log-marker">01</span><div><b>THE QUESTION</b><small>A classroom on Earth</small></div><i>●</i></div><div className={`log-step ${sceneIndex >= 1 ? 'active' : ''}`}><span className="log-marker">02</span><div><b>THE WALK HOME</b><small>One ordinary evening</small></div><i>{sceneIndex >= 1 ? '●' : '○'}</i></div><div className={`log-step ${sceneIndex >= 2 ? 'active' : ''}`}><span className="log-marker">03</span><div><b>LIGHTS OUT</b><small>The night before</small></div><i>{sceneIndex >= 2 ? '●' : '○'}</i></div><div className={`log-step ${sceneIndex >= 3 ? 'active' : ''}`}><span className="log-marker">04</span><div><b>FIRST CONTACT</b><small>Beyond the window</small></div><i>{sceneIndex >= 3 ? '●' : '○'}</i></div><div className="notes-rule" /><p className="journal-note"><span>✎</span> Some journeys begin long before you leave the ground.</p></aside>
      </section>
      <footer className="footer"><div className="control-hints"><span><kbd>↵</kbd> <kbd>SPACE</kbd> ADVANCE</span><span><kbd>↑</kbd><kbd>↓</kbd> CHOOSE</span><span><kbd>1</kbd>—<kbd>3</kbd> SELECT</span><span><kbd>M</kbd> SOUND</span></div><span className="prototype-disclaimer">PROTOTYPE ONLY · FOR TESTING GAME PARAMETERS · NOT NASA-VALIDATED</span></footer>
    </main>
  );
}
