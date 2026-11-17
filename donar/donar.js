/* =========================================================
   Registro de regalos (QR del punto de donación)
   El QR trae ?k=CLAVE. Sin esa clave, Firebase rechaza el
   registro: así solo se registra quien está en la caja.
   ========================================================= */
(function () {
  'use strict';
  const C = window.FAITHCUP, R = C.inscripcion;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const key = new URLSearchParams(location.search).get('k') || '';

  firebase.initializeApp(R.firebase);
  const db = firebase.firestore();

  /* ---------------- Redes ---------------- */
  const ICON = {
    instagram: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" class="f"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.8 2.3 4.5 5 4.8"/></svg>',
    youtube: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" class="f"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H9v3h2.7V21"/></svg>'
  };
  $('#redes').innerHTML = C.redes.map(r => `<a class="red red--${r.id}" href="${esc(r.url)}" target="_blank" rel="noopener">
    <span class="red__ico">${ICON[r.id]}</span><span class="red__txt"><b>${esc(r.nombre)}</b><small>${esc(r.usuario)}</small></span><span class="red__go">Seguir</span></a>`).join('');

  /* ---------------- Formulario ---------------- */
  if (!key) { $('#form-card').hidden = true; $('#locked').hidden = false; }

  let cant = 1, tipo = 'juguete';
  const setCant = v => {
    cant = Math.max(1, Math.min(20, v));
    $('#f-cant').textContent = cant;
    $('#f-chances').textContent = cant === 1 ? '1 oportunidad en el sorteo' : `${cant} oportunidades en el sorteo`;
  };
  document.querySelectorAll('.count [data-d]').forEach(b => b.addEventListener('click', () => setCant(cant + Number(b.dataset.d))));
  $('#f-tipo').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    tipo = b.dataset.v;
    document.querySelectorAll('#f-tipo [data-v]').forEach(x => x.setAttribute('aria-checked', x === b));
  });

  // Equipos inscritos para el Corazón Navideño
  db.collection(R.coleccionPublica).get().then(s => {
    const byCat = {};
    s.forEach(d => { const x = d.data(); (byCat[x.categoria] = byCat[x.categoria] || []).push(x.iglesia); });
    const sel = $('#f-iglesia');
    C.categorias.forEach(c => {
      const list = (byCat[c.id] || []).sort((a, b) => a.localeCompare(b));
      if (!list.length) return;
      sel.insertAdjacentHTML('beforeend', `<optgroup label="${esc(c.nombre)}">${list.map(n => `<option>${esc(n)}</option>`).join('')}</optgroup>`);
    });
  }).catch(() => {});

  const code = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };

  $('#form').addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = $('#f-nombre').value.trim(), tel = $('#f-tel').value.replace(/[^\d+]/g, '');
    const err = $('#err');
    if (nombre.length < 3) return (err.textContent = 'Escribe tu nombre.');
    if (tel.replace(/\D/g, '').length < 10) return (err.textContent = 'El WhatsApp debe tener 10 números.');
    err.textContent = '';
    const btn = $('#send'); btn.disabled = true; btn.textContent = 'Registrando…';
    const ref = db.collection('fc26_donaciones').doc(), pub = db.collection('fc26_regalos').doc(ref.id);
    const ts = firebase.firestore.FieldValue.serverTimestamp(), iglesia = $('#f-iglesia').value, codigo = code();
    const b = db.batch();
    b.set(ref, { nombre, telefono: tel, cantidad: cant, tipo, iglesia, codigo, k: key, origen: 'qr', creado: ts });
    b.set(pub, { cantidad: cant, iglesia, creado: ts });
    try {
      await b.commit();
      $('#t-name').textContent = nombre;
      $('#t-code').textContent = codigo;
      $('#t-chances').textContent = cant;
      $('#form-card').hidden = true; $('#done').hidden = false;
      $('#done').scrollIntoView({ behavior: 'smooth', block: 'start' });
      try { const mine = JSON.parse(localStorage.getItem('fc26-boletos') || '[]'); mine.push({ codigo, cant }); localStorage.setItem('fc26-boletos', JSON.stringify(mine)); } catch (x) {}
    } catch (x) {
      console.warn(x);
      err.textContent = x.code === 'permission-denied'
        ? 'Este código QR ya no es válido. Pide a un organizador el código actualizado.'
        : 'No se pudo registrar. Revisa tu conexión e intenta de nuevo.';
    }
    btn.disabled = false; btn.textContent = 'Registrar mi regalo';
  });
  $('#again').addEventListener('click', () => {
    $('#form').reset(); setCant(1); $('#done').hidden = true; $('#form-card').hidden = false;
    $('#form-card').scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------------- Nieve ---------------- */
  const cv = $('#snow'), ctx = cv.getContext('2d'); let w, h, fl = [];
  const mk = any => ({ x: Math.random() * w, y: any ? Math.random() * h : -10, r: 1 + Math.random() * 2.6, v: .4 + Math.random() * 1.1, s: Math.random() * 6 });
  function size() { w = cv.width = innerWidth; h = cv.height = innerHeight; fl = Array.from({ length: Math.round(w / 6) }, () => mk(true)); }
  function loop() { ctx.clearRect(0, 0, w, h); ctx.fillStyle = 'rgba(255,255,255,.8)'; fl.forEach(f => { f.s += .02; f.x += Math.sin(f.s) * .4; f.y += f.v; if (f.y > h) Object.assign(f, mk(false)); ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.28); ctx.fill(); }); requestAnimationFrame(loop); }
  addEventListener('resize', size); size(); loop();
})();
