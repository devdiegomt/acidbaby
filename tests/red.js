// Prueba del juego en red: tres copias del juego (anfitrión y dos invitados) en el mismo proceso,
// conectadas por una red de mentira con retraso. Comprueba que los tres ven la misma partida, que
// cada uno maneja su personaje y que una desincronización se corrige sola.
const fs = require("fs");
const vm = require("vm");
const ROOT = require("path").join(__dirname, "..", "src") + "/";

const source =
  fs.readFileSync(ROOT + "levels.js", "utf8") +
  "\n" +
  fs.readFileSync(ROOT + "levels2.js", "utf8") +
  "\n" +
  fs
    .readFileSync(ROOT + "game.js", "utf8")
    .replace(
      /\}\)\(\);\s*$/,
      `globalThis.G = { get players(){return players}, get state(){return state}, get levelIndex(){return levelIndex}, get level(){return level}, get doors(){return doors} };\n})();`,
    );

function makeGame(name) {
  const handlers = {};
  const ctxStub = new Proxy({}, {
    get: (_, k) => {
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => ({ addColorStop() {} });
      if (k === "measureText") return () => ({ width: 10 });
      return () => {};
    },
    set: () => true,
  });
  const canvasStub = () => ({ getContext: () => ctxStub, style: {}, width: 0, height: 0 });
  const storage = new Map();
  const sandbox = {
    document: { getElementById: canvasStub, createElement: canvasStub },
    addEventListener: (n, f) => (handlers[n] = f),
    innerWidth: 1024,
    innerHeight: 576,
    requestAnimationFrame: () => {},
    localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) },
    performance,
    structuredClone,
    URLSearchParams,
    console,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: `game-${name}.js` });
  return {
    name,
    J: sandbox.Juego,
    G: sandbox.G,
    down: (code) => handlers.keydown({ code, repeat: false, preventDefault() {} }),
    up: (code) => handlers.keyup({ code }),
  };
}

let failures = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${label} ${extra}`);
  if (!ok) failures++;
};

// Red de mentira: estrella con el anfitrión en el centro (como en online.js) y un retraso en pasos.
const host = makeGame("anfitrión");
const g1 = makeGame("invitado 1");
const g2 = makeGame("invitado 2");
const games = [host, g1, g2];
let now = 0;
let latency = 3;
const queue = [];
const deliver = (to, msg) => queue.push({ at: now + latency, to, msg: JSON.parse(JSON.stringify(msg)) });
host.J.net.begin({ host: true, slot: 0, send: (m) => [g1, g2].forEach((g) => deliver(g, m)) });
for (const [g, slot] of [[g1, 1], [g2, 2]]) {
  g.J.net.begin({
    host: false,
    slot,
    send: (m) => {
      deliver(host, m);
      if (m.t === "in") [g1, g2].filter((o) => o !== g).forEach((o) => deliver(o, m)); // el anfitrión reenvía las teclas
    },
  });
}
function step(n = 1) {
  for (let i = 0; i < n; i++) {
    now++;
    for (const g of games) g.J.net.tick();
    for (let k = queue.length - 1; k >= 0; k--) {
      if (queue[k].at > now) continue;
      const { to, msg } = queue.splice(k, 1)[0];
      to.J.net.receive(msg);
    }
  }
}
const tap = (g, code) => { g.down(code); step(1); g.up(code); step(1); };
const pos = (g) => g.G.players.map((p) => `${p.x},${p.y}`).join(" ");
const sameWorld = () => games.every((g) => pos(g) === pos(host)) && games.every((g) => g.J.net.hash() === host.J.net.hash());
// Espera a que los tres estén en el mismo frame (sin teclas nuevas) para comparar.
function settle() {
  for (let i = 0; i < 60 && !games.every((g) => g.J.net.frame === host.J.net.frame); i++) step(1);
}

console.log("Juego en red");
check("El anfitrión está en la portada y los invitados esperan", host.G.state === "title" && g1.G.state === "netwait" && g2.G.state === "netwait");
tap(host, "Enter"); // temporada 1
tap(host, "Enter"); // nivel 1
step(latency + 2);
check("El anfitrión elige nivel y empieza para los tres", games.every((g) => g.G.state === "playing" && g.G.levelIndex === 0), games.map((g) => g.G.state).join(", "));
const x0 = host.G.players.map((p) => p.x);
host.down("KeyD"); g1.down("ArrowRight"); g2.down("KeyL");
step(14); // poco: a la derecha está la lava
host.up("KeyD"); g1.up("ArrowRight"); g2.up("KeyL");
settle();
check("Cada uno mueve su personaje (con las teclas que quiera)", host.G.players.every((p, i) => p.x > x0[i]), host.G.players.map((p, i) => `${x0[i]}→${p.x}`).join(" "));
check("…y los tres ven exactamente lo mismo", sameWorld(), games.map(pos).join(" | "));
const y1 = host.G.players[1].y;
g1.down("ArrowUp"); step(6); g1.up("ArrowUp");
step(10);
check("Gota salta en el PC de su jugador y en los otros dos", games.every((g) => g.G.players[1].y < y1), games.map((g) => g.G.players[1].y).join(", "));
settle();
check("…y siguen igual (y nadie ha muerto)", sameWorld() && host.G.state === "playing");
// Con más retraso de red también se mantienen iguales (el juego espera a las teclas que faltan).
latency = 12;
host.down("KeyA"); g2.down("KeyJ");
step(50);
host.up("KeyA"); g2.up("KeyJ");
latency = 3;
step(30);
settle();
check("Con más retraso, sigue sincronizado", sameWorld());
// Una desincronización (por ejemplo, un navegador que redondea distinto) se corrige sola.
g2.G.players[0].x += 40;
check("(Se desincroniza un invitado)", pos(g2) !== pos(host));
step(90);
settle();
check("El anfitrión lo detecta y le manda el estado completo", g2.J.net.syncs >= 1 && sameWorld(), `${g2.J.net.syncs} correcciones`);
// R (reintentar) de cualquiera reinicia el nivel para los tres.
host.down("KeyD"); step(20); host.up("KeyD"); step(10);
tap(g1, "KeyR");
step(20);
settle();
check("R de un invitado reinicia el nivel para los tres", sameWorld() && host.G.players[0].x === x0[0], `${host.G.players[0].x}`);
// Llegar a las puertas: gana en los tres y el anfitrión pasa al siguiente nivel para todos.
for (const g of games) for (const p of g.G.players) { const d = g.G.doors[p.ch.door]; p.x = d.c * 32 + 5; p.y = (d.r + 1) * 32 - p.h; p.vx = p.vy = 0; }
step(30);
check("Ganan en los tres PCs", games.every((g) => g.G.state === "won"), games.map((g) => g.G.state).join(", "));
tap(g1, "Enter");
check("Un invitado no puede pasar de nivel", games.every((g) => g.G.state === "won"));
tap(host, "Enter");
step(latency + 3);
check("El anfitrión pasa al siguiente nivel para todos", games.every((g) => g.G.state === "playing" && g.G.levelIndex === 1));
// La corrección del estado completo funciona en niveles con de todo (portales, ventiladores,
// banderas, marea, oscuridad, jefes…): se desincroniza un invitado y tiene que volver a coincidir.
const LEVELS_TO_SYNC = [[0, 8, "Portales"], [0, 3, "Corrientes de aire"], [0, 20, "El Guardián"], [1, 0, "1-1 (bandera)"], [1, 5, "1-6 (Gólem)"], [1, 7, "2-2 (marea y desagüe)"], [1, 11, "2-6 (Hidra)"], [1, 13, "3-2 (oscuridad y farol)"], [1, 17, "3-6 (Sombra)"], [1, 19, "4-2 (géiseres)"], [1, 22, "4-5 (relevos)"]];
for (const [season, level, label] of LEVELS_TO_SYNC) {
  for (const g of games) g.J.net.receive({ t: "start", season, level });
  host.down("KeyD"); g1.down("ArrowLeft"); g2.down("KeyI");
  step(25);
  host.up("KeyD"); g1.up("ArrowLeft"); g2.up("KeyI");
  step(40);
  settle();
  const before = g2.J.net.syncs;
  g2.G.players[2].x += 23;
  g2.G.players[0].y -= 5;
  step(100);
  settle();
  check(`Corrige una desincronización en ${label}`, g2.J.net.syncs > before && sameWorld(), `${pos(g2)} / ${pos(host)}`);
}

// Si alguien se va, la partida termina con un aviso.
for (const g of games) g.J.net.end("Gota se desconectó");
check("Al desconectarse, todos vuelven a la portada", games.every((g) => g.G.state === "title" && !g.J.net.active));

process.exitCode = failures ? 1 : 0;
console.log(failures ? `\n${failures} fallos` : "\nTodo bien");
