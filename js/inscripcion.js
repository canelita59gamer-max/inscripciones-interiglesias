/* =========================================================
   FAITH CUP NAVIDEÑA 2026 · Inscripción en la página
   Paso a paso: categoría → iglesia → jugadores → compromiso
   Guarda en Firebase (torneo-interiglesias):
     fc26_equipos  → datos completos (nadie los puede leer desde la web)
     fc26_publico  → solo iglesia + categoría (para contar cupos)
   ========================================================= */
(function () {
  'use strict';
  const C = window.FAITHCUP, R = C.inscripcion;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const money = n => '$' + Number(n).toLocaleString('es-CO');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const hasGsap = typeof window.gsap !== 'undefined';
  const DRAFT = 'fc26-borrador';

  /* ---------------- Firebase ---------------- */
  let db = null;
  try {
    if (window.firebase) { firebase.initializeApp(R.firebase); db = firebase.firestore(); }
  } catch (e) { console.warn('Firebase no disponible', e); }

  // Cupos en vivo: cuenta los equipos de cada categoría
  function listenCupos() {
    if (!db) return;
    db.collection(R.coleccionPublica).onSnapshot(snap => {
      const count = {}, names = {};
      const docs = snap.docs.map(d => d.data()).sort((a, b) => (a.creado?.seconds || 0) - (b.creado?.seconds || 0));
      docs.forEach(d => { count[d.categoria] = (count[d.categoria] || 0) + 1; (names[d.categoria] = names[d.categoria] || []).push(d.iglesia); });
      C.categorias.forEach(c => { c.inscritos = count[c.id] || 0; c.iglesias = names[c.id] || []; });
      window.FCApp && window.FCApp.refreshCupos();
      if (isOpen() && state.step === 0) render();
    }, err => console.warn('No se pudieron leer los cupos', err));
    // Regalos y ranking en vivo (los actualiza el organizador desde el panel)
    db.collection('fc26_config').doc('estado').onSnapshot(s => {
      const d = s.data(); if (!d) return;
      C.donaciones.regalos = d.regalos || 0;
      C.donaciones.ranking = Array.isArray(d.ranking) ? d.ranking : [];
      window.FCApp && window.FCApp.refreshDonaciones && window.FCApp.refreshDonaciones();
    }, err => console.warn('No se pudieron leer los regalos', err));
  }

  /* ---------------- Estado ---------------- */
  const docsOf = c => (c && c.docs && c.docs.length ? c.docs : R.tiposDoc);
  const blankPlayer = () => ({ nombre: '', tipoDoc: docsOf(cat())[0], numDoc: '', nacimiento: '', dia: '', mes: '', anio: '', genero: '' });
  // al cambiar de categoría, los documentos que no aplican pasan al permitido
  function fixDocs() { const d = docsOf(cat()); state.jugadores.forEach(p => { if (!d.includes(p.tipoDoc)) p.tipoDoc = d[0]; }); }
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  function partsFrom(p) {
    if (!p.anio && p.nacimiento) { const [y, m, d] = p.nacimiento.split('-'); p.anio = y; p.mes = String(Number(m)); p.dia = String(Number(d)); }
  }
  function joinDate(p) {
    const y = Number(p.anio), m = Number(p.mes), d = Number(p.dia);
    if (!y || !m || !d) { p.nacimiento = ''; return; }
    const dt = new Date(y, m - 1, d);
    p.nacimiento = dt.getMonth() === m - 1 ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : 'invalida';
  }
  function yearsFor(c) {
    const hi = c.anioHasta || 2020, lo = c.anioDesde || 1950, out = [];
    for (let y = hi; y >= lo; y--) out.push(y);
    return out;
  }
  let state = fresh();
  function fresh() {
    return { step: 0, categoria: null, iglesia: '', equipo: '', responsable: '', telefono: '', jugadores: [], regalos: false, datos: false, exoneracion: false, sending: false, done: null };
  }
  function save() {
    try { const { sending, done, ...rest } = state; localStorage.setItem(DRAFT, JSON.stringify(rest)); } catch (e) {}
  }
  function load() {
    try { const d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); if (d && d.categoria) return Object.assign(fresh(), d); } catch (e) {}
    return null;
  }
  const cat = () => C.categorias.find(c => c.id === state.categoria);

  /* ---------------- Fases ---------------- */
  function abierta() {
    const now = new Date(), abre = new Date(C.fechas.abreInscripcion), cierra = new Date(C.fechas.cierraInscripcion);
    if (now > cierra) return { ok: false, txt: 'Las inscripciones cerraron el 6 de diciembre.' };
    if (now < abre && !R.preinscripcion) return { ok: false, txt: 'Las inscripciones abren el lunes 23 de noviembre.' };
    return { ok: true, pre: now < abre };
  }

  /* ---------------- Validación ---------------- */
  function edadInfo(p, c) {
    if (!p.nacimiento) return null;
    if (p.nacimiento === 'invalida') return { ok: false, txt: 'Ese día no existe en ese mes' };
    const y = Number(p.nacimiento.slice(0, 4));
    if (!y || y < 1940 || y > new Date().getFullYear()) return { ok: false, txt: 'Fecha no válida' };
    const okDesde = c.anioDesde == null || y >= c.anioDesde, okHasta = c.anioHasta == null || y <= c.anioHasta;
    const edad = 2026 - y;
    if (okDesde && okHasta) return { ok: true, txt: `${edad} años · entra en ${c.nombre}` };
    return { ok: false, txt: `Nacido en ${y}: ${c.nombre} es para ${c.nacimiento}` };
  }
  function playerOk(p, c) {
    const e = edadInfo(p, c);
    return p.nombre.trim().length > 2 && p.numDoc.trim().length > 3 && e && e.ok && (!c.mujeresMin || p.genero);
  }
  function stepErrors(step) {
    const c = cat(), err = [];
    if (step === 0 && !c) err.push('Elige una categoría.');
    if (step === 1) {
      if (state.iglesia.trim().length < 3) err.push('Escribe el nombre de la iglesia.');
      if (state.responsable.trim().length < 3) err.push('Escribe el nombre del responsable.');
      if (state.telefono.replace(/\D/g, '').length < 10) err.push('El WhatsApp debe tener 10 números.');
    }
    if (step === 2 && c) {
      const n = state.jugadores.length;
      if (n < c.minJugadores) err.push(`Agrega mínimo ${c.minJugadores} jugadores.`);
      const malos = state.jugadores.filter(p => !playerOk(p, c)).length;
      if (malos) err.push(malos === 1 ? 'Hay 1 jugador con datos incompletos o fuera de edad.' : `Hay ${malos} jugadores con datos incompletos o fuera de edad.`);
      const docs = state.jugadores.map(p => p.numDoc.trim()).filter(Boolean);
      if (new Set(docs).size !== docs.length) err.push('Hay números de documento repetidos.');
      if (c.mujeresMin) {
        const m = state.jugadores.filter(p => p.genero === 'F').length;
        if (m < c.mujeresMin) err.push(`El vóley mixto necesita mínimo ${c.mujeresMin} mujeres (van ${m}).`);
      }
    }
    if (step === 3) {
      if (!state.regalos) err.push('Confirma el compromiso de los 5 regalos.');
      if (!state.datos) err.push('Autoriza el tratamiento de datos e imagen.');
      if (!state.exoneracion) err.push('Acepta la exoneración de responsabilidad.');
    }
    return err;
  }

  /* ---------------- Íconos ---------------- */
  const IC = {
    church: '<svg viewBox="0 0 24 24"><path d="M12 2v4M10 4h4M6 21V11l6-5 6 5v10M3 21h18M10 21v-4a2 2 0 0 1 4 0v4"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
    gift: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    wa: '<svg viewBox="0 0 32 32" class="fill"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm5.8 15.7c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 2.1.9 3 1 4 .8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5l-.6-.4z"/></svg>'
  };
  const STEPS = ['Categoría', 'Iglesia', 'Jugadores', 'Compromiso'];
  const THEME = { mini: 'c-mini', pre: 'c-pre', juvenil: 'c-juvenil', libre: 'c-libre', voley: 'c-voley' };
  const wa = msg => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(msg)}`;

  /* ---------------- Pantallas ---------------- */
  function vCategoria() {
    const f = abierta();
    return `<p class="rg-lead">${f.pre ? '<span class="rg-pill">Pre-inscripción</span> ' : ''}Elige dónde va a jugar tu equipo. Los cupos se actualizan en vivo.</p>
      <div class="rg-cats">${C.categorias.map(c => {
        const libres = c.maxEquipos - c.inscritos, llena = libres <= 0;
        return `<button type="button" class="rg-cat ${THEME[c.id]} ${state.categoria === c.id ? 'is-on' : ''}" data-cat="${c.id}" ${llena ? 'disabled' : ''}>
          <span class="rg-cat__name">${esc(c.nombre)}</span>
          <span class="rg-cat__age">${esc(c.edad)} · ${esc(c.nacimiento)}</span>
          <span class="rg-cat__row"><b>${money(c.inscripcion)}</b><i>${llena ? 'Llena' : libres === 1 ? '¡Último cupo!' : `${libres} cupos libres`}</i></span>
          <span class="rg-cat__check">${IC.check}</span>
        </button>`;
      }).join('')}</div>`;
  }
  function field(id, label, icon, val, ph, type = 'text', extra = '') {
    return `<label class="rg-field"><span class="rg-field__lbl">${label}</span>
      <span class="rg-field__box">${icon}<input id="${id}" type="${type}" value="${esc(val)}" placeholder="${ph}" ${extra}></span></label>`;
  }
  function vIglesia() {
    return `<p class="rg-lead">¿Quién representa al equipo? Te escribimos a este WhatsApp para confirmar el pago.</p>
      ${field('rg-iglesia', 'Nombre de la iglesia', IC.church, state.iglesia, 'Ej. Iglesia Central', 'text', 'maxlength="80" autocomplete="organization"')}
      ${field('rg-equipo', 'Nombre del equipo <small>(opcional)</small>', IC.shield, state.equipo, 'Ej. Los Leones de Judá', 'text', 'maxlength="60"')}
      ${field('rg-resp', 'Responsable del equipo', IC.user, state.responsable, 'Nombre y apellido', 'text', 'maxlength="80" autocomplete="name"')}
      ${field('rg-tel', 'WhatsApp del responsable', IC.phone, state.telefono, '300 000 0000', 'tel', 'maxlength="20" inputmode="tel" autocomplete="tel"')}`;
  }
  function vJugadores() {
    const c = cat(), n = state.jugadores.length;
    const mujeres = state.jugadores.filter(p => p.genero === 'F').length;
    return `<div class="rg-roster-head">
        <p class="rg-lead">Edad por año de nacimiento: <b>${esc(c.nombre)}</b> es para nacidos <b>${esc(c.nacimiento)}</b>.</p>
        <div class="rg-meters">
          <span class="rg-meter ${n >= c.minJugadores ? 'ok' : ''}"><b>${n}</b>/${c.maxJugadores} jugadores · mín. ${c.minJugadores}</span>
          ${c.mujeresMin ? `<span class="rg-meter ${mujeres >= c.mujeresMin ? 'ok' : ''}"><b>${mujeres}</b>/${c.mujeresMin} mujeres</span>` : ''}
        </div>
      </div>
      <div class="rg-players">${state.jugadores.map((p, i) => {
        partsFrom(p);
        const e = edadInfo(p, c), ok = playerOk(p, c), docs = docsOf(c);
        const opt = (v, t, sel) => `<option value="${v}" ${String(sel) === String(v) ? 'selected' : ''}>${t}</option>`;
        return `<div class="rg-player ${ok ? 'ok' : ''}" data-i="${i}">
          <div class="rg-player__top"><span class="rg-player__n">${ok ? IC.check : i + 1}</span><b>Jugador ${i + 1}</b>
            <button type="button" class="rg-x" data-del="${i}" aria-label="Quitar jugador ${i + 1}">${IC.x}</button></div>
          <input class="rg-in" data-k="nombre" value="${esc(p.nombre)}" placeholder="Nombre completo" maxlength="80" autocomplete="off">
          <div class="rg-row">
            ${docs.length > 1
              ? `<select class="rg-in rg-doc" data-k="tipoDoc" aria-label="Tipo de documento">${docs.map(t => opt(t, t, p.tipoDoc)).join('')}</select>`
              : `<span class="rg-docfix" title="Tipo de documento">${docs[0]}</span>`}
            <input class="rg-in" data-k="numDoc" value="${esc(p.numDoc)}" placeholder="Número de documento" inputmode="numeric" maxlength="20">
          </div>
          <div class="rg-birth" role="group" aria-label="Fecha de nacimiento">
            <span class="rg-birth__lbl">Nacimiento</span>
            <div class="rg-birth__row">
              <select class="rg-in" data-k="dia" aria-label="Día">${opt('', 'Día', p.dia)}${Array.from({ length: 31 }, (_, k) => opt(k + 1, k + 1, p.dia)).join('')}</select>
              <select class="rg-in" data-k="mes" aria-label="Mes">${opt('', 'Mes', p.mes)}${MESES.map((m, k) => opt(k + 1, m, p.mes)).join('')}</select>
              <select class="rg-in" data-k="anio" aria-label="Año">${opt('', 'Año', p.anio)}${yearsFor(c).map(y => opt(y, y, p.anio)).join('')}</select>
            </div>
          </div>
          ${c.mujeresMin ? `<div class="rg-gender" role="radiogroup" aria-label="Género">
            <button type="button" data-g="F" aria-checked="${p.genero === 'F'}">Mujer</button><button type="button" data-g="M" aria-checked="${p.genero === 'M'}">Hombre</button></div>` : ''}
          ${e ? `<p class="rg-age ${e.ok ? 'ok' : 'bad'}">${e.ok ? IC.check : IC.x}${esc(e.txt)}</p>` : ''}
        </div>`;
      }).join('')}</div>
      ${n < c.maxJugadores ? `<button type="button" class="rg-add" id="rg-add">${IC.plus} Agregar jugador</button>` : `<p class="rg-note">Llegaste al máximo de ${c.maxJugadores} jugadores.</p>`}`;
  }
  function check(id, on, title, body, icon) {
    return `<div class="rg-check ${on ? 'is-on' : ''}" data-check="${id}">
      <button type="button" class="rg-check__btn" role="checkbox" aria-checked="${on}">
        <span class="rg-check__box">${IC.check}</span><span class="rg-check__ico">${icon}</span><span class="rg-check__t">${title}</span>
      </button>
      ${body ? `<details class="rg-legal"><summary>Leer el texto completo</summary><p>${body}</p></details>` : ''}
    </div>`;
  }
  function vCompromiso() {
    const c = cat();
    return `<div class="rg-mission">
        <div class="rg-mission__gifts" aria-hidden="true">${'<span></span>'.repeat(5)}</div>
        <p class="rg-mission__eyebrow">Misión Navidad</p>
        <p class="rg-mission__t">Tu equipo trae <b>5 regalos</b> para niños</p>
        <p class="rg-mission__d">Juguetes nuevos o ropa en buen estado, al inscribirse o antes del primer partido. Todo va a niños de una fundación aliada.</p>
      </div>
      ${check('regalos', state.regalos, 'Nos comprometemos a traer mínimo 5 regalos', '', IC.gift)}
      ${check('datos', state.datos, 'Autorizo el tratamiento de datos e imagen de los jugadores',
        'Al registrar este equipo, quien inscribe declara contar con la autorización de cada jugador (o de su acudiente, si es menor de edad) para el tratamiento de sus datos personales conforme a la Ley 1581 de 2012 y al artículo 15 de la Constitución Política de Colombia, así como para el uso de su imagen en fotografías y videos del torneo, de acuerdo con la Ley 23 de 1982 sobre derechos de autor. Ninguna imagen de los participantes será usada, publicada o explotada por terceros sin autorización previa.', IC.shield)}
      ${check('exoneracion', state.exoneracion, 'Acepto la exoneración de responsabilidad por lesiones',
        'Quien inscribe declara que cada jugador participa en el torneo de forma voluntaria y bajo su propia responsabilidad, conociendo los riesgos físicos propios de la actividad deportiva. En consecuencia, exonera a la organización del torneo, sus directivos, colaboradores e iglesias participantes de cualquier responsabilidad por lesiones, daños físicos, accidentes o afectaciones a la salud que puedan presentarse antes, durante o después de los partidos.', IC.user)}
      <div class="rg-summary">
        <div><small>Iglesia</small><b>${esc(state.iglesia)}</b></div>
        <div><small>Categoría</small><b>${esc(c.nombre)}</b></div>
        <div><small>Jugadores</small><b>${state.jugadores.length}</b></div>
        <div><small>Inscripción</small><b>${money(c.inscripcion)}</b></div>
      </div>`;
  }
  function vExito() {
    const d = state.done, c = C.categorias.find(x => x.id === d.categoria);
    return `<div class="rg-done">
      <div class="ticket ${THEME[c.id]}">
        <div class="ticket__top">
          <span class="ticket__brand">Faith Cup Navideña 2026</span>
          <span class="ticket__code">#${esc(d.codigo)}</span>
        </div>
        <p class="ticket__iglesia">${esc(d.iglesia)}</p>
        ${d.equipo ? `<p class="ticket__equipo">${esc(d.equipo)}</p>` : ''}
        <div class="ticket__grid">
          <div><small>Categoría</small><b>${esc(c.nombre)}</b></div>
          <div><small>Jugadores</small><b>${d.jugadores}</b></div>
          <div><small>Fechas</small><b>9 – 13 dic</b></div>
          <div><small>Estado</small><b class="pend">Pendiente de pago</b></div>
        </div>
        <div class="ticket__cut" aria-hidden="true"></div>
        <p class="ticket__foot">🎁 ${d.pre ? 'Pre-inscripción' : 'Inscripción'} recibida · trae tus 5 regalos</p>
      </div>
      <ol class="rg-next">
        <li><b>Te escribimos al WhatsApp</b> ${esc(d.telefono)} para confirmar el pago de ${money(c.inscripcion)}.</li>
        <li><b>Con el pago</b>, tu cupo queda asegurado.</li>
        <li><b>Prepara los 5 regalos</b> para la Misión Navidad.</li>
      </ol>
      <p class="rg-tip">Toma captura de este boleto.</p>
    </div>`;
  }

  /* ---------------- Render ---------------- */
  const panel = () => $('#rg');
  function isOpen() { return panel().classList.contains('is-open'); }
  function render(dir = 0) {
    const body = $('#rg-body'), s = state.step;
    const f = abierta();
    $('#rg-steps').innerHTML = state.done ? '' : STEPS.map((t, i) => `<span class="${i < s ? 'done' : i === s ? 'on' : ''}"><i>${i < s ? IC.check : i + 1}</i>${t}</span>`).join('');
    $('#rg-title').innerHTML = state.done ? '¡Equipo <em>inscrito</em>!' : ['Elige la <em>categoría</em>', 'Tu <em>iglesia</em>', 'Arma tu <em>plantilla</em>', 'El <em>compromiso</em>'][s];
    if (!f.ok && !state.done) {
      body.innerHTML = `<p class="rg-lead">${f.txt}</p>`;
      $('#rg-foot').innerHTML = '';
      return;
    }
    body.innerHTML = state.done ? vExito() : [vCategoria, vIglesia, vJugadores, vCompromiso][s]();
    $('#rg-foot').innerHTML = state.done
      ? `<button type="button" class="btn btn--lime btn--block" data-rg="close">Listo</button>`
      : `${s > 0 ? `<button type="button" class="rg-back" data-rg="back" aria-label="Atrás">${IC.back}</button>` : ''}
         <button type="button" class="btn btn--lime rg-go" data-rg="next" ${state.sending ? 'disabled' : ''}>${s === 3 ? (state.sending ? 'Enviando…' : 'Inscribir equipo') : 'Continuar'}</button>`;
    $('#rg-err').textContent = '';
    if (hasGsap && dir) {
      gsap.fromTo('#rg-body > *', { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: .45, stagger: .04, ease: 'power3.out' });
    }
    if (state.done && hasGsap) {
      gsap.fromTo('.ticket', { y: 60, rotationX: 50, opacity: 0, scale: .9 }, { y: 0, rotationX: 0, opacity: 1, scale: 1, duration: 1, ease: 'expo.out' });
      gsap.fromTo('.rg-next li', { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: .1, delay: .5, duration: .5 });
      burst();
    }
    bind();
  }
  function bind() {
    const body = $('#rg-body');
    const clearErr = () => { $('#rg-err').textContent = ''; };
    body.addEventListener('input', clearErr); body.addEventListener('click', clearErr);
    $$('.rg-cat', body).forEach(b => b.addEventListener('click', () => {
      const prev = state.categoria; state.categoria = b.dataset.cat;
      const c = cat();
      if (prev !== state.categoria) {
        // ajusta la plantilla a la nueva categoría
        if (state.jugadores.length > c.maxJugadores) state.jugadores.length = c.maxJugadores;
        while (state.jugadores.length < c.minJugadores) state.jugadores.push(blankPlayer());
        fixDocs();
      }
      save(); render(); setTimeout(() => go(1), 260);
    }));
    [['rg-iglesia', 'iglesia'], ['rg-equipo', 'equipo'], ['rg-resp', 'responsable'], ['rg-tel', 'telefono']].forEach(([id, k]) => {
      const el = $('#' + id); el && el.addEventListener('input', () => { state[k] = el.value; save(); });
    });
    $$('.rg-player', body).forEach(card => {
      const i = Number(card.dataset.i);
      $$('.rg-in', card).forEach(inp => {
        const ev = inp.tagName === 'SELECT' || inp.type === 'date' ? 'change' : 'input';
        inp.addEventListener(ev, () => {
          const p = state.jugadores[i], k = inp.dataset.k;
          p[k] = inp.value;
          if (k === 'dia' || k === 'mes' || k === 'anio') joinDate(p);
          save();
          if (k !== 'tipoDoc') refreshPlayer(card, i);
        });
      });
      $$('[data-g]', card).forEach(g => g.addEventListener('click', () => { state.jugadores[i].genero = g.dataset.g; save(); keepScroll(render); }));
    });
    $$('[data-del]', body).forEach(b => b.addEventListener('click', () => {
      state.jugadores.splice(Number(b.dataset.del), 1); save(); keepScroll(render);
    }));
    const add = $('#rg-add');
    add && add.addEventListener('click', () => {
      state.jugadores.push(blankPlayer()); save(); keepScroll(render);
      const last = $$('.rg-player').pop(); last && last.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => last && last.querySelector('input').focus(), 300);
    });
    $$('.rg-check__btn', body).forEach(b => b.addEventListener('click', () => {
      const k = b.closest('[data-check]').dataset.check; state[k] = !state[k]; save();
      b.setAttribute('aria-checked', state[k]); b.closest('.rg-check').classList.toggle('is-on', state[k]);
      if (state[k] && hasGsap) gsap.fromTo(b.querySelector('.rg-check__box'), { scale: .5 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
    }));
  }
  // actualiza el aviso de edad de un jugador sin redibujar todo (no pierde el foco)
  function refreshPlayer(card, i) {
    const c = cat(), p = state.jugadores[i], e = edadInfo(p, c), ok = playerOk(p, c);
    card.classList.toggle('ok', !!ok);
    card.querySelector('.rg-player__n').innerHTML = ok ? IC.check : i + 1;
    let age = card.querySelector('.rg-age');
    if (!e) { age && age.remove(); return; }
    if (!age) { age = document.createElement('p'); card.appendChild(age); }
    age.className = 'rg-age ' + (e.ok ? 'ok' : 'bad'); age.innerHTML = (e.ok ? IC.check : IC.x) + esc(e.txt);
    const n = state.jugadores.length;
    const m = $('.rg-meter'); if (m) m.classList.toggle('ok', n >= c.minJugadores);
  }
  function keepScroll(fn) { const b = $('#rg-scroll'), y = b.scrollTop; fn(); b.scrollTop = y; }

  function go(step) {
    const dir = step > state.step ? 1 : -1;
    state.step = step; save(); render(dir);
    $('#rg-scroll').scrollTop = 0;
  }
  async function next() {
    const err = stepErrors(state.step);
    if (err.length) {
      $('#rg-err').textContent = err[0];
      if (hasGsap) gsap.fromTo('#rg-err', { x: -8 }, { x: 0, duration: .5, ease: 'elastic.out(1,.3)' });
      highlightBad();
      return;
    }
    if (state.step < 3) return go(state.step + 1);
    submit();
  }
  function highlightBad() {
    if (state.step === 2) { const bad = $('.rg-player:not(.ok)'); bad && bad.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    if (state.step === 1) { [['rg-iglesia', 3], ['rg-resp', 3]].forEach(([id, n]) => { const el = $('#' + id); el && el.closest('.rg-field').classList.toggle('bad', el.value.trim().length < n); });
      const t = $('#rg-tel'); t && t.closest('.rg-field').classList.toggle('bad', t.value.replace(/\D/g, '').length < 10); }
  }

  async function submit() {
    if (!db) { $('#rg-err').textContent = 'No hay conexión con la base de datos. Intenta de nuevo o escríbenos por WhatsApp.'; return; }
    const c = cat();
    if (c.inscritos >= c.maxEquipos) { $('#rg-err').textContent = `${c.nombre} ya está llena. Elige otra categoría.`; return; }
    state.sending = true; render();
    const ref = db.collection(R.coleccionPrivada).doc();
    const pub = db.collection(R.coleccionPublica).doc(ref.id);
    const ts = firebase.firestore.FieldValue.serverTimestamp();
    const iglesia = state.iglesia.trim();
    const batch = db.batch();
    batch.set(ref, {
      categoria: c.id, iglesia, equipo: state.equipo.trim(), responsable: state.responsable.trim(),
      telefono: state.telefono.replace(/[^\d+]/g, ''),
      jugadores: state.jugadores.map(p => ({ nombre: p.nombre.trim(), tipoDoc: p.tipoDoc, numDoc: p.numDoc.trim(), nacimiento: p.nacimiento, genero: p.genero || '' })),
      regalos: true, datos: true, exoneracion: true, estado: 'pendiente', pagado: false, creado: ts
    });
    batch.set(pub, { iglesia, categoria: c.id, creado: ts });
    try {
      await batch.commit();
      state.done = { codigo: ref.id.slice(0, 6).toUpperCase(), iglesia, equipo: state.equipo.trim(), categoria: c.id, jugadores: state.jugadores.length, telefono: state.telefono, pre: abierta().pre };
      state.sending = false;
      try { localStorage.removeItem(DRAFT); } catch (e) {}
      render();
    } catch (e) {
      console.warn(e);
      state.sending = false; render();
      $('#rg-err').textContent = 'No se pudo enviar. Revisa tu conexión e intenta de nuevo.';
    }
  }

  /* ---------------- Celebración ---------------- */
  function burst() {
    const box = $('#rg'), colors = ['#c8f000', '#e3262f', '#f2c14e', '#ffffff'];
    for (let i = 0; i < 46; i++) {
      const s = document.createElement('i'); s.className = 'rg-confetti';
      s.style.background = colors[i % 4]; s.style.left = 50 + (Math.random() - .5) * 20 + '%';
      box.appendChild(s);
      if (!hasGsap) { s.remove(); continue; }
      gsap.fromTo(s, { y: 0, x: 0, rotation: 0, opacity: 1 }, {
        y: () => -200 - Math.random() * 300, x: () => (Math.random() - .5) * 420, rotation: () => Math.random() * 720,
        duration: 1.2 + Math.random(), ease: 'power2.out', onComplete: () => gsap.to(s, { y: '+=500', opacity: 0, duration: 1.4, ease: 'power1.in', onComplete: () => s.remove() })
      });
    }
  }

  /* ---------------- Abrir / cerrar ---------------- */
  function open(catId) {
    if (state.done) state = fresh();
    const d = !state.categoria && load(); if (d) state = d;
    if (catId && C.categorias.some(c => c.id === catId)) {
      if (state.categoria !== catId) { state.categoria = catId; const c = cat(); state.jugadores = state.jugadores.slice(0, c.maxJugadores); while (state.jugadores.length < c.minJugadores) state.jugadores.push(blankPlayer()); fixDocs(); }
      state.step = Math.max(state.step, 1);
    }
    const p = panel(); p.classList.add('is-open'); p.setAttribute('aria-hidden', 'false');
    render(1);
    if (hasGsap) gsap.fromTo('.rg__panel', { y: '100%' }, { y: '0%', duration: .6, ease: 'expo.out' });
    setTimeout(() => $('#rg-close').focus(), 100);
  }
  function close() {
    const p = panel();
    const done = () => { p.classList.remove('is-open'); p.setAttribute('aria-hidden', 'true'); if (state.done) state = fresh(); };
    if (hasGsap) gsap.to('.rg__panel', { y: '100%', duration: .4, ease: 'power3.in', onComplete: done }); else done();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#rg-close').addEventListener('click', close);
    $('#rg-foot').addEventListener('click', e => {
      const b = e.target.closest('[data-rg]'); if (!b) return;
      if (b.dataset.rg === 'next') next();
      if (b.dataset.rg === 'back') go(state.step - 1);
      if (b.dataset.rg === 'close') close();
    });
    $('#rg-wa').href = wa('Hola, tengo una duda sobre la inscripción a la Faith Cup Navideña 2026.');
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) close(); });
    // cualquier botón con data-reg abre la inscripción (data-reg="libre" la abre en esa categoría)
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-reg]'); if (!t) return;
      e.preventDefault(); window.FCApp && window.FCApp.closeSheet(); open(t.dataset.reg || null);
    });
    listenCupos();
  });
  window.FCReg = { open, close };
})();
