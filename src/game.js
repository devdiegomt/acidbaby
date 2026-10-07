(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------------------------
  const T = 32; // tamaño de casilla en píxeles
  const PW = 22; // ancho del personaje
  const PH = 28; // alto del personaje
  const BOX = 28; // lado de la caja

  const GRAVITY = 0.55;
  const JUMP_SPEED = 10.2;
  const MOVE_SPEED = 3.4;
  const PUSH_SPEED_FACTOR = 0.6; // empujando una caja se va más despacio
  const MAX_FALL = 11;
  const COYOTE_FRAMES = 6; // margen para saltar justo después de dejar el borde
  const JUMP_BUFFER_FRAMES = 6; // margen para saltar si pulsas justo antes de aterrizar
  const POOL_MARGIN = 5; // píxeles de cortesía al pisar el borde de un charco
  const RESTART_DELAY = 150; // frames antes de reiniciar tras una muerte
  const PLATFORM_SPEED = 2; // píxeles por frame
  const DISSOLVE_DELAY = 18; // frames hasta que se rompe el primer bloque tocado
  const DISSOLVE_SPREAD = 6; // frames extra por cada bloque de distancia
  const FAN_RANGE = 6; // casillas de alto que alcanza la corriente de un ventilador
  const FAN_LIFT = 1.25; // empuje hacia arriba por frame dentro de la corriente
  const FAN_MAX_RISE = 5; // velocidad máxima de subida en la corriente
  const FAN_HOVER = 12; // píxeles por encima del final de la corriente a los que se queda flotando
  const FAN_CENTERING = 0.03; // fuerza con la que la corriente centra a quien no pulsa nada
  const CORNER_CORRECTION = 10; // píxeles que se desliza quien choca de cabeza contra una esquina
  const HINT_FRAMES = 8 * 60;
  const MAX_HEARTS = 3; // vidas de cada personaje en cada nivel
  const HURT_FRAMES = 90; // invencibilidad tras recibir un golpe
  const KNOCKBACK = 5; // empujón al recibir un golpe
  const STOMP_BOUNCE = 7.5; // rebote al aplastar a un enemigo
  const SHOT_SPEED = 7;
  const SHOT_COOLDOWN = 22; // frames entre disparos
  const SHOT_LIFE = 75; // frames que vuela un disparo
  const SPRING_SPEED = 15; // impulso de un muelle: sube un piso entero (6 casillas)
  const DOUBLE_JUMP_SPEED = 9; // segundo salto en el aire con las botas
  const CRUMBLE_FRAMES = 30; // lo que aguanta un tablón frágil después de pisarlo
  const CRUMBLE_RESPAWN = 240; // lo que tarda en volver a aparecer
  const MAX_SHIELDS = 1; // quien ya tiene escudo lo deja para otro
  const TURRET_RATE = 110; // frames entre dardos de una torreta
  const TURRET_SIGHT = 12; // casillas a las que una torreta ve a alguien en su fila
  const DART_SPEED = 4;
  const GHOST_SIGHT = 8; // casillas en horizontal a las que un fantasma empieza a perseguir
  const GHOST_SIGHT_ROWS = 3; // …y filas en vertical: así cada fantasma vigila su propio piso
  const BOMB_RADIUS = 2.5; // casillas que alcanza la explosión de una bomba (contra los bichos)
  // Jefe final: el Guardián del Templo
  const BOSS_W = 96;
  const BOSS_H = 80;
  const BOSS_VISOR = [44, 72]; // franja del ojo (desde arriba del cuerpo): solo ahí hacen daño los disparos
  const BOSS_PHASES = ["fire", "water", "acid"]; // el ojo cambia de color: solo le daña ese elemento
  const BOSS_HP = 5; // impactos por fase
  const BOSS_INTRO = 90; // frames quieto al empezar
  const BOSS_SPEED = [1.2, 1.6, 2.1]; // velocidad al patrullar en cada fase
  const BOSS_DART_RATE = [150, 125, 100];
  const BOSS_ROCK_RATE = [200, 170, 140];
  const BOSS_SLAM_RATE = 420; // desde la fase 2
  const BOSS_GROUND_TIME = 100; // frames en el suelo tras estrellarse

  const FONT = '"Segoe UI", system-ui, sans-serif';
  const MECH_COLORS = ["#f2c14e", "#c86bff", "#ff6fa8", "#4fd6c8", "#f0f0f0"];

  const ELEMENTS = {
    fire: { name: "la lava", label: "lava", top: "#ffd166", body: "#ff5a1f", glow: "255,110,30", gem: "#ff4d5e" },
    water: { name: "el agua", label: "agua", top: "#a8e6ff", body: "#1f7bff", glow: "60,150,255", gem: "#4da6ff" },
    acid: { name: "el ácido", label: "ácido", top: "#d9ff7a", body: "#46c22a", glow: "120,255,60", gem: "#7dff4d" },
  };
  const LIQUID_BY_TILE = { L: "fire", "~": "water", A: "acid" };
  const GEM_BY_TILE = { r: "fire", z: "water", e: "acid" };
  const BOX_TILE = "x";
  const FAN_TILE = "^";
  // Bloques que un personaje rompe al tocarlos (junto con todos los del mismo tipo pegados).
  const BREAKABLE = {
    "%": { by: "acid", burst: ["#b8ff6a", "#7a8f3a", "#d9ff7a"] }, // óxido
    "+": { by: "fire", burst: ["#e8fbff", "#9fd8ff", "#ffffff"] }, // hielo
    "=": { by: "water", burst: ["#ffffff", "#e9e2d0", "#bfe6ff"] }, // sal
    "|": { by: null, burst: ["#ffd76a", "#b8862b", "#fff3c4"] }, // cerradura: se abre con una llave
    "[": { by: null, burst: ["#8a7a62", "#5a4a33", "#ffb347"] }, // muro agrietado: lo abre una bomba
    "/": { by: null, burst: ["#c86bff", "#ffe08a", "#ffffff"] }, // sello del Guardián: se rompe al vencerlo
  };
  const LOCK_TILE = "|";
  const CRACKED_TILE = "[";
  const SPRING_TILE = ";";
  const CRUMBLE_TILE = "-";
  const SPIKES_TILE = ".";
  const BOSS_TILE = "{";
  const SEAL_TILE = "/";
  // Barreras de energía: sólidas para todos menos para el personaje de su elemento.
  const BARRIER_BY_TILE = { 4: "fire", 5: "water", 6: "acid" };
  // Portales: cada uno lleva a su pareja.
  const PORTAL_PAIR = { 7: "8", 8: "7", 9: "0", 0: "9" };
  const PORTAL_COLORS = { 7: "#c86bff", 8: "#c86bff", 9: "#4fd6c8", 0: "#4fd6c8" };
  const ENEMY_BY_TILE = { "@": "beetle", "&": "bat", "<": "turret", ">": "turret", "!": "hedgehog", ":": "ghost" };
  // stompable: se le puede aplastar saltando encima (al erizo duele; al fantasma no se le alcanza).
  const ENEMIES = {
    beetle: { name: "un escarabajo", w: 24, h: 18, speed: 1.2, flies: false, stompable: true },
    bat: { name: "un murciélago", w: 26, h: 16, speed: 1.8, flies: true, stompable: true },
    turret: { name: "una torreta", w: 26, h: 24, speed: 0, flies: true, stompable: true },
    hedgehog: { name: "un erizo", w: 24, h: 20, speed: 1, flies: false, stompable: false },
    ghost: { name: "un fantasma", w: 24, h: 24, speed: 0.8, flies: true, stompable: false },
  };
  const ITEM_BY_TILE = { $: "key", "*": "weapon", "?": "heart", "(": "boots", ")": "shield", "]": "bomb", "}": "swap" };

  const CHARACTERS = [
    {
      name: "Fireboy", spawn: "f", door: "1", immune: "fire", power: "Derrite el hielo",
      color: "#ff5a1f", dark: "#8f2208",
      keys: { left: "KeyA", right: "KeyD", jump: "KeyW", fire: "KeyS" }, keyLabel: "W  A  S  D", shot: "bola de fuego",
    },
    {
      name: "Watergirl", spawn: "w", door: "2", immune: "water", power: "Disuelve la sal",
      color: "#2a8cff", dark: "#0c3f8f",
      keys: { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp", fire: "ArrowDown" }, keyLabel: "↑  ←  ↓  →", shot: "chorro de agua",
    },
    {
      name: "AcidBaby", spawn: "b", door: "3", immune: "acid", power: "Corroe el óxido",
      color: "#5fd12e", dark: "#226b0c",
      keys: { left: "KeyG", right: "KeyJ", jump: "KeyY", fire: "KeyH" }, keyLabel: "Y  G  H  J", shot: "escupitajo de ácido",
    },
  ];

  // ---------------------------------------------------------------------------
  // Entrada
  // ---------------------------------------------------------------------------
  // En los menús vale cualquiera de las teclas de los tres personajes.
  const MENU_KEYS = {
    left: ["ArrowLeft", "KeyA", "KeyG"],
    right: ["ArrowRight", "KeyD", "KeyJ"],
    up: ["ArrowUp", "KeyW", "KeyY"],
    down: ["ArrowDown", "KeyS", "KeyH"],
    ok: ["Enter", "Space"],
    back: ["Escape"],
  };
  const GAME_KEYS = new Set(["KeyR", "KeyM", "KeyP", "KeyE", ...Object.values(MENU_KEYS).flat()]);
  for (const ch of CHARACTERS) Object.values(ch.keys).forEach((k) => GAME_KEYS.add(k));

  const held = new Set();
  const pressed = new Set();
  const menuKey = (name) => MENU_KEYS[name].some((k) => pressed.has(k));

  // Ratón, en coordenadas del canvas (solo se usa en los menús).
  let pointer = null;
  let pointerMoved = false;
  let clicked = false;

  function toCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  addEventListener("keydown", (e) => {
    if (e.target?.closest?.("input, textarea, select")) return; // escribiendo en el editor
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
    sound.unlock();
  });
  addEventListener("keyup", (e) => held.delete(e.code));
  addEventListener("blur", () => {
    held.clear();
    if (state === "playing") pauseGame();
  });
  addEventListener("pointermove", (e) => {
    pointer = toCanvas(e);
    pointerMoved = true;
  });
  addEventListener("pointerdown", (e) => {
    pointer = toCanvas(e);
    pointerMoved = true;
    clicked = true;
    sound.unlock();
  });

  // ---------------------------------------------------------------------------
  // Progreso guardado (mejor tiempo y gemas de cada nivel, y el sonido)
  // ---------------------------------------------------------------------------
  const SAVE_KEY = "fireboy-watergirl-acidbaby-v1";

  // localStorage puede no existir o fallar (modo privado, datos bloqueados): el juego sigue sin guardar.
  function readSave() {
    try {
      return JSON.parse(globalThis.localStorage.getItem(SAVE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function writeSave() {
    try {
      globalThis.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      // Sin guardado: no pasa nada.
    }
  }

  const save = Object.assign({ levels: {}, muted: false }, readSave());
  let unlockAll = false; // con ?nivel=N se puede jugar cualquier nivel

  // Los récords se guardan por nombre para que añadir niveles no los descoloque.
  const recordOf = (i) => save.levels[LEVELS[i].name];
  const isUnlocked = (i) => unlockAll || i === 0 || !!recordOf(i - 1)?.done;

  // ---------------------------------------------------------------------------
  // Sonido (sintetizado con WebAudio, sin archivos)
  // ---------------------------------------------------------------------------
  const sound = (() => {
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    let ac = null;
    let master = null;
    let noiseBuffer = null;

    // El navegador solo deja crear el audio tras una pulsación del jugador.
    function unlock() {
      if (!AudioCtx) return;
      if (!ac) {
        ac = new AudioCtx();
        master = ac.createGain();
        master.gain.value = save.muted ? 0 : 0.35;
        master.connect(ac.destination);
        noiseBuffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (ac.state === "suspended") ac.resume();
    }

    function envelope(vol, start, dur) {
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      g.connect(master);
      return g;
    }

    function tone(freq, dur, { type = "square", vol = 0.2, to = freq, delay = 0 } = {}) {
      const start = ac.currentTime + delay;
      const osc = ac.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(to, start + dur);
      osc.connect(envelope(vol, start, dur));
      osc.start(start);
      osc.stop(start + dur + 0.02);
    }

    function noise(dur, { vol = 0.2, freq = 1000, filter = "bandpass", delay = 0 } = {}) {
      const start = ac.currentTime + delay;
      const src = ac.createBufferSource();
      src.buffer = noiseBuffer;
      const f = ac.createBiquadFilter();
      f.type = filter;
      f.frequency.value = freq;
      src.connect(f);
      f.connect(envelope(vol, start, dur));
      src.start(start, Math.random() * 0.5);
      src.stop(start + dur + 0.02);
    }

    const effects = {
      jump: () => tone(330, 0.12, { vol: 0.07, to: 620 }),
      gem: () => {
        tone(1046, 0.1, { type: "triangle", vol: 0.22 });
        tone(1568, 0.22, { type: "triangle", vol: 0.2, delay: 0.07 });
      },
      death: () => {
        tone(280, 0.6, { type: "sawtooth", vol: 0.16, to: 50 });
        noise(0.35, { vol: 0.25, freq: 600 });
      },
      win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, { type: "triangle", vol: 0.2, delay: i * 0.1 })),
      press: () => tone(180, 0.07, { vol: 0.1, to: 120 }),
      release: () => tone(140, 0.06, { vol: 0.07, to: 190 }),
      lever: () => {
        noise(0.05, { vol: 0.25, freq: 2500 });
        tone(400, 0.08, { type: "triangle", vol: 0.12, to: 300, delay: 0.03 });
      },
      wind: () => noise(0.45, { vol: 0.12, freq: 700, filter: "lowpass" }),
      "%": () => noise(0.25, { vol: 0.14, freq: 3500, filter: "highpass" }), // óxido que burbujea
      "+": () => {
        tone(2093 + Math.random() * 600, 0.12, { type: "sine", vol: 0.08 }); // hielo que tintinea
        noise(0.12, { vol: 0.08, freq: 5000, filter: "highpass" });
      },
      "=": () => noise(0.16, { vol: 0.16, freq: 1600 }), // sal que cruje
      "|": () => {
        tone(520, 0.08, { vol: 0.1 }); // cerradura que se abre
        tone(780, 0.14, { type: "triangle", vol: 0.12, delay: 0.06 });
      },
      portal: () => {
        tone(300, 0.25, { type: "sine", vol: 0.15, to: 1200 });
        noise(0.2, { vol: 0.06, freq: 2000 });
      },
      shot: () => noise(0.12, { vol: 0.12, freq: 1200, filter: "lowpass" }),
      hit: () => tone(200, 0.1, { vol: 0.1, to: 80 }),
      stomp: () => tone(260, 0.12, { type: "triangle", vol: 0.18, to: 90 }),
      hurt: () => {
        tone(440, 0.18, { type: "sawtooth", vol: 0.12, to: 180 });
        noise(0.12, { vol: 0.12, freq: 900 });
      },
      pickup: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.1, { type: "triangle", vol: 0.14, delay: i * 0.05 })),
      heart: () => [523, 784].forEach((f, i) => tone(f, 0.16, { type: "sine", vol: 0.18, delay: i * 0.08 })),
      jump2: () => tone(520, 0.12, { vol: 0.07, to: 980 }),
      swap: () => [392, 523, 659, 523, 392].forEach((f, i) => tone(f * 1.5, 0.1, { type: "sine", vol: 0.12, delay: i * 0.05 })),
      bossHit: () => {
        tone(220, 0.15, { type: "square", vol: 0.14, to: 110 });
        noise(0.1, { vol: 0.12, freq: 1500 });
      },
      clink: () => tone(1800, 0.06, { type: "triangle", vol: 0.06, to: 1500 }),
      roar: () => {
        tone(110, 0.8, { type: "sawtooth", vol: 0.18, to: 55 });
        noise(0.6, { vol: 0.15, freq: 250, filter: "lowpass" });
      },
      "/": () => tone(880 + Math.random() * 400, 0.12, { type: "sine", vol: 0.08 }), // el sello se deshace
      spring: () => tone(180, 0.35, { type: "triangle", vol: 0.2, to: 900 }),
      crumble: () => noise(0.3, { vol: 0.16, freq: 400, filter: "lowpass" }),
      shield: () => {
        tone(1400, 0.15, { type: "triangle", vol: 0.12, to: 900 });
        noise(0.08, { vol: 0.08, freq: 4000, filter: "highpass" });
      },
      dart: () => noise(0.06, { vol: 0.06, freq: 3000 }),
      boom: () => {
        noise(0.7, { vol: 0.35, freq: 300, filter: "lowpass" });
        tone(90, 0.5, { type: "sawtooth", vol: 0.12, to: 40 });
      },
      "[": () => noise(0.15, { vol: 0.1, freq: 600, filter: "lowpass" }), // trozos del muro agrietado
      move: () => tone(660, 0.04, { vol: 0.05 }),
      select: () => {
        tone(660, 0.06, { vol: 0.08 });
        tone(990, 0.1, { vol: 0.08, delay: 0.05 });
      },
      locked: () => tone(150, 0.18, { type: "sawtooth", vol: 0.1, to: 110 }),
    };

    return {
      unlock,
      play(name) {
        if (ac && !save.muted) effects[name]();
      },
      toggleMute() {
        save.muted = !save.muted;
        writeSave();
        if (master) master.gain.value = save.muted ? 0 : 0.35;
      },
    };
  })();

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let W = 0;
  let H = 0;

  let state = "title"; // title | levels | editor | playing | paused | dead | won | ending
  let testLevel = null; // nivel del editor que se está probando (null: niveles del juego)
  let levelIndex = 0;
  let menuIndex = 0; // opción marcada en el menú de pausa
  let lastResult = null; // qué récords se batieron en la última victoria
  let level = null;
  let grid = [];
  let liquids = [];
  let breakables = [];
  let dissolving = new Map(); // "c,r" -> { c, r, t, max }
  let barriers = [];
  let fans = [];
  let doors = {};
  let players = [];
  let boxes = [];
  let gems = [];
  let mechs = [];
  let portals = [];
  let enemies = [];
  let items = [];
  let shots = [];
  let darts = []; // dardos de las torretas
  let springs = [];
  let crumbles = []; // tablones frágiles: { c, r, t (frames hasta caer), gone (frames hasta volver) }
  let spikes = [];
  let boss = null; // jefe final (si el nivel tiene)
  let rocks = []; // rocas que suelta el jefe
  let waves = []; // ondas de choque cuando se estrella contra el suelo
  let shake = 0; // frames que le quedan a la sacudida de pantalla
  let bossDefeatedAt = 0; // levelFrames en que cayó el jefe (para el mensaje)
  let particles = [];
  let background = null;
  let tick = 0;
  let levelFrames = 0;
  let deadTimer = 0;
  let deathMessage = "";

  // ---------------------------------------------------------------------------
  // Mapa
  // ---------------------------------------------------------------------------
  function tileAt(c, r) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return "#";
    return grid[r][c];
  }

  function isSolidTile(t) {
    return t === "#" || t === CRUMBLE_TILE || t in BREAKABLE || t in LIQUID_BY_TILE || t in BARRIER_BY_TILE;
  }

  // Como isSolidTile, pero cada personaje atraviesa la barrera de su elemento.
  function isSolidFor(t, body) {
    if (t in BARRIER_BY_TILE && body?.kind === "player") return body.ch.immune !== BARRIER_BY_TILE[t];
    return isSolidTile(t);
  }

  function makeBody(kind, x, y, w, h) {
    return { kind, x, y, w, h, vx: 0, vy: 0, remX: 0, remY: 0 };
  }

  function loadLevel(index) {
    loadLevelData(LEVELS[index]);
  }

  // Carga un nivel. Con lenient (el editor) no lanza errores: devuelve la lista de problemas
  // y carga lo que puede, para poder ver mapas a medio hacer.
  function loadLevelData(data, lenient = false) {
    level = data;
    const where = `Nivel "${level.name}"`;
    const problems = [];
    const fail = (msg) => {
      if (!lenient) throw new Error(`${where}: ${msg}`);
      problems.push(msg);
    };
    const rows = level.map;
    rows.forEach((row, r) => {
      if (row.length !== rows[0].length) fail(`la fila ${r} mide ${row.length} y debería medir ${rows[0].length}`);
    });

    grid = rows.map((row) => row.padEnd(rows[0].length, " ").split(""));
    liquids = [];
    breakables = [];
    dissolving = new Map();
    barriers = [];
    fans = [];
    doors = {};
    boxes = [];
    gems = [];
    portals = [];
    enemies = [];
    items = [];
    shots = [];
    darts = [];
    springs = [];
    crumbles = [];
    spikes = [];
    boss = null;
    rocks = [];
    waves = [];
    shake = 0;
    bossDefeatedAt = 0;
    const spawns = {};

    const mechById = new Map();
    mechs = Object.entries(level.mechanisms || {}).map(([id, def], i) => {
      const m = {
        id,
        def,
        need: def.need || 1,
        color: def.color || MECH_COLORS[i % MECH_COLORS.length],
        cells: [],
        triggers: [],
        ox: 0,
        oy: 0,
        collidable: true,
        leverOn: false,
        active: false,
        pressedCount: 0,
      };
      mechById.set(id, m);
      return m;
    });

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const t = grid[r][c];
        if (t === "#" || t === " ") continue;
        if (t in LIQUID_BY_TILE) {
          liquids.push({ c, r, type: LIQUID_BY_TILE[t] });
          continue;
        }
        if (t in BREAKABLE) {
          breakables.push({ c, r, type: t });
          continue;
        }
        if (t in BARRIER_BY_TILE) {
          barriers.push({ c, r, type: BARRIER_BY_TILE[t] });
          continue;
        }
        if (t === CRUMBLE_TILE) {
          crumbles.push({ c, r, t: 0, gone: 0 });
          continue;
        }
        grid[r][c] = " ";
        if (t === SPRING_TILE) {
          springs.push({ c, r, squash: 0 });
          continue;
        }
        if (t === BOSS_TILE) {
          boss = makeBoss(c, r);
          continue;
        }
        if (t === SPIKES_TILE) {
          spikes.push({ c, r });
          continue;
        }
        if (CHARACTERS.some((ch) => ch.spawn === t)) spawns[t] = { c, r };
        else if (CHARACTERS.some((ch) => ch.door === t)) doors[t] = { c, r };
        else if (t in GEM_BY_TILE) gems.push({ c, r, type: GEM_BY_TILE[t], taken: false });
        else if (t === BOX_TILE) boxes.push(makeBody("box", c * T + (T - BOX) / 2, (r + 1) * T - BOX, BOX, BOX));
        else if (t === FAN_TILE) fans.push({ c, r, mech: null, on: true, top: r });
        else if (t in PORTAL_PAIR) portals.push({ c, r, id: t });
        else if (t in ITEM_BY_TILE) items.push({ c, r, type: ITEM_BY_TILE[t], taken: false });
        else if (t in ENEMY_BY_TILE) {
          const kind = ENEMY_BY_TILE[t];
          const { w, h, speed } = ENEMIES[kind];
          enemies.push(
            Object.assign(makeBody("enemy", c * T + (T - w) / 2, (r + 1) * T - h, w, h), {
              type: kind,
              vx: -speed,
              alive: true,
              facing: t === ">" ? 1 : -1, // hacia dónde dispara una torreta
              cooldown: TURRET_RATE / 2,
              anim: 0,
            }),
          );
        }
        else if (mechById.get(t)?.def.kind === "fan") fans.push({ c, r, mech: mechById.get(t), on: false, top: r });
        else if (mechById.has(t)) mechById.get(t).cells.push({ c, r });
        else if (mechById.has(t.toLowerCase())) mechById.get(t.toLowerCase()).triggers.push({ c, r, pressed: false, angle: -0.6 });
        else fail(`carácter desconocido "${t}" en la fila ${r}, columna ${c}`);
      }
    }

    for (const m of mechs) {
      if (!m.cells.length && !fans.some((f) => f.mech === m)) fail(`el mecanismo "${m.id}" no tiene casillas en el mapa`);
      if (!m.triggers.length) fail(`el mecanismo "${m.id}" no tiene botón/palanca "${m.id.toUpperCase()}"`);
      if (m.def.kind === "fan") continue;
      if (!m.def.move) {
        fail(`el mecanismo "${m.id}" necesita "move" (o kind: "fan")`);
        m.def = { ...m.def, move: [0, 0] };
      } else if (m.def.move[0] && m.def.move[1]) {
        fail(`el mecanismo "${m.id}" solo puede moverse en horizontal o en vertical`);
      }
    }
    for (const p of portals) {
      const pairs = portals.filter((o) => o.id === PORTAL_PAIR[p.id]);
      if (pairs.length !== 1 || portals.filter((o) => o.id === p.id).length !== 1) {
        fail(`el portal "${p.id}" necesita exactamente una pareja "${PORTAL_PAIR[p.id]}"`);
      }
      p.pair = pairs[0] || null;
    }

    players = CHARACTERS.flatMap((ch) => {
      const s = spawns[ch.spawn];
      if (!doors[ch.door]) fail(`falta la puerta de ${ch.name} ("${ch.door}")`);
      if (!s) {
        fail(`falta el inicio de ${ch.name} ("${ch.spawn}")`);
        return [];
      }
      return Object.assign(makeBody("player", s.c * T + (T - PW) / 2, (s.r + 1) * T - PH, PW, PH), {
        ch,
        facing: 1,
        onGround: true,
        pushing: false,
        coyote: 0,
        jumpBuffer: 0,
        anim: 0,
        alive: true,
        inDoor: false,
        inWind: false,
        hearts: MAX_HEARTS,
        hurt: 0, // frames de invencibilidad que quedan
        shotCooldown: 0,
        inv: { keys: 0, weapon: false, boots: false, shield: 0, bombs: 0 },
        controls: ch.keys,
        controlLabel: ch.keyLabel,
        swapFlash: 0, // frames que se enseñan sus teclas encima tras un cambio de personaje
        airJumps: 0, // saltos en el aire que le quedan (botas)
        springing: false, // lanzado por un muelle: soltar el salto no lo frena
      });
    });

    canvas.width = W = grid[0].length * T;
    canvas.height = H = grid.length * T;
    fitCanvas();
    background = buildBackground();
    particles = [];
    levelFrames = 0;
    return problems;
  }

  function restartLevel() {
    loadLevelData(testLevel || LEVELS[levelIndex]);
    state = "playing";
  }

  // ---------------------------------------------------------------------------
  // Colisiones (posiciones enteras, movimiento píxel a píxel)
  // ---------------------------------------------------------------------------
  function intersects(x, y, w, h, b) {
    return x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y;
  }

  function hitsMech(m, x, y, w, h) {
    for (const cell of m.cells) {
      const px = cell.c * T + m.ox;
      const py = cell.r * T + m.oy;
      if (x < px + T && x + w > px && y < py + T && y + h > py) return true;
    }
    return false;
  }

  function solidAt(x, y, w, h, self) {
    const c0 = Math.floor(x / T);
    const c1 = Math.floor((x + w - 1) / T);
    const r0 = Math.floor(y / T);
    const r1 = Math.floor((y + h - 1) / T);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (isSolidFor(tileAt(c, r), self)) return true;
      }
    }
    for (const m of mechs) {
      if (m.collidable && hitsMech(m, x, y, w, h)) return true;
    }
    for (const b of boxes) {
      // Una caja que ya se solapa con el cuerpo no lo bloquea (así nadie se queda atrapado).
      if (b !== self && intersects(x, y, w, h, b) && !(self && intersects(self.x, self.y, self.w, self.h, b))) return true;
    }
    return false;
  }

  function stepBody(b, sx, sy) {
    if (solidAt(b.x + sx, b.y + sy, b.w, b.h, b)) return false;
    b.x += sx;
    b.y += sy;
    return true;
  }

  function isOnGround(b) {
    return solidAt(b.x, b.y + 1, b.w, b.h, b);
  }

  function moveX(body, amount) {
    body.remX += amount;
    let move = Math.round(body.remX);
    body.remX -= move;
    const s = Math.sign(move);
    while (move !== 0) {
      if (stepBody(body, s, 0)) {
        move -= s;
        continue;
      }
      if (body.kind === "player") {
        const box = boxes.find(
          (b) => intersects(body.x + s, body.y, body.w, body.h, b) && !intersects(body.x, body.y, body.w, body.h, b),
        );
        if (box && stepBody(box, s, 0)) {
          body.pushing = true;
          if (stepBody(body, s, 0)) {
            move -= s;
            continue;
          }
        }
      }
      body.remX = 0;
      return false;
    }
    return true;
  }

  function moveY(body, amount) {
    body.remY += amount;
    let move = Math.round(body.remY);
    body.remY -= move;
    const s = Math.sign(move);
    while (move !== 0) {
      if (stepBody(body, 0, s) || (s < 0 && body.kind === "player" && slideAroundCorner(body))) {
        move -= s;
        continue;
      }
      body.remY = 0;
      return false;
    }
    return true;
  }

  // Al subir rozando el borde de un techo, desplaza un poco al personaje para que pase.
  function slideAroundCorner(body) {
    for (let d = 1; d <= CORNER_CORRECTION; d++) {
      for (const sx of [-d, d]) {
        if (!solidAt(body.x + sx, body.y, body.w, body.h, body) && !solidAt(body.x + sx, body.y - 1, body.w, body.h, body)) {
          body.x += sx;
          body.y -= 1;
          return true;
        }
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Mecanismos
  // ---------------------------------------------------------------------------
  function bodies() {
    return [...players.filter((p) => p.alive), ...boxes];
  }

  function updateTriggers() {
    const all = bodies();
    for (const m of mechs) {
      if (m.def.trigger === "lever") {
        for (const tr of m.triggers) {
          for (const p of players) {
            if (!p.alive || !intersects(tr.c * T + 4, tr.r * T, T - 8, T, p)) continue;
            const was = m.leverOn;
            if (p.vx > 0.5) m.leverOn = true;
            else if (p.vx < -0.5) m.leverOn = false;
            if (m.leverOn !== was) sound.play("lever");
          }
        }
        for (const tr of m.triggers) tr.angle += ((m.leverOn ? 0.6 : -0.6) - tr.angle) * 0.25;
        m.active = m.leverOn;
      } else {
        m.pressedCount = 0;
        for (const tr of m.triggers) {
          const was = tr.pressed;
          tr.pressed = all.some((b) => intersects(tr.c * T + 4, (tr.r + 1) * T - 6, T - 8, 6, b));
          if (tr.pressed !== was) sound.play(tr.pressed ? "press" : "release");
          if (tr.pressed) m.pressedCount++;
        }
        m.active = m.pressedCount >= m.need;
      }
    }
  }

  // Mueve la plataforma 1 píxel, arrastrando a quien va encima y empujando a quien estorba.
  // Si alguien quedaría aplastado, la plataforma no se mueve.
  function mechStep(m, sx, sy) {
    const all = bodies();
    const riders = all.filter((b) => !hitsMech(m, b.x, b.y, b.w, b.h) && hitsMech(m, b.x, b.y + 1, b.w, b.h));
    m.ox += sx;
    m.oy += sy;
    m.collidable = false;
    let ok = true;
    for (const b of all) {
      const hit = hitsMech(m, b.x, b.y, b.w, b.h);
      if (hit || riders.includes(b)) {
        const moved = stepBody(b, sx, sy);
        if (hit && !moved) ok = false;
      }
    }
    m.collidable = true;
    if (!ok) {
      m.ox -= sx;
      m.oy -= sy;
    }
    return ok;
  }

  function updateMechs() {
    for (const m of mechs) {
      if (m.def.kind === "fan") continue;
      const tx = m.active ? m.def.move[0] * T : 0;
      const ty = m.active ? m.def.move[1] * T : 0;
      const speed = m.def.speed || PLATFORM_SPEED;
      const dx = Math.max(-speed, Math.min(speed, tx - m.ox));
      const dy = Math.max(-speed, Math.min(speed, ty - m.oy));
      for (let i = 0; i < Math.abs(dx); i++) if (!mechStep(m, Math.sign(dx), 0)) break;
      for (let i = 0; i < Math.abs(dy); i++) if (!mechStep(m, 0, Math.sign(dy))) break;
    }
  }

  // ---------------------------------------------------------------------------
  // Ventiladores
  // ---------------------------------------------------------------------------
  function airBlocked(c, r) {
    if (isSolidTile(tileAt(c, r))) return true;
    return mechs.some((m) => m.collidable && hitsMech(m, c * T + 4, r * T + 4, T - 8, T - 8));
  }

  // La corriente sube desde el ventilador hasta FAN_RANGE casillas o hasta el primer obstáculo.
  function updateFans() {
    for (const f of fans) {
      f.on = !f.mech || f.mech.active;
      if (airBlocked(f.c, f.r)) {
        f.top = null;
        continue;
      }
      f.top = f.r;
      while (f.r - f.top < FAN_RANGE - 1 && !airBlocked(f.c, f.top - 1)) f.top--;
    }
  }

  // Devuelve el ventilador cuya corriente toca al personaje (o null).
  function windAt(p) {
    // La corriente sobresale FAN_HOVER píxeles por arriba: así se flota justo por encima del suelo
    // del piso superior y se puede salir andando.
    return (
      fans.find((f) => f.on && f.top !== null && intersects(f.c * T, f.top * T - FAN_HOVER, T, (f.r - f.top + 1) * T + FAN_HOVER, p)) ||
      null
    );
  }

  // ---------------------------------------------------------------------------
  // Bloques que se rompen (óxido, hielo, sal)
  // ---------------------------------------------------------------------------
  const key = (c, r) => `${c},${r}`;

  function startDissolve(c0, r0) {
    const type = tileAt(c0, r0);
    const queue = [[c0, r0, 0]];
    const seen = new Set([key(c0, r0)]);
    while (queue.length) {
      const [c, r, d] = queue.shift();
      if (!dissolving.has(key(c, r))) {
        const t = DISSOLVE_DELAY + d * DISSOLVE_SPREAD;
        dissolving.set(key(c, r), { c, r, t, max: t, type });
      }
      for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
        if (tileAt(nc, nr) === type && !seen.has(key(nc, nr))) {
          seen.add(key(nc, nr));
          queue.push([nc, nr, d + 1]);
        }
      }
    }
  }

  function updateBreakables() {
    for (const p of players) {
      if (!p.alive) continue;
      const c0 = Math.floor((p.x - 1) / T);
      const c1 = Math.floor((p.x + p.w) / T);
      const r0 = Math.floor((p.y - 1) / T);
      const r1 = Math.floor((p.y + p.h) / T);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const t = tileAt(c, r);
          if (dissolving.has(key(c, r))) continue;
          if (BREAKABLE[t]?.by === p.ch.immune) startDissolve(c, r);
          else if (t === LOCK_TILE && p.inv.keys > 0) {
            // Una llave abre la cerradura entera (todas las casillas | pegadas).
            p.inv.keys--;
            startDissolve(c, r);
          } else if (t === CRACKED_TILE && p.inv.bombs > 0) {
            p.inv.bombs--;
            explode(c, r);
          }
        }
      }
    }
    for (const [k, d] of dissolving) {
      if (--d.t > 0) continue;
      grid[d.r][d.c] = " ";
      dissolving.delete(k);
      burst(d.c * T + T / 2, d.r * T + T / 2, BREAKABLE[d.type].burst, 14);
      sound.play(d.type);
    }
  }

  // ---------------------------------------------------------------------------
  // Jugadores
  // ---------------------------------------------------------------------------
  function updatePlayer(p) {
    const k = p.controls; // las teclas son del jugador; el personaje (p.ch) puede cambiar con un amuleto
    const dir = (held.has(k.right) ? 1 : 0) - (held.has(k.left) ? 1 : 0);
    if (dir) p.facing = dir;

    const speed = p.pushing ? MOVE_SPEED * PUSH_SPEED_FACTOR : MOVE_SPEED;
    p.vx += (dir * speed - p.vx) * (p.onGround ? 0.35 : 0.2);
    if (Math.abs(p.vx) < 0.05) p.vx = 0;

    if (pressed.has(k.jump)) p.jumpBuffer = JUMP_BUFFER_FRAMES;
    else if (p.jumpBuffer > 0) p.jumpBuffer--;

    if (p.onGround) {
      p.coyote = COYOTE_FRAMES;
      p.airJumps = p.inv.boots ? 1 : 0;
    } else if (p.coyote > 0) p.coyote--;

    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -JUMP_SPEED;
      p.remY = 0;
      p.jumpBuffer = 0;
      p.coyote = 0;
      sound.play("jump");
    } else if (pressed.has(k.jump) && p.airJumps > 0 && !p.inWind) {
      // Segundo salto en el aire gracias a las botas.
      p.airJumps--;
      p.vy = -DOUBLE_JUMP_SPEED;
      p.remY = 0;
      p.jumpBuffer = 0;
      p.springing = false;
      burst(p.x + p.w / 2, p.y + p.h, ["#ffffff", "#ffd76a"], 8);
      sound.play("jump2");
    }

    p.vy += GRAVITY;
    const wind = windAt(p);
    if (wind && !p.inWind) sound.play("wind");
    p.inWind = !!wind;
    if (wind) {
      p.vy = Math.max(p.vy - FAN_LIFT, -FAN_MAX_RISE);
      // Sin teclas, la corriente centra al personaje para que no se enganche en los bordes del hueco.
      if (!dir) p.vx += ((wind.c + 0.5) * T - (p.x + p.w / 2)) * FAN_CENTERING;
    } else if (!held.has(k.jump) && p.vy < 0 && !p.springing) {
      // Soltar el salto antes de tiempo hace un salto más corto.
      p.vy += GRAVITY;
    }
    if (p.vy >= 0) p.springing = false;
    if (p.vy > MAX_FALL) p.vy = MAX_FALL;

    p.pushing = false;
    if (!moveX(p, p.vx)) p.vx = 0;
    if (!moveY(p, p.vy)) p.vy = 0;
    p.onGround = isOnGround(p);

    // Al caer sobre un muelle sale disparado hacia arriba.
    const spring = p.onGround && springs.find((s) => intersects(s.c * T + 6, (s.r + 1) * T - 8, T - 12, 8, p));
    if (spring) {
      p.vy = -SPRING_SPEED;
      p.springing = true;
      p.onGround = false;
      p.coyote = 0;
      spring.squash = 12;
      sound.play("spring");
    }

    if (p.onGround && Math.abs(p.vx) > 0.4) p.anim += Math.abs(p.vx) * 0.22;

    if (p.hurt > 0) p.hurt--;
    if (p.swapFlash > 0) p.swapFlash--;
    if (p.shotCooldown > 0) p.shotCooldown--;
    if (pressed.has(k.fire) && p.inv.weapon && p.shotCooldown === 0) shoot(p);

    const door = doors[p.ch.door];
    const cx = p.x + p.w / 2;
    p.inDoor =
      p.onGround &&
      cx >= door.c * T &&
      cx <= (door.c + 1) * T &&
      Math.floor((p.y + p.h - 1) / T) === door.r;
  }

  function updateBoxes() {
    for (const b of boxes) {
      b.vy = Math.min(b.vy + GRAVITY, MAX_FALL);
      if (!moveY(b, b.vy)) b.vy = 0;
    }
  }

  // Devuelve el elemento que mata al personaje si está pisando un charco ajeno.
  function deadlyLiquidUnder(p) {
    if (!p.onGround) return null;
    const r = Math.floor((p.y + p.h) / T);
    const left = Math.floor((p.x + POOL_MARGIN) / T);
    const right = Math.floor((p.x + p.w - 1 - POOL_MARGIN) / T);
    for (let c = left; c <= right; c++) {
      const type = LIQUID_BY_TILE[tileAt(c, r)];
      if (type && type !== p.ch.immune) return type;
    }
    return null;
  }

  function collectGems() {
    for (const g of gems) {
      if (g.taken) continue;
      for (const p of players) {
        if (p.alive && p.ch.immune === g.type && intersects(g.c * T + 8, g.r * T + 8, 16, 16, p)) {
          g.taken = true;
          burst(g.c * T + T / 2, g.r * T + T / 2, [ELEMENTS[g.type].gem, "#ffffff"], 16);
          sound.play("gem");
        }
      }
    }
  }

  function killPlayer(p, message, colors) {
    p.alive = false;
    deathMessage = message;
    burst(p.x + p.w / 2, p.y + p.h / 2, [...colors, p.ch.color, "#d8d8d8"], 45);
    state = "dead";
    deadTimer = 0;
    sound.play("death");
  }

  function drownPlayer(p, type) {
    const el = ELEMENTS[type];
    killPlayer(p, `${p.ch.name} cayó en ${el.name}`, [el.top, el.body]);
  }

  // Un golpe quita un corazón (o una carga de escudo), empuja hacia atrás y da un rato de invencibilidad.
  // from: lo que golpea (con x, w); cause: cómo se cuenta si el golpe mata.
  function hurtPlayer(p, from, cause) {
    const away = Math.sign(p.x + p.w / 2 - (from.x + from.w / 2)) || -p.facing;
    if (p.inv.shield > 0) {
      p.inv.shield--;
      p.hurt = HURT_FRAMES / 2;
      p.vx = away * KNOCKBACK * 0.6;
      p.vy = -KNOCKBACK * 0.6;
      burst(p.x + p.w / 2, p.y + p.h / 2, ["#7fd4ff", "#ffffff"], 14);
      sound.play("shield");
      return;
    }
    p.hearts--;
    if (p.hearts <= 0) {
      killPlayer(p, `${p.ch.name} ${cause}`, ["#5a3d6b", "#2b1d33"]);
      return;
    }
    p.hurt = HURT_FRAMES;
    p.vx = away * KNOCKBACK;
    p.vy = -KNOCKBACK;
    burst(p.x + p.w / 2, p.y + p.h / 2, ["#ff6b6b", "#ffffff"], 12);
    sound.play("hurt");
  }

  // Los pinchos quitan una vida (no matan de golpe como los charcos).
  function spikeContacts() {
    for (const s of spikes) {
      for (const p of players) {
        if (!p.alive || p.hurt > 0 || !intersects(s.c * T + 4, (s.r + 1) * T - 12, T - 8, 12, p)) continue;
        hurtPlayer(p, { x: s.c * T, w: T }, "se clavó unos pinchos");
        if (state !== "playing") return;
      }
    }
  }

  // Tablones frágiles: se caen un rato después de pisarlos y vuelven a aparecer más tarde.
  function updateCrumbles() {
    const standing = [...players.filter((p) => p.alive), ...boxes];
    for (const cr of crumbles) {
      const x = cr.c * T;
      const y = cr.r * T;
      if (cr.gone > 0) {
        // Solo vuelve si no hay nadie dentro de su hueco.
        if (--cr.gone === 0) {
          if ([...standing, ...enemies.filter((e) => e.alive)].some((b) => intersects(x, y, T, T, b))) cr.gone = 1;
          else grid[cr.r][cr.c] = CRUMBLE_TILE;
        }
      } else if (cr.t > 0) {
        if (--cr.t === 0) {
          grid[cr.r][cr.c] = " ";
          cr.gone = CRUMBLE_RESPAWN;
          burst(x + T / 2, y + T / 2, ["#8a5a2b", "#c58b4c", "#5e3d1a"], 12);
          sound.play("crumble");
        }
      } else if (standing.some((b) => intersects(x, y - 1, T, 1, b))) {
        cr.t = CRUMBLE_FRAMES;
      }
    }
  }

  // Bomba: abre el muro agrietado entero y acaba con los bichos que haya cerca.
  function explode(c, r) {
    startDissolve(c, r);
    const cx = c * T + T / 2;
    const cy = r * T + T / 2;
    for (const e of enemies) {
      if (e.alive && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < BOMB_RADIUS * T) defeatEnemy(e);
    }
    burst(cx, cy, ["#ffb347", "#ff6b3d", "#fff3c4", "#5a4a33"], 40);
    sound.play("boom");
  }

  // ---------------------------------------------------------------------------
  // Objetos (llaves, orbes de arma, corazones): cualquiera puede cogerlos y van a su inventario
  // ---------------------------------------------------------------------------
  function collectItems() {
    for (const it of items) {
      if (it.taken) continue;
      for (const p of players) {
        if (!p.alive || !intersects(it.c * T + 6, it.r * T + 6, T - 12, T - 12, p)) continue;
        // Quien ya lo tiene (arma, botas, escudo lleno) o tiene la vida llena lo deja para otro.
        if (it.type === "weapon" && p.inv.weapon) continue;
        if (it.type === "boots" && p.inv.boots) continue;
        if (it.type === "shield" && p.inv.shield >= MAX_SHIELDS) continue;
        if (it.type === "swap") {
          swapCharacters();
        } else if (it.type === "heart") {
          if (p.hearts >= MAX_HEARTS) continue;
          p.hearts++;
          sound.play("heart");
        } else {
          if (it.type === "key") p.inv.keys++;
          else if (it.type === "weapon") p.inv.weapon = true;
          else if (it.type === "boots") p.inv.boots = true;
          else if (it.type === "shield") p.inv.shield++;
          else p.inv.bombs++;
          sound.play("pickup");
        }
        it.taken = true;
        burst(it.c * T + T / 2, it.r * T + T / 2, ["#ffe08a", "#ffffff"], 14);
        break;
      }
    }
  }

  // Amuleto del cambio: los tres cambian de personaje en ronda (Fireboy → Watergirl → AcidBaby → Fireboy).
  // Cada jugador conserva sus teclas, su sitio y su inventario; cambian su elemento y su puerta.
  function swapCharacters() {
    for (const p of players) {
      p.ch = CHARACTERS[(CHARACTERS.indexOf(p.ch) + 1) % CHARACTERS.length];
      p.swapFlash = 150;
      // Quien estaba cruzando una barrera que ahora es sólida para él sale al hueco libre más cercano.
      for (let d = 1; d <= T && solidAt(p.x, p.y, p.w, p.h, p); d++) {
        if (!solidAt(p.x, p.y + d, p.w, p.h, p)) p.y += d;
        else if (!solidAt(p.x, p.y - d, p.w, p.h, p)) p.y -= d;
      }
      burst(p.x + p.w / 2, p.y + p.h / 2, [p.ch.color, "#ffffff", ELEMENTS[p.ch.immune].top], 24);
    }
    sound.play("swap");
  }

  // ---------------------------------------------------------------------------
  // Portales: personajes y cajas aparecen en la pareja conservando su velocidad
  // ---------------------------------------------------------------------------
  function portalUnder(b) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    return portals.find((p) => cx >= p.c * T && cx < (p.c + 1) * T && cy >= p.r * T - 8 && cy < (p.r + 1) * T) || null;
  }

  function updatePortals() {
    for (const b of [...players.filter((p) => p.alive), ...boxes]) {
      const here = portalUnder(b);
      // Tras salir por un portal hay que dejarlo antes de poder volver a usarlo.
      if (b.portalLock) {
        if (here !== b.portalLock) b.portalLock = null;
        continue;
      }
      if (!here) continue;
      const to = here.pair;
      if (!to) continue;
      const nx = to.c * T + (T - b.w) / 2;
      const ny = (to.r + 1) * T - b.h;
      if (solidAt(nx, ny, b.w, b.h, b)) continue;
      burst(b.x + b.w / 2, b.y + b.h / 2, [PORTAL_COLORS[here.id], "#ffffff"], 10);
      b.x = nx;
      b.y = ny;
      b.remX = b.remY = 0;
      b.portalLock = to;
      burst(nx + b.w / 2, ny + b.h / 2, [PORTAL_COLORS[to.id], "#ffffff"], 10);
      sound.play("portal");
    }
  }

  // ---------------------------------------------------------------------------
  // Enemigos
  // ---------------------------------------------------------------------------
  function nearestPlayer(e, maxDx, maxDy) {
    let best = null;
    let bestD = Infinity;
    for (const p of players) {
      if (!p.alive) continue;
      const dx = p.x + p.w / 2 - (e.x + e.w / 2);
      const dy = p.y + p.h / 2 - (e.y + e.h / 2);
      if (Math.abs(dx) >= maxDx || Math.abs(dy) >= maxDy) continue;
      const d = Math.hypot(dx, dy);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  function updateEnemies() {
    for (const e of enemies) {
      if (!e.alive) continue;
      const def = ENEMIES[e.type];
      e.anim++;
      if (e.type === "turret") {
        // Dispara cuando ve a alguien en su fila, delante de ella.
        if (e.cooldown > 0) e.cooldown--;
        const seen = players.some(
          (p) => p.alive && Math.abs(p.y + p.h - (e.y + e.h)) < T && (p.x - e.x) * e.facing > 0 && Math.abs(p.x - e.x) < TURRET_SIGHT * T,
        );
        if (seen && e.cooldown === 0) {
          e.cooldown = TURRET_RATE;
          darts.push({ x: e.facing > 0 ? e.x + e.w : e.x - 10, y: e.y + 8, w: 10, h: 6, vx: e.facing * DART_SPEED });
          sound.play("dart");
        }
        continue;
      }
      if (e.type === "ghost") {
        // Atraviesa las paredes hacia el personaje más cercano; si no ve a nadie, flota quieto.
        const p = nearestPlayer(e, GHOST_SIGHT * T, GHOST_SIGHT_ROWS * T);
        if (p) {
          const dx = p.x + p.w / 2 - (e.x + e.w / 2);
          const dy = p.y + p.h / 2 - (e.y + e.h / 2);
          const d = Math.hypot(dx, dy) || 1;
          e.x += (dx / d) * def.speed;
          e.y += (dy / d) * def.speed;
          e.vx = dx;
        }
        continue;
      }
      if (!def.flies) {
        e.vy = Math.min(e.vy + GRAVITY, MAX_FALL);
        if (!moveY(e, e.vy)) e.vy = 0;
        // El escarabajo se da la vuelta antes de caerse de un borde.
        const dir = Math.sign(e.vx);
        const aheadX = dir > 0 ? e.x + e.w : e.x - 1;
        if (isOnGround(e) && !solidAt(aheadX, e.y + e.h, 1, 1, e)) e.vx = -e.vx;
      }
      if (!moveX(e, e.vx)) e.vx = -e.vx;
    }
  }

  function enemyContacts() {
    for (const e of enemies) {
      if (!e.alive) continue;
      for (const p of players) {
        if (!p.alive || !intersects(e.x + 2, e.y + 2, e.w - 4, e.h - 2, p)) continue;
        const wasAbove = p.y + p.h - p.vy <= e.y + 6;
        if (p.vy > 0 && wasAbove && ENEMIES[e.type].stompable) {
          defeatEnemy(e);
          p.vy = -STOMP_BOUNCE;
          sound.play("stomp");
        } else if (p.hurt === 0) {
          // Saltar sobre un erizo también duele (y rebota).
          if (wasAbove && e.type === "hedgehog") p.vy = -STOMP_BOUNCE;
          hurtPlayer(p, e, `fue derrotado por ${ENEMIES[e.type].name}`);
          if (state !== "playing") return;
        }
      }
    }
  }

  function updateDarts() {
    for (const d of darts) {
      d.x += d.vx;
      const hit = players.find((p) => p.alive && (!d.target || p === d.target) && intersects(d.x, d.y, d.w, d.h, p));
      if (hit) {
        if (hit.hurt === 0) hurtPlayer(hit, d, d.cause || "fue alcanzado por un dardo");
        d.dead = true;
        if (state !== "playing") break;
      } else if (solidAt(d.x, d.y, d.w, d.h, null)) {
        // Las paredes, las barreras y las cajas paran los dardos.
        burst(d.x + d.w / 2, d.y + d.h / 2, ["#c9c2b0", "#6d6658"], 5);
        d.dead = true;
      }
    }
    darts = darts.filter((d) => !d.dead);
  }

  function defeatEnemy(e) {
    e.alive = false;
    burst(e.x + e.w / 2, e.y + e.h / 2, ["#6b4f8a", "#2b1d33", "#c9b6e4"], 20);
  }

  // ---------------------------------------------------------------------------
  // Disparos: cada personaje lanza su elemento, que rompe a distancia el bloque que él rompe
  // ---------------------------------------------------------------------------
  function shoot(p) {
    p.shotCooldown = SHOT_COOLDOWN;
    shots.push({
      owner: p,
      type: p.ch.immune,
      x: p.x + p.w / 2 - 5 + p.facing * 8,
      y: p.y + 8,
      w: 10,
      h: 10,
      vx: p.facing * SHOT_SPEED,
      life: SHOT_LIFE,
    });
    sound.play("shot");
  }

  function updateShots() {
    for (const s of shots) {
      s.x += s.vx;
      s.life--;
      if (boss && hitBoss(s)) {
        s.life = 0;
        continue;
      }
      const hitEnemy = enemies.find((e) => e.alive && intersects(s.x, s.y, s.w, s.h, e));
      if (hitEnemy) {
        defeatEnemy(hitEnemy);
        sound.play("hit");
        s.life = 0;
        continue;
      }
      if (solidAt(s.x, s.y, s.w, s.h, s.owner)) {
        const c = Math.floor((s.x + s.w / 2 + Math.sign(s.vx) * 4) / T);
        const r = Math.floor((s.y + s.h / 2) / T);
        const t = tileAt(c, r);
        if (BREAKABLE[t]?.by === s.type && !dissolving.has(key(c, r))) startDissolve(c, r);
        const el = ELEMENTS[s.type];
        burst(s.x + s.w / 2, s.y + s.h / 2, [el.top, el.body], 8);
        s.life = 0;
      }
    }
    shots = shots.filter((s) => s.life > 0);
  }

  // ---------------------------------------------------------------------------
  // Jefe final: flota sobre la arena; su ojo cambia de color y solo le daña ese elemento
  // ---------------------------------------------------------------------------
  function makeBoss(c, r) {
    const cfg = level.boss || {};
    const aimRow = cfg.aimRow ?? 11; // fila desde la que se le dispara al ojo cuando flota
    const shotCenter = (row) => (row + 1) * T - PH + 13;
    const visorCenter = (BOSS_VISOR[0] + BOSS_VISOR[1]) / 2;
    return {
      name: cfg.name || "El Guardián del Templo",
      x: c * T,
      y: shotCenter(aimRow) - visorCenter,
      hoverY: shotCenter(aimRow) - visorCenter,
      groundY: (grid.length - 1) * T - BOSS_H,
      aimRow,
      minX: (cfg.left ?? 6) * T,
      maxX: ((cfg.right ?? grid[0].length - 7) + 1) * T - BOSS_W,
      dir: 1,
      phase: 0,
      hp: BOSS_HP,
      state: "intro", // intro | hover | rise | dive | ground | return | dying | dead
      timer: BOSS_INTRO,
      dartTimer: 60,
      rockTimer: 100,
      slamTimer: BOSS_SLAM_RATE,
      flash: 0,
    };
  }

  const bossBody = (b) => ({ x: b.x, y: b.y, w: BOSS_W, h: BOSS_H });

  // Un disparo que toca al jefe se gasta; solo le hace daño en el ojo y con el elemento de la fase.
  function hitBoss(s) {
    const b = boss;
    if (b.state === "dying" || b.state === "dead" || !intersects(s.x, s.y, s.w, s.h, bossBody(b))) return false;
    const visor = { x: b.x, y: b.y + BOSS_VISOR[0], w: BOSS_W, h: BOSS_VISOR[1] - BOSS_VISOR[0] };
    const el = BOSS_PHASES[b.phase];
    if (b.state !== "intro" && s.type === el && intersects(s.x, s.y, s.w, s.h, visor)) {
      b.hp--;
      b.flash = 10;
      burst(s.x + s.w / 2, s.y + s.h / 2, [ELEMENTS[el].top, ELEMENTS[el].body, "#ffffff"], 16);
      sound.play("bossHit");
      if (b.hp <= 0) nextBossPhase(b);
    } else {
      burst(s.x + s.w / 2, s.y + s.h / 2, ["#c9c2b0", "#6d6658"], 6);
      sound.play("clink");
    }
    return true;
  }

  function nextBossPhase(b) {
    if (b.phase < BOSS_PHASES.length - 1) {
      b.phase++;
      b.hp = BOSS_HP;
      b.slamTimer = 120;
      shake = Math.max(shake, 14);
      burst(b.x + BOSS_W / 2, b.y + BOSS_H / 2, [ELEMENTS[BOSS_PHASES[b.phase]].body, "#ffffff"], 40);
      sound.play("roar");
    } else {
      b.state = "dying";
      b.timer = 100;
      sound.play("roar");
    }
  }

  function spawnEnemy(kind, x, y) {
    const { w, h, speed } = ENEMIES[kind];
    enemies.push(Object.assign(makeBody("enemy", x, y, w, h), { type: kind, vx: -speed, alive: true, facing: -1, cooldown: 0, anim: 0 }));
  }

  function updateBoss() {
    const b = boss;
    if (b.flash > 0) b.flash--;
    updateRocksAndWaves();
    if (b.state === "dead") return;
    if (b.state === "dying") {
      shake = Math.max(shake, 4);
      if (b.timer % 6 === 0) {
        burst(b.x + Math.random() * BOSS_W, b.y + Math.random() * BOSS_H, ["#ffb347", "#c86bff", "#ffffff"], 12);
        sound.play("crumble");
      }
      if (--b.timer <= 0) defeatBoss(b);
      return;
    }
    if (b.state === "intro") {
      if (--b.timer <= 0) b.state = "hover";
      return;
    }

    const phase = b.phase;
    if (b.state === "hover") {
      b.x += b.dir * BOSS_SPEED[phase];
      if (b.x <= b.minX) [b.x, b.dir] = [b.minX, 1];
      if (b.x >= b.maxX) [b.x, b.dir] = [b.maxX, -1];
      // Dardo de piedra a la altura del ojo contra quien puede hacerle daño (el del color de su ojo)
      if (--b.dartTimer <= 0) {
        b.dartTimer = BOSS_DART_RATE[phase];
        const target = players.find((p) => p.alive && p.ch.immune === BOSS_PHASES[phase]);
        if (target) {
          const dir = Math.sign(target.x - (b.x + BOSS_W / 2)) || 1;
          // Solo hiere a su objetivo: atraviesa a los demás (va del color del ojo para que se vea).
          darts.push({ x: dir > 0 ? b.x + BOSS_W : b.x - 12, y: b.y + 55, w: 12, h: 6, vx: dir * 3.5, cause: "fue alcanzado por el Guardián", target, color: ELEMENTS[BOSS_PHASES[phase]].body });
          sound.play("dart");
        }
      }
      // Lluvia de rocas sobre la arena
      if (--b.rockTimer <= 0) {
        b.rockTimer = BOSS_ROCK_RATE[phase];
        for (const vx of [-2.2, 0, 2.2]) rocks.push({ x: b.x + BOSS_W / 2 - 7, y: b.y + BOSS_H, w: 14, h: 14, vx, vy: -1.5 });
      }
      if (phase >= 1 && --b.slamTimer <= 0) b.state = "rise";
    } else if (b.state === "rise") {
      b.y -= 3;
      if (b.y <= b.hoverY - 70) b.state = "dive";
    } else if (b.state === "dive") {
      b.y += 9;
      if (b.y >= b.groundY) {
        // Se estrella: tiembla todo y salen ondas de choque por el suelo
        b.y = b.groundY;
        b.state = "ground";
        b.timer = BOSS_GROUND_TIME;
        shake = 22;
        const floorY = b.groundY + BOSS_H;
        waves.push({ x: b.x - 24, y: floorY - 14, w: 22, h: 14, vx: -4 }, { x: b.x + BOSS_W + 2, y: floorY - 14, w: 22, h: 14, vx: 4 });
        burst(b.x + BOSS_W / 2, floorY, ["#8a7a62", "#c9c2b0"], 30);
        sound.play("boom");
        if (phase >= 2) {
          const batY = (b.aimRow + 1) * T - ENEMIES.bat.h;
          spawnEnemy("bat", b.minX, batY);
          spawnEnemy("bat", b.maxX + BOSS_W - ENEMIES.bat.w, batY);
        }
      }
    } else if (b.state === "ground") {
      if (--b.timer <= 0) b.state = "return";
    } else if (b.state === "return") {
      b.y -= 3;
      if (b.y <= b.hoverY) {
        b.y = b.hoverY;
        b.state = "hover";
        b.slamTimer = BOSS_SLAM_RATE;
      }
    }

    // Tocarlo duele (y si cae encima de alguien, más)
    const body = { x: b.x + 6, y: b.y + 6, w: BOSS_W - 12, h: BOSS_H - 10 };
    for (const p of players) {
      if (p.alive && p.hurt === 0 && intersects(body.x, body.y, body.w, body.h, p)) {
        hurtPlayer(p, bossBody(b), "fue aplastado por el Guardián");
        if (state !== "playing") return;
      }
    }
  }

  function updateRocksAndWaves() {
    for (const r of rocks) {
      r.vy = Math.min(r.vy + 0.3, MAX_FALL);
      r.x += r.vx;
      r.y += r.vy;
      const hit = players.find((p) => p.alive && intersects(r.x, r.y, r.w, r.h, p));
      if (hit) {
        if (hit.hurt === 0) hurtPlayer(hit, r, "fue golpeado por una roca");
        r.dead = true;
      } else if (solidAt(r.x, r.y, r.w, r.h, null)) {
        burst(r.x + r.w / 2, r.y + r.h, ["#8a7a62", "#5a4a33"], 6);
        r.dead = true;
      }
      if (state !== "playing") break;
    }
    rocks = rocks.filter((r) => !r.dead);
    for (const w of waves) {
      w.x += w.vx;
      const hit = players.find((p) => p.alive && intersects(w.x, w.y, w.w, w.h, p));
      if (hit && hit.hurt === 0) hurtPlayer(hit, w, "no saltó la onda del Guardián");
      if (solidAt(w.x, w.y, w.w, w.h - 2, null) || w.x < -40 || w.x > W + 40) w.dead = true;
      if (state !== "playing") break;
    }
    waves = waves.filter((w) => !w.dead);
  }

  function defeatBoss(b) {
    b.state = "dead";
    bossDefeatedAt = levelFrames;
    shake = 30;
    burst(b.x + BOSS_W / 2, b.y + BOSS_H / 2, ["#ffb347", "#c86bff", "#ffe08a", "#ffffff", "#5a4a33"], 90);
    sound.play("boom");
    sound.play("win");
    // Caen sus murciélagos, sus rocas y el sello de las puertas.
    for (const e of enemies) if (e.alive) defeatEnemy(e);
    rocks = [];
    waves = [];
    darts = [];
    for (const br of breakables) {
      if (br.type === SEAL_TILE && grid[br.r][br.c] === SEAL_TILE && !dissolving.has(key(br.c, br.r))) startDissolve(br.c, br.r);
    }
  }

  function winLevel() {
    state = "won";
    for (const p of players) {
      burst(p.x + p.w / 2, p.y, [p.ch.color, "#ffffff", ELEMENTS[p.ch.immune].top], 30);
    }
    sound.play("win");

    // Los niveles del editor no guardan récords.
    if (testLevel) {
      lastResult = null;
      return;
    }
    const prev = recordOf(levelIndex);
    const taken = gemCount().taken;
    lastResult = {
      first: !prev?.done,
      time: !!prev?.done && levelFrames < prev.bestFrames,
      gems: !!prev?.done && taken > prev.bestGems,
    };
    save.levels[level.name] = {
      done: true,
      bestFrames: prev?.done ? Math.min(prev.bestFrames, levelFrames) : levelFrames,
      bestGems: Math.max(prev?.bestGems || 0, taken),
    };
    writeSave();
  }

  // ---------------------------------------------------------------------------
  // Menús
  // ---------------------------------------------------------------------------
  const CARD_W = 168;
  const CARD_H = 172;
  const CARD_GAP = 20;
  // Hasta 10 niveles, filas de 5; con más, dos filas de tarjetas más estrechas para que quepan.
  // Con más de 16, tres filas de tarjetas más bajas.
  const cardsPerRow = () => (LEVELS.length <= 10 ? 5 : Math.ceil(LEVELS.length / (LEVELS.length <= 16 ? 2 : 3)));
  // Probando un nivel del editor, la pausa lleva de vuelta al editor en vez de al menú.
  const pauseItems = () => ["Continuar", "Reiniciar nivel", testLevel ? "Volver al editor" : "Elegir nivel", "Sonido"];

  function editorButtonRect() {
    return { x: W - 214, y: 44, w: 190, h: 36 };
  }

  function levelCardRect(i) {
    const perRow = cardsPerRow();
    // El ancho se calcula sobre 1024 px como mucho: así no cambia al pasar por un nivel más ancho.
    const w = Math.min(CARD_W, (Math.min(W, 1024) - 60 - (perRow - 1) * CARD_GAP) / perRow);
    const rows = Math.ceil(LEVELS.length / perRow);
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, LEVELS.length - row * perRow);
    const rowW = inRow * w + (inRow - 1) * CARD_GAP;
    const h = Math.min(CARD_H, (576 - 200 - (rows - 1) * CARD_GAP) / rows);
    const top = H / 2 - (rows * h + (rows - 1) * CARD_GAP) / 2 + 16;
    return {
      x: W / 2 - rowW / 2 + (i % perRow) * (w + CARD_GAP),
      y: top + row * (h + CARD_GAP),
      w,
      h,
    };
  }

  function pauseItemRect(i) {
    return { x: W / 2 - 150, y: H / 2 - 70 + i * 48, w: 300, h: 40 };
  }

  const pointerIn = (r) => pointer && pointer.x >= r.x && pointer.x <= r.x + r.w && pointer.y >= r.y && pointer.y <= r.y + r.h;

  // Devuelve el índice que señala el ratón (si se ha movido) o null.
  function pointedItem(count, rectOf) {
    if (!pointerMoved && !clicked) return null;
    for (let i = 0; i < count; i++) if (pointerIn(rectOf(i))) return i;
    return null;
  }

  // El fondo del menú de niveles es el propio nivel marcado.
  function selectLevel(i) {
    if (i === levelIndex) return;
    levelIndex = i;
    loadLevel(i);
    sound.play("move");
  }

  function openLevelMenu() {
    state = "levels";
    testLevel = null;
    // Por defecto, el primer nivel sin completar.
    let i = LEVELS.findIndex((_, j) => isUnlocked(j) && !recordOf(j)?.done);
    if (i < 0) i = levelIndex;
    levelIndex = i;
    loadLevel(i);
  }

  function updateLevelMenu() {
    const n = LEVELS.length;
    let i = levelIndex;
    if (menuKey("left")) i = (i + n - 1) % n;
    if (menuKey("right")) i = (i + 1) % n;
    const perRow = cardsPerRow();
    if (menuKey("up") && i - perRow >= 0) i -= perRow;
    if (menuKey("down") && i + perRow < n) i += perRow;
    const pointed = pointedItem(n, levelCardRect);
    if (pointed !== null) i = pointed;
    selectLevel(i);

    if (menuKey("ok") || (clicked && pointed !== null)) {
      if (isUnlocked(levelIndex)) {
        sound.play("select");
        restartLevel();
      } else {
        sound.play("locked");
      }
    } else if (menuKey("back")) {
      state = "title";
    } else if (pressed.has("KeyE") || (clicked && pointerIn(editorButtonRect()))) {
      openEditor();
    }
  }

  function pauseGame() {
    state = "paused";
    menuIndex = 0;
  }

  function updatePauseMenu() {
    const items = pauseItems();
    const n = items.length;
    const before = menuIndex;
    if (menuKey("up")) menuIndex = (menuIndex + n - 1) % n;
    if (menuKey("down")) menuIndex = (menuIndex + 1) % n;
    const pointed = pointedItem(n, pauseItemRect);
    if (pointed !== null) menuIndex = pointed;
    if (menuIndex !== before) sound.play("move");

    if (menuKey("back") || pressed.has("KeyP")) {
      state = "playing";
    } else if (menuKey("ok") || (clicked && pointed !== null)) {
      const choice = items[menuIndex];
      if (choice === "Continuar") state = "playing";
      else if (choice === "Reiniciar nivel") restartLevel();
      else if (choice === "Elegir nivel") openLevelMenu();
      else if (choice === "Volver al editor") backToEditor();
      else sound.toggleMute();
      sound.play("select");
    }
  }

  // ---------------------------------------------------------------------------
  // Partículas
  // ---------------------------------------------------------------------------
  function burst(x, y, colors, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3.5;
      const life = 40 + Math.random() * 50;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 1.8,
        g: 0.06,
        life, max: life,
        size: 2 + Math.random() * 3,
        color: colors[i % colors.length],
      });
    }
  }

  function updateParticles() {
    for (const q of particles) {
      q.vy += q.g;
      q.vx *= 0.98;
      q.x += q.vx;
      q.y += q.vy;
      q.life--;
    }
    particles = particles.filter((q) => q.life > 0);
  }

  // ---------------------------------------------------------------------------
  // Bucle principal
  // ---------------------------------------------------------------------------
  function update() {
    tick++;

    if (pressed.has("KeyM")) sound.toggleMute();

    if (state === "title") {
      if (menuKey("ok") || clicked) {
        sound.play("select");
        openLevelMenu();
      }
    } else if (state === "levels") {
      updateLevelMenu();
    } else if (state === "editor") {
      if (menuKey("back")) closeEditor();
    } else if (state === "paused") {
      updatePauseMenu();
    } else if (state === "playing") {
      if (pressed.has("KeyR")) {
        restartLevel();
      } else if (menuKey("back") || pressed.has("KeyP")) {
        pauseGame();
      } else {
        levelFrames++;
        updateTriggers();
        updateMechs();
        updateFans();
        for (const p of players) updatePlayer(p);
        updateBoxes();
        updateCrumbles();
        for (const s of springs) if (s.squash > 0) s.squash--;
        updatePortals();
        updateEnemies();
        updateShots();
        updateDarts();
        if (boss && state === "playing") updateBoss();
        updateBreakables();
        collectGems();
        collectItems();
        for (const p of players) {
          const type = state === "playing" && deadlyLiquidUnder(p);
          if (type) {
            drownPlayer(p, type);
            break;
          }
        }
        if (state === "playing") enemyContacts();
        if (state === "playing") spikeContacts();
        if (shake > 0) shake--;
        if (state === "playing" && players.every((p) => p.inDoor)) winLevel();
      }
    } else if (state === "dead") {
      deadTimer++;
      if (pressed.has("KeyR") || deadTimer > RESTART_DELAY) restartLevel();
    } else if (state === "won") {
      if (testLevel) {
        if (menuKey("ok") || menuKey("back")) backToEditor();
      } else if (menuKey("ok")) {
        sound.play("select");
        if (levelIndex + 1 < LEVELS.length) {
          levelIndex++;
          restartLevel();
        } else {
          state = "ending";
        }
      } else if (menuKey("back")) {
        openLevelMenu();
      }
    } else if (state === "ending") {
      if (menuKey("ok") || menuKey("back") || clicked) openLevelMenu();
    }

    updateParticles();
    pressed.clear();
    pointerMoved = false;
    clicked = false;
  }

  // ---------------------------------------------------------------------------
  // Editor de niveles: la interfaz está en editor.js; aquí, lo que necesita del juego
  // ---------------------------------------------------------------------------
  function openEditor() {
    if (!globalThis.Editor) return;
    testLevel = null;
    state = "editor";
    globalThis.Editor.open();
  }

  function closeEditor() {
    globalThis.Editor?.close();
    openLevelMenu();
  }

  function backToEditor() {
    testLevel = null;
    state = "editor";
    globalThis.Editor?.resume();
  }

  globalThis.Juego = {
    T,
    characters: CHARACTERS,
    // Muestra el nivel en el lienzo sin jugarlo y devuelve sus problemas.
    preview(data) {
      state = "editor";
      return loadLevelData(data, true);
    },
    // Lo juega si no tiene problemas; si los tiene, los devuelve sin jugar.
    test(data) {
      const problems = loadLevelData(data, true);
      if (problems.length) return problems;
      testLevel = data;
      restartLevel();
      return [];
    },
    cellAt(clientX, clientY) {
      const p = toCanvas({ clientX, clientY });
      const c = Math.floor(p.x / T);
      const r = Math.floor(p.y / T);
      return c >= 0 && r >= 0 && c < grid[0].length && r < grid.length ? { c, r } : null;
    },
    close: closeEditor,
    fit: () => fitCanvas(),
    get state() {
      return state;
    },
  };

  const STEP = 1000 / 60;
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    acc += Math.min(now - last, 250);
    last = now;
    while (acc >= STEP) {
      update();
      acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // Dibujo: utilidades
  // ---------------------------------------------------------------------------
  function roundRectPath(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // Gota con la punta en (tx, ty) y la parte redonda centrada en (cx, cy).
  function dropletPath(tx, ty, cx, cy, r) {
    const d = Math.hypot(tx - cx, ty - cy);
    const theta = Math.atan2(ty - cy, tx - cx);
    const alpha = Math.acos(Math.min(1, r / d));
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.arc(cx, cy, r, theta + alpha, theta - alpha + Math.PI * 2);
    ctx.closePath();
  }

  function flamePath(cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.bezierCurveTo(cx + s * 0.9, cy - s * 0.2, cx + s * 0.75, cy + s, cx, cy + s);
    ctx.bezierCurveTo(cx - s * 0.75, cy + s, cx - s * 0.9, cy - s * 0.2, cx, cy - s);
    ctx.closePath();
  }

  function drawIcon(type, cx, cy, s) {
    const el = ELEMENTS[type];
    ctx.save();
    if (type === "fire") {
      ctx.fillStyle = el.body;
      flamePath(cx, cy, s);
      ctx.fill();
      ctx.fillStyle = el.top;
      flamePath(cx, cy + s * 0.35, s * 0.55);
      ctx.fill();
    } else if (type === "water") {
      ctx.fillStyle = el.body;
      dropletPath(cx, cy - s, cx, cy + s * 0.3, s * 0.65);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(cx - s * 0.22, cy + s * 0.15, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const bubbles = [[-0.35, 0.35, 0.5], [0.4, 0.2, 0.42], [0.05, -0.5, 0.35]];
      for (const [bx, by, br] of bubbles) {
        ctx.fillStyle = el.body;
        ctx.beginPath();
        ctx.arc(cx + bx * s, cy + by * s, br * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = el.top;
        ctx.beginPath();
        ctx.arc(cx + bx * s - br * s * 0.3, cy + by * s - br * s * 0.3, br * s * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function gemPath(cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.85, cy - s * 0.25);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s * 0.85, cy - s * 0.25);
    ctx.closePath();
  }

  function text(str, x, y, size, color, align = "center", weight = "bold") {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function formatTime(frames) {
    const s = Math.floor(frames / 60);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // ---------------------------------------------------------------------------
  // Dibujo: escenario
  // ---------------------------------------------------------------------------
  function drawStone(g, x, y, row) {
    g.fillStyle = "#5a4a33";
    g.fillRect(x, y, T, T);
    g.fillStyle = "#47392650";
    g.fillRect(x, y + T / 2 - 1, T, 2);
    const a = row % 2 ? 8 : 24;
    g.fillRect(x + a, y, 2, T / 2);
    g.fillRect(x + ((a + 16) % T), y + T / 2, 2, T / 2);
  }

  function buildBackground() {
    const bg = document.createElement("canvas");
    bg.width = W;
    bg.height = H;
    const g = bg.getContext("2d");

    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#2b2419");
    grad.addColorStop(1, "#15110c");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    // Ladrillos tenues del fondo del templo
    g.strokeStyle = "rgba(255,255,255,0.035)";
    g.lineWidth = 1;
    for (let y = 0; y < H; y += T / 2) {
      g.beginPath();
      g.moveTo(0, y + 0.5);
      g.lineTo(W, y + 0.5);
      g.stroke();
      const off = (y / (T / 2)) % 2 ? T / 2 : 0;
      for (let x = off; x < W; x += T) {
        g.beginPath();
        g.moveTo(x + 0.5, y);
        g.lineTo(x + 0.5, y + T / 2);
        g.stroke();
      }
    }

    // Los bloques oxidados se dibujan aparte porque pueden desaparecer.
    const isWall = (t) => t === "#" || t in LIQUID_BY_TILE;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (!isWall(grid[r][c])) continue;
        const x = c * T;
        const y = r * T;
        drawStone(g, x, y, r);
        if (!isWall(tileAt(c, r - 1))) {
          g.fillStyle = "#8f7752";
          g.fillRect(x, y, T, 3);
        }
        if (!isWall(tileAt(c, r + 1))) {
          g.fillStyle = "#2e2519";
          g.fillRect(x, y + T - 3, T, 3);
        }
        if (!isWall(tileAt(c - 1, r))) {
          g.fillStyle = "#6e5b3e";
          g.fillRect(x, y, 2, T);
        }
        if (!isWall(tileAt(c + 1, r))) {
          g.fillStyle = "#3a2f20";
          g.fillRect(x + T - 2, y, 2, T);
        }
      }
    }
    return bg;
  }

  function drawLiquids(t) {
    for (const { c, r, type } of liquids) {
      const el = ELEMENTS[type];
      const x = c * T;
      const y = r * T;

      // Resplandor sobre el charco
      const glow = ctx.createLinearGradient(0, y - 18, 0, y + 4);
      glow.addColorStop(0, `rgba(${el.glow},0)`);
      glow.addColorStop(1, `rgba(${el.glow},0.35)`);
      ctx.fillStyle = glow;
      ctx.fillRect(x, y - 18, T, 22);

      // Superficie con olas (continuas entre casillas vecinas)
      ctx.beginPath();
      ctx.moveTo(x, y + 16);
      for (let i = 0; i <= T; i += 4) {
        const wx = x + i;
        ctx.lineTo(wx, y + 4 + Math.sin(wx * 0.12 + t * 3) * 2);
      }
      ctx.lineTo(x + T, y + 16);
      ctx.closePath();
      ctx.fillStyle = el.body;
      ctx.fill();

      ctx.beginPath();
      for (let i = 0; i <= T; i += 4) {
        const wx = x + i;
        const wy = y + 4 + Math.sin(wx * 0.12 + t * 3) * 2;
        if (i === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.strokeStyle = el.top;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Burbuja / chispa que sube
      const phase = (t * 0.8 + c * 0.37) % 1;
      ctx.globalAlpha = 1 - phase;
      ctx.fillStyle = el.top;
      ctx.beginPath();
      ctx.arc(x + ((c * 53) % 24) + 4, y + 2 - phase * 18, type === "fire" ? 1.5 : 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawRust(x, y, active, progress) {
    ctx.fillStyle = "#6b5a2e";
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = "#86763c";
    ctx.fillRect(x, y, T, 3);
    ctx.fillStyle = active ? "#b8ff6a" : "#8fae3a";
    for (const [sx, sy, sr] of [[7, 9, 3], [22, 6, 2], [16, 18, 4], [6, 25, 2], [26, 24, 3]]) {
      ctx.beginPath();
      ctx.arc(x + sx, y + sy, sr + progress * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#3e3418";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
  }

  function drawIce(x, y, active, progress) {
    ctx.fillStyle = "#7cc6e8";
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = "#d9f4ff";
    ctx.fillRect(x, y, T, 3);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 26);
    ctx.lineTo(x + 20, y + 5);
    ctx.lineTo(x + 25, y + 5);
    ctx.lineTo(x + 10, y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = active ? "#ffffff" : "rgba(40,90,130,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 3);
    ctx.lineTo(x + 18, y + 12 + progress * 8);
    ctx.lineTo(x + 26, y + 17);
    ctx.moveTo(x + 18, y + 12);
    ctx.lineTo(x + 12, y + 20 + progress * 8);
    ctx.stroke();
    if (active) {
      // Gotas que caen mientras se derrite
      ctx.fillStyle = "#bfe9ff";
      for (const sx of [7, 16, 25]) {
        const dy = ((progress * 3 + sx * 0.07) % 1) * 8;
        ctx.beginPath();
        ctx.arc(x + sx, y + T + dy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = "#4f94b8";
    ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
  }

  function drawSalt(x, y, active, progress) {
    ctx.fillStyle = "#e6dfcc";
    ctx.fillRect(x, y, T, T);
    // Cristales cúbicos
    for (const [sx, sy, s] of [[3, 4, 9], [15, 3, 7], [23, 9, 6], [5, 16, 7], [14, 13, 10], [24, 21, 6], [6, 25, 5]]) {
      ctx.fillStyle = "#f8f5ec";
      ctx.fillRect(x + sx, y + sy, s, s);
      ctx.fillStyle = "#c9bea2";
      ctx.fillRect(x + sx + s - 2, y + sy + 1, 2, s - 1);
      ctx.fillRect(x + sx + 1, y + sy + s - 2, s - 1, 2);
    }
    if (active) {
      ctx.fillStyle = `rgba(80,160,255,${0.25 + progress * 0.4})`;
      ctx.fillRect(x, y + T * (1 - progress), T, T * progress);
    }
    ctx.strokeStyle = "#a99d80";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
  }

  function drawLock(x, y, active, progress) {
    ctx.fillStyle = "#5e4019";
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = "#7a5524";
    ctx.fillRect(x + 4, y + 2, T - 8, T - 4);
    ctx.strokeStyle = "#c99a3a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 1, T - 6, T - 2);
    // Ojo de la cerradura
    ctx.fillStyle = active ? "#fff3c4" : "#1c1208";
    ctx.beginPath();
    ctx.arc(x + T / 2, y + 12, 4 + progress * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + T / 2 - 2, y + 13, 4, 9);
  }

  function drawCracked(x, y, active, progress) {
    drawStone(ctx, x, y, Math.floor(y / T));
    ctx.strokeStyle = active ? "#ffb347" : "#2a2218";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 2);
    ctx.lineTo(x + 13, y + 12 + progress * 4);
    ctx.lineTo(x + 9, y + 20);
    ctx.lineTo(x + 16, y + 30);
    ctx.moveTo(x + 13, y + 12);
    ctx.lineTo(x + 26, y + 9);
    ctx.moveTo(x + 9, y + 20);
    ctx.lineTo(x + 2, y + 24);
    ctx.moveTo(x + 22, y + 20);
    ctx.lineTo(x + 29, y + 27);
    ctx.stroke();
  }

  function drawSeal(x, y, active, progress) {
    drawStone(ctx, x, y, Math.floor(y / T));
    ctx.save();
    ctx.shadowColor = "#c86bff";
    ctx.shadowBlur = active ? 16 : 8;
    ctx.strokeStyle = active ? "#ffe08a" : "#c86bff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + T / 2, y + T / 2, 9 + progress * 4, 0, Math.PI * 2);
    ctx.moveTo(x + T / 2, y + 6);
    ctx.lineTo(x + T / 2, y + T - 6);
    ctx.moveTo(x + 8, y + T / 2);
    ctx.lineTo(x + T - 8, y + T / 2);
    ctx.stroke();
    ctx.restore();
  }

  const BLOCK_DRAW = { "%": drawRust, "+": drawIce, "=": drawSalt, "|": drawLock, "[": drawCracked, "/": drawSeal };

  function heartPath(cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.9);
    ctx.bezierCurveTo(cx - s * 1.3, cy, cx - s * 0.9, cy - s * 1.1, cx, cy - s * 0.35);
    ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.1, cx + s * 1.3, cy, cx, cy + s * 0.9);
    ctx.closePath();
  }

  function drawKeyIcon(cx, cy, s) {
    ctx.strokeStyle = "#ffd76a";
    ctx.fillStyle = "#ffd76a";
    ctx.lineWidth = Math.max(2, s * 0.35);
    ctx.beginPath();
    ctx.arc(cx - s * 0.55, cy, s * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(cx - s * 0.1, cy - s * 0.12, s * 1.2, s * 0.28);
    ctx.fillRect(cx + s * 0.75, cy, s * 0.22, s * 0.45);
    ctx.fillRect(cx + s * 0.4, cy, s * 0.22, s * 0.35);
  }

  // Orbe de arma: en el mundo es de los tres colores; en el inventario, del elemento de su dueño.
  function drawOrb(cx, cy, s, t, type) {
    ctx.save();
    ctx.shadowColor = type ? ELEMENTS[type].body : "#e6d2ff";
    ctx.shadowBlur = s;
    ctx.fillStyle = type ? ELEMENTS[type].body : "#cdb6ff";
    ctx.beginPath();
    ctx.arc(cx, cy, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (!type) {
      ["fire", "water", "acid"].forEach((el, i) => {
        const a = t * 3 + (i * Math.PI * 2) / 3;
        ctx.fillStyle = ELEMENTS[el].body;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * s * 0.55, cy + Math.sin(a) * s * 0.55, s * 0.32, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(cx - s * 0.35, cy - s * 0.35, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBootsIcon(cx, cy, s) {
    ctx.save();
    ctx.fillStyle = "#d9534f";
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.5, cy - s);
    ctx.lineTo(cx + s * 0.1, cy - s);
    ctx.lineTo(cx + s * 0.1, cy + s * 0.2);
    ctx.lineTo(cx + s, cy + s * 0.4);
    ctx.lineTo(cx + s, cy + s);
    ctx.lineTo(cx - s * 0.5, cy + s);
    ctx.closePath();
    ctx.fill();
    // Alita: el doble salto
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.5, cy - s * 0.4);
    ctx.lineTo(cx - s * 1.2, cy - s * 0.9);
    ctx.lineTo(cx - s * 1.0, cy - s * 0.2);
    ctx.lineTo(cx - s * 1.3, cy + s * 0.1);
    ctx.lineTo(cx - s * 0.5, cy + s * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawShieldIcon(cx, cy, s) {
    ctx.save();
    ctx.fillStyle = "#4fb3ff";
    ctx.strokeStyle = "#d8f0ff";
    ctx.lineWidth = Math.max(1.5, s * 0.18);
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.85, cy - s * 0.65);
    ctx.quadraticCurveTo(cx + s * 0.8, cy + s * 0.5, cx, cy + s);
    ctx.quadraticCurveTo(cx - s * 0.8, cy + s * 0.5, cx - s * 0.85, cy - s * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawBombIcon(cx, cy, s, t) {
    ctx.save();
    ctx.fillStyle = "#2b2b33";
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.2, s * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(cx - s * 0.3, cy - s * 0.1, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c9a36a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.4, cy - s * 0.45);
    ctx.quadraticCurveTo(cx + s * 0.6, cy - s, cx + s, cy - s);
    ctx.stroke();
    ctx.fillStyle = Math.sin(t * 20) > 0 ? "#ffd76a" : "#ff6b3d";
    ctx.beginPath();
    ctx.arc(cx + s, cy - s, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSprings() {
    for (const s of springs) {
      const x = s.c * T;
      const bottom = (s.r + 1) * T;
      const h = 14 - s.squash * 0.6; // se encoge un momento al lanzar
      ctx.fillStyle = "#3b3022";
      ctx.fillRect(x + 4, bottom - 3, T - 8, 3);
      ctx.strokeStyle = "#c9c2b0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const yy = bottom - 3 - (h * i) / 4;
        ctx.lineTo(x + (i % 2 ? T - 9 : 9), yy);
      }
      ctx.stroke();
      ctx.fillStyle = "#f2c14e";
      roundRectPath(ctx, x + 3, bottom - 6 - h, T - 6, 5, 2);
      ctx.fill();
    }
  }

  function drawCrumbles(t) {
    for (const cr of crumbles) {
      const x = cr.c * T;
      const y = cr.r * T;
      if (cr.gone > 0) {
        // Silueta del tablón que volverá
        ctx.strokeStyle = "rgba(197,139,76,0.25)";
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
        ctx.setLineDash([]);
        continue;
      }
      const shake = cr.t > 0 ? Math.sin(t * 70 + cr.c) * 1.5 : 0;
      ctx.save();
      ctx.globalAlpha = cr.t > 0 ? 0.5 + (cr.t / CRUMBLE_FRAMES) * 0.5 : 1;
      ctx.fillStyle = "#8a5a2b";
      ctx.fillRect(x + shake, y, T, T);
      ctx.fillStyle = "#a8743d";
      ctx.fillRect(x + shake, y, T, 4);
      ctx.strokeStyle = "#5e3d1a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + shake, y + 11);
      ctx.lineTo(x + T + shake, y + 11);
      ctx.moveTo(x + shake, y + 22);
      ctx.lineTo(x + T + shake, y + 22);
      // Grietas: avisan de que no aguanta
      ctx.moveTo(x + 9 + shake, y + 4);
      ctx.lineTo(x + 13 + shake, y + 15);
      ctx.lineTo(x + 8 + shake, y + 26);
      ctx.moveTo(x + 22 + shake, y + 11);
      ctx.lineTo(x + 25 + shake, y + 20);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSpikes() {
    for (const s of spikes) {
      const x = s.c * T;
      const bottom = (s.r + 1) * T;
      ctx.fillStyle = "#c9c2b0";
      ctx.strokeStyle = "#6d6658";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 8, bottom);
        ctx.lineTo(x + i * 8 + 4, bottom - 12);
        ctx.lineTo(x + i * 8 + 8, bottom);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  function drawDarts() {
    for (const d of darts) {
      const dir = Math.sign(d.vx);
      const tip = dir > 0 ? d.x + d.w : d.x;
      ctx.fillStyle = "#e6dfcc";
      ctx.fillRect(d.x, d.y + 2, d.w, 2);
      ctx.fillStyle = d.color || "#ff6b3d";
      ctx.beginPath();
      ctx.moveTo(tip + dir * 4, d.y + 3);
      ctx.lineTo(tip, d.y);
      ctx.lineTo(tip, d.y + 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Amuleto del cambio: un medallón con los tres colores que giran en ronda.
  function drawSwapIcon(cx, cy, s, t) {
    ctx.save();
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#2b2419";
    ctx.beginPath();
    ctx.arc(cx, cy, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = s * 0.35;
    CHARACTERS.forEach((ch, i) => {
      const a = t * 2.5 + (i * Math.PI * 2) / 3;
      ctx.strokeStyle = ch.color;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.65, a, a + Math.PI * 0.55);
      ctx.stroke();
      // Punta de flecha: el sentido del cambio
      const ex = cx + Math.cos(a + Math.PI * 0.55) * s * 0.65;
      const ey = cy + Math.sin(a + Math.PI * 0.55) * s * 0.65;
      ctx.fillStyle = ch.color;
      ctx.beginPath();
      ctx.arc(ex, ey, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawItems(t) {
    for (const it of items) {
      if (it.taken) continue;
      const cx = it.c * T + T / 2;
      const cy = it.r * T + T / 2 + Math.sin(t * 3 + it.c) * 2;
      if (it.type === "key") drawKeyIcon(cx, cy, 9);
      else if (it.type === "weapon") drawOrb(cx, cy, 8, t, null);
      else if (it.type === "boots") drawBootsIcon(cx, cy, 9);
      else if (it.type === "shield") drawShieldIcon(cx, cy, 9);
      else if (it.type === "bomb") drawBombIcon(cx, cy, 9, t);
      else if (it.type === "swap") drawSwapIcon(cx, cy, 10, t);
      else {
        ctx.save();
        ctx.shadowColor = "#ff4d6d";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#ff4d6d";
        heartPath(cx, cy, 8);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawPortals(t) {
    for (const p of portals) {
      const cx = p.c * T + T / 2;
      const cy = p.r * T + 10;
      const color = PORTAL_COLORS[p.id];
      ctx.save();
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
      grad.addColorStop(0, "rgba(255,255,255,0.55)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 12, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 12, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Remolino que gira
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 7, 15, 0, a, a + 1.6);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawEnemies(t) {
    for (const e of enemies) {
      if (!e.alive) continue;
      const dir = Math.sign(e.vx) || 1;
      const cx = e.x + e.w / 2;
      ctx.save();
      // Brillo rojizo para que se distingan del fondo como peligro.
      ctx.shadowColor = "rgba(255,70,90,0.8)";
      ctx.shadowBlur = 10;
      if (e.type === "beetle") {
        const step = Math.sin(e.anim * 0.4) * 2;
        ctx.strokeStyle = "#e0c8f5";
        ctx.lineWidth = 2;
        for (const lx of [-7, 0, 7]) {
          ctx.beginPath();
          ctx.moveTo(cx + lx, e.y + e.h - 6);
          ctx.lineTo(cx + lx + (lx === 0 ? -step : step), e.y + e.h);
          ctx.stroke();
        }
        ctx.fillStyle = "#9b4dca";
        ctx.beginPath();
        ctx.ellipse(cx, e.y + e.h - 6, e.w / 2, e.h - 5, 0, Math.PI, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#4a1f66";
        ctx.beginPath();
        ctx.moveTo(cx, e.y + 2);
        ctx.lineTo(cx, e.y + e.h - 6);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.ellipse(cx - 4, e.y + 7, 4, 2, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff4d4d";
        ctx.beginPath();
        ctx.arc(cx + dir * (e.w / 2 - 3), e.y + e.h - 8, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === "turret") {
        // Bloque de piedra con un cañón que apunta hacia donde dispara
        const charging = e.cooldown < 20;
        ctx.fillStyle = "#4a4f5c";
        roundRectPath(ctx, e.x, e.y + 4, e.w, e.h - 4, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#2b2e36";
        ctx.fillRect(e.facing > 0 ? e.x + e.w - 2 : e.x - 6, e.y + 9, 8, 7);
        ctx.fillStyle = charging ? "#ff6b3d" : "#ff4d4d";
        ctx.beginPath();
        ctx.arc(cx, e.y + 14, charging ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#6d7688";
        ctx.fillRect(e.x + 2, e.y + 4, e.w - 4, 3);
      } else if (e.type === "hedgehog") {
        const bodyY = e.y + e.h - 8;
        ctx.fillStyle = "#c9c2b0";
        for (let i = 0; i < 7; i++) {
          const a = Math.PI + (i / 6) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a - 0.2) * 9, bodyY + Math.sin(a - 0.2) * 9);
          ctx.lineTo(cx + Math.cos(a) * 15, bodyY + Math.sin(a) * 15);
          ctx.lineTo(cx + Math.cos(a + 0.2) * 9, bodyY + Math.sin(a + 0.2) * 9);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = "#8a5a2b";
        ctx.beginPath();
        ctx.ellipse(cx, bodyY, 11, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#e6c39a";
        ctx.beginPath();
        ctx.arc(cx + dir * 9, bodyY + 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a150f";
        ctx.fillRect(cx + dir * 10 - 1, bodyY, 2, 2);
      } else if (e.type === "ghost") {
        // Sábana translúcida con el borde de abajo ondulado
        const by = e.y + Math.sin(t * 3 + e.x * 0.03) * 2;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "#e8f0ff";
        ctx.beginPath();
        ctx.arc(cx, by + 10, 11, Math.PI, 0);
        ctx.lineTo(cx + 11, by + e.h);
        for (let i = 0; i <= 4; i++) ctx.lineTo(cx + 11 - (i * 22) / 4, by + e.h - (i % 2 ? 4 : 0) + Math.sin(t * 8 + i) * 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#3a2a4a";
        ctx.beginPath();
        ctx.ellipse(cx - 4 + dir * 2, by + 10, 2.5, 3.5, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 4 + dir * 2, by + 10, 2.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const by = e.y + Math.sin(t * 5 + e.x * 0.05) * 3;
        const flap = Math.sin(e.anim * 0.35) * 7;
        ctx.fillStyle = "#8a63c4";
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * 4, by + 8);
          ctx.lineTo(cx + s * 14, by + 2 - flap);
          ctx.lineTo(cx + s * 11, by + 10);
          ctx.lineTo(cx + s * 15, by + 13 + flap * 0.3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = "#b48ae6";
        ctx.beginPath();
        ctx.arc(cx, by + 9, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff4d4d";
        ctx.fillRect(cx - 3 + dir, by + 7, 2, 2);
        ctx.fillRect(cx + 1 + dir, by + 7, 2, 2);
      }
      ctx.restore();
    }
  }

  function drawShots() {
    for (const s of shots) {
      const el = ELEMENTS[s.type];
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      ctx.save();
      ctx.shadowColor = el.body;
      ctx.shadowBlur = 10;
      for (let i = 2; i >= 0; i--) {
        ctx.globalAlpha = i === 0 ? 1 : 0.35;
        ctx.fillStyle = i === 0 ? el.top : el.body;
        ctx.beginPath();
        ctx.arc(cx - Math.sign(s.vx) * i * 6, cy, 5 - i, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawBreakables(t) {
    for (const { c, r, type } of breakables) {
      if (grid[r][c] !== type) continue;
      const d = dissolving.get(key(c, r));
      const progress = d ? 1 - d.t / d.max : 0;
      const shake = d ? Math.sin(t * 60 + c) * 1.5 * progress : 0;
      ctx.save();
      ctx.globalAlpha = 1 - progress * 0.6;
      BLOCK_DRAW[type](c * T + shake, r * T, !!d, progress);
      ctx.restore();
    }
  }

  function drawBarriers(t) {
    for (const { c, r, type } of barriers) {
      const el = ELEMENTS[type];
      const x = c * T;
      const y = r * T;
      ctx.save();
      ctx.fillStyle = `rgba(${el.glow},${0.2 + Math.sin(t * 3 + r) * 0.06})`;
      ctx.fillRect(x + 3, y, T - 6, T);

      // Hilos de energía (continuos entre casillas de la misma columna)
      ctx.strokeStyle = el.top;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let yy = y; yy <= y + T; yy += 4) {
          const lx = x + 9 + i * 7 + Math.sin(yy * 0.15 + t * 5 + i * 2) * 2.5;
          if (yy === y) ctx.moveTo(lx, yy);
          else ctx.lineTo(lx, yy);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.75;
      drawIcon(type, x + T / 2, y + T / 2, 6);
      ctx.restore();

      // Emisores en los extremos de la barrera
      for (const [nr, ey] of [[r - 1, y], [r + 1, y + T - 4]]) {
        if (BARRIER_BY_TILE[tileAt(c, nr)] === type) continue;
        ctx.fillStyle = "#3b3022";
        ctx.fillRect(x + 1, ey, T - 2, 4);
        ctx.fillStyle = el.body;
        ctx.fillRect(x + 6, ey + 1, T - 12, 2);
      }
    }
  }

  function drawFans(t) {
    for (const f of fans) {
      const x = f.c * T;
      const bottom = (f.r + 1) * T;

      // Corriente de aire
      if (f.on && f.top !== null) {
        const top = f.top * T;
        const height = bottom - 8 - top;
        const grad = ctx.createLinearGradient(0, top, 0, bottom);
        grad.addColorStop(0, "rgba(220,240,255,0)");
        grad.addColorStop(1, "rgba(220,240,255,0.14)");
        ctx.fillStyle = grad;
        ctx.fillRect(x + 4, top, T - 8, height);
        ctx.strokeStyle = "#e8f6ff";
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 7; k++) {
          const phase = (t * 1.4 + k / 7 + f.c * 0.13) % 1;
          const sy = bottom - 8 - phase * height;
          const sx = x + 7 + ((k * 37 + f.c * 11) % 18);
          ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy - 10);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Carcasa y aspas (vistas de lado: se estrechan al girar)
      ctx.fillStyle = "#2f3440";
      roundRectPath(ctx, x + 2, bottom - 9, T - 4, 9, 3);
      ctx.fill();
      const spin = f.on ? t * 18 : 0.6;
      ctx.fillStyle = "#aab3c4";
      for (let i = 0; i < 3; i++) {
        const a = spin + (i * Math.PI * 2) / 3;
        const bx = x + T / 2 + Math.cos(a) * 9;
        const bw = Math.abs(Math.sin(a)) * 5 + 1;
        ctx.fillRect(bx - bw / 2, bottom - 8, bw, 3);
      }
      ctx.fillStyle = f.mech ? f.mech.color : "#6d7688";
      ctx.fillRect(x + 5, bottom - 4, T - 10, 2);
    }
  }

  function drawMechs(t) {
    for (const m of mechs) {
      // Botones y palancas
      for (const tr of m.triggers) {
        const cx = tr.c * T + T / 2;
        const bottom = (tr.r + 1) * T;
        if (m.def.trigger === "lever") {
          ctx.fillStyle = "#3b3022";
          ctx.beginPath();
          ctx.arc(cx, bottom, 10, Math.PI, 0);
          ctx.fill();
          const ex = cx + Math.sin(tr.angle) * 20;
          const ey = bottom - 4 - Math.cos(tr.angle) * 20;
          ctx.strokeStyle = "#d8ccb0";
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(cx, bottom - 4);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.save();
          if (m.active) {
            ctx.shadowColor = m.color;
            ctx.shadowBlur = 12;
          }
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(ex, ey, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = "#2a2218";
          ctx.fillRect(tr.c * T + 3, bottom - 4, T - 6, 4);
          const h = tr.pressed ? 2 : 5;
          ctx.save();
          if (tr.pressed) {
            ctx.shadowColor = m.color;
            ctx.shadowBlur = 14;
          }
          ctx.fillStyle = m.color;
          roundRectPath(ctx, tr.c * T + 6, bottom - 4 - h, T - 12, h + 1, 2);
          ctx.fill();
          ctx.restore();
          if (m.need > 1) {
            text(`${m.pressedCount}/${m.need}`, cx, bottom - 18, 11, m.active ? "#ffffff" : m.color);
          }
        }
      }

      // Plataformas / compuertas
      for (const cell of m.cells) {
        const x = cell.c * T + m.ox;
        const y = cell.r * T + m.oy;
        ctx.fillStyle = "#3c4150";
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = "#565d70";
        ctx.fillRect(x, y, T, 3);
        ctx.fillStyle = "#2a2e38";
        ctx.fillRect(x, y + T - 3, T, 3);
        ctx.fillStyle = m.color;
        ctx.fillRect(x + 3, y + 5, T - 6, 3);
        ctx.save();
        ctx.globalAlpha = m.active ? 1 : 0.45;
        if (m.active) {
          ctx.shadowColor = m.color;
          ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.arc(x + T / 2, y + T / 2 + 3, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawDoor(door, p) {
    const ch = p.ch;
    const x = door.c * T + 2;
    const w = T - 4;
    const floorY = (door.r + 1) * T;
    const top = floorY - 48;

    ctx.save();
    ctx.fillStyle = "#3b3022";
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x, top + w / 2);
    ctx.arc(x + w / 2, top + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, floorY);
    ctx.closePath();
    ctx.fill();

    const ix = x + 4;
    const iw = w - 8;
    ctx.beginPath();
    ctx.moveTo(ix, floorY);
    ctx.lineTo(ix, top + w / 2);
    ctx.arc(ix + iw / 2, top + w / 2, iw / 2, Math.PI, 0);
    ctx.lineTo(ix + iw, floorY);
    ctx.closePath();
    if (p.inDoor) {
      ctx.shadowColor = ch.color;
      ctx.shadowBlur = 22;
      ctx.fillStyle = ch.color;
    } else {
      ctx.fillStyle = ch.dark;
    }
    ctx.fill();
    ctx.restore();

    drawIcon(ch.immune, x + w / 2, top + 16, 6);
  }

  function drawGems(t) {
    for (const g of gems) {
      if (g.taken) continue;
      const color = ELEMENTS[g.type].gem;
      const cx = g.c * T + T / 2;
      const cy = g.r * T + T / 2 + Math.sin(t * 3 + g.c) * 2;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      gemPath(cx, cy, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx + 3, cy - 2);
      ctx.lineTo(cx - 3, cy - 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBoxes() {
    for (const b of boxes) {
      const { x, y, w, h } = b;
      ctx.fillStyle = "#9a6a35";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#5e3d1a";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3);
      ctx.lineTo(x + w - 3, y + h - 3);
      ctx.moveTo(x + w - 3, y + 3);
      ctx.lineTo(x + 3, y + h - 3);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(x + 3, y + 3, w - 6, 2);
    }
  }

  // ---------------------------------------------------------------------------
  // Dibujo: personajes
  // ---------------------------------------------------------------------------
  function drawPlayer(p, t) {
    const { x, y, w, h, ch } = p;
    const cx = x + w / 2;
    const moving = p.onGround && Math.abs(p.vx) > 0.4;
    const bob = moving ? Math.abs(Math.sin(p.anim)) * 1.5 : 0;
    const look = p.facing * 2;

    ctx.save();
    // Parpadea mientras es invencible tras un golpe.
    if (p.hurt && Math.floor(p.hurt / 5) % 2) ctx.globalAlpha = 0.3;

    // Pies
    const stride = moving ? Math.sin(p.anim) * 3 : 0;
    ctx.fillStyle = ch.dark;
    ctx.fillRect(x + 3 + stride, y + h - 5, 7, 5);
    ctx.fillRect(x + w - 10 - stride, y + h - 5, 7, 5);

    ctx.translate(0, -bob);

    // Pelo / cabeza (detrás del cuerpo)
    if (ch.immune === "fire") {
      for (let i = 0; i < 3; i++) {
        const fx = x + 4 + i * 7;
        const fh = 10 + Math.sin(t * 18 + i * 2.1) * 3;
        ctx.fillStyle = i === 1 ? "#ffb000" : "#ff7a1a";
        ctx.beginPath();
        ctx.moveTo(fx - 5, y + 11);
        ctx.quadraticCurveTo(fx - 3, y + 6 - fh * 0.4, fx - look * 0.5, y + 6 - fh);
        ctx.quadraticCurveTo(fx + 3, y + 6 - fh * 0.4, fx + 5, y + 11);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.moveTo(cx - 4, y + 9);
      ctx.quadraticCurveTo(cx, y - 2 + Math.sin(t * 22) * 2, cx + 4, y + 9);
      ctx.fill();
    } else if (ch.immune === "water") {
      ctx.fillStyle = "#7cc8ff";
      dropletPath(cx - p.facing * 5, y - 9, cx, y + 9, 11);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#b8ff6a";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx + 1, y + 2, 4, Math.PI * 0.8, Math.PI * 2.5);
      ctx.stroke();
      // Burbujas que salen de la cabeza
      const phase = (t * 0.9) % 1;
      ctx.globalAlpha = 1 - phase;
      ctx.strokeStyle = "#d9ff7a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx + 8 - phase * 2, y - 2 - phase * 14, 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Cuerpo
    ctx.shadowColor = ch.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = ch.color;
    roundRectPath(ctx, x, y + 6, w, h - 10, ch.immune === "acid" ? 10 : 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRectPath(ctx, x + 4, y + 8, w - 8, 5, 2.5);
    ctx.fill();

    // Ojos
    const eyeY = y + 15;
    for (const side of [-1, 1]) {
      const ex = cx + side * 5 + look;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 3.5, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1410";
      ctx.beginPath();
      ctx.arc(ex + look * 0.6, eyeY + 0.5, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boca (AcidBaby lleva chupete)
    if (ch.immune === "acid") {
      ctx.fillStyle = "#ff8fc7";
      ctx.beginPath();
      ctx.ellipse(cx + look, y + 22, 4.5, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffd1e8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx + look, y + 23.5, 2.2, 0, Math.PI);
      ctx.stroke();
    } else {
      ctx.strokeStyle = ch.dark;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx + look, y + 19.5, 3, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawParticles() {
    for (const q of particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // Dibujo: interfaz
  // ---------------------------------------------------------------------------
  function gemCount() {
    return { taken: gems.filter((g) => g.taken).length, total: gems.length };
  }

  function drawHud() {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, T);
    text(testLevel ? `Prueba · ${level.name}` : `Nivel ${levelIndex + 1} · ${level.name}`, 12, T / 2, 15, "#f3e6c8", "left");
    text(formatTime(levelFrames), W / 2 - 40, T / 2, 16, "#f3e6c8");
    const best = testLevel ? null : recordOf(levelIndex);
    if (best?.done) text(`récord ${formatTime(best.bestFrames)}`, W / 2 - 66, T / 2, 13, "#9c8d70", "right", "normal");
    if (gems.length) {
      const { taken, total } = gemCount();
      ctx.fillStyle = "#ffe08a";
      gemPath(W / 2 + 18, T / 2, 7);
      ctx.fill();
      text(`${taken}/${total}`, W / 2 + 30, T / 2, 15, "#f3e6c8", "left");
    }

    // Por personaje, de derecha a izquierda: inventario, corazones e icono (✓ si ya está en su puerta).
    let x = W - 14;
    for (const p of [...players].reverse()) {
      // Un objeto del inventario con su cantidad si hay más de uno.
      const slot = (count, draw, w) => {
        if (!count) return;
        if (count > 1) {
          text(`×${count}`, x, T / 2, 12, "#ffd76a", "right");
          x -= 16;
        }
        draw(x - w / 2);
        x -= w + 4;
      };
      slot(p.inv.weapon ? 1 : 0, (cx) => drawOrb(cx, T / 2, 6, 0, p.ch.immune), 14);
      slot(p.inv.boots ? 1 : 0, (cx) => drawBootsIcon(cx + 2, T / 2, 6), 16);
      slot(p.inv.shield, (cx) => drawShieldIcon(cx, T / 2, 7), 14);
      slot(p.inv.bombs, (cx) => drawBombIcon(cx, T / 2, 6, tick / 60), 14);
      slot(p.inv.keys, (cx) => drawKeyIcon(cx, T / 2, 7), 16);
      for (let i = MAX_HEARTS - 1; i >= 0; i--) {
        ctx.fillStyle = i < p.hearts ? "#ff4d6d" : "rgba(255,255,255,0.15)";
        heartPath(x - 6, T / 2, 6);
        ctx.fill();
        x -= 15;
      }
      drawIcon(p.ch.immune, x - 8, T / 2, 7);
      if (p.inDoor) text("✓", x - 20, T / 2, 14, "#9dff8a", "right");
      x -= p.inDoor ? 40 : 28;
    }
    if (save.muted) text("🔇", x - 4, T / 2, 14, "#f3e6c8", "right");
  }

  function drawHint() {
    if (!level.hint || levelFrames > HINT_FRAMES || state !== "playing") return;
    const alpha = Math.min(1, (HINT_FRAMES - levelFrames) / 60, levelFrames / 20);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold 16px ${FONT}`;
    const w = ctx.measureText(level.hint).width + 32;
    ctx.fillStyle = "rgba(10,8,5,0.8)";
    roundRectPath(ctx, W / 2 - w / 2, T + 10, w, 34, 10);
    ctx.fill();
    text(level.hint, W / 2, T + 27, 16, "#ffe9b8");
    ctx.restore();
  }

  function dim(alpha) {
    ctx.fillStyle = `rgba(10,8,5,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawTitle(t) {
    dim(0.82);
    text("Fireboy, Watergirl & AcidBaby", W / 2, 70, 40, "#ffe9b8");
    text("Llevad a los tres a su puerta. Cada uno solo sobrevive a su elemento.", W / 2, 112, 18, "#d9c9a6", "center", "normal");

    const cardW = 260;
    const cardH = 292;
    const gap = 40;
    const startX = W / 2 - (cardW * 3 + gap * 2) / 2;
    CHARACTERS.forEach((ch, i) => {
      const x = startX + i * (cardW + gap);
      const y = 150;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRectPath(ctx, x, y, cardW, cardH, 14);
      ctx.fill();
      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(x + cardW / 2, y + 70);
      ctx.scale(2.4, 2.4);
      drawPlayer(
        { ch, x: -PW / 2, y: -PH / 2, w: PW, h: PH, vx: 0, onGround: true, anim: 0, facing: 1 },
        t,
      );
      ctx.restore();

      const others = CHARACTERS.filter((o) => o !== ch).map((o) => ELEMENTS[o.immune].label);
      text(ch.name, x + cardW / 2, y + 140, 24, ch.color);
      text(ch.keyLabel, x + cardW / 2, y + 180, 22, "#ffffff");
      text(`Sobrevive a: ${ELEMENTS[ch.immune].label}`, x + cardW / 2, y + 218, 15, "#bfe8a8", "center", "normal");
      text(`Muere con: ${others.join(" y ")}`, x + cardW / 2, y + 242, 15, "#f0a58f", "center", "normal");
      text(`Poder: ${ch.power.toLowerCase()}`, x + cardW / 2, y + 266, 15, "#ffe08a", "center", "normal");
    });

    const pulse = 0.6 + Math.sin(t * 4) * 0.4;
    ctx.globalAlpha = pulse;
    text("Pulsa ENTER para empezar", W / 2, 482, 26, "#ffe9b8");
    ctx.globalAlpha = 1;
    text(`S ↓ H: disparar (con un orbe) · ESC: pausa · R: reiniciar · M: sonido ${save.muted ? "(apagado)" : ""}`, W / 2, 520, 15, "#9c8d70", "center", "normal");
  }

  // Total de gemas de un nivel sin tener que cargarlo.
  function levelGemTotal(i) {
    return LEVELS[i].map.join("").split("").filter((ch) => ch in GEM_BY_TILE).length;
  }

  function drawPadlock(cx, cy, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 7, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = color;
    roundRectPath(ctx, cx - 11, cy - 6, 22, 17, 3);
    ctx.fill();
  }

  // Parte un texto en dos líneas si no cabe en el ancho dado.
  function fitLines(str, maxW, size) {
    ctx.font = `bold ${size}px ${FONT}`;
    if (ctx.measureText(str).width <= maxW) return [str];
    const words = str.split(" ");
    let best = [str];
    let bestW = Infinity;
    for (let k = 1; k < words.length; k++) {
      const lines = [words.slice(0, k).join(" "), words.slice(k).join(" ")];
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width));
      if (w < bestW) {
        bestW = w;
        best = lines;
      }
    }
    return best;
  }

  function drawLevelMenu(t) {
    dim(0.78);
    text("Elige nivel", W / 2, 62, 36, "#ffe9b8");
    const eb = editorButtonRect();
    const hover = pointerIn(eb);
    ctx.fillStyle = hover ? "rgba(255,233,184,0.16)" : "rgba(255,255,255,0.06)";
    roundRectPath(ctx, eb.x, eb.y, eb.w, eb.h, 10);
    ctx.fill();
    ctx.strokeStyle = hover ? "#ffe08a" : "#6e5b3e";
    ctx.lineWidth = 2;
    ctx.stroke();
    text("✎ Editor de niveles (E)", eb.x + eb.w / 2, eb.y + eb.h / 2, 15, "#ffe9b8");

    let gemsTaken = 0;
    let gemsTotal = 0;
    LEVELS.forEach((lv, i) => {
      const rec = recordOf(i);
      const open = isUnlocked(i);
      const total = levelGemTotal(i);
      gemsTaken += rec?.bestGems || 0;
      gemsTotal += total;

      const selected = i === levelIndex;
      const r = levelCardRect(i);
      const y = r.y - (selected ? 6 : 0);
      const cx = r.x + r.w / 2;

      ctx.save();
      ctx.fillStyle = "#1a150f";
      if (selected) {
        ctx.shadowColor = "#ffe08a";
        ctx.shadowBlur = 18;
      }
      roundRectPath(ctx, r.x, y, r.w, r.h, 14);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = selected ? "rgba(255,233,184,0.13)" : "rgba(255,255,255,0.05)";
      ctx.fill();
      ctx.strokeStyle = selected ? "#ffe08a" : open ? "#6e5b3e" : "#3b3022";
      ctx.lineWidth = selected ? 3 : 2;
      roundRectPath(ctx, r.x, y, r.w, r.h, 14);
      ctx.stroke();

      const f = r.h / CARD_H; // las tarjetas bajas (muchos niveles) escalan su contenido
      const at = (dy) => y + Math.round(dy * f);
      text(String(i + 1), cx, at(36), Math.round(38 * Math.max(f, 0.75)), open ? "#ffe9b8" : "#5a4f3e");
      const nameSize = f < 1 ? 13 : 15;
      const lines = fitLines(lv.name, r.w - 16, nameSize);
      lines.forEach((line, k) => text(line, cx, at(74) + k * (nameSize + 3) - ((lines.length - 1) * (nameSize + 3)) / 2, nameSize, open ? "#f3e6c8" : "#5a4f3e"));

      if (!open) {
        drawPadlock(cx, at(124), "#5a4f3e");
        text("Bloqueado", cx, at(152), 13, "#5a4f3e", "center", "normal");
        return;
      }
      if (rec?.done) {
        text("✓", r.x + r.w - 18, y + 20, 18, "#9dff8a");
        ctx.fillStyle = rec.bestGems === total ? "#ffe08a" : "#bfae88";
        gemPath(cx - 24, at(116), 7);
        ctx.fill();
        text(`${rec.bestGems}/${total}`, cx - 12, at(116), 15, "#f3e6c8", "left");
        text(`Récord ${formatTime(rec.bestFrames)}`, cx, at(144), 14, "#d9c9a6", "center", "normal");
      } else {
        ctx.globalAlpha = selected ? 0.6 + Math.sin(t * 4) * 0.4 : 1;
        text("¡Nuevo!", cx, at(128), 16, "#ffe08a");
        ctx.globalAlpha = 1;
      }
    });

    const last = levelCardRect(LEVELS.length - 1);
    const footer = Math.min(H - 30, last.y + last.h + 50);
    ctx.fillStyle = "#ffe08a";
    gemPath(W / 2 - 52, footer - 30, 7);
    ctx.fill();
    text(`${gemsTaken} / ${gemsTotal} gemas`, W / 2 - 40, footer - 30, 16, "#f3e6c8", "left");
    text("← →: elegir · ENTER o clic: jugar · ESC: volver", W / 2, footer, 15, "#9c8d70", "center", "normal");
  }

  function drawPause() {
    dim(0.6);
    const bottom = pauseItemRect(pauseItems().length).y + 48;
    ctx.fillStyle = "#1a150f";
    roundRectPath(ctx, W / 2 - 190, H / 2 - 165, 380, bottom - (H / 2 - 165), 18);
    ctx.fill();
    ctx.strokeStyle = "#6e5b3e";
    ctx.lineWidth = 2;
    ctx.stroke();
    text("Pausa", W / 2, H / 2 - 120, 40, "#ffe9b8");
    pauseItems().forEach((item, i) => {
      const r = pauseItemRect(i);
      const selected = i === menuIndex;
      ctx.fillStyle = selected ? "rgba(255,233,184,0.16)" : "rgba(255,255,255,0.05)";
      roundRectPath(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = "#ffe08a";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      const label = item === "Sonido" ? `Sonido: ${save.muted ? "no" : "sí"}` : item;
      text(label, W / 2, r.y + r.h / 2, 18, selected ? "#ffe9b8" : "#d9c9a6");
    });
    text("↑ ↓: elegir · ENTER: aceptar · ESC: seguir jugando", W / 2, pauseItemRect(pauseItems().length).y + 24, 14, "#9c8d70", "center", "normal");
  }

  function drawDead() {
    dim(0.45);
    text(`💀 ${deathMessage}`, W / 2, H / 2 - 20, 34, "#ffffff");
    text("Reiniciando... (R para reintentar ya)", W / 2, H / 2 + 24, 17, "#d9c9a6", "center", "normal");
  }

  function drawWon(t) {
    dim(0.55);
    text("¡Nivel completado!", W / 2, H / 2 - 70, 44, "#ffe9b8");
    text(`Tiempo: ${formatTime(levelFrames)}`, W / 2, H / 2 - 20, 22, "#d9c9a6", "center", "normal");
    if (gems.length) {
      const { taken, total } = gemCount();
      text(`Gemas: ${taken} / ${total}`, W / 2, H / 2 + 10, 22, taken === total ? "#ffe08a" : "#d9c9a6", "center", "normal");
    }

    if (testLevel) {
      ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
      text("ENTER: volver al editor", W / 2, H / 2 + 76, 22, "#ffffff");
      ctx.globalAlpha = 1;
      return;
    }
    const isLast = levelIndex + 1 >= LEVELS.length;
    const news = [];
    if (lastResult?.first && !isLast) news.push(`Desbloqueado: ${LEVELS[levelIndex + 1].name}`);
    if (lastResult?.time) news.push("¡Nuevo récord de tiempo!");
    if (lastResult?.gems) news.push("¡Más gemas que nunca!");
    news.forEach((msg, i) => text(msg, W / 2, H / 2 + 46 + i * 26, 18, "#9dff8a"));

    const y = H / 2 + 60 + news.length * 26;
    ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
    text(`ENTER: ${isLast ? "final" : "siguiente nivel"}`, W / 2, y + 16, 22, "#ffffff");
    ctx.globalAlpha = 1;
    text("ESC: elegir nivel", W / 2, y + 46, 15, "#9c8d70", "center", "normal");
  }

  function drawEnding(t) {
    dim(0.85);
    ctx.globalAlpha = 0.8 + Math.sin(t * 3) * 0.2;
    text("¡Habéis superado el templo!", W / 2, 80, 40, "#ffe9b8");
    ctx.globalAlpha = 1;
    text("Fireboy, Watergirl y AcidBaby han llegado juntos hasta el final.", W / 2, 122, 17, "#d9c9a6", "center", "normal");

    // Con muchos niveles, la tabla va en dos columnas.
    const columns = LEVELS.length > 12 ? 2 : 1;
    const perCol = Math.ceil(LEVELS.length / columns);
    const colW = columns === 2 ? 460 : 540;
    const lefts = columns === 2 ? [W / 2 - 480, W / 2 + 20] : [W / 2 - 270];
    const top = 160;
    const rowH = Math.min(32, (H - 315) / perCol);
    const size = Math.min(17, Math.floor(rowH - 3));
    const timeX = (left) => left + colW - 130;
    const gemsX = (left) => left + colW - 40;
    for (const left of lefts) {
      text("Nivel", left, top, 14, "#9c8d70", "left");
      text("Récord", timeX(left), top, 14, "#9c8d70");
      text("Gemas", gemsX(left), top, 14, "#9c8d70");
    }
    let frames = 0;
    let taken = 0;
    let total = 0;
    LEVELS.forEach((lv, i) => {
      const rec = recordOf(i);
      const left = lefts[Math.floor(i / perCol)];
      const y = top + ((i % perCol) + 1) * rowH;
      const all = levelGemTotal(i);
      frames += rec?.bestFrames || 0;
      taken += rec?.bestGems || 0;
      total += all;
      text(`${i + 1}. ${lv.name}`, left, y, size, "#f3e6c8", "left", "normal");
      text(rec?.done ? formatTime(rec.bestFrames) : "—", timeX(left), y, size, "#f3e6c8", "center", "normal");
      text(`${rec?.bestGems || 0}/${all}`, gemsX(left), y, size, rec?.bestGems === all ? "#ffe08a" : "#f3e6c8", "center", "normal");
    });
    const y = top + (perCol + 1) * rowH + 12;
    const left = lefts[0];
    const right = lefts[lefts.length - 1] + colW;
    ctx.fillStyle = "rgba(255,233,184,0.25)";
    ctx.fillRect(left, y - 18, right - left, 1);
    text("Total", left, y, 18, "#ffe9b8", "left");
    text(`${formatTime(frames)}   ·   ${taken}/${total} gemas`, right, y, 18, taken === total ? "#ffe08a" : "#ffe9b8", "right");
    if (taken < total) text("Aún quedan gemas por encontrar…", W / 2, y + 32, 16, "#bfae88", "center", "normal");

    ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
    text("ENTER: volver a los niveles", W / 2, H - 40, 20, "#ffffff");
    ctx.globalAlpha = 1;
  }


  function drawBoss(t) {
    const b = boss;
    if (!b || b.state === "dead") return;
    const el = ELEMENTS[BOSS_PHASES[b.phase]];
    const shakeX = b.state === "dying" ? Math.sin(t * 60) * 3 : 0;
    const x = b.x + shakeX;
    const y = b.y + (b.state === "hover" || b.state === "intro" ? Math.sin(t * 2) * 2 : 0);
    ctx.save();
    if (b.state === "dying") ctx.globalAlpha = 0.5 + (b.timer % 10) / 20;
    // Cuernos
    ctx.fillStyle = "#3a3127";
    for (const s of [-1, 1]) {
      const hx = x + BOSS_W / 2 + s * 34;
      ctx.beginPath();
      ctx.moveTo(hx - 8, y + 12);
      ctx.lineTo(hx + s * 16, y - 18);
      ctx.lineTo(hx + 8, y + 10);
      ctx.closePath();
      ctx.fill();
    }
    // Máscara de piedra
    ctx.fillStyle = b.flash > 0 ? "#fff3c4" : "#5a4a33";
    roundRectPath(ctx, x, y, BOSS_W, BOSS_H, 16);
    ctx.fill();
    ctx.strokeStyle = "#8f7752";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x + 10, y + 14, BOSS_W - 20, 6);
    // Ojo: franja del color del elemento que le hace daño
    const vy = y + BOSS_VISOR[0];
    const vh = BOSS_VISOR[1] - BOSS_VISOR[0];
    ctx.fillStyle = "#1a150f";
    ctx.fillRect(x + 6, vy, BOSS_W - 12, vh);
    ctx.shadowColor = el.body;
    ctx.shadowBlur = 18;
    ctx.fillStyle = el.body;
    const look = boss.state === "intro" ? 0 : Math.sin(t * 1.5) * 18;
    ctx.fillRect(x + 10, vy + 6, BOSS_W - 20, vh - 12);
    ctx.fillStyle = el.top;
    ctx.beginPath();
    ctx.ellipse(x + BOSS_W / 2 + look, vy + vh / 2, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Boca con dientes
    ctx.fillStyle = "#1a150f";
    ctx.fillRect(x + 28, y + BOSS_H - 6, BOSS_W - 56, 4);
    ctx.restore();
  }

  function drawRocksAndWaves(t) {
    for (const r of rocks) {
      ctx.fillStyle = "#8a7a62";
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5a4a33";
      ctx.fillRect(r.x + 4, r.y + 5, 4, 3);
    }
    for (const w of waves) {
      ctx.save();
      ctx.shadowColor = "#ffb347";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#ffcf7a";
      ctx.beginPath();
      ctx.moveTo(w.x, w.y + w.h);
      ctx.quadraticCurveTo(w.x + w.w / 2, w.y - 6 + Math.sin(t * 30) * 2, w.x + w.w, w.y + w.h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBossBar(t) {
    const b = boss;
    if (!b) return;
    if (b.state === "dead") {
      // Cartel de victoria unos segundos
      const since = levelFrames - bossDefeatedAt;
      if (since < 240) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, since / 20, (240 - since) / 40);
        ctx.fillStyle = "rgba(10,8,5,0.75)";
        ctx.fillRect(0, H / 2 - 50, W, 100);
        text("¡El Guardián ha caído!", W / 2, H / 2 - 12, 38, "#ffe08a");
        text("El sello de las puertas se rompe…", W / 2, H / 2 + 26, 18, "#d9c9a6", "center", "normal");
        ctx.restore();
      }
      return;
    }
    const w = Math.min(420, W - 120);
    const x = W / 2 - w / 2;
    const y = T + 12;
    text(b.name, W / 2, y, 15, "#ffe9b8");
    const seg = w / BOSS_PHASES.length;
    BOSS_PHASES.forEach((elName, i) => {
      const sx = x + i * seg;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(sx + 2, y + 12, seg - 4, 10);
      const fill = i < b.phase ? 0 : i > b.phase ? 1 : b.state === "dying" ? 0 : b.hp / BOSS_HP;
      ctx.fillStyle = ELEMENTS[elName].body;
      ctx.fillRect(sx + 2, y + 12, (seg - 4) * fill, 10);
      if (i === b.phase && b.state !== "dying") {
        ctx.strokeStyle = ELEMENTS[elName].top;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, y + 11, seg - 2, 12);
      }
    });
  }

  function render() {
    const t = tick / 60;
    // Sacudida de pantalla (golpes del jefe): mueve el mundo, no el HUD
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 0.8, (Math.random() - 0.5) * shake * 0.8);
    ctx.drawImage(background, 0, 0);
    drawBreakables(t);
    drawCrumbles(t);
    drawLiquids(t);
    drawSpikes();
    drawSprings();
    for (const ch of CHARACTERS) {
      if (doors[ch.door]) drawDoor(doors[ch.door], players.find((p) => p.ch === ch) || { ch, inDoor: false });
    }
    drawFans(t);
    drawMechs(t);
    drawPortals(t);
    drawGems(t);
    drawItems(t);
    drawBoxes();
    drawEnemies(t);
    drawBoss(t);
    for (const p of players) if (p.alive) drawPlayer(p, t);
    drawShots();
    drawDarts();
    drawRocksAndWaves(t);
    drawBarriers(t);
    drawParticles();
    // Tras un cambio de personaje, las teclas de cada jugador encima de su cabeza (por encima de todo).
    for (const p of players) {
      if (!p.alive || p.swapFlash <= 0) continue;
      ctx.globalAlpha = Math.min(1, p.swapFlash / 30);
      ctx.fillStyle = "rgba(10,8,5,0.75)";
      roundRectPath(ctx, p.x + p.w / 2 - 34, p.y - 26, 68, 18, 6);
      ctx.fill();
      text(p.controlLabel, p.x + p.w / 2, p.y - 17, 12, p.ch.color);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (state === "title") drawTitle(t);
    else if (state === "levels") drawLevelMenu(t);
    else if (state === "ending") drawEnding(t);
    else if (state === "editor") globalThis.Editor?.drawOverlay(ctx);
    else {
      drawHud();
      if (boss && levelFrames > HINT_FRAMES / 2) drawBossBar(t);
      else drawHint();
      if (state === "paused") drawPause();
      else if (state === "dead") drawDead();
      else if (state === "won") drawWon(t);
    }
  }

  function fitCanvas() {
    // En el editor, el panel lateral ocupa parte del ancho.
    const panel = globalThis.document?.getElementById?.("editor-panel");
    const reserved = panel && !panel.hidden ? panel.offsetWidth + 24 : 0;
    const s = Math.min(((innerWidth - reserved) * 0.98) / canvas.width, (innerHeight * 0.98) / canvas.height);
    canvas.style.width = `${canvas.width * s}px`;
    canvas.style.height = `${canvas.height * s}px`;
  }

  addEventListener("resize", fitCanvas);

  // index.html?nivel=3 empieza directamente en ese nivel y desbloquea todos (útil para diseñar niveles);
  // index.html?editor abre el editor de niveles.
  const params = new URLSearchParams(globalThis.location?.search);
  const requested = Number(params.get("nivel"));
  if (params.has("editor") && globalThis.Editor) {
    loadLevel(levelIndex);
    openEditor();
  } else if (requested >= 1 && requested <= LEVELS.length) {
    levelIndex = requested - 1;
    unlockAll = true;
    restartLevel();
  } else {
    loadLevel(levelIndex);
  }
  requestAnimationFrame(frame);
})();
