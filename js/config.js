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

  // Fechas clave (hora Colombia, UTC-5)
  fechas: {
    abreInscripcion: '2026-11-23T00:00:00-05:00',
    cierraInscripcion: '2026-12-06T23:59:00-05:00',
    inicioTorneo: '2026-12-09T18:00:00-05:00',
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
      apiKey: 'AIzaSyDkoBlrMc12TOCOe0LSg5kb2ZO6iNdW8Wo',
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
      id: 'mini', nombre: 'Mini', deporte: 'Fútbol', icono: 'ball',
      docs: ['TI', 'RC'],
      anioDesde: 2018, anioHasta: 2020, minJugadores: 5, maxJugadores: 8,
      edad: '6 a 8 años', nacimiento: '2018 – 2020',
      cancha: 'Polideportiva', cuando: 'Sábado y domingo',
      jugadores: '8 por equipo · 5 en cancha',
      minEquipos: 4, maxEquipos: 8, inscritos: 0,
      inscripcion: 150000,
      premio: { tipo: 'especie', texto: 'Trofeo + medallas + premio en especie' },
      partido: '2 tiempos de 8 min'
    },
    {
      id: 'pre', nombre: 'Pre', deporte: 'Fútbol', icono: 'ball',
      docs: ['TI'],
      anioDesde: 2016, anioHasta: 2017, minJugadores: 5, maxJugadores: 8,
      edad: '9 a 10 años', nacimiento: '2016 – 2017',
      cancha: 'Polideportiva', cuando: 'Sábado y domingo',
      jugadores: '8 por equipo · 5 en cancha',
      minEquipos: 4, maxEquipos: 8, inscritos: 0,
      inscripcion: 150000,
      premio: { tipo: 'especie', texto: 'Trofeo + medallas + premio en especie' },
      partido: '2 tiempos de 10 min'
    },
    {
      id: 'juvenil', nombre: 'Juvenil', deporte: 'Fútbol 5', icono: 'ball',
      docs: ['TI'],
      anioDesde: 2009, anioHasta: 2011, minJugadores: 5, maxJugadores: 12,
      edad: '15 a 17 años', nacimiento: '2009 – 2011',
      cancha: 'Fútbol 5', cuando: 'Sábado y domingo',
      jugadores: 'Hasta 12 por equipo',
      minEquipos: 4, maxEquipos: 8, inscritos: 0,
      inscripcion: 200000,
      premio: { tipo: 'dinero', escalas: [
        { min: 8, campeon: 800000, sub: 300000 },
        { min: 6, campeon: 550000, sub: 200000 },
        { min: 4, campeon: 350000, sub: 150000 }
      ] },
      partido: '2 tiempos de 12 min'
    },
    {
      id: 'libre', nombre: 'Libre', deporte: 'Fútbol 5', icono: 'ball', destacada: true,
      docs: ['CC', 'Otro'],
      anioDesde: null, anioHasta: 2008, minJugadores: 5, maxJugadores: 12,
      edad: '18 años o más', nacimiento: '2008 o antes',
      cancha: 'Fútbol 5', cuando: 'Mié a vie noche + fin de semana',
      jugadores: 'Hasta 12 por equipo',
      minEquipos: 6, maxEquipos: 8, inscritos: 0,
      inscripcion: 350000,
      premio: { tipo: 'dinero', escalas: [
        { min: 8, campeon: 1500000, sub: 600000 },
        { min: 6, campeon: 1100000, sub: 400000 }
      ] },
      partido: '2 tiempos de 12 min'
    },
    {
      id: 'voley', nombre: 'Vóley mixto', deporte: 'Vóley', icono: 'volley',
      docs: ['TI', 'CC'],
      anioDesde: null, anioHasta: 2011, minJugadores: 6, maxJugadores: 10, mujeresMin: 3,
      edad: '15 años o más', nacimiento: '2011 o antes',
      cancha: 'Polideportiva', cuando: 'Mié a vie noche + fin de semana',
      jugadores: 'Hasta 10 · 6 en cancha · mín. 3 mujeres',
      minEquipos: 4, maxEquipos: 8, inscritos: 0,
      inscripcion: 200000,
      premio: { tipo: 'dinero', escalas: [
        { min: 8, campeon: 800000, sub: 300000 },
        { min: 6, campeon: 550000, sub: 200000 },
        { min: 4, campeon: 350000, sub: 150000 }
      ] },
      partido: '1 set a 25 · semis y final a 3 sets'
    }
  ],

  calendario: [
    {
      id: 'semana', etiqueta: 'Mié 9 · Jue 10 · Vie 11', titulo: 'Noches de adultos', horario: '6:00 – 8:30 pm',
      canchas: [
        { nombre: 'Cancha de fútbol 5', items: [
          { hora: '6:00 pm', texto: 'Libre · fase de grupos', detalle: 'Partidos a las 6:00, 6:35, 7:10 y 7:45. Mié fecha 1, jue fecha 2, vie fecha 3.' }
        ] },
        { nombre: 'Polideportiva', items: [
          { hora: '6:00 pm', texto: 'Vóley mixto · fase de grupos', detalle: 'Partidos a las 6:00, 6:30, 7:00 y 7:30.' }
        ] }
      ]
    },
    {
      id: 'sabado', etiqueta: 'Sábado 12', titulo: 'Día de niños y juveniles', horario: '8:00 am – 8:40 pm',
      canchas: [
        { nombre: 'Cancha de fútbol 5', items: [
          { hora: '8:00 am', texto: 'Juvenil · fase de grupos', detalle: '12 partidos, cada equipo juega 3.' },
          { hora: '3:15 pm', texto: 'Semifinales Juvenil' },
          { hora: '4:30 pm', texto: 'Semifinales Libre' }
        ] },
        { nombre: 'Polideportiva', items: [
          { hora: '8:00 am', texto: 'Mini · fase de grupos', detalle: '12 partidos.' },
          { hora: '1:00 pm', texto: 'Pre · fase de grupos', detalle: '12 partidos.' },
          { hora: '7:00 pm', texto: 'Semifinales Vóley' }
        ] }
      ]
    },
    {
      id: 'domingo', etiqueta: 'Domingo 13', titulo: 'Gran Final Navideña', horario: 'Desde la 1:00 pm',
      canchas: [
        { nombre: 'Polideportiva', items: [
          { hora: '1:00 pm', texto: 'Mini · semis, 3er puesto y final', detalle: 'Semis 1:00 y 1:25 · 3er puesto 1:50 · final 2:15' },
          { hora: '2:45 pm', texto: 'Pre · semis, 3er puesto y final', detalle: 'Semis 2:45 y 3:15 · 3er puesto 3:45 · final 4:15' },
          { hora: '4:50 pm', texto: 'Vóley · 3er puesto' },
          { hora: '5:20 pm', texto: 'Final de Vóley', final: true }
        ] },
        { nombre: 'Cancha de fútbol 5', items: [
          { hora: '1:00 pm', texto: 'Juvenil · 3er puesto' },
          { hora: '1:40 pm', texto: 'Final Juvenil', final: true },
          { hora: '4:30 pm', texto: 'Libre · 3er puesto' },
          { hora: '6:15 pm', texto: 'Final Libre', final: true, detalle: 'Cierre deportivo' }
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
    { titulo: 'Fútbol · Libre y Juvenil', items: [
      'Solo zapatillas, no guayos.',
      'Tarjeta azul: 3 minutos fuera, no acumulable. Aplica también a la hinchada.',
      'Tarjeta roja: 4 minutos fuera o hasta que haya gol.',
      'Puntos en grupos: ganado 3, empate 1, perdido 0.',
      'Desempate: diferencia de gol, goles a favor y resultado entre ellos.',
      'Empate en eliminatoria: 3 penales por equipo; si sigue, muerte súbita.'
    ] },
    { titulo: 'Niños · Mini y Pre', items: [
      'Sin tarjeta azul: se hace cambio y charla.',
      'Todos los niños juegan mínimo un tiempo.',
      'Un adulto responsable por equipo.'
    ] },
    { titulo: 'Vóley mixto', items: [
      '6 en cancha, mínimo 3 mujeres en todo momento.',
      'Grupos y 3er puesto: 1 set a 25.',
      'Semifinales y final: mejor de 3 sets (25, 25, 15).'
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
    { p: '¿Por qué los niños juegan solo el fin de semana?', r: 'Para que los papás no tengan que llevarlos entre semana. El domingo se juega solo desde la 1:00 pm, después de los cultos.' },
    { p: '¿Puedo agregar jugadores después?', r: 'No. Las plantillas se cierran el 6 de diciembre.' }
  ]
};
