/* =========================================================
   Panel del organizador · Faith Cup Navideña 2026
   Entra con Google. Solo los correos admin de las reglas de
   Firebase pueden leer o cambiar algo: si otra cuenta entra,
   Firebase le niega los datos aunque vea esta pantalla.
   ========================================================= */
(function () {
  'use strict';
  const C = window.FAITHCUP, R = C.inscripcion;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const money = n => '$' + Number(n || 0).toLocaleString('es-CO');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const CAT = id => C.categorias.find(c => c.id === id) || { nombre: id, inscripcion: 0, maxEquipos: 0 };

  firebase.initializeApp(R.firebase);
  const auth = firebase.auth(), db = firebase.firestore();
  const EQ = db.collection(R.coleccionPrivada), PUB = db.collection(R.coleccionPublica), CFG = db.collection('fc26_config').doc('estado');

  let teams = [], filter = 'todas', query = '', open = new Set(), publico = 0, unsub = [];

  /* ---------------- Sesión ---------------- */
  function show(id) { $('#login').hidden = id !== 'login'; $('#app').hidden = id !== 'app'; }
  async function signIn() {
    const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await auth.signInWithPopup(p); }
    catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return auth.signInWithRedirect(p);
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') msg('No se pudo entrar: ' + e.message);
    }
  }
  function msg(t) { $('#login-msg').textContent = t; }
  auth.onAuthStateChanged(user => {
    unsub.forEach(u => u()); unsub = [];
    if (!user) { show('login'); $('#btn-out-login').hidden = true; msg('Entra con tu cuenta de Google de administrador.'); return; }
    // Firebase decide si es admin: si la lectura falla, no lo es
    EQ.limit(1).get().then(() => {
      $('#who').textContent = user.email; show('app'); listen();
    }).catch(() => {
      show('login'); $('#btn-out-login').hidden = false;
      msg(`La cuenta ${user.email} no tiene acceso al panel.`);
    });
  });

  /* ---------------- Datos en vivo ---------------- */
  function listen() {
    unsub.push(EQ.orderBy('creado', 'desc').onSnapshot(s => {
      teams = s.docs.map(d => ({ id: d.id, ...d.data() }));
      render(); syncDonaciones();
    }, e => toast('Error leyendo equipos: ' + e.message)));
    unsub.push(CFG.onSnapshot(s => {
      const d = s.data() || {}; publico = d.regalosPublico || 0;
      $('#g-publico').value = publico; renderGifts();
    }));
  }

  /* ---------------- Resumen ---------------- */
  function kpis() {
    const activos = teams.filter(t => t.estado !== 'rechazado');
    const pagados = activos.filter(t => t.pagado);
    const jugadores = activos.reduce((n, t) => n + (t.jugadores || []).length, 0);
    const esperado = activos.reduce((n, t) => n + CAT(t.categoria).inscripcion, 0);
    const recibido = pagados.reduce((n, t) => n + CAT(t.categoria).inscripcion, 0);
    $('#kpis').innerHTML = [
      ['Equipos', activos.length], ['Pagados', `${pagados.length}/${activos.length}`], ['Jugadores', jugadores],
      ['Recibido', money(recibido)], ['Por cobrar', money(esperado - recibido)], ['Regalos', totalRegalos()]
    ].map(([k, v]) => `<div class="kpi"><small>${k}</small><b>${v}</b></div>`).join('');
  }

  /* ---------------- Equipos ---------------- */
  function edad(p, c) {
    const y = Number((p.nacimiento || '').slice(0, 4)); if (!y) return { ok: false, t: '—' };
    const ok = (c.anioDesde == null || y >= c.anioDesde) && (c.anioHasta == null || y <= c.anioHasta);
    return { ok, t: `${2026 - y} años` };
  }
  function waTo(t) {
    let n = String(t.telefono || '').replace(/\D/g, ''); if (n.length === 10) n = '57' + n;
    const c = CAT(t.categoria);
    const m = t.pagado
      ? `Hola ${t.responsable}, confirmamos el pago de ${t.iglesia} en ${c.nombre}. ¡Su cupo en la Faith Cup Navideña 2026 está asegurado! Recuerden los 5 regalos de la Misión Navidad.`
      : `Hola ${t.responsable}, recibimos la inscripción de ${t.iglesia} en ${c.nombre} para la Faith Cup Navideña 2026. Para asegurar el cupo falta el pago de ${money(c.inscripcion)}.`;
    return `https://wa.me/${n}?text=${encodeURIComponent(m)}`;
  }
  function render() {
    kpis();
    // filtros con cupos
    const count = {}; teams.filter(t => t.estado !== 'rechazado').forEach(t => count[t.categoria] = (count[t.categoria] || 0) + 1);
    $('#filters').innerHTML = [['todas', 'Todas', teams.length, null]].concat(C.categorias.map(c => [c.id, c.nombre, count[c.id] || 0, c.maxEquipos]))
      .map(([id, n, k, max]) => `<button class="chip ${filter === id ? 'on' : ''}" data-f="${id}">${esc(n)} <i>${k}${max ? '/' + max : ''}</i></button>`).join('');

    const q = query.toLowerCase();
    const list = teams.filter(t => (filter === 'todas' || t.categoria === filter) && (!q ||
      [t.iglesia, t.equipo, t.responsable, ...(t.jugadores || []).map(p => p.nombre + ' ' + p.numDoc)].join(' ').toLowerCase().includes(q)));

    $('#teams').innerHTML = list.length ? list.map(t => {
      const c = CAT(t.categoria), js = t.jugadores || [], malos = js.filter(p => !edad(p, c).ok).length;
      const fecha = t.creado && t.creado.toDate ? t.creado.toDate().toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
      return `<article class="team ${t.estado}" data-id="${t.id}">
        <div class="team__head">
          <div class="team__main">
            <span class="tag">${esc(c.nombre)}</span>
            <h3>${esc(t.iglesia)}${t.equipo ? ` <em>${esc(t.equipo)}</em>` : ''}</h3>
            <p class="muted">${esc(t.responsable)} · ${esc(t.telefono)} · ${js.length} jugadores${malos ? ` · <b class="bad">${malos} fuera de edad</b>` : ''} · ${fecha}</p>
          </div>
          <a class="wa" href="${waTo(t)}" target="_blank" rel="noopener" title="Escribir por WhatsApp">WhatsApp</a>
        </div>
        <div class="team__ctrl">
          <button class="toggle ${t.pagado ? 'on' : ''}" data-act="pagado" type="button"><span></span>${t.pagado ? 'Pagado' : 'Sin pagar'} · ${money(c.inscripcion)}</button>
          <select data-act="estado" aria-label="Estado">
            ${['pendiente', 'confirmado', 'rechazado'].map(s => `<option value="${s}" ${t.estado === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
          </select>
          <div class="stepper" data-step="equipo"><button type="button" data-d="-1" aria-label="Restar regalo">−</button><span>${t.regalosEntregados || 0} 🎁</span><button type="button" data-d="1" aria-label="Sumar regalo">+</button></div>
          <button class="chip" data-act="ver" type="button">${open.has(t.id) ? 'Ocultar' : 'Ver'} jugadores</button>
          <button class="chip danger" data-act="borrar" type="button">Borrar</button>
        </div>
        ${open.has(t.id) ? `<div class="players"><table><thead><tr><th>#</th><th>Nombre</th><th>Documento</th><th>Nacimiento</th><th>Edad</th>${c.mujeresMin ? '<th>Género</th>' : ''}</tr></thead><tbody>
          ${js.map((p, i) => { const e = edad(p, c); return `<tr><td>${i + 1}</td><td>${esc(p.nombre)}</td><td>${esc(p.tipoDoc)} ${esc(p.numDoc)}</td><td>${esc(p.nacimiento)}</td><td class="${e.ok ? 'ok' : 'bad'}">${e.t}</td>${c.mujeresMin ? `<td>${p.genero === 'F' ? 'Mujer' : p.genero === 'M' ? 'Hombre' : '—'}</td>` : ''}</tr>`; }).join('')}
        </tbody></table></div>` : ''}
      </article>`;
    }).join('') : `<p class="empty">${teams.length ? 'Nada coincide con el filtro.' : 'Todavía no hay equipos inscritos.'}</p>`;
    renderGifts();
  }

  async function act(id, what, el) {
    const t = teams.find(x => x.id === id); if (!t) return;
    try {
      if (what === 'pagado') { await EQ.doc(id).update({ pagado: !t.pagado, estado: !t.pagado && t.estado === 'pendiente' ? 'confirmado' : t.estado }); toast(!t.pagado ? 'Marcado como pagado' : 'Marcado sin pagar'); }
      if (what === 'estado') {
        // Rechazado libera el cupo en la página; volver a aceptarlo lo ocupa otra vez
        const b = db.batch(); b.update(EQ.doc(id), { estado: el.value });
        if (el.value === 'rechazado') b.delete(PUB.doc(id));
        else if (t.estado === 'rechazado') b.set(PUB.doc(id), { iglesia: t.iglesia, categoria: t.categoria, creado: firebase.firestore.FieldValue.serverTimestamp() });
        await b.commit(); toast('Estado: ' + el.value);
      }
      if (what === 'ver') { open.has(id) ? open.delete(id) : open.add(id); render(); }
      if (what === 'borrar') {
        if (!confirm(`¿Borrar a ${t.iglesia} (${CAT(t.categoria).nombre})? Se libera su cupo y no se puede deshacer.`)) return;
        const b = db.batch(); b.delete(EQ.doc(id)); b.delete(PUB.doc(id)); await b.commit(); toast('Equipo borrado');
      }
    } catch (e) { toast('No se pudo guardar: ' + e.message); }
  }

  /* ---------------- Regalos ---------------- */
  const totalRegalos = () => teams.reduce((n, t) => n + (t.regalosEntregados || 0), 0) + publico;
  function ranking() {
    return teams.filter(t => (t.regalosEntregados || 0) > 0 && t.estado !== 'rechazado')
      .map(t => ({ equipo: t.equipo ? `${t.iglesia} · ${t.equipo}` : t.iglesia, regalos: t.regalosEntregados }))
      .sort((a, b) => b.regalos - a.regalos).slice(0, 10);
  }
  function renderGifts() {
    $('#g-total').textContent = totalRegalos();
    const r = ranking();
    $('#rank').innerHTML = r.length ? r.map((x, i) => `<li><span>${i === 0 ? '❤️' : i + 1}</span><b>${esc(x.equipo)}</b><i>${x.regalos} 🎁</i></li>`).join('') : '<li class="muted">El ranking aparece cuando anotes regalos de los equipos.</li>';
  }
  // Lo público (total y ranking) se guarda en un documento que la página lee en vivo
  let syncT = null;
  function syncDonaciones() {
    clearTimeout(syncT);
    syncT = setTimeout(() => {
      CFG.set({ regalos: totalRegalos(), regalosPublico: publico, ranking: ranking(), actualizado: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
        .catch(e => toast('No se pudo actualizar el contador: ' + e.message));
    }, 500);
  }
  async function stepTeam(id, d) {
    const t = teams.find(x => x.id === id); if (!t) return;
    const v = Math.max(0, (t.regalosEntregados || 0) + d);
    try { await EQ.doc(id).update({ regalosEntregados: v }); } catch (e) { toast('No se pudo guardar: ' + e.message); }
  }
  function setPublico(v) { publico = Math.max(0, Number(v) || 0); $('#g-publico').value = publico; renderGifts(); kpis(); syncDonaciones(); }

  /* ---------------- CSV ---------------- */
  function csv() {
    const rows = [['Iglesia', 'Equipo', 'Categoría', 'Responsable', 'WhatsApp', 'Estado', 'Pagado', 'Regalos', 'Jugador', 'Tipo doc', 'Documento', 'Nacimiento', 'Género']];
    teams.forEach(t => (t.jugadores || []).forEach(p => rows.push([t.iglesia, t.equipo, CAT(t.categoria).nombre, t.responsable, t.telefono, t.estado, t.pagado ? 'Sí' : 'No', t.regalosEntregados || 0, p.nombre, p.tipoDoc, p.numDoc, p.nacimiento, p.genero])));
    const text = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = `faithcup-2026-inscritos-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  let toastT;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2400); }

  /* ---------------- Eventos ---------------- */
  $('#btn-google').addEventListener('click', signIn);
  $('#btn-out').addEventListener('click', () => auth.signOut());
  $('#btn-out-login').addEventListener('click', () => auth.signOut().then(signIn));
  $('#btn-csv').addEventListener('click', csv);
  $('#search').addEventListener('input', e => { query = e.target.value; render(); });
  $('#filters').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; render(); } });
  $$('.tabs [data-tab]').forEach(b => b.addEventListener('click', () => {
    $$('.tabs [data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
    $('#tab-equipos').hidden = b.dataset.tab !== 'equipos'; $('#tab-regalos').hidden = b.dataset.tab !== 'regalos';
  }));
  $('#teams').addEventListener('click', e => {
    const card = e.target.closest('.team'); if (!card) return;
    const st = e.target.closest('.stepper [data-d]'); if (st) return stepTeam(card.dataset.id, Number(st.dataset.d));
    const b = e.target.closest('button[data-act]'); if (b) act(card.dataset.id, b.dataset.act, b);
  });
  $('#teams').addEventListener('change', e => { const s = e.target.closest('select[data-act]'); if (s) act(s.closest('.team').dataset.id, 'estado', s); });
  $('[data-step="publico"]').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) setPublico(publico + Number(b.dataset.d)); });
  $('#g-publico').addEventListener('change', e => setPublico(e.target.value));
})();
