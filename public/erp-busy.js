/**
 * Indicador global de actividad del ERP.
 * Se muestra al navegar, enviar formularios o esperar respuestas lentas.
 */
(function () {
  if (window.__ERP_BUSY__) return;
  window.__ERP_BUSY__ = true;

  var pending = 0;
  var navLock = false;
  var hideTimer = 0;
  var netTimer = 0;
  var navSafety = 0;
  var root = null;

  function ensure() {
    if (root && document.body.contains(root)) return root;
    root = document.getElementById("erp-busy");
    if (root) return root;
    root = document.createElement("div");
    root.id = "erp-busy";
    root.setAttribute("aria-live", "polite");
    root.innerHTML =
      '<div class="erp-busy-bar" aria-hidden="true"></div>' +
      '<div class="erp-busy-veil">' +
      '  <div class="erp-busy-card">' +
      '    <span class="erp-busy-spin" aria-hidden="true"></span>' +
      '    <div class="erp-busy-txt">' +
      '      <strong>Cargando</strong>' +
      '      <span>Un momento…</span>' +
      "    </div>" +
      "  </div>" +
      "</div>";
    var style = document.createElement("style");
    /*
     * El aspecto va acá y no en una hoja del proyecto porque este script corre
     * antes de que exista React: cuando aparece, ninguna clase del ERP está
     * cargada todavía.
     *
     * Colores escritos a mano por lo mismo —no hay tokens disponibles— pero son
     * los de la casa: navy #11224E de fondo y el cian del panel como acento. La
     * tarjeta blanca anterior venía del tema claro y sobre el ERP oscuro se veía
     * como un cuadro de diálogo de otra aplicación.
     */
    style.textContent =
      "#erp-busy{position:fixed;inset:0;z-index:2147483646;pointer-events:none;display:none;font-family:'Open Sans',system-ui,sans-serif}" +
      "#erp-busy.is-on{display:block}" +
      "#erp-busy.is-nav{pointer-events:auto}" +
      "#erp-busy .erp-busy-bar{position:absolute;top:0;left:0;height:3px;width:100%;overflow:hidden;background:rgba(0,232,255,.14)}" +
      "#erp-busy .erp-busy-bar:after{content:'';position:absolute;inset:0 auto 0 0;width:38%;background:linear-gradient(90deg,rgba(0,232,255,0),#00e8ff 45%,#7ef0ff);box-shadow:0 0 12px rgba(0,232,255,.65);animation:erp-busy-slide 1.05s ease-in-out infinite}" +
      "#erp-busy .erp-busy-veil{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(5,9,20,.55);backdrop-filter:blur(2px);opacity:0;transition:opacity .15s ease}" +
      "#erp-busy.is-nav .erp-busy-veil{opacity:1}" +
      "#erp-busy .erp-busy-card{display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:16px;border:1px solid rgba(0,232,255,.28);background:linear-gradient(180deg,#0f1c3a,#0b152c);box-shadow:0 24px 60px -20px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.04) inset;color:#f4fbff}" +
      "#erp-busy .erp-busy-txt strong{display:block;font-size:14.5px;font-weight:700;letter-spacing:.01em}" +
      "#erp-busy .erp-busy-txt span{display:block;margin-top:2px;font-size:12.5px;color:#8ec8dc}" +
      "#erp-busy .erp-busy-spin{position:relative;width:26px;height:26px;border-radius:99px;border:2.5px solid rgba(142,200,220,.22);border-top-color:#00e8ff;animation:erp-busy-rot .7s linear infinite;flex:0 0 auto}" +
      "@keyframes erp-busy-slide{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}" +
      "@keyframes erp-busy-rot{to{transform:rotate(360deg)}}" +
      /*
       * Con movimiento reducido, nada gira ni se desliza: el indicador late,
       * que sigue diciendo "esto sigue vivo" sin marear a quien pidió calma.
       */
      "@media (prefers-reduced-motion:reduce){" +
      "#erp-busy .erp-busy-bar:after{animation:none;width:100%}" +
      "#erp-busy .erp-busy-spin{animation:erp-busy-pulse 1.4s ease-in-out infinite;border-top-color:rgba(0,232,255,.9)}" +
      "}" +
      "@keyframes erp-busy-pulse{0%,100%{opacity:.35}50%{opacity:1}}";
    (document.head || document.documentElement).appendChild(style);
    (document.body || document.documentElement).appendChild(root);
    return root;
  }

  function paint() {
    var el = ensure();
    el.classList.toggle("is-on", navLock || pending > 0);
    el.classList.toggle("is-nav", navLock);
    el.setAttribute("aria-busy", navLock || pending > 0 ? "true" : "false");
  }

  function showNav() {
    navLock = true;
    clearTimeout(hideTimer);
    clearTimeout(navSafety);
    navSafety = setTimeout(function () {
      if (navLock) hideNav();
    }, 15000);
    paint();
  }

  function hideNav() {
    navLock = false;
    clearTimeout(navSafety);
    paint();
  }

  function beginNet() {
    pending += 1;
    clearTimeout(netTimer);
    netTimer = setTimeout(paint, 180);
  }

  function endNet() {
    pending = Math.max(0, pending - 1);
    if (pending === 0) {
      clearTimeout(netTimer);
      hideTimer = setTimeout(paint, 120);
    }
  }

  function sameOrigin(href) {
    try {
      var url = new URL(href, location.href);
      return url.origin === location.origin;
    } catch (e) {
      return false;
    }
  }

  function isIgnoredLink(anchor) {
    if (!anchor || !anchor.getAttribute) return true;
    if (anchor.hasAttribute("download")) return true;
    var target = (anchor.getAttribute("target") || "").toLowerCase();
    if (target === "_blank") return true;
    var href = anchor.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" || href.indexOf("javascript:") === 0 || href.indexOf("mailto:") === 0) {
      return true;
    }
    if (!sameOrigin(href)) return true;
    try {
      var next = new URL(href, location.href);
      return next.pathname === location.pathname && next.search === location.search;
    } catch (e) {
      return false;
    }
  }

  function isBackgroundUrl(url, method) {
    var path = String(url || "");
    var verb = String(method || "GET").toUpperCase();
    if (/upsert_sesion_activa|sesiones_activas|notificaciones|visita|rpc\/upsert/i.test(path)) return true;
    if (/\/api\/auth\/(login|signup)/i.test(path)) return true;
    if (verb === "GET" && /supabase\.co|auth\/v1/i.test(path)) return true;
    return false;
  }

  document.addEventListener(
    "click",
    function (event) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!isIgnoredLink(anchor)) showNav();
    },
    true,
  );

  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target && event.target.closest ? event.target.closest("form") : event.target;
      if (form && form.getAttribute && form.getAttribute("data-erp-busy") === "skip") {
        hideNav();
      }
    },
    true,
  );

  document.addEventListener("submit", function (event) {
    var form = event.target && event.target.closest ? event.target.closest("form") : event.target;
    if (form && form.getAttribute && form.getAttribute("data-erp-busy") === "skip") return;
    if (event.defaultPrevented) return;
    showNav();
  });

  window.addEventListener("pageshow", function () {
    hideNav();
  });

  document.addEventListener("astro:hydrate", hideNav);

  function bindIsland() {
    var island = document.querySelector("astro-island");
    if (!island) {
      requestAnimationFrame(bindIsland);
      return;
    }
    island.addEventListener("astro:hydrate", hideNav);
  }
  bindIsland();

  if (typeof fetch === "function") {
    var rawFetch = fetch;
    window.fetch = function () {
      var input = arguments[0];
      var init = arguments[1] || {};
      var url = typeof input === "string" ? input : input && input.url;
      var method = init.method || (input && input.method) || "GET";
      var track = !isBackgroundUrl(url, method);
      if (track) beginNet();
      return rawFetch.apply(this, arguments).finally(function () {
        if (track) endNet();
      });
    };
  }

  window.erpBusy = { show: showNav, hide: hideNav };
})();
