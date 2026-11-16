// Panel «Tu progreso»: enseña el código de progreso (para copiarlo o mandarlo) y carga uno.
// El código lo hace game.js (Juego.progress); aquí solo va la interfaz.
// Un enlace con #progreso=CÓDIGO abre este panel con el código listo para cargar.
(() => {
  const progress = () => globalThis.Juego?.progress;
  if (!progress()) return;

  const panel = document.createElement("div");
  panel.id = "progress-panel";
  panel.className = "overlay-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="box" role="dialog" aria-label="Tu progreso">
      <header><h1>Tu progreso</h1><button data-act="close" title="Cerrar (Esc)">✕</button></header>
      <p class="help">Guarden este código para no perder su progreso o para seguir en otro PC. Lo más fácil: copien el enlace y mándenselo por WhatsApp o correo; al abrirlo en otro PC, el progreso se carga ahí.</p>
      <p class="summary"></p>
      <textarea id="progress-mine" readonly rows="3" spellcheck="false"></textarea>
      <div class="row">
        <button data-act="copy-code" class="primary">Copiar código</button>
        <button data-act="copy-link">Copiar enlace</button>
      </div>
      <p class="label">¿Tienen un código? Péguenlo aquí:</p>
      <textarea id="progress-theirs" rows="3" spellcheck="false" autocomplete="off" placeholder="ACID-…"></textarea>
      <div class="row"><button data-act="load">Cargar</button></div>
      <p class="status"></p>
      <p class="note">Al cargar un código se queda lo mejor de cada nivel: no se pierde nada de lo que ya tengan en este PC.</p>
    </div>`;
  document.body.appendChild(panel);
  const $ = (sel) => panel.querySelector(sel);

  function status(msg) {
    $(".status").textContent = msg;
  }

  function refresh() {
    const { levels, stars } = progress().summary();
    $(".summary").textContent = `En este PC: ${levels} ${levels === 1 ? "nivel terminado" : "niveles terminados"} · ★ ${stars}`;
    $("#progress-mine").value = progress().code();
  }

  const link = () => `${location.origin}${location.pathname}#progreso=${progress().code()}`;

  async function copy(textToCopy, what) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      status(`${what} copiado. Guárdenlo donde no se pierda.`);
    } catch {
      // Sin permiso para el portapapeles: se selecciona para copiarlo a mano.
      const box = $("#progress-mine");
      box.value = textToCopy;
      box.focus();
      box.select();
      status("Ya está seleccionado: cópienlo con Ctrl+C.");
    }
  }

  function load() {
    const result = progress().load($("#progress-theirs").value);
    if (!result.ok) {
      status(result.error);
      return;
    }
    refresh();
    $("#progress-theirs").value = "";
    if (!result.levels) status("El código está bien, pero no trae niveles terminados.");
    else if (!result.improved) status("Listo. Este PC ya tenía todo lo de ese código.");
    else status(`¡Listo! Se cargó el progreso: ${result.improved} ${result.improved === 1 ? "nivel nuevo o mejorado" : "niveles nuevos o mejorados"}.`);
  }

  function open(prefill = "", msg = "") {
    panel.hidden = false;
    refresh();
    $("#progress-theirs").value = prefill;
    status(msg);
  }

  function close() {
    panel.hidden = true;
    document.activeElement?.blur();
  }

  panel.addEventListener("click", (e) => {
    const act = e.target.closest("button")?.dataset.act;
    if (act === "close") close();
    else if (act === "copy-code") copy(progress().code(), "Código");
    else if (act === "copy-link") copy(link(), "Enlace");
    else if (act === "load") load();
  });
  addEventListener("keydown", (e) => {
    if (!panel.hidden && e.key === "Escape") close();
  });

  // ¿Llegaron con un enlace de progreso? Se abre el panel con el código listo y se limpia la dirección.
  const fromLink = location.hash.match(/progreso=([0-9A-Za-z-]+)/);
  if (fromLink) {
    history.replaceState(null, "", location.pathname + location.search);
    open(fromLink[1], "Este enlace trae un progreso guardado. Pulsen «Cargar» para traerlo a este PC.");
  }

  globalThis.Progreso = {
    open: () => open(),
    close,
    get isOpen() {
      return !panel.hidden;
    },
  };
})();
