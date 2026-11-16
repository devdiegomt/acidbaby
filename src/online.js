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
  function loadPeerJS() {
    if (globalThis.Peer) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PEERJS_URL;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("No se pudo cargar la conexión online (¿hay internet?)"));
      document.head.appendChild(s);
    });
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

  const peerTransport = {
    async host(code, h) {
      await loadPeerJS();
      const peer = new globalThis.Peer(PEER_PREFIX + code);
      peer.on("open", () => h.onOpen());
      peer.on("connection", (c) => c.on("open", () => h.onConnection(wrapPeerConn(c))));
      peer.on("error", (e) => h.onError(peerError(e)));
      return () => peer.destroy();
    },
    async join(code, h) {
      await loadPeerJS();
      const peer = new globalThis.Peer();
      peer.on("open", () => {
        const c = peer.connect(PEER_PREFIX + code, { reliable: true, serialization: "json" });
        c.on("open", () => h.onOpen(wrapPeerConn(c)));
      });
      peer.on("error", (e) => h.onError(peerError(e)));
      return () => peer.destroy();
    },
  };

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
  };
  const net = () => globalThis.Juego.net;

  function newCode() {
    let s = "";
    for (let i = 0; i < CODE_LENGTH; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }

  function reset() {
    room.stop?.();
    Object.assign(room, { role: null, code: "", slot: 0, slots: [false, false, false], conns: [null, null, null], conn: null, stop: null, playing: false });
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
    render("Creando la sala…");
    try {
      room.stop = await transport.host(room.code, {
        onOpen: () => render(),
        onError: (msg) => (room.playing ? leave(msg) : render(msg)),
        onConnection(conn) {
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
          if (room.slots.every(Boolean)) startGame();
          render();
        },
      });
    } catch (e) {
      reset();
      render(e.message);
    }
  }

  function broadcastLobby() {
    room.conns.forEach((c) => c?.send({ t: "lobby", slots: room.slots }));
  }

  function startGame() {
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
    render("Buscando la sala…");
    try {
      room.stop = await transport.join(code, {
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
          render("Conectado. Esperando a los demás…");
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
      render();
    } else if (msg.t === "go") {
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
        <ul class="slots"></ul>
        <button data-act="leave">Salir de la sala</button>
      </div>
      <p class="status"></p>
      <p class="note">${LOCAL ? "Modo de prueba: la sala funciona entre pestañas de este navegador." : "Si no conecta, puede que la red bloquee las conexiones directas (pasa en algunas redes de colegio o de empresa)."}</p>
    </div>`;
  document.body.appendChild(panel);
  const $ = (sel) => panel.querySelector(sel);

  function render(status) {
    const inRoom = !!room.role;
    $(".start").hidden = inRoom;
    $(".room").hidden = !inRoom;
    $(".code").textContent = room.code;
    $(".code-label").textContent = room.role === "host" ? "Compartan este código con los otros dos" : "Sala";
    $(".slots").innerHTML = NAMES.map((n, i) => {
      const who = room.role && i === (room.role === "host" ? 0 : room.slot) ? " (tú)" : "";
      const here = room.slots[i] ? "✓ conectado" : "esperando…";
      return `<li><b style="color:${COLORS[i]}">${n}${who}</b> <span>${i === 0 ? "anfitrión · " : ""}${here}</span></li>`;
    }).join("");
    if (status !== undefined) $(".status").textContent = status;
    else if (room.role === "host") $(".status").textContent = room.slots.every(Boolean) ? "¡Están los tres!" : "Esperando a que se unan…";
  }

  function open() {
    panel.hidden = false;
    render(room.role ? undefined : "");
    if (!room.role) $("#online-code").focus();
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
      if (e.code === "KeyO" && room.playing && !e.target.closest?.("input")) open();
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
