// Controles táctiles para jugar desde el celular o la tableta: flechas, saltar y disparar abajo;
// pausa y reintentar arriba. Solo aparecen en pantallas táctiles (o con ?tactil en la dirección).
// Los botones aprietan las mismas teclas que el teclado (Juego.input), así que funcionan igual
// jugando online (cada celular maneja su personaje) que en un solo aparato: ahí, un selector elige
// a qué personaje mueven los botones.
(() => {
  "use strict";
  const juego = globalThis.Juego;
  if (!globalThis.document?.body || !juego?.input) return;
  const forced = new URLSearchParams(location.search).has("tactil");
  const touch = forced || globalThis.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in globalThis;
  if (!touch) return;

  const CHARS = juego.characters;
  const firstKey = (k) => (Array.isArray(k) ? k[0] : k);
  const STORE = "acidito-tactil";
  let who = 0; // personaje que manejan los botones (sin online)
  try {
    who = Math.min(CHARS.length - 1, Math.max(0, Number(localStorage.getItem(STORE)) || 0));
  } catch {
    // Sin almacenamiento: se empieza con Chispa.
  }

  const pad = document.createElement("div");
  pad.id = "touch-pad";
  pad.innerHTML = `
    <div class="tp-move">
      <button data-k="left" aria-label="Izquierda">◀</button>
      <button data-k="right" aria-label="Derecha">▶</button>
    </div>
    <div class="tp-act">
      <button data-k="fire" aria-label="Disparar">✷</button>
      <button data-k="jump" aria-label="Saltar">▲</button>
    </div>
    <div class="tp-top">
      <button data-k="pause" aria-label="Pausa">❚❚</button>
      <button data-k="retry" aria-label="Reintentar">↻</button>
      <div class="tp-who">${CHARS.map((ch, i) => `<button data-who="${i}" style="--c:${ch.color}" aria-label="Manejar a ${ch.name}">${ch.name}</button>`).join("")}</div>
      <span class="tp-me"></span>
    </div>`;
  document.body.appendChild(pad);
  // Aviso para girar el celular (también en los menús, por eso va aparte de los botones).
  const rotate = document.createElement("div");
  rotate.id = "touch-rotate";
  rotate.textContent = "Giren el celular para jugar ↻";
  document.body.appendChild(rotate);
  document.documentElement.classList.add("touch");

  // Tecla de cada botón: la del personaje elegido (online, cualquier juego de teclas mueve al propio).
  function codeFor(k) {
    if (k === "pause") return "Escape";
    if (k === "retry") return "KeyR";
    return firstKey(CHARS[who].keys[k]);
  }

  const active = new Map(); // pointerId → { key, code, button }
  function press(id, button) {
    const key = button.dataset.k;
    const code = codeFor(key);
    active.set(id, { key, code, button });
    button.classList.add("on");
    juego.input.down(code);
  }
  function release(id) {
    const a = active.get(id);
    if (!a) return;
    active.delete(id);
    if (![...active.values()].some((o) => o.code === a.code)) juego.input.up(a.code);
    if (![...active.values()].some((o) => o.button === a.button)) a.button.classList.remove("on");
  }
  function releaseAll() {
    for (const id of [...active.keys()]) release(id);
  }

  pad.addEventListener("pointerdown", (e) => {
    const whoBtn = e.target.closest("[data-who]");
    if (whoBtn) {
      releaseAll();
      who = Number(whoBtn.dataset.who);
      try {
        localStorage.setItem(STORE, String(who));
      } catch {
        // No pasa nada.
      }
      render();
      e.preventDefault();
      return;
    }
    const button = e.target.closest("[data-k]");
    if (!button) return;
    e.preventDefault();
    pad.setPointerCapture?.(e.pointerId);
    press(e.pointerId, button);
  });
  // Deslizar el dedo de un botón a otro (por ejemplo, de ◀ a ▶) cambia de botón sin levantarlo.
  pad.addEventListener("pointermove", (e) => {
    const a = active.get(e.pointerId);
    if (!a || a.key === "pause" || a.key === "retry") return;
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest?.("#touch-pad [data-k]");
    if (over && over !== a.button && over.dataset.k !== "pause" && over.dataset.k !== "retry") {
      release(e.pointerId);
      press(e.pointerId, over);
    }
  });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) pad.addEventListener(ev, (e) => release(e.pointerId));
  pad.addEventListener("contextmenu", (e) => e.preventDefault());
  addEventListener("blur", releaseAll);

  // Solo se ven jugando (en los menús se toca la pantalla) y nunca con un panel abierto; sin online
  // se ve el selector de personaje.
  const PLAYING = new Set(["playing", "dead", "paused"]);
  let last = "";
  function render() {
    const online = !!juego.net?.active;
    const hidden = !PLAYING.has(juego.state) || globalThis.Online?.isOpen || globalThis.Progreso?.isOpen;
    const mine = online ? (globalThis.Online?.room?.role === "host" ? 0 : globalThis.Online?.room?.slot ?? 0) : who;
    const key = `${hidden}|${online}|${mine}`;
    if (key === last) return;
    last = key;
    pad.hidden = !!hidden;
    if (hidden) releaseAll();
    pad.querySelector(".tp-who").hidden = online;
    const me = pad.querySelector(".tp-me");
    me.hidden = !online;
    me.textContent = online ? `Eres ${CHARS[mine].name}` : "";
    me.style.color = CHARS[mine].color;
    pad.querySelectorAll("[data-who]").forEach((b) => b.classList.toggle("on", Number(b.dataset.who) === who));
    pad.style.setProperty("--me", CHARS[mine].color);
  }
  (function loop() {
    render();
    requestAnimationFrame(loop);
  })();

  globalThis.Tactil = {
    get who() {
      return who;
    },
  };
})();
