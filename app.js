(function () {
  'use strict';
  var DG = window.DocGen;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var KEY = 'giras.v1';
  var CAT = null, TPL = null, S = null, SCHED = null;
  var UI = { pOoad: null, unitOoad: null, day: 0, openParts: null, openPlace: null, q: '', types: {}, all: false, mapImg: null, mapBlob: null, mapGen: null };
  var uidn = 0;
  function nid(p) { uidn++; return (p || 'i') + Date.now().toString(36) + uidn; }
  var TYPE_SHORT = { 'Centro de Seguridad Social': 'CSS', 'Teatro Cubierto': 'Teatro', 'Unidad Deportiva': 'UD', 'Tienda': 'Tienda', 'Velatorio': 'Velatorio',
    'Centro de Extension de Conocimientos Esquema Modificado': 'CECEM', 'Centro Artesanal': 'Artesanal', 'Casa Del Jubilado': 'Casa del Jubilado',
    'Centro de Seguridad Social Participativo': 'CSS Participativo', 'Centro Cultural': 'Centro Cultural' };
  var TYPE_ORDER = ['Centro de Seguridad Social', 'Unidad Deportiva', 'Teatro Cubierto', 'Centro de Seguridad Social Participativo'];
  var FEM_TYPES = { 'Unidad Deportiva': 1, 'Tienda': 1, 'Casa Del Jubilado': 1 };

  var DPES_ON = { LICM: 1, MMCO: 1, SDSS: 1, MDM: 1 };
  var DPES_CARGO = {
    MHA: 'Titular de la Dirección de Prestaciones Económicas y Sociales',
    MDM: 'Jefa de Área de Planeación y Seguimiento a los Programas y Proyectos de Inversión en la División de Apoyo Técnico y Mejora de Procesos',
    HGJ: 'Analista de Obras y Adquisiciones del Fideicomiso para el Desarrollo del Deporte IMSS'
  };
  function cargoDpes(r) {
    if (DPES_CARGO[r.s]) return DPES_CARGO[r.s];
    var c = r.c, ar = r.a;
    if (/^Fideicomiso/i.test(ar)) return c.replace(/^Titular$/, 'Titular') + (c === 'Analista' ? ' en el ' : ' del ') + ar;
    if (c === 'Titular') return 'Titular de la ' + ar;
    return c + ' en la ' + ar;
  }
  function dpesPreset() {
    var list = (CAT.dpes || []).map(function (r) { return { sig: r.s, nombre: r.n, cargo: cargoDpes(r), on: !!DPES_ON[r.s], titular: r.s === 'LICM' }; });
    return list.filter(function (p) { return p.on; }).concat(list.filter(function (p) { return !p.on; }));
  }

  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function unitByCve(c) { return CAT.units.filter(function (u) { return u.c === c; })[0]; }
  function ooadById(id) { return CAT.ooads.filter(function (o) { return o.id === id; })[0]; }
  function placeOf(u) { return { name: u.n, lat: u.la, lng: u.lo, art: FEM_TYPES[u.t] ? 'la' : 'el' }; }
  function newDay(date) { return { date: date, start: '09:00', startPlace: { name: '' }, items: [] }; }
  function recorrido(u) { return { id: nid(), kind: 'recorrido', dur: 60, place: placeOf(u), unitCve: u.c, ooadId: u.o, ooadName: ooadById(u.o).n }; }

  function dpesPeople() {
    return dpesPreset().map(function (p) { return { id: nid('p'), grupo: 'DPES', on: p.on, sig: p.sig, nombre: p.nombre, cargo: p.cargo }; });
  }
  function ooadPeople(id) {
    var rows = (CAT.dir[String(id)] || []);
    return rows.map(function (r) {
      var cargo = r.c === 'Titular del OOAD' ? 'Titular del Órgano de Operación Administrativa Desconcentrada' : r.c;
      return { id: nid('p'), grupo: 'OOAD', on: true, sig: DG.initials(r.n), nombre: r.n, cargo: cargo, tag: /^Encargad/.test(r.t || '') ? r.t : '' };
    });
  }
  function defaultObjetivo(name) { return 'Realizar recorridos por las Unidades de Prestaciones Sociales adscritas al Órgano de Operación Administrativa Desconcentrada de ' + name + '.'; }

  function exampleState() {
    var id = 6, name = ooadById(id).n, d1 = DG.addDays(todayISO(), 14), d2 = DG.addDays(d1, 1);
    var mz = unitByCve(6102), tc = unitByCve(6103), gz = unitByCve(6101);
    var people = [];
    return {
      fecha: todayISO(),
      para: { nombre: 'Mtro. Javier Guerrero García', cargo: 'Titular de la Dirección de Operación y Evaluación' },
      de: { nombre: 'Dr. Mauricio Hernández Ávila', cargo: 'Titular de la Dirección de Prestaciones Económicas y Sociales' },
      ooadId: id, ooadName: name, objetivo: defaultObjetivo(name), objetivoEdited: false, antecedente: '',
      people: people, example: true, dpesV: 3,
      opts: { kmh: 55, circuity: 1.3, buffer: 0, gap: 1 },
      days: [
        { date: d1, start: '09:00', startPlace: { name: '' }, items: [
          { id: nid(), kind: 'vuelo', dur: 90, text: 'Vuelo CDMX – Manzanillo, Col.', place: { name: 'Aeropuerto de Manzanillo', lat: 19.1448, lng: -104.5586 } },
          recorrido(mz), recorrido(tc),
          { id: nid(), kind: 'comida', dur: 90 },
          { id: nid(), kind: 'checkin', dur: 0, place: { name: 'Hotel en Colima, Col.', lat: 19.2437, lng: -103.7250 } }
        ] },
        { date: d2, start: '09:30', startPlace: { name: '' }, items: [
          recorrido(gz), { id: nid(), kind: 'cierre', dur: 30 },
          { id: nid(), kind: 'vuelo', dur: 85, fixed: '14:00', text: 'Vuelo Colima – Ciudad de México.' }
        ] }
      ]
    };
  }
  function blankState(prev) {
    var s = exampleState();
    s.example = false;
    s.days = [];
    if (prev) { s.para = prev.para; s.de = prev.de; s.opts = prev.opts; s.people = prev.people.filter(function (p) { return p.grupo !== 'UNIDAD'; }); s.ooadId = prev.ooadId; s.ooadName = prev.ooadName; s.objetivo = defaultObjetivo(prev.ooadName); }
    return s;
  }
  function save() {
    try { var c = JSON.parse(JSON.stringify(S)); localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* sin almacenamiento */ }
  }
  function load() {
    try { var r = localStorage.getItem(KEY); if (!r) return null; var s = JSON.parse(r); if (s && s.days && s.people && s.ooadId) return s; } catch (e) { /* ignorar */ }
    return null;
  }

  /* ---------- utilidades de interfaz ---------- */
  function keepFocus(fn) {
    var a = document.activeElement, k = a && a.dataset && a.dataset.fk, s = a && a.selectionStart, e = a && a.selectionEnd;
    fn();
    if (k) { var n = document.querySelector('[data-fk="' + k + '"]'); if (n && n !== a) { n.focus({ preventScroll: true }); try { if (s != null) n.setSelectionRange(s, e); } catch (x) { /* tipos sin selección */ } } }
  }
  /* Reemplaza el HTML conservando el campo en el que se escribe (sin saltos de foco ni de pantalla) */
  function morph(a, b) {
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false;
    if (a.nodeType === 3) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return true; }
    if (a.nodeType !== 1) return true;
    if (a === document.activeElement) return true;
    if (a.contains(document.activeElement) && a.childNodes.length !== b.childNodes.length) return false;
    Array.prototype.slice.call(a.attributes).forEach(function (at) { if (!b.hasAttribute(at.name) && at.name !== 'value') a.removeAttribute(at.name); });
    Array.prototype.slice.call(b.attributes).forEach(function (at) { if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value); });
    if (a.nodeName === 'INPUT') { var v = b.getAttribute('value') || ''; if (a.type === 'checkbox') a.checked = b.hasAttribute('checked'); else if (a.value !== v) a.value = v; return true; }
    if (a.nodeName === 'TEXTAREA' || a.nodeName === 'SELECT') return false;
    if (a.childNodes.length !== b.childNodes.length) { a.innerHTML = b.innerHTML; return true; }
    for (var i = 0; i < a.childNodes.length; i++) {
      if (!morph(a.childNodes[i], b.childNodes[i])) { a.replaceChild(b.childNodes[i].cloneNode(true), a.childNodes[i]); }
    }
    return true;
  }
  function setHtml(el, html) {
    if (UI.typing && (UI.typing === 'force' || el.contains(document.activeElement))) {
      var t = document.createElement('div'); t.innerHTML = html;
      if (el.childNodes.length === t.childNodes.length) {
        var ok = true;
        for (var i = 0; i < el.childNodes.length && ok; i++) ok = morph(el.childNodes[i], t.childNodes[i]);
        if (ok) return;
      }
    }
    el.innerHTML = html;
  }
  function toast(msg, label, fn) {
    var t = $('#toast'); t.textContent = msg;
    if (label) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', function () { t.hidden = true; fn(); }); t.appendChild(b); }
    t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, label ? 8000 : 3800);
  }
  function dayColor(i) { return '#' + DG.DAY_COLORS[i % DG.DAY_COLORS.length]; }
  function findItem(id) {
    for (var d = 0; d < S.days.length; d++) for (var i = 0; i < S.days[d].items.length; i++) if (S.days[d].items[i].id === id) return { d: d, i: i, it: S.days[d].items[i] };
    return null;
  }
  function parseCoords(txt) {
    txt = String(txt || '');
    try { txt = decodeURIComponent(txt); } catch (e) { /* texto con % suelto */ }
    var num = '(-?\\d{1,3}\\.\\d+)', m;
    var pats = [new RegExp('@' + num + ',' + num), new RegExp('!3d' + num + '!4d' + num), new RegExp('[?&](?:q|ll|query|destination|center)=' + num + ',\\s*' + num), new RegExp('^\\s*' + num + '\\s*[,;\\s]\\s*' + num + '\\s*$')];
    for (var i = 0; i < pats.length; i++) {
      m = pats[i].exec(txt);
      if (m) { var la = +m[1], lo = +m[2]; if (Math.abs(la) <= 90 && Math.abs(lo) <= 180) return { lat: la, lng: lo }; }
    }
    return null;
  }
  function mapsLink(name) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name || 'México'); }
  function pickerHtml(kind, id, p, label) {
    var ok = DG.hasCoords(p), raw = p.raw || '';
    return '<div class="f pk"><label>' + label + '</label>' +
      '<div class="pick"><a class="btn small" target="_blank" rel="noopener" href="' + esc(mapsLink(p.name)) + '">Elegir en Google Maps</a>' +
      '<input type="text" ' + kind + '="' + id + '" data-fk="' + kind + '-' + id + '" value="' + esc(raw) + '" placeholder="Pega aquí lo que copies de Google Maps"></div>' +
      '<p class="hint">' + (ok ? '✓ Ubicación fijada: ' + p.lat.toFixed(5) + ', ' + p.lng.toFixed(5) : 'En Google Maps, haz clic derecho sobre el punto exacto, elige las coordenadas (la primera opción) para copiarlas y pégalas aquí. También sirve pegar el enlace largo de la página.') +
      (raw && !ok ? '<span class="err"> No se reconoció una ubicación; usa las coordenadas o el enlace completo (no el enlace corto).</span>' : '') + '</p></div>';
  }

  /* ---------- sección 1 ---------- */
  function fillGeneral() {
    $('#fecha').value = S.fecha; $('#paraN').value = S.para.nombre; $('#paraC').value = S.para.cargo;
    $('#deN').value = S.de.nombre; $('#deC').value = S.de.cargo; $('#obj').value = S.objetivo; $('#ant').value = S.antecedente || '';
    $('#kmh').value = S.opts.kmh; $('#circ').value = S.opts.circuity; $('#buf').value = S.opts.buffer; $('#gap').value = S.opts.gap;
    $('#ooad').value = String(S.ooadId);
  }
  function bindGeneral() {
    var sel = $('#ooad');
    sel.innerHTML = CAT.ooads.map(function (o) { return '<option value="' + o.id + '">' + esc(o.n) + '</option>'; }).join('');
    function bind(id, fn) { $(id).addEventListener('input', function (e) { fn(e.target.value); update({ people: false }); }); }
    bind('#fecha', function (v) { S.fecha = v; });
    bind('#paraN', function (v) { S.para.nombre = v; }); bind('#paraC', function (v) { S.para.cargo = v; });
    bind('#deN', function (v) { S.de.nombre = v; }); bind('#deC', function (v) { S.de.cargo = v; });
    bind('#obj', function (v) { S.objetivo = v; S.objetivoEdited = true; }); bind('#ant', function (v) { S.antecedente = v; });
    bind('#kmh', function (v) { S.opts.kmh = Math.max(20, +v || 55); }); bind('#circ', function (v) { S.opts.circuity = Math.max(1, +v || 1.3); });
    bind('#buf', function (v) { S.opts.buffer = Math.max(0, +v || 0); }); bind('#gap', function (v) { S.opts.gap = Math.max(0, +v || 0); });
    sel.addEventListener('change', function () { setOoad(+sel.value); });
  }
  function setOoad(id) {
    var o = ooadById(id), old = S.ooadId; S.ooadId = id; S.ooadName = o.n;
    S.people = S.people.filter(function (p) { return !(p.grupo === 'OOAD' && p.key && (p.ooadId == null || p.ooadId === old)) && p.grupo !== 'UNIDAD'; });
    UI.pOoad = id; UI.unitOoad = id; UI.draft = null;
    if (!S.objetivoEdited) { S.objetivo = defaultObjetivo(o.n); $('#obj').value = S.objetivo; }
    $('#ooad').value = String(id);
    update({ all: true });
  }

  /* ---------- sección 2: catálogo ---------- */
  function shortType(t) { return TYPE_SHORT[t] || t; }
  /* ---------- sección 3: participantes ---------- */
  function candidates() {
    var added = {}; S.people.forEach(function (p) { if (p.key) added[p.key] = 1; });
    var d = (CAT.dpes || []).slice().sort(function (x, y) { return (x.num || 0) - (y.num || 0); }).map(function (r) { return { key: 'D:' + r.s, grupo: 'DPES', sig: r.s, nombre: r.n, cargo: cargoDpes(r) }; });
    if (UI.pOoad == null || !ooadById(UI.pOoad)) UI.pOoad = S.ooadId;
    var po = UI.pOoad, pn = ooadById(po).n;
    var o = ooadPeople(po).map(function (p) { return { key: 'O:' + po + ':' + p.nombre, grupo: 'OOAD', ooadId: po, ooadName: pn, sig: p.sig, nombre: p.nombre, cargo: p.cargo, tag: p.tag }; });
    var f = function (c) { return !added[c.key]; };
    return { dpes: d.filter(f), ooad: o.filter(f) };
  }
  var CAND = {};
  function renderPeople() {
    var groups = [['DPES', 'DPES', S.people.filter(function (p) { return p.grupo === 'DPES'; })]];
    var og = {}, ordIds = [S.ooadId];
    S.people.forEach(function (p) { if (p.grupo === 'DPES') return; var id = p.ooadId != null ? p.ooadId : S.ooadId; (og[id] = og[id] || []).push(p); if (ordIds.indexOf(id) < 0) ordIds.push(id); });
    ordIds.forEach(function (id) { if (og[id]) groups.push(['O', 'OOAD ' + (id === S.ooadId ? S.ooadName : ooadById(id).n), og[id]]); });
    var html = '', htmlD = '';
    groups.forEach(function (g) {
      var ps = g[2];
      if (!ps.length) return;
      var gh = '<div class="grp"><h3>' + esc(g[1]) + '</h3>';
      ps.forEach(function (p) {
        gh += '<div class="person" data-pid="' + p.id + '">' +
          '<span></span>' +
          '<input type="text" aria-label="Siglas" data-fk="sig-' + p.id + '" data-pf="sig" value="' + esc(p.sig) + '" placeholder="Siglas">' +
          '<input type="text" aria-label="Nombre" data-fk="nom-' + p.id + '" data-pf="nombre" value="' + esc(p.nombre) + '" placeholder="Nombre">' +
          '<button type="button" class="btn small ghost rm" data-rm="' + p.id + '" aria-label="Quitar a ' + esc(p.nombre || p.sig) + '">✕</button>' +
          '<input type="text" aria-label="Cargo" class="cargo" data-fk="car-' + p.id + '" data-pf="cargo" value="' + esc(p.cargo) + '" placeholder="Cargo">' +
          (p.tag ? '<span class="tag"><span class="badge warn">' + esc(p.tag) + '</span></span>' : '') + '</div>';
      });
      gh += '</div>';
      if (g[0] === 'DPES') htmlD += gh; else html += gh;
    });
    $('#peopleD').innerHTML = htmlD; $('#people').innerHTML = html;
    if (!htmlD && !html) $('#peopleD').innerHTML = '<div class="empty">Aún no hay participantes. Elige uno de la lista y pulsa Agregar.</div>';
    var po = $('#pOoad'); if (!po.options.length) po.innerHTML = CAT.ooads.map(function (o) { return '<option value="' + o.id + '">' + esc(o.n) + '</option>'; }).join('');
    var c = candidates(); po.value = String(UI.pOoad); CAND = {}; c.dpes.concat(c.ooad).forEach(function (x) { CAND[x.key] = x; });
    function opts(list) { return list.map(function (x) { return '<option value="' + esc(x.key) + '">' + esc(x.nombre) + '</option>'; }).join(''); }
    function fill(sel, html) { var prev = sel.value; sel.innerHTML = html; if (prev && sel.querySelector('option[value="' + prev.replace(/"/g, '\\"') + '"]')) sel.value = prev; }
    fill($('#pSel'), c.dpes.length ? opts(c.dpes) : '<option value="">Todos agregados</option>');
    fill($('#pSelO'), opts(c.ooad) + '<option value="manual">Otra persona (captura manual)</option>');
  }
  function bindPeople() {
    var box = $('#s3');
    box.addEventListener('input', function (e) {
      var t = e.target, row = t.closest('[data-pid]'); if (!row || !t.dataset.pf) return;
      var p = S.people.filter(function (x) { return x.id === row.dataset.pid; })[0];
      p[t.dataset.pf] = t.value;
      if (t.dataset.pf === 'nombre' && !p.sigEdited && !p.key) { p.sig = DG.initials(p.nombre) || p.sig; var si = $('[data-fk="sig-' + p.id + '"]'); if (si) si.value = p.sig; }
      if (t.dataset.pf === 'sig') p.sigEdited = true;
      update({ people: false });
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rm]'); if (!b) return;
      S.people = S.people.filter(function (p) { return p.id !== b.dataset.rm; });
      S.days.forEach(function (d) { d.items.forEach(function (it) { if (Array.isArray(it.parts)) it.parts = it.parts.filter(function (x) { return x !== b.dataset.rm; }); }); });
      update({});
    });
    $('#pOoad').addEventListener('change', function (e) { UI.pOoad = +e.target.value; renderPeople(); });
    $('#pAdd').addEventListener('click', function () { addPerson($('#pSel').value); });
    $('#pAddO').addEventListener('click', function () { addPerson($('#pSelO').value); });
    function addPerson(k) {
      if (!k) return;
      var np;
      if (k === 'manual') np = { id: nid('p'), grupo: 'OOAD', ooadId: UI.pOoad, ooadName: ooadById(UI.pOoad).n, on: true, sig: '', nombre: '', cargo: '' };
      else { var c = CAND[k]; if (!c) return; np = { id: nid('p'), grupo: c.grupo, ooadId: c.ooadId, ooadName: c.ooadName, on: true, key: c.key, sig: c.sig, nombre: c.nombre, cargo: c.cargo, tag: c.tag || '' }; }
      S.people.push(np); update({});
      if (k === 'manual') { var n = $('[data-fk="nom-' + np.id + '"]'); if (n) n.focus(); }
      else toast('Agregado: ' + np.nombre);
    }
  }

  /* ---------- sección 3: días ---------- */
  function nextDate() { var l = S.days[S.days.length - 1]; return l ? DG.addDays(l.date, 1) : DG.addDays(todayISO(), 14); }
  function renderDays() {
    var f = $('#dayDate'); if (!f.value) f.value = nextDate();
    $('#dayCount').textContent = S.days.length ? S.days.length + (S.days.length === 1 ? ' día' : ' días') : '';
    $('#dayList').innerHTML = S.days.length ? S.days.map(function (d, i) {
      var n = d.items.length;
      return '<div class="dayrow" style="--dayc:' + dayColor(i) + '"><span class="tpill">Día ' + (i + 1) + '</span><span>' + esc(DG.weekday(d.date) + ' ' + DG.longDate(d.date)) + '</span><span class="hint">' + n + (n === 1 ? ' actividad' : ' actividades') + '</span>' +
        '<button type="button" class="btn small ghost" data-rmday="' + i + '" aria-label="Quitar el día ' + (i + 1) + '">✕</button></div>';
    }).join('') : '<div class="empty">Aún no hay días. Elige una fecha y pulsa Agregar día.</div>';
  }
  function bindDays() {
    $('#dayAdd').addEventListener('click', function () {
      var v = $('#dayDate').value;
      if (!DG.parseDate(v)) { toast('Elige una fecha válida.'); return; }
      if (S.days.some(function (d) { return d.date === v; })) { toast('Ese día ya está en la lista.'); return; }
      var cur = S.days[UI.day], nd = newDay(v);
      S.days.push(nd); S.days.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      UI.day = S.days.indexOf(cur && S.days.length > 1 ? nd : nd); S.example = false;
      $('#dayDate').value = DG.addDays(v, 1);
      update({ people: false });
    });
    $('#dayList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-rmday]'); if (!b) return;
      var snap = JSON.parse(JSON.stringify(S)), prevDay = UI.day, i = +b.dataset.rmday, n = S.days[i].items.length;
      S.days.splice(i, 1); if (UI.day >= i) UI.day = Math.max(0, UI.day - 1);
      update({});
      toast('Día quitado' + (n ? ' con sus ' + n + ' actividades.' : '.'), 'Deshacer', function () { S = snap; UI.day = prevDay; update({ all: true }); });
    });
  }

  /* ---------- sección 5: itinerario ---------- */
  function tabsHtml() {
    var h = S.days.map(function (d, i) { return '<button type="button" role="tab" class="tab" style="--dayc:' + dayColor(i) + '" aria-selected="' + (i === UI.day) + '" data-day="' + i + '">Día ' + (i + 1) + '</button>'; }).join('');
    return h;
  }
  function renderDaySet() {
    var d = S.days[UI.day];
    if (!d) { $('#daySet').innerHTML = ''; return; }
    var sp = d.startPlace || { name: '' };
    setHtml($('#daySet'), '<div class="hint" style="margin-bottom:8px"><b>' + esc(DG.weekday(d.date) + ' ' + DG.longDate(d.date)) + '</b></div><div class="day-set">' +
      '<div class="f"><label for="dStart">Hora de inicio</label><input type="time" id="dStart" data-fk="dStart" value="' + esc(d.start) + '"></div>' +
      '<div class="f"><label for="dSp">Punto de partida del día</label><input type="text" id="dSp" data-fk="dSp" value="' + esc(sp.name || '') + '" placeholder="' + (UI.day ? 'Hotel (se toma del check-in anterior)' : 'Opcional') + '"></div>' +
      '</div>' + pickerHtml('data-dsc', 'd', sp, 'Ubicación del punto de partida') +
      '');
  }
  function partsLabel(it, row) { return row.parts.length ? row.parts.join(', ') : 'sin participantes'; }
  function renderSchedule() {
    $('#tabs').innerHTML = tabsHtml();
    renderDaySet();
    if (!S.days.length) { $('#sch').innerHTML = '<div class="empty">Selecciona primero los días de la visita (paso 3) y arma el itinerario de cada uno.</div>'; $('#tcount').textContent = ''; return; }
    var d = S.days[UI.day], sd = SCHED.days[UI.day], color = dayColor(UI.day);
    var html = '';
    sd.rows.forEach(function (r, ri) {
      if (r.kind === 'traslado' && !r.manual) {
        var it = findItem(r.itemId).it;
        html += '<div class="srow tr" style="--dayc:' + color + '"><div class="tpill">' + esc(r.timeText) + '</div><div><div class="ttxt">' + esc(r.text) + '</div>' +
          '<div class="ctl"><label>Duración <input type="text" inputmode="numeric" autocomplete="off" data-fk="tm-' + it.id + '" data-tm="' + it.id + '" value="' + rawv('tm-' + it.id, it.travelMin != null ? it.travelMin : r.dur) + '"> min</label>' +
          '<span>' + (r.km != null && it.travelMin == null ? 'Estimado por distancia (' + Math.round(r.km) + ' km por carretera). Confírmalo en Google Maps.' : (it.travelMin != null ? 'Capturado a mano.' : 'Sin coordenadas: 30 min por omisión, ajústalo.')) + '</span>' +
          (it.travelMin != null ? '<button type="button" class="btn small ghost" data-tmreset="' + it.id + '">Volver al estimado</button>' : '') + '</div></div><div></div></div>';
        return;
      }
      var f = findItem(r.itemId), it2 = f.it, idx = f.i;
      var hasPlaceBox = it2.kind === 'traslado' || it2.kind === 'vuelo' || it2.kind === 'checkin' || it2.kind === 'libre';
      var needsTravelNote = (it2.kind === 'recorrido' || it2.kind === 'checkin') && it2.place && !(ri > 0 && sd.rows[ri - 1].kind === 'traslado') && idx === 0 && !(d.startPlace && d.startPlace.name) && UI.day === 0;
      html += '<div class="srow' + (r.conflict ? ' cf' : '') + '" style="--dayc:' + color + '"><div class="tpill">' + esc(r.timeText) + '</div><div>' +
        '<input type="text" aria-label="Actividad" data-fk="tx-' + it2.id + '" data-tx="' + it2.id + '" value="' + esc(it2.text || '') + '" placeholder="' + esc(DG.autoText(it2)) + '">' +
        '<div class="ctl"><label>Inicio fijo <input type="time" data-fk="fx-' + it2.id + '" data-fx="' + it2.id + '" value="' + esc(it2.fixed || '') + '"></label>' +
        '<label>Duración <input type="text" inputmode="numeric" autocomplete="off" data-fk="du-' + it2.id + '" data-du="' + it2.id + '" value="' + rawv('du-' + it2.id, it2.kind === 'traslado' ? r.dur : (it2.dur || 0)) + '"> min</label>' +
        '<button type="button" class="btn small" data-parts="' + it2.id + '">Participantes (' + r.parts.length + ')</button>' +
        (hasPlaceBox ? '<button type="button" class="btn small" data-place="' + it2.id + '">' + (it2.kind === 'traslado' ? 'Destino' : 'Lugar') + '</button>' : '') + '</div>' +
        '<div class="sig">' + esc(partsLabel(it2, r)) + '</div>' +
        (it2.kind === 'traslado' ? '<div class="hint" style="margin-top:4px">' + (+it2.dur > 0 ? 'Duración capturada a mano.' : (r.km != null ? 'Estimado por distancia (' + Math.round(r.km) + ' km por carretera). Confírmalo en Google Maps.' : 'Sin coordenadas de origen y destino: 30 min por omisión, ajústalo.')) + '</div>' : '') +
        (r.conflict ? '<div class="warnline">' + esc(r.conflict) + '</div>' : '') +
        (needsTravelNote ? '<div class="hint" style="margin-top:4px">Sin punto de partida no se calcula traslado a esta unidad. Agrega el vuelo con su aeropuerto o define el punto de partida del día.</div>' : '') +
        (UI.openParts === it2.id ? partsPanel(it2) : '') + (UI.openPlace === it2.id ? placePanel(it2) : '') +
        '</div><div class="side"><button type="button" class="btn small ghost" data-mv="-1:' + it2.id + '" aria-label="Subir"' + (idx === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="btn small ghost" data-mv="1:' + it2.id + '" aria-label="Bajar"' + (idx === d.items.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" class="btn small ghost" data-del="' + it2.id + '" aria-label="Quitar actividad">✕</button></div></div>';
    });
    if (!html) html = '<div class="empty">Este día no tiene actividades. Usa «Agregar al día activo» para sumar unidades, traslados y demás actividades.</div>';
    setHtml($('#sch'), html);
    $('#tcount').textContent = SCHED.tCount + (SCHED.tCount === 1 ? ' traslado' : ' traslados') + ' en total';
  }
  function rawv(fk, v) { return UI.raw && UI.raw.fk === fk ? esc(UI.raw.v) : v; }
  function partsPanel(it) {
    var on = S.people.filter(function (p) { return p.on && (p.nombre || p.sig); });
    var cur = Array.isArray(it.parts) ? it.parts : null;
    var defaultRow = SCHED.days[UI.day].rows.filter(function (r) { return r.itemId === it.id && (r.kind !== 'traslado' || r.manual); })[0];
    return '<div class="panel">' + on.map(function (p) {
      var checked = cur ? cur.indexOf(p.id) >= 0 : (defaultRow && defaultRow.parts.indexOf(p.sig || DG.initials(p.nombre)) >= 0);
      return '<label><input type="checkbox" data-pp="' + it.id + ':' + p.id + '"' + (checked ? ' checked' : '') + '>' + esc((p.sig || DG.initials(p.nombre)) + ' · ' + (p.nombre || '')) + '</label>';
    }).join('') + '<div class="full"><button type="button" class="btn small" data-pdef="' + it.id + '">Usar participantes predeterminados</button></div></div>';
  }
  function placePanel(it) {
    var p = it.place || { name: '' };
    return '<div class="panel"><div class="f"><label>' + (it.kind === 'vuelo' ? 'Aeropuerto de destino' : it.kind === 'traslado' ? 'Destino' : 'Lugar') + '</label><input type="text" data-fk="pn-' + it.id + '" data-pn="' + it.id + '" value="' + esc(p.name || '') + '" placeholder="Nombre del lugar"></div>' +
      pickerHtml('data-pc', it.id, p, 'Ubicación') + '</div>';
  }
  function bindSchedule() {
    $('#tabs').addEventListener('click', function (e) {
      var t = e.target.closest('[data-day]');
      if (t) { UI.day = +t.dataset.day; UI.openParts = UI.openPlace = null; update({ people: false }); renderAddForm(); return; }
    });
    $('#daySet').addEventListener('input', function (e) {
      var d = S.days[UI.day], id = e.target.id; if (!d) return;
      if (id === 'dStart') d.start = e.target.value;
      else if (id === 'dSp') { d.startPlace = d.startPlace || {}; d.startPlace.name = e.target.value; }
      else if (e.target.dataset.dsc) { var c = parseCoords(e.target.value); d.startPlace = d.startPlace || {}; d.startPlace.raw = e.target.value; if (c) { d.startPlace.lat = c.lat; d.startPlace.lng = c.lng; } else { delete d.startPlace.lat; delete d.startPlace.lng; } }
      typedUpdate();
    });
    var sch = $('#sch');
    sch.addEventListener('input', function (e) {
      var t = e.target, id;
      if ((id = t.dataset.tx)) findItem(id).it.text = t.value;
      else if ((id = t.dataset.fx)) { findItem(id).it.fixed = t.value || null; }
      else if ((id = t.dataset.du)) { t.value = t.value.replace(/\D/g, ''); UI.raw = { fk: 'du-' + id, v: t.value }; findItem(id).it.dur = Math.max(0, +t.value || 0); }
      else if ((id = t.dataset.tm)) { t.value = t.value.replace(/\D/g, ''); UI.raw = { fk: 'tm-' + id, v: t.value }; var v = t.value === '' ? null : Math.max(1, +t.value); findItem(id).it.travelMin = v; }
      else if ((id = t.dataset.pn)) { var it = findItem(id).it; it.place = it.place || {}; it.place.name = t.value; }
      else if ((id = t.dataset.pc)) { var it2 = findItem(id).it, c = parseCoords(t.value); it2.place = it2.place || {}; it2.place.raw = t.value; if (c) { it2.place.lat = c.lat; it2.place.lng = c.lng; } else { delete it2.place.lat; delete it2.place.lng; } }
      else return;
      typedUpdate();
    });
    sch.addEventListener('focusout', function (e) { if (UI.raw && (e.target.dataset.du || e.target.dataset.tm)) { UI.raw = null; typedUpdate(true); } });
    sch.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.pp) {
        var bits = t.dataset.pp.split(':'), it = findItem(bits[0]).it;
        if (!Array.isArray(it.parts)) {
          var row = SCHED.days[UI.day].rows.filter(function (r) { return r.itemId === it.id && (r.kind !== 'traslado' || r.manual); })[0];
          it.parts = S.people.filter(function (p) { return p.on && row.parts.indexOf(p.sig || DG.initials(p.nombre)) >= 0; }).map(function (p) { return p.id; });
        }
        var k = it.parts.indexOf(bits[1]); if (t.checked && k < 0) it.parts.push(bits[1]); if (!t.checked && k >= 0) it.parts.splice(k, 1);
        update({ people: false });
      }
    });
    sch.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.parts) { UI.openParts = UI.openParts === b.dataset.parts ? null : b.dataset.parts; update({ people: false }); }
      else if (b.dataset.place) { UI.openPlace = UI.openPlace === b.dataset.place ? null : b.dataset.place; update({ people: false }); }
      else if (b.dataset.pdef) { findItem(b.dataset.pdef).it.parts = null; update({ people: false }); }
      else if (b.dataset.tmreset) { findItem(b.dataset.tmreset).it.travelMin = null; update({ people: false }); }
      else if (b.dataset.del) { var f = findItem(b.dataset.del); S.days[f.d].items.splice(f.i, 1); update({}); }
      else if (b.dataset.mv) {
        var p = b.dataset.mv.split(':'), dir = +p[0], f2 = findItem(p[1]), arr = S.days[f2.d].items, j = f2.i + dir;
        if (j >= 0 && j < arr.length) { var tmp = arr[f2.i]; arr[f2.i] = arr[j]; arr[j] = tmp; update({ people: false }); }
      }
    });
  }

  /* ---------- agregar al día activo (selector de actividad + condicionantes + Agregar) ---------- */
  var KINDS = [['recorrido', 'Recorrido a unidad operativa'], ['vuelo', 'Vuelo'], ['traslado', 'Traslado'], ['comida', 'Comida'], ['cierre', 'Reunión de cierre'], ['checkin', 'Check-in hotel'], ['libre', 'Otra actividad']];
  function lastOoadName() {
    var d = S.days[UI.day], lr = d && d.items.filter(function (x) { return x.kind === 'recorrido' && x.ooadName; }).pop();
    return lr ? lr.ooadName : S.ooadName;
  }
  function newDraft(k) {
    var oo = UI.unitOoad != null ? UI.unitOoad : S.ooadId;
    switch (k) {
      case 'vuelo': return { kind: k, name: 'AICM', raw: '', tsal: '', name2: '', raw2: '', tlle: '' };
      case 'traslado': return { kind: k, thora: '', omode: 'auto', nameO: '', rawO: '', ooadO: oo, unitO: null, mode: 'mapa', name: '', raw: '', ooad: oo, unit: null };
      case 'comida': return { kind: k, dur: '90' };
      case 'cierre': return { kind: k, dur: '30' };
      case 'checkin': return { kind: k, name: 'Hotel en ' + lastOoadName(), raw: '', dur: '0' };
      case 'libre': return { kind: k, text: 'Actividad', dur: '30' };
      default: return { kind: 'recorrido', ooad: oo, unit: null, dur: '60' };
    }
  }
  function adPicker(d, label, key) {
    key = key || '';
    var c = parseCoords(d['raw' + key]);
    return '<div class="f pk"><label>' + label + '</label><div class="pick"><a class="btn small" id="adLink' + key + '" target="_blank" rel="noopener" href="' + esc(mapsLink(d['name' + key])) + '">Elegir en Google Maps</a>' +
      '<input type="text" data-ad="raw' + key + '" value="' + esc(d['raw' + key]) + '" placeholder="Pega aquí lo que copies de Google Maps" aria-label="Coordenadas"></div>' +
      '<p class="hint" id="adHint' + key + '">' + adHint(d['raw' + key], c) + '</p></div>';
  }
  function adHint(raw, c) {
    if (c) return '✓ Ubicación fijada: ' + c.lat.toFixed(5) + ', ' + c.lng.toFixed(5);
    if (raw) return '<span class="err">No se reconoció una ubicación; usa las coordenadas o el enlace completo (no el enlace corto).</span>';
    return 'En Google Maps, haz clic derecho sobre el punto exacto, elige las coordenadas (la primera opción) para copiarlas y pégalas aquí. También sirve pegar el enlace largo de la página.';
  }
  function unitPicker(d, k) {
    k = k || '';
    var list = CAT.units.filter(function (u) { return u.o === d['ooad' + k]; }).sort(function (a, b) {
      var ia = TYPE_ORDER.indexOf(a.t), ib = TYPE_ORDER.indexOf(b.t); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.n.localeCompare(b.n); });
    var added = {}; S.days.forEach(function (dd) { dd.items.forEach(function (it) { if (it.unitCve != null) added[it.unitCve] = 1; }); });
    if (d['unit' + k] == null || !list.some(function (u) { return u.c === d['unit' + k]; })) d['unit' + k] = list.length ? list[0].c : null;
    var u = d['unit' + k] != null ? unitByCve(d['unit' + k]) : null;
    return '<div class="f-row"><div class="f"><label>OOAD</label><select data-ad="ooad' + k + '">' + CAT.ooads.map(function (o) { return '<option value="' + o.id + '"' + (o.id === d['ooad' + k] ? ' selected' : '') + '>' + esc(o.n) + '</option>'; }).join('') + '</select></div>' +
      '<div class="f"><label>Unidad Operativa <small>' + list.length + (list.length === 1 ? ' unidad' : ' unidades') + '</small></label><select data-ad="unit' + k + '">' +
      (list.length ? list.map(function (x) { return '<option value="' + x.c + '"' + (x.c === d['unit' + k] ? ' selected' : '') + '>' + esc(x.n + ' · ' + shortType(x.t) + (x.e ? ' (' + x.e + ')' : '') + (added[x.c] ? ' ✓' : '')) + '</option>'; }).join('') : '<option value="">Sin unidades en este OOAD</option>') + '</select></div></div>' +
      (d.kind === 'recorrido' ? '<div class="unit-info">' + (u ? '<div><span class="badge">' + esc(shortType(u.t)) + '</span>' + (u.e ? '<span class="badge warn">' + esc(u.e) + '</span>' : '') + esc(u.ci) + '</div>' + (u.i.length ? '<div>' + esc(u.i.join(' · ')) + '</div>' : '') : '') + '</div>' : '');
  }
  function durField(d) { return '<div class="f"><label>Duración (min)</label><input type="text" inputmode="numeric" autocomplete="off" data-ad="dur" value="' + esc(d.dur) + '"></div>'; }
  function renderAddForm() {
    var box = $('#addForm'), sel = $('#adKind');
    if (!UI.draft) UI.draft = newDraft('recorrido');
    var d = UI.draft, has = S.days.length > 0;
    if (!sel.options.length) sel.innerHTML = KINDS.map(function (k) { return '<option value="' + k[0] + '">' + k[1] + '</option>'; }).join('');
    sel.value = d.kind; sel.disabled = !has;
    var h = '';
    if (d.kind === 'recorrido') h += unitPicker(d) + '<div class="f-row">' + durField(d) + '<div></div></div>';
    else if (d.kind === 'vuelo') {
      h += '<div class="lbl">Origen del vuelo</div><div class="f-row"><div class="f"><label>Aeropuerto de origen</label><input type="text" data-ad="name" value="' + esc(d.name) + '" placeholder="Nombre del aeropuerto"></div>' +
        '<div class="f"><label>Hora de salida</label><input type="time" data-ad="tsal" value="' + esc(d.tsal) + '"></div></div>' + adPicker(d, 'Ubicación del aeropuerto de origen (opcional)', '') +
        '<div class="lbl" style="margin-top:14px">Destino del vuelo</div><div class="f-row"><div class="f"><label>Aeropuerto de destino</label><input type="text" data-ad="name2" value="' + esc(d.name2) + '" placeholder="Nombre del aeropuerto"></div>' +
        '<div class="f"><label>Hora de llegada</label><input type="time" data-ad="tlle" value="' + esc(d.tlle) + '"></div></div>' + adPicker(d, 'Ubicación del aeropuerto de destino', '2') +
        '<p class="hint">La duración del vuelo se calcula con las horas capturadas (horas locales; si la llegada es menor que la salida se toma como día siguiente).</p>';
    } else if (d.kind === 'traslado') {
      function seg(attr, cur, opts) { return '<div class="seg">' + opts.map(function (o) { return '<button type="button" class="btn small" ' + attr + '="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
      h += '<div class="lbl">Ubicación del punto de partida</div>' + seg('data-admodeo', d.omode, [['auto', 'Lugar anterior'], ['mapa', 'Punto de Google Maps'], ['unidad', 'Unidad operativa del OOAD']]);
      if (d.omode === 'auto') h += '<p class="hint">Sale del lugar de la actividad anterior (o del punto de partida del día).</p>';
      else if (d.omode === 'mapa') h += '<div class="f"><label>Nombre del origen</label><input type="text" data-ad="nameO" value="' + esc(d.nameO) + '" placeholder="Ej. Hotel, aeropuerto, oficinas del OOAD"></div>' + adPicker(d, 'Ubicación del origen', 'O');
      else h += unitPicker(d, 'O');
      h += '<div class="f-row" style="margin-top:8px"><div class="f"><label>Hora de salida <small>(opcional)</small></label><input type="time" data-ad="thora" value="' + esc(d.thora) + '"></div><p class="hint" style="align-self:end;margin:0">Si la dejas vacía, sale al terminar la actividad anterior.</p></div>';
      h += '<div class="lbl" style="margin-top:14px">Destino del traslado</div>' + seg('data-admode', d.mode, [['mapa', 'Punto de Google Maps'], ['unidad', 'Unidad operativa del OOAD']]);
      h += d.mode === 'mapa' ? '<div class="f"><label>Nombre del destino</label><input type="text" data-ad="name" value="' + esc(d.name) + '" placeholder="Ej. Hotel, aeropuerto, oficinas del OOAD"></div>' + adPicker(d, 'Ubicación del destino') : unitPicker(d);
    } else if (d.kind === 'checkin') {
      h += '<div class="f-row"><div class="f"><label>Hotel</label><input type="text" data-ad="name" value="' + esc(d.name) + '"></div>' + durField(d) + '</div>' + adPicker(d, 'Ubicación del hotel');
    } else if (d.kind === 'libre') {
      h += '<div class="f-row"><div class="f"><label>Descripción</label><input type="text" data-ad="text" value="' + esc(d.text) + '"></div>' + durField(d) + '</div>';
    } else h += '<div class="f-row">' + durField(d) + '<div></div></div>';
    h += '<div style="margin-top:14px"><button type="button" class="btn add" data-adok' + (has ? '' : ' disabled') + '>' + (has ? 'Agregar al Día ' + (UI.day + 1) : 'Primero selecciona los días') + '</button></div>';
    setHtml(box, h);
  }
  function bindAddForm() {
    var box = $('#addForm');
    $('#adKind').addEventListener('change', function (e) { UI.draft = newDraft(e.target.value); renderAddForm(); });
    box.addEventListener('input', function (e) {
      var f = e.target.dataset.ad, d = UI.draft; if (!f || !d || e.target.tagName === 'SELECT') return;
      if (f === 'dur') e.target.value = e.target.value.replace(/\D/g, '');
      d[f] = e.target.value;
      if (f.indexOf('name') === 0) { var l = $('#adLink' + f.slice(4)); if (l) l.href = mapsLink(d[f]); }
      if (f.indexOf('raw') === 0) $('#adHint' + f.slice(3)).innerHTML = adHint(d[f], parseCoords(d[f]));
    });
    box.addEventListener('change', function (e) {
      var f = e.target.dataset.ad, d = UI.draft; if (!d || e.target.tagName !== 'SELECT') return;
      if (f === 'ooad' || f === 'ooadO') { var kk = f.slice(4); d['ooad' + kk] = +e.target.value; UI.unitOoad = d['ooad' + kk]; d['unit' + kk] = null; renderAddForm(); }
      else if (f === 'unit' || f === 'unitO') { d[f] = +e.target.value; renderAddForm(); }
    });
    box.addEventListener('click', function (e) {
      var d = UI.draft, b; if (!d) return;
      if ((b = e.target.closest('[data-admode]'))) { d.mode = b.dataset.admode; renderAddForm(); return; }
      if ((b = e.target.closest('[data-admodeo]'))) { d.omode = b.dataset.admodeo; renderAddForm(); return; }
      if (!e.target.closest('[data-adok]')) return;
      if (!S.days[UI.day]) { toast('Primero selecciona los días de la visita.'); return; }
      var it = { id: nid(), kind: d.kind, dur: 0 }, msg;
      function placeFrom(name, raw) { var c = parseCoords(raw), p = { name: name.trim() }; if (c) { p.lat = c.lat; p.lng = c.lng; } if (raw) p.raw = raw; return p; }
      if (d.kind === 'recorrido') {
        var u = d.unit != null ? unitByCve(d.unit) : null; if (!u) { toast('Elige una unidad operativa.'); return; }
        it = recorrido(u); it.dur = Math.max(0, +d.dur || 0); msg = u.n; if (u.e) toast(u.n + ' aparece como "' + u.e + '" en el catálogo.');
      } else if (d.kind === 'vuelo') {
        if (!d.name.trim() || !d.name2.trim()) { toast('Escribe el aeropuerto de origen y el de destino.'); return; }
        if (!d.tsal || !d.tlle) { toast('Captura la hora de salida y la de llegada.'); return; }
        var m1 = DG.toMin(d.tsal), m2 = DG.toMin(d.tlle);
        it.fixed = d.tsal; it.dur = (m2 - m1 + 1440) % 1440; it.origin = placeFrom(d.name, d.raw); it.place = placeFrom(d.name2, d.raw2); msg = 'vuelo ' + d.name.trim() + ' – ' + d.name2.trim();
      } else if (d.kind === 'traslado') {
        it.dur = null; if (d.thora) it.fixed = d.thora;
        if (d.mode === 'unidad') { var u2 = d.unit != null ? unitByCve(d.unit) : null; if (!u2) { toast('Elige una unidad operativa.'); return; } it.place = placeOf(u2); }
        else { if (!d.name.trim()) { toast('Escribe el nombre del destino.'); return; } it.place = placeFrom(d.name, d.raw); }
        if (d.omode === 'unidad') { var uo = d.unitO != null ? unitByCve(d.unitO) : null; if (!uo) { toast('Elige la unidad operativa de origen.'); return; } it.origin = placeOf(uo); }
        else if (d.omode === 'mapa') { if (!d.nameO.trim()) { toast('Escribe el nombre del origen.'); return; } it.origin = placeFrom(d.nameO, d.rawO); }
        msg = 'traslado' + (it.origin ? ' de ' + it.origin.name : '') + ' a ' + it.place.name;
      } else if (d.kind === 'checkin') {
        it.dur = Math.max(0, +d.dur || 0); it.place = placeFrom(d.name || 'Hotel en ' + S.ooadName, d.raw); msg = 'check-in';
      } else if (d.kind === 'libre') {
        it.dur = Math.max(0, +d.dur || 0); it.text = d.text.trim() || 'Actividad'; msg = it.text;
      } else { it.dur = Math.max(0, +d.dur || 0); msg = d.kind === 'comida' ? 'comida' : 'reunión de cierre'; }
      S.days[UI.day].items.push(it); if (S.example) S.example = false;
      var k = d.kind, keep = { ooad: d.ooad, unit: d.unit };
      UI.draft = newDraft(k); if (k === 'recorrido' || k === 'traslado') { UI.draft.ooad = keep.ooad; UI.draft.unit = keep.unit; } if (k === 'recorrido') UI.draft.dur = d.dur;
      update({ people: false });
      toast('Agregado al Día ' + (UI.day + 1) + ': ' + msg);
    });
  }

  /* ---------- mapa ---------- */
  var MEX = null;
  function drawSchematic(canvas, sched, W, H) {
    var ctx = canvas.getContext('2d'); canvas.width = W; canvas.height = H;
    ctx.fillStyle = '#EEF2EF'; ctx.fillRect(0, 0, W, H);
    var pts = []; sched.days.forEach(function (d) { d.points.forEach(function (p) { pts.push(p); }); });
    if (pts.length < 2) { ctx.fillStyle = '#5F6D69'; ctx.font = '600 ' + Math.round(W / 55) + 'px "Noto Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Agrega al menos dos lugares con coordenadas para ver el esquema', W / 2, H / 2); return false; }
    var lat0 = pts.reduce(function (a, p) { return a + p.lat; }, 0) / pts.length, kx = Math.cos(lat0 * Math.PI / 180);
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(function (p) { var x = p.lng * kx, y = -p.lat; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
    var padX = W * 0.16, padY = H * 0.16, bw = Math.max(maxX - minX, 0.02), bh = Math.max(maxY - minY, 0.02);
    var sc = Math.min((W - 2 * padX) / bw, (H - 2 * padY) / bh);
    var ox = (W - bw * sc) / 2, oy = (H - bh * sc) / 2;
    function P(p) { return { x: ox + (p.lng * kx - minX) * sc, y: oy + (-p.lat - minY) * sc }; }
    // estados de México de fondo
    if (MEX) {
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#C5CFCB'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
      MEX.forEach(function (s) { s.p.forEach(function (ring) {
        var xs = ring.map(function (c) { return P({ lat: c[1], lng: c[0] }); });
        if (xs.every(function (q) { return q.x < -50 || q.x > W + 50; }) || xs.every(function (q) { return q.y < -50 || q.y > H + 50; })) return;
        ctx.beginPath(); xs.forEach(function (q, i) { if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.closePath(); ctx.fill(); ctx.stroke();
      }); });
      ctx.fillStyle = 'rgba(95,109,105,.55)'; ctx.font = '600 ' + Math.round(W / 80) + 'px "Noto Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      MEX.forEach(function (s) {
        var big = s.p.slice().sort(function (a, b) { return b.length - a.length; })[0]; if (!big) return;
        var sx = 0, sy = 0; big.forEach(function (c) { sx += c[0]; sy += c[1]; }); var q = P({ lat: sy / big.length, lng: sx / big.length });
        if (q.x > 40 && q.x < W - 40 && q.y > 30 && q.y < H - 30) ctx.fillText(s.n.toUpperCase(), q.x, q.y);
      });
      ctx.textBaseline = 'alphabetic';
    }
    // cuadrícula
    ctx.strokeStyle = 'rgba(30,91,79,.09)'; ctx.lineWidth = 1;
    for (var gx = 0; gx <= W; gx += W / 12) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 0; gy <= H; gy += H / 8) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    var fs = Math.round(W / 62);
    sched.days.forEach(function (d) {
      var col = '#' + d.color;
      var seq = d.points;
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, W / 300); ctx.lineJoin = 'round'; ctx.setLineDash([]);
      ctx.beginPath(); seq.forEach(function (p, i) { var q = P(p); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke();
    });
    // etiquetas T en el punto medio de cada tramo
    sched.days.forEach(function (d) {
      var col = '#' + d.color;
      d.legs.forEach(function (l) {
        var a = null, b = null;
        for (var i = 0; i < d.points.length; i++) { if (d.points[i].name === l.to) b = d.points[i]; }
        if (b) { for (var j = 0; j < d.points.length; j++) { if (d.points[j] === b) { a = d.points[j - 1]; break; } } }
        if (!a || !b) return;
        var pa = P(a), pb = P(b), mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2, t = 'T' + l.n;
        ctx.font = '700 ' + fs + 'px "Noto Sans", sans-serif'; var tw = ctx.measureText(t).width + fs * 1.1, th = fs * 1.7;
        ctx.fillStyle = col; roundRect(ctx, mx - tw / 2, my - th / 2, tw, th, 5); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, mx, my + 1);
      });
    });
    // puntos y nombres
    var seen = {}, labBoxes = [];
    sched.days.forEach(function (d) {
      d.points.forEach(function (p) {
        var key = p.name; if (seen[key]) return; seen[key] = 1;
        var q = P(p); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#' + d.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(q.x, q.y, fs * 0.55, 0, 7); ctx.fill(); ctx.stroke();
        ctx.font = '600 ' + fs + 'px "Noto Sans", sans-serif'; ctx.textBaseline = 'alphabetic';
        var lab = p.name.length > 34 ? p.name.slice(0, 33) + '…' : p.name, w = ctx.measureText(lab).width, best = null;
        var cands = [[1, -0.9], [1, 1.9], [-1, -0.9], [-1, 1.9], [1, -2.6], [1, 3.6], [-1, -2.6], [-1, 3.6]];
        for (var ci = 0; ci < cands.length && !best; ci++) {
          var sx = cands[ci][0], lx0 = sx > 0 ? q.x + fs : q.x - fs - w, ly0 = q.y + cands[ci][1] * fs;
          if (lx0 < 6 || lx0 + w > W - 6 || ly0 - fs < 4 || ly0 > H - 20) continue;
          var rc = [lx0 - 3, ly0 - fs, w + 6, fs * 1.3], hit = false;
          for (var bi = 0; bi < labBoxes.length && !hit; bi++) { var o = labBoxes[bi]; hit = rc[0] < o[0] + o[2] && rc[0] + rc[2] > o[0] && rc[1] < o[1] + o[3] && rc[1] + rc[3] > o[1]; }
          if (!hit) best = { x: lx0, y: ly0, rc: rc };
        }
        if (!best) best = { x: q.x + fs, y: q.y - fs * 0.9, rc: [q.x + fs - 3, q.y - fs * 1.9, w + 6, fs * 1.3] };
        labBoxes.push(best.rc);
        ctx.textAlign = 'left'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.strokeText(lab, best.x, best.y); ctx.fillStyle = '#1B2724'; ctx.fillText(lab, best.x, best.y);
      });
    });
    ctx.font = '400 ' + Math.round(fs * 0.8) + 'px "Noto Sans", sans-serif'; ctx.fillStyle = '#5F6D69'; ctx.textAlign = 'left';
    ctx.fillText('Esquema de recorridos sin escala vial', 12, H - 12);
    return true;
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  var LM = null, LSIG = '';
  function renderLeaflet(show) {
    var el = $('#lmap'); if (!el) return false; el.hidden = !show;
    if (!show || !window.L) { return false; }
    if (!LM) {
      var map = L.map(el, { attributionControl: false, preferCanvas: false, zoomSnap: 0.25, minZoom: 3, maxZoom: 16, worldCopyJump: false });
      LM = { map: map, states: L.layerGroup().addTo(map), days: L.layerGroup().addTo(map), ctl: null, statesDone: false };
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
      map.setView([23.5, -102], 4.5);
    }
    if (MEX && !LM.statesDone) {
      LM.statesDone = true;
      MEX.forEach(function (s) { s.p.forEach(function (ring) { L.polygon(ring.map(function (c) { return [c[1], c[0]]; }), { color: '#C5CFCB', weight: 1, fillColor: '#FFFFFF', fillOpacity: 1, interactive: false }).addTo(LM.states); }); });
    }
    LM.map.invalidateSize();
    if (LM.ctl) { LM.map.removeControl(LM.ctl); LM.ctl = null; }
    LM.days.clearLayers();
    var overlays = {}, all = [], seen = {};
    SCHED.days.forEach(function (d) {
      var g = L.layerGroup(), col = '#' + d.color, pts = d.points.filter(DG.hasCoords);
      if (pts.length > 1) L.polyline(pts.map(function (p) { return [p.lat, p.lng]; }), { color: col, weight: 4, opacity: .9 }).addTo(g);
      d.legs.forEach(function (l) {
        var bi = -1; for (var i = 0; i < d.points.length; i++) if (d.points[i].name === l.to) bi = i;
        var a = bi > 0 ? d.points[bi - 1] : null, b = bi >= 0 ? d.points[bi] : null;
        if (!a || !b || !DG.hasCoords(a) || !DG.hasCoords(b)) return;
        L.marker([(a.lat + b.lat) / 2, (a.lng + b.lng) / 2], { interactive: false, icon: L.divIcon({ className: 'tlab', html: '<span style="background:' + col + '">T' + l.n + '</span>', iconSize: [0, 0] }) }).addTo(g);
      });
      pts.forEach(function (p) {
        all.push([p.lat, p.lng]);
        var m = L.circleMarker([p.lat, p.lng], { radius: 6, color: col, weight: 3, fillColor: '#fff', fillOpacity: 1 });
        m.bindTooltip(p.name, { permanent: !seen[p.name] && pts.length <= 9, direction: 'right', offset: [8, 0], className: 'plab' }); seen[p.name] = 1; m.addTo(g);
      });
      overlays['<span style="color:' + col + ';font-weight:700">' + esc(d.mapLabel.replace(/:.*$/, '')) + '</span>'] = g; g.addTo(LM.days);
    });
    if (SCHED.days.length > 1) LM.ctl = L.control.layers(null, overlays, { collapsed: false, position: 'topright' }).addTo(LM.map);
    var sig = JSON.stringify(all);
    if (sig !== LSIG) {
      LSIG = sig;
      if (all.length > 1) LM.map.fitBounds(L.latLngBounds(all), { paddingTopLeft: [36, 36], paddingBottomRight: [150, 36], maxZoom: 11 });
      else if (all.length === 1) LM.map.setView(all[0], 9); else LM.map.setView([23.5, -102], 4.5);
    }
    return true;
  }
  function mapModeOf() { var m = S.mapMode; return m === 'ninguno' || m === 'espacio' ? m : 'captura'; }
  function renderMap() {
    var box = $('#mapBox'); box.innerHTML = '';
    var mode = mapModeOf();
    $('#mapMode').value = mode; box.hidden = mode === 'ninguno'; $('#mapOpts').hidden = mode !== 'captura';
    $('#mapHint').textContent = mode === 'captura' ? 'Abre cada día en Google Maps, ajusta la ruta, toma una captura y pégala aquí (Ctrl+V). Se inserta en el Word con calles y referencias reales. Mientras no cargues una captura, el Word deja un recuadro en blanco con marco. Con el mapa de Mapbox: arrastra con el ratón para moverlo y usa la rueda para acercar o alejar.'
      : mode === 'espacio' ? 'El Word llevará la lista de traslados y un recuadro vacío del tamaño del mapa, listo para pegar o dibujar tu mapa e imprimirlo.' : 'El Word llevará solo la lista de traslados por día.';
    renderLeaflet(false);
    if (mode === 'espacio') { box.innerHTML = '<div class="mapblank">Recuadro en blanco en el Word para el mapa</div>'; }
    else if (mode === 'ninguno') { /* sin mapa */ }
    else if (UI.mapImg) { var im = document.createElement('img'); im.src = UI.mapImg.url; im.alt = 'Mapa cargado'; box.appendChild(im); }
    else { box.innerHTML = '<div class="mapblank" id="mapDrop" tabindex="0">Pega aquí la captura del mapa (Ctrl+V) o arrástrala</div>'; }
    box.classList.toggle('drag', !!(UI.mapGen && UI.mapImg)); $('#mapClear').hidden = !UI.mapImg; $('#mapZoom').hidden = !(UI.mapGen && UI.mapImg); if (UI.mapGen) $('#mapZoomLbl').textContent = 'Zoom ' + UI.mapGen.view.zoom;
    $('#legend').innerHTML = SCHED.days.map(function (d) {
      var l = d.legs.map(function (x) { return '<div>T' + x.n + ': ' + esc(x.from ? x.from + ' – ' + x.to : 'Hacia ' + x.to) + ' <span class="hint">(' + x.min + ' min' + (x.km != null ? ', ' + Math.round(x.km) + ' km' : '') + ')</span></div>'; }).join('') || '<div class="hint">Sin traslados.</div>';
      return '<div style="--dayc:' + '#' + d.color + '"><b>' + esc(d.mapLabel) + '</b>' + l + '</div>';
    }).join('');
    $('#gmaps').innerHTML = SCHED.days.map(function (d) {
      var pts = d.points.filter(DG.hasCoords); if (pts.length < 2) return '';
      return '<a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/' + pts.map(function (p) { return p.lat + ',' + p.lng; }).join('/') + '">Abrir Día ' + (d.idx + 1) + ' en Google Maps</a>';
    }).join('');
  }

  /* ---------- vista previa ---------- */
  function pvPerson(p) { var sig = p.sig || DG.initials(p.nombre); return '<li><b>' + (p.nombre ? esc(p.nombre) : '<span class="ph">[Nombre]</span>') + ' (' + esc(sig) + '),</b> ' + esc((p.cargo || '').replace(/\.\s*$/, '')) + '.</li>'; }
  function renderPreview() {
    var on = S.people.filter(function (p) { return p.on && (p.nombre || p.sig); });
    var dp = on.filter(function (p) { return p.grupo === 'DPES'; }), og = DG.ooadGroups(S);
    var h = '<div class="paper"><div class="band"></div><div class="r">Ciudad de México a ' + esc(DG.longDate(S.fecha)) + '</div>' +
      '<div class="addr"><b>Para: ' + esc(S.para.nombre) + '</b>' + esc(S.para.cargo) + '</div><div class="addr" style="margin-top:10px"><b>De: ' + esc(S.de.nombre) + '</b>' + esc(S.de.cargo) + '</div>' +
      '<h3>Agenda de visita de acompañamiento ' + esc(DG.ooadTitle(S)) + '</h3>' +
      (S.objetivo.trim() ? '<p><span class="g">Objetivo:</span> ' + esc(S.objetivo.trim()) + '</p>' : '') + (S.antecedente.trim() ? '<p>' + esc(S.antecedente.trim()) + '</p>' : '') +
      '<div class="secthd">Participantes</div>' +
      (dp.length ? '<p class="g" style="margin:0 0 2px 20px">DPES</p><ul>' + dp.map(pvPerson).join('') + '</ul>' : '') +
      og.map(function (g) { return '<p class="g" style="margin:0 0 2px 20px">OOAD ' + esc(g.name) + '</p><ul>' + g.people.map(pvPerson).join('') + '</ul>'; }).join('') + '</div>';
    h += '<div class="paper"><div class="band"></div><div class="pagehd">Itinerario</div>' + SCHED.days.map(function (d) {
      return '<div class="dl" style="--rc:#' + d.color + '">' + esc(d.label) + '</div><table style="--rc:#' + d.color + '"><thead><tr><th style="width:21%;padding-left:14px">Horario</th><th style="width:47%">Actividad</th><th>Participantes</th></tr></thead><tbody>' +
        (d.rows.length ? d.rows.map(function (r) { return '<tr class="' + (r.conflict ? 'cf ' : '') + (r.kind === 'traslado' ? 'tr' : '') + '"><td class="h">' + esc(r.timeText) + '</td><td class="a">' + esc(r.text) + '</td><td>' + esc(r.parts.join(', ')) + '</td></tr>'; }).join('') : '<tr><td colspan="3" style="text-align:center;color:#888">Sin actividades</td></tr>') + '</tbody></table>';
    }).join('') + '</div>';
    h += '<div class="paper"><div class="band"></div><div class="pagehd">Mapa de recorridos</div><div class="leg">' + SCHED.days.map(function (d) {
      return '<b style="color:#' + d.color + '">' + esc(d.mapLabel) + '</b>' + (d.legs.map(function (x) { return '<div>T' + x.n + ': ' + esc(x.from ? x.from + ' – ' + x.to : 'Hacia ' + x.to) + '</div>'; }).join('') || '<div>Sin traslados programados.</div>');
    }).join('') + '</div><div class="mp" id="pvMap"></div></div>';
    $('#pvBody').innerHTML = h;
    var host = $('#pvMap'), pmode = mapModeOf();
    if (pmode === 'ninguno') { /* sin mapa */ }
    else if (pmode === 'espacio') { host.innerHTML = '<div class="mapblank"></div>'; }
    else if (UI.mapImg) { var im = document.createElement('img'); im.src = UI.mapImg.url; im.alt = 'Mapa'; host.appendChild(im); }
    else { host.innerHTML = '<div class="mapblank"></div>'; }
    $('#warns').textContent = SCHED.warnings.length ? 'Revisa los horarios: ' + SCHED.warnings.join(' · ') : '';
  }

  /* ---------- ciclo de actualización ---------- */
  function typedUpdate(force) { UI.typing = force ? 'force' : true; try { update({ people: false }); } finally { UI.typing = false; } }
  function update(o) {
    o = o || {};
    if (UI.day >= S.days.length) UI.day = 0;
    SCHED = DG.computeSchedule(S);
    renderDays();
    keepFocus(function () {
      renderSchedule();
      if (o.people !== false) renderPeople();
    });
    renderAddForm();
    renderPreview(); renderMap(); save();
  }

  /* ---------- exportación ---------- */
  function mapForDoc() {
    var mode = mapModeOf();
    if (mode === 'ninguno') return Promise.resolve(null);
    if (mode === 'espacio') return Promise.resolve({ blank: true });
    if (UI.mapImg) return Promise.resolve({ png: UI.mapImg.bytes, w: UI.mapImg.w, h: UI.mapImg.h });
    return Promise.resolve({ blank: true });
  }
  function fileName() {
    var d = DG.parseDate(S.days[0] && S.days[0].date) || { d: 1, m: 1, y: 2026 };
    var mm = DG.MESES[d.m - 1]; mm = mm.charAt(0).toUpperCase() + mm.slice(1, 3);
    var oo = S.ooadName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_');
    return 'Agenda_Giras_' + oo + '_' + String(d.d).padStart(2, '0') + mm + String(d.y).slice(2) + '.docx';
  }
  async function download() {
    if (!S.days.length) { toast('Agrega al menos un día de visita (paso 3).'); return; }
    var btn = $('#btnDl'); btn.disabled = true; btn.textContent = 'Generando…';
    try {
      var missing = S.people.filter(function (p) { return p.on && p.titular && !p.nombre; });
      var map = await mapForDoc();
      var state = JSON.parse(JSON.stringify(S));
      var data = await DG.buildDocx(window.JSZip, TPL, state, SCHED, map);
      var name = fileName(), saved = false;
      var dl = null; try { dl = (window.claude && window.claude.use) ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
      if (dl) {
        try { await dl.save({ filename: name, data: new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }) }); saved = true; }
        catch (e1) { try { await dl.save({ filename: name, data: data }); saved = true; } catch (e2) { if (e2 && /declin|cancel|reject|denied/i.test(String(e2.code || e2.message || e2))) { toast('Descarga cancelada.'); return; } throw e2; } }
      } else {
        var url = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
        var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); saved = true;
      }
      if (saved) toast('Listo: ' + name + (missing.length ? ' (el Titular no aparece: falta su nombre)' : ''));
    } catch (err) {
      toast('No se pudo generar el Word: ' + (err && err.message ? err.message : err));
    } finally { btn.disabled = false; btn.textContent = 'Descargar en Word'; }
  }
  window.__giraTest = { get S() { return S; }, get SCHED() { return SCHED; }, download: download, mapForDoc: mapForDoc };

  /* ---------- arranque ---------- */
  var CLEAR_MSG = { 1: 'Datos generales limpiados.', 2: 'Participantes quitados.', 3: 'Días quitados.', 4: 'Itinerario limpiado.', 5: 'Mapa restablecido al esquema.' };
  function clearSection(n) {
    var snap = JSON.parse(JSON.stringify(S)), prevImg = UI.mapImg, prevDay = UI.day;
    if (n === 1) { S.fecha = todayISO(); S.para = { nombre: '', cargo: '' }; S.de = { nombre: '', cargo: '' }; S.objetivo = ''; S.objetivoEdited = true; S.antecedente = ''; }
    else if (n === 2) { S.people = []; }
    else if (n === 3) { S.days = []; UI.day = 0; $('#dayDate').value = ''; }
    else if (n === 4) { S.days.forEach(function (d) { d.items = []; d.startPlace = { name: '' }; }); S.people = S.people.filter(function (p) { return p.grupo !== 'UNIDAD'; }); UI.day = 0; }
    else if (n === 5) { UI.mapImg = UI.mapGen = null; S.mapMode = 'captura'; $('#mapFile').value = ''; }
    S.example = false; UI.openParts = UI.openPlace = null;
    if (UI.day >= S.days.length) UI.day = 0;
    fillGeneral(); update({ all: true });
    toast(CLEAR_MSG[n], 'Deshacer', function () { S = snap; UI.mapImg = prevImg; UI.day = prevDay; fillGeneral(); update({ all: true }); });
  }
  function bindMisc() {
    $('#editor').addEventListener('click', function (e) { var b = e.target.closest('[data-clear]'); if (b) clearSection(+b.dataset.clear); });
    $('#btnDl').addEventListener('click', download);
    $('#btnNew').addEventListener('click', function () {
      S = blankState(S); UI.day = 0; UI.mapImg = UI.mapGen = null; UI.openParts = UI.openPlace = null; fillGeneral(); update({ all: true });
      toast('Ficha nueva. Se conservaron participantes y datos del oficio.');
    });
    function loadMapFile(f, fromGen) {
      if (!fromGen) UI.mapGen = null;
      if (!f || !/^image\//.test(f.type)) { toast('Usa una imagen (PNG o JPG).'); return; }
      var rd = new FileReader();
      rd.onload = function () {
        var im = new Image();
        im.onload = function () {
          var c = document.createElement('canvas'), sc = Math.min(1, 1600 / im.width); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
          var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(im, 0, 0, c.width, c.height);
          c.toBlob(function (b) { b.arrayBuffer().then(function (ab) { UI.mapImg = { url: c.toDataURL('image/png'), bytes: new Uint8Array(ab), w: c.width, h: c.height }; S.mapMode = 'captura'; renderMap(); renderPreview(); toast('Captura del mapa cargada.'); }); }, 'image/png');
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(f);
    }
    $('#mapFile').addEventListener('change', function (e) { loadMapFile(e.target.files && e.target.files[0]); });
    document.addEventListener('paste', function (e) {
      if (mapModeOf() !== 'captura') return;
      var it = Array.prototype.filter.call((e.clipboardData && e.clipboardData.items) || [], function (x) { return /^image\//.test(x.type); })[0];
      if (it) { e.preventDefault(); loadMapFile(it.getAsFile()); }
    });
    var mb = $('#mapBox');
    mb.addEventListener('dragover', function (e) { e.preventDefault(); });
    mb.addEventListener('drop', function (e) { e.preventDefault(); loadMapFile(e.dataTransfer && e.dataTransfer.files[0]); });

    /* ---- mapa con calles (Mapbox, vía conector) ---- */
    function encPoly(pts) {
      var out = '', pl = 0, pg = 0;
      pts.forEach(function (p) {
        var la = Math.round(p[1] * 1e5), lo = Math.round(p[0] * 1e5), d = [la - pl, lo - pg]; pl = la; pg = lo;
        d.forEach(function (v) { v = v < 0 ? ~(v << 1) : v << 1; while (v >= 0x20) { out += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } out += String.fromCharCode(v + 63); });
      });
      return out;
    }
    function findImage(o, depth) {
      if (!o || depth > 6) return null;
      if (typeof o === 'string') { var m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(o); return m ? { mime: m[1], b64: m[2] } : null; }
      if (typeof o !== 'object') return null;
      if (o.type === 'image' && typeof o.data === 'string') return { mime: o.mimeType || o.mime_type || 'image/png', b64: o.data.replace(/^data:[^,]*,/, '') };
      var ks = Object.keys(o);
      for (var i = 0; i < ks.length; i++) { var r = findImage(o[ks[i]], depth + 1); if (r) return r; }
      return null;
    }
    function b64File(im) {
      var bin = atob(im.b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return new File([u], 'mapa.png', { type: im.mime });
    }
    function fitView(pts, W, H) {
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var my = function (la) { return Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360)); };
      var dx = Math.max((x1 - x0) / 360, 1e-6), dy = Math.max((my(y1) - my(y0)) / (2 * Math.PI), 1e-6);
      var z = Math.min(Math.log2(W * 0.82 / 256 / dx), Math.log2(H * 0.82 / 256 / dy));
      z = Math.max(3, Math.min(15, Math.floor(z * 10) / 10));
      return { center: { longitude: (x0 + x1) / 2, latitude: (y0 + y1) / 2 }, zoom: z };
    }
    async function renderGen(msg) {
      var g = UI.mapGen; if (!g) return;
      var mcp = null; try { mcp = await window.claude.use('mcp'); } catch (e) { mcp = null; }
      if (!mcp) { msg.style.color = '#9B2247'; msg.textContent = 'Esta vista no puede usar el conector de Mapbox.'; return; }
      msg.style.color = ''; msg.textContent = 'Generando imagen…';
      var img = await mcp.callTool('Mapbox', 'static_map_image_tool', { center: g.view.center, zoom: g.view.zoom, size: { width: 1280, height: 800 }, style: 'mapbox/streets-v12', overlays: g.overlays });
      var found = findImage(img && (img.payload || img), 0) || findImage(img, 0);
      if (!found) throw new Error('El conector no devolvió una imagen');
      loadMapFile(b64File(found), true); msg.textContent = '';
    }
    function moveView(act) {
      var g = UI.mapGen; if (!g) return;
      var v = g.view, W = 256 * Math.pow(2, v.zoom), rad = Math.PI / 180;
      var px = (v.center.longitude + 180) / 360 * W, py = (0.5 - Math.log(Math.tan(Math.PI / 4 + v.center.latitude * rad / 2)) / (2 * Math.PI)) * W, st = 320;
      if (act === 'zoomIn') v.zoom = Math.min(16, Math.round((v.zoom + 1) * 10) / 10);
      else if (act === 'zoomOut') v.zoom = Math.max(2, Math.round((v.zoom - 1) * 10) / 10);
      else if (act === 'fit') { v.zoom = g.fit.zoom; v.center = { longitude: g.fit.center.longitude, latitude: g.fit.center.latitude }; }
      else {
        if (act === 'left') px -= st; if (act === 'right') px += st; if (act === 'up') py -= st; if (act === 'down') py += st;
        v.center = { longitude: px / W * 360 - 180, latitude: (2 * Math.atan(Math.exp((0.5 - py / W) * 2 * Math.PI)) - Math.PI / 2) / rad };
      }
    }
    var mvT = null;
    function toPx(c, z) { var W = 256 * Math.pow(2, z), r = Math.PI / 180; return { x: (c.longitude + 180) / 360 * W, y: (0.5 - Math.log(Math.tan(Math.PI / 4 + c.latitude * r / 2)) / (2 * Math.PI)) * W, W: W }; }
    function fromPx(x, y, z) { var W = 256 * Math.pow(2, z), r = Math.PI / 180; return { longitude: Math.max(-180, Math.min(180, x / W * 360 - 180)), latitude: Math.max(-85, Math.min(85, (2 * Math.atan(Math.exp((0.5 - y / W) * 2 * Math.PI)) - Math.PI / 2) / r)) }; }
    function scheduleGen(delay) {
      var msg = $('#mapGenMsg'); $('#mapZoomLbl').textContent = 'Zoom ' + UI.mapGen.view.zoom;
      clearTimeout(mvT);
      mvT = setTimeout(function () { renderGen(msg).catch(function (err) { msg.style.color = '#9B2247'; msg.textContent = 'No se pudo actualizar el mapa [' + ((err && err.code) || 'error') + ']: ' + String((err && err.message) || err).slice(0, 120); }); }, delay);
    }
    $('#mapZoom').addEventListener('click', function (e) {
      var b = e.target.closest('[data-mv]'); if (!b || !UI.mapGen) return;
      moveView(b.getAttribute('data-mv')); scheduleGen(450);
    });
    // arrastrar con el puntero y zoom con la rueda sobre la imagen generada
    (function () {
      var box = $('#mapBox'), drag = null, wheelDz = 0, wheelAt = null;
      function scaleOf(img) { return 1280 / Math.max(1, img.getBoundingClientRect().width / (img._k || 1)); }
      box.addEventListener('pointerdown', function (e) {
        var img = e.target.closest && e.target.closest('img'); if (!img || !UI.mapGen || e.button) return;
        drag = { x: e.clientX, y: e.clientY, img: img, tx: img._tx || 0, ty: img._ty || 0 }; box.classList.add('grabbing'); box.setPointerCapture(e.pointerId); e.preventDefault();
      });
      box.addEventListener('pointermove', function (e) {
        if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.img._tx = drag.tx + dx; drag.img._ty = drag.ty + dy; drag.img.style.transform = 'translate(' + drag.img._tx + 'px,' + drag.img._ty + 'px) scale(' + (drag.img._k || 1) + ')';
      });
      function end(e) {
        if (!drag) return; var img = drag.img, dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = null; box.classList.remove('grabbing');
        if (Math.abs(dx) + Math.abs(dy) < 3 || !UI.mapGen) return;
        var k = 1280 / img.getBoundingClientRect().width * (img._k || 1), v = UI.mapGen.view, p = toPx(v.center, v.zoom);
        v.center = fromPx(p.x - dx * k, p.y - dy * k, v.zoom); scheduleGen(250);
      }
      box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
      box.addEventListener('wheel', function (e) {
        var img = e.target.closest && e.target.closest('img'); if (!img || !UI.mapGen) return;
        e.preventDefault();
        var r = img.getBoundingClientRect(), v = UI.mapGen.view, step = e.deltaY < 0 ? 0.25 : -0.25;
        var nz = Math.max(2, Math.min(16, Math.round((v.zoom + wheelDz + step) * 100) / 100)); wheelDz = nz - v.zoom;
        wheelAt = { fx: (e.clientX - r.left) / r.width - 0.5, fy: (e.clientY - r.top) / r.height - 0.5 };
        var kk = Math.pow(2, wheelDz); img._k = kk; img.style.transform = 'translate(' + (img._tx || 0) + 'px,' + (img._ty || 0) + 'px) scale(' + kk + ')';
        clearTimeout(mvT);
        mvT = setTimeout(function () {
          var z0 = v.zoom, z1 = Math.round((z0 + wheelDz) * 10) / 10, p = toPx(v.center, z0), ox = wheelAt.fx * 1280, oy = wheelAt.fy * 800;
          var wx = p.x + ox, wy = p.y + oy, f = Math.pow(2, z1 - z0);
          v.zoom = z1; v.center = fromPx(wx * f - ox, wy * f - oy, z1); wheelDz = 0; scheduleGen(0);
        }, 400);
      }, { passive: false });
    })();
    $('#mapGen').addEventListener('click', async function () {
      var msg = $('#mapGenMsg'), btn = this, days = SCHED.days.filter(function (d) { return d.points.filter(DG.hasCoords).length > 1; });
      if (!days.length) { msg.textContent = 'Agrega al menos dos lugares con coordenadas.'; return; }
      var mcp = null; try { mcp = (window.claude && window.claude.use) ? await window.claude.use('mcp') : null; } catch (e) { mcp = null; }
      if (!mcp) { msg.style.color = '#9B2247'; msg.textContent = 'Esta vista no puede usar el conector de Mapbox. Pega una captura de Google Maps.'; return; }
      btn.disabled = true; msg.style.color = ''; msg.textContent = 'Calculando rutas…';
      try {
        var srv = { call: function (t, a) { return mcp.callTool('Mapbox', t, a); } }, overlays = [], all = [], n = 0, seen = {};
        for (var di = 0; di < days.length; di++) {
          var d = days[di], pts = d.points.filter(DG.hasCoords), col = d.color.toLowerCase();
          var r = await srv.call('directions_tool', { coordinates: pts.map(function (p) { return { longitude: p.lng, latitude: p.lat }; }), routing_profile: 'mapbox/driving', geometries: 'geojson', overview: 'simplified' });
          msg.textContent = 'Ruta del ' + d.label.replace(/,.*$/, '') + ' calculada…';
          var pl = r && r.payload, geo = pl && pl.routes && pl.routes[0] && pl.routes[0].geometry && pl.routes[0].geometry.coordinates;
          if (!geo) { var sc = pl && pl.structuredContent; geo = sc && sc.routes && sc.routes[0].geometry.coordinates; }
          if (!geo) { var txt = JSON.stringify(pl || r); var mm = /"coordinates":(\[\[[\s\S]*?\]\])\}/.exec(txt); if (mm) geo = JSON.parse(mm[1]); }
          if (!geo) throw new Error('No se obtuvo la ruta del ' + d.label);
          var step = Math.max(1, Math.ceil(geo.length / 250)); var g2 = geo.filter(function (_, i) { return i % step === 0 || i === geo.length - 1; });
          overlays.push({ type: 'path', encodedPolyline: encPoly(g2), strokeColor: col, strokeWidth: 5, strokeOpacity: 0.9 });
          g2.forEach(function (p) { all.push(p); });
          d._pts = pts;
        }
        days.forEach(function (d) { d._pts.forEach(function (p) {
          if (seen[p.name]) return; seen[p.name] = 1; n++; all.push([p.lng, p.lat]);
          overlays.push({ type: 'marker', longitude: p.lng, latitude: p.lat, color: d.color.toLowerCase(), label: String(n), size: 'large' });
        }); });
        msg.textContent = 'Generando imagen…';
        var v = fitView(all, 1280, 800);
        UI.mapGen = { overlays: overlays, fit: v, view: { center: { longitude: v.center.longitude, latitude: v.center.latitude }, zoom: v.zoom } };
        await renderGen(msg);
      } catch (err) {
        msg.style.color = '#9B2247'; msg.textContent = 'No se pudo generar con Mapbox [' + ((err && err.code) || 'error') + ']: ' + String((err && err.message) || err).slice(0, 160) + '. Usa una captura de Google Maps.';
      }
      btn.disabled = false;
    });
    $('#mapMode').addEventListener('change', function (e) { S.mapMode = e.target.value; update({ people: false }); });
    $('#mapClear').addEventListener('click', function () { UI.mapImg = null; UI.mapGen = null; $('#mapFile').value = ''; renderMap(); renderPreview(); });
  }

  function init() {
    fetch('data/mexico.json').then(function (r) { return r.json(); }).then(function (m) { MEX = m; if (typeof SCHED !== 'undefined' && SCHED) { renderMap(); renderPreview(); } }).catch(function () {});
    Promise.all([fetch('data/catalogo.json').then(function (r) { return r.json(); }), fetch('data/plantilla.json').then(function (r) { return r.json(); })]).then(function (r) {
      CAT = r[0]; TPL = r[1].b64;
      S = load() || exampleState();
      if (S.dpesV !== 3) { S.people = []; S.dpesV = 3; }
      if (!ooadById(S.ooadId)) S = exampleState();
      S.opts = S.opts || { kmh: 55, circuity: 1.3, buffer: 0, gap: 1 };
      bindGeneral(); fillGeneral(); bindPeople(); bindSchedule(); bindAddForm(); bindDays(); bindMisc();
      update({ all: true });
      if (S.example) toast('Ejemplo precargado con Colima. Edítalo o pulsa Nueva ficha.');
    }).catch(function (e) { document.body.insertAdjacentHTML('afterbegin', '<p class="err" style="padding:20px">No se pudieron cargar los datos del catálogo: ' + esc(e.message) + '</p>'); });
  }
  init();
})();
