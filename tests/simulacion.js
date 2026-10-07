// Simulación headless del juego para probar física, mecanismos, muertes y victoria.
const fs = require("fs");
const ROOT = require("path").join(__dirname, "..", "src") + "/";

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
globalThis.document = { getElementById: canvasStub, createElement: canvasStub };
globalThis.addEventListener = (n, f) => (handlers[n] = f);
globalThis.innerWidth = 1024;
globalThis.innerHeight = 576;
globalThis.requestAnimationFrame = () => {};
const storage = new Map();
globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) };

let game = fs.readFileSync(ROOT + "game.js", "utf8");
game = game.replace(
  /\}\)\(\);\s*$/,
  `globalThis.G = { update, render, loadLevel, get players(){return players}, get state(){return state}, set state(v){state=v},
     get deathMessage(){return deathMessage}, get boxes(){return boxes}, get mechs(){return mechs}, get gems(){return gems},
     get grid(){return grid}, get fans(){return fans}, get doors(){return doors}, get enemies(){return enemies}, get items(){return items}, get shots(){return shots},
     get save(){return save}, isUnlocked, get levelIndex(){return levelIndex}, get lastResult(){return lastResult},
     get menuIndex(){return menuIndex}, get levelFrames(){return levelFrames}, setLevel(i){ testLevel = null; levelIndex = i; loadLevel(i); state = "playing"; }, get darts(){return darts}, get crumbles(){return crumbles}, get boss(){return boss}, solidAt };\n})();`,
);
// editor.js va antes que game.js (como en index.html); sin DOM solo define EditorCore.
eval(fs.readFileSync(ROOT + "levels.js", "utf8") + "\nglobalThis.LEVELS = LEVELS;\n" + fs.readFileSync(ROOT + "editor.js", "utf8") + "\n" + game);

const down = (code) => handlers.keydown({ code, repeat: false, preventDefault() {} });
const up = (code) => handlers.keyup({ code });
const run = (n) => { for (let i = 0; i < n; i++) G.update(); };
const P = (name) => G.players.find((p) => p.ch.name === name);
const M = (id) => G.mechs.find((m) => m.id === id);
const tile = (b) => `col ${Math.floor((b.x + b.w / 2) / 32)}, fila ${Math.floor((b.y + b.h - 1) / 32)}`;
const feetRow = (b) => Math.floor((b.y + b.h - 1) / 32);
const place = (p, c, r) => { p.x = c * 32 + 5; p.y = (r + 1) * 32 - p.h; p.vx = p.vy = p.remX = p.remY = 0; };
let fire, water, acid;
const level = (i) => { G.setLevel(i); run(1); fire = P("Fireboy"); water = P("Watergirl"); acid = P("AcidBaby"); };
const KEYS = { Fireboy: { l: "KeyA", r: "KeyD", j: "KeyW" }, Watergirl: { l: "ArrowLeft", r: "ArrowRight", j: "ArrowUp" }, AcidBaby: { l: "KeyG", r: "KeyJ", j: "KeyY" } };
// Teclas de un jugador (no de su personaje: con el amuleto del cambio pueden no coincidir).
const keysOf = (p) => ({ l: p.controls.left, r: p.controls.right, j: p.controls.jump, fire: p.controls.fire });
const hold = (codes, n, until) => { codes.forEach(down); for (let i = 0; i < n && !(until && until()); i++) run(1); codes.forEach(up); };
let failures = 0;
const check = (label, ok, extra = "") => { console.log(`${ok ? "OK  " : "FAIL"} ${label} ${extra}`); if (!ok) failures++; };

// Todos los niveles cargan sin errores
LEVELS.forEach((lv, i) => {
  try { G.loadLevel(i); check(`Nivel ${i + 1} "${lv.name}" carga`, true); }
  catch (e) { check(`Nivel ${i + 1} carga`, false, e.message); }
});

// --- Menús, pausa y progreso ---------------------------------------------------
console.log("\nMenús y progreso");
const tap = (code) => { down(code); run(1); up(code); run(1); };
const saved = () => JSON.parse([...storage.values()][0] || "{}");
check("Empieza en la portada", G.state === "title");
tap("Enter");
check("ENTER abre el menú de niveles en el nivel 1", G.state === "levels" && G.levelIndex === 0);
check("Sin progreso, solo el nivel 1 está abierto", G.isUnlocked(0) && !G.isUnlocked(1));
tap("ArrowRight");
tap("Enter");
check("El nivel 2 está bloqueado y no se puede jugar", G.state === "levels" && G.levelIndex === 1);
tap("KeyA");
tap("Space");
check("Con las teclas de cualquier personaje se elige y se juega el nivel 1", G.state === "playing" && G.levelIndex === 0);
run(10);
tap("Escape");
fire = P("Fireboy");
const before = { x: fire.x, frames: G.levelFrames };
hold(["KeyD"], 30);
check("ESC pausa: nadie se mueve y el reloj se para", G.state === "paused" && fire.x === before.x && G.levelFrames === before.frames);
tap("Escape");
check("ESC otra vez sigue jugando", G.state === "playing");
handlers.blur();
check("Al cambiar de ventana el juego se pausa", G.state === "paused");
tap("ArrowDown"); tap("ArrowDown");
check("En la pausa se baja hasta «Elegir nivel»", G.menuIndex === 2);
tap("Enter");
check("…y vuelve al menú de niveles", G.state === "levels");
tap("Enter");
check("Se puede volver a jugar desde el menú", G.state === "playing" && G.levelIndex === 0);
run(120);
place(P("Fireboy"), 3, 8); place(P("Watergirl"), 3, 12); place(P("AcidBaby"), 29, 4);
run(3);
check("Ganar guarda el nivel como completado", G.state === "won" && saved().levels["Primeros pasos"]?.done === true, JSON.stringify(saved()));
check("…y desbloquea el siguiente", G.isUnlocked(1) && G.lastResult.first);
const firstTime = G.save.levels["Primeros pasos"].bestFrames;
tap("Enter");
check("ENTER pasa al nivel 2", G.state === "playing" && G.levelIndex === 1);
G.setLevel(0);
run(1);
place(P("Fireboy"), 3, 8); place(P("Watergirl"), 3, 12); place(P("AcidBaby"), 29, 4);
run(3);
check("Repetir el nivel más rápido bate el récord", G.lastResult.time && G.save.levels["Primeros pasos"].bestFrames < firstTime, `${firstTime} → ${G.save.levels["Primeros pasos"].bestFrames}`);
tap("Escape");
check("ESC tras ganar vuelve al menú", G.state === "levels");
tap("KeyM");
check("M silencia el juego y se guarda", G.save.muted === true && saved().muted === true);
tap("KeyM");
G.setLevel(LEVELS.length - 1);
run(1);
for (const p of G.players) { const d = G.doors[p.ch.door]; place(p, d.c, d.r); }
run(3);
tap("Enter");
check("Tras el último nivel sale la pantalla final", G.state === "ending");
tap("Enter");
check("…y desde ahí se vuelve a los niveles", G.state === "levels");
let drawError = null;
for (const st of ["title", "levels", "playing", "paused", "dead", "won", "ending"]) {
  G.state = st;
  try { G.render(); } catch (e) { drawError = `${st}: ${e.message}`; }
}
check("Todas las pantallas se dibujan sin errores", !drawError, drawError || "");

// --- Nivel 1 -----------------------------------------------------------------
console.log("\nNivel 1");
level(0);
hold(["KeyD"], 300, () => G.state !== "playing");
check("Fireboy recoge su rubí del suelo", G.gems.find((g) => g.type === "fire" && g.r === 16).taken);
check("…pero no el zafiro de Watergirl", !G.gems.find((g) => g.type === "water" && g.r === 16).taken);
check("Fireboy muere en el agua", G.state === "dead" && G.deathMessage.includes("agua"), `→ "${G.deathMessage}"`);

level(0);
hold(["ArrowRight"], 200, () => G.state !== "playing");
check("Watergirl muere en la lava", G.deathMessage === "Watergirl cayó en la lava", `→ "${G.deathMessage}"`);

function climb(name, fromC, fromR, toR, dir) {
  const p = P(name), k = KEYS[name];
  place(p, fromC, fromR); run(5);
  let ok = false;
  hold([dir > 0 ? k.r : k.l, k.j], 90, () => (ok = p.onGround && feetRow(p) === toR));
  return { ok, where: tile(p) };
}
level(0);
for (const [a, b, c, d, label] of [[28, 16, 14, 1, "Suelo → escalón"], [29, 14, 12, -1, "Escalón → piso 2"], [24, 12, 10, -1, "Piso 2 → escalón"], [22, 10, 8, -1, "Escalón → piso 3"], [17, 8, 6, -1, "Piso 3 → escalón"], [16, 6, 4, 1, "Escalón → piso 4"]]) {
  const res = climb("Fireboy", a, b, c, d);
  check(label, res.ok, res.where);
}
level(0);
place(P("Fireboy"), 3, 8); place(P("Watergirl"), 3, 12); place(P("AcidBaby"), 29, 4);
run(3);
check("Nivel completado con los 3 en su puerta", G.state === "won");

// --- Nivel 2 -----------------------------------------------------------------
console.log("\nNivel 2");
level(1);
hold(["KeyG"], 400, () => acid.x < 2 * 32);
check("AcidBaby cruza el foso de ácido", G.state === "playing" && acid.x < 2 * 32, tile(acid));
check("Recoge la esmeralda del foso", G.gems.find((g) => g.type === "acid" && g.r === 16).taken);
check("La palanca sigue apagada tras empujarla a la izquierda", !M("h").leverOn);
hold(["KeyJ"], 25);
check("Empujada a la derecha, la palanca se activa", M("h").leverOn);
run(60);
check("La compuerta sube 3 casillas", M("h").oy === -96, `oy=${M("h").oy}`);

level(1);
place(fire, 13, 16);
place(water, 28, 15);
run(130);
check("Con el botón pisado, el ascensor sube con Watergirl", feetRow(water) === 8 && water.onGround, tile(water));
hold(["ArrowLeft"], 30);
check("Watergirl baja al estante", feetRow(water) === 8 && water.x < 27 * 32, tile(water));
run(60);
check("Watergirl en el botón de arriba mantiene el ascensor arriba", M("p").oy === -224, "oy=" + M("p").oy);
hold(["KeyA"], 20);
place(water, 20, 8);
run(130);
check("Sin nadie en los botones, el ascensor vuelve abajo", M("p").oy === 0, `oy=${M("p").oy}`);
place(water, 25, 8);
place(acid, 28, 15);
run(130);
check("El botón de arriba sube el ascensor con AcidBaby", feetRow(acid) === 8, tile(acid));

// No aplasta: alguien debajo del ascensor cuando baja
level(1);
place(fire, 13, 16);
run(130);
place(water, 28, 16);
place(fire, 10, 16);
run(150);
check("El ascensor se para encima de quien está debajo", water.alive && feetRow(water) === 16 && M("p").oy < 0, `oy=${M("p").oy}`);

// --- Nivel 3 -----------------------------------------------------------------
console.log("\nNivel 3");
level(2);
const box1 = G.boxes[0];
place(fire, 5, 16);
hold(["KeyD"], 200, () => box1.x >= 11 * 32 - 28);
check("Fireboy empuja la caja hasta la pared", box1.x === 11 * 32 - 28, `x=${box1.x}`);
fire.x = box1.x; fire.y = box1.y - fire.h; fire.vx = fire.vy = 0; run(3);
let onWall = false;
hold(["KeyD", "KeyW"], 60, () => (onWall = fire.onGround && feetRow(fire) === 13));
check("Desde la caja se sube al muro", onWall, tile(fire));
place(water, 8, 16);
let jumpedWall = false;
hold(["ArrowRight", "ArrowUp"], 60, () => (jumpedWall = feetRow(water) <= 13 && water.onGround));
check("Sin caja no se puede subir el muro", !jumpedWall, tile(water));

level(2);
place(water, 17, 16);
hold(["ArrowRight"], 60);
check("Watergirl no disuelve el óxido", G.grid[16][18] === "%");
place(acid, 17, 16);
hold(["KeyJ"], 120);
check("AcidBaby disuelve toda la columna de óxido", [12, 13, 14, 15, 16].every((r) => G.grid[r][18] === " "));

level(2);
const box2 = G.boxes[1];
place(water, 21, 16);
hold(["ArrowRight"], 200, () => box2.x >= 24 * 32 + 2);
place(fire, 21, 16);
place(acid, 28, 15);
run(5);
check("Caja + Fireboy pisan los 2 botones", M("q").active && M("q").pressedCount === 2, `${M("q").pressedCount}/2`);
run(110);
check("El ascensor sube con AcidBaby", feetRow(acid) === 10 && acid.onGround, tile(acid));
place(fire, 19, 16);
run(5);
check("Con un solo botón no basta", !M("q").active);

// --- Ayudas para jugar solo con teclas ----------------------------------------
const center = (p) => p.x + p.w / 2;
const playing = () => G.state === "playing";
// Camina hasta el centro de la columna c y espera a que el personaje se pare.
function walkTo(p, c, max = 600) {
  const k = keysOf(p), target = c * 32 + 16, dir = target > center(p) ? 1 : -1;
  hold([dir > 0 ? k.r : k.l], max, () => (target - center(p)) * dir <= 3 || !playing());
  run(25);
}
// Va a la columna c y salta en el sitio (para coger gemas flotantes).
function jumpAt(p, c) {
  walkTo(p, c);
  hold([keysOf(p).j], 20);
  run(40);
}
// Saltito corto hacia la columna c (para subir a una plataforma estrecha sin pasarse).
function hopTo(p, c) {
  const k = keysOf(p), target = c * 32 + 16, dir = target > center(p) ? 1 : -1, side = dir > 0 ? k.r : k.l;
  down(side); down(k.j); run(6); up(k.j);
  for (let i = 0; i < 40 && (target - center(p)) * dir > 3; i++) run(1);
  up(side);
  run(40);
}
// Sube con el ventilador de la columna c y sale andando hacia dir (1 derecha, -1 izquierda).
function ride(p, c, dir) {
  const k = keysOf(p);
  walkTo(p, c);
  const startRow = feetRow(p);
  run(90);
  hold([dir > 0 ? k.r : k.l], 40, () => p.onGround && feetRow(p) < startRow);
  run(20);
  return feetRow(p);
}

// --- Nivel 4: ventiladores y barreras ----------------------------------------
console.log("\nNivel 4");
level(3);
check("Nivel 4 tiene 2 ventiladores", G.fans.length === 2);
place(water, 25, 16);
run(5);
walkTo(water, 23);
run(90);
const feet = () => water.y + water.h;
check("El ventilador eleva a Watergirl justo por encima del piso de arriba", !water.onGround && feet() <= 11 * 32 && feet() >= 11 * 32 - 24, `pies en y=${feet()}`);
run(200);
check("…y la mantiene flotando", !water.onGround && feet() <= 11 * 32 && feet() >= 11 * 32 - 24, `pies en y=${feet()}`);
place(acid, 19, 10);
run(60);
check("El ventilador de palanca está apagado al empezar", acid.onGround && feetRow(acid) === 10);
hold(["KeyG"], 120);
check("AcidBaby no atraviesa la barrera de fuego", acid.x >= 17 * 32, tile(acid));
place(fire, 18, 10);
hold(["KeyA"], 120);
check("Fireboy sí la atraviesa", fire.x + fire.w < 15 * 32, tile(fire));
place(water, 15, 16);
hold(["ArrowLeft"], 60);
check("Watergirl atraviesa su barrera de agua", water.x + water.w < 12 * 32, tile(water));
place(acid, 15, 16);
hold(["KeyG"], 60);
check("…que bloquea a AcidBaby", acid.x >= 14 * 32, tile(acid));

// Partida completa solo con teclas
level(3);
check("Fireboy sube por el ventilador", ride(fire, 23, -1) === 10, tile(fire));
walkTo(fire, 2);
check("Cruzar la palanca hacia la izquierda no la enciende", !M("v").leverOn);
walkTo(fire, 8);
check("Hacia la derecha sí, y Fireboy tiene su rubí", M("v").leverOn && G.gems.find((g) => g.type === "fire" && g.r === 10).taken);
check("Fireboy sube por el ventilador de la palanca", ride(fire, 19, 1) === 4, tile(fire));
jumpAt(fire, 12);
walkTo(fire, 24);
walkTo(water, 7);
check("Watergirl recoge el zafiro tras su barrera", G.gems.find((g) => g.type === "water" && g.r === 16).taken);
check("Watergirl sube dos pisos", ride(water, 23, -1) === 10 && ride(water, 19, 1) === 4, tile(water));
jumpAt(water, 14);
walkTo(water, 26);
walkTo(acid, 18);
check("AcidBaby sube dos pisos", ride(acid, 23, -1) === 10 && ride(acid, 19, -1) === 4, tile(acid));
walkTo(acid, 4);
check("AcidBaby recoge la esmeralda tras su barrera", G.gems.find((g) => g.type === "acid" && g.r === 4).taken);
walkTo(acid, 28);
run(3);
check("Nivel 4 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length}`);

// --- Nivel 5: hielo, sal y óxido ------------------------------------------------
console.log("\nNivel 5");
level(4);
hold(["KeyJ"], 120);
check("AcidBaby no rompe la sal", G.grid[16][20] === "=");
hold(["ArrowRight"], 120);
check("Watergirl disuelve toda la columna de sal", [12, 13, 14, 15, 16].every((r) => G.grid[r][20] === " "));
check("…sin tocar el óxido del piso de arriba", G.grid[10][20] === "%");
hold(["KeyA"], 120);
check("Fireboy derrite el hielo de abajo", [12, 13, 14, 15, 16].every((r) => G.grid[r][10] === " "));
check("…pero no el de arriba (no está pegado)", G.grid[10][10] === "+");

// Partida completa solo con teclas
level(4);
walkTo(water, 23);
walkTo(fire, 4);
check("Fireboy derrite el hielo, cruza la lava y pisa el botón", M("g").active && G.fans.find((f) => f.mech === M("g")).on);
hold(["KeyA"], 40);
check("…pero no puede entrar en el pozo de la barrera de agua", fire.x >= 3 * 32, tile(fire));
walkTo(fire, 4);
check("Watergirl sube con el ventilador del botón", ride(water, 27, -1) === 10, tile(water));
jumpAt(acid, 12);
check("AcidBaby también", ride(acid, 27, 1) === 10, tile(acid));
walkTo(acid, 29);
walkTo(water, 24);
check("Watergirl coge el amuleto: los tres cambian de personaje", fire.ch.name === "Watergirl" && water.ch.name === "AcidBaby" && acid.ch.name === "Fireboy", G.players.map((p) => p.ch.name).join(", "));
walkTo(acid, 21); // cruza el hueco del ventilador mientras sigue encendido
check("…y Fireboy, convertido en Watergirl, sube por el pozo de agua", ride(fire, 1, 1) === 10, tile(fire));
walkTo(water, 18);
check("Ahora corroe el óxido quien era Watergirl", G.grid[8][20] === " ", tile(water));
walkTo(acid, 11);
hold(["KeyG"], 120, () => G.grid[8][10] === " ");
check("…y derrite el hielo de arriba quien era AcidBaby", G.grid[8][10] === " ", tile(acid));
walkTo(acid, 3);
walkTo(fire, 18);
check("Los tres suben al último piso", [fire, water, acid].every((p, i) => ride(p, 15, i === 0 ? -1 : 1) === 4), G.players.map(tile).join(" | "));
jumpAt(acid, 5); jumpAt(fire, 8); jumpAt(water, 11);
// Cada uno va a la puerta de su personaje nuevo
walkTo(acid, 24); walkTo(fire, 26); walkTo(water, 28);
run(3);
check("Nivel 5 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length} ${G.players.map(tile).join(" | ")}`);

// --- Nivel 6: puentes frágiles ------------------------------------------------
console.log("\nNivel 6");
level(5);
place(fire, 5, 15);
hold(["KeyD"], 60);
run(60);
check("Fireboy derrite el puente de hielo y cae al agua", G.state === "dead" && G.grid[16][8] === " ", `→ "${G.deathMessage}"`);
level(5);
place(water, 15, 15);
hold(["ArrowRight"], 90);
run(60);
check("Watergirl disuelve el puente de sal y cae al ácido", G.state === "dead", `→ "${G.deathMessage}"`);

// Partida completa solo con teclas
level(5);
walkTo(acid, 22);
check("AcidBaby cruza los puentes de hielo y sal", feetRow(acid) === 15 && G.grid[16][8] === "+" && G.grid[16][18] === "=", tile(acid));
walkTo(water, 13);
check("Watergirl cruza el hielo y pisa el botón", M("g").active, tile(water));
check("Fireboy sube por el ventilador por encima del hielo", ride(fire, 4, 1) === 9, tile(fire));
walkTo(fire, 12);
run(40);
walkTo(fire, 23);
check("Fireboy cruza la sal y pisa el siguiente botón", M("h").active, tile(fire));
check("Watergirl sube por encima de la sal", ride(water, 14, 1) === 9, tile(water));
walkTo(water, 22);
run(40);
walkTo(water, 32);
check("Watergirl cruza el óxido y pisa el último botón", M("i").active, tile(water));
walkTo(fire, 33);
check("AcidBaby sube por encima del óxido", ride(acid, 24, 1) === 9, tile(acid));
walkTo(acid, 35);
run(40);
walkTo(water, 34);
run(3);
check("Nivel 6 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length}`);

// --- Nivel 7: la sala de máquinas ------------------------------------------------
console.log("\nNivel 7");
level(6);
hold(["KeyA"], 400, () => M("g").active);
run(30);
check("Fireboy empuja la caja hasta el botón tras su barrera", M("g").active && G.boxes[0].x < 2 * 32, `caja x=${G.boxes[0].x}`);
walkTo(fire, 9);
check("La caja se queda pisando el botón cuando Fireboy se va", M("g").active);
walkTo(acid, 29);
check("AcidBaby coge la esmeralda tras su barrera", G.gems.find((g) => g.type === "acid" && g.r === 16).taken);
check("Los tres suben por el ventilador de la caja", ride(fire, 20, -1) === 10 && ride(acid, 20, -1) === 10 && ride(water, 20, 1) === 10, G.players.map(tile).join(" | "));
const onLift = () => water.onGround && feetRow(water) === 9;
walkTo(water, 26);
hopTo(water, 27);
walkTo(water, 29); // al bajar del ascensor coge el zafiro
hopTo(water, 28);
run(20);
check("Watergirl sube al ascensor tras su barrera", feetRow(water) === 9 && water.onGround, tile(water));
jumpAt(fire, 7);
walkTo(fire, 4);
walkTo(acid, 10);
run(160);
check("Con los dos botones pisados el ascensor la sube arriba", feetRow(water) === 4, tile(water));
jumpAt(water, 25);
walkTo(water, 20);
walkTo(water, 29);
check("Watergirl enciende la palanca de camino a su puerta", M("v").leverOn && water.inDoor);
check("Fireboy y AcidBaby suben por él", ride(fire, 15, -1) === 4 && ride(acid, 15, -1) === 4, G.players.map(tile).join(" | "));
jumpAt(acid, 14);
walkTo(acid, 9);
check("AcidBaby corroe el muro de óxido", G.grid[2][12] === " ", tile(acid));
walkTo(fire, 3);
walkTo(acid, 5);
run(3);
check("Nivel 7 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length} ${G.players.map(tile).join(" | ")}`);

// --- Nivel 8: el corazón del templo ---------------------------------------------
console.log("\nNivel 8");
level(7);
walkTo(fire, 22);
check("Fireboy derrite el muro de hielo", G.grid[14][20] === " ", tile(fire));
jumpAt(acid, 12);
walkTo(water, 23);
check("Los tres suben por el ventilador", ride(fire, 26, -1) === 10 && ride(water, 26, -1) === 10 && ride(acid, 26, -1) === 10, G.players.map(tile).join(" | "));
const onFerry = (p) => p.onGround && feetRow(p) === 9;
walkTo(water, 21); hopTo(water, 19);
walkTo(acid, 21); hopTo(acid, 20);
walkTo(fire, 21); hopTo(fire, 19);
check("Los tres suben a la balsa", [fire, water, acid].every(onFerry), G.players.map(tile).join(" | "));
walkTo(fire, 7);
check("Fireboy cruza la lava y pisa el botón de la balsa", M("p").active && G.gems.find((g) => g.type === "fire" && g.r === 10).taken, tile(fire));
run(160);
check("La balsa lleva a Watergirl y AcidBaby sobre la lava", M("p").ox === -8 * 32 && onFerry(water) && onFerry(acid) && G.gems.find((g) => g.type === "water" && g.r === 9).taken, G.players.map(tile).join(" | "));
walkTo(water, 9);
walkTo(acid, 1);
check("AcidBaby cruza su barrera sin encender la palanca", acid.x < 3 * 32 && !M("v").leverOn, tile(acid));
walkTo(acid, 7);
check("…y la enciende al volver", M("v").leverOn);
check("Los tres suben al último piso", ride(acid, 8, 1) === 4 && ride(fire, 8, 1) === 4 && ride(water, 8, 1) === 4, G.players.map(tile).join(" | "));
jumpAt(acid, 5);
walkTo(acid, 17);
check("AcidBaby corroe el óxido", G.grid[2][12] === " ", tile(acid));
walkTo(water, 26);
check("Watergirl disuelve la sal", G.grid[2][19] === " ", tile(water));
jumpAt(water, 22);
walkTo(water, 26);
walkTo(acid, 28);
walkTo(fire, 24);
run(3);
check("Nivel 8 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length} ${G.players.map(tile).join(" | ")}`);

// --- Nivel 9: portales, llaves y cerraduras ------------------------------------
console.log("\nNivel 9");
level(8);
place(water, 9, 16);
hold(["ArrowRight"], 30, () => water.x > 13 * 32);
run(40);
check("El portal lleva a Watergirl al otro lado del muro", water.x > 14 * 32 && water.x < 17 * 32 && feetRow(water) === 16, tile(water));
hold(["ArrowRight", "ArrowUp"], 12);
run(30);
check("…y no la devuelve en cuanto sale", water.x > 14 * 32, tile(water));
place(acid, 10, 10);
run(5);
walkTo(acid, 3);
run(60);
check("El portal turquesa del suelo la deja caer junto a la llave", feetRow(acid) === 16 && acid.x > 21 * 32, tile(acid));
place(fire, 19, 4);
hold(["KeyD"], 60);
check("Sin llave la cerradura no se abre", G.grid[2][20] === "|" && fire.x + fire.w <= 20 * 32, tile(fire));
fire.inv.keys = 1;
hold(["KeyD"], 120);
check("Con llave se abre entera y la llave se gasta", [1, 2, 3, 4].every((r) => G.grid[r][20] === " ") && fire.inv.keys === 0, `llaves: ${fire.inv.keys}`);

// Partida completa solo con teclas
level(8);
jumpAt(fire, 5);
hold(["KeyD"], 300, () => G.boxes[0].x > 13 * 32);
run(40);
check("La caja cruza el portal y cae al otro lado", G.boxes[0].x > 14 * 32 && G.boxes[0].x < 17 * 32, `caja x=${G.boxes[0].x}`);
walkTo(fire, 11);
run(40);
walkTo(fire, 14);
hold(["KeyD"], 300, () => M("g").active);
run(20);
check("Fireboy pasa por el portal y empuja la caja hasta el botón", M("g").active, tile(fire));
walkTo(water, 11);
run(40);
jumpAt(water, 18);
walkTo(acid, 11);
run(40);
check("Los tres suben por el ventilador de la caja", ride(fire, 17, -1) === 10 && ride(water, 17, -1) === 10 && ride(acid, 17, -1) === 10, G.players.map(tile).join(" | "));
jumpAt(acid, 7);
walkTo(acid, 3);
run(60);
walkTo(acid, 23);
walkTo(acid, 28);
check("AcidBaby baja, coge el amuleto de camino a la llave y los tres cambian", acid.inv.keys === 1 && acid.ch.name === "Fireboy" && fire.ch.name === "Watergirl" && water.ch.name === "AcidBaby", G.players.map((p) => p.ch.name).join(", "));
check("Ya como Fireboy, derrite el tapón de hielo del ventilador y sube", ride(acid, 29, -1) === 10 && G.grid[11][29] === " ", tile(acid));
jumpAt(acid, 23);
check("Los tres suben al último piso", ride(acid, 10, 1) === 4 && ride(fire, 10, 1) === 4 && ride(water, 10, 1) === 4, G.players.map(tile).join(" | "));
jumpAt(fire, 14);
walkTo(acid, 21);
check("Quien tiene la llave abre la cerradura", G.grid[2][20] === " " && acid.inv.keys === 0, tile(acid));
walkTo(fire, 26);
check("…y la sal la disuelve quien era Fireboy (ahora Watergirl)", G.grid[2][22] === " ", tile(fire));
walkTo(acid, 24);
walkTo(water, 28);
run(3);
check("Nivel 9 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length} ${G.players.map(tile).join(" | ")}`);
{
  // Si baja a por la llave quien no debe, el amuleto lo convierte en otro y no puede derretir el tapón.
  level(8);
  place(water, 22, 16);
  run(10);
  walkTo(water, 28);
  hold(["ArrowRight"], 120);
  check("Si baja Watergirl, el amuleto la convierte en AcidBaby y el tapón de hielo no se derrite", water.ch.name === "AcidBaby" && G.grid[11][29] === "+", tile(water));
}

// --- Nivel 10: bichos, armas, vidas e inventario ---------------------------------
console.log("\nNivel 10");
const alive = () => G.enemies.filter((e) => e.alive);
const tapKey = (code) => { down(code); run(1); up(code); };
level(9);
walkTo(fire, 10);
check("Fireboy coge un solo orbe y deja los otros", fire.inv.weapon && G.items.filter((i) => i.type === "weapon" && !i.taken).length === 2);
const beetle = G.enemies.find((e) => e.type === "beetle" && e.y > 11 * 32);
const startX = beetle.x;
run(120);
check("El escarabajo se mueve y da la vuelta contra la sal", beetle.alive && beetle.x !== startX && beetle.x > 18 * 32, `x=${beetle.x}`);
place(acid, 25, 16);
acid.hurt = 0;
run(1);
beetle.x = acid.x + 10; beetle.y = acid.y + acid.h - beetle.h;
run(2);
check("Tocar un bicho quita una vida y da invencibilidad", acid.hearts === 2 && acid.hurt > 0, `vidas ${acid.hearts}`);
beetle.x = acid.x; beetle.y = acid.y + acid.h - beetle.h;
run(2);
check("…durante la cual no se pierden más", acid.hearts === 2);
acid.hurt = 0; beetle.x = acid.x; run(2);
acid.hurt = 0; beetle.x = acid.x; run(2);
check("Sin vidas, el personaje muere", G.state === "dead" && G.deathMessage === "AcidBaby fue derrotado por un escarabajo", `→ "${G.deathMessage}"`);

level(9);
const b2 = G.enemies.find((e) => e.type === "beetle" && e.y > 11 * 32);
water.x = b2.x; water.y = b2.y - water.h - 20; water.vy = 3;
run(10);
check("Saltar encima de un escarabajo lo aplasta y rebota", !b2.alive && water.hearts === 3);
place(acid, 23, 16);
acid.hearts = 2;
walkTo(acid, 24);
check("El corazón devuelve una vida", acid.hearts === 3 && G.items.find((i) => i.type === "heart").taken);

// Partida completa solo con teclas
level(9);
walkTo(fire, 10);
walkTo(water, 11);
walkTo(acid, 9);
check("Cada uno coge su orbe", G.players.every((p) => p.inv.weapon), G.players.map((p) => p.inv.weapon).join());
tapKey("ArrowDown");
run(60);
check("El chorro de Watergirl disuelve la jaula de sal a distancia", G.grid[16][16] === " " && G.grid[14][17] === " ");
// Fireboy espera a tener el escarabajo a tiro (delante y a menos de ~10 casillas).
const lowBeetle = G.enemies.find((e) => e.type === "beetle" && e.y > 11 * 32);
for (let i = 0; i < 40 && lowBeetle.alive; i++) {
  if (lowBeetle.x - fire.x < 320) tapKey("KeyS");
  run(30);
}
check("La bola de fuego de Fireboy mata al escarabajo", alive().filter((e) => e.y > 11 * 32).length === 0, `vivos: ${alive().length}`);
walkTo(fire, 17);
check("Fireboy cruza la lava y guarda la llave", fire.inv.keys === 1);
walkTo(fire, 27);
walkTo(fire, 3);
jumpAt(water, 5);
jumpAt(acid, 9);
check("Los tres suben por el ventilador", ride(fire, 1, 1) === 10 && ride(water, 1, 1) === 10 && ride(acid, 1, 1) === 10, G.players.map(tile).join(" | "));
// Dispara cuando el bicho está delante y a tiro; si no, espera.
function shootUntilClear(p, inZone) {
  for (let i = 0; i < 60; i++) {
    const targets = alive().filter(inZone).filter((e) => Math.abs(e.y + e.h - (p.y + p.h)) < 24);
    if (!alive().filter(inZone).length) return;
    const near = targets.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (near && Math.abs(near.x - p.x) < 480) {
      // Se gira hacia el bicho más cercano (un toque de flecha) y dispara.
      const dir = Math.sign(near.x - p.x) || p.facing;
      if (dir !== p.facing) tapKey(dir > 0 ? keysOf(p).r : keysOf(p).l);
      tapKey(keysOf(p).fire);
    }
    run(20);
  }
}
KEYS.Fireboy.fire = "KeyS"; KEYS.Watergirl.fire = "ArrowDown"; KEYS.AcidBaby.fire = "KeyH";
shootUntilClear(fire, (e) => e.x < 22 * 32);
check("Fireboy limpia la sala a disparos", !alive().some((e) => e.x < 22 * 32), `vivos: ${alive().map((e) => e.type)}`);
jumpAt(fire, 6);
jumpAt(acid, 14);
jumpAt(water, 18);
walkTo(fire, 22);
check("Fireboy abre la cerradura con su llave", G.grid[5][22] === " " && fire.inv.keys === 0, tile(fire));
shootUntilClear(fire, () => true);
check("…y acaba con el murciélago de las puertas", alive().length === 0, `vivos: ${alive().length}`);
walkTo(fire, 25);
walkTo(water, 27);
walkTo(acid, 29);
run(3);
check("Nivel 10 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length}, vidas ${G.players.map((p) => p.hearts)} ${G.players.map(tile).join(" | ")}`);

// --- Nivel 11: contrapeso ---------------------------------------------------------
console.log("\nNivel 11");
level(10);
jumpAt(fire, 9);
jumpAt(water, 14);
check("AcidBaby sube y corroe el tapón de óxido del ventilador", ride(acid, 7, 1) === 10 && G.grid[11][7] === " ", tile(acid));
jumpAt(acid, 12);
walkTo(acid, 22);
run(40);
check("AcidBaby cruza su barrera y cae al otro lado de la compuerta", feetRow(acid) === 16 && acid.x > 20 * 32, tile(acid));
walkTo(acid, 19);
check("…y pisa el botón de allí: con uno solo no basta", M("d").pressedCount === 1 && !M("d").active);
check("Fireboy sube", ride(fire, 7, -1) === 10, tile(fire));
hold(["KeyA"], 300, () => G.boxes[0].y > 12 * 32);
run(60);
check("La caja entra por el portal y cae sobre el botón de este lado", M("d").active && M("d").pressedCount === 2, `caja ${G.boxes[0].x},${G.boxes[0].y}`);
jumpAt(fire, 2);
hold(["KeyA"], 60, () => fire.y > 11 * 32);
run(60);
check("Fireboy vuelve por el mismo portal y cae encima de la caja", fire.onGround && fire.y + fire.h <= G.boxes[0].y + 1 && fire.x > 11 * 32 && fire.x < 13 * 32, tile(fire));
run(60);
walkTo(water, 29);
check("Watergirl pasa la compuerta y disuelve la sal de las puertas", G.grid[14][24] === " " && water.x > 25 * 32, tile(water));
jumpAt(water, 28);
walkTo(fire, 26);
walkTo(acid, 30);
run(3);
check("Nivel 11 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length} ${G.players.map(tile).join(" | ")}`);

// --- Nivel 12: línea de tiro -------------------------------------------------------
console.log("\nNivel 12");
level(11);
jumpAt(acid, 5);
hold(["KeyJ"], 80, () => G.grid[14][6] === " ");
run(20);
check("AcidBaby corroe el muro y se queda sin tocar los orbes", G.grid[14][6] === " " && !acid.inv.weapon, tile(acid));
walkTo(fire, 9);
walkTo(water, 9);
check("Fireboy y Watergirl se llevan los dos orbes", fire.inv.weapon && water.inv.weapon && !acid.inv.weapon);
hold(["KeyD", "KeyW"], 40, () => fire.onGround && feetRow(fire) === 14);
run(10);
hopTo(fire, 11);
check("Fireboy sube al saliente", fire.onGround && feetRow(fire) === 13, tile(fire));
jumpAt(fire, 12);
tapKey("KeyS");
run(90);
check("Su bola de fuego derrite el hielo y la caja cae en el botón encerrado", G.grid[13][20] === " " && M("g").active, `caja ${G.boxes[0].x},${G.boxes[0].y}`);
jumpAt(water, 16);
walkTo(water, 10); // fuera del charco: al cambiar será AcidBaby y el agua la mataría
check("Fireboy sube el primero y coge el amuleto al llegar: los tres cambian", ride(fire, 1, 1) === 10 && fire.ch.name === "Watergirl" && water.ch.name === "AcidBaby" && acid.ch.name === "Fireboy", G.players.map((p) => p.ch.name).join(", "));
check("Los otros dos suben detrás", ride(water, 1, 1) === 10 && ride(acid, 1, 1) === 10, G.players.map(tile).join(" | "));
jumpAt(fire, 3);
jumpAt(water, 2);
walkTo(fire, 5);
tapKey("KeyS");
run(80);
check("Quien era Fireboy, ahora Watergirl, dispara agua con su orbe y disuelve la sal", G.grid[8][13] === " ");
check("Quien era AcidBaby, ahora Fireboy, cruza la lava sin orbe, enciende la palanca y sube", ride(acid, 22, -1) === 4 && M("v").leverOn, tile(acid));
check("Los otros dos suben con el ventilador de la palanca", ride(fire, 4, 1) === 4 && ride(water, 4, 1) === 4, G.players.map(tile).join(" | "));
jumpAt(fire, 8);
jumpAt(water, 10);
jumpAt(acid, 25);
walkTo(water, 17);
hold([keysOf(water).r], 80, () => G.grid[2][18] === " ");
check("El óxido de arriba lo corroe quien era Watergirl", G.grid[2][18] === " ");
walkTo(acid, 12);
walkTo(fire, 14);
walkTo(water, 16);
run(3);
check("Nivel 12 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length} ${G.players.map(tile).join(" | ")}`);
level(11);
place(water, 16, 16);
place(fire, 3, 10);
run(5);
walkTo(fire, 2);
check("Si alguien sigue en el charco de agua cuando se coge el amuleto, muere", G.state === "dead", `→ "${G.deathMessage}"`);

// --- Nivel 13: llaves cruzadas ------------------------------------------------------
console.log("\nNivel 13");
level(12);
hold(["ArrowRight"], 120, () => G.grid[14][6] === " ");
run(20);
check("Watergirl disuelve la sal sin llegar a la llave", G.grid[14][6] === " " && water.inv.keys === 0, tile(water));
walkTo(acid, 9);
check("AcidBaby se queda la primera llave", acid.inv.keys === 1 && fire.inv.keys === 0 && water.inv.keys === 0);
jumpAt(fire, 13);
check("AcidBaby sube", ride(acid, 10, 1) === 10, tile(acid));
jumpAt(acid, 14);
hold(["KeyJ"], 200, () => G.boxes[0].y > 11 * 32);
run(60);
check("…abre su cerradura y manda la caja por el portal al botón colgado", G.grid[8][15] === " " && acid.inv.keys === 0 && M("g").active, `caja ${G.boxes[0].x},${G.boxes[0].y}`);
run(60);
walkTo(water, 26);
check("Watergirl pasa la compuerta y se queda la segunda llave", water.inv.keys === 1, tile(water));
jumpAt(water, 28);
check("Watergirl sube", ride(water, 10, -1) === 10, tile(water));
walkTo(water, 1);
check("…abre la cerradura de su zona sin encender la palanca al pasar", G.grid[8][4] === " " && water.inv.keys === 0 && !M("v").leverOn, tile(water));
walkTo(water, 5);
check("…y la enciende al volver", M("v").leverOn);
check("Fireboy sube y derrite el tapón de hielo", ride(fire, 10, -1) === 10 && ride(fire, 8, 1) === 4 && G.grid[5][8] === " ", tile(fire));
check("Watergirl y AcidBaby suben detrás", ride(water, 8, 1) === 4 && ride(acid, 8, 1) === 4, G.players.map(tile).join(" | "));
jumpAt(water, 12);
jumpAt(fire, 15);
jumpAt(acid, 17);
walkTo(fire, 20);
walkTo(water, 22);
walkTo(acid, 24);
run(3);
check("Nivel 13 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length} ${G.players.map(tile).join(" | ")}`);
level(12);
hold(["ArrowRight"], 120, () => G.grid[14][6] === " ");
walkTo(water, 9);
check("Si Watergirl coge la primera llave, AcidBaby ya no puede abrir su cerradura", water.inv.keys === 1 && G.items.filter((i) => i.type === "key" && !i.taken).length === 1);

// --- Nivel 14: tres a la vez ---------------------------------------------------------
console.log("\nNivel 14");
level(13);
const gateOpen = () => M("g").active;
jumpAt(water, 8);
walkTo(water, 13);
check("Fireboy sube", ride(fire, 6, 1) === 10, tile(fire));
hold(["KeyD"], 200, () => G.boxes[0].y > 12 * 32);
run(40);
check("…y tira la caja por el agujero de su zona", G.boxes[0].y > 15 * 32, `caja ${G.boxes[0].x},${G.boxes[0].y}`);
hopTo(fire, 14); // salta el agujero para coger su rubí
jumpAt(fire, 15);
walkTo(fire, 11); // y baja por el agujero, encima de la caja
run(40);
walkTo(fire, 13);
hold(["KeyA"], 60, () => G.boxes[0].x <= 10 * 32 + 3);
run(20);
walkTo(water, 13);
walkTo(acid, 15);
check("Caja, Watergirl y AcidBaby pisan los tres botones de este lado", gateOpen() && M("g").pressedCount === 3, `${M("g").pressedCount}/3 ${G.players.map(tile).join(" | ")} caja ${G.boxes[0].x}`);
run(100);
walkTo(fire, 21);
check("Fireboy pasa y pisa un botón del otro lado", gateOpen() && M("g").pressedCount === 4, tile(fire));
jumpAt(fire, 27);
walkTo(fire, 21);
walkTo(acid, 24);
check("AcidBaby se baja sin que se cierre y pasa al otro botón", gateOpen() && acid.x > 23 * 32, tile(acid));
walkTo(water, 28);
check("Watergirl pasa la última", water.x > 19 * 32 && G.state === "playing", tile(water));
walkTo(fire, 26);
walkTo(acid, 30);
run(3);
check("Nivel 14 completado", G.state === "won", `en puerta: ${G.players.map((p) => p.inDoor)} ${G.players.map(tile).join(" | ")}`);
// Las dos gemas de arriba: se sube y se baja por el agujero de la izquierda
level(13);
ride(water, 6, -1); jumpAt(water, 4); walkTo(water, 3); run(60); walkTo(water, 11);
ride(acid, 6, -1); jumpAt(acid, 6); walkTo(acid, 3); run(60); walkTo(acid, 11);
check("Se puede subir a por las gemas y volver a bajar por el agujero", feetRow(water) === 16 && feetRow(acid) === 16 && G.gems.filter((g) => g.taken).length === 2, G.players.map(tile).join(" | "));
level(13);
walkTo(fire, 10); walkTo(water, 13); walkTo(acid, 15);
check("Sin la caja, con los tres en los botones no queda nadie para pasar", gateOpen() && G.players.every((p) => p.x < 16 * 32));

// --- Nivel 15: el último guardián ------------------------------------------------------
console.log("\nNivel 15");
level(14);
walkTo(fire, 6);
walkTo(water, 7);
walkTo(acid, 8);
check("Cada uno coge su orbe", G.players.every((p) => p.inv.weapon));
shootUntilClear(fire, (e) => e.type === "beetle");
check("Fireboy elimina al escarabajo de abajo", !alive().some((e) => e.type === "beetle"));
jumpAt(acid, 4);
walkTo(fire, 17);
for (let i = 0; i < 20 && G.grid[16][20] !== " "; i++) { tapKey("KeyS"); run(30); }
run(60);
check("Fireboy derrite la jaula de hielo desde la orilla", G.grid[16][22] === " " && G.grid[14][21] === " ");
walkTo(water, 21);
check("Watergirl entra en el agua y se queda la llave", water.inv.keys === 1, tile(water));
jumpAt(water, 26);
walkTo(water, 15);
check("Los tres suben", ride(fire, 10, -1) === 10 && ride(water, 10, -1) === 10 && ride(acid, 10, -1) === 10, G.players.map(tile).join(" | "));
jumpAt(water, 11);
hold(["ArrowRight"], 120, () => G.grid[8][12] === " ");
check("Watergirl abre la cerradura", G.grid[8][12] === " " && water.inv.keys === 0, tile(water));
walkTo(water, 8); // retrocede y se gira hacia el murciélago
hold(["ArrowRight"], 2);
shootUntilClear(water, (e) => e.y < 11 * 32 && e.y > 5 * 32);
check("…y se libra del murciélago", !alive().some((e) => e.y < 11 * 32 && e.y > 5 * 32), `vivos: ${alive().length}`);
walkTo(water, 17);
tapKey("ArrowDown");
run(80);
check("Watergirl disuelve la sal al otro lado de la lava", G.grid[8][25] === " ");
jumpAt(fire, 27);
walkTo(fire, 28);
check("Fireboy cruza y pisa el botón del ventilador", M("g").active, tile(fire));
check("Watergirl y AcidBaby suben", ride(water, 14, 1) === 4 && ride(acid, 14, 1) === 4, G.players.map(tile).join(" | "));
shootUntilClear(acid, (e) => e.y < 5 * 32);
check("AcidBaby acaba con el último guardián", alive().length === 0, `vivos: ${alive().length}`);
check("Fireboy sube por su ventilador", ride(fire, 29, -1) === 4, tile(fire));
walkTo(acid, 24);
tapKey("KeyH");
run(80);
check("El ácido de AcidBaby corroe el óxido al otro lado de la lava", G.grid[2][27] === " ");
jumpAt(water, 15);
jumpAt(acid, 16);
walkTo(fire, 17);
jumpAt(fire, 17);
walkTo(fire, 20);
walkTo(water, 22);
walkTo(acid, 24);
run(3);
check("Nivel 15 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length}, vidas ${G.players.map((p) => p.hearts)} ${G.players.map(tile).join(" | ")}`);

// --- Nivel 16: saltos y muelles -------------------------------------------------------------
console.log("\nNivel 16");
// Salta hacia dir manteniendo la tecla de salto (salto completo).
function leap(p, dir, frames = 26) {
  const k = keysOf(p);
  const side = dir > 0 ? k.r : k.l;
  down(side); down(k.j); run(frames); up(k.j);
  for (let i = 0; i < 60 && !p.onGround; i++) run(1); // mantiene la dirección hasta aterrizar
  up(side);
  run(10);
}
// Salta y, cerca de lo más alto, vuelve a saltar en el aire (botas) hasta que until() se cumpla.
function doubleJump(p, dir, until) {
  const k = keysOf(p);
  const side = dir > 0 ? k.r : k.l;
  down(side); down(k.j); run(14); up(k.j); run(1); down(k.j);
  for (let i = 0; i < 60 && !until(); i++) run(1);
  up(k.j); up(side);
  run(10);
}
level(15);
place(water, 14, 16);
hold(["ArrowRight", "ArrowUp"], 40);
check("Sin botas no se sube el muro de 4 casillas", water.x + water.w <= 15 * 32, tile(water));
level(15);
for (const p of [fire, water, acid]) { walkTo(p, 6); leap(p, 1); }
check("Los tres saltan los pinchos sin pincharse", G.players.every((p) => p.hearts === 3 && p.x > 8 * 32), G.players.map((p) => tile(p) + " ♥" + p.hearts).join(" | "));
for (const p of [fire, water, acid]) walkTo(p, 12);
check("Cada uno coge unas botas", G.players.every((p) => p.inv.boots));
for (const p of [fire, water, acid]) {
  walkTo(p, 14);
  doubleJump(p, 1, () => p.onGround && feetRow(p) === 12);
  walkTo(p, 17);
}
check("Con el doble salto suben el muro", G.players.every((p) => p.x > 15 * 32 && feetRow(p) === 16), G.players.map(tile).join(" | "));
for (const p of [fire, water, acid]) {
  hold([keysOf(p).r], 120, () => p.onGround && feetRow(p) === 11);
  run(10);
}
check("El primer muelle los lanza a la repisa", G.players.every((p) => feetRow(p) === 11 && p.x >= 20 * 32), G.players.map(tile).join(" | "));
for (const p of [fire, water, acid]) {
  hold([keysOf(p).r], 120, () => p.onGround && feetRow(p) === 6);
  run(10);
}
check("El segundo muelle los sube a la repisa alta", G.players.every((p) => feetRow(p) === 6 && p.x >= 27 * 32), G.players.map(tile).join(" | "));
// El puente de tablones se cruza de uno en uno: tras cada uno hay que esperar a que vuelvan.
for (const p of [fire, water, acid]) {
  walkTo(p, 27);
  leap(p, -1);
  walkTo(p, 10);
  check(`${p.ch.name} salta el hueco y cruza el puente frágil`, feetRow(p) === 6 && p.x < 12 * 32, tile(p));
  run(300);
}
walkTo(fire, 3);
walkTo(water, 5);
walkTo(acid, 7);
run(3);
check("Nivel 16 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length} ${G.players.map(tile).join(" | ")}`);

// --- Nivel 17: fuego cruzado ------------------------------------------------------------------
console.log("\nNivel 17");
const turretAt = (c, r) => G.enemies.find((e) => e.type === "turret" && Math.floor((e.x + e.w / 2) / 32) === c && Math.floor((e.y + e.h - 1) / 32) === r);
level(16);
walkTo(fire, 5); walkTo(water, 6); walkTo(acid, 7);
check("Cada uno se lleva un escudo (quien ya tiene uno deja los demás)", G.players.every((p) => p.inv.shield === 1));
jumpAt(fire, 8);
const lowTurret = turretAt(26, 16);
// Las cajas van en orden de lectura (de arriba abajo): se buscan por piso.
const boxIn = (r0, r1) => G.boxes.find((b) => b.y >= r0 * 32 && b.y < r1 * 32);
const lowBox = boxIn(12, 17), midBox = boxIn(6, 11), topBox = boxIn(1, 5);
hold(["KeyD"], 600, () => lowBox.x >= 25 * 32 - 30);
check("Fireboy empuja la caja hasta la torreta sin que le den", lowBox.x >= 25 * 32 - 30 && fire.hearts === 3 && fire.inv.shield === 1, `caja x=${lowBox.x}, vidas ${fire.hearts}`);
hopTo(fire, Math.floor((lowBox.x + 14) / 32));
hold(["KeyD"], 40, () => !lowTurret.alive); // baja de la caja directamente encima de la torreta
check("…y desde la caja salta encima de la torreta y la destruye", !lowTurret.alive, tile(fire));
check("Los tres suben por el ventilador", ride(fire, 29, -1) === 10 && ride(water, 29, -1) === 10 && ride(acid, 29, -1) === 10, G.players.map(tile).join(" | "));
jumpAt(acid, 20);
hold(["KeyA"], 900, () => M("g").active);
run(10);
check("Fireboy lleva la caja hasta el botón protegido por ella", M("g").active && fire.hearts === 3, `caja x=${midBox.x}, vidas ${fire.hearts}`);
jumpAt(water, 12);
for (const p of [fire, water, acid]) ride(p, 7, 1);
check("La caja del botón también los tapa mientras suben por el ventilador", G.players.every((p) => feetRow(p) === 4 && p.hearts === 3), G.players.map((p) => tile(p) + " ♥" + p.hearts + " escudo " + p.inv.shield).join(" | "));
jumpAt(fire, 12);
jumpAt(water, 14);
jumpAt(acid, 16);
hold(["KeyD"], 900, () => topBox.x >= 25 * 32);
check("Fireboy deja la caja entre la torreta y las puertas", topBox.x >= 25 * 32, `caja x=${topBox.x}`);
walkTo(fire, 19);
walkTo(water, 21);
walkTo(acid, 23);
run(200);
check("Las puertas quedan a cubierto: nadie pierde vida esperando", G.state === "won" || G.players.every((p) => p.inDoor));
check("Nivel 17 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length}, vidas ${G.players.map((p) => p.hearts)} ${G.players.map(tile).join(" | ")}`);

// --- Nivel 18: casa encantada -----------------------------------------------------------------
console.log("\nNivel 18");
const ghostsIn = (r0, r1) => (e) => (e.type === "ghost" || e.type === "hedgehog") && e.y >= r0 * 32 && e.y < r1 * 32;
level(17);
walkTo(fire, 6); walkTo(water, 7); walkTo(acid, 8);
check("Cada uno coge su orbe", G.players.every((p) => p.inv.weapon));
jumpAt(water, 5);
walkTo(fire, 10);
check("Fireboy se queda la única bomba", fire.inv.bombs === 1);
// Nada más llegar, cada uno dispara a los fantasmas que se le echan encima.
for (const p of [fire, water, acid]) { ride(p, 12, 1); shootUntilClear(p, ghostsIn(5, 11)); }
check("Los tres suben", G.players.every((p) => feetRow(p) === 10), G.players.map(tile).join(" | "));
check("Acaban con los fantasmas que vienen atravesando las paredes", !alive().some(ghostsIn(5, 11)) && G.state === "playing", `vivos: ${alive().filter(ghostsIn(5, 11)).length}, vidas ${G.players.map((p) => p.hearts)}`);
hold(["KeyD"], 200, () => G.grid[8][22] === " ");
run(60);
check("La bomba de Fireboy abre el muro agrietado de la llave", G.grid[8][22] === " " && fire.inv.bombs === 0);
walkTo(fire, 26);
jumpAt(acid, 28);
check("Fireboy coge la llave", fire.inv.keys === 1 && G.state === "playing", `vidas ${G.players.map((p) => p.hearts)}`);
jumpAt(fire, 15);
hold(["KeyA"], 400, () => G.grid[8][5] === " ");
check("…y abre la cerradura del ventilador", G.grid[8][5] === " " && fire.inv.keys === 0, tile(fire));
for (const p of [fire, water, acid]) { ride(p, 2, 1); shootUntilClear(p, ghostsIn(0, 5)); }
check("Los tres suben al último piso", G.players.every((p) => feetRow(p) === 4), G.players.map(tile).join(" | "));
check("Acaban con el erizo (no se le puede pisar) y el fantasma de arriba", !alive().some(ghostsIn(0, 5)) && G.state === "playing", `vivos: ${alive().filter(ghostsIn(0, 5)).map((e) => e.type)}, vidas ${G.players.map((p) => p.hearts)}`);
jumpAt(water, 9);
jumpAt(acid, 18);
jumpAt(fire, 21);
walkTo(fire, 24);
walkTo(water, 26);
walkTo(acid, 28);
run(3);
check("Nivel 18 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length}, vidas ${G.players.map((p) => p.hearts)} ${G.players.map(tile).join(" | ")}`);
level(17);
walkTo(fire, 10);
place(fire, 15, 16);
hold(["KeyD"], 120, () => G.grid[14][16] === " ");
run(60);
check("Si se gasta la bomba en el muro de abajo, ya no queda para el de la llave", G.grid[14][16] === " " && fire.inv.bombs === 0 && !G.items.some((i) => i.type === "bomb" && !i.taken));

// --- Nivel 19: demolición ---------------------------------------------------------------------
console.log("\nNivel 19");
level(18);
walkTo(fire, 7);
check("Fireboy coge la bomba del suelo", fire.inv.bombs === 1);
walkTo(water, 7);
hopTo(water, 8);
check("Watergirl se sube al estante", water.onGround && feetRow(water) === 14, tile(water));
jumpAt(water, 8);
check("Watergirl sube al estante y coge la otra", water.inv.bombs === 1 && acid.inv.bombs === 0);
jumpAt(acid, 4);
walkTo(fire, 12);
hold(["KeyD", "KeyW"], 40, () => fire.onGround && feetRow(fire) === 14);
run(10);
const lowHog = G.enemies.find((e) => e.type === "hedgehog");
for (let i = 0; i < 400 && !(lowHog.x < 16 * 32 && lowHog.vx < 0); i++) run(1);
leap(fire, 1);
walkTo(fire, 23);
check("Fireboy salta el erizo y entra en su zona", fire.x > 22 * 32 && fire.hearts === 3, `${tile(fire)} vidas ${fire.hearts}`);
jumpAt(fire, 24);
hold(["KeyD"], 200, () => G.grid[14][25] === " ");
run(60);
check("Su bomba abre el muro agrietado", G.grid[14][25] === " " && fire.inv.bombs === 0);
walkTo(fire, 29);
check("…pasa la palanca hacia la derecha y la enciende", M("v").leverOn);
hold(["KeyD"], 30, () => fire.vy < -5);
hold(["KeyA"], 120, () => fire.onGround && feetRow(fire) === 10);
run(10);
check("…y sale por el muelle sin volver a pisarla", feetRow(fire) === 10 && M("v").leverOn, tile(fire));
check("AcidBaby sube y corroe el tapón del ventilador", ride(acid, 11, 1) === 10 && G.grid[11][11] === " ", tile(acid));
jumpAt(acid, 9);
check("Watergirl sube", ride(water, 11, -1) === 10, tile(water));
walkTo(water, 1);
jumpAt(water, 2);
check("Watergirl abre su muro con la otra bomba y coge la llave", G.grid[8][3] === " " && water.inv.bombs === 0 && water.inv.keys === 1, tile(water));
walkTo(water, 21);
hold(["ArrowRight"], 120, () => G.grid[8][22] === " ");
walkTo(water, 25);
check("Cruza el puente frágil y abre la cerradura", G.grid[8][22] === " " && water.x > 22 * 32, tile(water));
run(300);
walkTo(acid, 25);
check("AcidBaby cruza cuando el puente vuelve", acid.x > 22 * 32 && feetRow(acid) === 10, tile(acid));
jumpAt(fire, 28);
check("Los tres suben al último piso", ride(fire, 26, -1) === 4 && ride(water, 26, -1) === 4 && ride(acid, 26, -1) === 4, G.players.map(tile).join(" | "));
jumpAt(fire, 8);
jumpAt(water, 10);
jumpAt(acid, 12);
walkTo(fire, 20);
walkTo(water, 22);
walkTo(acid, 24);
run(3);
check("Nivel 19 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length}, vidas ${G.players.map((p) => p.hearts)} ${G.players.map(tile).join(" | ")}`);
level(18);
walkTo(acid, 7);
check("Si AcidBaby coge una bomba, falta una para Fireboy o Watergirl", acid.inv.bombs === 1 && G.items.filter((i) => i.type === "bomb" && !i.taken).length === 1);

// --- Nivel 20: la fortaleza -------------------------------------------------------------------
console.log("\nNivel 20");
// Sube al bloque, anda hasta el muelle y, ya lanzado, se dirige a la izquierda.
function springLeft(p, landRow) {
  const k = keysOf(p);
  walkTo(p, 26);
  hopTo(p, 27);
  hold([k.r], 60, () => p.vy < -10);
  hold([k.l], 120, () => p.onGround && feetRow(p) === landRow);
  run(10);
}
level(19);
walkTo(fire, 6); walkTo(water, 7); walkTo(acid, 8);
walkTo(fire, 10); walkTo(water, 11); walkTo(acid, 12);
check("Cada uno coge un orbe y un escudo", G.players.every((p) => p.inv.weapon && p.inv.shield === 1));
jumpAt(fire, 13);
for (const p of [fire, water, acid]) { walkTo(p, 14); leap(p, 1); }
check("Los tres saltan los pinchos y el escalón", G.players.every((p) => p.x > 16 * 32 && p.hearts === 3), G.players.map((p) => tile(p) + " ♥" + p.hearts).join(" | "));
walkTo(fire, 18);
shootUntilClear(fire, (e) => e.type === "hedgehog");
// La torreta de abajo queda tras el bloque del muelle: el bloque para sus dardos.
check("Fireboy baja del escalón y acaba a disparos con el erizo", !alive().some((e) => e.type === "hedgehog") && G.players.every((p) => p.hearts === 3), `vidas ${G.players.map((p) => p.hearts)}`);
jumpAt(water, 18);
jumpAt(acid, 24);
for (const p of [fire, water, acid]) springLeft(p, 10);
check("El muelle del bloque los sube al piso de en medio", G.players.every((p) => feetRow(p) === 10), G.players.map(tile).join(" | "));
walkTo(fire, 22); walkTo(water, 22); walkTo(acid, 22);
jumpAt(water, 24);
walkTo(fire, 21);
check("Cada uno coge unas botas y Fireboy la bomba", G.players.every((p) => p.inv.boots) && fire.inv.bombs === 1);
for (const p of [fire, water, acid]) {
  walkTo(p, 20);
  doubleJump(p, -1, () => p.onGround && feetRow(p) === 6);
  walkTo(p, 18);
}
check("Con el doble salto pasan el muro", G.players.every((p) => p.x < 19 * 32 && p.hearts === 3), G.players.map((p) => tile(p) + " ♥" + p.hearts).join(" | "));
// El puente frágil sobre los pinchos, de uno en uno
for (const p of [fire, water, acid]) {
  hold([keysOf(p).l, keysOf(p).j], 40, () => p.onGround && feetRow(p) === 8);
  walkTo(p, 11);
  shootUntilClear(p, (e) => e.type === "ghost" && e.y > 5 * 32); // el fantasma de la llave despierta al llegar
  run(300);
}
check("Cruzan el puente frágil sin caer en los pinchos", G.players.every((p) => p.x < 12 * 32 && feetRow(p) === 10), G.players.map((p) => tile(p) + " ♥" + p.hearts).join(" | "));
for (const p of [fire, water, acid]) shootUntilClear(p, (e) => e.type === "ghost" && e.y > 5 * 32);
check("…y acaban con el fantasma que guarda la llave", !alive().some((e) => e.type === "ghost" && e.y > 5 * 32) && G.state === "playing", `vidas ${G.players.map((p) => p.hearts)}`);
jumpAt(acid, 11);
hold(["KeyA"], 200, () => G.grid[8][9] === " ");
run(60);
walkTo(fire, 7);
jumpAt(fire, 5);
check("La bomba abre el muro agrietado y Fireboy coge la llave", G.grid[8][9] === " " && fire.inv.keys === 1);
hold(["KeyA"], 200, () => G.grid[8][4] === " ");
check("…y abre la cerradura del ventilador", G.grid[8][4] === " ");
check("Los tres suben al último piso", ride(fire, 2, 1) === 4 && ride(water, 2, 1) === 4 && ride(acid, 2, 1) === 4, G.players.map(tile).join(" | "));
jumpAt(fire, 8);
for (const p of [fire, water, acid]) shootUntilClear(p, (e) => e.type === "ghost");
jumpAt(water, 10);
jumpAt(acid, 12);
walkTo(fire, 16);
shootUntilClear(fire, (e) => e.type === "turret");
check("Acaban con el fantasma y la torreta de las puertas", !alive().some((e) => e.y < 5 * 32), `vivos: ${alive().filter((e) => e.y < 5 * 32).map((e) => e.type)}`);
walkTo(fire, 22);
walkTo(water, 24);
walkTo(acid, 26);
run(3);
check("Nivel 20 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length}, vidas ${G.players.map((p) => p.hearts)} ${G.players.map(tile).join(" | ")}`);

// --- Nivel 21: el Guardián (jefe final) ---------------------------------------------------------
console.log("\nNivel 21");
const BOSS = () => G.boss;
// Dispara un proyectil de prueba de un elemento justo delante de un punto del jefe.
function testShot(type, dy) {
  const b = BOSS();
  const owner = G.players.find((p) => p.ch.immune === type);
  G.shots.push({ owner, type, x: b.x - 20, y: b.y + dy, w: 10, h: 10, vx: 7, life: 20 });
  run(6);
}
level(20);
run(100);
check("El Guardián despierta y patrulla tras la presentación", BOSS().state === "hover" && BOSS().phase === 0);
testShot("water", 53);
check("Con el ojo rojo, el agua rebota sin hacerle daño", BOSS().hp === 5);
testShot("fire", 10);
check("…y el fuego fuera del ojo, también", BOSS().hp === 5);
testShot("fire", 53);
check("Una bola de fuego en el ojo rojo le quita vida", BOSS().hp === 4);
for (let i = 0; i < 4; i++) testShot("fire", 53);
check("A los 5 impactos el ojo se vuelve azul", BOSS().phase === 1 && BOSS().hp === 5);
for (let i = 0; i < 5; i++) testShot("water", 53);
for (let i = 0; i < 5; i++) testShot("acid", 53);
run(200);
check("Tras las tres fases cae y se rompe el sello de las puertas", BOSS().state === "dead" && G.grid[14][4] === " " && G.state === "playing", `estado ${BOSS().state}`);

// Pelea completa solo con teclas: cada uno sube a una repisa y dispara cuando el ojo es de su color.
function fightBoss(p, phase) {
  const k = keysOf(p);
  for (let i = 0; i < 500 && BOSS().phase === phase && !["dying", "dead"].includes(BOSS().state) && G.state === "playing"; i++) {
    const b = BOSS();
    // Si le viene un dardo, lo salta.
    const incoming = G.darts.some((d) => Math.sign(p.x - d.x) === Math.sign(d.vx) && Math.abs(p.x - d.x) < 110 && Math.abs(d.y - (p.y + 14)) < 20);
    if (incoming && p.onGround) { hold([k.j], 14); run(10); continue; }
    const dir = Math.sign(b.x + 48 - (p.x + p.w / 2));
    if (dir && dir !== p.facing) tapKey(dir > 0 ? k.r : k.l);
    if (b.state === "hover") tapKey(k.fire);
    // Los demás se encargan de los murciélagos que invoca.
    for (const q of G.players) {
      if (q === p || !q.alive) continue;
      const bat = alive().find((e) => e.type === "bat" && Math.abs(e.y + e.h - (q.y + q.h)) < 24 && Math.abs(e.x - q.x) < 300);
      if (!bat) continue;
      const kq = keysOf(q);
      const dq = Math.sign(bat.x - q.x) || q.facing;
      if (dq !== q.facing) tapKey(dq > 0 ? kq.r : kq.l);
      tapKey(kq.fire);
    }
    run(11);
  }
}
level(20);
walkTo(fire, 13); walkTo(water, 12); walkTo(acid, 11);
check("Cada uno coge su orbe", G.players.every((p) => p.inv.weapon));
walkTo(fire, 7);
hold(["KeyA"], 120, () => fire.onGround && feetRow(fire) === 11);
check("El muelle sube a Fireboy a la repisa izquierda", feetRow(fire) === 11 && fire.x < 6 * 32, tile(fire));
fightBoss(fire, 0);
check("Fase 1: Fireboy le quita el ojo rojo", BOSS().phase === 1 && G.state === "playing", `vidas ${G.players.map((p) => p.hearts)}`);
walkTo(water, 24);
hold(["ArrowRight"], 200, () => water.onGround && feetRow(water) === 11);
check("Watergirl sube a la repisa derecha", feetRow(water) === 11 && water.x > 25 * 32, tile(water));
walkTo(acid, 24);
hold(["KeyJ"], 200, () => acid.onGround && feetRow(acid) === 11);
check("AcidBaby sube también (en el suelo caen rocas y ondas)", feetRow(acid) === 11 && acid.x > 25 * 32, tile(acid));
fightBoss(water, 1);
check("Fase 2: Watergirl, el azul (aunque se estrelle contra el suelo)", BOSS().phase === 2 && G.state === "playing", `vidas ${G.players.map((p) => p.hearts)}`);
fightBoss(acid, 2);
for (const p of [acid, water, fire]) shootUntilClear(p, () => true);
run(130);
check("Fase 3: AcidBaby acaba con él y sus murciélagos", BOSS().state === "dead" && G.state === "playing", `estado ${BOSS().state}, vidas ${G.players.map((p) => p.hearts)}`);
check("El sello de las puertas se ha roto", G.grid[14][4] === " ");
for (const p of [fire, water, acid]) {
  walkTo(p, p === fire ? 9 : p === water ? 19 : 22);
  jumpAt(p, p === fire ? 9 : p === water ? 19 : 22);
  walkTo(p, 7);
  leap(p, -1); // salta el muelle de camino a las puertas
}
walkTo(fire, 1);
walkTo(water, 2);
walkTo(acid, 3);
run(3);
check("Nivel 21 completado con todas las gemas", G.state === "won" && G.gems.every((g) => g.taken), `en puerta: ${G.players.map((p) => p.inDoor)}, gemas ${G.gems.filter((g) => g.taken).length}/${G.gems.length}, vidas ${G.players.map((p) => p.hearts)} ${G.players.map(tile).join(" | ")}`);

// --- Editor de niveles ----------------------------------------------------------
// (al final: probar un nivel del editor deja el juego en modo prueba)
console.log("\nEditor de niveles");
const E = globalThis.EditorCore;
const J = globalThis.Juego;
const blank = E.blankLevel();
check("Un nivel nuevo del editor se puede jugar tal cual", J.preview(blank).length === 0 && G.state === "editor", J.preview(blank).join("; "));
const eg = E.toGrid(blank.map);
E.setTile(eg, 10, 5, "f");
check("Las piezas únicas se mueven en vez de duplicarse", E.fromGrid(eg).join("").split("f").length === 2 && eg[5][10] === "f");
E.fillRect(eg, 3, 3, 6, 4, "L");
check("Mayús + arrastrar rellena un rectángulo", [3, 4].every((r) => [3, 4, 5, 6].every((c) => eg[r][c] === "L")));
const noWater = { ...blank, map: blank.map.map((row) => row.replace("w", " ")) };
const probs = J.preview(noWater);
check("Avisa de lo que falta", probs.some((p) => p.includes("inicio de Watergirl")), probs.join("; "));
check("…y no deja probarlo", J.test(noWater).length > 0 && G.state === "editor");
const badMech = { ...blank, mechanisms: { c: { trigger: "button", move: [0, -2] } }, map: blank.map.map((row, r) => (r === 10 ? row.slice(0, 5) + "c" + row.slice(6) : row)) };
check("Avisa de un mecanismo sin botón", J.preview(badMech).some((p) => p.includes('no tiene botón/palanca "C"')));
const big = E.resize(E.toGrid(blank.map), 40, 20);
check(
  "Cambiar el tamaño conserva el borde y lo que hay en el suelo",
  big.length === 20 && big[0].length === 40 && big[18].slice(2, 5).join("") === "fwb" && big[19].every((ch) => ch === "#") && big.every((row) => row[0] === "#" && row[39] === "#"),
);
check("Exportar e importar devuelve el mismo nivel (los 10 del juego)", LEVELS.every((lv) => JSON.stringify(E.parse(E.toText(lv))) === JSON.stringify(E.normalize(lv))));
const messy = `// pegado a mano
{ name: 'Con comillas simples', hint: "Dice \\"hola\\", ¿vale?", /* mecanismos */ mechanisms: { c: { trigger: 'lever', kind: 'fan', }, },
  map: [
${blank.map.map((row) => `    '${row}'`).join(",\n")},
  ],
},`;
let parsed = null;
try { parsed = E.parse(messy); } catch (e) { console.log("  ", e.message); }
check("Importa texto escrito a mano (comillas simples, comentarios, comas finales)", parsed?.name === "Con comillas simples" && parsed.hint === 'Dice "hola", ¿vale?' && parsed.mechanisms.c.kind === "fan");
const onlyRows = E.parse(blank.map.map((row) => `    "${row}",`).join("\n"));
check("Importa solo las filas del mapa", onlyRows.map.join() === blank.map.join());
let parseError = "";
try { E.parse('{ map: ["###"] }'); } catch (e) { parseError = e.message; }
check("Rechaza un mapa demasiado pequeño con un mensaje claro", parseError.includes("tiene que estar entre"), parseError);
const hist = E.makeHistory();
hist.push("a"); hist.push("b");
check("Deshacer y rehacer", hist.undo("c") === "b" && hist.undo("b") === "a" && hist.redo("a") === "b" && hist.redo("b") === "c");
check("Asigna letras de mecanismo libres", E.nextMechLetter({ c: {} }, ["#d#"]) === "g");

check("Probar un nivel válido lo juega", J.test(blank).length === 0 && G.state === "playing");
tap("Escape"); tap("ArrowDown"); tap("ArrowDown");
check("En la pausa de la prueba se puede volver al editor", G.state === "paused" && G.menuIndex === 2);
tap("Enter");
check("…y vuelve", G.state === "editor");
J.test(blank);
run(1);
for (const p of G.players) { const d = G.doors[p.ch.door]; place(p, d.c, d.r); }
run(3);
check("Ganar una prueba no guarda récords", G.state === "won" && !G.save.levels["Mi nivel"]);
tap("Enter");
check("ENTER tras ganar la prueba vuelve al editor", G.state === "editor");

// --- Mecánicas nuevas (en niveles de prueba pequeños) -------------------------------------
console.log("\nMecánicas nuevas");
// Monta un nivel vacío de 32x18, deja que edit() ponga piezas y lo juega.
function sandbox(edit) {
  const lv = E.blankLevel();
  const g = E.toGrid(lv.map);
  edit(g);
  const problems = J.test({ ...lv, map: E.fromGrid(g) });
  if (problems.length) console.log("   problemas:", problems.join("; "));
  run(1);
  fire = P("Fireboy"); water = P("Watergirl"); acid = P("AcidBaby");
}
const lowest = (p, frames) => { let m = Infinity; for (let i = 0; i < frames; i++) { run(1); m = Math.min(m, p.y + p.h); } return m; };

sandbox((g) => (g[16][8] = ";"));
place(fire, 8, 13);
check("El muelle lanza un piso entero (6 casillas)", 17 * 32 - lowest(fire, 80) >= 6 * 32, `subió ${17 * 32 - lowest(fire, 80)} px`);

sandbox((g) => (g[16][6] = "("));
const jumpRise = (p) => { const base = p.y + p.h; tapKey(keysOf(p).j); run(12); tapKey(keysOf(p).j); return base - lowest(p, 60); };
place(water, 9, 16); run(5);
const single = jumpRise(water);
walkTo(fire, 6); run(30);
check("Las botas van al inventario", fire.inv.boots);
place(fire, 9, 16); run(5);
const double = jumpRise(fire);
check("Con botas se salta otra vez en el aire (más alto)", double > single + 40, `${single} px sin botas, ${double} px con botas`);

sandbox((g) => { g[16][6] = ")"; g[16][12] = "!"; });
walkTo(fire, 6);
check("El escudo va al inventario", fire.inv.shield === 1);
const hog = G.enemies[0];
hog.x = fire.x + 30; hog.vx = -1;
run(40);
check("El escudo absorbe el golpe del erizo sin quitar vida", fire.inv.shield === 0 && fire.hearts === 3);
fire.hurt = 0; place(water, 20, 13);
hog.x = water.x - 1; hog.y = 17 * 32 - hog.h; hog.vx = 0;
run(40);
check("Saltar encima de un erizo duele y no lo mata", water.hearts === 2 && hog.alive);

sandbox((g) => { for (let r = 1; r < 17; r++) g[r][16] = "#"; g[16][19] = ":"; });
const ghost = G.enemies[0];
place(fire, 15, 16); place(water, 3, 16); place(acid, 4, 16);
run(300);
check("El fantasma atraviesa la pared para perseguir al más cercano", ghost.x < 16 * 32, `x=${ghost.x | 0}`);

sandbox((g) => { g[16][20] = "<"; });
place(fire, 10, 16);
run(200);
check("La torreta dispara a quien está en su fila", fire.hearts < 3, `vidas ${fire.hearts}`);
sandbox((g) => { g[16][20] = "<"; g[16][15] = "x"; });
place(fire, 10, 16);
run(300);
check("Una caja en medio para los dardos", fire.hearts === 3 && G.darts.length <= 1, `vidas ${fire.hearts}`);

sandbox((g) => { g[13][10] = "-"; });
place(fire, 10, 12);
run(20);
check("Sobre un tablón frágil se aguanta un momento…", feetRow(fire) === 12 && fire.onGround);
run(40);
check("…y luego se cae", feetRow(fire) === 16 && G.grid[13][10] === " ");
place(fire, 3, 16);
run(260);
check("El tablón vuelve a aparecer al rato", G.grid[13][10] === "-");

sandbox((g) => { g[16][8] = "."; });
walkTo(fire, 9);
check("Los pinchos quitan una vida", fire.hearts === 2 && G.state === "playing", `vidas ${fire.hearts}`);

sandbox((g) => { g[16][6] = "]"; for (let r = 12; r < 17; r++) g[r][12] = "["; g[16][13] = ">"; });
walkTo(acid, 6);
check("La bomba va al inventario", acid.inv.bombs === 1);
hold(["KeyJ"], 120, () => G.grid[14][12] === " ");
run(60);
check("Al tocar el muro agrietado la bomba lo abre entero y mata al bicho de detrás", [12, 13, 14, 15, 16].every((r) => G.grid[r][12] === " ") && acid.inv.bombs === 0 && !G.enemies[0].alive);
sandbox((g) => { for (let r = 12; r < 17; r++) g[r][12] = "["; });
hold(["KeyD"], 60);
check("Sin bomba el muro agrietado no se abre", G.grid[14][12] === "[");
G.setLevel(0);

// --- Amuleto del cambio ---------------------------------------------------------------------------
console.log("\nAmuleto del cambio");
sandbox((g) => { g[16][8] = "}"; g[17][20] = "L"; });
place(acid, 20, 16);
run(5);
check("AcidBaby no puede estar sobre la lava…", G.state === "dead");
sandbox((g) => { g[16][8] = "}"; g[17][20] = "L"; g[17][22] = "~"; });
place(fire, 20, 16);
place(water, 22, 16);
run(5);
walkTo(acid, 8);
check("Al coger el amuleto los tres cambian en ronda", fire.ch.name === "Watergirl" && water.ch.name === "AcidBaby" && acid.ch.name === "Fireboy", G.players.map((p) => p.ch.name).join(", "));
check("…y cada jugador conserva sus teclas", fire.controls.left === "KeyA" && water.controls.left === "ArrowLeft" && acid.controls.left === "KeyG");
check("Quien estaba en su charco al cambiar ya no sobrevive en él", G.state === "dead" && G.deathMessage === "Watergirl cayó en la lava", `→ "${G.deathMessage}"`);
sandbox((g) => { g[16][8] = "}"; });
walkTo(acid, 8);
const xBeforeSwap = fire.x;
hold(["KeyD"], 30);
check("Tras el cambio, las teclas de Fireboy mueven al mismo cuerpo (ahora Watergirl)", fire.x > xBeforeSwap && fire.ch.name === "Watergirl");
sandbox((g) => { g[13][10] = "4"; g[16][8] = "}"; });
place(fire, 10, 13);
fire.y = 13 * 32 + 2;
walkTo(acid, 8);
run(5);
check("Quien se queda dentro de una barrera que ya no es suya sale al hueco libre", !G.solidAt(fire.x, fire.y, fire.w, fire.h, fire), `y=${fire.y}`);
G.setLevel(0);

process.exitCode = failures ? 1 : 0;
console.log(failures ? `\n${failures} fallos` : "\nTodo bien");
