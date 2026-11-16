// Juego online: salas con código para jugar los tres, cada uno desde su PC.
// Quien crea la sala es el anfitrión (Chispa) y elige los niveles; los otros dos se unen con el
// código (Gota y Acidito). La conexión es directa entre los navegadores (WebRTC, con PeerJS); el
// servidor público de PeerJS solo sirve para que se encuentren. Con ?red=local en la dirección, en
// cambio, la sala funciona entre pestañas del mismo navegador (para probar sin internet).
// La partida en sí (teclas, sincronización) la lleva game.js: aquí solo se conectan los tres.
(() => {
  "use strict";
  if (!globalThis.document?.body) return;

  const PEERJS_URL = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  const PEER_PREFIX = "acidito-sala-";
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I, que se confunden
  const CODE_LENGTH = 5;
  const NAMES = ["Chispa", "Gota", "Acidito"];
  const COLORS = ["#ff5a1f", "#2a8cff", "#5fd12e"];
  const LOCAL = new URLSearchParams(location.search).get("red") === "local";

  // ---------------------------------------------------------------------------
  // Transporte: dos formas de conectar, con la misma forma de hablar.
  //   host(code, { onOpen, onConnection(conn), onError })
  //   join(code, { onOpen(conn), onError })
  //   conn: { send(obj), onData(fn), onClose(fn), close() }
  // ---------------------------------------------------------------------------
  // Se empieza a cargar al abrir el panel, para que al pulsar «Crear sala» o «Unirse» ya esté.
  let peerLoading = null;
  function loadPeerJS() {
    if (globalThis.Peer) return Promise.resolve();
    peerLoading ??= new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PEERJS_URL;
      s.onload = () => resolve();
      s.onerror = () => {
        peerLoading = null;
        s.remove();
        reject(new Error("No se pudo cargar la conexión online (¿hay internet?)"));
      };
      document.head.appendChild(s);
    });
    return peerLoading;
  }

  const peerErrors = {
    "unavailable-id": "Ese código de sala ya está en uso. Prueben a crear otra.",
    "peer-unavailable": "No hay ninguna sala con ese código.",
    network: "No se pudo conectar con el servidor. ¿Hay internet?",
    "browser-incompatible": "Este navegador no permite jugar online.",
  };
  const peerError = (e) => peerErrors[e?.type] || `Error de conexión (${e?.type || e?.message || e})`;

  function wrapPeerConn(c) {
    return {
      send: (m) => c.open && c.send(m),
      onData: (f) => c.on("data", f),
      onClose: (f) => c.on("close", f),
      close: () => c.close(),
    };
  }

  // Pasos de la conexión (para la barra): "load" (se carga PeerJS), "server" (se habla con el
  // servidor que los presenta), "room" (invitado: se conecta con el anfitrión).
  const JOIN_TIMEOUT = 40000; // si en este tiempo no conecta con la sala, se da por perdida

  const peerTransport = {
    async host(code, h) {
      h.onStep?.("load");
      await loadPeerJS();
      h.onStep?.("server");
      const peer = new globalThis.Peer(PEER_PREFIX + code);
      peer.on("open", () => h.onOpen());
      peer.on("connection", (c) => {
        // Alguien está entrando: se avisa ya (la conexión directa puede tardar unos segundos).
        let settled = false;
        const fail = () => {
          if (settled) return;
          settled = true;
          h.onJoinFailed?.();
        };
        h.onJoining?.();
        const timer = setTimeout(() => {
          fail();
          c.close();
        }, JOIN_TIMEOUT);
        c.on("open", () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          h.onConnection(wrapPeerConn(c));
        });
        c.on("error", fail);
        c.on("close", fail);
      });
      peer.on("error", (e) => h.onError(peerError(e)));
      return () => peer.destroy();
    },
    async join(code, h) {
      h.onStep?.("load");
      await loadPeerJS();
      h.onStep?.("server");
      const peer = new globalThis.Peer();
      let timer = null;
      peer.on("open", () => {
        h.onStep?.("room");
        const c = peer.connect(PEER_PREFIX + code, { reliable: true, serialization: "json" });
        timer = setTimeout(() => h.onError(SLOW_FAIL), JOIN_TIMEOUT);
        c.on("open", () => {
          clearTimeout(timer);
          h.onOpen(wrapPeerConn(c));
        });
      });
      peer.on("error", (e) => {
        clearTimeout(timer);
        h.onError(peerError(e));
      });
      return () => {
        clearTimeout(timer);
        peer.destroy();
      };
    },
  };
  const SLOW_FAIL = "No se pudo conectar con la sala. Puede que esta red bloquee las conexiones directas: prueben con otra (por ejemplo, los datos del celular) o vuelvan a intentarlo.";

  // Entre pestañas del mismo navegador (pruebas): un BroadcastChannel por sala.
  function localConn(bc, me, them) {
    const data = [];
    const closed = [];
    return {
      send: (m) => bc.postMessage({ from: me, to: them, kind: "data", data: m }),
      onData: (f) => data.push(f),
      onClose: (f) => closed.push(f),
      close: () => bc.postMessage({ from: me, to: them, kind: "close" }),
      emit(kind, d) {
        if (kind === "data") data.forEach((f) => f(d));
        else if (kind === "close") closed.forEach((f) => f());
      },
    };
  }

  const localTransport = {
    async host(code, h) {
      const bc = new BroadcastChannel("acidito-" + code);
      const conns = new Map();
      bc.onmessage = ({ data: m }) => {
        if (m.to !== "host") return;
        if (m.kind === "hello") {
          const conn = localConn(bc, "host", m.from);
          conns.set(m.from, conn);
          bc.postMessage({ from: "host", to: m.from, kind: "welcome" });
          h.onConnection(conn);
        } else conns.get(m.from)?.emit(m.kind, m.data);
      };
      addEventListener("beforeunload", () => conns.forEach((c) => c.close()));
      setTimeout(() => h.onOpen(), 0);
      return () => bc.close();
    },
    async join(code, h) {
      const bc = new BroadcastChannel("acidito-" + code);
      const me = "p" + Math.random().toString(36).slice(2);
      const conn = localConn(bc, me, "host");
      let answered = false;
      bc.onmessage = ({ data: m }) => {
        if (m.to !== me) return;
        if (m.kind === "welcome") {
          answered = true;
          h.onOpen(conn);
        } else conn.emit(m.kind, m.data);
      };
      addEventListener("beforeunload", () => conn.close());
      bc.postMessage({ from: me, to: "host", kind: "hello" });
      setTimeout(() => answered || h.onError(peerErrors["peer-unavailable"]), 1500);
      return () => bc.close();
    },
  };

  const transport = LOCAL ? localTransport : peerTransport;

  // ---------------------------------------------------------------------------
  // La sala
  // ---------------------------------------------------------------------------
  const room = {
    role: null, // "host" | "guest"
    code: "",
    slot: 0,
    slots: [false, false, false], // quién está conectado
    conns: [null, null, null], // anfitrión: la conexión de cada invitado
    conn: null, // invitado: la conexión con el anfitrión
    stop: null, // cierra la conexión
    playing: false,
    step: "", // paso de mi conexión: "load" | "server" | "room" | "" (listo)
    stepSince: 0, // desde cuándo (para enseñar los segundos y avisar si tarda)
    joining: 0, // invitados que están entrando (anfitrión, y se cuenta a los invitados)
    countdownUntil: 0, // con los tres dentro, cuándo empieza
  };
  let countdownTimer = null;
  const COUNTDOWN_MS = 3000;
  function setStep(step) {
    room.step = step;
    room.stepSince = Date.now();
    render();
  }
  const net = () => globalThis.Juego.net;

  function newCode() {
    let s = "";
    for (let i = 0; i < CODE_LENGTH; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }

  function reset() {
    room.stop?.();
    clearTimeout(countdownTimer);
    Object.assign(room, { role: null, code: "", slot: 0, slots: [false, false, false], conns: [null, null, null], conn: null, stop: null, playing: false, step: "", stepSince: 0, joining: 0, countdownUntil: 0 });
  }

  function leave(reason = "") {
    if (room.role === "host") room.conns.forEach((c) => c && (c.send({ t: "bye", reason: "El anfitrión cerró la sala" }), c.close()));
    if (room.role === "guest") room.conn?.close();
    const wasPlaying = room.playing;
    reset();
    if (wasPlaying || net().active) net().end(reason);
    render(reason);
  }

  async function createRoom() {
    reset();
    room.role = "host";
    room.code = newCode();
    room.slots[0] = true;
    setStep("load");
    try {
      room.stop = await transport.host(room.code, {
        onStep: setStep,
        onOpen: () => setStep(""),
        onError: (msg) => {
          if (room.playing) leave(msg);
          else {
            reset();
            render(msg);
          }
        },
        onJoining() {
          if (room.playing || room.slots.every(Boolean)) return;
          room.joining++;
          broadcastLobby();
          render();
        },
        onJoinFailed() {
          room.joining = Math.max(0, room.joining - 1);
          broadcastLobby();
          render();
        },
        onConnection(conn) {
          room.joining = Math.max(0, room.joining - 1);
          const slot = room.slots.indexOf(false);
          if (slot < 0 || room.playing) {
            conn.send({ t: "bye", reason: "La sala ya está llena" });
            conn.close();
            return;
          }
          room.slots[slot] = true;
          room.conns[slot] = conn;
          conn.send({ t: "welcome", slot });
          conn.onData((msg) => fromGuest(slot, msg));
          conn.onClose(() => guestLeft(slot));
          broadcastLobby();
          if (room.slots.every(Boolean)) startCountdown();
          render();
        },
      });
    } catch (e) {
      reset();
      render(e.message);
    }
  }

  function broadcastLobby() {
    room.conns.forEach((c) => c?.send({ t: "lobby", slots: room.slots, joining: room.joining }));
  }

  // Con los tres dentro, la barra se llena y la partida empieza a los pocos segundos (para todos
  // a la vez: los invitados enseñan la misma cuenta atrás).
  function startCountdown() {
    room.countdownUntil = Date.now() + COUNTDOWN_MS;
    room.conns.forEach((c) => c?.send({ t: "countdown", ms: COUNTDOWN_MS }));
    clearTimeout(countdownTimer);
    countdownTimer = setTimeout(() => room.slots.every(Boolean) && startGame(), COUNTDOWN_MS);
  }

  function startGame() {
    room.countdownUntil = 0;
    room.playing = true;
    room.conns.forEach((c) => c?.send({ t: "go" }));
    net().begin({ host: true, slot: 0, send: (m) => room.conns.forEach((c) => c?.send(m)) });
    close();
  }

  // Anfitrión: lo que llega de un invitado. Las teclas se reenvían al otro invitado.
  function fromGuest(slot, msg) {
    if (msg.t === "in") room.conns.forEach((c, i) => i !== slot && c?.send(msg));
    net().receive(msg);
  }

  function guestLeft(slot) {
    if (!room.conns[slot]) return;
    room.conns[slot] = null;
    room.slots[slot] = false;
    clearTimeout(countdownTimer);
    room.countdownUntil = 0;
    if (room.playing) {
      // Sin los tres no se puede seguir: se avisa al que queda y se cierra la sala.
      leave(`${NAMES[slot]} se desconectó`);
      return;
    }
    broadcastLobby();
    render(`${NAMES[slot]} se fue de la sala`);
  }

  async function joinRoom(code) {
    code = code.trim().toUpperCase();
    if (code.length !== CODE_LENGTH) return render(`El código tiene ${CODE_LENGTH} letras.`);
    reset();
    room.role = "guest";
    room.code = code;
    setStep("load");
    try {
      room.stop = await transport.join(code, {
        onStep: setStep,
        onError: (msg) => {
          if (room.playing) leave(msg);
          else {
            reset();
            render(msg);
          }
        },
        onOpen(conn) {
          room.conn = conn;
          conn.onData(fromHost);
          conn.onClose(() => room.role && leave("Se perdió la conexión con la sala"));
          setStep("");
        },
      });
    } catch (e) {
      reset();
      render(e.message);
    }
  }

  // Invitado: lo que llega del anfitrión.
  function fromHost(msg) {
    if (msg.t === "welcome") {
      room.slot = msg.slot;
      room.slots[0] = room.slots[msg.slot] = true;
      render();
    } else if (msg.t === "lobby") {
      room.slots = msg.slots;
      room.joining = msg.joining || 0;
      if (!room.slots.every(Boolean)) room.countdownUntil = 0;
      render();
    } else if (msg.t === "countdown") {
      room.countdownUntil = Date.now() + msg.ms;
      render();
    } else if (msg.t === "go") {
      room.countdownUntil = 0;
      room.playing = true;
      net().begin({ host: false, slot: room.slot, send: (m) => room.conn?.send(m) });
      close();
    } else if (msg.t === "bye") {
      leave(msg.reason);
    } else net().receive(msg);
  }

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------
  const panel = document.createElement("div");
  panel.id = "online-panel";
  panel.className = "overlay-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="box" role="dialog" aria-label="Jugar online">
      <header><h1>Jugar online</h1><button data-act="close" title="Cerrar (Esc)">✕</button></header>
      <p class="help">Cada uno, desde su PC, maneja un personaje. Hacen falta los tres.</p>
      <div class="start">
        <button data-act="create" class="primary">Crear sala</button>
        <div class="row"><input id="online-code" maxlength="${CODE_LENGTH}" placeholder="Código" autocomplete="off" spellcheck="false"><button data-act="join">Unirse</button></div>
      </div>
      <div class="room" hidden>
        <p class="code-label">Código de la sala</p>
        <p class="code"></p>
        <div class="bar">${NAMES.map((n, i) => `<div class="seg" style="--c:${COLORS[i]}"><i></i><span></span></div>`).join("")}</div>
        <p class="countdown"></p>
        <p class="status"></p>
        <p class="slow"></p>
        <button data-act="leave">Salir de la sala</button>
      </div>
      <p class="status start-status"></p>
      <p class="note">${LOCAL ? "Modo de prueba: la sala funciona entre pestañas de este navegador." : "Si no conecta, puede que la red bloquee las conexiones directas (pasa en algunas redes de colegio o de empresa)."}</p>
    </div>`;
  document.body.appendChild(panel);
  const $ = (sel) => panel.querySelector(sel);

  // Mensaje de mi paso actual de la conexión, con los segundos que lleva.
  const STEP_TEXT = {
    load: "Preparando la conexión…",
    server: "Conectando con el servidor…",
    room: "Entrando en la sala…",
  };
  const SLOW_AFTER = 12000;
  let lastStatus = "";
  let statusAt = 0;
  const NOTICE_MS = 5000; // dentro de la sala, los avisos («X se fue…») duran unos segundos

  // Estado de cada personaje en la barra: "ready", "joining" o "empty".
  function slotStates() {
    const states = room.slots.map((on) => (on ? "ready" : "empty"));
    const mine = room.role === "host" ? 0 : room.slot;
    if (room.step) {
      // Mi propia conexión aún no está lista.
      if (room.role === "guest" && !room.conn) return states.map((_, i) => (i === 0 || i === mine ? "joining" : "empty"));
      states[mine] = "joining";
    }
    let joining = room.joining;
    for (let i = 0; i < 3 && joining > 0; i++) if (states[i] === "empty") (states[i] = "joining"), joining--;
    return states;
  }

  function render(status) {
    const inRoom = !!room.role;
    if (status !== undefined) {
      lastStatus = status;
      statusAt = Date.now();
    }
    $(".start").hidden = inRoom;
    $(".room").hidden = !inRoom;
    $(".start-status").textContent = inRoom ? "" : lastStatus;
    if (!inRoom) return;
    $(".code").textContent = room.code;
    $(".code-label").textContent = room.role === "host" ? "Compartan este código con los otros dos" : "Sala";
    const states = slotStates();
    const mine = room.role === "host" ? 0 : room.slot;
    panel.querySelectorAll(".seg").forEach((seg, i) => {
      seg.className = `seg ${states[i]}`;
      const who = room.conn || room.role === "host" ? (i === mine ? " (tú)" : "") : "";
      const mark = states[i] === "ready" ? " ✓" : states[i] === "joining" ? "…" : "";
      seg.querySelector("span").textContent = `${NAMES[i]}${who}${mark}`;
      seg.title = states[i] === "ready" ? "Conectado" : states[i] === "joining" ? "Conectando…" : "Esperando a que entre";
    });
    const all = room.slots.every(Boolean);
    const left = room.countdownUntil ? Math.max(1, Math.ceil((room.countdownUntil - Date.now()) / 1000)) : 0;
    $(".countdown").textContent = left ? `¡Están los tres! Empieza en ${left}…` : "";
    const notice = Date.now() - statusAt < NOTICE_MS ? lastStatus : "";
    let line = notice;
    if (room.step) line = `${STEP_TEXT[room.step]} ${Math.floor((Date.now() - room.stepSince) / 1000)} s`;
    else if (!left && !notice) {
      const missing = 3 - room.slots.filter(Boolean).length;
      if (all) line = "¡Están los tres!";
      else if (room.joining) line = "Alguien está entrando…";
      else line = `Esperando ${missing === 1 ? "a 1 jugador más" : `a ${missing} jugadores más`}. Cuando estén los tres, la partida empieza sola y ${NAMES[0]} elige el nivel.`;
    }
    $(".room .status").textContent = left ? "" : line;
    const slow = room.step && Date.now() - room.stepSince > SLOW_AFTER;
    $(".slow").textContent = slow
      ? "Está tardando más de lo normal. Esperen un poco más; si no conecta, prueben otra red (por ejemplo, los datos del celular)."
      : "";
  }
  // Mientras el panel está abierto, se refresca (segundos, cuenta atrás).
  setInterval(() => !panel.hidden && room.role && render(), 250);

  function open() {
    panel.hidden = false;
    render(room.role ? undefined : "");
    if (!room.role) $("#online-code").focus();
    if (!LOCAL) loadPeerJS().catch(() => {}); // se va cargando mientras eligen
  }

  function close() {
    panel.hidden = true;
    document.activeElement?.blur();
  }

  panel.addEventListener("click", (e) => {
    const act = e.target.closest("button")?.dataset.act;
    if (act === "close") close();
    else if (act === "create") createRoom();
    else if (act === "join") joinRoom($("#online-code").value);
    else if (act === "leave") leave("");
  });
  $("#online-code").addEventListener("keydown", (e) => {
    if (e.key === "Enter") joinRoom(e.target.value);
  });
  addEventListener("keydown", (e) => {
    if (panel.hidden) {
      // Durante una partida online, O abre el panel (para salir de la sala).
      if (e.code === "KeyO" && room.playing && !e.target.closest?.("input, textarea")) open();
      return;
    }
    if (e.key === "Escape") close();
  });

  globalThis.Online = {
    open,
    close,
    get isOpen() {
      return !panel.hidden;
    },
    get room() {
      return room;
    },
  };
})();
