/* =========================================================
   FAITH CUP NAVIDEÑA 2026 — datos del torneo
   Todo lo que se muestra en la página sale de aquí.
   En la fase de admin, estos valores se podrán sobrescribir
   desde Firebase sin tocar código.
   ========================================================= */
window.FAITHCUP = {
  nombre: 'Faith Cup Navideña',
  edicion: '2ª edición',
  anio: 2026,
  lugar: 'River Side Campus',
  causa: 'Juega por una Navidad',
  whatsapp: '573222462392',
  instagram: 'arenasportsco_',

  // Redes sociales de Arena Sports
  redes: [
    { id: 'instagram', nombre: 'Instagram', usuario: '@arenasportsco_', url: 'https://www.instagram.com/arenasportsco_/', texto: 'Fotos, historias y resultados del día' },
    { id: 'tiktok', nombre: 'TikTok', usuario: '@arenasportsco_', url: 'https://www.tiktok.com/@arenasportsco_', texto: 'Los mejores goles y momentos' },
    { id: 'youtube', nombre: 'YouTube', usuario: '@ArenaSportsCo', url: 'https://www.youtube.com/@ArenaSportsCo', texto: 'Resúmenes y partidos completos' },
    { id: 'facebook', nombre: 'Facebook', usuario: 'Arena Sports', url: 'https://www.facebook.com/share/19YH5N7aiq/', texto: 'Noticias y transmisiones' }
  ],

  // Fechas clave (hora Colombia, UTC-5)
  fechas: {
    abreInscripcion: '2026-11-23T00:00:00-05:00',
    cierraInscripcion: '2026-12-06T23:59:00-05:00',
    inicioTorneo: '2026-12-09T16:00:00-05:00',
    finTorneo: '2026-12-13T19:30:00-05:00'
  },

  // Link a la sección "Torneo en vivo" de la web de Arena Sports.
  // Déjalo en null hasta tener la URL final.
  linkEnVivo: null,

  // Inscripciones en la página. preinscripcion: true deja inscribirse antes del 23 de noviembre.
  inscripcion: {
    preinscripcion: true,
    tiposDoc: ['CC', 'TI', 'RC', 'Otro'],
    firebase: {
      apiKey: 'AIzaSyDkoBlrMc12TOCOe0lSg5kb2ZO6iNdW8Wo',
      authDomain: 'torneo-interiglesias.firebaseapp.com',
      projectId: 'torneo-interiglesias',
      storageBucket: 'torneo-interiglesias.firebasestorage.app',
      messagingSenderId: '494456395930',
      appId: '1:494456395930:web:5b680697e9460ece05a723'
    },
    coleccionPrivada: 'fc26_equipos',
    coleccionPublica: 'fc26_publico'
  },

  categorias: [
    {
      id: 'juvenil', nombre: 'Juvenil', deporte: 'Microfútbol', icono: 'ball',
      docs: ['TI'],
      anioDesde: 2009, anioHasta: 2013, minJugadores: 5, maxJugadores: 12,
      edad: '13 a 17 años', nacimiento: '2009 – 2013',
      cancha: 'Polideportiva (micro)', cuando: 'Mié a vie 4 pm · final el domingo',
      jugadores: 'Hasta 12 por equipo',
      minEquipos: 4, maxEquipos: 6, inscritos: 0,
      inscripcion: 200000,
      premio: { tipo: 'dinero', escalas: [
        { min: 6, campeon: 550000, sub: 200000 },
        { min: 4, campeon: 350000, sub: 150000 }
      ] },
      partido: '2 tiempos de 20 min'
    },
    {
      id: 'libre', nombre: 'Libre', deporte: 'Fútbol 5', icono: 'ball', destacada: true,
      docs: ['CC', 'Otro'],
      anioDesde: null, anioHasta: 2008, minJugadores: 5, maxJugadores: 12,
      edad: '18 años o más', nacimiento: '2008 o antes',
      cancha: 'Cancha sintética', cuando: 'Mié a vie 7 pm · semis sábado · final domingo',
      jugadores: 'Hasta 12 por equipo',
      minEquipos: 6, maxEquipos: 8, inscritos: 0,
      inscripcion: 350000,
      premio: { tipo: 'dinero', escalas: [
        { min: 8, campeon: 1500000, sub: 600000 },
        { min: 6, campeon: 1100000, sub: 400000 }
      ] },
      partido: '2 tiempos de 20 min'
    },
    {
      id: 'voley', nombre: 'Vóley mixto', deporte: 'Vóley', icono: 'volley',
      docs: ['TI', 'CC'],
      anioDesde: null, anioHasta: 2011, minJugadores: 6, maxJugadores: 10, mujeresMin: 3,
      edad: '15 años o más', nacimiento: '2011 o antes',
      cancha: 'Polideportiva', cuando: 'Sábado y domingo',
      jugadores: 'Hasta 10 · 6 en cancha · mín. 3 mujeres',
      minEquipos: 4, maxEquipos: 6, inscritos: 0,
      inscripcion: 200000,
      premio: { tipo: 'dinero', escalas: [
        { min: 6, campeon: 550000, sub: 200000 },
        { min: 4, campeon: 350000, sub: 150000 }
      ] },
      partido: 'Al mejor de 3 sets (25, 25 y 15)'
    }
  ],

  calendario: [
    {
      id: 'semana', etiqueta: 'Mié 9 · Jue 10 · Vie 11', titulo: 'Fase de grupos', horario: '4:00 – 9:00 pm',
      canchas: [
        { nombre: 'Polideportiva', items: [
          { hora: '4:00 pm', texto: 'Juvenil (micro) · fase de grupos', detalle: 'Mié y jue: partidos a las 4:00, 5:00 y 6:00.' },
          { hora: 'Vie 4:00 pm', texto: 'Semifinales Juvenil', detalle: '4:00 y 5:00' }
        ] },
        { nombre: 'Cancha sintética', items: [
          { hora: '7:00 pm', texto: 'Libre · fase de grupos', detalle: 'Partidos a las 7:00 y 8:00, los tres días.' }
        ] }
      ]
    },
    {
      id: 'sabado', etiqueta: 'Sábado 12', titulo: 'Día del vóley', horario: '8:00 am – 6:00 pm',
      canchas: [
        { nombre: 'Polideportiva', items: [
          { hora: '8:00 am', texto: 'Vóley mixto · fase de grupos', detalle: 'Partidos a las 8:00, 9:10, 10:20, 2:00, 3:10 y 4:20.' },
          { hora: '11:30 am', texto: 'Juvenil · 3er puesto' }
        ] },
        { nombre: 'Cancha sintética', items: [
          { hora: '4:00 pm', texto: 'Semifinales Libre', detalle: '4:00 y 5:00' }
        ] }
      ]
    },
    {
      id: 'domingo', etiqueta: 'Domingo 13', titulo: 'Gran Final Navideña', horario: 'Desde la 1:00 pm',
      canchas: [
        { nombre: 'Polideportiva', items: [
          { hora: '1:00 pm', texto: 'Semifinales Vóley', detalle: '1:00 y 2:10' },
          { hora: '3:20 pm', texto: 'Final Juvenil', final: true },
          { hora: '4:20 pm', texto: 'Vóley · 3er puesto' },
          { hora: '5:30 pm', texto: 'Final de Vóley', final: true }
        ] },
        { nombre: 'Cancha sintética', items: [
          { hora: '2:00 pm', texto: 'Libre · 3er puesto' },
          { hora: '4:30 pm', texto: 'Final Libre', final: true }
        ] }
      ],
      cierre: { hora: '7:00 pm', texto: 'Premiación', detalle: 'Papá Noel, sorteo del Gol Navideño, premio Corazón Navideño y foto con todas las donaciones.' }
    }
  ],

  donaciones: {
    regalos: 0,            // se actualizará desde el admin
    porEquipo: 5,
    metas: [
      { cantidad: 100, titulo: 'Primera estrella', texto: 'Se enciende la estrella del árbol.' },
      { cantidad: 250, titulo: 'Árbol encendido', texto: 'Todas las luces del árbol prendidas.' },
      { cantidad: 500, titulo: 'Navidad completa', texto: 'Una Navidad para cada niño de la fundación.' }
    ],
    ranking: []            // [{ equipo: 'Iglesia X', regalos: 12 }]
  },

  reglamento: [
    { titulo: 'Fútbol · Libre (sintética) y Juvenil (micro)', items: [
      'Solo zapatillas, no guayos.',
      'Tarjeta azul: 3 minutos fuera, no acumulable. Aplica también a la hinchada.',
      'Tarjeta roja: 4 minutos fuera o hasta que haya gol.',
      'Puntos en grupos: ganado 3, empate 1, perdido 0.',
      'Desempate: diferencia de gol, goles a favor y resultado entre ellos.',
      'Empate en eliminatoria: 3 penales por equipo; si sigue, muerte súbita.'
    ] },
    { titulo: 'Vóley mixto', items: [
      '6 en cancha, mínimo 3 mujeres en todo momento.',
      'Todos los partidos al mejor de 3 sets (25, 25 y 15 si hay empate).'
    ] },
    { titulo: 'Para todos', items: [
      'La edad se cuenta por año de nacimiento y se verifica con documento.',
      'Las plantillas se cierran el 6 de diciembre; no se agregan jugadores después.',
      'Cada equipo entrega mínimo 5 regalos al inscribirse o antes de su primer partido.',
      'Si una categoría no llega al mínimo de equipos, no se abre y se devuelve la inscripción.'
    ] }
  ],

  faq: [
    { p: '¿Quién puede inscribirse?', r: 'Equipos de iglesias. Cada jugador debe cumplir la edad de su categoría por año de nacimiento y presentar documento.' },
    { p: '¿Cuándo abren y cierran las inscripciones?', r: 'Abren el lunes 23 de noviembre y cierran el domingo 6 de diciembre de 2026.' },
    { p: '¿Qué regalos se pueden donar?', r: 'Juguetes nuevos o ropa en buen estado. Cada equipo trae mínimo 5. El público también puede donar en cualquier partido.' },
    { p: '¿A dónde van las donaciones?', r: 'Todo lo donado va a niños a través de una fundación aliada. Publicamos la entrega con fotos y video después del torneo.' },
    { p: '¿Qué pasa si mi categoría no se llena?', r: 'Si al 6 de diciembre no llega al mínimo de equipos, la categoría no se abre y se devuelve la inscripción.' },
    { p: '¿Puedo agregar jugadores después?', r: 'No. Las plantillas se cierran el 6 de diciembre.' }
  ]
};
