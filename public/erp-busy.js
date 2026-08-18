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
      '    <div>' +
      '      <strong>Cargando</strong>' +
      '      <span>La aplicación está trabajando…</span>' +
      "    </div>" +
      "  </div>" +
      "</div>";
    var style = document.createElement("style");
    style.textContent =
      "#erp-busy{position:fixed;inset:0;z-index:2147483646;pointer-events:none;display:none}" +
      "#erp-busy.is-on{display:block}" +
      "#erp-busy.is-nav{pointer-events:auto}" +
      "#erp-busy .erp-busy-bar{position:absolute;top:0;left:0;height:3px;width:100%;overflow:hidden;background:rgba(17,34,78,.12)}" +
      "#erp-busy .erp-busy-bar:after{content:'';position:absolute;inset:0 auto 0 0;width:38%;background:#1d4ed8;animation:erp-busy-slide 1.05s ease-in-out infinite}" +
      "#erp-busy .erp-busy-veil{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(12,16,24,.28);opacity:0;transition:opacity .15s ease}" +
      "#erp-busy.is-nav .erp-busy-veil{opacity:1}" +
      "#erp-busy .erp-busy-card{display:flex;align-items:center;gap:12px;min-width:min(320px,calc(100vw - 32px));padding:14px 16px;border-radius:12px;background:#fff;box-shadow:0 18px 40px rgba(0,0,0,.22);color:#11224e;font-family:system-ui,sans-serif}" +
      "#erp-busy .erp-busy-card strong{display:block;font-size:14px;font-weight:650}" +
      "#erp-busy .erp-busy-card span{display:block;margin-top:2px;font-size:12px;color:#5b6578}" +
      "#erp-busy .erp-busy-spin{width:22px;height:22px;border-radius:99px;border:2px solid #dbe4f5;border-top-color:#1d4ed8;animation:erp-busy-rot .7s linear infinite;flex:0 0 auto}" +
      "@keyframes erp-busy-slide{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}" +
      "@keyframes erp-busy-rot{to{transform:rotate(360deg)}}";
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
    paint();
  }

  function hideNav() {
    navLock = false;
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
    function () {
      showNav();
    },
    true,
  );

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) hideNav();
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
  setTimeout(function () {
    if (navLock) hideNav();
  }, 15000);

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
