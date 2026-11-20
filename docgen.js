/* Generador de la ficha "Agenda de visita de acompañamiento".
   Un solo origen de verdad: computeSchedule() alimenta la vista previa y el .docx. */
(function (root) {
  'use strict';

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DAY_COLORS = ['A57F2C', '1E5B4F', '9B2247', '002F2A'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    return { y: +m[1], m: +m[2], d: +m[3] };
  }
  function weekday(s) {
    var p = parseDate(s); if (!p) return '';
    return DIAS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
  }
  function longDate(s) { var p = parseDate(s); return p ? p.d + ' de ' + MESES[p.m - 1] + ' de ' + p.y : ''; }
  function dayDate(s) { var p = parseDate(s); return p ? p.d + ' de ' + MESES[p.m - 1] : ''; }
  function addDays(s, n) {
    var p = parseDate(s); if (!p) return s;
    var t = new Date(Date.UTC(p.y, p.m - 1, p.d + n));
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate());
  }
  function toMin(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }
  function fmt(min) {
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    return Math.floor(min / 60) + ':' + pad(min % 60);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function haversineKm(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLa = (b.lat - a.lat) * rad, dLo = (b.lng - a.lng) * rad;
    var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function hasCoords(p) { return p && typeof p.lat === 'number' && typeof p.lng === 'number' && isFinite(p.lat) && isFinite(p.lng); }
  function estimate(a, b, opts) {
    var km = haversineKm(a, b) * (opts.circuity || 1.3);
    var min = Math.max(5, Math.ceil((km / (opts.kmh || 55)) * 60 / 5) * 5);
    return { km: km, min: min };
  }
  function initials(name) {
    var skip = /^(dr|dra|lic|mtro|mtra|ing|arq|c\.p|cp|lef|l\.e\.f|lts|psic|q\.f\.b|med|ph\.d)\.?$/i;
    var low = /^(de|del|la|las|los|y|e)$/i;
    return String(name || '').replace(/[,.]/g, ' ').split(/\s+/).filter(function (w) { return w && w.length > 1 && !skip.test(w) && !low.test(w); })
      .map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }
  function artOf(place) {
    if (place && place.art) return place.art;
    var n = (place && place.name || '').trim();
    if (/^(unidad|ud\b|tienda|casa|cl[ií]nica|plaza|sala|escuela)/i.test(n)) return 'la';
    return 'el';
  }
  function withArt(prep, place) { // prep: 'a' | 'de' | 'por'
    var a = artOf(place), n = place.name;
    if (prep === 'por') return 'por ' + a + ' ' + n;
    if (a === 'el') return (prep === 'a' ? 'al ' : 'del ') + n;
    return prep + ' la ' + n;
  }

  var KIND_LABEL = { traslado: 'Traslado', recorrido: 'Recorrido', vuelo: 'Vuelo', comida: 'Comida', checkin: 'Check-in', cierre: 'Cierre', libre: 'Actividad' };

  function autoText(it) {
    var n = it.place && it.place.name;
    switch (it.kind) {
      case 'traslado': return 'Traslado' + (n ? ' ' + withArt('a', it.place) : '.');
      case 'recorrido': return n ? 'Recorrido ' + withArt('por', it.place) + '.' : 'Recorrido.';
      case 'comida': return 'Comida';
      case 'checkin': return 'Check-in hotel' + (n ? ' en ' + n.replace(/^hotel\s+(en\s+)?/i, '').replace(/\.+$/, '') : '') + '.';
      case 'cierre': return 'Reunión de cierre y toma de acuerdos.';
      case 'vuelo': return it.origin && it.origin.name && n ? 'Vuelo ' + it.origin.name.replace(/\.+$/, '') + ' – ' + n.replace(/\.+$/, '') + '.' : 'Vuelo' + (n ? ' a ' + n : '') + '.';
      default: return it.text || 'Actividad';
    }
  }

  var PLACE_TRAVEL = { recorrido: 1, checkin: 1, libre: 1 };

  /* Devuelve el itinerario calculado. state: ver app.js */
  function computeSchedule(state) {
    var opts = state.opts || {};
    var gap = typeof opts.gap === 'number' ? opts.gap : 1;
    var people = (state.people || []).filter(function (p) { return p.on && (p.nombre || p.sig); });
    var sigOf = function (p) { return p.sig || initials(p.nombre); };
    var tCount = 0, carry = null, lastUnitCve = null;
    var out = { days: [], warnings: [], tCount: 0 };

    function defaultParts(kind, unitCve, itemOoad) {
      return people.filter(function (p) {
        if (p.grupo === 'DPES') return true;
        if (kind === 'vuelo' || kind === 'checkin') return false;
        if (p.grupo === 'OOAD') return !(kind === 'recorrido' && itemOoad && p.ooadId && p.ooadId !== itemOoad);
        if (p.grupo === 'UNIDAD') return (kind === 'recorrido' || kind === 'cierre') && unitCve != null && p.unitCve === unitCve;
        return false;
      });
    }
    function partsFor(it, unitCve, forTravel) {
      if (Array.isArray(it.parts)) {
        return people.filter(function (p) { return it.parts.indexOf(p.id) >= 0 && !(forTravel && p.grupo === 'UNIDAD'); });
      }
      return defaultParts(forTravel ? 'traslado' : it.kind, forTravel ? null : unitCve, it.ooadId);
    }

    (state.days || []).forEach(function (day, di) {
      var color = DAY_COLORS[di % DAY_COLORS.length];
      var cursor = toMin(day.start); if (cursor == null) cursor = 9 * 60;
      var prev = (day.startPlace && day.startPlace.name) ? day.startPlace : carry;
      var rows = [], legs = [], points = [];
      if (prev && hasCoords(prev)) points.push({ name: prev.name, lat: prev.lat, lng: prev.lng, day: di });
      var dayUnit = null;

      (day.items || []).forEach(function (it) {
        var place = it.place && it.place.name ? it.place : null;
        var unitCve = it.unitCve != null ? it.unitCve : null;
        if (it.kind === 'recorrido' && unitCve != null) { dayUnit = unitCve; lastUnitCve = unitCve; }
        var ctxUnit = it.kind === 'cierre' ? (unitCve != null ? unitCve : lastUnitCve) : unitCve;
        if (it.kind === 'traslado') {
          if (it.origin && it.origin.name) {
            if (!prev || prev.name !== it.origin.name) { if (hasCoords(it.origin) && !(points.length && points[points.length - 1].name === it.origin.name)) points.push({ name: it.origin.name, lat: it.origin.lat, lng: it.origin.lng, day: di, kind: 'traslado' }); }
            prev = it.origin;
          }
          var fx = toMin(it.fixed), tm, tkm = null, tauto = false;
          if (+it.dur > 0) tm = +it.dur;
          else if (prev && hasCoords(prev) && place && hasCoords(place)) { var te = estimate(prev, place, opts); tm = te.min + (opts.buffer || 0); tkm = te.km; tauto = true; }
          else tm = 30;
          var ts = cursor, tconf = null;
          if (fx != null) { if (fx < cursor - gap) tconf = 'Se traslapa con la actividad anterior (' + fmt(cursor - gap) + ').'; ts = fx; }
          var te2 = ts + tm; tCount++;
          var base = place ? (prev && prev.name ? withArt('de', prev) + ' ' + withArt('a', place) : withArt('a', place)).replace(/\.+$/, '') : '';
          var tx = (it.text && it.text.trim()) ? it.text.trim() : 'Traslado ' + tCount + (base ? ': ' + base : '') + '.';
          rows.push({ kind: 'traslado', manual: true, itemId: it.id, start: ts, end: te2, dur: tm, timeText: fmt(ts) + ' – ' + fmt(te2), text: tx,
            parts: partsFor(it, null, false).map(sigOf), n: tCount, km: tkm, auto: tauto, estimated: tauto || !(+it.dur > 0), conflict: tconf });
          if (tconf) out.warnings.push('Día ' + (di + 1) + ', ' + fmt(ts) + ': ' + tconf);
          if (place) {
            legs.push({ n: tCount, from: prev ? prev.name : null, to: place.name, min: tm, km: tkm, day: di });
            if (hasCoords(place)) points.push({ name: place.name, lat: place.lat, lng: place.lng, day: di, kind: 'traslado' });
            prev = place;
          }
          cursor = te2 + gap;
          return;
        }
        var wantsTravel = place && PLACE_TRAVEL[it.kind] && it.travel !== false;
        var fixed = toMin(it.fixed);
        var dur = Math.max(0, +it.dur || 0);

        if (wantsTravel && (prev || it.travelMin != null)) {
          var tmin, km = null, auto = false;
          if (it.travelMin != null && it.travelMin !== '') tmin = +it.travelMin;
          else if (prev && hasCoords(prev) && hasCoords(place)) { var e = estimate(prev, place, opts); tmin = e.min + (opts.buffer || 0); km = e.km; auto = true; }
          else tmin = 30;
          var samePlace = prev && prev.name === place.name;
          if (!samePlace && tmin > 0) {
            tCount++;
            var tStart = cursor;
            if (fixed != null && fixed - tmin - gap >= cursor) tStart = fixed - tmin - gap;
            var tEnd = tStart + tmin;
            var ttxt = 'Traslado ' + tCount + ': ' + (prev && prev.name ? withArt('de', prev) + ' ' + withArt('a', place) : withArt('a', place)).replace(/\.+$/, '') + '.';
            rows.push({ kind: 'traslado', start: tStart, end: tEnd, dur: tmin, timeText: fmt(tStart) + ' – ' + fmt(tEnd), text: ttxt,
              parts: partsFor(it, ctxUnit, true).map(sigOf), n: tCount, itemId: it.id, auto: auto, km: km, estimated: auto || it.travelMin == null });
            legs.push({ n: tCount, from: prev ? prev.name : null, to: place.name, min: tmin, km: km, day: di });
            cursor = tEnd + gap;
          }
        }

        var start = cursor, conflict = null;
        if (fixed != null) { if (fixed < cursor - gap) conflict = 'Se traslapa con la actividad anterior (' + fmt(cursor - gap) + ').'; start = fixed; }
        var end = start + dur;
        var text = (it.text && it.text.trim()) ? it.text.trim() : autoText(it);
        rows.push({ kind: it.kind, itemId: it.id, start: start, end: end, dur: dur,
          timeText: dur > 0 ? fmt(start) + ' – ' + fmt(end) : fmt(start), text: text,
          parts: partsFor(it, ctxUnit, false).map(sigOf), conflict: conflict });
        if (conflict) out.warnings.push('Día ' + (di + 1) + ', ' + fmt(start) + ': ' + conflict);
        cursor = end + gap;

        if (place) {
          if (it.kind === 'vuelo' && it.origin && hasCoords(it.origin) && !(points.length && points[points.length - 1].name === it.origin.name)) points.push({ name: it.origin.name, lat: it.origin.lat, lng: it.origin.lng, day: di, kind: 'vuelo' });
          prev = place;
          if (hasCoords(place)) points.push({ name: place.name, lat: place.lat, lng: place.lng, day: di, kind: it.kind });
        } else if (it.kind === 'vuelo') { prev = null; }
      });

      var lastIt = (day.items || [])[(day.items || []).length - 1];
      if (lastIt && lastIt.kind === 'checkin' && prev && prev.name) carry = prev; else carry = null;
      var lbl = 'Día ' + (di + 1) + ', ' + weekday(day.date) + ' ' + dayDate(day.date) + ' ' + (parseDate(day.date) || {}).y;
      out.days.push({
        idx: di, color: color, rows: rows, legs: legs, points: points,
        label: lbl, mapLabel: 'Día ' + (di + 1) + ': ' + weekday(day.date) + ' ' + dayDate(day.date)
      });
    });
    out.tCount = tCount;
    return out;
  }

  /* ---------- XML ---------- */
  var F = '<w:rFonts w:ascii="Noto Sans" w:eastAsia="Times New Roman" w:hAnsi="Noto Sans" w:cs="Noto Sans"/>';
  var FP = '<w:rFonts w:ascii="Patria" w:eastAsia="Times New Roman" w:hAnsi="Patria" w:cs="Noto Sans"/>';
  function run(text, o) {
    o = o || {};
    var rpr = (o.patria ? FP : F) + (o.b ? '<w:b/><w:bCs/>' : '') + (o.color ? '<w:color w:val="' + o.color + '"/>' : '') +
      '<w:sz w:val="' + (o.sz || 18) + '"/><w:szCs w:val="' + (o.sz || 18) + '"/>';
    return '<w:r><w:rPr>' + rpr + '</w:rPr><w:t xml:space="preserve">' + esc(text) + '</w:t></w:r>';
  }
  function para(runs, o) {
    o = o || {};
    var ppr = '';
    if (o.keepNext) ppr += '<w:keepNext/>';
    if (o.cantSplit) ppr += '<w:keepLines/>';
    if (o.pageBreakBefore) ppr += '<w:pageBreakBefore/>';
    if (o.numId) ppr += '<w:pStyle w:val="Prrafodelista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + o.numId + '"/></w:numPr>';
    if (o.bdrB) ppr += '<w:pBdr><w:bottom w:val="single" w:sz="' + (o.bdrSz || 8) + '" w:space="4" w:color="' + o.bdrB + '"/></w:pBdr>';
    if (o.spacing) ppr += '<w:spacing w:before="' + (o.spacing[0] || 0) + '" w:after="' + (o.spacing[1] || 0) + '"' + (o.line ? ' w:line="' + o.line + '" w:lineRule="auto"' : '') + '/>';
    if (o.ind) ppr += '<w:ind ' + o.ind + '/>';
    if (o.jc) ppr += '<w:jc w:val="' + o.jc + '"/>';
    var endRpr = '<w:rPr>' + F + '<w:sz w:val="' + (o.sz || 18) + '"/><w:szCs w:val="' + (o.sz || 18) + '"/></w:rPr>';
    return '<w:p><w:pPr>' + ppr + endRpr + '</w:pPr>' + (runs || '') + '</w:p>';
  }
  function emptyP(sz) { return para('', { sz: sz || 18 }); }

  var COLS = [1900, 4200, 2738]; // suman 8838 = ancho de texto
  var INK = '161A1D', GREY = '4D4D4D', RULE = 'CCCCCC', CREAM = 'F5F1DF';
  function cell(w, inner, o) {
    o = o || {};
    var pr = '<w:tcW w:w="' + w + '" w:type="dxa"/>', bd = '';
    if (o.borderL) bd += '<w:left w:val="single" w:sz="' + (o.szL || 24) + '" w:space="0" w:color="' + o.borderL + '"/>';
    if (o.borderT) bd += '<w:top w:val="single" w:sz="8" w:space="0" w:color="' + o.borderT + '"/>';
    if (o.borderB) bd += '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="' + o.borderB + '"/>';
    if (bd) pr += '<w:tcBorders>' + bd + '</w:tcBorders>';
    if (o.fill) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + o.fill + '"/>';
    pr += '<w:tcMar><w:top w:w="70" w:type="dxa"/><w:left w:w="' + (o.padL == null ? 110 : o.padL) + '" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/>';
    return '<w:tc><w:tcPr>' + pr + '</w:tcPr>' + inner + '</w:tc>';
  }
  function tcPara(text, o) {
    o = o || {};
    return para(text === '' ? '' : run(text, { b: o.b, color: o.color, sz: o.sz || 18 }), { jc: o.jc, spacing: [o.before || 0, o.after || 0], sz: o.sz || 18 });
  }
  function dayTable(day) {
    var H = function (w, t, first) { return cell(w, tcPara(t.toUpperCase(), { b: 1, color: GREY, sz: 15 }), { borderT: INK, borderB: RULE, borderL: first ? 'FFFFFF' : null, padL: first ? 160 : 110 }); };
    var hdr = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' + H(COLS[0], 'Horario', 1) + H(COLS[1], 'Actividad') + H(COLS[2], 'Participantes') + '</w:tr>';
    var body = day.rows.map(function (r) {
      var tr = r.kind === 'traslado', f = tr ? CREAM : null;
      return '<w:tr><w:trPr><w:cantSplit/></w:trPr>' +
        cell(COLS[0], tcPara(r.timeText, { b: 1, color: day.color, sz: 18 }), { borderL: day.color, borderB: RULE, fill: f, padL: 130 }) +
        cell(COLS[1], tcPara(r.text, { color: INK, b: !tr, sz: 18 }), { borderB: RULE, fill: f }) +
        cell(COLS[2], tcPara(r.parts.join(', '), { color: GREY, sz: 16 }), { borderB: RULE, fill: f }) + '</w:tr>';
    }).join('');
    var nob = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) { return '<w:' + s + ' w:val="none" w:sz="0" w:space="0" w:color="auto"/>'; }).join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="' + COLS.reduce(function (a, b) { return a + b; }, 0) + '" w:type="dxa"/><w:tblBorders>' + nob + '</w:tblBorders><w:tblLayout w:type="fixed"/>' +
      '<w:tblCellMar><w:left w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="04A0"/></w:tblPr>' +
      '<w:tblGrid>' + COLS.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>' + hdr + body + '</w:tbl>';
  }

  function personBullet(p) {
    var sig = p.sig || initials(p.nombre);
    var name = (p.nombre || '[Nombre]') + ' (' + sig + '),';
    var cargo = (p.cargo || '').replace(/\.\s*$/, '') + '.';
    return para(run(name + ' ', { b: 1 }) + run(cargo), { numId: 3, ind: 'w:left="426" w:right="-93" w:hanging="284"', jc: 'both', spacing: [0, 20] });
  }

  function drawing(rid, cx, cy, id, descr) {
    return '<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
      '<wp:docPr id="' + id + '" name="Mapa ' + id + '" descr="' + esc(descr) + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="' + id + '" name="mapa' + id + '.png"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
      '<a:ln w="9525"><a:solidFill><a:srgbClr val="A6A6A6"/></a:solidFill></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }

  function ooadName(state) { return state.ooadName || ''; }
  // OOAD de la visita: el principal y los que aparezcan en participantes o unidades
  function ooadList(state) {
    var list = [{ id: state.ooadId, name: state.ooadName || '' }], seen = {}; seen[state.ooadId] = 1;
    function add(id, n) { if (id == null || !n || seen[id]) return; seen[id] = 1; list.push({ id: id, name: n }); }
    (state.people || []).forEach(function (p) { if (p.on && p.grupo === 'OOAD' && (p.nombre || p.sig)) add(p.ooadId, p.ooadName); });
    (state.days || []).forEach(function (d) { d.items.forEach(function (it) { if (it.kind === 'recorrido') add(it.ooadId, it.ooadName); }); });
    return list;
  }
  function ooadTitle(state) {
    var n = ooadList(state).map(function (o) { return o.name; });
    if (n.length < 2) return 'al OOAD ' + n[0];
    return 'a los OOAD ' + n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1];
  }
  // personal del OOAD / unidad agrupado por OOAD (el principal va primero)
  function ooadGroups(state) {
    var list = ooadList(state), g = list.map(function (o) { return { id: o.id, name: o.name, people: [] }; });
    (state.people || []).filter(function (p) { return p.on && (p.nombre || p.sig) && p.grupo !== 'DPES'; }).forEach(function (p) {
      var t = g.filter(function (x) { return x.id === p.ooadId; })[0] || g[0]; t.people.push(p);
    });
    return g.filter(function (x) { return x.people.length; });
  }

  function buildBody(state, sched, map) {
    var b = '';
    b += emptyP();
    b += para(run('Ciudad de México a ' + longDate(state.fecha), { sz: 20 }), { jc: 'right', sz: 20 });
    b += emptyP(20);
    b += para(run('Para: ' + (state.para.nombre || ''), { b: 1, sz: 20 }), { ind: 'w:left="142"', sz: 20, keepNext: 1 });
    b += para(run(state.para.cargo || '', { sz: 20 }), { ind: 'w:left="142" w:right="3735"', sz: 20 });
    b += emptyP(20);
    b += para(run('De: ' + (state.de.nombre || ''), { b: 1, sz: 20 }), { ind: 'w:left="142"', sz: 20, keepNext: 1 });
    b += para(run(state.de.cargo || '', { sz: 20 }), { ind: 'w:left="142" w:right="2884"', sz: 20 });
    b += emptyP(20);
    b += para(run('Agenda de visita de acompañamiento ' + ooadTitle(state), { b: 1, color: '002F2A', sz: 28 }), { jc: 'left', sz: 28, spacing: [160, 200], bdrB: 'A57F2C', bdrSz: 12 });
    if (state.objetivo && state.objetivo.trim()) {
      b += para(run('Objetivo: ', { b: 1, color: 'A57F2C' }) + run(state.objetivo.trim()), { jc: 'both', spacing: [0, 120] });
    }
    if (state.antecedente && state.antecedente.trim()) {
      b += para(run(state.antecedente.trim()), { jc: 'both', spacing: [0, 120] });
    }
    b += para(run('Participantes', { b: 1, color: '1E5B4F', sz: 22 }), { sz: 22, spacing: [200, 100], keepNext: 1, bdrB: 'DCE2DF', bdrSz: 6 });
    var on = (state.people || []).filter(function (p) { return p.on && (p.nombre || p.sig); });
    var dpes = on.filter(function (p) { return p.grupo === 'DPES'; });
    if (dpes.length) {
      b += para(run('DPES', { b: 1, color: 'A57F2C' }), { ind: 'w:left="708"', jc: 'both', spacing: [0, 40], keepNext: 1 });
      dpes.forEach(function (p) { b += personBullet(p); });
    }
    ooadGroups(state).forEach(function (g) {
      b += para(run('OOAD ' + g.name, { b: 1, color: 'A57F2C' }), { ind: 'w:left="708"', jc: 'both', spacing: [100, 40], keepNext: 1 });
      g.people.forEach(function (p) { b += personBullet(p); });
    });

    // Itinerario
    b += para(run('Itinerario', { b: 1, color: '1E5B4F', sz: 22 }), { sz: 22, keepNext: 1, spacing: [320, 140], bdrB: 'DCE2DF', bdrSz: 6 });
    sched.days.forEach(function (d, i) {
      b += para(run(d.label, { b: 1, color: d.color }), { spacing: [i ? 260 : 60, 80], keepNext: 1 });
      b += dayTable(d);
    });
    b += emptyP(10);

    // Mapa
    b += para(run('Mapa de recorridos', { b: 1, color: '1E5B4F', sz: 22 }), { sz: 22, keepNext: 1, spacing: [320, 140], bdrB: 'DCE2DF', bdrSz: 6 });
    sched.days.forEach(function (d) {
      b += para(run(d.mapLabel, { b: 1, color: d.color, sz: 20 }), { sz: 20, spacing: [100, 40], keepNext: 1 });
      var legs = d.rows.filter(function (r) { return r.kind === 'traslado'; });
      var legInfo = d.legs;
      if (!legInfo.length) b += para(run('Sin traslados programados.', { sz: 20 }), { sz: 20, keepNext: 1 });
      legInfo.forEach(function (l) {
        var t = l.from ? l.from + ' – ' + l.to : 'Hacia ' + l.to;
        b += para(run('T' + l.n + ': ' + t, { sz: 20 }), { sz: 20, spacing: [0, 0], keepNext: 1 });
      });
    });
    if (map && map.blank) {
      var bd = ['top', 'left', 'bottom', 'right'].map(function (s) { return '<w:' + s + ' w:val="single" w:sz="6" w:space="0" w:color="A6A6A6"/>'; }).join('');
      b += para('', { sz: 18, keepNext: 1 }) + '<w:tbl><w:tblPr><w:tblW w:w="8838" w:type="dxa"/><w:tblBorders>' + bd + '</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="8838"/></w:tblGrid>' +
        '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="6400" w:hRule="exact"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="8838" w:type="dxa"/></w:tcPr>' + emptyP(18) + '</w:tc></w:tr></w:tbl>' + emptyP(2);
    } else if (map && map.png) {
      b += para('', { sz: 18, keepNext: 1 });
      var cx = 5612130, cy = Math.round(cx * map.h / map.w);
      var maxCy = 4300000; if (cy > maxCy) { cx = Math.round(cx * maxCy / cy); cy = maxCy; }
      b += para(drawing('rId100', cx, cy, 501, 'Mapa de recorridos'), { sz: 18 });
    }
    return b;
  }

  var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  var SECT = '<w:sectPr><w:headerReference w:type="default" r:id="rId13"/><w:footerReference w:type="default" r:id="rId15"/>' +
    '<w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1843" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/></w:sectPr>';

  /* JSZip: constructor; template: Uint8Array|ArrayBuffer|base64 string; map: {png:Uint8Array,w,h}|null */
  function buildDocx(JSZip, template, state, sched, map) {
    var opts = typeof template === 'string' ? { base64: true } : undefined;
    return JSZip.loadAsync(template, opts).then(function (zip) {
      var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + '><w:body>' + buildBody(state, sched, map) + SECT + '</w:body></w:document>';
      zip.file('word/document.xml', doc);
      if (map && map.png) {
        zip.file('word/media/mapa1.png', map.png);
        var rels = zip.file('word/_rels/document.xml.rels');
        return rels.async('string').then(function (x) {
          x = x.replace('</Relationships>', '<Relationship Id="rId100" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/mapa1.png"/></Relationships>');
          zip.file('word/_rels/document.xml.rels', x);
          return zip;
        });
      }
      return zip;
    }).then(function (zip) {
      return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    });
  }

  root.DocGen = {
    ooadList: ooadList, ooadTitle: ooadTitle, ooadGroups: ooadGroups,
    MESES: MESES, DIAS: DIAS, DAY_COLORS: DAY_COLORS, KIND_LABEL: KIND_LABEL,
    weekday: weekday, longDate: longDate, dayDate: dayDate, addDays: addDays, parseDate: parseDate,
    toMin: toMin, fmt: fmt, initials: initials, haversineKm: haversineKm, estimate: estimate, hasCoords: hasCoords,
    artOf: artOf, withArt: withArt, autoText: autoText,
    computeSchedule: computeSchedule, buildBody: buildBody, buildDocx: buildDocx
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DocGen;
})(typeof window !== 'undefined' ? window : globalThis);
