/* ---------------------------------------------------------------------------
   Cargador web ESP32 + monitor serie
   Componente independiente: no depende de Quarto ni de ningún framework.

   Escribe un binario ya compilado (.bin de Espressif) en la memoria de una
   tarjeta ESP32 desde el propio navegador, usando la API Web Serial, y abre a
   continuación un monitor serie sobre el mismo puerto.

   Uso mínimo:

       <div data-cargador-esp></div>
       <script type="module" src="cargador-esp.js"></script>

   Con programas propios:

       <div data-cargador-esp
            data-programas='[["firmware/dht22.bin","DHT22 · XIAO ESP32-C3"]]'
            data-baudios="9600"></div>

   O desde JavaScript, que permite varias instancias en la misma página:

       import { montar } from "./cargador-esp.js";
       montar("#mi-cargador", { programas: [["fw/blink.bin", "Parpadeo"]] });

   Requisitos del navegador: Chrome o Edge de escritorio, y la página servida
   por https o desde localhost. En cualquier otro caso el componente se muestra
   deshabilitado con un aviso, no falla en silencio.

   Licencia: el mismo uso que el material del que procede.
   --------------------------------------------------------------------------- */

// Versión fijada a propósito: `esptool-js` a secas sirve siempre la última, y
// una versión nueva puede cambiar la interfaz sin aviso. Si alguna vez deja de
// cargar, suba el número aquí o pase otra URL en la opción `esptool`.
const ESPTOOL = "https://unpkg.com/esptool-js@0.7.0/bundle.js";

const POR_OMISION = {
  programas: [],              // [[url, texto], …]  lista del desplegable
  baudios: 9600,              // velocidad del monitor serie
  baudiosCarga: 115200,       // velocidad de la carga; no es la del programa
  mensajeFinal: "El programa ya está en la tarjeta.",
  esptool: ESPTOOL,
  titulo: "Cargador web",
  subtitulo: "transfiere un programa ya compilado a la tarjeta, sin abrir el entorno de desarrollo",
  tituloMonitor: "Monitor serie",
  subtituloMonitor: "muestra lo que la tarjeta escribe por el puerto, sin abrir el entorno",
  velocidades: [9600, 19200, 38400, 57600, 115200],
  css: true,                  // false si prefiere enlazar la hoja usted mismo
  plotter: false,             // true para mostrar el osciloscopio / graficador en tiempo real
};

// --- la hoja de estilo viaja al lado del módulo ------------------------------
function estilo() {
  const href = new URL("./cargador-esp.css", import.meta.url).href;
  if (document.querySelector(`link[data-cargador-esp-css]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  l.setAttribute("data-cargador-esp-css", "");
  document.head.appendChild(l);
}

const PLANTILLA = (o) => `
  <div class="cg-cab">
    <span class="cg-tit">${o.titulo}</span>
    <span class="cg-sub">${o.subtitulo}</span>
  </div>

  <div class="cg-aviso" data-cg="sinSoporte" hidden>
    Este navegador no permite hablar con el puerto serie. El cargador necesita
    <strong>Chrome</strong> o <strong>Edge</strong> de escritorio, y que la página se
    abra por <code>https</code> o desde <code>localhost</code>.
  </div>

  <div class="cg-cuerpo">
    <label class="cg-campo">
      <span>1 · Programa</span>
      <select data-cg="firmware"></select>
    </label>
    <label class="cg-campo">
      <span>o un archivo propio</span>
      <input type="file" data-cg="archivo" accept=".bin">
    </label>
    <button type="button" class="cg-btn" data-cg="flash">2 · Conectar y cargar</button>
  </div>

  <div class="cg-barra" data-cg="barra" hidden><span data-cg="relleno"></span></div>
  <div class="cg-resultado" data-cg="resultado" hidden>
    <span class="cg-icono" data-cg="icono"></span>
    <span><strong data-cg="tituloRes"></strong><br><span data-cg="detalle"></span></span>
  </div>
  <pre class="cg-consola" data-cg="consola" hidden></pre>

  <div class="cg-cab cg-cab2">
    <span class="cg-tit">${o.tituloMonitor}</span>
    <span class="cg-sub">${o.subtituloMonitor}</span>
  </div>

  <div class="cg-cuerpo">
    <label class="cg-campo cg-corto">
      <span>Velocidad</span>
      <select data-cg="baudios">
        ${o.velocidades.map((v) => `<option value="${v}">${v} baudios</option>`).join("")}
      </select>
    </label>
    <button type="button" class="cg-btn" data-cg="abrir">Abrir el monitor</button>
    <button type="button" class="cg-btn cg-btn2" data-cg="cerrar" disabled>Cerrar</button>
    <button type="button" class="cg-btn cg-btn2" data-cg="limpiar">Limpiar</button>
  </div>

  <pre class="cg-consola cg-serie" data-cg="salida" hidden></pre>

  <div class="cg-plotter-wrap" data-cg="plotterWrap" ${o.plotter ? "" : "hidden"} style="padding: 0 .95rem .95rem;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size:0.85rem;">
      <span style="font-weight:600; color:var(--cg-primario);">📈 Graficador Serial (Osciloscopio Acústico PDM en Tiempo Real)</span>
      <span data-cg="plotterVal" style="font-family:monospace; color:var(--cg-apagado); font-size:0.8rem;">Muestra: --</span>
    </div>
    <canvas data-cg="canvasPlotter" width="800" height="180" style="width:100%; height:180px; background:#0d1117; border-radius:6px; border:1px solid #30363d; display:block;"></canvas>
  </div>
`;

// La cabecera del binario dice para qué chip y con cuánta memoria se compiló.
// Sirve para no escribir en una tarjeta una imagen de otra, que la dejaría sin
// arrancar.
const CHIPS = { 0: "ESP32", 2: "ESP32-S2", 5: "ESP32-C3", 9: "ESP32-S3",
                12: "ESP32-C2", 13: "ESP32-C6", 16: "ESP32-H2" };
const TAMANOS = { 0: "1MB", 1: "2MB", 2: "4MB", 3: "8MB", 4: "16MB", 5: "32MB" };

function cabecera(buf) {
  const b = new Uint8Array(buf);
  if (b[0] !== 0xe9) return null;                 // no es una imagen de Espressif
  return {
    chip: CHIPS[b[12] | (b[13] << 8)] || "desconocido",
    flash: TAMANOS[b[3] >> 4] || "keep",
  };
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Monta el componente dentro de un elemento.
 * @param {Element|string} donde  elemento o selector
 * @param {object} opciones       ver POR_OMISION
 * @returns {object} API con { cerrarMonitor, elemento }
 */
export function montar(donde, opciones = {}) {
  const raiz = typeof donde === "string" ? document.querySelector(donde) : donde;
  if (!raiz) throw new Error("cargador-esp: no existe el elemento " + donde);
  if (raiz.dataset.cgListo) return raiz._cargadorESP;      // ya montado

  const o = Object.assign({}, POR_OMISION, opciones);
  if (o.css) estilo();

  raiz.classList.add("cargador-esp");
  raiz.innerHTML = PLANTILLA(o);
  raiz.dataset.cgListo = "1";

  const el = (n) => raiz.querySelector(`[data-cg="${n}"]`);
  const consola = el("consola"), barra = el("barra"), relleno = el("relleno");
  const boton = el("flash"), lista = el("firmware"), propio = el("archivo");
  const panel = el("resultado");
  const salida = el("salida"), selBaud = el("baudios");
  const btnAbrir = el("abrir"), btnCerrar = el("cerrar"), btnLimpiar = el("limpiar");
  const canvasPlotter = el("canvasPlotter"), plotterVal = el("plotterVal");

  const MAX_MUESTRAS = 300;
  const bufferMuestras = new Float32Array(MAX_MUESTRAS);
  let indiceMuestras = 0;
  let totalMuestras = 0;
  let ultimaAmplitud = 0;
  let decimar = 0;
  let animandoPlotter = false;

  function dibujarPlotter() {
    if (!canvasPlotter || !o.plotter) return;
    const ctx = canvasPlotter.getContext("2d");
    const w = canvasPlotter.width;
    const h = canvasPlotter.height;

    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, w, h);

    // Rejilla de fondo
    ctx.strokeStyle = "#161b22";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y < h; y += 30) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();

    // Eje cero central
    ctx.strokeStyle = "#30363d";
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (totalMuestras === 0) return;
    if (plotterVal) plotterVal.textContent = "Amplitud: " + ultimaAmplitud;

    const n = Math.min(totalMuestras, MAX_MUESTRAS);
    if (n < 2) return;

    const inicio = totalMuestras < MAX_MUESTRAS ? 0 : indiceMuestras;
    let min = bufferMuestras[0];
    let max = bufferMuestras[0];
    for (let i = 0; i < n; i++) {
      const v = bufferMuestras[(inicio + i) % MAX_MUESTRAS];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const margen = Math.max(Math.abs(max), Math.abs(min), 100) * 1.15;

    ctx.strokeStyle = "#00d26a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const pasoX = w / (MAX_MUESTRAS - 1);
    const offsetInicio = MAX_MUESTRAS - n;

    for (let i = 0; i < n; i++) {
      const v = bufferMuestras[(inicio + i) % MAX_MUESTRAS];
      const x = (offsetInicio + i) * pasoX;
      const y = (h / 2) - ((v / margen) * (h / 2));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function loopPlotter() {
    if (!leyendo || !o.plotter) {
      animandoPlotter = false;
      return;
    }
    animandoPlotter = true;
    dibujarPlotter();
    requestAnimationFrame(loopPlotter);
  }

  if (o.plotter) dibujarPlotter();

  for (const [valor, texto] of o.programas) {
    const op = document.createElement("option");
    op.value = valor;
    op.textContent = texto;
    lista.appendChild(op);
  }
  if (!o.programas.length) {
    const op = document.createElement("option");
    op.value = "";
    op.textContent = "— elija un archivo propio —";
    lista.appendChild(op);
  }
  selBaud.value = String(o.baudios);

  const log = (t) => {
    consola.hidden = false;
    consola.textContent += t + "\n";
    consola.scrollTop = consola.scrollHeight;
  };

  function resultado(ok, titulo, detalle) {
    panel.className = "cg-resultado " + (ok ? "cg-ok" : "cg-mal");
    el("icono").textContent = ok ? "✓" : "!";
    el("tituloRes").textContent = titulo;
    el("detalle").textContent = detalle;
    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (!("serial" in navigator)) {
    el("sinSoporte").hidden = false;
    boton.disabled = true;
    btnAbrir.disabled = true;
  }

  async function binario() {
    const f = propio.files[0];
    if (f) {
      log("Archivo propio: " + f.name);
      return await f.arrayBuffer();
    }
    const url = lista.value;
    if (!url) throw new Error("no hay ningún programa elegido: suba un archivo .bin");
    log("Descargando " + url.split("/").pop() + " …");
    const r = await fetch(url);
    if (!r.ok) throw new Error("no se pudo descargar el programa (" + r.status + ")");
    return await r.arrayBuffer();
  }

  // El puerto se pide una sola vez y lo comparten el cargador y el monitor:
  // si cada uno abriera el suyo, el segundo encontraría el puerto ocupado.
  let puerto = null, lector = null, leyendo = false;

  async function pedirPuerto() {
    if (!puerto) {
      try {
        const autorizados = await navigator.serial.getPorts();
        if (autorizados.length > 0) {
          puerto = autorizados[0];
        }
      } catch (e) { /* navegador sin soporte getPorts */ }
    }
    if (!puerto) {
      puerto = await navigator.serial.requestPort();
    }
    return puerto;
  }

  let textoPendiente = "";
  let timerTexto = null;

  function escribirSerie(t) {
    textoPendiente += t + "\n";
    if (!timerTexto) {
      timerTexto = setTimeout(() => {
        if (salida && textoPendiente) {
          salida.hidden = false;
          const total = salida.textContent + textoPendiente;
          salida.textContent = total.length > 5000 ? total.slice(-3500) : total;
          salida.scrollTop = salida.scrollHeight;
        }
        textoPendiente = "";
        timerTexto = null;
      }, 100);
    }
  }

  async function bucleLectura() {
    const dec = new TextDecoder();
    let resto = "";
    if (o.plotter && !animandoPlotter) loopPlotter();

    try {
      lector = puerto.readable.getReader();
      while (leyendo) {
        const { value, done } = await lector.read();
        if (done) break;
        resto += dec.decode(value, { stream: true });
        const partes = resto.split(/\r?\n/);
        resto = partes.pop();

        for (let i = 0; i < partes.length; i++) {
          const l = partes[i];
          if (!l) continue;

          if (o.plotter) {
            const v = parseFloat(l.trim());
            if (!isNaN(v)) {
              decimar++;
              // Tomar 1 de cada 4 muestras para optimizar ancho de banda de refresco
              if (decimar >= 4) {
                decimar = 0;
                bufferMuestras[indiceMuestras] = v;
                indiceMuestras = (indiceMuestras + 1) % MAX_MUESTRAS;
                totalMuestras++;
                ultimaAmplitud = v;
              }
            }
          }
          escribirSerie(l);
        }

        // Ceder el hilo de ejecución para que la interfaz nunca se congele
        if (partes.length > 30) {
          await dormir(4);
        }
      }
    } catch (e) {
      if (leyendo) escribirSerie("[error de lectura: " + (e.message || e) + "]");
    } finally {
      try { if (lector) lector.releaseLock(); } catch (e) { /* ya suelto */ }
      lector = null;
    }
  }

  async function reiniciarTarjeta() {
    try {
      await puerto.setSignals({ dataTerminalReady: false, requestToSend: true });
      await dormir(120);
      await puerto.setSignals({ dataTerminalReady: false, requestToSend: false });
      await dormir(50);
    } catch (e) { /* algunos adaptadores no permiten control DTR/RTS */ }
  }

  async function abrirMonitor(baud, reiniciar) {
    if (leyendo) await cerrarMonitor();
    await pedirPuerto();
    if (!puerto.readable) {
      try {
        await puerto.open({ baudRate: baud, bufferSize: 8192 });
      } catch (err) {
        puerto = null;
        throw err;
      }
    }
    if (reiniciar) await reiniciarTarjeta();
    leyendo = true;
    btnAbrir.disabled = true;
    btnCerrar.disabled = false;
    escribirSerie("[puerto abierto a " + baud + " baudios]");
    bucleLectura();
  }

  async function cerrarMonitor() {
    leyendo = false;
    animandoPlotter = false;
    if (timerTexto) {
      clearTimeout(timerTexto);
      timerTexto = null;
      if (salida && textoPendiente) {
        salida.textContent += textoPendiente;
        textoPendiente = "";
      }
    }
    try {
      if (lector) {
        await lector.cancel();
        lector.releaseLock();
      }
    } catch (e) { /* ya cancelado */ }
    lector = null;
    await dormir(80);
    try {
      if (puerto && puerto.readable) await puerto.close();
    } catch (e) { /* ya cerrado */ }
    puerto = null;
    btnAbrir.disabled = false;
    btnCerrar.disabled = true;
  }

  btnAbrir.addEventListener("click", async () => {
    btnAbrir.disabled = true;
    try {
      await abrirMonitor(Number(selBaud.value), false);
    } catch (e) {
      btnAbrir.disabled = false;
      escribirSerie("[no se pudo abrir el puerto: " + (e.message || e) + "]");
    }
  });

  btnCerrar.addEventListener("click", async () => {
    await cerrarMonitor();
    escribirSerie("[puerto cerrado]");
  });

  btnLimpiar.addEventListener("click", () => {
    salida.textContent = "";
    textoPendiente = "";
    bufferMuestras.fill(0);
    totalMuestras = 0;
    indiceMuestras = 0;
    if (o.plotter) {
      dibujarPlotter();
      if (plotterVal) plotterVal.textContent = "Muestra: --";
    }
  });

  selBaud.addEventListener("change", async () => {
    if (!leyendo) return;
    await cerrarMonitor();
    await abrirMonitor(Number(selBaud.value), false);
  });

  boton.addEventListener("click", async () => {
    boton.disabled = true;
    consola.textContent = "";
    consola.hidden = false;
    relleno.style.width = "0";
    barra.hidden = true;
    panel.hidden = true;
    try {
      const bin = await binario();
      const cab = cabecera(bin);
      if (!cab) throw new Error("el archivo no parece una imagen de Espressif (no empieza por 0xE9)");
      log("El programa es para " + cab.chip + ", memoria de " + cab.flash + ".");

      if (leyendo) {
        log("Cerrando el monitor para dejar libre el puerto…");
        await cerrarMonitor();
      }

      const { ESPLoader } = await import(/* @vite-ignore */ o.esptool);
      log("Elija el puerto de la tarjeta en la ventana del navegador…");
      const port = await pedirPuerto();
      if (port.readable) { try { await port.close(); } catch (e) { /* ya cerrado */ } }

      const esploader = new ESPLoader({ port, baudrate: o.baudiosCarga });
      log("Conectando con la tarjeta…");
      const detectado = await esploader.connect();
      await esploader.runStub();
      const nombre = (detectado || (esploader.chip && esploader.chip.CHIP_NAME) || "").toString();
      if (nombre) log("Tarjeta detectada: " + nombre + ".");

      // No se escribe una imagen de otro chip: dejaría la tarjeta sin arrancar.
      const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (nombre && cab.chip !== "desconocido" && !norm(nombre).includes(norm(cab.chip))) {
        throw new Error("el programa es para " + cab.chip + " y la tarjeta conectada es "
          + nombre + ". Escribirlo la dejaría sin arrancar. Elija el archivo que corresponde.");
      }

      barra.hidden = false;
      log("Escribiendo en la memoria… no desconecte la tarjeta.");
      await esploader.writeFlash({
        fileArray: [{ data: new Uint8Array(bin), address: 0x00000 }],
        flashSize: cab.flash,
        compress: true,
        reportProgress: (i, escrito, total) => {
          relleno.style.width = Math.round((escrito * 100) / total) + "%";
        },
      });
      relleno.style.width = "100%";
      log("Carga completa.");

      // Se suelta el puerto y se vuelve a abrir para leer lo que escribe el programa.
      for (const f of [
        () => esploader.hardReset && esploader.hardReset(),
        () => esploader.transport && esploader.transport.disconnect && esploader.transport.disconnect(),
        () => esploader.disconnect && esploader.disconnect(),
      ]) {
        try { await f(); } catch (e) { /* no todas las versiones tienen las tres */ }
      }
      try { if (puerto && puerto.readable) await puerto.close(); } catch (e) { /* ya cerrado */ }
      puerto = port;
      await dormir(300);

      let aviso = "";
      try {
        await abrirMonitor(Number(selBaud.value), true);
        log("Monitor serie abierto a " + selBaud.value + " baudios.");
      } catch (e) {
        aviso = " Abra el monitor con el botón de abajo para ver la salida.";
        log("No se pudo abrir el monitor solo: " + (e.message || e));
      }

      resultado(true, "Carga completa", o.mensajeFinal + aviso);
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      log("Error: " + msg);
      resultado(false, "No se pudo cargar", msg
        + " · Revise que la tarjeta esté conectada y que ninguna otra aplicación tenga "
        + "abierto el puerto, el monitor serie del entorno, por ejemplo.");
    } finally {
      boton.disabled = false;
    }
  });

  raiz._cargadorESP = { elemento: raiz, cerrarMonitor, opciones: o };
  return raiz._cargadorESP;
}

// --- montaje automático ------------------------------------------------------
// Cualquier elemento con data-cargador-esp se monta solo. La configuración sale
// de sus atributos data-*, y si no, de window.CARGADOR_ESP.
function desdeAtributos(nodo) {
  const d = nodo.dataset;
  const o = Object.assign({}, window.CARGADOR_ESP || {});
  if (d.programas) {
    try { o.programas = JSON.parse(d.programas); }
    catch (e) { console.error("cargador-esp: data-programas no es JSON válido", e); }
  }
  if (d.baudios) o.baudios = Number(d.baudios);
  if (d.mensajeFinal) o.mensajeFinal = d.mensajeFinal;
  if (d.esptool) o.esptool = d.esptool;
  if (d.plotter !== undefined) o.plotter = d.plotter === "true" || d.plotter === "";
  return o;
}

function auto() {
  for (const nodo of document.querySelectorAll("[data-cargador-esp]")) {
    try { montar(nodo, desdeAtributos(nodo)); }
    catch (e) { console.error(e); }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", auto);
} else {
  auto();
}

export default { montar };
