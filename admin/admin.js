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
  const hasGsap = typeof window.gsap !== 'undefined';

  firebase.initializeApp(R.firebase);
  const auth = firebase.auth(), db = firebase.firestore();
  const EQ = db.collection(R.coleccionPrivada), PUB = db.collection(R.coleccionPublica);
  const CFG = db.collection('fc26_config').doc('estado');
  const DON = db.collection('fc26_donaciones'), REG = db.collection('fc26_regalos');
  const KEY = db.collection('fc26_privado').doc('donar');

  let teams = [], donors = [], filter = 'todas', query = '', dquery = '', open = new Set(), publico = 0, clave = '', unsub = [];

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
      try { if (!localStorage.getItem('fc-guide')) { $('#guide').open = true; localStorage.setItem('fc-guide', '1'); } } catch (e) {}
    }).catch(() => {
      show('login'); $('#btn-out-login').hidden = false;
      msg(`La cuenta ${user.email} no tiene acceso al panel.`);
    });
  });

  /* ---------------- Datos en vivo ---------------- */
  function listen() {
    unsub.push(EQ.orderBy('creado', 'desc').onSnapshot(s => {
      teams = s.docs.map(d => ({ id: d.id, ...d.data() }));
      render(); fillIglesias(); syncDonaciones();
    }, e => toast('Error leyendo equipos: ' + e.message)));
    unsub.push(DON.orderBy('creado', 'desc').onSnapshot(s => {
      donors = s.docs.map(d => ({ id: d.id, ...d.data() }));
      renderDonors(); renderGifts(); kpis(); syncDonaciones();
    }, e => toast('Error leyendo donaciones: ' + e.message)));
    unsub.push(CFG.onSnapshot(s => {
      const d = s.data() || {}; publico = d.regalosPublico || 0;
      $('#g-publico').value = publico; renderGifts();
    }));
    // Código del QR: si no existe, se crea uno
    KEY.get().then(s => { clave = (s.data() || {}).clave; if (!clave) return newKey(true); drawQR(); }).catch(e => toast('No se pudo leer el código del QR: ' + e.message));
  }

  /* ---------------- Resumen ---------------- */
  const qrRegalos = () => donors.reduce((n, d) => n + (d.cantidad || 0), 0);
  const teamRegalos = () => teams.reduce((n, t) => n + (t.regalosEntregados || 0), 0);
  const totalRegalos = () => teamRegalos() + publico + qrRegalos();
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
  const waNum = t => { let n = String(t || '').replace(/\D/g, ''); if (n.length === 10) n = '57' + n; return n; };
  function waTo(t) {
    const c = CAT(t.categoria);
    const m = t.pagado
      ? `Hola ${t.responsable}, confirmamos el pago de ${t.iglesia} en ${c.nombre}. ¡Su cupo en la Faith Cup Navideña 2026 está asegurado! Recuerden los 5 regalos de la Misión Navidad.`
      : `Hola ${t.responsable}, recibimos la inscripción de ${t.iglesia} en ${c.nombre} para la Faith Cup Navideña 2026. Para asegurar el cupo falta el pago de ${money(c.inscripcion)}.`;
    return `https://wa.me/${waNum(t.telefono)}?text=${encodeURIComponent(m)}`;
  }
  function render() {
    kpis();
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
          <div class="stepper" data-step="equipo" title="Regalos que entregó el equipo en la inscripción"><button type="button" data-d="-1" aria-label="Restar regalo">−</button><span>${t.regalosEntregados || 0} 🎁</span><button type="button" data-d="1" aria-label="Sumar regalo">+</button></div>
          <button class="chip" data-act="ver" type="button">${open.has(t.id) ? 'Ocultar' : 'Ver'} jugadores</button>
          <button class="chip danger" data-act="borrar" type="button">Borrar</button>
        </div>
        ${open.has(t.id) ? `<div class="players"><table><thead><tr><th>#</th><th>Nombre</th><th>Documento</th><th>Nacimiento</th><th>Edad</th>${c.mujeresMin ? '<th>Género</th>' : ''}</tr></thead><tbody>
          ${js.map((p, i) => { const e = edad(p, c); return `<tr><td>${i + 1}</td><td>${esc(p.nombre)}</td><td>${esc(p.tipoDoc)} ${esc(p.numDoc)}</td><td>${esc(p.nacimiento)}</td><td class="${e.ok ? 'ok' : 'bad'}">${e.t}</td>${c.mujeresMin ? `<td>${p.genero === 'F' ? 'Mujer' : p.genero === 'M' ? 'Hombre' : '—'}</td>` : ''}</tr>`; }).join('')}
        </tbody></table></div>` : ''}
      </article>`;
    }).join('') : `<p class="empty">${teams.length ? 'Nada coincide con el filtro.' : 'Todavía no hay equipos inscritos. Aparecen aquí solos cuando alguien se inscribe en la página.'}</p>`;
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
  async function stepTeam(id, d) {
    const t = teams.find(x => x.id === id); if (!t) return;
    const v = Math.max(0, (t.regalosEntregados || 0) + d);
    try { await EQ.doc(id).update({ regalosEntregados: v }); } catch (e) { toast('No se pudo guardar: ' + e.message); }
  }

  /* ---------------- Donaciones ---------------- */
  // Ranking por iglesia: regalos del equipo + regalos de donantes que dijeron apoyar a esa iglesia
  function ranking() {
    const m = {};
    teams.filter(t => t.estado !== 'rechazado').forEach(t => { if (t.regalosEntregados) m[t.iglesia] = (m[t.iglesia] || 0) + t.regalosEntregados; });
    donors.forEach(d => { if (d.iglesia) m[d.iglesia] = (m[d.iglesia] || 0) + (d.cantidad || 0); });
    return Object.entries(m).map(([equipo, regalos]) => ({ equipo, regalos })).sort((a, b) => b.regalos - a.regalos).slice(0, 10);
  }
  function renderGifts() {
    $('#g-total').textContent = totalRegalos();
    $('#g-split').innerHTML = `<span>📱 ${qrRegalos()} por QR</span><span>⛪ ${teamRegalos()} de equipos</span><span>📦 ${publico} sin registro</span>`;
    const r = ranking();
    $('#rank').innerHTML = r.length ? r.map((x, i) => `<li><span>${i === 0 ? '❤️' : i + 1}</span><b>${esc(x.equipo)}</b><i>${x.regalos} 🎁</i></li>`).join('') : '<li class="muted">Aparece cuando lleguen regalos de equipos o de donantes que apoyan a una iglesia.</li>';
  }
  function renderDonors() {
    const q = dquery.toLowerCase();
    const list = donors.filter(d => !q || `${d.nombre} ${d.codigo} ${d.iglesia}`.toLowerCase().includes(q));
    $('#d-count').textContent = `${donors.length} · ${qrRegalos()} regalos`;
    $('#donors').innerHTML = list.length ? list.map(d => {
      const f = d.creado && d.creado.toDate ? d.creado.toDate().toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
      return `<div class="donor ${d.ganador ? 'win' : ''}" data-id="${d.id}">
        <div class="donor__main"><b>${esc(d.nombre)}</b>${d.ganador ? ` <span class="tag">🏆 ${esc(d.premio || 'Ganador')}</span>` : ''}
          <small>${esc(d.codigo || '')} · ${d.cantidad} ${d.cantidad === 1 ? 'regalo' : 'regalos'}${d.tipo ? ' · ' + esc(d.tipo) : ''}${d.iglesia ? ' · ⛪ ' + esc(d.iglesia) : ''} · ${d.origen === 'manual' ? 'a mano' : 'QR'} · ${f}</small></div>
        ${d.telefono ? `<a class="wa wa--sm" href="https://wa.me/${waNum(d.telefono)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        <button class="chip danger" data-del="${d.id}" type="button" aria-label="Borrar donación">✕</button>
      </div>`;
    }).join('') : `<p class="empty">${donors.length ? 'Nada coincide.' : 'Todavía no hay donantes. Aparecen aquí cuando escanean el QR.'}</p>`;
  }
  function fillIglesias() {
    const sel = $('#a-iglesia'), cur = sel.value;
    const names = [...new Set(teams.filter(t => t.estado !== 'rechazado').map(t => t.iglesia))].sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">Sin equipo</option>' + names.map(n => `<option ${n === cur ? 'selected' : ''}>${esc(n)}</option>`).join('');
  }
  const code = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  let addCant = 1;
  async function addDonor(e) {
    e.preventDefault();
    const nombre = $('#a-nombre').value.trim(); if (nombre.length < 2) return toast('Escribe el nombre');
    const ref = DON.doc(), ts = firebase.firestore.FieldValue.serverTimestamp(), iglesia = $('#a-iglesia').value;
    const b = db.batch();
    b.set(ref, { nombre, telefono: $('#a-tel').value.replace(/[^\d+]/g, ''), cantidad: addCant, tipo: '', iglesia, codigo: code(), k: clave, origen: 'manual', creado: ts });
    b.set(REG.doc(ref.id), { cantidad: addCant, iglesia, creado: ts });
    try { await b.commit(); $('#add').reset(); addCant = 1; $('#a-cant').textContent = 1; toast('Donación agregada · entra al sorteo'); }
    catch (x) { toast('No se pudo agregar: ' + x.message); }
  }
  async function delDonor(id) {
    const d = donors.find(x => x.id === id); if (!d) return;
    if (!confirm(`¿Borrar la donación de ${d.nombre} (${d.cantidad} regalos)? Sale del sorteo y del total.`)) return;
    const b = db.batch(); b.delete(DON.doc(id)); b.delete(REG.doc(id));
    try { await b.commit(); toast('Donación borrada'); } catch (x) { toast('No se pudo borrar: ' + x.message); }
  }
  // Lo público (regalos de equipos y sin registro + ranking) se guarda para que la página lo muestre en vivo.
  // Los regalos por QR la página los suma sola.
  let syncT = null;
  function syncDonaciones() {
    clearTimeout(syncT);
    syncT = setTimeout(() => {
      CFG.set({ regalos: teamRegalos() + publico, regalosPublico: publico, ranking: ranking(), actualizado: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
        .catch(e => toast('No se pudo actualizar el contador: ' + e.message));
    }, 600);
  }
  function setPublico(v) { publico = Math.max(0, Number(v) || 0); $('#g-publico').value = publico; renderGifts(); kpis(); syncDonaciones(); }

  /* ---------------- QR ---------------- */
  const donarURL = () => `${location.origin}${location.pathname.replace(/admin\/?(index\.html)?$/, '')}donar/?k=${encodeURIComponent(clave)}`;
  function drawQR() {
    const box = $('#qr'); box.innerHTML = '';
    if (!window.QRCode || !clave) { box.textContent = 'Generando…'; return; }
    new QRCode(box, { text: donarURL(), width: 220, height: 220, colorDark: '#050707', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  }
  async function newKey(silent) {
    if (!silent && !confirm('¿Cambiar el código? Los carteles que ya imprimiste dejan de funcionar y tendrás que imprimir uno nuevo.')) return;
    const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let k = ''; for (let i = 0; i < 10; i++) k += a[Math.floor(Math.random() * a.length)];
    try { await KEY.set({ clave: k, creado: firebase.firestore.FieldValue.serverTimestamp() }); clave = k; drawQR(); if (!silent) toast('Código nuevo listo. Imprime el cartel otra vez.'); }
    catch (e) { toast('No se pudo crear el código: ' + e.message); }
  }
  function printPoster() {
    const img = $('#qr img') || $('#qr canvas'); if (!img) return;
    const src = img.tagName === 'CANVAS' ? img.toDataURL() : img.src;
    const redes = C.redes.map(r => `<span>${r.nombre} <b>${r.usuario}</b></span>`).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cartel QR · Misión Navidad</title>
      <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@500;700;800&display=swap" rel="stylesheet">
      <style>@page{size:A4;margin:0}body{margin:0;font-family:Inter,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .p{width:210mm;height:297mm;box-sizing:border-box;padding:16mm;background:#0b0f0f;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;background:radial-gradient(80% 40% at 50% 0%,#7a0f17,#0b0f0f 70%)}
      img.l{width:60mm}h1{font-family:Anton;font-weight:400;font-size:30mm;line-height:.9;margin:4mm 0;text-transform:uppercase}h1 i{color:#f2c14e;font-style:normal}
      p{font-size:6mm;margin:0;color:#ffdede}.q{background:#fff;padding:6mm;border-radius:8mm}.q img{width:95mm;height:95mm;display:block}
      .s{display:flex;flex-direction:column;gap:2mm;font-size:5mm}.s b{color:#c8f000}.k{font-size:4.5mm;letter-spacing:.3em;text-transform:uppercase;color:#c8f000;font-weight:800}</style></head>
      <body><div class="p"><img class="l" src="${location.origin}/assets/logo-arena.png" alt=""><div><p class="k">Misión Navidad · Faith Cup</p><h1>Registra tu <i>regalo</i></h1>
      <p>Escanea, pon tu nombre y entra al <b style="color:#ffe39a">sorteo del Gol Navideño</b>.<br>Cada regalo es una oportunidad más.</p></div>
      <div class="q"><img src="${src}" alt="QR"></div><div class="s">${redes}</div><p>Sorteo en la premiación · domingo 13 de diciembre · 7:00 pm</p></div>
      <script>window.onload=()=>setTimeout(()=>print(),400)<\/script></body></html>`);
    w.document.close();
  }

  /* ---------------- Sorteo ---------------- */
  let winner = null;
  function pool() {
    const noRep = $('#draw-norepeat').checked;
    const list = donors.filter(d => !(noRep && d.ganador));
    const tickets = []; list.forEach(d => { for (let i = 0; i < Math.max(1, d.cantidad || 1); i++) tickets.push(d); });
    return { list, tickets };
  }
  function renderWinners() {
    const w = donors.filter(d => d.ganador);
    $('#draw-winners').innerHTML = w.map(d => `<li>🏆 <b>${esc(d.nombre)}</b> · ${esc(d.codigo)}${d.premio ? ' · ' + esc(d.premio) : ''}</li>`).join('');
  }
  function openDraw() {
    winner = null; $('#draw').hidden = false; $('#draw-save').hidden = true;
    $('#draw-name').textContent = '¿Quién ganará?'; $('#draw-code').textContent = '';
    const { list, tickets } = pool();
    $('#draw-info').textContent = `${list.length} participantes · ${tickets.length} boletos`;
    renderWinners();
  }
  function spin() {
    const { list, tickets } = pool();
    if (!tickets.length) return toast('No hay participantes para sortear');
    const pick = tickets[Math.floor(Math.random() * tickets.length)];
    const name = $('#draw-name'), codeEl = $('#draw-code');
    $('#draw-go').disabled = true; $('#draw-save').hidden = true; $('.draw__slot').classList.remove('won');
    let i = 0, delay = 40; const total = 34;
    const step = () => {
      const d = i < total - 1 ? list[Math.floor(Math.random() * list.length)] : pick;
      name.textContent = d.nombre; codeEl.textContent = d.codigo || '';
      if (hasGsap) gsap.fromTo(name, { y: -30, opacity: .3 }, { y: 0, opacity: 1, duration: .1 });
      i++;
      if (i < total) { delay *= 1.11; setTimeout(step, delay); }
      else {
        winner = pick; $('#draw-go').disabled = false; $('#draw-go').textContent = 'Sortear otra vez'; $('#draw-save').hidden = false;
        $('.draw__slot').classList.add('won');
        $('#draw-info').textContent = `¡Ganador! ${pick.cantidad} ${pick.cantidad === 1 ? 'boleto' : 'boletos'} en el sorteo${pick.iglesia ? ' · apoya a ' + pick.iglesia : ''}`;
        confetti();
      }
    };
    step();
  }
  async function saveWinner() {
    if (!winner) return;
    try { await DON.doc(winner.id).update({ ganador: true, premio: $('#draw-premio').value.trim() }); toast('Ganador guardado'); $('#draw-save').hidden = true; renderWinners(); }
    catch (e) { toast('No se pudo guardar: ' + e.message); }
  }
  function confetti() {
    const box = $('#draw'), cols = ['#c8f000', '#e3262f', '#f2c14e', '#fff'];
    for (let i = 0; i < 70; i++) {
      const s = document.createElement('i'); s.className = 'cf'; s.style.background = cols[i % 4]; s.style.left = Math.random() * 100 + '%'; box.appendChild(s);
      if (!hasGsap) { s.remove(); continue; }
      gsap.fromTo(s, { y: -20, rotation: 0 }, { y: innerHeight + 40, x: (Math.random() - .5) * 200, rotation: Math.random() * 900, duration: 2 + Math.random() * 1.5, ease: 'power1.in', onComplete: () => s.remove() });
    }
  }

  let toastT;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }

  /* ---------------- CSV ---------------- */
  function csv() {
    const rows = [['Iglesia', 'Equipo', 'Categoría', 'Responsable', 'WhatsApp', 'Estado', 'Pagado', 'Regalos', 'Jugador', 'Tipo doc', 'Documento', 'Nacimiento', 'Género']];
    teams.forEach(t => (t.jugadores || []).forEach(p => rows.push([t.iglesia, t.equipo, CAT(t.categoria).nombre, t.responsable, t.telefono, t.estado, t.pagado ? 'Sí' : 'No', t.regalosEntregados || 0, p.nombre, p.tipoDoc, p.numDoc, p.nacimiento, p.genero])));
    const text = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = `faithcup-2026-inscritos-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  /* ---------------- Eventos ---------------- */
  $('#btn-google').addEventListener('click', signIn);
  $('#btn-out').addEventListener('click', () => auth.signOut());
  $('#btn-out-login').addEventListener('click', () => auth.signOut().then(signIn));
  $('#btn-csv').addEventListener('click', csv);
  $('#search').addEventListener('input', e => { query = e.target.value; render(); });
  $('#d-search').addEventListener('input', e => { dquery = e.target.value; renderDonors(); });
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
  $('[data-step="add"]').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; addCant = Math.max(1, Math.min(20, addCant + Number(b.dataset.d))); $('#a-cant').textContent = addCant; });
  $('#add').addEventListener('submit', addDonor);
  $('#donors').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) delDonor(b.dataset.del); });
  $('#qr-print').addEventListener('click', printPoster);
  $('#qr-copy').addEventListener('click', () => navigator.clipboard.writeText(donarURL()).then(() => toast('Link copiado')));
  $('#qr-new').addEventListener('click', () => newKey(false));
  $('#btn-draw').addEventListener('click', openDraw);
  $('#draw-close').addEventListener('click', () => { $('#draw').hidden = true; $('#draw-go').textContent = '¡Sortear!'; });
  $('#draw-go').addEventListener('click', spin);
  $('#draw-save').addEventListener('click', saveWinner);
  $('#draw-norepeat').addEventListener('change', () => { const { list, tickets } = pool(); $('#draw-info').textContent = `${list.length} participantes · ${tickets.length} boletos`; });
})();
