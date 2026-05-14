/**
 * Mapa de cámara frigorífica — LA TORRE 2026 (Fruitstone)
 *
 * 12 bandas horizontales (B), profundidad P (P1 fondo). B1 máx. 3 P.
 * Varios huecos por lote: bandas_camara = "B2-P1+B5-P3" (separador +).
 * BD: una celda → camara_banda / camara_posicion / camara_altura rellenos;
 * varias celdas → esos campos NULL y solo bandas_camara con +.
 *
 * Expone window.LaTorreCamaraMap.
 */
(function (global) {
  "use strict";

  var CONFIG = {
    horizontalCount: 12,
    firstBandMaxDepth: 3,
    minVerticalSlots: 4,
    maxVerticalSlots: 32,
    heights: 1
  };

  var GHOST_ID = "__draft__";

  /** Comparación estable de ids (número, string o BigInt desde Supabase/JSON). */
  function idsEqual(a, b) {
    if (a == null || b == null) return a == null && b == null;
    return String(a) === String(b);
  }

  function maxDepthForHorizontal(p) {
    if (p === 1 && CONFIG.firstBandMaxDepth > 0) {
      return CONFIG.firstBandMaxDepth;
    }
    return CONFIG.maxVerticalSlots;
  }

  function isCellInLayout(b, p) {
    return b >= 1 && p >= 1 && p <= CONFIG.horizontalCount && b <= maxDepthForHorizontal(p);
  }

  function slotKey(b, p, h) {
    if (CONFIG.heights <= 1) {
      return "B" + p + "-P" + b;
    }
    var hh = h != null ? h : 1;
    return "B" + p + "-P" + b + "-H" + hh;
  }

  function parseStructured(row) {
    var b = row.camara_banda != null ? Number(row.camara_banda) : row.camaraBanda != null ? Number(row.camaraBanda) : NaN;
    var p = row.camara_posicion != null ? Number(row.camara_posicion) : row.camaraPosicion != null ? Number(row.camaraPosicion) : NaN;
    var h = row.camara_altura != null ? Number(row.camara_altura) : row.camaraAltura != null ? Number(row.camaraAltura) : NaN;
    if (CONFIG.heights <= 1 && (!Number.isFinite(h) || h < 1)) {
      h = 1;
    }
    if (Number.isFinite(b) && Number.isFinite(p) && Number.isFinite(h) && b > 0 && p > 0 && h > 0) {
      return { b: b, p: p, h: h };
    }
    return null;
  }

  /**
   * Formato histórico banda(posición): banda = columna B1…B12; posición = profundidad P desde el fondo (1 = fondo).
   * Interno: b = profundidad (fila P), p = banda (columna B), igual que parseBpHText.
   */
  function parseLegacyBandas(str) {
    if (!str || typeof str !== "string") return null;
    var m = str.trim().match(/^(\d+)\s*\(\s*(\d+)\s*\)\s*$/);
    if (!m) return null;
    var band = Number(m[1]);
    var depth = Number(m[2]);
    if (!Number.isFinite(band) || !Number.isFinite(depth) || band < 1 || depth < 1) return null;
    return { b: depth, p: band, h: 1 };
  }

  function parseBpHText(str) {
    if (!str || typeof str !== "string") return null;
    var m = str.trim().match(/^B(\d+)\s*-\s*P(\d+)(?:\s*-\s*H(\d+))?$/i);
    if (!m) return null;
    var hor = Number(m[1]);
    var ver = Number(m[2]);
    var h = m[3] ? Number(m[3]) : 1;
    return { b: ver, p: hor, h: h };
  }

  function parseSlotFromRow(row) {
    var all = parseAllSlotsFromRow(row);
    return all.length ? all[0] : null;
  }

  function inGridBounds(c) {
    return (
      c &&
      c.b >= 1 &&
      c.p >= 1 &&
      c.p <= CONFIG.horizontalCount &&
      c.b <= maxDepthForHorizontal(c.p) &&
      c.h >= 1 &&
      c.h <= CONFIG.heights
    );
  }

  function keyOf(c) {
    return c.b + "," + c.p + "," + c.h;
  }

  function slotsEqual(a, b) {
    return a && b && a.b === b.b && a.p === b.p && a.h === b.h;
  }

  /** Todas las celdas B-P del registro (texto con + y/o columnas estructuradas). */
  function parseAllSlotsFromRow(row) {
    var seen = {};
    var out = [];
    function add(c) {
      if (!c || !inGridBounds(c)) return;
      var k = keyOf(c);
      if (seen[k]) return;
      seen[k] = true;
      out.push({ b: c.b, p: c.p, h: c.h });
    }
    var text = String(row.bandas_camara || row.bandasCamara || "").trim();
    if (text.indexOf("+") >= 0) {
      var parts = text.split("+");
      for (var i = 0; i < parts.length; i++) {
        var seg = parts[i].trim();
        if (!seg) continue;
        var c = parseBpHText(seg) || parseLegacyBandas(seg);
        add(c);
      }
      return out;
    }
    if (text) {
      var c1 = parseBpHText(text) || parseLegacyBandas(text);
      add(c1);
    }
    add(parseStructured(row));
    return out;
  }

  /** Texto canónico para bandas_camara (orden B, luego P). */
  function encodeSlotsText(slots) {
    if (!slots || !slots.length) return "";
    var copy = slots.slice().sort(function (a, b) {
      if (a.p !== b.p) return a.p - b.p;
      if (a.b !== b.b) return a.b - b.b;
      return a.h - b.h;
    });
    var parts = [];
    for (var i = 0; i < copy.length; i++) {
      parts.push(slotKey(copy[i].b, copy[i].p, copy[i].h));
    }
    return parts.join("+");
  }

  function maxOccupiedVertical(rows) {
    var maxB = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.procesado) continue;
      var slots = parseAllSlotsFromRow(row);
      for (var j = 0; j < slots.length; j++) {
        if (slots[j].b > maxB) maxB = slots[j].b;
      }
    }
    return maxB;
  }

  function computeRowCount(rows, mode) {
    var maxB = maxOccupiedVertical(rows);
    var want = Math.max(CONFIG.minVerticalSlots, maxB);
    if (mode === "pick") {
      want = Math.max(want, maxB + 1);
    }
    if (want > CONFIG.maxVerticalSlots) want = CONFIG.maxVerticalSlots;
    return want;
  }

  /**
   * Mapa de ocupación real (solo BD).
   */
  function buildSlotMap(rows) {
    var map = new Map();
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.procesado) continue;
      var slots = parseAllSlotsFromRow(row);
      for (var j = 0; j < slots.length; j++) {
        var c = slots[j];
        if (!inGridBounds(c)) continue;
        var k = keyOf(c);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(row);
      }
    }
    return map;
  }

  /**
   * Mapa para elegir celdas: fila excludeId usa solo editingDraftSlots;
   * si excludeId es null, editingDraftSlots se añaden como ocupación fantasma (nuevo lote).
   */
  function buildSlotMapForPick(rows, excludeId, editingDraftSlots) {
    var draft = editingDraftSlots || [];
    var map = new Map();
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.procesado) continue;
      var slots;
      if (excludeId != null && idsEqual(row.id, excludeId)) {
        slots = draft.slice();
      } else {
        slots = parseAllSlotsFromRow(row);
      }
      for (var j = 0; j < slots.length; j++) {
        var c = slots[j];
        if (!inGridBounds(c)) continue;
        var k = keyOf(c);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(row);
      }
    }
    if (excludeId == null && draft.length) {
      var ghost = { id: GHOST_ID, lote: "", variedad: "", productor: "", procesado: false };
      for (var d = 0; d < draft.length; d++) {
        var c = draft[d];
        if (!inGridBounds(c)) continue;
        var k2 = keyOf(c);
        var list = map.get(k2) || [];
        var hasReal = false;
        for (var z = 0; z < list.length; z++) {
          if (String(list[z].id) !== GHOST_ID) {
            hasReal = true;
            break;
          }
        }
        if (!hasReal) {
          if (!map.has(k2)) map.set(k2, []);
          map.get(k2).push(ghost);
        }
      }
    }
    return map;
  }

  function occupantAt(slotMap, b, p, h, excludeId) {
    var list = slotMap.get(b + "," + p + "," + h) || [];
    if (excludeId == null) return list[0] || null;
    for (var i = 0; i < list.length; i++) {
      if (!idsEqual(list[i].id, excludeId)) return list[i];
    }
    return null;
  }

  function isFree(slotMap, b, p, h, excludeId) {
    return !occupantAt(slotMap, b, p, h, excludeId);
  }

  function hasDepthSupport(slotMap, b, p, excludeId) {
    if (b <= 1) return true;
    return !!occupantAt(slotMap, b - 1, p, 1, excludeId);
  }

  /** P(n) requiere P(n-1) en la misma banda: mapa otra fila, otra celda del mismo borrador, o el mismo intento de selección (trial). */
  function hasDepthSupportWithDraft(slotMap, b, p, excludeId, fullDraft) {
    if (b <= 1) return true;
    if (occupantAt(slotMap, b - 1, p, 1, excludeId)) return true;
    if (fullDraft && fullDraft.length) {
      var targetB = b - 1;
      for (var i = 0; i < fullDraft.length; i++) {
        var d = fullDraft[i];
        var db = Number(d.b);
        var dp = Number(d.p);
        var dh = d.h != null ? Number(d.h) : 1;
        if (db === targetB && dp === p && dh === 1) return true;
      }
    }
    return false;
  }

  /**
   * fullDraftForDepth: si viene, la regla de profundidad también cuenta celdas del borrador (selección múltiple / clic en curso).
   */
  function canSelect(slotMap, b, p, h, excludeId, fullDraftForDepth) {
    if (!isCellInLayout(b, p)) return false;
    if (!isFree(slotMap, b, p, h, excludeId)) return false;
    var depthOk =
      fullDraftForDepth && fullDraftForDepth.length
        ? hasDepthSupportWithDraft(slotMap, b, p, excludeId, fullDraftForDepth)
        : hasDepthSupport(slotMap, b, p, excludeId);
    if (!depthOk) return false;
    if (CONFIG.heights <= 1) return true;
    if (h === 1) return true;
    if (h === 2) {
      if (occupantAt(slotMap, b, p, 1, excludeId)) return true;
      if (fullDraftForDepth && fullDraftForDepth.length) {
        for (var j = 0; j < fullDraftForDepth.length; j++) {
          var e = fullDraftForDepth[j];
          if (Number(e.b) === b && Number(e.p) === p && Number(e.h != null ? e.h : 1) === 1) return true;
        }
      }
      return false;
    }
    return false;
  }

  /** Códigos: layout | ocupada | profundidad | h2 | null = ok */
  function whyCannotSelect(slotMap, b, p, h, excludeId, fullDraftForDepth) {
    if (!isCellInLayout(b, p)) return "layout";
    if (!isFree(slotMap, b, p, h, excludeId)) return "ocupada";
    var depthOk =
      fullDraftForDepth && fullDraftForDepth.length
        ? hasDepthSupportWithDraft(slotMap, b, p, excludeId, fullDraftForDepth)
        : hasDepthSupport(slotMap, b, p, excludeId);
    if (!depthOk) return "profundidad";
    if (CONFIG.heights > 1 && h > 1) {
      var h1 = !!occupantAt(slotMap, b, p, 1, excludeId);
      if (!h1 && fullDraftForDepth && fullDraftForDepth.length) {
        for (var jj = 0; jj < fullDraftForDepth.length; jj++) {
          var ee = fullDraftForDepth[jj];
          if (Number(ee.b) === b && Number(ee.p) === p && Number(ee.h != null ? ee.h : 1) === 1) {
            h1 = true;
            break;
          }
        }
      }
      if (!h1) return "h2";
    }
    return null;
  }

  function slotListIncludes(list, c) {
    for (var i = 0; i < list.length; i++) {
      if (slotsEqual(list[i], c)) return true;
    }
    return false;
  }

  /** Cada celda del borrador debe ser colocable teniendo el resto del borrador ya ocupado. */
  function validateDraftSlots(rows, excludeId, draft) {
    if (!draft || !draft.length) return false;
    var seen = {};
    for (var i = 0; i < draft.length; i++) {
      var k = keyOf(draft[i]);
      if (seen[k]) return false;
      seen[k] = true;
    }
    for (var j = 0; j < draft.length; j++) {
      var cand = draft[j];
      var others = [];
      for (var t = 0; t < draft.length; t++) {
        if (t !== j) others.push(draft[t]);
      }
      var sm = buildSlotMapForPick(rows, excludeId, others);
      if (!canSelect(sm, cand.b, cand.p, cand.h, null, draft)) return false;
    }
    return true;
  }

  /** Si el borrador no es válido, devuelve { code, b, p, h }; si no, null. */
  function explainDraftInvalidity(rows, excludeId, draft) {
    if (!draft || !draft.length) return { code: "vacio", b: 0, p: 0, h: 1 };
    var seen = {};
    for (var i = 0; i < draft.length; i++) {
      var k = keyOf(draft[i]);
      if (seen[k]) return { code: "dup", b: draft[i].b, p: draft[i].p, h: draft[i].h };
      seen[k] = true;
    }
    for (var j = 0; j < draft.length; j++) {
      var cand = draft[j];
      var others = [];
      for (var t = 0; t < draft.length; t++) {
        if (t !== j) others.push(draft[t]);
      }
      var sm = buildSlotMapForPick(rows, excludeId, others);
      if (!canSelect(sm, cand.b, cand.p, cand.h, null, draft)) {
        var code = whyCannotSelect(sm, cand.b, cand.p, cand.h, null, draft) || "desconocido";
        return { code: code, b: cand.b, p: cand.p, h: cand.h };
      }
    }
    return null;
  }

  function labelRow(r) {
    var lot = (r.lote || "").trim() || "—";
    var varr = (r.variedad || "").trim() || "—";
    var prod = (r.productor || "").trim();
    return { lot: lot, varr: varr, prod: prod };
  }

  var lastDraft = null;

  function slotInSelection(selection, b, p, h) {
    if (!selection || !selection.length) return false;
    for (var i = 0; i < selection.length; i++) {
      var s = selection[i];
      if (Number(s.b) === b && Number(s.p) === p && Number(s.h) === h) return true;
    }
    return false;
  }

  function render(container, rows, options) {
    options = options || {};
    var mode = options.mode === "pick" ? "pick" : "view";
    var excludeId = options.excludeId != null ? options.excludeId : null;
    var multiSelect = options.multiSelect === true;
    var selection = options.selection || (options.highlight ? [options.highlight] : []);
    var editingDraftSlots = options.editingDraftSlots != null ? options.editingDraftSlots : null;
    var slotMap =
      mode === "pick"
        ? buildSlotMapForPick(rows, excludeId, editingDraftSlots != null ? editingDraftSlots : selection)
        : buildSlotMap(rows);
    var rowCount = computeRowCount(rows, mode);

    container.replaceChildren();
    var root = document.createElement("div");
    root.className = "lt-fridge-root";

    var head = document.createElement("div");
    head.className = "lt-fridge-legend";
    var leg =
      '<span class="lt-leg lt-leg-free">Libre</span>' +
      '<span class="lt-leg lt-leg-occ">Ocupado</span>' +
      '<span class="lt-leg lt-leg-depth">Profundidad: P1 fondo → puerta al final de B1 (P' +
      CONFIG.firstBandMaxDepth +
      " en B1). P(n) solo si hay pallet en P(n-1) en la misma B</span>" +
      '<span class="lt-leg lt-leg-b1">B1: máx. ' +
      CONFIG.firstBandMaxDepth +
      " posiciones</span>";
    if (mode === "pick" && multiSelect) {
      leg += '<span class="lt-leg lt-leg-multi">Selección múltiple: pulse varias celdas; pulse de nuevo una elegida para quitarla</span>';
    }
    if (CONFIG.heights > 1) {
      leg += '<span class="lt-leg lt-leg-dbl">Apilado H1+H2 (misma celda)</span>';
    }
    head.innerHTML = leg;
    root.appendChild(head);

    var grid = document.createElement("div");
    grid.className = "lt-fridge-grid";
    grid.style.gridTemplateColumns = "44px repeat(" + CONFIG.horizontalCount + ", minmax(0, 1fr))";

    var corner = document.createElement("div");
    corner.className = "lt-fridge-corner";
    corner.textContent = "P \\ B";
    grid.appendChild(corner);

    for (var col = 1; col <= CONFIG.horizontalCount; col++) {
      var ph = document.createElement("div");
      ph.className = "lt-fridge-colhead" + (col === 1 ? " lt-fridge-colhead--b1" : "");
      ph.textContent = col === 1 ? "B1 (×" + CONFIG.firstBandMaxDepth + ")" : "B" + col;
      if (col === 1) {
        ph.title =
          "Primera banda: solo " +
          CONFIG.firstBandMaxDepth +
          " posiciones en profundidad. Puerta de acceso al final de esta banda.";
      }
      grid.appendChild(ph);
    }

    for (var b = 1; b <= rowCount; b++) {
      var bh = document.createElement("div");
      bh.className = "lt-fridge-rowhead";
      bh.textContent = "P" + b + (b === 1 ? " · fondo" : b === rowCount ? " · cara acceso" : "");
      grid.appendChild(bh);

      for (var pos = 1; pos <= CONFIG.horizontalCount; pos++) {
        var cell = document.createElement("div");
        cell.className = "lt-fridge-cell";

        var occH1 = occupantAt(slotMap, b, pos, 1, excludeId);
        var occH2 = CONFIG.heights > 1 ? occupantAt(slotMap, b, pos, 2, excludeId) : null;
        if (occH1 && occH2) cell.classList.add("lt-fridge-cell--double");

        for (var h = 1; h <= CONFIG.heights; h++) {
          var occ = h === 1 ? occH1 : occH2;
          var outsideB1 = pos === 1 && b > maxDepthForHorizontal(1);
          var occGhost = occ && String(occ.id) === GHOST_ID;
          var inSel = slotInSelection(selection, b, pos, h);
          var occSelfPick =
            mode === "pick" &&
            multiSelect &&
            occ &&
            excludeId != null &&
            idsEqual(occ.id, excludeId) &&
            inSel;
          var trialDraft =
            mode === "pick" && multiSelect && selection && selection.length
              ? selection
                  .map(function (s) {
                    return { b: Number(s.b), p: Number(s.p), h: s.h != null ? Number(s.h) : 1 };
                  })
                  .concat([{ b: b, p: pos, h: h }])
              : null;
          var freePick =
            !outsideB1 &&
            mode === "pick" &&
            (multiSelect
              ? canSelect(slotMap, b, pos, h, excludeId, trialDraft)
              : canSelect(slotMap, b, pos, h, excludeId)) &&
            !(occ && !occGhost && !occSelfPick);

          var slotEl =
            mode === "pick"
              ? document.createElement("button")
              : document.createElement("div");
          slotEl.type = mode === "pick" ? "button" : undefined;
          slotEl.className = "lt-fridge-slot";
          slotEl.setAttribute("data-b", String(b));
          slotEl.setAttribute("data-p", String(pos));
          slotEl.setAttribute("data-h", String(h));

          if (outsideB1) {
            slotEl.classList.add("lt-fridge-slot--empty", "lt-fridge-slot--blocked", "lt-fridge-slot--na");
            if (mode === "pick") slotEl.disabled = true;
            var na = document.createElement("span");
            na.className = "lt-slot-blocked-label";
            na.textContent = "—";
            na.title = "B1 no tiene más de " + CONFIG.firstBandMaxDepth + " posiciones en profundidad.";
            slotEl.appendChild(na);
          } else if (occ && !(occGhost || occSelfPick)) {
            slotEl.classList.add("lt-fridge-slot--occupied");
            if (mode === "pick") {
              slotEl.disabled = true;
            }
            var lb = labelRow(occ);
            var t1 = document.createElement("div");
            t1.className = "lt-slot-coord";
            t1.textContent = slotKey(b, pos, h);
            var t2 = document.createElement("div");
            t2.className = "lt-slot-fruit";
            t2.textContent = lb.varr;
            var t3 = document.createElement("div");
            t3.className = "lt-slot-lote";
            t3.textContent = lb.lot;
            slotEl.appendChild(t1);
            slotEl.appendChild(t2);
            slotEl.appendChild(t3);
            if (lb.prod) {
              var t4 = document.createElement("div");
              t4.className = "lt-slot-prod";
              t4.textContent = lb.prod;
              slotEl.appendChild(t4);
            }
          } else if (occGhost) {
            slotEl.classList.add("lt-fridge-slot--empty", "lt-fridge-slot--picked", "lt-fridge-slot--ghost");
            if (mode === "pick") slotEl.disabled = false;
            var g1 = document.createElement("div");
            g1.className = "lt-slot-coord";
            g1.textContent = slotKey(b, pos, h);
            var g2 = document.createElement("div");
            g2.className = "lt-slot-free-label";
            g2.textContent = "Elegido";
            slotEl.appendChild(g1);
            slotEl.appendChild(g2);
          } else if (occSelfPick) {
            slotEl.classList.add("lt-fridge-slot--occupied", "lt-fridge-slot--picked", "lt-fridge-slot--draft-toggle");
            if (mode === "pick") slotEl.disabled = false;
            var lb2 = labelRow(occ);
            var u1 = document.createElement("div");
            u1.className = "lt-slot-coord";
            u1.textContent = slotKey(b, pos, h);
            var u2 = document.createElement("div");
            u2.className = "lt-slot-fruit";
            u2.textContent = lb2.varr;
            var u3 = document.createElement("div");
            u3.className = "lt-slot-lote";
            u3.textContent = lb2.lot;
            slotEl.appendChild(u1);
            slotEl.appendChild(u2);
            slotEl.appendChild(u3);
            if (lb2.prod) {
              var u4 = document.createElement("div");
              u4.className = "lt-slot-prod";
              u4.textContent = lb2.prod;
              slotEl.appendChild(u4);
            }
            var u5 = document.createElement("div");
            u5.className = "lt-slot-free-label";
            u5.textContent = "Clic para quitar";
            slotEl.appendChild(u5);
          } else {
            slotEl.classList.add("lt-fridge-slot--empty");
            var draftForAir =
              mode === "pick" && multiSelect && selection && selection.length
                ? selection.map(function (s) {
                    return { b: Number(s.b), p: Number(s.p), h: s.h != null ? Number(s.h) : 1 };
                  })
                : null;
            var airGap =
              isFree(slotMap, b, pos, h, excludeId) &&
              !(draftForAir && draftForAir.length
                ? hasDepthSupportWithDraft(slotMap, b, pos, excludeId, draftForAir)
                : hasDepthSupport(slotMap, b, pos, excludeId));
            if (airGap || (mode === "pick" && !freePick)) {
              if (airGap || mode === "pick") {
                slotEl.classList.add("lt-fridge-slot--blocked");
                if (mode === "pick") slotEl.disabled = true;
              }
              var bx = document.createElement("span");
              bx.className = "lt-slot-blocked-label";
              if (airGap) {
                bx.textContent = "P" + (b - 1);
                bx.title =
                  "En la banda B" +
                  pos +
                  " hay que ocupar P" +
                  (b - 1) +
                  " (más al fondo) antes de usar P" +
                  b +
                  ".";
              } else if (CONFIG.heights > 1 && h === 2) {
                bx.textContent = "H2";
              } else {
                bx.textContent = "—";
              }
              slotEl.appendChild(bx);
            } else {
              var em = document.createElement("span");
              em.className = "lt-slot-free-label";
              em.textContent = slotKey(b, pos, h);
              slotEl.appendChild(em);
            }
          }

          if (slotInSelection(selection, b, pos, h) && !occGhost) {
            slotEl.classList.add("lt-fridge-slot--picked");
          }

          if (mode === "pick" && typeof options.onSlotClick === "function") {
            slotEl.addEventListener("click", function (ev) {
              var el = ev.currentTarget;
              if (el.disabled) return;
              var bb = Number(el.getAttribute("data-b"));
              var pp = Number(el.getAttribute("data-p"));
              var hh = Number(el.getAttribute("data-h"));
              if (!isCellInLayout(bb, pp)) return;
              if (multiSelect) {
                var o = occupantAt(slotMap, bb, pp, hh, excludeId);
                var isG = o && String(o.id) === GHOST_ID;
                var inS = slotInSelection(selection, bb, pp, hh);
                var selfT =
                  o &&
                  excludeId != null &&
                  idsEqual(o.id, excludeId) &&
                  inS;
                if (isG || selfT) {
                  options.onSlotClick({ b: bb, p: pp, h: hh, toggle: true });
                  return;
                }
                var trial2 = selection
                  .map(function (s) {
                    return { b: Number(s.b), p: Number(s.p), h: s.h != null ? Number(s.h) : 1 };
                  })
                  .concat([{ b: bb, p: pp, h: hh }]);
                if (!canSelect(slotMap, bb, pp, hh, excludeId, trial2)) return;
                options.onSlotClick({ b: bb, p: pp, h: hh, toggle: false });
                return;
              }
              if (!canSelect(slotMap, bb, pp, hh, excludeId)) return;
              lastDraft = { b: bb, p: pp, h: hh };
              options.onSlotClick({ b: bb, p: pp, h: hh });
            });
          }

          cell.appendChild(slotEl);
        }
        grid.appendChild(cell);
      }
    }

    root.appendChild(grid);

    var foot = document.createElement("div");
    foot.className = "lt-fridge-foot";
    foot.textContent =
      "Varias posiciones: texto B-P+B-P en base de datos. B1: " +
      CONFIG.firstBandMaxDepth +
      " posiciones. Mapa P1…P" +
      rowCount +
      ".";
    root.appendChild(foot);

    container.appendChild(root);
  }

  global.LaTorreCamaraMap = {
    CONFIG: CONFIG,
    slotKey: slotKey,
    parseSlotFromRow: parseSlotFromRow,
    parseAllSlotsFromRow: parseAllSlotsFromRow,
    parseLegacyBandas: parseLegacyBandas,
    encodeSlotsText: encodeSlotsText,
    buildSlotMap: buildSlotMap,
    buildSlotMapForPick: buildSlotMapForPick,
    canSelect: canSelect,
    whyCannotSelect: whyCannotSelect,
    explainDraftInvalidity: explainDraftInvalidity,
    validateDraftSlots: validateDraftSlots,
    slotsEqual: slotsEqual,
    slotListIncludes: slotListIncludes,
    computeRowCount: computeRowCount,
    getLastDraft: function () {
      return lastDraft;
    },
    clearDraft: function () {
      lastDraft = null;
    },
    render: render,
    maxDepthForHorizontal: maxDepthForHorizontal,
    isCellInLayout: isCellInLayout
  };
})(typeof window !== "undefined" ? window : globalThis);
