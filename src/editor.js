// Editor de niveles: se pintan los mapas con el ratón, se prueban al momento y se exportan como
// texto en el mismo formato que levels.js. Habla con el juego a través de globalThis.Juego.
(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Núcleo (sin DOM; se prueba en tests/simulacion.js)
  // ---------------------------------------------------------------------------
  const UNIQUE = new Set(["f", "w", "b", "1", "2", "3", "7", "8", "9", "0"]); // solo puede haber uno de cada
  const MECH_LETTERS = "cdghijkmnopqstuvy".split(""); // letras libres (el resto ya significan algo)
  const MIN_W = 12;
  const MIN_H = 8;
  const MAX_W = 60;
  const MAX_H = 34;

  function blankLevel(w = 32, h = 18) {
    const rows = [];
    for (let r = 0; r < h; r++) {
      rows.push(r === 0 || r === h - 1 ? "#".repeat(w) : "#" + " ".repeat(w - 2) + "#");
    }
    const grid = toGrid(rows);
    "fwb".split("").forEach((ch, i) => (grid[h - 2][2 + i] = ch));
    "123".split("").forEach((ch, i) => (grid[h - 2][w - 7 + i * 2] = ch));
    return { name: "Mi nivel", hint: "", mechanisms: {}, map: fromGrid(grid) };
  }

  const toGrid = (map) => map.map((row) => row.split(""));
  const fromGrid = (grid) => grid.map((row) => row.join(""));

  // Pone una casilla. Las piezas únicas (inicios, puertas, portales) se mueven en vez de duplicarse.
  function setTile(grid, c, r, ch) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] === ch) return false;
    if (UNIQUE.has(ch)) {
      for (const row of grid) for (let i = 0; i < row.length; i++) if (row[i] === ch) row[i] = " ";
    }
    grid[r][c] = ch;
    return true;
  }

  function fillRect(grid, c0, r0, c1, r1, ch) {
    if (UNIQUE.has(ch)) return setTile(grid, c0, r0, ch);
    let changed = false;
    for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) {
      for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) changed = setTile(grid, c, r, ch) || changed;
    }
    return changed;
  }

  // Cambia el tamaño conservando el borde de pared y el contenido pegado al suelo (abajo a la izquierda).
  function resize(grid, w, h) {
    w = Math.max(MIN_W, Math.min(MAX_W, Math.round(w)));
    h = Math.max(MIN_H, Math.min(MAX_H, Math.round(h)));
    const oldH = grid.length;
    const oldW = grid[0].length;
    const out = toGrid(blankLevel(w, h).map.map((row) => row.replace(/[^#]/g, " ")));
    for (let r = 1; r < oldH - 1; r++) {
      const nr = r + (h - oldH);
      if (nr < 1 || nr > h - 2) continue;
      for (let c = 1; c < Math.min(oldW - 1, w - 1); c++) out[nr][c] = grid[r][c];
    }
    return out;
  }

  function nextMechLetter(mechanisms, map) {
    const used = map.join("");
    return MECH_LETTERS.find((l) => !(l in mechanisms) && !used.includes(l) && !used.includes(l.toUpperCase())) || null;
  }

  // Devuelve una copia limpia del nivel o lanza un error que se puede enseñar al usuario.
  function normalize(data) {
    if (!data || typeof data !== "object") throw new Error("No es un nivel");
    if (!Array.isArray(data.map) || !data.map.length || !data.map.every((row) => typeof row === "string")) {
      throw new Error('Falta "map": una lista de filas de texto');
    }
    const w = Math.max(...data.map.map((row) => row.length));
    const h = data.map.length;
    if (w < MIN_W || h < MIN_H || w > MAX_W || h > MAX_H) {
      throw new Error(`El mapa mide ${w}×${h}; tiene que estar entre ${MIN_W}×${MIN_H} y ${MAX_W}×${MAX_H}`);
    }
    const mechanisms = {};
    for (const [id, def] of Object.entries(data.mechanisms || {})) {
      if (!/^[a-z]$/.test(id)) throw new Error(`El mecanismo "${id}" tiene que ser una sola letra minúscula`);
      mechanisms[id] = { ...def };
    }
    const clean = {
      name: String(data.name || "Mi nivel"),
      hint: String(data.hint || ""),
      mechanisms,
      map: data.map.map((row) => row.padEnd(w, " ")),
    };
    if (data.boss && typeof data.boss === "object") clean.boss = { ...data.boss }; // configuración del jefe final
    return clean;
  }

  // Texto listo para pegar dentro de LEVELS en levels.js.
  function toText(data) {
    const q = JSON.stringify;
    const lines = ["{", `  name: ${q(data.name)},`];
    if (data.hint) lines.push(`  hint: ${q(data.hint)},`);
    const mechs = Object.entries(data.mechanisms || {});
    if (mechs.length) {
      lines.push("  mechanisms: {");
      for (const [id, def] of mechs) {
        const fields = Object.entries(def).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(", ")}]` : q(v)}`);
        lines.push(`    ${id}: { ${fields.join(", ")} },`);
      }
      lines.push("  },");
    }
    if (data.boss) {
      const fields = Object.entries(data.boss).map(([k, v]) => `${k}: ${q(v)}`);
      lines.push(`  boss: { ${fields.join(", ")} },`);
    }
    lines.push("  map: [", ...data.map.map((row) => `    ${q(row)},`), "  ],", "},");
    return lines.join("\n");
  }

  // Pasa un objeto literal de JavaScript (como los de levels.js) a JSON sin ejecutarlo:
  // pone comillas a las claves, cambia comillas simples por dobles y quita comentarios y comas finales.
  function jsToJson(src) {
    let out = "";
    let i = 0;
    const nextSignificant = (j) => {
      while (j < src.length && /\s/.test(src[j])) j++;
      return src[j];
    };
    while (i < src.length) {
      const ch = src[i];
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        let str = "";
        while (j < src.length && src[j] !== ch) {
          if (src[j] === "\\") {
            str += src[j] + src[j + 1];
            j += 2;
          } else {
            str += src[j] === '"' ? '\\"' : src[j];
            j++;
          }
        }
        if (j >= src.length) throw new Error("Faltan unas comillas de cierre");
        out += `"${ch === "'" ? str.replace(/\\'/g, "'") : str}"`;
        i = j + 1;
      } else if (ch === "/" && src[i + 1] === "/") {
        while (i < src.length && src[i] !== "\n") i++;
      } else if (ch === "/" && src[i + 1] === "*") {
        const end = src.indexOf("*/", i + 2);
        i = end < 0 ? src.length : end + 2;
      } else if (/[A-Za-z_$]/.test(ch)) {
        let j = i;
        while (j < src.length && /[\w$]/.test(src[j])) j++;
        const word = src.slice(i, j);
        if (nextSignificant(j) === ":") out += JSON.stringify(word);
        else if (["true", "false", "null"].includes(word)) out += word;
        else throw new Error(`No entiendo "${word}"`);
        i = j;
      } else if (ch === ",") {
        const next = nextSignificant(i + 1);
        if (next !== "}" && next !== "]" && next !== undefined) out += ch;
        i++;
      } else {
        out += ch;
        i++;
      }
    }
    return out;
  }

  // Acepta un nivel exportado (objeto como los de levels.js) o solo las filas del mapa.
  function parse(text) {
    // Los comentarios del principio no cuentan para decidir si es un objeto o solo filas.
    const src = text.replace(/^(\s*(\/\/[^\n]*(\n|$)|\/\*[\s\S]*?\*\/))*/, "").trim().replace(/;\s*$/, "");
    if (!src) throw new Error("No hay nada que importar");
    if (src.startsWith("{")) {
      let obj;
      try {
        obj = JSON.parse(jsToJson(src));
      } catch (e) {
        throw new Error(`No se puede leer el nivel: ${e.message}`);
      }
      return normalize(obj);
    }
    // Filas sueltas, con o sin comillas y comas (como en levels.js)
    const rows = src
      .split(/\r?\n/)
      .map((line) => {
        const quoted = line.match(/^\s*["'](.*)["'],?\s*$/);
        return quoted ? quoted[1] : line.replace(/\s+$/, "");
      })
      .filter((line) => line.length);
    return normalize({ name: "Nivel importado", map: rows });
  }

  function makeHistory(limit = 200) {
    const past = [];
    const future = [];
    return {
      push(snapshot) {
        past.push(snapshot);
        if (past.length > limit) past.shift();
        future.length = 0;
      },
      undo(current) {
        if (!past.length) return null;
        future.push(current);
        return past.pop();
      },
      redo(current) {
        if (!future.length) return null;
        past.push(current);
        return future.pop();
      },
      get canUndo() {
        return past.length > 0;
      },
      get canRedo() {
        return future.length > 0;
      },
    };
  }

  globalThis.EditorCore = { blankLevel, toGrid, fromGrid, setTile, fillRect, resize, nextMechLetter, normalize, toText, parse, makeHistory, UNIQUE };

  // ---------------------------------------------------------------------------
  // Interfaz (solo en el navegador)
  // ---------------------------------------------------------------------------
  if (!globalThis.document?.body) return;

  const STORE_KEY = "fireboy-watergirl-acidbaby-editor-v1";

  const PALETTE = [
    ["Terreno", [
      [" ", "Vacío", "#15110c"], ["#", "Pared", "#5a4a33"], ["L", "Lava", "#ff5a1f"], ["~", "Agua", "#1f7bff"],
      ["A", "Ácido", "#46c22a"], ["%", "Óxido (AcidBaby)", "#6b5a2e"], ["+", "Hielo (Fireboy)", "#7cc6e8"],
      ["=", "Sal (Watergirl)", "#e6dfcc"], ["|", "Cerradura", "#7a5524"], ["[", "Muro agrietado (bomba)", "#8a7a62"],
      ["-", "Tablón frágil", "#8a5a2b"], [".", "Pinchos", "#c9c2b0"],
    ]],
    ["Barreras", [["4", "Barrera de fuego", "#a8401a"], ["5", "Barrera de agua", "#1d5fb8"], ["6", "Barrera de ácido", "#2f8a1c"]]],
    ["Personajes", [
      ["f", "Inicio Fireboy", "#ff5a1f"], ["w", "Inicio Watergirl", "#2a8cff"], ["b", "Inicio AcidBaby", "#5fd12e"],
      ["1", "Puerta Fireboy", "#8f2208"], ["2", "Puerta Watergirl", "#0c3f8f"], ["3", "Puerta AcidBaby", "#226b0c"],
    ]],
    ["Objetos", [
      ["r", "Rubí", "#ff4d5e"], ["z", "Zafiro", "#4da6ff"], ["e", "Esmeralda", "#7dff4d"], ["x", "Caja", "#9a6a35"],
      ["$", "Llave", "#ffd76a"], ["*", "Orbe de arma", "#cdb6ff"], ["?", "Corazón", "#ff4d6d"],
      ["(", "Botas (doble salto)", "#d9534f"], [")", "Escudo", "#4fb3ff"], ["]", "Bomba", "#2b2b33"],
      ["}", "Amuleto del cambio", "#c86bff"],
    ]],
    ["Mecánica", [
      ["^", "Ventilador", "#6d7688"], [";", "Muelle", "#f2c14e"], ["7", "Portal morado A", "#c86bff"], ["8", "Portal morado B", "#c86bff"],
      ["9", "Portal turquesa A", "#4fd6c8"], ["0", "Portal turquesa B", "#4fd6c8"],
    ]],
    ["Bichos", [
      ["@", "Escarabajo", "#9b4dca"], ["&", "Murciélago", "#8a63c4"], ["!", "Erizo (no se pisa)", "#8a5a2b"],
      [":", "Fantasma (atraviesa paredes)", "#e8f0ff"], ["<", "Torreta hacia la izquierda", "#4a4f5c"], [">", "Torreta hacia la derecha", "#4a4f5c"],
      ["{", "Jefe final (el Guardián)", "#5a4a33"], ["/", "Sello (cae con el jefe)", "#c86bff"],
    ]],
  ];
  const LABELS = Object.fromEntries(PALETTE.flatMap(([, tiles]) => tiles.map(([ch, label]) => [ch, label])));
  const COLORS = Object.fromEntries(PALETTE.flatMap(([, tiles]) => tiles.map(([ch, , color]) => [ch, color])));
  const MECH_COLORS = ["#f2c14e", "#c86bff", "#ff6fa8", "#4fd6c8", "#f0f0f0"]; // los mismos que el juego

  let data = null; // nivel que se edita (sin el mapa: el mapa vive en grid)
  let grid = null;
  let tool = "#";
  let problems = [];
  let hover = null;
  let stroke = null; // { ch, changed } mientras se arrastra pintando
  let rectStart = null; // casilla donde empezó un rectángulo (Mayús + arrastrar)
  let panel = null;
  let saveTimer = 0;
  const history = makeHistory();
  const $ = (sel) => panel.querySelector(sel);

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function writeStore(store) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      // Sin guardado: el editor sigue funcionando.
    }
  }

  const current = () => ({ ...data, map: fromGrid(grid) });
  const snapshot = () => JSON.stringify(current());

  function load(level) {
    const clean = normalize(level);
    grid = toGrid(clean.map);
    data = { name: clean.name, hint: clean.hint, mechanisms: clean.mechanisms };
    if (clean.boss) data.boss = clean.boss;
  }

  // Tras cada cambio: guarda el borrador, vuelve a cargar la vista previa y refresca el panel.
  function changed({ panelToo = false } = {}) {
    problems = globalThis.Juego.preview(current());
    renderStatus();
    if (panelToo) renderPanel();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const store = readStore();
      store.draft = current();
      writeStore(store);
    }, 300);
  }

  function replaceLevel(level) {
    history.push(snapshot());
    load(level);
    changed({ panelToo: true });
  }

  function undoRedo(which) {
    const prev = which === "undo" ? history.undo(snapshot()) : history.redo(snapshot());
    if (!prev) return;
    load(JSON.parse(prev));
    changed({ panelToo: true });
  }

  // --- Panel -----------------------------------------------------------------
  function build() {
    panel = document.createElement("aside");
    panel.id = "editor-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <header><h1>Editor de niveles</h1><button data-act="close" title="Volver al menú (Esc)">✕</button></header>
      <section>
        <label>Nombre <input id="ed-name" maxlength="40"></label>
        <label>Pista <input id="ed-hint" maxlength="120" placeholder="Se muestra al empezar"></label>
        <div class="row">
          <label>Ancho <input id="ed-w" type="number" min="${MIN_W}" max="${MAX_W}"></label>
          <label>Alto <input id="ed-h" type="number" min="${MIN_H}" max="${MAX_H}"></label>
          <button data-act="resize">Cambiar tamaño</button>
        </div>
      </section>
      <section>
        <h2>Piezas</h2>
        <p class="help">Clic izquierdo: pintar · clic derecho: borrar · Mayús + arrastrar: rectángulo · también vale teclear el carácter de la pieza</p>
        <div id="ed-palette"></div>
      </section>
      <section>
        <h2>Mecanismos</h2>
        <div id="ed-mechs"></div>
        <button data-act="add-mech">+ Añadir mecanismo</button>
      </section>
      <section>
        <div id="ed-status"></div>
        <div class="row">
          <button data-act="test" class="primary">▶ Probar</button>
          <button data-act="undo" title="Ctrl+Z">↶ Deshacer</button>
          <button data-act="redo" title="Ctrl+Y">↷ Rehacer</button>
          <button data-act="new">Nuevo</button>
        </div>
      </section>
      <section>
        <h2>Mis niveles</h2>
        <div class="row"><select id="ed-mine"></select><button data-act="load-mine">Cargar</button><button data-act="delete-mine">Borrar</button></div>
        <button data-act="save-mine">Guardar en mis niveles</button>
        <div class="row"><select id="ed-game"></select><button data-act="load-game">Copiar del juego</button></div>
      </section>
      <section>
        <h2>Texto</h2>
        <p class="help">«Exportar» deja el nivel listo para pegarlo en src/levels.js. «Importar» acepta ese texto o solo las filas del mapa.</p>
        <textarea id="ed-text" spellcheck="false" rows="6"></textarea>
        <div class="row"><button data-act="export">Exportar</button><button data-act="copy">Copiar</button><button data-act="import">Importar</button></div>
        <p id="ed-msg" class="help"></p>
      </section>`;
    document.body.prepend(panel);

    panel.addEventListener("click", onPanelClick);
    $("#ed-name").addEventListener("input", (e) => {
      data.name = e.target.value || "Mi nivel";
      changed();
    });
    $("#ed-hint").addEventListener("input", (e) => {
      data.hint = e.target.value;
      changed();
    });
    $("#ed-mechs").addEventListener("change", onMechChange);
    $("#ed-game").innerHTML = LEVELS.map((lv, i) => `<option value="${i}">${i + 1}. ${escapeHtml(lv.name)}</option>`).join("");

    const canvas = document.getElementById("game");
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", () => (hover = null));
    canvas.addEventListener("contextmenu", (e) => {
      if (isEditing()) e.preventDefault();
    });
    addEventListener("keydown", onKey);
  }

  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const isEditing = () => panel && !panel.hidden && globalThis.Juego?.state === "editor";

  function swatch(ch, color) {
    const light = ["=", "$", "?", "*", "+", "e", "^", ";", ".", ":"].includes(ch);
    return `<span class="sw" style="background:${color};color:${light ? "#1a150f" : "#fff"}">${ch === " " ? "␣" : escapeHtml(ch)}</span>`;
  }

  function renderPanel() {
    $("#ed-name").value = data.name;
    $("#ed-hint").value = data.hint;
    $("#ed-w").value = grid[0].length;
    $("#ed-h").value = grid.length;

    const mechTiles = Object.entries(data.mechanisms).flatMap(([id, def], i) => {
      const color = def.color || MECH_COLORS[i % MECH_COLORS.length];
      return [
        [id, `${id}: ${def.kind === "fan" ? "ventilador" : "plataforma"}`, color],
        [id.toUpperCase(), `${id.toUpperCase()}: ${def.trigger === "lever" ? "palanca" : "botón"}`, color],
      ];
    });
    const groups = [...PALETTE, ...(mechTiles.length ? [["Tus mecanismos", mechTiles]] : [])];
    $("#ed-palette").innerHTML = groups
      .map(([title, tiles]) => `<h3>${title}</h3><div class="tiles">${tiles
        .map(([ch, label, color]) => `<button class="tile${ch === tool ? " on" : ""}" data-tool="${escapeHtml(ch)}" title="${escapeHtml(label)} (${ch === " " ? "espacio" : escapeHtml(ch)})">${swatch(ch, color)}<span>${escapeHtml(label)}</span></button>`)
        .join("")}</div>`)
      .join("");

    $("#ed-mechs").innerHTML = Object.entries(data.mechanisms)
      .map(([id, def]) => {
        const fan = def.kind === "fan";
        const [dx, dy] = def.move || [0, 0];
        return `<div class="mech" data-id="${id}">
          <b>${id} / ${id.toUpperCase()}</b>
          <select data-f="trigger"><option value="button"${def.trigger !== "lever" ? " selected" : ""}>Botón</option><option value="lever"${def.trigger === "lever" ? " selected" : ""}>Palanca</option></select>
          <select data-f="kind"><option value="platform"${fan ? "" : " selected"}>Plataforma</option><option value="fan"${fan ? " selected" : ""}>Ventilador</option></select>
          ${fan ? "" : `<label>mueve x <input data-f="dx" type="number" value="${dx}"></label><label>y <input data-f="dy" type="number" value="${dy}"></label>`}
          ${def.trigger === "lever" ? "" : `<label>botones a la vez <input data-f="need" type="number" min="1" value="${def.need || 1}"></label>`}
          <button data-act="del-mech" title="Quitar el mecanismo y sus casillas">✕</button>
        </div>`;
      })
      .join("") || `<p class="help">Plataformas, compuertas y ventiladores que se activan con botones o palancas.</p>`;

    const store = readStore();
    $("#ed-mine").innerHTML = (store.mine || []).map((lv, i) => `<option value="${i}">${escapeHtml(lv.name)}</option>`).join("") || '<option value="">(ninguno todavía)</option>';
    renderStatus();
  }

  function renderStatus() {
    if (!panel) return;
    $("#ed-status").innerHTML = problems.length
      ? `<p class="bad">Para poder probarlo:</p><ul>${problems.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
      : `<p class="good">✓ Listo para probar</p>`;
    $('[data-act="test"]').disabled = problems.length > 0;
    $('[data-act="undo"]').disabled = !history.canUndo;
    $('[data-act="redo"]').disabled = !history.canRedo;
  }

  function message(text) {
    $("#ed-msg").textContent = text;
  }

  function onPanelClick(e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.tool !== undefined) {
      tool = btn.dataset.tool;
      renderPanel();
      return;
    }
    const act = btn.dataset.act;
    const store = readStore();
    if (act === "close") globalThis.Juego.close();
    else if (act === "test") startTest();
    else if (act === "undo" || act === "redo") undoRedo(act);
    else if (act === "new") replaceLevel(blankLevel(grid[0].length, grid.length));
    else if (act === "resize") {
      history.push(snapshot());
      grid = resize(grid, Number($("#ed-w").value), Number($("#ed-h").value));
      changed({ panelToo: true });
    } else if (act === "add-mech") {
      const id = nextMechLetter(data.mechanisms, fromGrid(grid));
      if (!id) return message("No quedan letras libres para más mecanismos.");
      history.push(snapshot());
      data.mechanisms[id] = { trigger: "button", move: [0, -3] };
      tool = id;
      changed({ panelToo: true });
    } else if (act === "del-mech") {
      const id = btn.closest(".mech").dataset.id;
      history.push(snapshot());
      delete data.mechanisms[id];
      for (const row of grid) for (let c = 0; c < row.length; c++) if (row[c] === id || row[c] === id.toUpperCase()) row[c] = " ";
      if (tool.toLowerCase() === id) tool = "#";
      changed({ panelToo: true });
    } else if (act === "save-mine") {
      const mine = (store.mine || []).filter((lv) => lv.name !== data.name);
      mine.push(current());
      store.mine = mine;
      writeStore(store);
      renderPanel();
      message(`Guardado «${data.name}» en tus niveles (en este navegador).`);
    } else if (act === "load-mine") {
      const lv = (store.mine || [])[Number($("#ed-mine").value)];
      if (lv) replaceLevel(lv);
    } else if (act === "delete-mine") {
      const i = Number($("#ed-mine").value);
      if (!store.mine?.[i]) return;
      const [gone] = store.mine.splice(i, 1);
      writeStore(store);
      renderPanel();
      message(`Borrado «${gone.name}» de tus niveles.`);
    } else if (act === "load-game") {
      replaceLevel(LEVELS[Number($("#ed-game").value)]);
    } else if (act === "export") {
      $("#ed-text").value = toText(current());
      message("Listo para copiar.");
    } else if (act === "copy") {
      if (!$("#ed-text").value) $("#ed-text").value = toText(current());
      navigator.clipboard?.writeText($("#ed-text").value).then(
        () => message("Copiado al portapapeles."),
        () => message("No se pudo copiar: selecciona el texto y usa Ctrl+C."),
      );
    } else if (act === "import") {
      try {
        replaceLevel(parse($("#ed-text").value));
        message(`Importado «${data.name}». Ctrl+Z lo deshace.`);
      } catch (err) {
        message(err.message);
      }
    }
  }

  function onMechChange(e) {
    const row = e.target.closest(".mech");
    if (!row) return;
    const id = row.dataset.id;
    const old = data.mechanisms[id];
    const get = (f) => row.querySelector(`[data-f="${f}"]`)?.value;
    history.push(snapshot());
    const def = { trigger: get("trigger") };
    if (get("kind") === "fan") def.kind = "fan";
    else def.move = get("dx") === undefined ? old.move || [0, -3] : [Number(get("dx")) || 0, Number(get("dy")) || 0];
    const need = Number(get("need"));
    if (def.trigger === "button" && need > 1) def.need = need;
    if (old.color) def.color = old.color;
    data.mechanisms[id] = def;
    changed({ panelToo: true });
  }

  function startTest() {
    const found = globalThis.Juego.test(current());
    if (found.length) {
      problems = found;
      renderStatus();
      return;
    }
    document.activeElement?.blur();
    panel.hidden = true;
    globalThis.Juego.fit();
  }

  // --- Lienzo ----------------------------------------------------------------
  function cellOf(e) {
    return globalThis.Juego.cellAt(e.clientX, e.clientY);
  }

  // Pinta desde la última casilla de la pincelada hasta esta, para no dejar huecos si el ratón va rápido.
  function paintAt(cell) {
    if (!cell || !stroke) return;
    const from = stroke.last || cell;
    const steps = Math.max(Math.abs(cell.c - from.c), Math.abs(cell.r - from.r));
    const before = stroke.changed ? null : snapshot();
    let any = false;
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      const c = Math.round(from.c + (cell.c - from.c) * t);
      const r = Math.round(from.r + (cell.r - from.r) * t);
      any = setTile(grid, c, r, stroke.ch) || any;
    }
    stroke.last = cell;
    if (!any) return;
    // El primer cambio de la pincelada guarda el estado para poder deshacerla entera.
    if (before) history.push(before);
    stroke.changed = true;
    changed();
  }

  function onPointerDown(e) {
    if (!isEditing() || (e.button !== 0 && e.button !== 2)) return;
    const cell = cellOf(e);
    if (!cell) return;
    e.preventDefault();
    e.target.setPointerCapture?.(e.pointerId);
    const ch = e.button === 2 ? " " : tool;
    if (e.shiftKey) {
      rectStart = { ...cell, ch };
      hover = cell;
    } else {
      stroke = { ch, changed: false };
      paintAt(cell);
    }
  }

  function onPointerMove(e) {
    if (!isEditing()) return;
    hover = cellOf(e);
    if (stroke) paintAt(hover);
    if (hover) message(`Columna ${hover.c}, fila ${hover.r}${grid[hover.r]?.[hover.c] !== " " ? ` · ${describe(grid[hover.r][hover.c])}` : ""}`);
  }

  function onPointerUp() {
    if (rectStart && hover) {
      const before = snapshot();
      if (fillRect(grid, rectStart.c, rectStart.r, hover.c, hover.r, rectStart.ch)) {
        history.push(before);
        changed();
      }
    }
    rectStart = null;
    stroke = null;
    renderStatus();
  }

  function describe(ch) {
    if (LABELS[ch]) return LABELS[ch];
    const id = ch.toLowerCase();
    const def = data.mechanisms[id];
    if (!def) return `"${ch}" (desconocido)`;
    if (ch === id) return `mecanismo ${id} (${def.kind === "fan" ? "ventilador" : "plataforma"})`;
    return `${def.trigger === "lever" ? "palanca" : "botón"} de ${id}`;
  }

  function onKey(e) {
    if (!isEditing() || e.target.closest?.("input, textarea, select")) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.code === "KeyZ") {
      e.preventDefault();
      undoRedo(e.shiftKey ? "redo" : "undo");
    } else if (mod && e.code === "KeyY") {
      e.preventDefault();
      undoRedo("redo");
    } else if (!mod && e.key.length === 1 && (LABELS[e.key] !== undefined || data.mechanisms[e.key.toLowerCase()])) {
      tool = e.key;
      renderPanel();
    }
  }

  // Encima del mapa: rejilla, letras de los mecanismos, adónde se moverán las plataformas,
  // la casilla señalada y el rectángulo que se está dibujando.
  function drawOverlay(ctx) {
    const T = globalThis.Juego.T;
    const H = grid.length;
    const W = grid[0].length;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < W; c++) {
      ctx.moveTo(c * T + 0.5, 0);
      ctx.lineTo(c * T + 0.5, H * T);
    }
    for (let r = 1; r < H; r++) {
      ctx.moveTo(0, r * T + 0.5);
      ctx.lineTo(W * T, r * T + 0.5);
    }
    ctx.stroke();

    ctx.font = 'bold 11px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const ch = grid[r][c];
        const def = data.mechanisms[ch.toLowerCase()];
        if (!def || !/[a-zA-Z]/.test(ch)) continue;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(c * T + 1, r * T + 1, 11, 12);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(ch, c * T + 3, r * T + 1);
        if (ch === ch.toLowerCase() && def.move && (def.move[0] || def.move[1])) {
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = "rgba(255,255,255,0.45)";
          ctx.strokeRect((c + def.move[0]) * T + 2.5, (r + def.move[1]) * T + 2.5, T - 5, T - 5);
          ctx.setLineDash([]);
        }
      }
    }

    if (rectStart && hover) {
      const c0 = Math.min(rectStart.c, hover.c);
      const r0 = Math.min(rectStart.r, hover.r);
      ctx.fillStyle = "rgba(255,224,138,0.18)";
      ctx.fillRect(c0 * T, r0 * T, (Math.abs(hover.c - rectStart.c) + 1) * T, (Math.abs(hover.r - rectStart.r) + 1) * T);
    }
    if (hover) {
      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 2;
      ctx.strokeRect(hover.c * T + 1, hover.r * T + 1, T - 2, T - 2);
      if (!rectStart && !stroke) {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = COLORS[tool] || "#f2c14e";
        ctx.fillRect(hover.c * T + T - 10, hover.r * T + 4, 6, 6);
      }
    }
    ctx.restore();
  }

  globalThis.Editor = {
    open() {
      if (!panel) {
        build();
        const store = readStore();
        try {
          load(store.draft || blankLevel());
        } catch {
          load(blankLevel());
        }
      }
      panel.hidden = false;
      changed({ panelToo: true });
      globalThis.Juego.fit();
    },
    // Vuelve de probar el nivel.
    resume() {
      panel.hidden = false;
      changed();
      globalThis.Juego.fit();
    },
    close() {
      if (panel) panel.hidden = true;
      hover = null;
    },
    drawOverlay(ctx) {
      if (grid) drawOverlay(ctx);
    },
  };
})();
