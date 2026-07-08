const STORAGE_KEY = "calculadora-concursos-v1";
const DATA_VERSION = 32;

const TEACHING_APPOINTMENT_ORIGINS = [
  { id: "ege_ge", nombre: "EGE Genética y Evolución", factor: 1 },
  { id: "ege_ecologia", nombre: "EGE Ecología", factor: 0.875 },
  { id: "departamentos_biologia", nombre: "Departamentos de Biología", factor: 0.75 },
  { id: "otros_departamentos_fcen", nombre: "Otros departamentos de FCEyN", factor: 0.625 }
];

const TEACHING_ORIGIN_ITEM_IDS = new Set([
  "jtp_regular",
  "jtp_interino",
  "ay1_regular",
  "ay1_interino"
]);

function teachingOriginScores(baseScore) {
  return Object.fromEntries(TEACHING_APPOINTMENT_ORIGINS.map((origin) => [
    origin.id,
    baseScore * origin.factor
  ]));
}

const PUBLICATION_AUTHOR_POSITIONS = [
  { id: "primero_ultimo", nombre: "Primero o último autor" },
  { id: "segundo", nombre: "Segundo autor" },
  { id: "tercero_cuarto", nombre: "3.º o 4.º en trabajos de hasta 5 autores" },
  { id: "mas_cinco", nombre: "Más de 5 autores" }
];

const SINGLE_SCORE_PUBLICATION_GROUP_IDS = new Set(["sin_indice", "com_corta_sin_indice", "enviado"]);

const SCIENTIFIC_PUBLICATION_GROUPS = [
  { id: "q1", nombre: "Publicación Q1", puntos: [2, 1.4, 0.7, 0.35] },
  { id: "q2", nombre: "Publicación Q2", puntos: [1.5, 1.05, 0.525, 0.2625] },
  { id: "q3_q4", nombre: "Publicación Q3-Q4", puntos: [1, 0.7, 0.35, 0.175] },
  { id: "sin_indice", nombre: "Publicación sin índice", puntos: [0.3, 0.21, 0.105, 0.0525] },
  { id: "com_corta_q1", nombre: "Comunicación corta Q1", puntos: [1, 0.7, 0.35, 0.175] },
  { id: "com_corta_q2", nombre: "Comunicación corta Q2", puntos: [0.75, 0.525, 0.2625, 0.13125] },
  { id: "com_corta_q3_q4", nombre: "Comunicación corta Q3-Q4", puntos: [0.5, 0.35, 0.175, 0.0875] },
  { id: "com_corta_sin_indice", nombre: "Comunicación corta sin índice", puntos: [0.2, 0.14, 0.07, 0.035] },
  { id: "enviado", nombre: "Trabajo enviado, aún no aceptado", puntos: [0.05, 0.035, 0.0175, 0.00875] },
  { id: "libro_extranjero", nombre: "Libro extranjero", puntos: [4, 2.8, 1.4, 0.7] },
  { id: "libro_nacional", nombre: "Libro nacional", puntos: [2, 1.4, 0.7, 0.35] },
  { id: "capitulo_extranjero", nombre: "Capítulo de libro extranjero", puntos: [1, 0.7, 0.35, 0.175] },
  { id: "capitulo_nacional", nombre: "Capítulo de libro nacional", puntos: [0.5, 0.35, 0.175, 0.0875] },
  { id: "editor_libro", nombre: "Editor de libro", puntos: [2, 1.4, 0.7, 0.35] }
];

function scientificPublicationSubitemsForGroup(grupo) {
  if (SINGLE_SCORE_PUBLICATION_GROUP_IDS.has(grupo.id)) {
    return [{
      id: `pub_${grupo.id}_unica`,
      nombre: grupo.nombre,
      puntos: grupo.puntos[0],
      grupoId: grupo.id,
      grupoNombre: grupo.nombre,
      posicionId: "unica",
      posicionNombre: "Cantidad",
      puntajeUnico: true
    }];
  }
  return PUBLICATION_AUTHOR_POSITIONS.map((posicion, index) => ({
    id: `pub_${grupo.id}_${posicion.id}`,
    nombre: `${grupo.nombre} — ${posicion.nombre}`,
    puntos: grupo.puntos[index],
    grupoId: grupo.id,
    grupoNombre: grupo.nombre,
    posicionId: posicion.id,
    posicionNombre: posicion.nombre
  }));
}

const SCIENTIFIC_PUBLICATION_SUBITEMS = SCIENTIFIC_PUBLICATION_GROUPS.flatMap(scientificPublicationSubitemsForGroup);

document.documentElement.dataset.spreadsheetReader = typeof XLSX === "undefined" ? "missing" : "ready";

const initialState = {
  dataVersion: DATA_VERSION,
  administrativeDetails: "",
  contestStartDate: "",
  contestEndDate: "",
  evaluatorLocks: {},
  scoreConfigurationLocks: {
    postulantes: true,
    puntajes: true,
    oposicion: true,
    docentes: true,
    cientificos: true,
    extension: true,
    profesionales: true,
    otros: true
  },
  rubros: [
    { id: "docentes", nombre: "Antecedentes docentes", simpleMin: 15, simpleMax: 30, simple: 23.5, exclusivaMin: 12.5, exclusivaMax: 25, exclusiva: 21 },
    { id: "cientificos", nombre: "Antecedentes científicos", simpleMin: 12.5, simpleMax: 25, simple: 17, exclusivaMin: 25, exclusivaMax: 50, exclusiva: 33 },
    { id: "extension", nombre: "Antecedentes de extensión", simpleMin: 5, simpleMax: 10, simple: 7.5, exclusivaMin: 7.5, exclusivaMax: 15, exclusiva: 7.5 },
    { id: "profesionales", nombre: "Antecedentes profesionales", simpleMin: 12.5, simpleMax: 25, simple: 17, exclusivaMin: 7.5, exclusivaMax: 15, exclusiva: 7.5 },
    { id: "otros", nombre: "Otros: calificaciones, títulos, estudios y otros antecedentes", simpleMin: 5, simpleMax: 10, simple: 5, exclusivaMin: 5, exclusivaMax: 10, exclusiva: 5 },
    { id: "oposicion", nombre: "Pruebas de oposición", simpleMin: 25, simpleMax: 50, simple: 27, exclusivaMin: 20, exclusivaMax: 40, exclusiva: 25 }
  ],
  postulantes: [
    { id: "postulante_1", numero: 1, apellidos: "Apellido 1", nombres: "Nombre 1", simple: true, exclusiva: true, dege: false, otroDepto: false, licencia: false },
    { id: "postulante_2", numero: 2, apellidos: "Apellido 2", nombres: "Nombre 2", simple: true, exclusiva: true, dege: false, otroDepto: false, licencia: false },
    { id: "postulante_3", numero: 3, apellidos: "Apellido 3", nombres: "Nombre 3", simple: true, exclusiva: false, dege: false, otroDepto: false, licencia: false },
    { id: "postulante_4", numero: 4, apellidos: "Apellido 4", nombres: "Nombre 4", simple: true, exclusiva: true, dege: false, otroDepto: false, licencia: false },
    { id: "postulante_5", numero: 5, apellidos: "Apellido 5", nombres: "Nombre 5", simple: true, exclusiva: false, dege: false, otroDepto: false, licencia: false },
    { id: "postulante_6", numero: 6, apellidos: "Apellido 6", nombres: "Nombre 6", simple: true, exclusiva: true, dege: false, otroDepto: false, licencia: false }
  ],
  oposicion: {
    criterios: [
      { id: "organizacion", nombre: "Organización, Factibilidad y Originalidad del TP", peso: 1 },
      { id: "claridad", nombre: "Claridad de la exposición y respuestas", peso: 1 },
      { id: "respuestas", nombre: "Idoneidad / Solidez en la exposición", peso: 0.8 },
      { id: "material", nombre: "Uso del material didáctico", peso: 0.7 },
      { id: "tiempo", nombre: "Distribución y uso del tiempo", peso: 0.5 }
    ],
    evaluadores: [
      { id: "eval_1", nombre: "Evaluador 1", color: "#d8a21b", evaluaciones: {}, anotaciones: "" },
      { id: "eval_2", nombre: "Evaluador 2", color: "#2d7fb8", evaluaciones: {}, anotaciones: "" },
      { id: "eval_3", nombre: "Evaluador 3", color: "#5b9b52", evaluaciones: {}, anotaciones: "" }
    ]
  },
  antecedentesDocentes: {
    modalidad: "unica",
    participacion: {},
    cargasEvaluadores: {},
    anotaciones: {},
    factorDege: 0.9,
    factorOtroDepto: 0.8,
    tipos: [
      {
        id: "cargo",
        nombre: "Tipo de cargo, naturaleza de la designación y antigüedad",
        maxSimple: 19.5,
        modo: "cantidad",
        subitems: [
          { id: "jtp_regular", nombre: "JTP regular por año", puntos: 2, puntajesOrigen: teachingOriginScores(2) },
          { id: "jtp_interino", nombre: "JTP interino por año", puntos: 1.5, puntajesOrigen: teachingOriginScores(1.5) },
          { id: "ay1_regular", nombre: "Ayte. 1ra regular por año", puntos: 1.2, puntajesOrigen: teachingOriginScores(1.2) },
          { id: "ay1_interino", nombre: "Ayte. 1ra interino por año", puntos: 0.85, puntajesOrigen: teachingOriginScores(0.85) },
          { id: "ay2_regular", nombre: "Ayudante de segunda regular FCEyN por año", puntos: 0.5 },
          { id: "un_jtp", nombre: "Universidades nacionales: JTP por cargo y año", puntos: 1 },
          { id: "un_primera", nombre: "Universidades nacionales: primera por cargo y año", puntos: 0.6 },
          { id: "un_segunda", nombre: "Universidades nacionales: segunda por cargo y año", puntos: 0.25 },
          { id: "cbc_auxiliar", nombre: "CBC auxiliar por cargo y año", puntos: 0.5 },
          { id: "privada_invitado", nombre: "Universidad privada o docente invitado en otras universidades por cargo y año", puntos: 0.2 },
          { id: "otros_niveles", nombre: "Terciario, secundario, tutores o consejeros", puntos: 0.2 }
        ]
      },
      {
        id: "eadis",
        nombre: "EADIS (promedio de los últimos 5)",
        maxSimple: 2.5,
        modo: "eadis",
        subitems: [
          { id: "eadis_alto", nombre: "Mayor o igual a 4,5", puntos: 2.5, min: 4.5 },
          { id: "eadis_medio", nombre: "Entre 4,49 y 3,5", puntos: 1.5, min: 3.5 },
          { id: "eadis_bajo", nombre: "Entre 3,49 y 3", puntos: 1, min: 3 }
        ]
      },
      {
        id: "cursos",
        nombre: "Cursos de perfeccionamiento docente",
        maxSimple: 2,
        modo: "cantidad",
        subitems: [
          { id: "materia_96", nombre: "Materia (más de 96 hs)", puntos: 0.15 },
          { id: "curso_50_95", nombre: "Curso (entre 50 y 95 hs)", puntos: 0.07 },
          { id: "cursillo_20_50", nombre: "Cursillo (entre 20 y 50 hs)", puntos: 0.03 }
        ]
      },
      {
        id: "otros",
        nombre: "Otros",
        maxSimple: 1,
        modo: "cantidad",
        subitems: [
          { id: "posgrado_diferente", nombre: "Participación en cursos de posgrado diferentes", puntos: 0.2 },
          { id: "materias_area", nombre: "Desempeño de cargos en materias diferentes del área", puntos: 0.3 }
        ]
      }
    ],
    cargas: {}
  },
  antecedentesCientificos: {
    modalidad: "unica",
    participacion: {},
    cargasEvaluadores: {},
    anotaciones: {},
    tipos: [
      {
        id: "publicaciones",
        nombre: "Publicaciones publicadas, en prensa o aceptadas",
        maxInterno: 20,
        instruccion: "Seleccione un tipo para cargar cantidades; algunos rubros usan posición de autoría y otros puntaje único.",
        subitems: SCIENTIFIC_PUBLICATION_SUBITEMS
      },
      {
        id: "congresos",
        nombre: "Congresos",
        maxInterno: 5,
        instruccion: "Ingrese la cantidad de presentaciones según tipo y autoría.",
        subitems: [
          { id: "cong_plenaria_primero", nombre: "Conferencia plenaria invitada — primero", puntos: 0.75 },
          { id: "cong_plenaria_resto", nombre: "Conferencia plenaria invitada — resto", puntos: 0 },
          { id: "cong_ordinaria_primero", nombre: "Conferencia ordinaria o simposio — primero", puntos: 0.6 },
          { id: "cong_ordinaria_resto", nombre: "Conferencia ordinaria o simposio — resto", puntos: 0.3 },
          { id: "cong_actas_internacional_primero", nombre: "Trabajo completo en actas de congreso internacional — primero", puntos: 0.5 },
          { id: "cong_actas_internacional_resto", nombre: "Trabajo completo en actas de congreso internacional — resto", puntos: 0.25 },
          { id: "cong_actas_nacional_primero", nombre: "Trabajo completo en actas de congreso nacional — primero", puntos: 0.4 },
          { id: "cong_actas_nacional_resto", nombre: "Trabajo completo en actas de congreso nacional — resto", puntos: 0.2 },
          { id: "cong_resumen_internacional_primero", nombre: "Resumen internacional — primero", puntos: 0.1 },
          { id: "cong_resumen_internacional_resto", nombre: "Resumen internacional — resto", puntos: 0.05 },
          { id: "cong_resumen_nacional_primero", nombre: "Resumen nacional — primero", puntos: 0.05 },
          { id: "cong_resumen_nacional_resto", nombre: "Resumen nacional — resto", puntos: 0.025 }
        ]
      },
      {
        id: "cursos_cientificos",
        nombre: "Cursos de especialización fuera del doctorado",
        maxInterno: 2,
        instruccion: "Ingrese la cantidad de cursos o seminarios realizados.",
        subitems: [
          { id: "cien_curso_internacional_100", nombre: "Curso internacional de más de 100 horas", puntos: 1 },
          { id: "cien_curso_nacional_100", nombre: "Curso nacional con examen de más de 100 horas", puntos: 0.5 },
          { id: "cien_curso_examen_menos_100", nombre: "Curso con examen de menos de 100 horas", puntos: 0.25 },
          { id: "cien_seminario_40", nombre: "Seminario de más de 40 horas", puntos: 0.1 },
          { id: "cien_seminario_20_40", nombre: "Seminario de 20 a 40 horas", puntos: 0.05 }
        ]
      },
      {
        id: "rrhh",
        nombre: "Formación de recursos humanos",
        maxInterno: 3,
        instruccion: "Ingrese la cantidad de direcciones, codirecciones o asistencias.",
        subitems: [
          { id: "rrhh_dir_tesis_def", nombre: "Director o codirector — tesis defendida", puntos: 1 },
          { id: "rrhh_dir_tesis_curso", nombre: "Director o codirector — tesis en curso", puntos: 0.5 },
          { id: "rrhh_dir_tesina_def", nombre: "Director o codirector — tesina defendida", puntos: 0.35 },
          { id: "rrhh_dir_tesina_curso", nombre: "Director o codirector — tesina en curso", puntos: 0.1 },
          { id: "rrhh_dir_beca", nombre: "Director o codirector — beca doctoral o de investigador", puntos: 0.3 },
          { id: "rrhh_dir_pasante", nombre: "Director o codirector — pasante o beca estímulo", puntos: 0.1 },
          { id: "rrhh_dir_ad_honorem", nombre: "Director o codirector — pasante ad honorem", puntos: 0.05 },
          { id: "rrhh_asist_tesis_def", nombre: "Director asistente o adjunto — tesis defendida", puntos: 0.7 },
          { id: "rrhh_asist_tesis_curso", nombre: "Director asistente o adjunto — tesis en curso", puntos: 0.2 },
          { id: "rrhh_asist_tesina_def", nombre: "Director asistente o adjunto — tesina defendida", puntos: 0.15 },
          { id: "rrhh_asist_tesina_curso", nombre: "Director asistente o adjunto — tesina en curso", puntos: 0.05 },
          { id: "rrhh_asist_beca", nombre: "Director asistente o adjunto — beca doctoral o de investigador", puntos: 0.15 },
          { id: "rrhh_asist_pasante", nombre: "Director asistente o adjunto — pasante o beca estímulo", puntos: 0.05 },
          { id: "rrhh_asist_ad_honorem", nombre: "Director asistente o adjunto — pasante ad honorem", puntos: 0.025 }
        ]
      },
      {
        id: "proyectos",
        nombre: "Proyectos ganados y subsidiados",
        maxInterno: 3,
        instruccion: "Ingrese la cantidad de proyectos según función desempeñada.",
        subitems: [
          { id: "proy_ganado_dir", nombre: "Proyecto ganado y subsidiado — director", puntos: 1 },
          { id: "proy_ganado_codir", nombre: "Proyecto ganado y subsidiado — codirector", puntos: 0.5 },
          { id: "proy_ganado_part", nombre: "Proyecto ganado y subsidiado — participante doctor o becario", puntos: 0.2 }
        ]
      }
    ],
    cargas: {}
  },
  antecedentesExtension: {
    modalidad: "unica",
    participacion: {},
    cargasEvaluadores: {},
    anotaciones: {},
    tipos: [
      {
        id: "proyectos_extension",
        nombre: "Proyectos de extensión",
        maxInterno: 5,
        instruccion: "Ingrese la cantidad de proyectos según el tipo de participación.",
        subitems: [
          { id: "ext_director_universidad_nacional", nombre: "Director de proyecto de extensión en universidad nacional", puntos: 1 },
          { id: "ext_participante_proyecto", nombre: "Participante de proyecto de extensión", puntos: 0.3 },
          { id: "ext_director_otras_universidades", nombre: "Director de proyecto en otras universidades", puntos: 0.8 },
          { id: "ext_participante_otros_marcos", nombre: "Participante en otros marcos y universidades", puntos: 0.2 }
        ]
      },
      {
        id: "divulgacion_cientifica",
        nombre: "Divulgación científica",
        maxInterno: 0.5,
        instruccion: "Ingrese la cantidad de actividades de divulgación realizadas.",
        subitems: [
          { id: "ext_semana_ciencias", nombre: "Semana de las Ciencias — participante", puntos: 0.08 },
          { id: "ext_articulacion_niveles", nombre: "Articulación con otros niveles educativos, charlas, dirección de pasantes o talleres", puntos: 0.15 }
        ]
      },
      {
        id: "publicaciones_divulgacion",
        nombre: "Publicaciones de divulgación",
        maxInterno: 3,
        instruccion: "Ingrese la cantidad de publicaciones o actividades correspondientes.",
        subitems: [
          { id: "ext_libros_cuadernillos", nombre: "Libros y cuadernillos", puntos: 1.5, modo: "libros_cuadernillos", cuadernilloFactor: 0.33 },
          { id: "ext_articulos_capitulos", nombre: "Artículos o capítulos de libros", puntos: 0.15 },
          { id: "ext_entrevistas_articulacion", nombre: "Articulación con otros niveles educativos o entrevistas", puntos: 0.08 },
          { id: "ext_congresos_organizacion", nombre: "Presentaciones en congresos y organización", puntos: 0.3, modo: "organizacion_congreso", congresoFactor: 0.33 },
          { id: "ext_otros", nombre: "Otros antecedentes de extensión", puntos: 0.2 },
          { id: "ext_covid", nombre: "Extensión COVID", puntos: 0.75 }
        ]
      }
    ],
    cargas: {}
  },
  antecedentesProfesionales: {
    modalidad: "unica",
    participacion: {},
    cargasEvaluadores: {},
    anotaciones: {},
    tipos: [
      {
        id: "cargo_profesional",
        nombre: "Cargo técnico profesional o trabajo en empresas",
        maxInterno: 5,
        instruccion: "Ingrese la cantidad de antecedentes según duración o función profesional.",
        subitems: [
          { id: "prof_tres_anos_editor", nombre: "Editor asociado (3 años o más)", puntos: 2.5 },
          { id: "prof_menos_tres_editorial", nombre: "Editor asociado (menos de 3 años)", puntos: 1.5 },
          { id: "prof_editor_invitado", nombre: "Editor invitado", puntos: 0.33 }
        ]
      },
      {
        id: "convenios_oat_stan",
        nombre: "Convenios, OAT y STAN",
        maxInterno: 7,
        instruccion: "Ingrese la cantidad de servicios, asesorías o convenios realizados.",
        subitems: [
          { id: "prof_oat_stan", nombre: "Director OAT/STAN", puntos: 1.5 },
          { id: "prof_asesoramiento", nombre: "Asesoramiento", puntos: 0.75 },
          { id: "prof_convenios", nombre: "Convenios", puntos: 2 },
          { id: "prof_extension_covid", nombre: "Extensión COVID", puntos: 1 }
        ]
      },
      {
        id: "otros_profesionales",
        nombre: "Otros antecedentes profesionales",
        maxInterno: 5,
        instruccion: "Ingrese la cantidad de antecedentes correspondientes, considerando su jerarquía y campo de aplicación.",
        subitems: [
          { id: "prof_organizacion_congresos", nombre: "Organización y colaboración en congresos o reuniones", puntos: 1, modo: "organizacion_congreso", colaboracionFactor: 0.33 },
          { id: "prof_guia", nombre: "Guía en museos, Tecnópolis u otras instituciones", puntos: 0.5 },
          { id: "prof_pasantias_rentadas", nombre: "Pasantías rentadas", puntos: 0.5 },
          { id: "prof_entrenamiento_no_rentado", nombre: "Entrenamiento de laboratorio no rentado (al menos un mes)", puntos: 0.3 },
          { id: "prof_otros", nombre: "Otros: comité de ética, mesas de enlace o ministerios", puntos: 1 }
        ]
      }
    ],
    cargas: {}
  },
  otrosAntecedentes: {
    modalidad: "unica",
    participacion: {},
    cargasEvaluadores: {},
    anotaciones: {},
    maxInternoTotal: 5,
    tipos: [
      {
        id: "titulos_posgrado",
        nombre: "Títulos de posgrado",
        maxInterno: 2,
        instruccion: "Ingrese la cantidad de títulos o situaciones académicas correspondientes.",
        subitems: [
          { id: "otros_maestria_grado", nombre: "Maestría u otros títulos de grado", puntos: 1 },
          { id: "otros_doctor", nombre: "Doctorado", puntos: 1.5 },
          { id: "otros_especialidad_curso", nombre: "Especialidad o doctorado en curso", puntos: 0.5 },
          { id: "otros_profesor_universitario", nombre: "Profesor universitario", puntos: 1 }
        ]
      },
      {
        id: "calificaciones",
        nombre: "Calificaciones",
        maxInterno: 0.05,
        instruccion: "Este antecedente admite un único valor: 1 si el promedio es mayor a 8; 0 en caso contrario.",
        subitems: [
          { id: "otros_promedio_mayor_ocho", nombre: "Promedio mayor a 8", puntos: 0.05, maxCantidad: 1 }
        ]
      },
      {
        id: "gestion",
        nombre: "Gestión",
        maxInterno: 2,
        instruccion: "Ingrese la cantidad de períodos o participaciones en órganos de gestión.",
        subitems: [
          { id: "otros_comision_departamental", nombre: "Comisión departamental o coordinación de área", puntos: 0.25 },
          { id: "otros_comision_fcen", nombre: "Comisión FCEyN, doctorado, carrera o CONICET", puntos: 1 },
          { id: "otros_codep", nombre: "Miembro de CODEP por período", puntos: 0.5 }
        ]
      },
      {
        id: "cargo_investigador",
        nombre: "Cargo de investigador",
        maxInterno: 1,
        instruccion: "Este antecedente admite 1 o 0.",
        subitems: [
          { id: "otros_cargo_investigador", nombre: "Cargo de investigador CONICET, CIC o INTA", puntos: 1, maxCantidad: 1 }
        ]
      },
      {
        id: "becas",
        nombre: "Becas",
        maxInterno: 0.3,
        instruccion: "Ingrese la cantidad de becas correspondientes.",
        subitems: [
          { id: "otros_beca_doctoral", nombre: "Beca doctoral CONICET, CIC o UBA", puntos: 0.2 },
          { id: "otros_beca_extranjera", nombre: "Beca extranjera", puntos: 0.2 },
          { id: "otros_beca_nacional", nombre: "Otra beca nacional", puntos: 0.1 },
          { id: "otros_beca_posdoctoral", nombre: "Beca posdoctoral CONICET", puntos: 0.3 }
        ]
      },
      {
        id: "premios",
        nombre: "Premios",
        maxInterno: 0.5,
        instruccion: "Ingrese la cantidad de premios obtenidos.",
        subitems: [
          { id: "otros_premio_nacional", nombre: "Premio nacional", puntos: 0.25 },
          { id: "otros_premio_internacional", nombre: "Premio internacional", puntos: 0.5 }
        ]
      },
      {
        id: "otras_formaciones",
        nombre: "Otras formaciones",
        maxInterno: 1,
        instruccion: "Ingrese la cantidad de antecedentes adicionales.",
        subitems: [
          { id: "otros_carrera_finalizada", nombre: "Otra carrera de grado finalizada", puntos: 1 },
          { id: "otros_carrera_no_finalizada", nombre: "Otra carrera no finalizada", puntos: 0.05 },
          { id: "otros_entrenamiento_previo", nombre: "Entrenamiento previo a la licenciatura", puntos: 0.02 },
          { id: "otros_idiomas", nombre: "Idiomas", puntos: 0.02 }
        ]
      },
      {
        id: "evaluaciones",
        nombre: "Evaluaciones",
        maxInterno: 1,
        instruccion: "Ingrese la cantidad de evaluaciones o participaciones como jurado.",
        subitems: [
          { id: "otros_tesis_grado_jurado", nombre: "Tesis de grado, jurado de concursos o seguimiento", puntos: 0.1 },
          { id: "otros_tesis_posgrado", nombre: "Tesis de posgrado", puntos: 0.2 }
        ]
      }
    ],
    cargas: {}
  }
};

let state = loadState();
let oppositionView = "evaluations";
let activeEvaluatorId = state.oposicion.evaluadores[0]?.id || null;
let docentesView = "entry";
let cientificosView = "entry";
let extensionView = "entry";
let profesionalesView = "entry";
let otrosView = "entry";
let activeDocentesCargaId = "consolidada";
let activeCientificosCargaId = "consolidada";
let activeExtensionCargaId = "consolidada";
let activeProfesionalesCargaId = "consolidada";
let activeOtrosCargaId = "consolidada";
let resultsCargo = "simple";
let meritCargo = "simple";
let localSaveTimer = null;
let derivedViewsTimer = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function singleScorePublicationId(groupId) {
  return `pub_${groupId}_unica`;
}

function normalizeSingleScorePublicationGroups(scientificModule) {
  const publicationType = scientificModule?.tipos?.find((tipo) => tipo.id === "publicaciones");
  if (!publicationType?.subitems) return;

  SINGLE_SCORE_PUBLICATION_GROUP_IDS.forEach((groupId) => {
    const groupSubitems = publicationType.subitems.filter((subitem) => subitem.grupoId === groupId);
    if (!groupSubitems.length) return;

    const defaultGroup = SCIENTIFIC_PUBLICATION_GROUPS.find((group) => group.id === groupId);
    const singleId = singleScorePublicationId(groupId);
    const singleSubitem = groupSubitems.find((subitem) => subitem.id === singleId);
    const groupName = singleSubitem?.grupoNombre || groupSubitems[0]?.grupoNombre || defaultGroup?.nombre || groupSubitems[0]?.nombre || "Publicación";
    const points = Number(singleSubitem?.puntos ?? groupSubitems[0]?.puntos ?? defaultGroup?.puntos?.[0] ?? 0);
    const oldIds = groupSubitems.map((subitem) => subitem.id);
    const replacement = {
      id: singleId,
      nombre: groupName,
      puntos: points,
      grupoId: groupId,
      grupoNombre: groupName,
      posicionId: "unica",
      posicionNombre: "Cantidad",
      puntajeUnico: true
    };

    let inserted = false;
    publicationType.subitems = publicationType.subitems.flatMap((subitem) => {
      if (subitem.grupoId !== groupId) return [subitem];
      if (inserted) return [];
      inserted = true;
      return [replacement];
    });

    [scientificModule.cargas, ...Object.values(scientificModule.cargasEvaluadores || {})].forEach((cargas) => {
      Object.values(cargas || {}).forEach((carga) => {
        carga.valores ||= {};
        const oldTotal = oldIds
          .filter((id) => id !== singleId)
          .reduce((sum, id) => sum + Number(carga.valores[id] || 0), 0);
        const current = Number(carga.valores[singleId] || 0);
        if (oldTotal || current) carga.valores[singleId] = oldTotal + current;
        oldIds.filter((id) => id !== singleId).forEach((id) => delete carga.valores[id]);
      });
    });
  });
}

window.normalizeSingleScorePublicationGroups = normalizeSingleScorePublicationGroups;

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return seedEvaluations(clone(initialState));
  try {
    return seedEvaluations(migrateState(JSON.parse(saved)));
  } catch {
    return seedEvaluations(clone(initialState));
  }
}

function migrateState(savedState) {
  if ((savedState.dataVersion || 1) < 2) {
    const oldIds = savedState.postulantes.map((postulante) => postulante.id);
    savedState.postulantes.forEach((postulante, index) => {
      postulante.id = `postulante_${index + 1}`;
      postulante.apellidos = `Apellido ${index + 1}`;
      postulante.nombres = `Nombre ${index + 1}`;
    });
    savedState.oposicion.evaluadores.forEach((evaluador) => {
      const migrated = {};
      savedState.postulantes.forEach((postulante, index) => {
        migrated[postulante.id] = evaluador.evaluaciones[oldIds[index]];
      });
      evaluador.evaluaciones = migrated;
    });
  }
  if ((savedState.dataVersion || 1) < 3) {
    const originalTypes = initialState.antecedentesDocentes.tipos;
    savedState.antecedentesDocentes ||= clone(initialState.antecedentesDocentes);
    originalTypes.forEach((originalType) => {
      const savedType = savedState.antecedentesDocentes.tipos.find((tipo) => tipo.id === originalType.id);
      if (!savedType) {
        savedState.antecedentesDocentes.tipos.push(clone(originalType));
        return;
      }
      originalType.subitems.forEach((originalItem) => {
        if (!savedType.subitems.some((item) => item.id === originalItem.id)) {
          savedType.subitems.push(clone(originalItem));
        }
      });
    });
  }
  if ((savedState.dataVersion || 1) < 4) {
    initialState.oposicion.criterios.forEach((originalCriterion) => {
      if (!savedState.oposicion.criterios.some((criterio) => criterio.id === originalCriterion.id)) {
        savedState.oposicion.criterios.push(clone(originalCriterion));
      }
    });
  }
  if ((savedState.dataVersion || 1) < 5) {
    savedState.antecedentesCientificos = clone(initialState.antecedentesCientificos);
  }
  if ((savedState.dataVersion || 1) < 6) {
    savedState.antecedentesCientificos ||= clone(initialState.antecedentesCientificos);
    initialState.antecedentesCientificos.tipos.forEach((originalType) => {
      const savedType = savedState.antecedentesCientificos.tipos.find((tipo) => tipo.id === originalType.id);
      if (!savedType) return;
      savedType.maxInterno = roundToThree(savedType.maxInterno);
      savedType.subitems.forEach((savedItem) => {
        const originalItem = originalType.subitems.find((item) => item.id === savedItem.id);
        savedItem.puntos = roundToThree(savedItem.puntos);
        if (originalItem && savedType.id === "publicaciones") savedItem.nombre = originalItem.nombre;
      });
    });
  }
  if ((savedState.dataVersion || 1) < 7) {
    savedState.postulantes.forEach((postulante) => {
      postulante.dege = Boolean(postulante.dege);
      postulante.otroDepto = Boolean(postulante.otroDepto);
    });
  }
  if ((savedState.dataVersion || 1) < 8) {
    savedState.antecedentesDocentes ||= clone(initialState.antecedentesDocentes);
    savedState.antecedentesDocentes.factorFueraEge = 0.9;
  }
  if ((savedState.dataVersion || 1) < 9) {
    savedState.antecedentesDocentes ||= clone(initialState.antecedentesDocentes);
    savedState.antecedentesDocentes.factorDege = initialState.antecedentesDocentes.factorDege;
    savedState.antecedentesDocentes.factorOtroDepto = initialState.antecedentesDocentes.factorOtroDepto;
    delete savedState.antecedentesDocentes.factorFueraEge;
  }
  if ((savedState.dataVersion || 1) < 10) {
    savedState.antecedentesDocentes ||= clone(initialState.antecedentesDocentes);
    savedState.antecedentesDocentes.factorDege = 0.9;
    savedState.antecedentesDocentes.factorOtroDepto = 0.8;
  }
  if ((savedState.dataVersion || 1) < 11) {
    const cargoType = savedState.antecedentesDocentes?.tipos?.find((tipo) => tipo.id === "cargo");
    const originalCargoType = initialState.antecedentesDocentes.tipos.find((tipo) => tipo.id === "cargo");
    cargoType?.subitems.forEach((savedItem) => {
      const originalItem = originalCargoType.subitems.find((item) => item.id === savedItem.id);
      if (originalItem && ["un_jtp", "un_primera", "un_segunda", "cbc_auxiliar", "privada_invitado"].includes(savedItem.id)) {
        savedItem.nombre = originalItem.nombre;
      }
    });
  }
  if ((savedState.dataVersion || 1) < 12) {
    ["antecedentesDocentes", "antecedentesCientificos"].forEach((key) => {
      savedState[key] ||= clone(initialState[key]);
      savedState[key].modalidad ||= "unica";
      savedState[key].participacion ||= {};
      savedState[key].cargasEvaluadores ||= {};
    });
  }
  if ((savedState.dataVersion || 1) < 13) {
    savedState.contestStartDate ||= "";
    savedState.contestEndDate ||= "";
  }
  if ((savedState.dataVersion || 1) < 14) {
    const colors = ["#d8a21b", "#2d7fb8", "#5b9b52", "#a05ca5", "#c65c46", "#3c9687"];
    savedState.oposicion.evaluadores.forEach((evaluador, index) => {
      evaluador.color ||= colors[index % colors.length];
    });
  }
  if ((savedState.dataVersion || 1) < 15) {
    savedState.antecedentesExtension = clone(initialState.antecedentesExtension);
  }
  if ((savedState.dataVersion || 1) < 16) {
    savedState.antecedentesProfesionales = clone(initialState.antecedentesProfesionales);
  }
  if ((savedState.dataVersion || 1) < 17) {
    savedState.otrosAntecedentes = clone(initialState.otrosAntecedentes);
  }
  if ((savedState.dataVersion || 1) < 18) {
    savedState.antecedentesCientificos ||= clone(initialState.antecedentesCientificos);
    savedState.antecedentesCientificos.tipos = clone(initialState.antecedentesCientificos.tipos);
    const rubroCientificos = savedState.rubros?.find((rubro) => rubro.id === "cientificos");
    if (rubroCientificos) {
      rubroCientificos.simple = 17;
      rubroCientificos.exclusiva = 33;
    }
  }
  if ((savedState.dataVersion || 1) < 19) {
    savedState.antecedentesDocentes ||= clone(initialState.antecedentesDocentes);
    const savedCargo = savedState.antecedentesDocentes.tipos?.find((tipo) => tipo.id === "cargo");
    const defaultCargo = initialState.antecedentesDocentes.tipos.find((tipo) => tipo.id === "cargo");
    defaultCargo.subitems.filter((subitem) => TEACHING_ORIGIN_ITEM_IDS.has(subitem.id)).forEach((defaultItem) => {
      const savedItem = savedCargo?.subitems.find((subitem) => subitem.id === defaultItem.id);
      if (!savedItem) return;
      savedItem.nombre = defaultItem.nombre;
      savedItem.puntos = defaultItem.puntos;
      savedItem.puntajesOrigen = clone(defaultItem.puntajesOrigen);
    });
  }
  if ((savedState.dataVersion || 1) < 20) {
    const savedCargo = savedState.antecedentesDocentes?.tipos?.find((tipo) => tipo.id === "cargo");
    const defaultCargo = initialState.antecedentesDocentes.tipos.find((tipo) => tipo.id === "cargo");
    defaultCargo.subitems.filter((subitem) => TEACHING_ORIGIN_ITEM_IDS.has(subitem.id)).forEach((defaultItem) => {
      const savedItem = savedCargo?.subitems.find((subitem) => subitem.id === defaultItem.id);
      if (savedItem) savedItem.nombre = defaultItem.nombre;
    });
  }
  if ((savedState.dataVersion || 1) < 22) {
    savedState.oposicion ||= clone(initialState.oposicion);
    savedState.oposicion.criterios = clone(initialState.oposicion.criterios);
  }
  if ((savedState.dataVersion || 1) < 23) {
    savedState.postulantes.forEach((postulante) => {
      postulante.licencia = Boolean(postulante.licencia);
    });
  }
  if ((savedState.dataVersion || 1) < 24) {
    normalizeSingleScorePublicationGroups(savedState.antecedentesCientificos);
  }
  savedState.dataVersion = DATA_VERSION;
  savedState.administrativeDetails ||= "";
  savedState.contestStartDate ||= "";
  savedState.contestEndDate ||= "";
  savedState.evaluatorLocks ||= {};
  savedState.antecedentesDocentes ||= clone(initialState.antecedentesDocentes);
  savedState.antecedentesDocentes.modalidad ||= "unica";
  savedState.antecedentesDocentes.participacion ||= {};
  savedState.antecedentesDocentes.cargasEvaluadores ||= {};
  savedState.antecedentesDocentes.anotaciones ||= {};
  savedState.antecedentesDocentes.factorDege ??= initialState.antecedentesDocentes.factorDege;
  savedState.antecedentesDocentes.factorOtroDepto ??= initialState.antecedentesDocentes.factorOtroDepto;
  const normalizedCargo = savedState.antecedentesDocentes.tipos?.find((tipo) => tipo.id === "cargo");
  const defaultCargo = initialState.antecedentesDocentes.tipos.find((tipo) => tipo.id === "cargo");
  defaultCargo.subitems.filter((subitem) => TEACHING_ORIGIN_ITEM_IDS.has(subitem.id)).forEach((defaultItem) => {
    const savedItem = normalizedCargo?.subitems.find((subitem) => subitem.id === defaultItem.id);
    if (savedItem) savedItem.puntajesOrigen ||= clone(defaultItem.puntajesOrigen);
  });
  savedState.antecedentesCientificos ||= clone(initialState.antecedentesCientificos);
  savedState.antecedentesCientificos.modalidad ||= "unica";
  savedState.antecedentesCientificos.participacion ||= {};
  savedState.antecedentesCientificos.cargasEvaluadores ||= {};
  savedState.antecedentesCientificos.anotaciones ||= {};
  normalizeSingleScorePublicationGroups(savedState.antecedentesCientificos);
  savedState.antecedentesExtension ||= clone(initialState.antecedentesExtension);
  savedState.antecedentesExtension.modalidad ||= "unica";
  savedState.antecedentesExtension.participacion ||= {};
  savedState.antecedentesExtension.cargasEvaluadores ||= {};
  savedState.antecedentesExtension.anotaciones ||= {};
  const extensionPublications = savedState.antecedentesExtension.tipos?.find((tipo) => tipo.id === "publicaciones_divulgacion");
  const extensionBooks = extensionPublications?.subitems?.find((item) => item.id === "ext_libros_cuadernillos");
  if (extensionBooks) {
    extensionBooks.nombre = "Libros y cuadernillos";
    extensionBooks.modo = "libros_cuadernillos";
    extensionBooks.cuadernilloFactor ??= 0.33;
    extensionBooks.puntos = Number(extensionBooks.puntos || 1.5) || 1.5;
  }
  const extensionCongress = extensionPublications?.subitems?.find((item) => item.id === "ext_congresos_organizacion");
  if (extensionCongress) {
    extensionCongress.nombre = "Presentaciones en congresos y organización";
    extensionCongress.modo = "organizacion_congreso";
    extensionCongress.congresoFactor ??= 0.33;
    extensionCongress.puntos = Number(extensionCongress.puntos || 0.3) || 0.3;
  }
  savedState.antecedentesProfesionales ||= clone(initialState.antecedentesProfesionales);
  savedState.antecedentesProfesionales.modalidad ||= "unica";
  savedState.antecedentesProfesionales.participacion ||= {};
  savedState.antecedentesProfesionales.cargasEvaluadores ||= {};
  savedState.antecedentesProfesionales.anotaciones ||= {};
  normalizeProfessionalCompositeItems(savedState.antecedentesProfesionales);
  savedState.otrosAntecedentes ||= clone(initialState.otrosAntecedentes);
  savedState.otrosAntecedentes.modalidad ||= "unica";
  savedState.otrosAntecedentes.participacion ||= {};
  savedState.otrosAntecedentes.cargasEvaluadores ||= {};
  savedState.otrosAntecedentes.anotaciones ||= {};
  savedState.otrosAntecedentes.maxInternoTotal ??= initialState.otrosAntecedentes.maxInternoTotal;
  savedState.scoreConfigurationLocks ||= {};
  Object.keys(initialState.scoreConfigurationLocks).forEach((key) => {
    savedState.scoreConfigurationLocks[key] ??= true;
  });
  savedState.postulantes.forEach((postulante) => {
    postulante.dege = Boolean(postulante.dege);
    postulante.otroDepto = Boolean(postulante.otroDepto);
    postulante.licencia = Boolean(postulante.licencia);
  });
  const evaluatorColors = ["#d8a21b", "#2d7fb8", "#5b9b52", "#a05ca5", "#c65c46", "#3c9687"];
  savedState.oposicion.evaluadores.forEach((evaluador, index) => {
    evaluador.color ||= evaluatorColors[index % evaluatorColors.length];
    evaluador.nombre = String(evaluador.nombre || "").trim() || `Evaluador ${index + 1}`;
    evaluador.anotaciones ||= "";
    savedState.evaluatorLocks[evaluador.id] = Boolean(savedState.evaluatorLocks[evaluador.id]);
  });
  delete savedState.postulantesSort;
  return savedState;
}

function persistLocalState() {
  clearTimeout(localSaveTimer);
  localSaveTimer = null;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveState() {
  clearTimeout(localSaveTimer);
  localSaveTimer = setTimeout(persistLocalState, 120);
  window.collaboration?.scheduleSave?.();
}

function scheduleDerivedViewsRender() {
  clearTimeout(derivedViewsTimer);
  derivedViewsTimer = setTimeout(() => {
    derivedViewsTimer = null;
    renderResultados();
    renderMerit();
  }, 80);
}

window.addEventListener("pagehide", persistLocalState);

const SCORE_CONFIGURATION_AREAS = {
  postulantes: "#postulantes",
  puntajes: "#config",
  oposicion: "#criteria-panel",
  docentes: "#docentes-config-panel",
  cientificos: "#cientificos-config-panel",
  extension: "#extension-config-panel",
  profesionales: "#profesionales-config-panel",
  otros: "#otros-config-panel"
};

function isScoreConfigurationLocked(key) {
  return state.scoreConfigurationLocks?.[key] !== false;
}

function applyScoreConfigurationLocks() {
  Object.entries(SCORE_CONFIGURATION_AREAS).forEach(([key, selector]) => {
    const panel = document.querySelector(selector);
    const locked = isScoreConfigurationLocked(key);
    panel?.classList.toggle("score-configuration-locked", locked);
    panel?.querySelectorAll("input, select, textarea, button:not([data-score-lock])").forEach((control) => {
      control.disabled = locked;
    });

    const button = document.querySelector(`[data-score-lock="${key}"]`);
    if (!button) return;
    button.textContent = locked ? "Habilitar edición" : "Bloquear edición";
    button.classList.toggle("primary-button", locked);
    button.classList.toggle("secondary-button", !locked);
    button.dataset.locked = String(locked);
    button.setAttribute("aria-pressed", String(!locked));
    button.title = locked
      ? "Permitir cambios en los criterios y puntajes de esta solapa"
      : "Evitar cambios accidentales en los criterios y puntajes de esta solapa";
  });
}

function toggleScoreConfigurationLock(key) {
  state.scoreConfigurationLocks[key] = !isScoreConfigurationLocked(key);
  saveState();
  applyScoreConfigurationLocks();
  window.collaboration?.applyPermissions?.();
}

window.isScoreConfigurationLocked = isScoreConfigurationLocked;

function seedEvaluations(nextState) {
  renumberPostulantes(nextState);
  nextState.oposicion.evaluadores.forEach((evaluador) => {
    nextState.postulantes.forEach((postulante, index) => {
      if (!evaluador.evaluaciones[postulante.id]) {
        evaluador.evaluaciones[postulante.id] = {
          fecha: "2025-05-05",
          tema: index === 0 ? "Tema 1" : "",
          comentarios: "",
          notas: {}
        };
      }
      nextState.oposicion.criterios.forEach((criterio) => {
        if (evaluador.evaluaciones[postulante.id].notas[criterio.id] === undefined) {
          evaluador.evaluaciones[postulante.id].notas[criterio.id] = "";
        }
      });
    });
  });
  seedDocentes(nextState);
  seedCientificos(nextState);
  seedExtension(nextState);
  seedProfesionales(nextState);
  seedOtros(nextState);
  return nextState;
}

function seedDocentes(nextState = state) {
  nextState.antecedentesDocentes ||= clone(initialState.antecedentesDocentes);
  const module = nextState.antecedentesDocentes;
  module.cargas ||= {};
  module.cargasEvaluadores ||= {};
  module.participacion ||= {};
  module.anotaciones ||= {};
  module.anotaciones.consolidada ||= "";
  nextState.oposicion.evaluadores.forEach((evaluador) => {
    module.participacion[evaluador.id] ??= true;
    module.cargasEvaluadores[evaluador.id] ||= {};
    module.anotaciones[evaluador.id] ||= "";
  });
  [module.cargas, ...Object.values(module.cargasEvaluadores)].forEach((cargas) => nextState.postulantes.forEach((postulante) => {
    cargas[postulante.id] ||= { valores: {} };
    const carga = cargas[postulante.id];
    carga.valores ||= {};
    module.tipos.forEach((tipo) => {
      if (tipo.modo === "eadis") {
        if (carga.valores[tipo.id] === undefined) carga.valores[tipo.id] = "";
        return;
      }
      tipo.subitems.forEach((subitem) => {
        if (TEACHING_ORIGIN_ITEM_IDS.has(subitem.id)) {
          TEACHING_APPOINTMENT_ORIGINS.forEach((origin) => {
            const fieldId = teachingOriginFieldId(subitem.id, origin.id);
            if (carga.valores[fieldId] === undefined) carga.valores[fieldId] = "";
          });
          return;
        }
        if (carga.valores[subitem.id] === undefined) carga.valores[subitem.id] = "";
      });
    });
  }));
}

function seedCientificos(nextState = state) {
  nextState.antecedentesCientificos ||= clone(initialState.antecedentesCientificos);
  const module = nextState.antecedentesCientificos;
  module.cargas ||= {};
  module.cargasEvaluadores ||= {};
  module.participacion ||= {};
  module.anotaciones ||= {};
  module.anotaciones.consolidada ||= "";
  nextState.oposicion.evaluadores.forEach((evaluador) => {
    module.participacion[evaluador.id] ??= true;
    module.cargasEvaluadores[evaluador.id] ||= {};
    module.anotaciones[evaluador.id] ||= "";
  });
  [module.cargas, ...Object.values(module.cargasEvaluadores)].forEach((cargas) => nextState.postulantes.forEach((postulante) => {
    cargas[postulante.id] ||= { valores: {} };
    const valores = cargas[postulante.id].valores;
    module.tipos.forEach((tipo) => {
      tipo.subitems.forEach((subitem) => {
        if (valores[subitem.id] === undefined) valores[subitem.id] = "";
      });
    });
  }));
}

function seedExtension(nextState = state) {
  nextState.antecedentesExtension ||= clone(initialState.antecedentesExtension);
  const module = nextState.antecedentesExtension;
  module.cargas ||= {};
  module.cargasEvaluadores ||= {};
  module.participacion ||= {};
  module.anotaciones ||= {};
  module.anotaciones.consolidada ||= "";
  nextState.oposicion.evaluadores.forEach((evaluador) => {
    module.participacion[evaluador.id] ??= true;
    module.cargasEvaluadores[evaluador.id] ||= {};
    module.anotaciones[evaluador.id] ||= "";
  });
  [module.cargas, ...Object.values(module.cargasEvaluadores)].forEach((cargas) => nextState.postulantes.forEach((postulante) => {
    cargas[postulante.id] ||= { valores: {} };
    const valores = cargas[postulante.id].valores;
    module.tipos.forEach((tipo) => {
      tipo.subitems.forEach((subitem) => {
        const compositeParts = extensionCompositeParts(subitem);
        if (compositeParts) {
          compositeParts.forEach((part, index) => {
            const fieldId = extensionCompositeFieldId(subitem, part.kind);
            if (valores[fieldId] === undefined) valores[fieldId] = index === 0 ? (valores[subitem.id] ?? "") : "";
          });
          return;
        }
        if (valores[subitem.id] === undefined) valores[subitem.id] = "";
      });
    });
  }));
}

function seedProfesionales(nextState = state) {
  nextState.antecedentesProfesionales ||= clone(initialState.antecedentesProfesionales);
  const module = nextState.antecedentesProfesionales;
  module.cargas ||= {};
  module.cargasEvaluadores ||= {};
  module.participacion ||= {};
  module.anotaciones ||= {};
  module.anotaciones.consolidada ||= "";
  nextState.oposicion.evaluadores.forEach((evaluador) => {
    module.participacion[evaluador.id] ??= true;
    module.cargasEvaluadores[evaluador.id] ||= {};
    module.anotaciones[evaluador.id] ||= "";
  });
  [module.cargas, ...Object.values(module.cargasEvaluadores)].forEach((cargas) => nextState.postulantes.forEach((postulante) => {
    cargas[postulante.id] ||= { valores: {} };
    const valores = cargas[postulante.id].valores;
    module.tipos.forEach((tipo) => {
      tipo.subitems.forEach((subitem) => {
        if (valores[subitem.id] === undefined) valores[subitem.id] = "";
      });
    });
  }));
}

function seedOtros(nextState = state) {
  nextState.otrosAntecedentes ||= clone(initialState.otrosAntecedentes);
  const module = nextState.otrosAntecedentes;
  module.cargas ||= {};
  module.cargasEvaluadores ||= {};
  module.participacion ||= {};
  module.anotaciones ||= {};
  module.anotaciones.consolidada ||= "";
  nextState.oposicion.evaluadores.forEach((evaluador) => {
    module.participacion[evaluador.id] ??= true;
    module.cargasEvaluadores[evaluador.id] ||= {};
    module.anotaciones[evaluador.id] ||= "";
  });
  [module.cargas, ...Object.values(module.cargasEvaluadores)].forEach((cargas) => nextState.postulantes.forEach((postulante) => {
    cargas[postulante.id] ||= { valores: {} };
    const valores = cargas[postulante.id].valores;
    module.tipos.forEach((tipo) => {
      tipo.subitems.forEach((subitem) => {
        if (valores[subitem.id] === undefined) valores[subitem.id] = "";
      });
    });
  }));
}

function renumberPostulantes(nextState = state) {
  nextState.postulantes.forEach((postulante, index) => {
    postulante.numero = index + 1;
  });
}

function sortPostulantes() {
  state.postulantes.sort((a, b) => {
    const lastName = String(a.apellidos || "").localeCompare(String(b.apellidos || ""), "es", { sensitivity: "base" });
    const firstName = String(a.nombres || "").localeCompare(String(b.nombres || ""), "es", { sensitivity: "base" });
    return lastName !== 0 ? lastName : firstName;
  });
  render();
}

function roundToThree(value) {
  const number = Number(value || 0);
  return Math.round((number + Number.EPSILON) * 1000) / 1000;
}

function roundToTwo(value) {
  const number = Number(value || 0);
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function formatNumber(value, digits = 2) {
  const safeDigits = Math.max(0, Math.min(3, digits));
  const rounded = safeDigits <= 2 ? roundToTwo(value) : roundToThree(value);
  return rounded.toLocaleString("es-AR", {
    minimumFractionDigits: safeDigits,
    maximumFractionDigits: safeDigits
  });
}

function editableNumber(value, digits = 3) {
  return String(digits <= 2 ? roundToTwo(value) : roundToThree(value));
}

function evaluatorColor(evaluatorId) {
  return state.oposicion.evaluadores.find((evaluador) => evaluador.id === evaluatorId)?.color || "#d8a21b";
}

function hexToRgba(hex, alpha) {
  const normalized = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return `rgba(216, 162, 27, ${alpha})`;
  const number = parseInt(normalized, 16);
  return `rgba(${number >> 16}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

function evaluatorStyle(evaluatorId) {
  const color = evaluatorColor(evaluatorId);
  return `--evaluator-color:${color};--evaluator-tint:${hexToRgba(color, 0.16)};--evaluator-tint-strong:${hexToRgba(color, 0.28)}`;
}

function isEvaluatorLocked(evaluatorId) {
  return Boolean(state.evaluatorLocks?.[evaluatorId]);
}

function setEvaluatorLocked(evaluatorId, locked) {
  state.evaluatorLocks ||= {};
  state.evaluatorLocks[evaluatorId] = Boolean(locked);
  saveState();
  window.collaboration?.applyPermissions?.();
}

function updateLoadLockButton(buttonId, evaluatorId, canShow, rerender) {
  const button = document.querySelector(`#${buttonId}`);
  if (!button) return;
  const show = Boolean(canShow && evaluatorId);
  const locked = show && isEvaluatorLocked(evaluatorId);
  button.hidden = !show;
  button.textContent = locked ? "Volver a editar mi carga" : "Bloquear mi carga";
  button.classList.toggle("is-locked", locked);
  button.setAttribute("aria-pressed", locked ? "true" : "false");
  button.dataset.evaluatorLoadLock = evaluatorId || "";
  button.onclick = () => {
    const nextLocked = !isEvaluatorLocked(evaluatorId);
    setEvaluatorLocked(evaluatorId, nextLocked);
    window.collaboration?.scheduleSave?.();
    rerender?.();
  };
}

window.isEvaluatorLocked = isEvaluatorLocked;
window.setEvaluatorLocked = setEvaluatorLocked;

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function candidateNameHtml(postulante, options = {}) {
  const surname = escapeAttribute(postulante.apellidos || "Sin apellido");
  const names = escapeAttribute(postulante.nombres || "Sin nombre");
  const className = postulante.licencia ? "candidate-name has-license" : "candidate-name";
  const licenseLabel = postulante.licencia ? `<span class="candidate-license-label">Covid/Licencia</span>` : "";
  const department = options.department ? `<span class="candidate-department">${postulanteDepartamentoLabel(postulante)}</span>` : "";
  return `<span class="${className}">${surname}<br><span class="muted">${names}</span>${licenseLabel}${department}</span>`;
}

function candidatePlainName(postulante) {
  return `${postulante.apellidos || "Sin apellido"}, ${postulante.nombres || "Sin nombre"}`;
}

function calculationAttribute(text) {
  return `data-calculation="${escapeAttribute(text)}" tabindex="0"`;
}

function updateCalculation(element, text) {
  if (!element) return;
  element.dataset.calculation = text;
  element.removeAttribute("title");
}

function getRubro(id) {
  return state.rubros.find((rubro) => rubro.id === id);
}

function getOposicionMaxSimple() {
  return Number(getRubro("oposicion")?.simple || 0);
}

function getOposicionMaxExclusiva() {
  return Number(getRubro("oposicion")?.exclusiva || 0);
}

function pesoTotal() {
  return state.oposicion.criterios.reduce((total, criterio) => total + Number(criterio.peso || 0), 0);
}

function sumaPonderadaEvaluador(evaluador, postulanteId) {
  const evaluacion = evaluador.evaluaciones[postulanteId];
  if (!evaluacion) return 0;
  return state.oposicion.criterios.reduce((total, criterio) => {
    const nota = Number(evaluacion.notas[criterio.id] || 0);
    return total + Number(criterio.peso || 0) * nota;
  }, 0);
}

function notaEvaluador(evaluador, postulanteId) {
  const totalPesos = pesoTotal();
  if (!totalPesos) return 0;
  return sumaPonderadaEvaluador(evaluador, postulanteId) * getOposicionMaxSimple() / (totalPesos * 10);
}

function notaEvaluadorExplanation(evaluador, postulanteId) {
  const evaluacion = evaluador.evaluaciones[postulanteId];
  const lines = state.oposicion.criterios.map((criterio) => {
    const nota = Number(evaluacion?.notas[criterio.id] || 0);
    const parcial = Number(criterio.peso || 0) * nota;
    return `${criterio.nombre}: ${formatNumber(criterio.peso, 1)} × ${formatNumber(nota, 1)} = ${formatNumber(parcial)}`;
  });
  const sumaPonderada = sumaPonderadaEvaluador(evaluador, postulanteId);
  const totalPesos = pesoTotal();
  const normalizacion = totalPesos
    ? `${formatNumber(sumaPonderada)} × ${formatNumber(getOposicionMaxSimple())} ÷ (${formatNumber(totalPesos)} × 10) = ${formatNumber(notaEvaluador(evaluador, postulanteId))}`
    : "No se puede calcular sin pesos asignados";
  return `${lines.join("\n")}\nSuma ponderada: ${formatNumber(sumaPonderada)}\nNormalización Simple: ${normalizacion}`;
}

function notaExclusivaDesdeSimple(notaSimple) {
  const simpleMax = getOposicionMaxSimple();
  return simpleMax ? Number(notaSimple || 0) / simpleMax * getOposicionMaxExclusiva() : 0;
}

function getDocentesMaxSimple() {
  return Number(getRubro("docentes")?.simple || 0);
}

function getDocentesMaxExclusiva() {
  return Number(getRubro("docentes")?.exclusiva || 0);
}

function antecedentCargas(module, activeId) {
  return activeId === "consolidada"
    ? module.cargas
    : module.cargasEvaluadores[activeId] || module.cargas;
}

function participatingEvaluators(_module) {
  return state.oposicion.evaluadores;
}

function antecedentDifference(module, postulanteId, fieldId) {
  const entries = participatingEvaluators(module)
    .map((evaluador) => ({
      nombre: evaluador.nombre,
      valor: module.cargasEvaluadores[evaluador.id]?.[postulanteId]?.valores?.[fieldId]
    }))
    .filter((entry) => entry.valor !== "" && entry.valor !== undefined && entry.valor !== null);
  const distinct = new Set(entries.map((entry) => String(roundToThree(entry.valor))));
  return {
    differs: entries.length > 1 && distinct.size > 1,
    explanation: entries.length
      ? entries.map((entry) => `${entry.nombre}: ${formatNumber(entry.valor)}`).join("\n")
      : "Ningún evaluador cargó este valor."
  };
}

function syncConsolidatedAntecedentField(module, postulanteId, fieldId) {
  const values = participatingEvaluators(module)
    .map((evaluador) => module.cargasEvaluadores[evaluador.id]?.[postulanteId]?.valores?.[fieldId])
    .filter((value) => value !== "" && value !== undefined && value !== null);
  if (!values.length) return;
  const normalized = values.map((value) => String(roundToThree(value)));
  if (new Set(normalized).size === 1) {
    module.cargas[postulanteId].valores[fieldId] = values[0];
  }
}

function renderAntecedentEvaluationControls(moduleKey, activeId, setActiveId, rerender) {
  const module = state[moduleKey];
  const prefix = {
    antecedentesDocentes: "docentes",
    antecedentesCientificos: "cientificos",
    antecedentesExtension: "extension",
    antecedentesProfesionales: "profesionales",
    otrosAntecedentes: "otros"
  }[moduleKey];
  const container = document.querySelector(`#${prefix}-evaluation-controls`);
  const individual = module.modalidad === "evaluadores";
  const currentEvaluatorKey = window.collaboration?.currentEvaluatorKey?.();
  const canLockActiveLoad = individual && activeId !== "consolidada" && activeId === currentEvaluatorKey;
  const activeLoadLocked = canLockActiveLoad && window.isEvaluatorLocked?.(activeId);
  container.innerHTML = `
    <div class="evaluation-mode-selector">
      <span>Modalidad de carga</span>
      <label><input type="radio" name="${prefix}-mode" value="unica" ${individual ? "" : "checked"}> Carga única de la comisión</label>
      <label><input type="radio" name="${prefix}-mode" value="evaluadores" ${individual ? "checked" : ""}> Carga independiente por evaluador</label>
    </div>
    ${individual ? `
      <div class="evaluator-tabs antecedent-evaluator-tabs">
        <button type="button" class="evaluator-tab ${activeId === "consolidada" ? "is-active" : ""}" data-${prefix}-load="consolidada">Carga consolidada</button>
        ${participatingEvaluators(module).map((evaluador) => `
          <button type="button" class="evaluator-tab evaluator-color-tab ${activeId === evaluador.id ? "is-active" : ""}" style="${evaluatorStyle(evaluador.id)}" data-${prefix}-load="${evaluador.id}">${evaluador.nombre}</button>
        `).join("")}
      </div>
      <p class="evaluation-mode-note">${activeId === "consolidada"
        ? "Los campos con diferencias entre evaluadores se resaltan. Esta carga es la utilizada en Resultados."
        : activeLoadLocked
          ? "Su carga está bloqueada para evitar cambios accidentales. Puede volver a editarla cuando lo necesite."
          : "Esta carga es individual y no modifica Resultados hasta ser incorporada en la carga consolidada."}</p>
    ` : `<p class="evaluation-mode-note">La tabla actual es la carga consolidada utilizada en Resultados.</p>`}
  `;
  updateLoadLockButton(`lock-${prefix}-load`, activeId, canLockActiveLoad, rerender);
  container.querySelectorAll(`input[name="${prefix}-mode"]`).forEach((input) => {
    input.addEventListener("change", () => {
      module.modalidad = input.value;
      setActiveId("consolidada");
      render();
    });
  });
  container.querySelectorAll(`[data-${prefix}-load]`).forEach((button) => {
    button.addEventListener("click", () => {
      setActiveId(button.dataset[`${prefix}Load`]);
      rerender();
    });
  });
}

function renderAntecedentNotesSection(module, activeId) {
  const label = activeId === "consolidada"
    ? "Carga consolidada"
    : state.oposicion.evaluadores.find((evaluador) => evaluador.id === activeId)?.nombre || "Evaluador";
  const value = module.anotaciones?.[activeId] || "";
  return `
    <section class="load-annotations">
      <label>
        <span>Anotaciones — ${escapeAttribute(label)}</span>
        <textarea rows="4" data-antecedent-notes="${activeId}">${escapeHtml(value)}</textarea>
      </label>
    </section>
  `;
}

function attachAntecedentNotesHandler(container, module, activeId) {
  container.querySelector("[data-antecedent-notes]")?.addEventListener("input", (event) => {
    module.anotaciones ||= {};
    module.anotaciones[activeId] = event.target.value;
    saveState();
  });
}

function teachingOriginFieldId(subitemId, originId) {
  return `${subitemId}__${originId}`;
}

function teachingOriginPoint(subitem, originId) {
  return Number(subitem.puntajesOrigen?.[originId] ?? subitem.puntos ?? 0);
}

function positiveYears(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round((number + Number.EPSILON) * 10) / 10);
}

function positiveInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
}

function normalizeIntegerInput(input) {
  if (input.value === "") return;
  input.value = String(positiveInteger(input.value));
}

function scoreReachesCap(rawScore, cap) {
  const numericCap = Number(cap || 0);
  return numericCap > 0 && Number(rawScore || 0) >= numericCap - 1e-9;
}

function saturationClass(rawScore, cap) {
  return scoreReachesCap(rawScore, cap) ? " is-saturated-score" : "";
}

function updateSaturation(element, rawScore, cap) {
  element?.classList.toggle("is-saturated-score", scoreReachesCap(rawScore, cap));
}

function docentesSubitemRawScore(subitem, carga) {
  if (TEACHING_ORIGIN_ITEM_IDS.has(subitem.id)) {
    return TEACHING_APPOINTMENT_ORIGINS.reduce((sum, origin) => (
      sum
        + positiveYears(carga?.valores[teachingOriginFieldId(subitem.id, origin.id)])
        * teachingOriginPoint(subitem, origin.id)
    ), 0);
  }
  return Number(carga?.valores[subitem.id] || 0) * Number(subitem.puntos || 0);
}

function teachingOriginYears(subitem, postulanteId, cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  return TEACHING_APPOINTMENT_ORIGINS.reduce((sum, origin) => (
    sum + positiveYears(valores[teachingOriginFieldId(subitem.id, origin.id)])
  ), 0);
}

function teachingOriginExplanation(subitem, postulanteId, cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  const lines = TEACHING_APPOINTMENT_ORIGINS
    .map((origin) => {
      const years = positiveYears(valores[teachingOriginFieldId(subitem.id, origin.id)]);
      const points = teachingOriginPoint(subitem, origin.id);
      return years ? `${origin.nombre}: ${formatNumber(years)} años × ${formatNumber(points)} = ${formatNumber(years * points)}` : "";
    })
    .filter(Boolean);
  return lines.length ? `${subitem.nombre}\n${lines.join("\n")}` : `${subitem.nombre}: sin años cargados.`;
}

function teachingOriginDifference(module, postulanteId, subitem) {
  const differences = TEACHING_APPOINTMENT_ORIGINS
    .map((origin) => ({
      origin,
      difference: antecedentDifference(module, postulanteId, teachingOriginFieldId(subitem.id, origin.id))
    }))
    .filter(({ difference }) => difference.differs);
  return {
    differs: differences.length > 0,
    explanation: differences.map(({ origin, difference }) => (
      `${origin.nombre}:\n${difference.explanation}`
    )).join("\n\n")
  };
}

function postulanteDepartamentoLabel(postulante) {
  if (postulante?.dege && postulante?.otroDepto) return "DEGE y Otro Depto.";
  if (postulante?.dege) return "DEGE";
  if (postulante?.otroDepto) return "Otro Depto.";
  return "EGE";
}

function docentesTipoRawScore(tipo, postulanteId, cargas = state.antecedentesDocentes.cargas) {
  const carga = cargas[postulanteId];
  if (!carga) return 0;
  if (tipo.modo === "eadis") {
    const promedio = Number(carga.valores[tipo.id]);
    if (!promedio) return 0;
    const tramo = [...tipo.subitems]
      .sort((a, b) => Number(b.min || 0) - Number(a.min || 0))
      .find((subitem) => promedio >= Number(subitem.min || 0));
    return Number(tramo?.puntos || 0);
  }
  return tipo.subitems.reduce((sum, subitem) => {
    return sum + docentesSubitemRawScore(subitem, carga);
  }, 0);
}

function docentesTipoScore(tipo, postulanteId, cargas = state.antecedentesDocentes.cargas) {
  return Math.min(Number(tipo.maxSimple || 0), docentesTipoRawScore(tipo, postulanteId, cargas));
}

function docentesTipoExplanation(tipo, postulanteId, cargas = state.antecedentesDocentes.cargas) {
  const carga = cargas[postulanteId];
  if (tipo.modo === "eadis") {
    const promedio = Number(carga?.valores[tipo.id] || 0);
    const tramo = [...tipo.subitems]
      .sort((a, b) => Number(b.min || 0) - Number(a.min || 0))
      .find((subitem) => promedio >= Number(subitem.min || 0));
    return promedio
      ? `Promedio EADIS: ${formatNumber(promedio, 2)}\nTramo: ${tramo?.nombre || "Sin puntaje"}\nPuntaje: ${formatNumber(docentesTipoScore(tipo, postulanteId, cargas))}`
      : "Sin promedio EADIS cargado.";
  }
  const lines = tipo.subitems.flatMap((subitem) => {
    if (TEACHING_ORIGIN_ITEM_IDS.has(subitem.id)) {
      return teachingOriginYears(subitem, postulanteId, cargas)
        ? [teachingOriginExplanation(subitem, postulanteId, cargas)]
        : [];
    }
    const cantidad = Number(carga?.valores[subitem.id] || 0);
    return cantidad
      ? [`${subitem.nombre}: ${formatNumber(cantidad, 2)} × ${formatNumber(subitem.puntos)} = ${formatNumber(cantidad * Number(subitem.puntos || 0))}`]
      : [];
  });
  const rawTotal = docentesTipoRawScore(tipo, postulanteId, cargas);
  const capNote = scoreReachesCap(rawTotal, tipo.maxSimple)
    ? `\nTope base alcanzado: ${formatNumber(tipo.maxSimple)}.`
    : "";
  return `${lines.length ? lines.join("\n") : "Sin antecedentes cargados."}\nSuma: ${formatNumber(rawTotal)}${capNote}\nSubtotal: ${formatNumber(docentesTipoScore(tipo, postulanteId, cargas))}`;
}

function docentesInternalMax() {
  return state.antecedentesDocentes.tipos.reduce((sum, tipo) => sum + Number(tipo.maxSimple || 0), 0);
}

function docentesInternalScore(postulanteId, cargas = state.antecedentesDocentes.cargas) {
  return state.antecedentesDocentes.tipos.reduce((sum, tipo) => {
    return sum + docentesTipoScore(tipo, postulanteId, cargas);
  }, 0);
}

function docentesInternalExplanation(postulanteId, cargas = state.antecedentesDocentes.cargas) {
  const lines = state.antecedentesDocentes.tipos.map((tipo) => {
    return `${tipo.nombre}: ${formatNumber(docentesTipoScore(tipo, postulanteId, cargas))}`;
  });
  return `${lines.join("\n")}\nPuntaje base total: ${formatNumber(docentesInternalScore(postulanteId, cargas))} sobre ${formatNumber(docentesInternalMax())}`;
}

function docentesSimpleScore(postulanteId) {
  const internalMax = docentesInternalMax();
  return internalMax ? docentesInternalScore(postulanteId) / internalMax * getDocentesMaxSimple() : 0;
}

function docentesExclusiveScore(postulanteId) {
  const internalMax = docentesInternalMax();
  return internalMax ? docentesInternalScore(postulanteId) / internalMax * getDocentesMaxExclusiva() : 0;
}

function docentesRelativizedValue(value, agreedMax) {
  const internalMax = docentesInternalMax();
  return internalMax ? Number(value || 0) / internalMax * Number(agreedMax || 0) : 0;
}

function docentesRelativizedExplanation(postulanteId, agreedMax, cargo) {
  return `${docentesInternalExplanation(postulanteId)}\n\n${cargo}: ${formatNumber(docentesInternalScore(postulanteId))} × ${formatNumber(agreedMax)} ÷ ${formatNumber(docentesInternalMax())} = ${formatNumber(docentesRelativizedValue(docentesInternalScore(postulanteId), agreedMax))}`;
}

function docentesRelativizedExplanationFromCargas(postulanteId, agreedMax, cargo, cargas) {
  const internal = docentesInternalScore(postulanteId, cargas);
  return `${docentesInternalExplanation(postulanteId, cargas)}\n\n${cargo}: ${formatNumber(internal)} × ${formatNumber(agreedMax)} ÷ ${formatNumber(docentesInternalMax())} = ${formatNumber(docentesRelativizedValue(internal, agreedMax))}`;
}

function getCientificosMaxSimple() {
  return Number(getRubro("cientificos")?.simple || 0);
}

function getCientificosMaxExclusiva() {
  return Number(getRubro("cientificos")?.exclusiva || 0);
}

function cientificosTipoRawScore(tipo, postulanteId, cargas = state.antecedentesCientificos.cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  return tipo.subitems.reduce((sum, subitem) => {
    return sum + Number(valores[subitem.id] || 0) * Number(subitem.puntos || 0);
  }, 0);
}

function scientificPublicationGroups(tipo) {
  const groups = new Map();
  tipo.subitems.forEach((subitem) => {
    if (!subitem.grupoId) return;
    if (!groups.has(subitem.grupoId)) {
      groups.set(subitem.grupoId, {
        id: subitem.grupoId,
        nombre: subitem.grupoNombre || subitem.nombre,
        subitems: []
      });
    }
    groups.get(subitem.grupoId).subitems.push(subitem);
  });
  return [...groups.values()];
}

function scientificPublicationGroupIsSingleScore(group) {
  return group.subitems.length === 1 && Boolean(group.subitems[0].puntajeUnico);
}

function scientificPublicationGroupScore(group, postulanteId, cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  return group.subitems.reduce((sum, subitem) => (
    sum + Number(valores[subitem.id] || 0) * Number(subitem.puntos || 0)
  ), 0);
}

function scientificPublicationGroupCount(group, postulanteId, cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  return group.subitems.reduce((sum, subitem) => sum + Number(valores[subitem.id] || 0), 0);
}

function scientificPublicationGroupExplanation(group, postulanteId, cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  const lines = group.subitems
    .filter((subitem) => Number(valores[subitem.id] || 0) !== 0)
    .map((subitem) => {
      const cantidad = Number(valores[subitem.id] || 0);
      const label = scientificPublicationGroupIsSingleScore(group) ? group.nombre : subitem.posicionNombre;
      return `${label}: ${formatNumber(cantidad)} × ${formatNumber(subitem.puntos)} = ${formatNumber(cantidad * Number(subitem.puntos || 0))}`;
    });
  const score = scientificPublicationGroupScore(group, postulanteId, cargas);
  return `${group.nombre}\n${lines.length ? lines.join("\n") : "Sin publicaciones cargadas."}\nSubtotal interno: ${formatNumber(score)}\nSimple: ${formatNumber(cientificosRelativizedValue(score, getCientificosMaxSimple()))}\nExclusiva: ${formatNumber(cientificosRelativizedValue(score, getCientificosMaxExclusiva()))}`;
}

function scientificPublicationGroupDifference(module, postulanteId, group) {
  const differences = group.subitems
    .map((subitem) => ({ subitem, difference: antecedentDifference(module, postulanteId, subitem.id) }))
    .filter(({ difference }) => difference.differs);
  return {
    differs: differences.length > 0,
    explanation: differences.map(({ subitem, difference }) => (
      `${scientificPublicationGroupIsSingleScore(group) ? group.nombre : subitem.posicionNombre}:\n${difference.explanation}`
    )).join("\n\n")
  };
}

function cientificosTipoScore(tipo, postulanteId, cargas = state.antecedentesCientificos.cargas) {
  return Math.min(Number(tipo.maxInterno || 0), cientificosTipoRawScore(tipo, postulanteId, cargas));
}

function cientificosTipoExplanation(tipo, postulanteId, cargas = state.antecedentesCientificos.cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  const lines = tipo.subitems
    .filter((subitem) => Number(valores[subitem.id] || 0) !== 0)
    .map((subitem) => {
      const cantidad = Number(valores[subitem.id] || 0);
      return `${subitem.nombre}: ${formatNumber(cantidad)} × ${formatNumber(subitem.puntos)} = ${formatNumber(cantidad * Number(subitem.puntos || 0))}`;
    });
  const raw = cientificosTipoRawScore(tipo, postulanteId, cargas);
  const capped = cientificosTipoScore(tipo, postulanteId, cargas);
  const capNote = scoreReachesCap(raw, tipo.maxInterno)
    ? `\nTope interno alcanzado: ${formatNumber(tipo.maxInterno)}.`
    : "";
  return `${lines.length ? lines.join("\n") : "Sin antecedentes cargados."}\nSuma: ${formatNumber(raw)}${capNote}\nSubtotal: ${formatNumber(capped)}`;
}

function cientificosInternalMax() {
  return state.antecedentesCientificos.tipos.reduce((sum, tipo) => sum + Number(tipo.maxInterno || 0), 0);
}

function cientificosInternalScore(postulanteId, cargas = state.antecedentesCientificos.cargas) {
  return state.antecedentesCientificos.tipos.reduce((sum, tipo) => {
    return sum + cientificosTipoScore(tipo, postulanteId, cargas);
  }, 0);
}

function cientificosInternalExplanation(postulanteId, cargas = state.antecedentesCientificos.cargas) {
  const lines = state.antecedentesCientificos.tipos.map((tipo) => {
    return `${tipo.nombre}: ${formatNumber(cientificosTipoScore(tipo, postulanteId, cargas))}`;
  });
  return `${lines.join("\n")}\nTotal interno: ${formatNumber(cientificosInternalScore(postulanteId, cargas))} sobre ${formatNumber(cientificosInternalMax())}`;
}

function cientificosRelativizedValue(value, agreedMax) {
  const internalMax = cientificosInternalMax();
  return internalMax ? Number(value || 0) / internalMax * Number(agreedMax || 0) : 0;
}

function cientificosSimpleScore(postulanteId) {
  return cientificosRelativizedValue(cientificosInternalScore(postulanteId), getCientificosMaxSimple());
}

function cientificosExclusiveScore(postulanteId) {
  return cientificosRelativizedValue(cientificosInternalScore(postulanteId), getCientificosMaxExclusiva());
}

function cientificosRelativizedExplanation(postulanteId, agreedMax, cargo) {
  return `${cientificosInternalExplanation(postulanteId)}\n\n${cargo}: ${formatNumber(cientificosInternalScore(postulanteId))} × ${formatNumber(agreedMax)} ÷ ${formatNumber(cientificosInternalMax())} = ${formatNumber(cientificosRelativizedValue(cientificosInternalScore(postulanteId), agreedMax))}`;
}

function cientificosRelativizedExplanationFromCargas(postulanteId, agreedMax, cargo, cargas) {
  const internal = cientificosInternalScore(postulanteId, cargas);
  return `${cientificosInternalExplanation(postulanteId, cargas)}\n\n${cargo}: ${formatNumber(internal)} × ${formatNumber(agreedMax)} ÷ ${formatNumber(cientificosInternalMax())} = ${formatNumber(cientificosRelativizedValue(internal, agreedMax))}`;
}

function getExtensionMaxSimple() {
  return Number(getRubro("extension")?.simple || 0);
}

function getExtensionMaxExclusiva() {
  return Number(getRubro("extension")?.exclusiva || 0);
}

function extensionCompositeFieldId(subitem, kind) {
  return `${subitem.id}_${kind}`;
}

function extensionCompositeParts(subitem) {
  if (subitem.modo === "libros_cuadernillos") {
    const libroPoints = Number(subitem.puntos || 0);
    return [
      { kind: "libro", label: "Libros", points: libroPoints },
      { kind: "cuadernillo", label: "Cuadernillos", points: libroPoints * Number(subitem.cuadernilloFactor ?? 0.33) }
    ];
  }
  if (subitem.modo === "organizacion_congreso") {
    const organizacionPoints = Number(subitem.puntos || 0);
    return [
      { kind: "organizacion", label: "Organización", points: organizacionPoints },
      { kind: "congreso", label: "Presentación de proyectos en congreso", points: organizacionPoints * Number(subitem.congresoFactor ?? 0.33) }
    ];
  }
  return null;
}

function extensionSubitemRawScore(subitem, valores) {
  const parts = extensionCompositeParts(subitem);
  if (parts) {
    return parts.reduce((sum, part) => {
      return sum + Number(valores[extensionCompositeFieldId(subitem, part.kind)] || 0) * Number(part.points || 0);
    }, 0);
  }
  return Number(valores[subitem.id] || 0) * Number(subitem.puntos || 0);
}

function extensionSubitemExplanationLines(subitem, valores) {
  const parts = extensionCompositeParts(subitem);
  if (parts) {
    return parts
      .map((part) => {
        const quantity = Number(valores[extensionCompositeFieldId(subitem, part.kind)] || 0);
        return quantity ? `${part.label}: ${formatNumber(quantity)} × ${formatNumber(part.points)} = ${formatNumber(quantity * Number(part.points || 0))}` : "";
      })
      .filter(Boolean);
  }
  const cantidad = Number(valores[subitem.id] || 0);
  return cantidad
    ? [`${subitem.nombre}: ${formatNumber(cantidad)} × ${formatNumber(subitem.puntos)} = ${formatNumber(cantidad * Number(subitem.puntos || 0))}`]
    : [];
}

function extensionTipoRawScore(tipo, postulanteId, cargas = state.antecedentesExtension.cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  return tipo.subitems.reduce((sum, subitem) => sum + extensionSubitemRawScore(subitem, valores), 0);
}

function extensionTipoScore(tipo, postulanteId, cargas = state.antecedentesExtension.cargas) {
  return Math.min(Number(tipo.maxInterno || 0), extensionTipoRawScore(tipo, postulanteId, cargas));
}

function extensionTipoExplanation(tipo, postulanteId, cargas = state.antecedentesExtension.cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  const lines = tipo.subitems.flatMap((subitem) => extensionSubitemExplanationLines(subitem, valores));
  const raw = extensionTipoRawScore(tipo, postulanteId, cargas);
  const capped = extensionTipoScore(tipo, postulanteId, cargas);
  const capNote = scoreReachesCap(raw, tipo.maxInterno)
    ? `\nTope interno alcanzado: ${formatNumber(tipo.maxInterno)}.`
    : "";
  return `${lines.length ? lines.join("\n") : "Sin antecedentes cargados."}\nSuma: ${formatNumber(raw)}${capNote}\nSubtotal: ${formatNumber(capped)}`;
}

function extensionInternalMax() {
  return state.antecedentesExtension.tipos.reduce((sum, tipo) => sum + Number(tipo.maxInterno || 0), 0);
}

function extensionInternalScore(postulanteId, cargas = state.antecedentesExtension.cargas) {
  return state.antecedentesExtension.tipos.reduce((sum, tipo) => {
    return sum + extensionTipoScore(tipo, postulanteId, cargas);
  }, 0);
}

function extensionInternalExplanation(postulanteId, cargas = state.antecedentesExtension.cargas) {
  const lines = state.antecedentesExtension.tipos.map((tipo) => {
    return `${tipo.nombre}: ${formatNumber(extensionTipoScore(tipo, postulanteId, cargas))}`;
  });
  return `${lines.join("\n")}\nTotal interno: ${formatNumber(extensionInternalScore(postulanteId, cargas))} sobre ${formatNumber(extensionInternalMax())}`;
}

function extensionRelativizedValue(value, agreedMax) {
  const internalMax = extensionInternalMax();
  return internalMax ? Number(value || 0) / internalMax * Number(agreedMax || 0) : 0;
}

function extensionSimpleScore(postulanteId) {
  return extensionRelativizedValue(extensionInternalScore(postulanteId), getExtensionMaxSimple());
}

function extensionExclusiveScore(postulanteId) {
  return extensionRelativizedValue(extensionInternalScore(postulanteId), getExtensionMaxExclusiva());
}

function extensionRelativizedExplanation(postulanteId, agreedMax, cargo) {
  const internal = extensionInternalScore(postulanteId);
  return `${extensionInternalExplanation(postulanteId)}\n\n${cargo}: ${formatNumber(internal)} × ${formatNumber(agreedMax)} ÷ ${formatNumber(extensionInternalMax())} = ${formatNumber(extensionRelativizedValue(internal, agreedMax))}`;
}

function extensionRelativizedExplanationFromCargas(postulanteId, agreedMax, cargo, cargas) {
  const internal = extensionInternalScore(postulanteId, cargas);
  return `${extensionInternalExplanation(postulanteId, cargas)}\n\n${cargo}: ${formatNumber(internal)} × ${formatNumber(agreedMax)} ÷ ${formatNumber(extensionInternalMax())} = ${formatNumber(extensionRelativizedValue(internal, agreedMax))}`;
}

function getProfesionalesMaxSimple() {
  return Number(getRubro("profesionales")?.simple || 0);
}

function getProfesionalesMaxExclusiva() {
  return Number(getRubro("profesionales")?.exclusiva || 0);
}

function professionalCompositeFieldId(subitem, kind) {
  return `${subitem.id}_${kind}`;
}

function professionalCompositeParts(subitem) {
  if (subitem.modo === "organizacion_congreso") {
    const organizacionPoints = Number(subitem.puntos || 0);
    return [
      { kind: "organizacion", label: "Organización", points: organizacionPoints },
      { kind: "colaboracion", label: "Colaboración", points: organizacionPoints * Number(subitem.colaboracionFactor ?? 0.33) }
    ];
  }
  return null;
}

function profesionalesSubitemRawScore(subitem, valores) {
  const parts = professionalCompositeParts(subitem);
  if (parts) {
    return parts.reduce((sum, part) => {
      return sum + Number(valores[professionalCompositeFieldId(subitem, part.kind)] || 0) * Number(part.points || 0);
    }, 0);
  }
  return Number(valores[subitem.id] || 0) * Number(subitem.puntos || 0);
}

function profesionalesSubitemExplanationLines(subitem, valores) {
  const parts = professionalCompositeParts(subitem);
  if (parts) {
    return parts
      .map((part) => {
        const quantity = Number(valores[professionalCompositeFieldId(subitem, part.kind)] || 0);
        return quantity ? `${part.label}: ${formatNumber(quantity)} × ${formatNumber(part.points)} = ${formatNumber(quantity * Number(part.points || 0))}` : "";
      })
      .filter(Boolean);
  }
  const cantidad = Number(valores[subitem.id] || 0);
  return cantidad
    ? [`${subitem.nombre}: ${formatNumber(cantidad)} × ${formatNumber(subitem.puntos)} = ${formatNumber(cantidad * Number(subitem.puntos || 0))}`]
    : [];
}

function ensureProfessionalSubitem(tipo, subitem, afterId = null) {
  if (!tipo) return null;
  const existing = tipo.subitems.find((item) => item.id === subitem.id);
  if (existing) {
    Object.assign(existing, subitem);
    return existing;
  }
  const afterIndex = afterId ? tipo.subitems.findIndex((item) => item.id === afterId) : -1;
  tipo.subitems.splice(afterIndex >= 0 ? afterIndex + 1 : tipo.subitems.length, 0, subitem);
  return subitem;
}

function normalizeProfessionalCompositeItems(module) {
  const cargoTipo = module?.tipos?.find((tipo) => tipo.id === "cargo_profesional");
  ensureProfessionalSubitem(cargoTipo, { id: "prof_tres_anos_editor", nombre: "Editor asociado (3 años o más)", puntos: 2.5 });
  ensureProfessionalSubitem(cargoTipo, { id: "prof_menos_tres_editorial", nombre: "Editor asociado (menos de 3 años)", puntos: 1.5 }, "prof_tres_anos_editor");
  ensureProfessionalSubitem(cargoTipo, { id: "prof_editor_invitado", nombre: "Editor invitado", puntos: 0.33 }, "prof_menos_tres_editorial");

  const conveniosTipo = module?.tipos?.find((tipo) => tipo.id === "convenios_oat_stan");
  ensureProfessionalSubitem(conveniosTipo, { id: "prof_oat_stan", nombre: "Director OAT/STAN", puntos: 1.5 });
  ensureProfessionalSubitem(conveniosTipo, { id: "prof_asesoramiento", nombre: "Asesoramiento", puntos: 0.75 }, "prof_oat_stan");

  const subitem = module?.tipos
    ?.find((tipo) => tipo.id === "otros_profesionales")
    ?.subitems?.find((item) => item.id === "prof_organizacion_congresos");
  if (!subitem) return;
  subitem.nombre = "Organización y colaboración en congresos o reuniones";
  subitem.modo = "organizacion_congreso";
  subitem.colaboracionFactor ??= 0.33;
  const orgField = professionalCompositeFieldId(subitem, "organizacion");
  [module.cargas, ...Object.values(module.cargasEvaluadores || {})].forEach((cargas) => {
    Object.values(cargas || {}).forEach((entry) => {
      const valores = entry?.valores;
      if (!valores || valores[subitem.id] === undefined || valores[subitem.id] === "") return;
      valores[orgField] ??= valores[subitem.id];
      delete valores[subitem.id];
    });
  });
}

function profesionalesTipoRawScore(tipo, postulanteId, cargas = state.antecedentesProfesionales.cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  return tipo.subitems.reduce((sum, subitem) => sum + profesionalesSubitemRawScore(subitem, valores), 0);
}

function profesionalesTipoScore(tipo, postulanteId, cargas = state.antecedentesProfesionales.cargas) {
  return Math.min(Number(tipo.maxInterno || 0), profesionalesTipoRawScore(tipo, postulanteId, cargas));
}

function profesionalesTipoExplanation(tipo, postulanteId, cargas = state.antecedentesProfesionales.cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  const lines = tipo.subitems.flatMap((subitem) => profesionalesSubitemExplanationLines(subitem, valores));
  const raw = profesionalesTipoRawScore(tipo, postulanteId, cargas);
  const capped = profesionalesTipoScore(tipo, postulanteId, cargas);
  const capNote = scoreReachesCap(raw, tipo.maxInterno)
    ? `\nTope interno alcanzado: ${formatNumber(tipo.maxInterno)}.`
    : "";
  return `${lines.length ? lines.join("\n") : "Sin antecedentes cargados."}\nSuma: ${formatNumber(raw)}${capNote}\nSubtotal: ${formatNumber(capped)}`;
}

function profesionalesInternalMax() {
  return state.antecedentesProfesionales.tipos.reduce((sum, tipo) => sum + Number(tipo.maxInterno || 0), 0);
}

function profesionalesInternalScore(postulanteId, cargas = state.antecedentesProfesionales.cargas) {
  return state.antecedentesProfesionales.tipos.reduce((sum, tipo) => {
    return sum + profesionalesTipoScore(tipo, postulanteId, cargas);
  }, 0);
}

function profesionalesInternalExplanation(postulanteId, cargas = state.antecedentesProfesionales.cargas) {
  const lines = state.antecedentesProfesionales.tipos.map((tipo) => {
    return `${tipo.nombre}: ${formatNumber(profesionalesTipoScore(tipo, postulanteId, cargas))}`;
  });
  return `${lines.join("\n")}\nTotal interno: ${formatNumber(profesionalesInternalScore(postulanteId, cargas))} sobre ${formatNumber(profesionalesInternalMax())}`;
}

function profesionalesRelativizedValue(value, agreedMax) {
  const internalMax = profesionalesInternalMax();
  return internalMax ? Number(value || 0) / internalMax * Number(agreedMax || 0) : 0;
}

function profesionalesSimpleScore(postulanteId) {
  return profesionalesRelativizedValue(profesionalesInternalScore(postulanteId), getProfesionalesMaxSimple());
}

function profesionalesExclusiveScore(postulanteId) {
  return profesionalesRelativizedValue(profesionalesInternalScore(postulanteId), getProfesionalesMaxExclusiva());
}

function profesionalesRelativizedExplanation(postulanteId, agreedMax, cargo) {
  const internal = profesionalesInternalScore(postulanteId);
  return `${profesionalesInternalExplanation(postulanteId)}\n\n${cargo}: ${formatNumber(internal)} × ${formatNumber(agreedMax)} ÷ ${formatNumber(profesionalesInternalMax())} = ${formatNumber(profesionalesRelativizedValue(internal, agreedMax))}`;
}

function profesionalesRelativizedExplanationFromCargas(postulanteId, agreedMax, cargo, cargas) {
  const internal = profesionalesInternalScore(postulanteId, cargas);
  return `${profesionalesInternalExplanation(postulanteId, cargas)}\n\n${cargo}: ${formatNumber(internal)} × ${formatNumber(agreedMax)} ÷ ${formatNumber(profesionalesInternalMax())} = ${formatNumber(profesionalesRelativizedValue(internal, agreedMax))}`;
}

function getOtrosMaxSimple() {
  return Number(getRubro("otros")?.simple || 0);
}

function getOtrosMaxExclusiva() {
  return Number(getRubro("otros")?.exclusiva || 0);
}

function otrosTipoRawScore(tipo, postulanteId, cargas = state.otrosAntecedentes.cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  return tipo.subitems.reduce((sum, subitem) => {
    const cantidad = Math.min(
      Number(valores[subitem.id] || 0),
      subitem.maxCantidad === undefined ? Infinity : Number(subitem.maxCantidad)
    );
    return sum + cantidad * Number(subitem.puntos || 0);
  }, 0);
}

function otrosTipoScore(tipo, postulanteId, cargas = state.otrosAntecedentes.cargas) {
  return Math.min(Number(tipo.maxInterno || 0), otrosTipoRawScore(tipo, postulanteId, cargas));
}

function otrosTipoExplanation(tipo, postulanteId, cargas = state.otrosAntecedentes.cargas) {
  const valores = cargas[postulanteId]?.valores || {};
  const lines = tipo.subitems
    .filter((subitem) => Number(valores[subitem.id] || 0) !== 0)
    .map((subitem) => {
      const loaded = Number(valores[subitem.id] || 0);
      const cantidad = Math.min(loaded, subitem.maxCantidad === undefined ? Infinity : Number(subitem.maxCantidad));
      const limit = loaded !== cantidad ? ` (limitado a ${formatNumber(cantidad)})` : "";
      return `${subitem.nombre}: ${formatNumber(loaded)}${limit} × ${formatNumber(subitem.puntos)} = ${formatNumber(cantidad * Number(subitem.puntos || 0))}`;
    });
  const raw = otrosTipoRawScore(tipo, postulanteId, cargas);
  const capped = otrosTipoScore(tipo, postulanteId, cargas);
  const capNote = scoreReachesCap(raw, tipo.maxInterno)
    ? `\nTope interno alcanzado: ${formatNumber(tipo.maxInterno)}.`
    : "";
  return `${lines.length ? lines.join("\n") : "Sin antecedentes cargados."}\nSuma: ${formatNumber(raw)}${capNote}\nSubtotal: ${formatNumber(capped)}`;
}

function otrosInternalMax() {
  return Number(state.otrosAntecedentes.maxInternoTotal || 0);
}

function otrosInternalRawScore(postulanteId, cargas = state.otrosAntecedentes.cargas) {
  return state.otrosAntecedentes.tipos.reduce((sum, tipo) => {
    return sum + otrosTipoScore(tipo, postulanteId, cargas);
  }, 0);
}

function otrosInternalScore(postulanteId, cargas = state.otrosAntecedentes.cargas) {
  return Math.min(otrosInternalMax(), otrosInternalRawScore(postulanteId, cargas));
}

function otrosInternalExplanation(postulanteId, cargas = state.otrosAntecedentes.cargas) {
  const lines = state.otrosAntecedentes.tipos.map((tipo) => {
    return `${tipo.nombre}: ${formatNumber(otrosTipoScore(tipo, postulanteId, cargas))}`;
  });
  const raw = otrosInternalRawScore(postulanteId, cargas);
  const capNote = scoreReachesCap(raw, otrosInternalMax()) ? `\nTope general alcanzado: ${formatNumber(otrosInternalMax())}.` : "";
  return `${lines.join("\n")}\nSuma de bloques: ${formatNumber(raw)}${capNote}\nTotal interno: ${formatNumber(otrosInternalScore(postulanteId, cargas))} sobre ${formatNumber(otrosInternalMax())}`;
}

function otrosRelativizedValue(value, agreedMax) {
  const internalMax = otrosInternalMax();
  return internalMax ? Number(value || 0) / internalMax * Number(agreedMax || 0) : 0;
}

function otrosSimpleScore(postulanteId) {
  return otrosRelativizedValue(otrosInternalScore(postulanteId), getOtrosMaxSimple());
}

function otrosExclusiveScore(postulanteId) {
  return otrosRelativizedValue(otrosInternalScore(postulanteId), getOtrosMaxExclusiva());
}

function otrosRelativizedExplanation(postulanteId, agreedMax, cargo) {
  const internal = otrosInternalScore(postulanteId);
  return `${otrosInternalExplanation(postulanteId)}\n\n${cargo}: ${formatNumber(internal)} × ${formatNumber(agreedMax)} ÷ ${formatNumber(otrosInternalMax())} = ${formatNumber(otrosRelativizedValue(internal, agreedMax))}`;
}

function otrosRelativizedExplanationFromCargas(postulanteId, agreedMax, cargo, cargas) {
  const internal = otrosInternalScore(postulanteId, cargas);
  return `${otrosInternalExplanation(postulanteId, cargas)}\n\n${cargo}: ${formatNumber(internal)} × ${formatNumber(agreedMax)} ÷ ${formatNumber(otrosInternalMax())} = ${formatNumber(otrosRelativizedValue(internal, agreedMax))}`;
}

function promedioOposicion(postulanteId) {
  const evaluadores = state.oposicion.evaluadores;
  if (!evaluadores.length) return 0;
  const total = evaluadores.reduce((sum, evaluador) => sum + notaEvaluador(evaluador, postulanteId), 0);
  return total / evaluadores.length;
}

function promedioOposicionExplanation(postulanteId) {
  const lines = state.oposicion.evaluadores.map((evaluador) => {
    return `${evaluador.nombre}: ${formatNumber(notaEvaluador(evaluador, postulanteId))}`;
  });
  return `${lines.join("\n")}\nSuma ÷ ${state.oposicion.evaluadores.length} evaluadores = ${formatNumber(promedioOposicion(postulanteId))}`;
}

function render() {
  renumberPostulantes();
  seedEvaluations(state);
  const administrativeDetails = document.querySelector("#administrative-details");
  if (administrativeDetails.value !== (state.administrativeDetails || "")) {
    administrativeDetails.value = state.administrativeDetails || "";
  }
  document.querySelector("#contest-start-date").value = state.contestStartDate || "";
  document.querySelector("#contest-end-date").value = state.contestEndDate || "";
  renderRubros();
  renderPostulantes();
  renderCriterios();
  renderHeaderEvaluators();
  renderEvaluadores();
  renderDocentesConfig();
  renderDocentesMatrix();
  renderCientificosConfig();
  renderCientificosMatrix();
  renderExtensionConfig();
  renderExtensionMatrix();
  renderProfesionalesConfig();
  renderProfesionalesMatrix();
  renderOtrosConfig();
  renderOtrosMatrix();
  renderResultados();
  renderMerit();
  renderOppositionView();
  renderDocentesView();
  renderCientificosView();
  renderExtensionView();
  renderProfesionalesView();
  renderOtrosView();
  applyScoreConfigurationLocks();
  saveState();
  window.collaboration?.applyPermissions?.();
}

function renderOppositionView() {
  const showingCriteria = oppositionView === "criteria";
  document.querySelector("#show-criteria").classList.toggle("is-active", showingCriteria);
  document.querySelector("#show-evaluations").classList.toggle("is-active", !showingCriteria);
  document.querySelector("#criteria-panel").classList.toggle("is-visible", showingCriteria);
  document.querySelector("#evaluations-panel").classList.toggle("is-visible", !showingCriteria);
}

function renderDocentesView() {
  const showingConfig = docentesView === "config";
  document.querySelector("#show-docentes-config").classList.toggle("is-active", showingConfig);
  document.querySelector("#show-docentes-entry").classList.toggle("is-active", !showingConfig);
  document.querySelector("#docentes-config-panel").classList.toggle("is-visible", showingConfig);
  document.querySelector("#docentes-entry-panel").classList.toggle("is-visible", !showingConfig);
}

function renderCientificosView() {
  const showingConfig = cientificosView === "config";
  document.querySelector("#show-cientificos-config").classList.toggle("is-active", showingConfig);
  document.querySelector("#show-cientificos-entry").classList.toggle("is-active", !showingConfig);
  document.querySelector("#cientificos-config-panel").classList.toggle("is-visible", showingConfig);
  document.querySelector("#cientificos-entry-panel").classList.toggle("is-visible", !showingConfig);
}

function renderExtensionView() {
  const showingConfig = extensionView === "config";
  document.querySelector("#show-extension-config").classList.toggle("is-active", showingConfig);
  document.querySelector("#show-extension-entry").classList.toggle("is-active", !showingConfig);
  document.querySelector("#extension-config-panel").classList.toggle("is-visible", showingConfig);
  document.querySelector("#extension-entry-panel").classList.toggle("is-visible", !showingConfig);
}

function renderProfesionalesView() {
  const showingConfig = profesionalesView === "config";
  document.querySelector("#show-profesionales-config").classList.toggle("is-active", showingConfig);
  document.querySelector("#show-profesionales-entry").classList.toggle("is-active", !showingConfig);
  document.querySelector("#profesionales-config-panel").classList.toggle("is-visible", showingConfig);
  document.querySelector("#profesionales-entry-panel").classList.toggle("is-visible", !showingConfig);
}

function renderOtrosView() {
  const showingConfig = otrosView === "config";
  document.querySelector("#show-otros-config").classList.toggle("is-active", showingConfig);
  document.querySelector("#show-otros-entry").classList.toggle("is-active", !showingConfig);
  document.querySelector("#otros-config-panel").classList.toggle("is-visible", showingConfig);
  document.querySelector("#otros-entry-panel").classList.toggle("is-visible", !showingConfig);
}

function renderRubros() {
  const tbody = document.querySelector("#rubros-table tbody");
  tbody.innerHTML = "";
  state.rubros.forEach((rubro, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${rubro.nombre}</td>
      <td class="readonly-value">${formatNumber(rubro.simpleMin, 1)}</td>
      <td class="readonly-value">${formatNumber(rubro.simpleMax, 1)}</td>
      <td><input type="number" step="0.1" value="${rubro.simple}" data-rubro="${index}" data-field="simple"></td>
      <td class="readonly-value">${formatNumber(rubro.exclusivaMin, 1)}</td>
      <td class="readonly-value">${formatNumber(rubro.exclusivaMax, 1)}</td>
      <td><input type="number" step="0.1" value="${rubro.exclusiva}" data-rubro="${index}" data-field="exclusiva"></td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const rubro = state.rubros[Number(event.target.dataset.rubro)];
      rubro[event.target.dataset.field] = Number(event.target.value);
      renderRubrosSummary();
      scheduleDerivedViewsRender();
      saveState();
    });
  });

  renderRubrosSummary();
}

function renderRubrosSummary() {
  const totalSimple = state.rubros.reduce((sum, rubro) => sum + Number(rubro.simple || 0), 0);
  const totalExclusiva = state.rubros.reduce((sum, rubro) => sum + Number(rubro.exclusiva || 0), 0);
  const totalSimpleCell = document.querySelector("#total-simple");
  const totalExclusiveCell = document.querySelector("#total-exclusiva");
  totalSimpleCell.textContent = formatNumber(totalSimple);
  updateCalculation(totalSimpleCell, `${state.rubros.map((rubro) => `${rubro.nombre}: ${formatNumber(rubro.simple)}`).join("\n")}\nTotal Simple: ${formatNumber(totalSimple)}`);
  totalSimpleCell.tabIndex = 0;
  totalExclusiveCell.textContent = formatNumber(totalExclusiva);
  updateCalculation(totalExclusiveCell, `${state.rubros.map((rubro) => `${rubro.nombre}: ${formatNumber(rubro.exclusiva)}`).join("\n")}\nTotal Exclusiva: ${formatNumber(totalExclusiva)}`);
  totalExclusiveCell.tabIndex = 0;

  const alerts = [];
  if (Math.abs(totalSimple - 100) > 0.001) alerts.push(`El total Simple debe sumar 100. Hoy suma ${formatNumber(totalSimple)}.`);
  if (Math.abs(totalExclusiva - 100) > 0.001) alerts.push(`El total Exclusiva debe sumar 100. Hoy suma ${formatNumber(totalExclusiva)}.`);
  state.rubros.forEach((rubro) => {
    if (rubro.simple < rubro.simpleMin || rubro.simple > rubro.simpleMax) {
      alerts.push(`${rubro.nombre}: Simple acordado fuera del rango permitido.`);
    }
    if (rubro.exclusiva < rubro.exclusivaMin || rubro.exclusiva > rubro.exclusivaMax) {
      alerts.push(`${rubro.nombre}: Exclusiva acordado fuera del rango permitido.`);
    }
  });

  document.querySelector("#config-alerts").innerHTML = alerts.length
    ? alerts.map((alert) => `<div class="alert error">${alert}</div>`).join("")
    : `<div class="alert">Los puntajes acordados respetan rangos y suman 100 para ambos cargos.</div>`;
}

function renderPostulantes() {
  const tbody = document.querySelector("#postulantes-table tbody");
  const summary = document.querySelector("#postulantes-summary");
  const counts = {
    total: state.postulantes.length,
    simple: state.postulantes.filter((postulante) => postulante.simple).length,
    exclusiva: state.postulantes.filter((postulante) => postulante.exclusiva).length,
    dege: state.postulantes.filter((postulante) => postulante.dege).length,
    otroDepto: state.postulantes.filter((postulante) => postulante.otroDepto).length,
    licencia: state.postulantes.filter((postulante) => postulante.licencia).length
  };
  summary.innerHTML = `
    <span>Total (${counts.total})</span>
    <span>Simple (${counts.simple})</span>
    <span>Exclusiva (${counts.exclusiva})</span>
    <span>DEGE (${counts.dege})</span>
    <span>Otros Deptos. (${counts.otroDepto})</span>
    <span>Covid/Licencias (${counts.licencia})</span>
  `;
  tbody.innerHTML = "";
  state.postulantes.forEach((postulante, index) => {
    const row = document.createElement("tr");
    row.classList.toggle("has-license", Boolean(postulante.licencia));
    row.innerHTML = `
      <td class="readonly-value">${postulante.numero}</td>
      <td><input type="text" value="${postulante.apellidos}" data-postulante="${index}" data-field="apellidos"></td>
      <td><input type="text" value="${postulante.nombres}" data-postulante="${index}" data-field="nombres"></td>
      <td><input type="checkbox" ${postulante.simple ? "checked" : ""} data-postulante="${index}" data-field="simple"></td>
      <td><input type="checkbox" ${postulante.exclusiva ? "checked" : ""} data-postulante="${index}" data-field="exclusiva"></td>
      <td><input type="checkbox" ${postulante.dege ? "checked" : ""} data-postulante="${index}" data-field="dege" aria-label="${postulante.apellidos || "Postulante"} pertenece al DEGE"></td>
      <td><input type="checkbox" ${postulante.otroDepto ? "checked" : ""} data-postulante="${index}" data-field="otroDepto" aria-label="${postulante.apellidos || "Postulante"} pertenece a otro departamento"></td>
      <td><input type="checkbox" ${postulante.licencia ? "checked" : ""} data-postulante="${index}" data-field="licencia" aria-label="${postulante.apellidos || "Postulante"} tuvo Covid o licencia"></td>
      <td><button class="icon-button" type="button" data-remove-postulante="${index}" title="Quitar postulante">×</button></td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll('input[type="text"]').forEach((input) => {
    input.addEventListener("input", updatePostulante);
  });
  tbody.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", updatePostulante);
  });
  tbody.querySelectorAll("[data-remove-postulante]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removePostulante);
      const removed = state.postulantes.splice(index, 1)[0];
      state.oposicion.evaluadores.forEach((evaluador) => delete evaluador.evaluaciones[removed.id]);
      delete state.antecedentesDocentes.cargas[removed.id];
      delete state.antecedentesCientificos.cargas[removed.id];
      delete state.antecedentesExtension.cargas[removed.id];
      delete state.antecedentesProfesionales.cargas[removed.id];
      delete state.otrosAntecedentes.cargas[removed.id];
      Object.values(state.antecedentesDocentes.cargasEvaluadores).forEach((cargas) => delete cargas[removed.id]);
      Object.values(state.antecedentesCientificos.cargasEvaluadores).forEach((cargas) => delete cargas[removed.id]);
      Object.values(state.antecedentesExtension.cargasEvaluadores).forEach((cargas) => delete cargas[removed.id]);
      Object.values(state.antecedentesProfesionales.cargasEvaluadores).forEach((cargas) => delete cargas[removed.id]);
      Object.values(state.otrosAntecedentes.cargasEvaluadores).forEach((cargas) => delete cargas[removed.id]);
      render();
    });
  });
}

function updatePostulante(event) {
  const postulante = state.postulantes[Number(event.target.dataset.postulante)];
  const field = event.target.dataset.field;
  postulante[field] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  saveState();
  if (event.target.type === "checkbox") {
    render();
  }
}

function renderCriterios() {
  const list = document.querySelector("#criterios-list");
  list.innerHTML = "";
  state.oposicion.criterios.forEach((criterio, index) => {
    const row = document.createElement("div");
    row.className = "criterion-row";
    const removable = criterio.id.startsWith("criterio_") || !String(criterio.nombre || "").trim();
    row.innerHTML = `
      <input class="criterion-name" type="text" value="${escapeAttribute(criterio.nombre)}" data-criterio="${index}" data-field="nombre">
      <input class="criterion-weight" type="number" min="0" step="0.1" value="${criterio.peso}" data-criterio="${index}" data-field="peso">
      ${removable ? `<button class="icon-button" type="button" data-remove-criterio="${index}" aria-label="Eliminar criterio" title="Eliminar criterio">×</button>` : "<span></span>"}
    `;
    list.appendChild(row);
  });

  list.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const criterio = state.oposicion.criterios[Number(event.target.dataset.criterio)];
      criterio[event.target.dataset.field] = event.target.dataset.field === "peso" ? Number(event.target.value) : event.target.value;
      renderPesoSummary();
      saveState();
    });
    input.addEventListener("change", () => {
      renderEvaluadores();
      renderResultados();
      renderMerit();
      saveState();
    });
  });
  list.querySelectorAll("[data-remove-criterio]").forEach((button) => {
    button.addEventListener("click", () => removeCriterio(Number(button.dataset.removeCriterio)));
  });
  renderPesoSummary();
}

function removeCriterio(index) {
  const criterio = state.oposicion.criterios[index];
  if (!criterio) return;
  const removable = criterio.id.startsWith("criterio_") || !String(criterio.nombre || "").trim();
  if (!removable) return;
  state.oposicion.criterios.splice(index, 1);
  state.oposicion.evaluadores.forEach((evaluador) => {
    Object.values(evaluador.evaluaciones).forEach((evaluacion) => {
      if (evaluacion?.notas) delete evaluacion.notas[criterio.id];
    });
  });
  render();
}

function restoreOppositionDefaults() {
  state.oposicion.criterios = clone(initialState.oposicion.criterios);
  seedEvaluations(state);
  render();
}

function renderPesoSummary() {
  const total = pesoTotal();
  const summary = document.querySelector("#peso-summary");
  summary.className = "weight-summary";
  updateCalculation(summary, `${state.oposicion.criterios.map((criterio) => `${criterio.nombre}: ${formatNumber(criterio.peso, 1)}`).join("\n")}\nSuma de pesos: ${formatNumber(total)}\nLas notas de 1 a 10 se normalizan a los máximos acordados.`);
  summary.tabIndex = 0;
  summary.innerHTML = `
    <span>
      Suma de pesos: ${formatNumber(total)}
      <small>Los pesos conservan su escala propia; no deben coincidir con el máximo Simple.</small>
    </span>
    <span>
      Notas permitidas: 1 a 10
      <small>Máximos normalizados: Simple ${formatNumber(getOposicionMaxSimple())} · Exclusiva ${formatNumber(getOposicionMaxExclusiva())}</small>
    </span>
  `;
}

function removeEvaluator(evaluatorId) {
  const index = state.oposicion.evaluadores.findIndex((evaluador) => evaluador.id === evaluatorId);
  if (index < 0) return;
  const removed = state.oposicion.evaluadores.splice(index, 1)[0];
  delete state.antecedentesDocentes.participacion[removed.id];
  delete state.antecedentesDocentes.cargasEvaluadores[removed.id];
  delete state.antecedentesDocentes.anotaciones[removed.id];
  delete state.antecedentesCientificos.participacion[removed.id];
  delete state.antecedentesCientificos.cargasEvaluadores[removed.id];
  delete state.antecedentesCientificos.anotaciones[removed.id];
  delete state.antecedentesExtension.participacion[removed.id];
  delete state.antecedentesExtension.cargasEvaluadores[removed.id];
  delete state.antecedentesExtension.anotaciones[removed.id];
  delete state.antecedentesProfesionales.participacion[removed.id];
  delete state.antecedentesProfesionales.cargasEvaluadores[removed.id];
  delete state.antecedentesProfesionales.anotaciones[removed.id];
  delete state.otrosAntecedentes.participacion[removed.id];
  delete state.otrosAntecedentes.cargasEvaluadores[removed.id];
  delete state.otrosAntecedentes.anotaciones[removed.id];
  activeEvaluatorId = state.oposicion.evaluadores[0]?.id || null;
  render();
}

function renderHeaderEvaluators() {
  const container = document.querySelector("#header-evaluators-list");
  if (!state.oposicion.evaluadores.length) {
    container.innerHTML = `<div class="alert">Agregá al menos un evaluador para comenzar las cargas.</div>`;
    return;
  }
  container.innerHTML = state.oposicion.evaluadores.map((evaluador) => `
    <div class="header-evaluator-row" style="${evaluatorStyle(evaluador.id)}">
      <input class="evaluator-color-input" type="color" value="${evaluador.color}" data-header-evaluator-color="${evaluador.id}" aria-label="Color de ${escapeAttribute(evaluador.nombre)}">
      <input type="text" value="${escapeAttribute(evaluador.nombre)}" data-header-evaluator-name="${evaluador.id}" aria-label="Nombre del evaluador">
      <button class="icon-button" type="button" data-header-remove-evaluator="${evaluador.id}" title="Quitar evaluador">×</button>
    </div>
  `).join("");
  container.querySelectorAll("[data-header-evaluator-name]").forEach((input) => {
    input.addEventListener("input", () => {
      const evaluador = state.oposicion.evaluadores.find((item) => item.id === input.dataset.headerEvaluatorName);
      evaluador.nombre = input.value;
      saveState();
    });
    input.addEventListener("change", () => {
      renderEvaluadores();
      renderDocentesMatrix();
      renderCientificosMatrix();
      renderExtensionMatrix();
      renderProfesionalesMatrix();
      renderOtrosMatrix();
    });
  });
  container.querySelectorAll("[data-header-remove-evaluator]").forEach((button) => {
    button.addEventListener("click", () => removeEvaluator(button.dataset.headerRemoveEvaluator));
  });
  container.querySelectorAll("[data-header-evaluator-color]").forEach((input) => {
    input.addEventListener("input", () => {
      const evaluador = state.oposicion.evaluadores.find((item) => item.id === input.dataset.headerEvaluatorColor);
      evaluador.color = input.value;
    });
    input.addEventListener("change", () => {
      const evaluador = state.oposicion.evaluadores.find((item) => item.id === input.dataset.headerEvaluatorColor);
      evaluador.color = input.value;
      saveState();
      render();
    });
  });
}

function renderEvaluadores() {
  const container = document.querySelector("#evaluadores-list");
  const tabs = document.querySelector("#evaluador-tabs");
  container.innerHTML = "";
  tabs.innerHTML = "";

  if (!state.oposicion.evaluadores.some((evaluador) => evaluador.id === activeEvaluatorId)) {
    activeEvaluatorId = state.oposicion.evaluadores[0]?.id || null;
  }

  state.oposicion.evaluadores.forEach((evaluador) => {
    const button = document.createElement("button");
    button.className = `evaluator-tab evaluator-color-tab${evaluador.id === activeEvaluatorId ? " is-active" : ""}`;
    button.type = "button";
    button.textContent = evaluador.nombre;
    button.setAttribute("style", evaluatorStyle(evaluador.id));
    button.addEventListener("click", () => {
      activeEvaluatorId = evaluador.id;
      renderEvaluadores();
    });
    tabs.appendChild(button);
  });

  const evalIndex = state.oposicion.evaluadores.findIndex((evaluador) => evaluador.id === activeEvaluatorId);
  if (evalIndex < 0) {
    container.innerHTML = `<div class="alert">Agregá un evaluador para comenzar la carga.</div>`;
    return;
  }

  const evaluador = state.oposicion.evaluadores[evalIndex];
  const currentEvaluatorKey = window.collaboration?.currentEvaluatorKey?.();
  const canLockActiveEvaluator = activeEvaluatorId === currentEvaluatorKey;
  const candidateHeaders = state.postulantes.map((postulante) => `
    <th>${candidateNameHtml(postulante)}</th>
  `).join("");
  const metadataRow = (label, field, type = "text") => `
    <tr>
      <th class="matrix-label">${label}</th>
      ${state.postulantes.map((postulante) => {
        const evaluacion = evaluador.evaluaciones[postulante.id];
        if (field === "comentarios") {
          return `<td><textarea rows="2" data-meta="${field}" data-eval="${evalIndex}" data-postulante-id="${postulante.id}">${evaluacion[field]}</textarea></td>`;
        }
        return `<td><input type="${type}" value="${evaluacion[field]}" data-meta="${field}" data-eval="${evalIndex}" data-postulante-id="${postulante.id}"></td>`;
      }).join("")}
    </tr>
  `;
  const criteriaRows = state.oposicion.criterios.map((criterio) => `
    <tr>
      <th class="matrix-label criterion-label">${criterio.nombre}<span>Peso ${formatNumber(criterio.peso, 1)}</span></th>
      ${state.postulantes.map((postulante) => {
        const value = evaluador.evaluaciones[postulante.id].notas[criterio.id] ?? "";
        return `<td class="note-cell"><input type="number" min="1" max="10" step="0.1" value="${value}" data-eval="${evalIndex}" data-postulante-id="${postulante.id}" data-criterio-id="${criterio.id}" aria-label="Nota de 1 a 10 para ${escapeAttribute(criterio.nombre)}, ${escapeAttribute(postulante.apellidos)} ${escapeAttribute(postulante.nombres)}"></td>`;
      }).join("")}
    </tr>
  `).join("");
  const scoreCells = state.postulantes.map((postulante) => `
    <td class="score-cell"><strong class="${saturationClass(notaEvaluador(evaluador, postulante.id), getOposicionMaxSimple()).trim()}" data-score-postulante="${postulante.id}" ${calculationAttribute(notaEvaluadorExplanation(evaluador, postulante.id))}>${formatNumber(notaEvaluador(evaluador, postulante.id))}</strong></td>
  `).join("");
  const exclusiveScoreCells = state.postulantes.map((postulante) => `
    <td class="score-cell result-exclusiva"><strong class="${saturationClass(notaExclusivaDesdeSimple(notaEvaluador(evaluador, postulante.id)), getOposicionMaxExclusiva()).trim()}" data-exclusive-score-postulante="${postulante.id}" ${calculationAttribute(`${formatNumber(notaEvaluador(evaluador, postulante.id))} Simple × ${formatNumber(getOposicionMaxExclusiva())} ÷ ${formatNumber(getOposicionMaxSimple())} = ${formatNumber(notaExclusivaDesdeSimple(notaEvaluador(evaluador, postulante.id)))}`)}>${formatNumber(notaExclusivaDesdeSimple(notaEvaluador(evaluador, postulante.id)))}</strong></td>
  `).join("");
  const simpleAverageCells = state.postulantes.map((postulante) => `
    <td class="score-cell result-simple">
      <strong class="${postulante.simple ? saturationClass(promedioOposicion(postulante.id), getOposicionMaxSimple()).trim() : ""}" data-simple-average-postulante="${postulante.id}" ${calculationAttribute(promedioOposicionExplanation(postulante.id))}>${postulante.simple ? formatNumber(promedioOposicion(postulante.id)) : "—"}</strong>
    </td>
  `).join("");
  const exclusiveAverageCells = state.postulantes.map((postulante) => `
    <td class="score-cell result-exclusiva">
      <strong class="${postulante.exclusiva ? saturationClass(notaExclusivaDesdeSimple(promedioOposicion(postulante.id)), getOposicionMaxExclusiva()).trim() : ""}" data-exclusive-average-postulante="${postulante.id}" ${calculationAttribute(`${promedioOposicionExplanation(postulante.id)}\n\nConversión Exclusiva: ${formatNumber(promedioOposicion(postulante.id))} × ${formatNumber(getOposicionMaxExclusiva())} ÷ ${formatNumber(getOposicionMaxSimple())} = ${formatNumber(notaExclusivaDesdeSimple(promedioOposicion(postulante.id)))}`)}>${postulante.exclusiva ? formatNumber(notaExclusivaDesdeSimple(promedioOposicion(postulante.id))) : "—"}</strong>
    </td>
  `).join("");

  container.innerHTML = `
    <section class="evaluator evaluator-colored-load" style="${evaluatorStyle(evaluador.id)}">
      <div class="opposition-grid">
        <table class="data-table opposition-matrix">
          <thead>
            <tr>
              <th class="matrix-label">Campo / criterio</th>
              ${candidateHeaders}
            </tr>
          </thead>
          <tbody>
            ${metadataRow("Fecha", "fecha", "date")}
            ${metadataRow("Tema desarrollado", "tema")}
            ${criteriaRows}
            ${metadataRow("Comentarios", "comentarios")}
            <tr>
              <th class="matrix-label">Nota Simple <span>Máximo ${formatNumber(getOposicionMaxSimple())}</span></th>
              ${scoreCells}
            </tr>
            <tr>
              <th class="matrix-label">Nota Exclusiva <span>Máximo ${formatNumber(getOposicionMaxExclusiva())}</span></th>
              ${exclusiveScoreCells}
            </tr>
            <tr class="average-row">
              <th class="matrix-label">Simple promedio <span>Promedio de evaluadores</span></th>
              ${simpleAverageCells}
            </tr>
            <tr class="average-row">
              <th class="matrix-label">Exclusiva promedio <span>Promedio de evaluadores</span></th>
              ${exclusiveAverageCells}
            </tr>
          </tbody>
        </table>
      </div>
      <section class="load-annotations">
        <label>
          <span>Anotaciones — ${escapeAttribute(evaluador.nombre)}</span>
          <textarea rows="4" data-opposition-annotations="${evaluador.id}">${escapeHtml(evaluador.anotaciones || "")}</textarea>
        </label>
      </section>
    </section>
  `;

  updateLoadLockButton("lock-oposicion-load", activeEvaluatorId, canLockActiveEvaluator, renderEvaluadores);
  container.querySelector("[data-opposition-annotations]")?.addEventListener("input", (event) => {
    evaluador.anotaciones = event.target.value;
    saveState();
  });

  container.querySelectorAll("[data-meta]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const evaluacion = state.oposicion.evaluadores[Number(event.target.dataset.eval)].evaluaciones[event.target.dataset.postulanteId];
      evaluacion[event.target.dataset.meta] = event.target.value;
      saveState();
    });
  });
  container.querySelectorAll("[data-criterio-id]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const isEmpty = event.target.value === "";
      const value = Number(event.target.value);
      const isInvalid = !isEmpty && (value < 1 || value > 10);
      event.target.classList.toggle("invalid", isInvalid);
      if (isInvalid) return;
      const evaluacion = state.oposicion.evaluadores[Number(event.target.dataset.eval)].evaluaciones[event.target.dataset.postulanteId];
      evaluacion.notas[event.target.dataset.criterioId] = event.target.value;
      scheduleDerivedViewsRender();
      saveState();
      const score = container.querySelector(`[data-score-postulante="${event.target.dataset.postulanteId}"]`);
      const evaluatorScore = notaEvaluador(state.oposicion.evaluadores[Number(event.target.dataset.eval)], event.target.dataset.postulanteId);
      score.textContent = formatNumber(evaluatorScore);
      updateCalculation(score, notaEvaluadorExplanation(state.oposicion.evaluadores[Number(event.target.dataset.eval)], event.target.dataset.postulanteId));
      updateSaturation(score, evaluatorScore, getOposicionMaxSimple());
      const exclusiveScore = container.querySelector(`[data-exclusive-score-postulante="${event.target.dataset.postulanteId}"]`);
      exclusiveScore.textContent = formatNumber(notaExclusivaDesdeSimple(evaluatorScore));
      updateCalculation(exclusiveScore, `${formatNumber(evaluatorScore)} Simple × ${formatNumber(getOposicionMaxExclusiva())} ÷ ${formatNumber(getOposicionMaxSimple())} = ${exclusiveScore.textContent}`);
      updateSaturation(exclusiveScore, notaExclusivaDesdeSimple(evaluatorScore), getOposicionMaxExclusiva());
      const postulante = state.postulantes.find((item) => item.id === event.target.dataset.postulanteId);
      const averageScore = promedioOposicion(event.target.dataset.postulanteId);
      const simpleAverage = container.querySelector(`[data-simple-average-postulante="${event.target.dataset.postulanteId}"]`);
      simpleAverage.textContent = postulante.simple ? formatNumber(averageScore) : "—";
      updateCalculation(simpleAverage, promedioOposicionExplanation(event.target.dataset.postulanteId));
      updateSaturation(simpleAverage, postulante.simple ? averageScore : 0, getOposicionMaxSimple());
      const exclusiveAverage = container.querySelector(`[data-exclusive-average-postulante="${event.target.dataset.postulanteId}"]`);
      exclusiveAverage.textContent = postulante.exclusiva ? formatNumber(notaExclusivaDesdeSimple(averageScore)) : "—";
      updateCalculation(exclusiveAverage, `${promedioOposicionExplanation(event.target.dataset.postulanteId)}\n\nConversión Exclusiva: ${formatNumber(averageScore)} × ${formatNumber(getOposicionMaxExclusiva())} ÷ ${formatNumber(getOposicionMaxSimple())} = ${formatNumber(notaExclusivaDesdeSimple(averageScore))}`);
      updateSaturation(exclusiveAverage, postulante.exclusiva ? notaExclusivaDesdeSimple(averageScore) : 0, getOposicionMaxExclusiva());
    });
  });
}

function teachingOriginConfigTable(tipo, typeIndex) {
  const rows = tipo.subitems
    .filter((subitem) => TEACHING_ORIGIN_ITEM_IDS.has(subitem.id))
    .map((subitem) => {
      const itemIndex = tipo.subitems.indexOf(subitem);
      return `
        <tr>
          <th>
            <input type="text" value="${escapeAttribute(subitem.nombre)}" data-doc-type="${typeIndex}" data-doc-item="${itemIndex}" data-doc-field="nombre" aria-label="Nombre del cargo docente">
          </th>
          ${TEACHING_APPOINTMENT_ORIGINS.map((origin) => {
            const points = teachingOriginPoint(subitem, origin.id);
            return `
              <td>
                <input type="number" min="0" step="0.01" value="${editableNumber(points, 3)}" data-doc-origin-type="${typeIndex}" data-doc-origin-item="${itemIndex}" data-doc-origin-id="${origin.id}" aria-label="Puntaje de ${escapeAttribute(subitem.nombre)} en ${escapeAttribute(origin.nombre)}">
                <small>
                  S <output data-doc-origin-simple="${typeIndex}:${itemIndex}:${origin.id}">${formatNumber(docentesRelativizedValue(points, getDocentesMaxSimple()))}</output>
                  · E <output data-doc-origin-exclusive="${typeIndex}:${itemIndex}:${origin.id}">${formatNumber(docentesRelativizedValue(points, getDocentesMaxExclusiva()))}</output>
                </small>
              </td>
            `;
          }).join("")}
        </tr>
      `;
    }).join("");
  return `
    <div class="publication-score-table-shell">
      <table class="publication-score-table teaching-origin-score-table">
        <thead>
          <tr>
            <th>Cargo y designación</th>
            ${TEACHING_APPOINTMENT_ORIGINS.map((origin) => `<th>${origin.nombre}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderDocentesConfig() {
  const container = document.querySelector("#docentes-types-list");
  container.innerHTML = "";
  state.antecedentesDocentes.tipos.forEach((tipo, typeIndex) => {
    const section = document.createElement("section");
    section.className = `teaching-type${tipo.modo === "eadis" ? " is-eadis" : ""}`;
    const subitems = tipo.subitems.map((subitem, itemIndex) => ({ subitem, itemIndex }))
      .filter(({ subitem }) => !TEACHING_ORIGIN_ITEM_IDS.has(subitem.id))
      .map(({ subitem, itemIndex }) => `
      <div class="teaching-subitem-row">
        <input type="text" value="${escapeAttribute(subitem.nombre)}" data-doc-type="${typeIndex}" data-doc-item="${itemIndex}" data-doc-field="nombre" aria-label="Nombre del subítem">
        <input type="number" min="0" step="0.01" value="${subitem.puntos}" data-doc-type="${typeIndex}" data-doc-item="${itemIndex}" data-doc-field="puntos" aria-label="Puntaje Simple">
        <output class="teaching-derived-value" data-doc-item-simple="${typeIndex}:${itemIndex}" ${calculationAttribute(`${formatNumber(subitem.puntos)} × ${formatNumber(getDocentesMaxSimple())} ÷ ${formatNumber(docentesInternalMax())} = ${formatNumber(docentesRelativizedValue(subitem.puntos, getDocentesMaxSimple()))}`)}>${formatNumber(docentesRelativizedValue(subitem.puntos, getDocentesMaxSimple()))}</output>
        <output class="teaching-derived-value" data-doc-item-exclusive="${typeIndex}:${itemIndex}" ${calculationAttribute(`${formatNumber(subitem.puntos)} × ${formatNumber(getDocentesMaxExclusiva())} ÷ ${formatNumber(docentesInternalMax())} = ${formatNumber(docentesRelativizedValue(subitem.puntos, getDocentesMaxExclusiva()))}`)}>${formatNumber(docentesRelativizedValue(subitem.puntos, getDocentesMaxExclusiva()))}</output>
      </div>
    `).join("");
    const originTable = tipo.id === "cargo" ? teachingOriginConfigTable(tipo, typeIndex) : "";
    section.innerHTML = `
      <div class="teaching-type-header">
        <label>
          Tipo de antecedente
          <input type="text" value="${escapeAttribute(tipo.nombre)}" data-doc-type="${typeIndex}" data-doc-type-field="nombre">
        </label>
        <label>
          Tope base
          <input type="number" min="0" step="0.1" value="${tipo.maxSimple}" data-doc-type="${typeIndex}" data-doc-type-field="maxSimple">
        </label>
        <label>
          Tope Simple relativizado
          <output class="teaching-derived-value" data-doc-type-simple="${typeIndex}" ${calculationAttribute(`${formatNumber(tipo.maxSimple)} × ${formatNumber(getDocentesMaxSimple())} ÷ ${formatNumber(docentesInternalMax())} = ${formatNumber(docentesRelativizedValue(tipo.maxSimple, getDocentesMaxSimple()))}`)}>${formatNumber(docentesRelativizedValue(tipo.maxSimple, getDocentesMaxSimple()))}</output>
        </label>
        <label>
          Tope Exclusiva relativizado
          <output class="teaching-derived-value" data-doc-type-exclusive="${typeIndex}" ${calculationAttribute(`${formatNumber(tipo.maxSimple)} × ${formatNumber(getDocentesMaxExclusiva())} ÷ ${formatNumber(docentesInternalMax())} = ${formatNumber(docentesRelativizedValue(tipo.maxSimple, getDocentesMaxExclusiva()))}`)}>${formatNumber(docentesRelativizedValue(tipo.maxSimple, getDocentesMaxExclusiva()))}</output>
        </label>
      </div>
      ${originTable}
      <div class="teaching-subitems-heading">
        <span>${tipo.modo === "eadis" ? "Tramo de promedio EADIS" : "Subítem"}</span>
        <span>Puntaje base</span>
        <span>Simple relativizado</span>
        <span>Exclusiva relativizada</span>
      </div>
      <div>${subitems}</div>
      <div class="teaching-type-actions">
        <button class="small-button" type="button" data-add-doc-item="${typeIndex}">Agregar subítem</button>
      </div>
    `;
    container.appendChild(section);
  });

  container.querySelectorAll("[data-doc-type-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.antecedentesDocentes.tipos[Number(event.target.dataset.docType)];
      tipo[event.target.dataset.docTypeField] = event.target.dataset.docTypeField === "maxSimple"
        ? Number(event.target.value)
        : event.target.value;
      updateDocentesConfigDerived();
      saveState();
    });
    input.addEventListener("change", () => {
      renderDocentesMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-doc-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.antecedentesDocentes.tipos[Number(event.target.dataset.docType)];
      const subitem = tipo.subitems[Number(event.target.dataset.docItem)];
      subitem[event.target.dataset.docField] = ["puntos", "min"].includes(event.target.dataset.docField)
        ? Number(event.target.value)
        : event.target.value;
      updateDocentesConfigDerived();
      saveState();
    });
    input.addEventListener("change", () => {
      renderDocentesMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-doc-origin-id]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.antecedentesDocentes.tipos[Number(event.target.dataset.docOriginType)];
      const subitem = tipo.subitems[Number(event.target.dataset.docOriginItem)];
      subitem.puntajesOrigen ||= {};
      subitem.puntajesOrigen[event.target.dataset.docOriginId] = Number(event.target.value);
      updateDocentesConfigDerived();
      saveState();
    });
    input.addEventListener("change", () => {
      renderDocentesMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-add-doc-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const tipo = state.antecedentesDocentes.tipos[Number(button.dataset.addDocItem)];
      const item = {
        id: `doc_item_${Date.now()}`,
        nombre: tipo.modo === "eadis" ? "Nuevo tramo" : "Nuevo subítem",
        puntos: 0
      };
      if (tipo.modo === "eadis") item.min = 0;
      tipo.subitems.push(item);
      render();
    });
  });
  renderDocentesConfigSummary();
}

function updateDocentesConfigDerived() {
  state.antecedentesDocentes.tipos.forEach((tipo, typeIndex) => {
    const typeSimple = document.querySelector(`[data-doc-type-simple="${typeIndex}"]`);
    const typeExclusive = document.querySelector(`[data-doc-type-exclusive="${typeIndex}"]`);
    if (typeSimple) {
      typeSimple.textContent = formatNumber(docentesRelativizedValue(tipo.maxSimple, getDocentesMaxSimple()));
      updateCalculation(typeSimple, `${formatNumber(tipo.maxSimple)} × ${formatNumber(getDocentesMaxSimple())} ÷ ${formatNumber(docentesInternalMax())} = ${typeSimple.textContent}`);
    }
    if (typeExclusive) {
      typeExclusive.textContent = formatNumber(docentesRelativizedValue(tipo.maxSimple, getDocentesMaxExclusiva()));
      updateCalculation(typeExclusive, `${formatNumber(tipo.maxSimple)} × ${formatNumber(getDocentesMaxExclusiva())} ÷ ${formatNumber(docentesInternalMax())} = ${typeExclusive.textContent}`);
    }
    tipo.subitems.forEach((subitem, itemIndex) => {
      if (TEACHING_ORIGIN_ITEM_IDS.has(subitem.id)) {
        TEACHING_APPOINTMENT_ORIGINS.forEach((origin) => {
          const points = teachingOriginPoint(subitem, origin.id);
          const originSimple = document.querySelector(`[data-doc-origin-simple="${typeIndex}:${itemIndex}:${origin.id}"]`);
          const originExclusive = document.querySelector(`[data-doc-origin-exclusive="${typeIndex}:${itemIndex}:${origin.id}"]`);
          if (originSimple) {
            originSimple.textContent = formatNumber(docentesRelativizedValue(points, getDocentesMaxSimple()));
            updateCalculation(originSimple, `${formatNumber(points)} × ${formatNumber(getDocentesMaxSimple())} ÷ ${formatNumber(docentesInternalMax())} = ${originSimple.textContent}`);
          }
          if (originExclusive) {
            originExclusive.textContent = formatNumber(docentesRelativizedValue(points, getDocentesMaxExclusiva()));
            updateCalculation(originExclusive, `${formatNumber(points)} × ${formatNumber(getDocentesMaxExclusiva())} ÷ ${formatNumber(docentesInternalMax())} = ${originExclusive.textContent}`);
          }
        });
        return;
      }
      const itemSimple = document.querySelector(`[data-doc-item-simple="${typeIndex}:${itemIndex}"]`);
      const itemExclusive = document.querySelector(`[data-doc-item-exclusive="${typeIndex}:${itemIndex}"]`);
      if (itemSimple) {
        itemSimple.textContent = formatNumber(docentesRelativizedValue(subitem.puntos, getDocentesMaxSimple()));
        updateCalculation(itemSimple, `${formatNumber(subitem.puntos)} × ${formatNumber(getDocentesMaxSimple())} ÷ ${formatNumber(docentesInternalMax())} = ${itemSimple.textContent}`);
      }
      if (itemExclusive) {
        itemExclusive.textContent = formatNumber(docentesRelativizedValue(subitem.puntos, getDocentesMaxExclusiva()));
        updateCalculation(itemExclusive, `${formatNumber(subitem.puntos)} × ${formatNumber(getDocentesMaxExclusiva())} ÷ ${formatNumber(docentesInternalMax())} = ${itemExclusive.textContent}`);
      }
    });
  });
  renderDocentesConfigSummary();
}

function restoreDocentesDefaults() {
  const cargas = state.antecedentesDocentes.cargas;
  const { modalidad, participacion, cargasEvaluadores, anotaciones } = state.antecedentesDocentes;
  state.antecedentesDocentes = {
    modalidad,
    participacion,
    cargasEvaluadores,
    anotaciones,
    factorDege: initialState.antecedentesDocentes.factorDege,
    factorOtroDepto: initialState.antecedentesDocentes.factorOtroDepto,
    tipos: clone(initialState.antecedentesDocentes.tipos),
    cargas
  };
  seedDocentes(state);
  render();
}

function renderDocentesConfigSummary() {
  const internalMax = docentesInternalMax();
  const agreedSimple = getDocentesMaxSimple();
  const agreedExclusive = getDocentesMaxExclusiva();
  const internalBreakdown = state.antecedentesDocentes.tipos
    .map((tipo) => formatNumber(tipo.maxSimple))
    .join(" + ");
  const simpleFactor = internalMax ? agreedSimple / internalMax : 0;
  const exclusiveFactor = internalMax ? agreedExclusive / internalMax : 0;
  const summary = document.querySelector("#docentes-config-summary");
  summary.className = "weight-summary";
  summary.innerHTML = `
    <span>
      Escala interna: ${internalBreakdown} = ${formatNumber(internalMax)}
      <small>Suma de los topes. JTP y Ayte. 1ra se valoran según el ámbito donde se ejerció cada cargo.</small>
    </span>
    <span>
      Simple acordado: ${formatNumber(agreedSimple)}
      <small>Tomado de Puntajes. Factor proporcional: ${formatNumber(simpleFactor, 3)}.</small>
    </span>
    <span>
      Exclusiva acordado: ${formatNumber(agreedExclusive)}
      <small>Tomado de Puntajes. Factor proporcional: ${formatNumber(exclusiveFactor, 3)}.</small>
    </span>
  `;
  updateCalculation(
    summary,
    `Escala interna: ${internalBreakdown} = ${formatNumber(internalMax)}\n`
      + `Simple: ${formatNumber(agreedSimple)} ÷ ${formatNumber(internalMax)} = ${formatNumber(simpleFactor, 3)}\n`
      + `Exclusiva: ${formatNumber(agreedExclusive)} ÷ ${formatNumber(internalMax)} = ${formatNumber(exclusiveFactor, 3)}`
  );
  summary.tabIndex = 0;
}

function teachingOriginSaturation(subitem, postulante, cargas) {
  const cargoType = state.antecedentesDocentes.tipos.find((tipo) => tipo.id === "cargo");
  const score = docentesSubitemRawScore(subitem, cargas[postulante.id]);
  const baseCap = Number(cargoType?.maxSimple || 0);
  const simple = docentesRelativizedValue(score, getDocentesMaxSimple());
  const exclusive = docentesRelativizedValue(score, getDocentesMaxExclusiva());
  const simpleCap = docentesRelativizedValue(baseCap, getDocentesMaxSimple());
  const exclusiveCap = docentesRelativizedValue(baseCap, getDocentesMaxExclusiva());
  const simpleSaturated = Boolean(postulante.simple && simpleCap > 0 && simple >= simpleCap);
  const exclusiveSaturated = Boolean(postulante.exclusiva && exclusiveCap > 0 && exclusive >= exclusiveCap);
  return {
    any: simpleSaturated || exclusiveSaturated,
    cargos: [simpleSaturated ? "Simple" : "", exclusiveSaturated ? "Exclusiva" : ""].filter(Boolean)
  };
}

function teachingOriginCellContent(subitem, postulante, cargas) {
  const years = teachingOriginYears(subitem, postulante.id, cargas);
  const score = docentesSubitemRawScore(subitem, cargas[postulante.id]);
  const saturation = teachingOriginSaturation(subitem, postulante, cargas);
  return years
    ? `
        <span class="publication-cell-count">${formatNumber(years, Number.isInteger(years) ? 0 : 2)} años</span>
        <span class="publication-cell-scores${saturation.any ? " is-saturated" : ""}">${saturation.any ? `<span class="visually-hidden">Tope alcanzado en ${saturation.cargos.join(" y ")}. </span>` : ""}S ${postulante.simple ? formatNumber(docentesRelativizedValue(score, getDocentesMaxSimple())) : "—"} · E ${postulante.exclusiva ? formatNumber(docentesRelativizedValue(score, getDocentesMaxExclusiva())) : "—"}</span>
      `
    : `<span class="publication-cell-empty" aria-hidden="true"></span>`;
}

function teachingOriginCellExplanation(subitem, postulanteId, cargas) {
  const postulante = state.postulantes.find((item) => item.id === postulanteId);
  const score = docentesSubitemRawScore(subitem, cargas[postulanteId]);
  const saturation = teachingOriginSaturation(subitem, postulante, cargas);
  const saturationNote = saturation.any ? `\nTope alcanzado en: ${saturation.cargos.join(" y ")}.` : "";
  return `${teachingOriginExplanation(subitem, postulanteId, cargas)}\nSubtotal base: ${formatNumber(score)}\nSimple: ${formatNumber(docentesRelativizedValue(score, getDocentesMaxSimple()))}\nExclusiva: ${formatNumber(docentesRelativizedValue(score, getDocentesMaxExclusiva()))}${saturationNote}`;
}

function teachingOriginMatrixRow(subitem, postulantes, cargas, module) {
  return `
    <tr>
      <th class="matrix-label">${escapeAttribute(subitem.nombre)}<span>Años según ámbito del cargo</span></th>
      ${postulantes.map((postulante) => {
        const difference = activeDocentesCargaId === "consolidada" && module.modalidad === "evaluadores"
          ? teachingOriginDifference(module, postulante.id, subitem)
          : { differs: false, explanation: "" };
        const explanation = difference.differs
          ? `${teachingOriginCellExplanation(subitem, postulante.id, cargas)}\n\nDiferencia entre evaluadores:\n${difference.explanation}`
          : teachingOriginCellExplanation(subitem, postulante.id, cargas);
        return `
          <td class="publication-compact-cell${difference.differs ? " has-difference" : ""}">
            <button type="button" class="publication-cell-button" data-open-teaching-origin="${subitem.id}:${postulante.id}" aria-label="Editar ${escapeAttribute(subitem.nombre)} de ${escapeAttribute(postulante.apellidos)}, ${escapeAttribute(postulante.nombres)}" ${calculationAttribute(explanation)}>
              ${teachingOriginCellContent(subitem, postulante, cargas)}
            </button>
          </td>
        `;
      }).join("")}
    </tr>
  `;
}

function updateTeachingOriginCell(subitem, postulante, cargas) {
  const button = document.querySelector(`[data-open-teaching-origin="${subitem.id}:${postulante.id}"]`);
  if (!button) return;
  button.innerHTML = teachingOriginCellContent(subitem, postulante, cargas);
  updateCalculation(button, teachingOriginCellExplanation(subitem, postulante.id, cargas));
}

function openTeachingOriginEditor(subitem, postulante, cargas, module) {
  const dialog = document.querySelector("#teaching-origin-editor");
  if (!dialog) return;
  dialog.innerHTML = `
    <div class="publication-editor-heading">
      <div>
        <span>${candidateNameHtml(postulante)}</span>
        <h3>${escapeAttribute(subitem.nombre)}</h3>
      </div>
      <button class="icon-button publication-editor-close" type="button" data-close-teaching-origin-editor aria-label="Cerrar">×</button>
    </div>
    <div class="publication-editor-columns" aria-hidden="true">
      <span>Ámbito donde ejerció el cargo</span>
      <span>Años</span>
      <span>Puntaje por año</span>
    </div>
    <div class="publication-editor-fields">
      ${TEACHING_APPOINTMENT_ORIGINS.map((origin) => {
        const fieldId = teachingOriginFieldId(subitem.id, origin.id);
        const storedValue = cargas[postulante.id].valores[fieldId] ?? "";
        const value = storedValue === "" ? "" : positiveYears(storedValue);
        const points = teachingOriginPoint(subitem, origin.id);
        return `
          <label>
            <span>${origin.nombre}</span>
            <input type="number" min="0" step="0.1" inputmode="decimal" value="${value === "" ? "" : editableNumber(value, 1)}" data-teaching-origin-value="${fieldId}" aria-label="Años en ${escapeAttribute(origin.nombre)}">
            <small>${formatNumber(points)} base · S ${formatNumber(docentesRelativizedValue(points, getDocentesMaxSimple()))} · E ${formatNumber(docentesRelativizedValue(points, getDocentesMaxExclusiva()))}</small>
          </label>
        `;
      }).join("")}
    </div>
    <div class="publication-editor-summary" data-teaching-origin-summary></div>
  `;

  const refreshSummary = () => {
    const years = teachingOriginYears(subitem, postulante.id, cargas);
    const score = docentesSubitemRawScore(subitem, cargas[postulante.id]);
    dialog.querySelector("[data-teaching-origin-summary]").innerHTML = `
      <span>${formatNumber(years, Number.isInteger(years) ? 0 : 2)} ${years === 1 ? "año" : "años"}</span>
      <strong>Base ${formatNumber(score)} · Simple ${formatNumber(docentesRelativizedValue(score, getDocentesMaxSimple()))} · Exclusiva ${formatNumber(docentesRelativizedValue(score, getDocentesMaxExclusiva()))}</strong>
    `;
  };

  dialog.querySelectorAll("[data-teaching-origin-value]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const fieldId = event.target.dataset.teachingOriginValue;
      const rawValue = event.target.value;
      const decimalValue = rawValue === "" ? "" : positiveYears(rawValue);
      cargas[postulante.id].valores[fieldId] = decimalValue;
      if (activeDocentesCargaId !== "consolidada") {
        syncConsolidatedAntecedentField(module, postulante.id, fieldId);
      }
      refreshSummary();
      updateTeachingOriginCell(subitem, postulante, cargas);
      updateDocentesCandidate(postulante.id, cargas);
      renderResultados();
      renderMerit();
      saveState();
    });
  });
  dialog.querySelector("[data-close-teaching-origin-editor]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    renderDocentesMatrix();
    window.collaboration?.applyPermissions?.();
  }, { once: true });
  refreshSummary();
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  window.collaboration?.applyPermissions?.();
}

function renderDocentesMatrix() {
  const container = document.querySelector("#docentes-matrix");
  const module = state.antecedentesDocentes;
  if (module.modalidad !== "evaluadores") activeDocentesCargaId = "consolidada";
  const cargas = antecedentCargas(module, activeDocentesCargaId);
  renderAntecedentEvaluationControls(
    "antecedentesDocentes",
    activeDocentesCargaId,
    (value) => { activeDocentesCargaId = value; },
    renderDocentesMatrix
  );
  const teachingTypeInstruction = (tipo) => {
    if (tipo.id === "cargo") return "Ingrese los años de docencia correspondientes a cada categoría.";
    if (tipo.id === "eadis") return "Ingrese el puntaje promedio EADI de los últimos cinco años.";
    if (tipo.id === "cursos") return "Ingrese la cantidad de cursos realizados en cada categoría.";
    if (tipo.id === "otros") return "Ingrese la cantidad de antecedentes correspondientes a cada categoría.";
    return "Ingrese la cantidad correspondiente.";
  };
  const candidateHeaders = state.postulantes.map((postulante) => `
    <th>${candidateNameHtml(postulante, { department: true })}</th>
  `).join("");

  const groups = state.antecedentesDocentes.tipos.map((tipo, typeIndex) => {
    const inputRows = tipo.modo === "eadis"
      ? `
        <tr>
          <th class="matrix-label">Puntaje promedio EADI <span>Escala de 0 a 5</span></th>
          ${state.postulantes.map((postulante) => {
            const value = cargas[postulante.id].valores[tipo.id] ?? "";
            const difference = activeDocentesCargaId === "consolidada" && module.modalidad === "evaluadores"
              ? antecedentDifference(module, postulante.id, tipo.id)
              : { differs: false, explanation: "" };
            return `<td class="note-cell${difference.differs ? " has-difference" : ""}"><input type="number" min="0" max="5" step="0.01" value="${value}" data-doc-value="${tipo.id}" data-postulante-id="${postulante.id}" ${difference.differs ? calculationAttribute(`Diferencia entre evaluadores:\n${difference.explanation}`) : ""}></td>`;
          }).join("")}
        </tr>
      `
      : tipo.subitems.map((subitem) => TEACHING_ORIGIN_ITEM_IDS.has(subitem.id)
        ? teachingOriginMatrixRow(subitem, state.postulantes, cargas, module)
        : `
        <tr>
          <th class="matrix-label">
            ${subitem.nombre}
            <span>${formatNumber(subitem.puntos)} puntos por unidad</span>
          </th>
          ${state.postulantes.map((postulante) => {
            const value = cargas[postulante.id].valores[subitem.id] ?? "";
            const difference = activeDocentesCargaId === "consolidada" && module.modalidad === "evaluadores"
              ? antecedentDifference(module, postulante.id, subitem.id)
              : { differs: false, explanation: "" };
            return `<td class="note-cell${difference.differs ? " has-difference" : ""}"><input type="number" min="0" step="0.01" value="${value}" data-doc-value="${subitem.id}" data-postulante-id="${postulante.id}" ${difference.differs ? calculationAttribute(`Diferencia entre evaluadores:\n${difference.explanation}`) : ""}></td>`;
          }).join("")}
        </tr>
      `).join("");
    const subtotal = `
      <tr class="teaching-subtotal-row">
        <th class="matrix-label">Subtotal ${tipo.nombre}</th>
        ${state.postulantes.map((postulante) => `
          <td class="score-cell"><strong class="${saturationClass(docentesTipoRawScore(tipo, postulante.id, cargas), tipo.maxSimple).trim()}" data-doc-subtotal="${tipo.id}:${postulante.id}" ${calculationAttribute(docentesTipoExplanation(tipo, postulante.id, cargas))}>${formatNumber(docentesTipoScore(tipo, postulante.id, cargas))}</strong></td>
        `).join("")}
      </tr>
    `;
    return `
      <details class="scientific-entry-group" ${typeIndex === 0 ? "open" : ""}>
        <summary>
          <strong>${tipo.nombre}</strong>
          <small>${teachingTypeInstruction(tipo)}</small>
          <span>Tope base: ${formatNumber(tipo.maxSimple)}</span>
        </summary>
        <div class="opposition-grid">
          <table class="data-table opposition-matrix">
            <thead>
              <tr>
                <th class="matrix-label">Antecedente docente</th>
                ${candidateHeaders}
              </tr>
            </thead>
            <tbody>
              ${inputRows}
              ${subtotal}
            </tbody>
          </table>
        </div>
      </details>
    `;
  }).join("");

  container.innerHTML = `
    <div class="${activeDocentesCargaId === "consolidada" ? "" : "evaluator-colored-load"}" ${activeDocentesCargaId === "consolidada" ? "" : `style="${evaluatorStyle(activeDocentesCargaId)}"`}>
      <div class="scientific-entry-list">${groups}</div>
      <div class="opposition-grid scientific-totals">
        <table class="data-table opposition-matrix">
          <thead>
            <tr>
              <th class="matrix-label">Resultado docente</th>
              ${candidateHeaders}
            </tr>
          </thead>
          <tbody>
          <tr class="teaching-total-row">
            <th class="matrix-label">Puntaje base total <span>Escala de ${formatNumber(docentesInternalMax())} puntos</span></th>
            ${state.postulantes.map((postulante) => `
              <td class="score-cell"><strong class="${saturationClass(docentesInternalScore(postulante.id, cargas), docentesInternalMax()).trim()}" data-doc-internal="${postulante.id}" ${calculationAttribute(docentesInternalExplanation(postulante.id, cargas))}>${formatNumber(docentesInternalScore(postulante.id, cargas))}</strong></td>
            `).join("")}
          </tr>
          <tr class="teaching-total-row">
            <th class="matrix-label">Total Simple relativizado <span>Máximo acordado ${formatNumber(getDocentesMaxSimple())}</span></th>
            ${state.postulantes.map((postulante) => `
              <td class="score-cell result-simple"><strong class="${postulante.simple ? saturationClass(docentesInternalScore(postulante.id, cargas), docentesInternalMax()).trim() : ""}" data-doc-simple="${postulante.id}" ${calculationAttribute(docentesRelativizedExplanationFromCargas(postulante.id, getDocentesMaxSimple(), "Simple", cargas))}>${postulante.simple ? formatNumber(docentesRelativizedValue(docentesInternalScore(postulante.id, cargas), getDocentesMaxSimple())) : "—"}</strong></td>
            `).join("")}
          </tr>
          <tr class="teaching-total-row">
            <th class="matrix-label">Total Exclusiva relativizado <span>Máximo acordado ${formatNumber(getDocentesMaxExclusiva())}</span></th>
            ${state.postulantes.map((postulante) => `
              <td class="score-cell result-exclusiva"><strong class="${postulante.exclusiva ? saturationClass(docentesInternalScore(postulante.id, cargas), docentesInternalMax()).trim() : ""}" data-doc-exclusive="${postulante.id}" ${calculationAttribute(docentesRelativizedExplanationFromCargas(postulante.id, getDocentesMaxExclusiva(), "Exclusiva", cargas))}>${postulante.exclusiva ? formatNumber(docentesRelativizedValue(docentesInternalScore(postulante.id, cargas), getDocentesMaxExclusiva())) : "—"}</strong></td>
            `).join("")}
          </tr>
          </tbody>
        </table>
      </div>
      ${renderAntecedentNotesSection(module, activeDocentesCargaId)}
      <dialog id="teaching-origin-editor" class="publication-editor teaching-origin-editor"></dialog>
    </div>
  `;

  attachAntecedentNotesHandler(container, module, activeDocentesCargaId);

  const cargoType = module.tipos.find((tipo) => tipo.id === "cargo");
  if (cargoType) {
    container.querySelectorAll("[data-open-teaching-origin]").forEach((button) => {
      button.addEventListener("click", () => {
        const [subitemId, postulanteId] = button.dataset.openTeachingOrigin.split(":");
        const subitem = cargoType.subitems.find((item) => item.id === subitemId);
        const postulante = state.postulantes.find((item) => item.id === postulanteId);
        if (subitem && postulante) openTeachingOriginEditor(subitem, postulante, cargas, module);
      });
    });
  }

  container.querySelectorAll("[data-doc-value]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const postulanteId = event.target.dataset.postulanteId;
      cargas[postulanteId].valores[event.target.dataset.docValue] = event.target.value;
      if (activeDocentesCargaId === "consolidada") {
        updateDocentesCandidate(postulanteId);
      } else {
        syncConsolidatedAntecedentField(module, postulanteId, event.target.dataset.docValue);
        updateDocentesCandidate(postulanteId, cargas);
      }
      scheduleDerivedViewsRender();
      saveState();
    });
  });
}

function updateDocentesCandidate(postulanteId, cargas = state.antecedentesDocentes.cargas) {
  state.antecedentesDocentes.tipos.forEach((tipo) => {
    const subtotal = document.querySelector(`[data-doc-subtotal="${tipo.id}:${postulanteId}"]`);
    if (subtotal) {
      subtotal.textContent = formatNumber(docentesTipoScore(tipo, postulanteId, cargas));
      updateCalculation(subtotal, docentesTipoExplanation(tipo, postulanteId, cargas));
      updateSaturation(subtotal, docentesTipoRawScore(tipo, postulanteId, cargas), tipo.maxSimple);
    }
  });
  const postulante = state.postulantes.find((item) => item.id === postulanteId);
  const internal = document.querySelector(`[data-doc-internal="${postulanteId}"]`);
  const simple = document.querySelector(`[data-doc-simple="${postulanteId}"]`);
  const exclusive = document.querySelector(`[data-doc-exclusive="${postulanteId}"]`);
  const internalScore = docentesInternalScore(postulanteId, cargas);
  if (internal) {
    internal.textContent = formatNumber(internalScore);
    updateCalculation(internal, docentesInternalExplanation(postulanteId, cargas));
    updateSaturation(internal, internalScore, docentesInternalMax());
  }
  if (simple) {
    simple.textContent = postulante.simple ? formatNumber(docentesRelativizedValue(internalScore, getDocentesMaxSimple())) : "—";
    updateCalculation(simple, docentesRelativizedExplanationFromCargas(postulanteId, getDocentesMaxSimple(), "Simple", cargas));
    updateSaturation(simple, postulante.simple ? internalScore : 0, docentesInternalMax());
  }
  if (exclusive) {
    exclusive.textContent = postulante.exclusiva ? formatNumber(docentesRelativizedValue(internalScore, getDocentesMaxExclusiva())) : "—";
    updateCalculation(exclusive, docentesRelativizedExplanationFromCargas(postulanteId, getDocentesMaxExclusiva(), "Exclusiva", cargas));
    updateSaturation(exclusive, postulante.exclusiva ? internalScore : 0, docentesInternalMax());
  }
}

function publicationConfigSection(tipo, typeIndex) {
  const groups = scientificPublicationGroups(tipo);
  const rows = groups.map((group) => `
    <tr>
      <th>
        <input type="text" value="${escapeAttribute(group.nombre)}" data-cien-publication-group-name="${group.id}" data-cien-type="${typeIndex}" aria-label="Tipo de publicación">
      </th>
      ${group.subitems.map((subitem) => {
        const itemIndex = tipo.subitems.indexOf(subitem);
        return `
          <td${scientificPublicationGroupIsSingleScore(group) ? ` colspan="${PUBLICATION_AUTHOR_POSITIONS.length}"` : ""}>
            <input type="number" min="0" step="0.01" value="${editableNumber(subitem.puntos, 2)}" data-cien-type="${typeIndex}" data-cien-item="${itemIndex}" data-cien-field="puntos" aria-label="Puntaje de ${escapeAttribute(group.nombre)}, ${escapeAttribute(subitem.posicionNombre)}">
            <small>
              S <output data-cien-item-simple="${typeIndex}:${itemIndex}">${formatNumber(cientificosRelativizedValue(subitem.puntos, getCientificosMaxSimple()))}</output>
              · E <output data-cien-item-exclusive="${typeIndex}:${itemIndex}">${formatNumber(cientificosRelativizedValue(subitem.puntos, getCientificosMaxExclusiva()))}</output>
            </small>
          </td>
        `;
      }).join("")}
    </tr>
  `).join("");
  return `
    <section class="teaching-type publication-config-type">
      <div class="teaching-type-header">
        <label>
          Tipo de antecedente
          <input type="text" value="${escapeAttribute(tipo.nombre)}" data-cien-type="${typeIndex}" data-cien-type-field="nombre">
        </label>
        <label>
          Tope interno
          <input type="number" min="0" step="0.01" value="${editableNumber(tipo.maxInterno, 2)}" data-cien-type="${typeIndex}" data-cien-type-field="maxInterno">
        </label>
        <label>
          Tope Simple relativizado
          <output class="teaching-derived-value" data-cien-type-simple="${typeIndex}">${formatNumber(cientificosRelativizedValue(tipo.maxInterno, getCientificosMaxSimple()))}</output>
        </label>
        <label>
          Tope Exclusiva relativizado
          <output class="teaching-derived-value" data-cien-type-exclusive="${typeIndex}">${formatNumber(cientificosRelativizedValue(tipo.maxInterno, getCientificosMaxExclusiva()))}</output>
        </label>
      </div>
      <div class="publication-score-table-shell">
        <table class="publication-score-table">
          <thead>
            <tr>
              <th>Tipo de publicación</th>
              ${PUBLICATION_AUTHOR_POSITIONS.map((position) => `<th>${position.nombre}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="teaching-type-actions">
        <button class="small-button" type="button" data-add-publication-group="${typeIndex}">Agregar tipo de publicación</button>
      </div>
    </section>
  `;
}

function renderCientificosConfig() {
  const container = document.querySelector("#cientificos-types-list");
  container.innerHTML = "";
  state.antecedentesCientificos.tipos.forEach((tipo, typeIndex) => {
    if (tipo.id === "publicaciones") {
      container.insertAdjacentHTML("beforeend", publicationConfigSection(tipo, typeIndex));
      return;
    }
    const section = document.createElement("section");
    section.className = "teaching-type";
    const subitems = tipo.subitems.map((subitem, itemIndex) => `
      <div class="teaching-subitem-row">
        <input type="text" value="${escapeAttribute(subitem.nombre)}" data-cien-type="${typeIndex}" data-cien-item="${itemIndex}" data-cien-field="nombre" aria-label="Nombre del subítem científico">
        <input type="number" min="0" step="0.01" value="${editableNumber(subitem.puntos, 2)}" data-cien-type="${typeIndex}" data-cien-item="${itemIndex}" data-cien-field="puntos" aria-label="Puntaje interno">
        <output class="teaching-derived-value" data-cien-item-simple="${typeIndex}:${itemIndex}">${formatNumber(cientificosRelativizedValue(subitem.puntos, getCientificosMaxSimple()))}</output>
        <output class="teaching-derived-value" data-cien-item-exclusive="${typeIndex}:${itemIndex}">${formatNumber(cientificosRelativizedValue(subitem.puntos, getCientificosMaxExclusiva()))}</output>
      </div>
    `).join("");
    section.innerHTML = `
      <div class="teaching-type-header">
        <label>
          Tipo de antecedente
          <input type="text" value="${escapeAttribute(tipo.nombre)}" data-cien-type="${typeIndex}" data-cien-type-field="nombre">
        </label>
        <label>
          Tope interno
          <input type="number" min="0" step="0.01" value="${editableNumber(tipo.maxInterno, 2)}" data-cien-type="${typeIndex}" data-cien-type-field="maxInterno">
        </label>
        <label>
          Tope Simple relativizado
          <output class="teaching-derived-value" data-cien-type-simple="${typeIndex}">${formatNumber(cientificosRelativizedValue(tipo.maxInterno, getCientificosMaxSimple()))}</output>
        </label>
        <label>
          Tope Exclusiva relativizado
          <output class="teaching-derived-value" data-cien-type-exclusive="${typeIndex}">${formatNumber(cientificosRelativizedValue(tipo.maxInterno, getCientificosMaxExclusiva()))}</output>
        </label>
      </div>
      <div class="teaching-subitems-heading">
        <span>Subítem</span>
        <span>Puntaje interno</span>
        <span>Simple relativizado</span>
        <span>Exclusiva relativizada</span>
      </div>
      <div>${subitems}</div>
      <div class="teaching-type-actions">
        <button class="small-button" type="button" data-add-cien-item="${typeIndex}">Agregar subítem</button>
      </div>
    `;
    container.appendChild(section);
  });

  container.querySelectorAll("[data-cien-type-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.antecedentesCientificos.tipos[Number(event.target.dataset.cienType)];
      tipo[event.target.dataset.cienTypeField] = event.target.dataset.cienTypeField === "maxInterno"
        ? Number(event.target.value)
        : event.target.value;
      updateCientificosConfigDerived();
      saveState();
    });
    input.addEventListener("change", () => {
      renderCientificosMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-cien-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.antecedentesCientificos.tipos[Number(event.target.dataset.cienType)];
      const subitem = tipo.subitems[Number(event.target.dataset.cienItem)];
      subitem[event.target.dataset.cienField] = event.target.dataset.cienField === "puntos"
        ? Number(event.target.value)
        : event.target.value;
      updateCientificosConfigDerived();
      saveState();
    });
    input.addEventListener("change", () => {
      renderCientificosMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-cien-publication-group-name]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.antecedentesCientificos.tipos[Number(event.target.dataset.cienType)];
      const groupId = event.target.dataset.cienPublicationGroupName;
      tipo.subitems.filter((subitem) => subitem.grupoId === groupId).forEach((subitem) => {
        subitem.grupoNombre = event.target.value;
        subitem.nombre = subitem.puntajeUnico ? event.target.value : `${event.target.value} — ${subitem.posicionNombre}`;
      });
      saveState();
    });
    input.addEventListener("change", () => {
      renderCientificosMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-add-cien-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const tipo = state.antecedentesCientificos.tipos[Number(button.dataset.addCienItem)];
      tipo.subitems.push({
        id: `cien_item_${Date.now()}`,
        nombre: "Nuevo subítem",
        puntos: 0
      });
      render();
    });
  });
  container.querySelectorAll("[data-add-publication-group]").forEach((button) => {
    button.addEventListener("click", () => {
      const tipo = state.antecedentesCientificos.tipos[Number(button.dataset.addPublicationGroup)];
      const groupId = `publicacion_${Date.now()}`;
      PUBLICATION_AUTHOR_POSITIONS.forEach((position) => {
        tipo.subitems.push({
          id: `${groupId}_${position.id}`,
          nombre: `Nuevo tipo de publicación — ${position.nombre}`,
          puntos: 0,
          grupoId: groupId,
          grupoNombre: "Nuevo tipo de publicación",
          posicionId: position.id,
          posicionNombre: position.nombre
        });
      });
      render();
    });
  });
  updateCientificosConfigDerived();
}

function updateCientificosConfigDerived() {
  state.antecedentesCientificos.tipos.forEach((tipo, typeIndex) => {
    const typeSimple = document.querySelector(`[data-cien-type-simple="${typeIndex}"]`);
    const typeExclusive = document.querySelector(`[data-cien-type-exclusive="${typeIndex}"]`);
    if (typeSimple) {
      typeSimple.textContent = formatNumber(cientificosRelativizedValue(tipo.maxInterno, getCientificosMaxSimple()));
      updateCalculation(typeSimple, `${formatNumber(tipo.maxInterno)} × ${formatNumber(getCientificosMaxSimple())} ÷ ${formatNumber(cientificosInternalMax())} = ${typeSimple.textContent}`);
      typeSimple.tabIndex = 0;
    }
    if (typeExclusive) {
      typeExclusive.textContent = formatNumber(cientificosRelativizedValue(tipo.maxInterno, getCientificosMaxExclusiva()));
      updateCalculation(typeExclusive, `${formatNumber(tipo.maxInterno)} × ${formatNumber(getCientificosMaxExclusiva())} ÷ ${formatNumber(cientificosInternalMax())} = ${typeExclusive.textContent}`);
      typeExclusive.tabIndex = 0;
    }
    tipo.subitems.forEach((subitem, itemIndex) => {
      const simple = document.querySelector(`[data-cien-item-simple="${typeIndex}:${itemIndex}"]`);
      const exclusive = document.querySelector(`[data-cien-item-exclusive="${typeIndex}:${itemIndex}"]`);
      if (simple) {
        simple.textContent = formatNumber(cientificosRelativizedValue(subitem.puntos, getCientificosMaxSimple()));
        updateCalculation(simple, `${formatNumber(subitem.puntos)} × ${formatNumber(getCientificosMaxSimple())} ÷ ${formatNumber(cientificosInternalMax())} = ${simple.textContent}`);
        simple.tabIndex = 0;
      }
      if (exclusive) {
        exclusive.textContent = formatNumber(cientificosRelativizedValue(subitem.puntos, getCientificosMaxExclusiva()));
        updateCalculation(exclusive, `${formatNumber(subitem.puntos)} × ${formatNumber(getCientificosMaxExclusiva())} ÷ ${formatNumber(cientificosInternalMax())} = ${exclusive.textContent}`);
        exclusive.tabIndex = 0;
      }
    });
  });
  renderCientificosConfigSummary();
}

function renderCientificosConfigSummary() {
  const internalMax = cientificosInternalMax();
  const agreedSimple = getCientificosMaxSimple();
  const agreedExclusive = getCientificosMaxExclusiva();
  const breakdown = state.antecedentesCientificos.tipos
    .map((tipo) => formatNumber(tipo.maxInterno))
    .join(" + ");
  const summary = document.querySelector("#cientificos-config-summary");
  summary.innerHTML = `
    <span>
      Escala interna: ${breakdown} = ${formatNumber(internalMax)}
      <small>Suma de los topes de los cinco bloques científicos.</small>
    </span>
    <span>
      Simple acordado: ${formatNumber(agreedSimple)}
      <small>Factor proporcional: ${formatNumber(internalMax ? agreedSimple / internalMax : 0)}.</small>
    </span>
    <span>
      Exclusiva acordado: ${formatNumber(agreedExclusive)}
      <small>Factor proporcional: ${formatNumber(internalMax ? agreedExclusive / internalMax : 0)}.</small>
    </span>
  `;
  updateCalculation(
    summary,
    `Escala interna: ${breakdown} = ${formatNumber(internalMax)}\n`
      + `Simple: ${formatNumber(agreedSimple)} ÷ ${formatNumber(internalMax)} = ${formatNumber(internalMax ? agreedSimple / internalMax : 0)}\n`
      + `Exclusiva: ${formatNumber(agreedExclusive)} ÷ ${formatNumber(internalMax)} = ${formatNumber(internalMax ? agreedExclusive / internalMax : 0)}`
  );
  summary.tabIndex = 0;
}

function restoreCientificosDefaults() {
  const cargas = state.antecedentesCientificos.cargas;
  const { modalidad, participacion, cargasEvaluadores, anotaciones } = state.antecedentesCientificos;
  state.antecedentesCientificos = {
    modalidad,
    participacion,
    cargasEvaluadores,
    anotaciones,
    tipos: clone(initialState.antecedentesCientificos.tipos),
    cargas
  };
  seedCientificos(state);
  render();
}

function publicationCellContent(tipo, group, postulante, cargas) {
  const count = scientificPublicationGroupCount(group, postulante.id, cargas);
  const internal = scientificPublicationGroupScore(group, postulante.id, cargas);
  const simple = cientificosRelativizedValue(internal, getCientificosMaxSimple());
  const exclusive = cientificosRelativizedValue(internal, getCientificosMaxExclusiva());
  const saturated = (postulante.simple || postulante.exclusiva) && scoreReachesCap(internal, tipo.maxInterno);
  return `
    ${count
      ? `<span class="publication-cell-count">${formatNumber(count, Number.isInteger(count) ? 0 : 2)} pub.</span>
         <span class="publication-cell-scores${saturated ? " is-saturated" : ""}">${saturated ? '<span class="visually-hidden">Tope alcanzado. </span>' : ""}S ${postulante.simple ? formatNumber(simple) : "—"} · E ${postulante.exclusiva ? formatNumber(exclusive) : "—"}</span>`
      : `<span class="publication-cell-empty" aria-hidden="true"></span>`}
  `;
}

function publicationCountText(count) {
  const formatted = formatNumber(count, Number.isInteger(count) ? 0 : 2);
  return `${formatted} ${count === 1 ? "publicación" : "publicaciones"}`;
}

function publicationCellExplanation(tipo, group, postulanteId, cargas) {
  const score = scientificPublicationGroupScore(group, postulanteId, cargas);
  const capNote = scoreReachesCap(score, tipo.maxInterno)
    ? `\nTope del bloque alcanzado: ${formatNumber(tipo.maxInterno)}.`
    : "";
  return `${scientificPublicationGroupExplanation(group, postulanteId, cargas)}${capNote}`;
}

function publicationMatrixRows(tipo, cargas, module) {
  return scientificPublicationGroups(tipo).map((group) => `
    <tr>
      <th class="matrix-label">${escapeAttribute(group.nombre)}<span>${scientificPublicationGroupIsSingleScore(group) ? "Puntaje único, sin posición de autoría" : "Cuatro posiciones de autoría"}</span></th>
      ${state.postulantes.map((postulante) => {
        const difference = activeCientificosCargaId === "consolidada" && module.modalidad === "evaluadores"
          ? scientificPublicationGroupDifference(module, postulante.id, group)
          : { differs: false, explanation: "" };
        const explanation = difference.differs
          ? `${publicationCellExplanation(tipo, group, postulante.id, cargas)}\n\nDiferencia entre evaluadores:\n${difference.explanation}`
          : publicationCellExplanation(tipo, group, postulante.id, cargas);
        return `
          <td class="publication-compact-cell${difference.differs ? " has-difference" : ""}">
            <button type="button" class="publication-cell-button" data-open-publication="${group.id}:${postulante.id}" aria-label="Editar ${escapeAttribute(group.nombre)} de ${escapeAttribute(postulante.apellidos)}, ${escapeAttribute(postulante.nombres)}" ${calculationAttribute(explanation)}>
              ${publicationCellContent(tipo, group, postulante, cargas)}
            </button>
          </td>
        `;
      }).join("")}
    </tr>
  `).join("");
}

function updatePublicationCell(tipo, group, postulante, cargas) {
  const button = document.querySelector(`[data-open-publication="${group.id}:${postulante.id}"]`);
  if (!button) return;
  button.innerHTML = publicationCellContent(tipo, group, postulante, cargas);
  updateCalculation(button, publicationCellExplanation(tipo, group, postulante.id, cargas));
}

function openPublicationEditor(tipo, group, postulante, cargas, module) {
  const dialog = document.querySelector("#publication-editor");
  if (!dialog) return;
  dialog.innerHTML = `
    <div class="publication-editor-heading">
      <div>
        <span>${candidateNameHtml(postulante)}</span>
        <h3>${escapeAttribute(group.nombre)}</h3>
      </div>
      <button class="icon-button publication-editor-close" type="button" data-close-publication-editor aria-label="Cerrar">×</button>
    </div>
    <div class="publication-editor-columns" aria-hidden="true">
      <span>${scientificPublicationGroupIsSingleScore(group) ? "Ítem" : "Posición de autoría"}</span>
      <span>Cantidad</span>
      <span>Puntaje</span>
    </div>
    <div class="publication-editor-fields">
      ${group.subitems.map((subitem) => {
        const value = cargas[postulante.id].valores[subitem.id] ?? "";
        const simple = cientificosRelativizedValue(subitem.puntos, getCientificosMaxSimple());
        const exclusive = cientificosRelativizedValue(subitem.puntos, getCientificosMaxExclusiva());
        return `
          <label>
            <span>${escapeAttribute(scientificPublicationGroupIsSingleScore(group) ? group.nombre : subitem.posicionNombre)}</span>
            <input type="number" min="0" step="1" inputmode="numeric" value="${value === "" ? "" : editableNumber(value, 0)}" data-publication-value="${subitem.id}" aria-label="Cantidad: ${escapeAttribute(scientificPublicationGroupIsSingleScore(group) ? group.nombre : subitem.posicionNombre)}">
            <small>S ${formatNumber(simple)} · E ${formatNumber(exclusive)}</small>
          </label>
        `;
      }).join("")}
    </div>
    <div class="publication-editor-summary" data-publication-editor-summary></div>
  `;

  const refreshSummary = () => {
    const count = scientificPublicationGroupCount(group, postulante.id, cargas);
    const internal = scientificPublicationGroupScore(group, postulante.id, cargas);
    dialog.querySelector("[data-publication-editor-summary]").innerHTML = `
      <span>${publicationCountText(count)}</span>
      <strong>Interno ${formatNumber(internal)} · Simple ${formatNumber(cientificosRelativizedValue(internal, getCientificosMaxSimple()))} · Exclusiva ${formatNumber(cientificosRelativizedValue(internal, getCientificosMaxExclusiva()))}</strong>
    `;
  };

  dialog.querySelectorAll("[data-publication-value]").forEach((input) => {
    input.addEventListener("input", (event) => {
      normalizeIntegerInput(event.target);
      const subitemId = event.target.dataset.publicationValue;
      cargas[postulante.id].valores[subitemId] = event.target.value;
      if (activeCientificosCargaId !== "consolidada") {
        syncConsolidatedAntecedentField(module, postulante.id, subitemId);
      }
      refreshSummary();
      updatePublicationCell(tipo, group, postulante, cargas);
      updateCientificosCandidate(postulante.id, cargas);
      renderResultados();
      renderMerit();
      saveState();
    });
  });
  dialog.querySelector("[data-close-publication-editor]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    renderCientificosMatrix();
    window.collaboration?.applyPermissions?.();
  }, { once: true });
  refreshSummary();
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  window.collaboration?.applyPermissions?.();
}

function renderCientificosMatrix() {
  const container = document.querySelector("#cientificos-matrix");
  const module = state.antecedentesCientificos;
  if (module.modalidad !== "evaluadores") activeCientificosCargaId = "consolidada";
  const cargas = antecedentCargas(module, activeCientificosCargaId);
  renderAntecedentEvaluationControls(
    "antecedentesCientificos",
    activeCientificosCargaId,
    (value) => { activeCientificosCargaId = value; },
    renderCientificosMatrix
  );
  const candidateHeaders = state.postulantes.map((postulante) => `
    <th>${candidateNameHtml(postulante)}</th>
  `).join("");

  const groups = state.antecedentesCientificos.tipos.map((tipo, typeIndex) => `
    <details class="scientific-entry-group" ${typeIndex === 0 ? "open" : ""}>
      <summary>
        <strong>${tipo.nombre}</strong>
        <small>${tipo.instruccion || "Ingrese la cantidad correspondiente."}</small>
        <span>Tope interno: ${formatNumber(tipo.maxInterno)}</span>
      </summary>
      <div class="opposition-grid">
        <table class="data-table opposition-matrix">
          <thead>
            <tr>
              <th class="matrix-label">${tipo.id === "publicaciones" ? "Tipo de publicación" : "Criterio científico"}</th>
              ${candidateHeaders}
            </tr>
          </thead>
          <tbody>
            ${tipo.id === "publicaciones" ? publicationMatrixRows(tipo, cargas, module) : tipo.subitems.map((subitem) => `
              <tr>
                <th class="matrix-label">${subitem.nombre}<span>${formatNumber(subitem.puntos)} puntos por unidad</span></th>
                ${state.postulantes.map((postulante) => {
                  const value = cargas[postulante.id].valores[subitem.id] ?? "";
                  const difference = activeCientificosCargaId === "consolidada" && module.modalidad === "evaluadores"
                    ? antecedentDifference(module, postulante.id, subitem.id)
                    : { differs: false, explanation: "" };
                  return `<td class="note-cell${difference.differs ? " has-difference" : ""}"><input type="number" min="0" step="1" inputmode="numeric" value="${value === "" ? "" : editableNumber(value, 0)}" data-cien-value="${subitem.id}" data-postulante-id="${postulante.id}" ${difference.differs ? calculationAttribute(`Diferencia entre evaluadores:\n${difference.explanation}`) : ""}></td>`;
                }).join("")}
              </tr>
            `).join("")}
            <tr class="teaching-subtotal-row">
              <th class="matrix-label">Subtotal ${tipo.nombre}<span>Se aplica el tope de ${formatNumber(tipo.maxInterno)}</span></th>
              ${state.postulantes.map((postulante) => `
                <td class="score-cell"><strong class="${saturationClass(cientificosTipoRawScore(tipo, postulante.id, cargas), tipo.maxInterno).trim()}" data-cien-subtotal="${tipo.id}:${postulante.id}" ${calculationAttribute(cientificosTipoExplanation(tipo, postulante.id, cargas))}>${formatNumber(cientificosTipoScore(tipo, postulante.id, cargas))}</strong></td>
              `).join("")}
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  `).join("");

  container.innerHTML = `
    <div class="${activeCientificosCargaId === "consolidada" ? "" : "evaluator-colored-load"}" ${activeCientificosCargaId === "consolidada" ? "" : `style="${evaluatorStyle(activeCientificosCargaId)}"`}>
      <div class="scientific-entry-list">${groups}</div>
      <div class="opposition-grid scientific-totals">
      <table class="data-table opposition-matrix">
        <thead>
          <tr>
            <th class="matrix-label">Resultado científico</th>
            ${candidateHeaders}
          </tr>
        </thead>
        <tbody>
          <tr class="teaching-total-row">
            <th class="matrix-label">Total interno <span>Escala de ${formatNumber(cientificosInternalMax())} puntos</span></th>
            ${state.postulantes.map((postulante) => `
              <td class="score-cell"><strong class="${saturationClass(cientificosInternalScore(postulante.id, cargas), cientificosInternalMax()).trim()}" data-cien-internal="${postulante.id}" ${calculationAttribute(cientificosInternalExplanation(postulante.id, cargas))}>${formatNumber(cientificosInternalScore(postulante.id, cargas))}</strong></td>
            `).join("")}
          </tr>
          <tr class="teaching-total-row">
            <th class="matrix-label">Total Simple relativizado <span>Máximo acordado ${formatNumber(getCientificosMaxSimple())}</span></th>
            ${state.postulantes.map((postulante) => `
              <td class="score-cell result-simple"><strong class="${postulante.simple ? saturationClass(cientificosInternalScore(postulante.id, cargas), cientificosInternalMax()).trim() : ""}" data-cien-simple="${postulante.id}" ${calculationAttribute(cientificosRelativizedExplanationFromCargas(postulante.id, getCientificosMaxSimple(), "Simple", cargas))}>${postulante.simple ? formatNumber(cientificosRelativizedValue(cientificosInternalScore(postulante.id, cargas), getCientificosMaxSimple())) : "—"}</strong></td>
            `).join("")}
          </tr>
          <tr class="teaching-total-row">
            <th class="matrix-label">Total Exclusiva relativizado <span>Máximo acordado ${formatNumber(getCientificosMaxExclusiva())}</span></th>
            ${state.postulantes.map((postulante) => `
              <td class="score-cell result-exclusiva"><strong class="${postulante.exclusiva ? saturationClass(cientificosInternalScore(postulante.id, cargas), cientificosInternalMax()).trim() : ""}" data-cien-exclusive="${postulante.id}" ${calculationAttribute(cientificosRelativizedExplanationFromCargas(postulante.id, getCientificosMaxExclusiva(), "Exclusiva", cargas))}>${postulante.exclusiva ? formatNumber(cientificosRelativizedValue(cientificosInternalScore(postulante.id, cargas), getCientificosMaxExclusiva())) : "—"}</strong></td>
            `).join("")}
          </tr>
        </tbody>
      </table>
      </div>
      ${renderAntecedentNotesSection(module, activeCientificosCargaId)}
      <dialog id="publication-editor" class="publication-editor"></dialog>
    </div>
  `;

  attachAntecedentNotesHandler(container, module, activeCientificosCargaId);

  const publicationType = module.tipos.find((tipo) => tipo.id === "publicaciones");
  if (publicationType) {
    const publicationGroups = scientificPublicationGroups(publicationType);
    container.querySelectorAll("[data-open-publication]").forEach((button) => {
      button.addEventListener("click", () => {
        const [groupId, postulanteId] = button.dataset.openPublication.split(":");
        const group = publicationGroups.find((item) => item.id === groupId);
        const postulante = state.postulantes.find((item) => item.id === postulanteId);
        if (group && postulante) openPublicationEditor(publicationType, group, postulante, cargas, module);
      });
    });
  }

  container.querySelectorAll("[data-cien-value]").forEach((input) => {
    input.addEventListener("input", (event) => {
      normalizeIntegerInput(event.target);
      const postulanteId = event.target.dataset.postulanteId;
      cargas[postulanteId].valores[event.target.dataset.cienValue] = event.target.value;
      if (activeCientificosCargaId === "consolidada") {
        updateCientificosCandidate(postulanteId);
      } else {
        syncConsolidatedAntecedentField(module, postulanteId, event.target.dataset.cienValue);
        updateCientificosCandidate(postulanteId, cargas);
      }
      scheduleDerivedViewsRender();
      saveState();
    });
  });
}

function updateCientificosCandidate(postulanteId, cargas = state.antecedentesCientificos.cargas) {
  state.antecedentesCientificos.tipos.forEach((tipo) => {
    const subtotal = document.querySelector(`[data-cien-subtotal="${tipo.id}:${postulanteId}"]`);
    if (subtotal) {
      subtotal.textContent = formatNumber(cientificosTipoScore(tipo, postulanteId, cargas));
      updateCalculation(subtotal, cientificosTipoExplanation(tipo, postulanteId, cargas));
      updateSaturation(subtotal, cientificosTipoRawScore(tipo, postulanteId, cargas), tipo.maxInterno);
    }
  });
  const postulante = state.postulantes.find((item) => item.id === postulanteId);
  const internal = document.querySelector(`[data-cien-internal="${postulanteId}"]`);
  const simple = document.querySelector(`[data-cien-simple="${postulanteId}"]`);
  const exclusive = document.querySelector(`[data-cien-exclusive="${postulanteId}"]`);
  const internalScore = cientificosInternalScore(postulanteId, cargas);
  if (internal) {
    internal.textContent = formatNumber(internalScore);
    updateCalculation(internal, cientificosInternalExplanation(postulanteId, cargas));
    updateSaturation(internal, internalScore, cientificosInternalMax());
  }
  if (simple) {
    simple.textContent = postulante.simple ? formatNumber(cientificosRelativizedValue(internalScore, getCientificosMaxSimple())) : "—";
    updateCalculation(simple, cientificosRelativizedExplanationFromCargas(postulanteId, getCientificosMaxSimple(), "Simple", cargas));
    updateSaturation(simple, postulante.simple ? internalScore : 0, cientificosInternalMax());
  }
  if (exclusive) {
    exclusive.textContent = postulante.exclusiva ? formatNumber(cientificosRelativizedValue(internalScore, getCientificosMaxExclusiva())) : "—";
    updateCalculation(exclusive, cientificosRelativizedExplanationFromCargas(postulanteId, getCientificosMaxExclusiva(), "Exclusiva", cargas));
    updateSaturation(exclusive, postulante.exclusiva ? internalScore : 0, cientificosInternalMax());
  }
}

function renderExtensionConfig() {
  const container = document.querySelector("#extension-types-list");
  container.innerHTML = "";
  state.antecedentesExtension.tipos.forEach((tipo, typeIndex) => {
    const section = document.createElement("section");
    section.className = "teaching-type";
    const subitems = tipo.subitems.map((subitem, itemIndex) => `
      <div class="teaching-subitem-row">
        <input type="text" value="${escapeAttribute(subitem.nombre)}" data-ext-type="${typeIndex}" data-ext-item="${itemIndex}" data-ext-field="nombre" aria-label="Nombre del subítem de extensión">
        <input type="number" min="0" step="0.01" value="${editableNumber(subitem.puntos, 2)}" data-ext-type="${typeIndex}" data-ext-item="${itemIndex}" data-ext-field="puntos" aria-label="Puntaje interno">
        <output class="teaching-derived-value" data-ext-item-simple="${typeIndex}:${itemIndex}">${formatNumber(extensionRelativizedValue(subitem.puntos, getExtensionMaxSimple()))}</output>
        <output class="teaching-derived-value" data-ext-item-exclusive="${typeIndex}:${itemIndex}">${formatNumber(extensionRelativizedValue(subitem.puntos, getExtensionMaxExclusiva()))}</output>
      </div>
    `).join("");
    section.innerHTML = `
      <div class="teaching-type-header">
        <label>
          Tipo de antecedente
          <input type="text" value="${escapeAttribute(tipo.nombre)}" data-ext-type="${typeIndex}" data-ext-type-field="nombre">
        </label>
        <label>
          Tope interno
          <input type="number" min="0" step="0.01" value="${editableNumber(tipo.maxInterno, 2)}" data-ext-type="${typeIndex}" data-ext-type-field="maxInterno">
        </label>
        <label>
          Tope Simple relativizado
          <output class="teaching-derived-value" data-ext-type-simple="${typeIndex}">${formatNumber(extensionRelativizedValue(tipo.maxInterno, getExtensionMaxSimple()))}</output>
        </label>
        <label>
          Tope Exclusiva relativizado
          <output class="teaching-derived-value" data-ext-type-exclusive="${typeIndex}">${formatNumber(extensionRelativizedValue(tipo.maxInterno, getExtensionMaxExclusiva()))}</output>
        </label>
      </div>
      <div class="teaching-subitems-heading">
        <span>Subítem</span>
        <span>Puntaje interno</span>
        <span>Simple relativizado</span>
        <span>Exclusiva relativizada</span>
      </div>
      <div>${subitems}</div>
      <div class="teaching-type-actions">
        <button class="small-button" type="button" data-add-ext-item="${typeIndex}">Agregar subítem</button>
      </div>
    `;
    container.appendChild(section);
  });

  container.querySelectorAll("[data-ext-type-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.antecedentesExtension.tipos[Number(event.target.dataset.extType)];
      tipo[event.target.dataset.extTypeField] = event.target.dataset.extTypeField === "maxInterno"
        ? Number(event.target.value)
        : event.target.value;
      updateExtensionConfigDerived();
      saveState();
    });
    input.addEventListener("change", () => {
      renderExtensionMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-ext-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.antecedentesExtension.tipos[Number(event.target.dataset.extType)];
      const subitem = tipo.subitems[Number(event.target.dataset.extItem)];
      subitem[event.target.dataset.extField] = event.target.dataset.extField === "puntos"
        ? Number(event.target.value)
        : event.target.value;
      updateExtensionConfigDerived();
      saveState();
    });
    input.addEventListener("change", () => {
      renderExtensionMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-add-ext-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const tipo = state.antecedentesExtension.tipos[Number(button.dataset.addExtItem)];
      tipo.subitems.push({
        id: `ext_item_${Date.now()}`,
        nombre: "Nuevo subítem",
        puntos: 0
      });
      render();
    });
  });
  updateExtensionConfigDerived();
}

function updateExtensionConfigDerived() {
  state.antecedentesExtension.tipos.forEach((tipo, typeIndex) => {
    const typeSimple = document.querySelector(`[data-ext-type-simple="${typeIndex}"]`);
    const typeExclusive = document.querySelector(`[data-ext-type-exclusive="${typeIndex}"]`);
    if (typeSimple) {
      typeSimple.textContent = formatNumber(extensionRelativizedValue(tipo.maxInterno, getExtensionMaxSimple()));
      updateCalculation(typeSimple, `${formatNumber(tipo.maxInterno)} × ${formatNumber(getExtensionMaxSimple())} ÷ ${formatNumber(extensionInternalMax())} = ${typeSimple.textContent}`);
      typeSimple.tabIndex = 0;
    }
    if (typeExclusive) {
      typeExclusive.textContent = formatNumber(extensionRelativizedValue(tipo.maxInterno, getExtensionMaxExclusiva()));
      updateCalculation(typeExclusive, `${formatNumber(tipo.maxInterno)} × ${formatNumber(getExtensionMaxExclusiva())} ÷ ${formatNumber(extensionInternalMax())} = ${typeExclusive.textContent}`);
      typeExclusive.tabIndex = 0;
    }
    tipo.subitems.forEach((subitem, itemIndex) => {
      const simple = document.querySelector(`[data-ext-item-simple="${typeIndex}:${itemIndex}"]`);
      const exclusive = document.querySelector(`[data-ext-item-exclusive="${typeIndex}:${itemIndex}"]`);
      if (simple) {
        simple.textContent = formatNumber(extensionRelativizedValue(subitem.puntos, getExtensionMaxSimple()));
        updateCalculation(simple, `${formatNumber(subitem.puntos)} × ${formatNumber(getExtensionMaxSimple())} ÷ ${formatNumber(extensionInternalMax())} = ${simple.textContent}`);
        simple.tabIndex = 0;
      }
      if (exclusive) {
        exclusive.textContent = formatNumber(extensionRelativizedValue(subitem.puntos, getExtensionMaxExclusiva()));
        updateCalculation(exclusive, `${formatNumber(subitem.puntos)} × ${formatNumber(getExtensionMaxExclusiva())} ÷ ${formatNumber(extensionInternalMax())} = ${exclusive.textContent}`);
        exclusive.tabIndex = 0;
      }
    });
  });
  renderExtensionConfigSummary();
}

function renderExtensionConfigSummary() {
  const internalMax = extensionInternalMax();
  const agreedSimple = getExtensionMaxSimple();
  const agreedExclusive = getExtensionMaxExclusiva();
  const breakdown = state.antecedentesExtension.tipos
    .map((tipo) => formatNumber(tipo.maxInterno))
    .join(" + ");
  const summary = document.querySelector("#extension-config-summary");
  summary.innerHTML = `
    <span>
      Escala interna: ${breakdown} = ${formatNumber(internalMax)}
      <small>Cada bloque satura en su propio tope antes de sumarse.</small>
    </span>
    <span>
      Simple acordado: ${formatNumber(agreedSimple)}
      <small>Factor proporcional: ${formatNumber(internalMax ? agreedSimple / internalMax : 0, 3)}.</small>
    </span>
    <span>
      Exclusiva acordado: ${formatNumber(agreedExclusive)}
      <small>Factor proporcional: ${formatNumber(internalMax ? agreedExclusive / internalMax : 0, 3)}.</small>
    </span>
  `;
  updateCalculation(
    summary,
    `Escala interna: ${breakdown} = ${formatNumber(internalMax)}\n`
      + `Simple: ${formatNumber(agreedSimple)} ÷ ${formatNumber(internalMax)} = ${formatNumber(internalMax ? agreedSimple / internalMax : 0, 3)}\n`
      + `Exclusiva: ${formatNumber(agreedExclusive)} ÷ ${formatNumber(internalMax)} = ${formatNumber(internalMax ? agreedExclusive / internalMax : 0, 3)}`
  );
  summary.tabIndex = 0;
}

function restoreExtensionDefaults() {
  const cargas = state.antecedentesExtension.cargas;
  const { modalidad, participacion, cargasEvaluadores, anotaciones } = state.antecedentesExtension;
  state.antecedentesExtension = {
    modalidad,
    participacion,
    cargasEvaluadores,
    anotaciones,
    tipos: clone(initialState.antecedentesExtension.tipos),
    cargas
  };
  seedExtension(state);
  seedProfesionales(state);
  seedOtros(state);
  render();
}

function renderExtensionMatrix() {
  const container = document.querySelector("#extension-matrix");
  const module = state.antecedentesExtension;
  if (module.modalidad !== "evaluadores") activeExtensionCargaId = "consolidada";
  const cargas = antecedentCargas(module, activeExtensionCargaId);
  renderAntecedentEvaluationControls(
    "antecedentesExtension",
    activeExtensionCargaId,
    (value) => { activeExtensionCargaId = value; },
    renderExtensionMatrix
  );
  const candidateHeaders = state.postulantes.map((postulante) => `
    <th>${candidateNameHtml(postulante)}</th>
  `).join("");
  const groups = state.antecedentesExtension.tipos.map((tipo, typeIndex) => `
    <details class="scientific-entry-group" ${typeIndex === 0 ? "open" : ""}>
      <summary>
        <strong>${tipo.nombre}</strong>
        <small>${tipo.instruccion || "Ingrese la cantidad correspondiente."}</small>
        <span>Tope interno: ${formatNumber(tipo.maxInterno)}</span>
      </summary>
      <div class="opposition-grid">
        <table class="data-table opposition-matrix">
          <thead>
            <tr>
              <th class="matrix-label">Antecedente de extensión</th>
              ${candidateHeaders}
            </tr>
          </thead>
          <tbody>
            ${tipo.subitems.flatMap((subitem) => {
              const compositeParts = extensionCompositeParts(subitem);
              if (compositeParts) {
                return [
                  `
                    <tr class="extension-composite-heading">
                      <th class="matrix-label">${subitem.nombre}<span>${compositeParts.map((part) => `${part.label} ${formatNumber(part.points)}`).join(" · ")}</span></th>
                      ${state.postulantes.map((postulante) => {
                        const valores = cargas[postulante.id].valores || {};
                        const score = extensionSubitemRawScore(subitem, valores);
                        return `<td class="score-cell"><strong data-ext-composite="${subitem.id}:${postulante.id}">${formatNumber(score)}</strong></td>`;
                      }).join("")}
                    </tr>
                  `,
                  ...compositeParts.map((part) => `
                    <tr>
                      <th class="matrix-label subitem-nested-label">${part.label}<span>${formatNumber(part.points)} puntos por unidad</span></th>
                      ${state.postulantes.map((postulante) => {
                        const fieldId = extensionCompositeFieldId(subitem, part.kind);
                        const value = cargas[postulante.id].valores[fieldId] ?? "";
                        const difference = activeExtensionCargaId === "consolidada" && module.modalidad === "evaluadores"
                          ? antecedentDifference(module, postulante.id, fieldId)
                          : { differs: false, explanation: "" };
                        return `<td class="note-cell${difference.differs ? " has-difference" : ""}"><input type="number" min="0" step="1" inputmode="numeric" value="${value === "" ? "" : editableNumber(value, 0)}" data-ext-value="${fieldId}" data-ext-integer="true" data-postulante-id="${postulante.id}" ${difference.differs ? calculationAttribute(`Diferencia entre evaluadores:\n${difference.explanation}`) : ""}></td>`;
                      }).join("")}
                    </tr>
                  `)
                ];
              }
              return `
                <tr>
                  <th class="matrix-label">${subitem.nombre}<span>${formatNumber(subitem.puntos)} puntos por unidad</span></th>
                  ${state.postulantes.map((postulante) => {
                    const value = cargas[postulante.id].valores[subitem.id] ?? "";
                    const difference = activeExtensionCargaId === "consolidada" && module.modalidad === "evaluadores"
                      ? antecedentDifference(module, postulante.id, subitem.id)
                      : { differs: false, explanation: "" };
                    const displayValue = value === "" ? "" : editableNumber(value, 0);
                    return `<td class="note-cell${difference.differs ? " has-difference" : ""}"><input type="number" min="0" step="1" inputmode="numeric" value="${displayValue}" data-ext-value="${subitem.id}" data-ext-integer="true" data-postulante-id="${postulante.id}" ${difference.differs ? calculationAttribute(`Diferencia entre evaluadores:\n${difference.explanation}`) : ""}></td>`;
                  }).join("")}
                </tr>
              `;
            }).join("")}
            <tr class="teaching-subtotal-row">
              <th class="matrix-label">Subtotal ${tipo.nombre}<span>Se aplica el tope de ${formatNumber(tipo.maxInterno)}</span></th>
              ${state.postulantes.map((postulante) => `
                <td class="score-cell"><strong class="${saturationClass(extensionTipoRawScore(tipo, postulante.id, cargas), tipo.maxInterno).trim()}" data-ext-subtotal="${tipo.id}:${postulante.id}" ${calculationAttribute(extensionTipoExplanation(tipo, postulante.id, cargas))}>${formatNumber(extensionTipoScore(tipo, postulante.id, cargas))}</strong></td>
              `).join("")}
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  `).join("");

  container.innerHTML = `
    <div class="${activeExtensionCargaId === "consolidada" ? "" : "evaluator-colored-load"}" ${activeExtensionCargaId === "consolidada" ? "" : `style="${evaluatorStyle(activeExtensionCargaId)}"`}>
      <div class="scientific-entry-list">${groups}</div>
      <div class="opposition-grid scientific-totals">
        <table class="data-table opposition-matrix">
          <thead>
            <tr>
              <th class="matrix-label">Resultado de extensión</th>
              ${candidateHeaders}
            </tr>
          </thead>
          <tbody>
            <tr class="teaching-total-row">
              <th class="matrix-label">Total interno <span>Escala de ${formatNumber(extensionInternalMax())} puntos</span></th>
              ${state.postulantes.map((postulante) => `
                <td class="score-cell"><strong class="${saturationClass(extensionInternalScore(postulante.id, cargas), extensionInternalMax()).trim()}" data-ext-internal="${postulante.id}" ${calculationAttribute(extensionInternalExplanation(postulante.id, cargas))}>${formatNumber(extensionInternalScore(postulante.id, cargas))}</strong></td>
              `).join("")}
            </tr>
            <tr class="teaching-total-row">
              <th class="matrix-label">Total Simple relativizado <span>Máximo acordado ${formatNumber(getExtensionMaxSimple())}</span></th>
              ${state.postulantes.map((postulante) => `
                <td class="score-cell result-simple"><strong class="${postulante.simple ? saturationClass(extensionInternalScore(postulante.id, cargas), extensionInternalMax()).trim() : ""}" data-ext-simple="${postulante.id}" ${calculationAttribute(extensionRelativizedExplanationFromCargas(postulante.id, getExtensionMaxSimple(), "Simple", cargas))}>${postulante.simple ? formatNumber(extensionRelativizedValue(extensionInternalScore(postulante.id, cargas), getExtensionMaxSimple())) : "—"}</strong></td>
              `).join("")}
            </tr>
            <tr class="teaching-total-row">
              <th class="matrix-label">Total Exclusiva relativizado <span>Máximo acordado ${formatNumber(getExtensionMaxExclusiva())}</span></th>
              ${state.postulantes.map((postulante) => `
                <td class="score-cell result-exclusiva"><strong class="${postulante.exclusiva ? saturationClass(extensionInternalScore(postulante.id, cargas), extensionInternalMax()).trim() : ""}" data-ext-exclusive="${postulante.id}" ${calculationAttribute(extensionRelativizedExplanationFromCargas(postulante.id, getExtensionMaxExclusiva(), "Exclusiva", cargas))}>${postulante.exclusiva ? formatNumber(extensionRelativizedValue(extensionInternalScore(postulante.id, cargas), getExtensionMaxExclusiva())) : "—"}</strong></td>
              `).join("")}
            </tr>
          </tbody>
        </table>
      </div>
      ${renderAntecedentNotesSection(module, activeExtensionCargaId)}
    </div>
  `;

  attachAntecedentNotesHandler(container, module, activeExtensionCargaId);

  container.querySelectorAll("[data-ext-value]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const postulanteId = event.target.dataset.postulanteId;
      const value = event.target.value === "" ? "" : String(Math.max(0, Math.trunc(Number(event.target.value) || 0)));
      if (event.target.value !== value) event.target.value = value;
      cargas[postulanteId].valores[event.target.dataset.extValue] = value;
      if (activeExtensionCargaId === "consolidada") {
        updateExtensionCandidate(postulanteId);
      } else {
        syncConsolidatedAntecedentField(module, postulanteId, event.target.dataset.extValue);
        updateExtensionCandidate(postulanteId, cargas);
      }
      scheduleDerivedViewsRender();
      saveState();
    });
  });
}

function updateExtensionCandidate(postulanteId, cargas = state.antecedentesExtension.cargas) {
  state.antecedentesExtension.tipos.forEach((tipo) => {
    tipo.subitems.forEach((subitem) => {
      if (!extensionCompositeParts(subitem)) return;
      const composite = document.querySelector(`[data-ext-composite="${subitem.id}:${postulanteId}"]`);
      if (!composite) return;
      const valores = cargas[postulanteId]?.valores || {};
      composite.textContent = formatNumber(extensionSubitemRawScore(subitem, valores));
      updateCalculation(composite, extensionSubitemExplanationLines(subitem, valores).join("\n") || "Sin datos cargados.");
    });
    const subtotal = document.querySelector(`[data-ext-subtotal="${tipo.id}:${postulanteId}"]`);
    if (subtotal) {
      subtotal.textContent = formatNumber(extensionTipoScore(tipo, postulanteId, cargas));
      updateCalculation(subtotal, extensionTipoExplanation(tipo, postulanteId, cargas));
      updateSaturation(subtotal, extensionTipoRawScore(tipo, postulanteId, cargas), tipo.maxInterno);
    }
  });
  const postulante = state.postulantes.find((item) => item.id === postulanteId);
  const internal = document.querySelector(`[data-ext-internal="${postulanteId}"]`);
  const simple = document.querySelector(`[data-ext-simple="${postulanteId}"]`);
  const exclusive = document.querySelector(`[data-ext-exclusive="${postulanteId}"]`);
  if (internal) {
    internal.textContent = formatNumber(extensionInternalScore(postulanteId, cargas));
    updateCalculation(internal, extensionInternalExplanation(postulanteId, cargas));
    updateSaturation(internal, extensionInternalScore(postulanteId, cargas), extensionInternalMax());
  }
  if (simple) {
    simple.textContent = postulante.simple ? formatNumber(extensionRelativizedValue(extensionInternalScore(postulanteId, cargas), getExtensionMaxSimple())) : "—";
    updateCalculation(simple, extensionRelativizedExplanationFromCargas(postulanteId, getExtensionMaxSimple(), "Simple", cargas));
    updateSaturation(simple, postulante.simple ? extensionInternalScore(postulanteId, cargas) : 0, extensionInternalMax());
  }
  if (exclusive) {
    exclusive.textContent = postulante.exclusiva ? formatNumber(extensionRelativizedValue(extensionInternalScore(postulanteId, cargas), getExtensionMaxExclusiva())) : "—";
    updateCalculation(exclusive, extensionRelativizedExplanationFromCargas(postulanteId, getExtensionMaxExclusiva(), "Exclusiva", cargas));
    updateSaturation(exclusive, postulante.exclusiva ? extensionInternalScore(postulanteId, cargas) : 0, extensionInternalMax());
  }
}

function renderProfesionalesConfig() {
  const container = document.querySelector("#profesionales-types-list");
  container.innerHTML = "";
  state.antecedentesProfesionales.tipos.forEach((tipo, typeIndex) => {
    const section = document.createElement("section");
    section.className = "teaching-type";
    const subitems = tipo.subitems.map((subitem, itemIndex) => `
      <div class="teaching-subitem-row">
        <input type="text" value="${escapeAttribute(subitem.nombre)}" data-prof-type="${typeIndex}" data-prof-item="${itemIndex}" data-prof-field="nombre" aria-label="Nombre del subítem profesional">
        <input type="number" min="0" step="0.01" value="${editableNumber(subitem.puntos, 2)}" data-prof-type="${typeIndex}" data-prof-item="${itemIndex}" data-prof-field="puntos" aria-label="Puntaje interno">
        <output class="teaching-derived-value" data-prof-item-simple="${typeIndex}:${itemIndex}">${formatNumber(profesionalesRelativizedValue(subitem.puntos, getProfesionalesMaxSimple()))}</output>
        <output class="teaching-derived-value" data-prof-item-exclusive="${typeIndex}:${itemIndex}">${formatNumber(profesionalesRelativizedValue(subitem.puntos, getProfesionalesMaxExclusiva()))}</output>
      </div>
    `).join("");
    section.innerHTML = `
      <div class="teaching-type-header">
        <label>
          Tipo de antecedente
          <input type="text" value="${escapeAttribute(tipo.nombre)}" data-prof-type="${typeIndex}" data-prof-type-field="nombre">
        </label>
        <label>
          Tope interno
          <input type="number" min="0" step="0.01" value="${editableNumber(tipo.maxInterno, 2)}" data-prof-type="${typeIndex}" data-prof-type-field="maxInterno">
        </label>
        <label>
          Tope Simple relativizado
          <output class="teaching-derived-value" data-prof-type-simple="${typeIndex}">${formatNumber(profesionalesRelativizedValue(tipo.maxInterno, getProfesionalesMaxSimple()))}</output>
        </label>
        <label>
          Tope Exclusiva relativizado
          <output class="teaching-derived-value" data-prof-type-exclusive="${typeIndex}">${formatNumber(profesionalesRelativizedValue(tipo.maxInterno, getProfesionalesMaxExclusiva()))}</output>
        </label>
      </div>
      <div class="teaching-subitems-heading">
        <span>Subítem</span>
        <span>Puntaje interno</span>
        <span>Simple relativizado</span>
        <span>Exclusiva relativizada</span>
      </div>
      <div>${subitems}</div>
      <div class="teaching-type-actions">
        <button class="small-button" type="button" data-add-prof-item="${typeIndex}">Agregar subítem</button>
      </div>
    `;
    container.appendChild(section);
  });

  container.querySelectorAll("[data-prof-type-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.antecedentesProfesionales.tipos[Number(event.target.dataset.profType)];
      tipo[event.target.dataset.profTypeField] = event.target.dataset.profTypeField === "maxInterno"
        ? Number(event.target.value)
        : event.target.value;
      updateProfesionalesConfigDerived();
      saveState();
    });
    input.addEventListener("change", () => {
      renderProfesionalesMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-prof-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.antecedentesProfesionales.tipos[Number(event.target.dataset.profType)];
      const subitem = tipo.subitems[Number(event.target.dataset.profItem)];
      subitem[event.target.dataset.profField] = event.target.dataset.profField === "puntos"
        ? Number(event.target.value)
        : event.target.value;
      updateProfesionalesConfigDerived();
      saveState();
    });
    input.addEventListener("change", () => {
      renderProfesionalesMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-add-prof-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const tipo = state.antecedentesProfesionales.tipos[Number(button.dataset.addProfItem)];
      tipo.subitems.push({
        id: `prof_item_${Date.now()}`,
        nombre: "Nuevo subítem",
        puntos: 0
      });
      render();
    });
  });
  updateProfesionalesConfigDerived();
}

function updateProfesionalesConfigDerived() {
  state.antecedentesProfesionales.tipos.forEach((tipo, typeIndex) => {
    const typeSimple = document.querySelector(`[data-prof-type-simple="${typeIndex}"]`);
    const typeExclusive = document.querySelector(`[data-prof-type-exclusive="${typeIndex}"]`);
    if (typeSimple) {
      typeSimple.textContent = formatNumber(profesionalesRelativizedValue(tipo.maxInterno, getProfesionalesMaxSimple()));
      updateCalculation(typeSimple, `${formatNumber(tipo.maxInterno)} × ${formatNumber(getProfesionalesMaxSimple())} ÷ ${formatNumber(profesionalesInternalMax())} = ${typeSimple.textContent}`);
      typeSimple.tabIndex = 0;
    }
    if (typeExclusive) {
      typeExclusive.textContent = formatNumber(profesionalesRelativizedValue(tipo.maxInterno, getProfesionalesMaxExclusiva()));
      updateCalculation(typeExclusive, `${formatNumber(tipo.maxInterno)} × ${formatNumber(getProfesionalesMaxExclusiva())} ÷ ${formatNumber(profesionalesInternalMax())} = ${typeExclusive.textContent}`);
      typeExclusive.tabIndex = 0;
    }
    tipo.subitems.forEach((subitem, itemIndex) => {
      const simple = document.querySelector(`[data-prof-item-simple="${typeIndex}:${itemIndex}"]`);
      const exclusive = document.querySelector(`[data-prof-item-exclusive="${typeIndex}:${itemIndex}"]`);
      if (simple) {
        simple.textContent = formatNumber(profesionalesRelativizedValue(subitem.puntos, getProfesionalesMaxSimple()));
        updateCalculation(simple, `${formatNumber(subitem.puntos)} × ${formatNumber(getProfesionalesMaxSimple())} ÷ ${formatNumber(profesionalesInternalMax())} = ${simple.textContent}`);
        simple.tabIndex = 0;
      }
      if (exclusive) {
        exclusive.textContent = formatNumber(profesionalesRelativizedValue(subitem.puntos, getProfesionalesMaxExclusiva()));
        updateCalculation(exclusive, `${formatNumber(subitem.puntos)} × ${formatNumber(getProfesionalesMaxExclusiva())} ÷ ${formatNumber(profesionalesInternalMax())} = ${exclusive.textContent}`);
        exclusive.tabIndex = 0;
      }
    });
  });
  renderProfesionalesConfigSummary();
}

function renderProfesionalesConfigSummary() {
  const internalMax = profesionalesInternalMax();
  const agreedSimple = getProfesionalesMaxSimple();
  const agreedExclusive = getProfesionalesMaxExclusiva();
  const breakdown = state.antecedentesProfesionales.tipos
    .map((tipo) => formatNumber(tipo.maxInterno))
    .join(" + ");
  const summary = document.querySelector("#profesionales-config-summary");
  summary.innerHTML = `
    <span>
      Escala interna: ${breakdown} = ${formatNumber(internalMax)}
      <small>Cada bloque satura en su propio tope antes de sumarse.</small>
    </span>
    <span>
      Simple acordado: ${formatNumber(agreedSimple)}
      <small>Factor proporcional: ${formatNumber(internalMax ? agreedSimple / internalMax : 0, 3)}.</small>
    </span>
    <span>
      Exclusiva acordado: ${formatNumber(agreedExclusive)}
      <small>Factor proporcional: ${formatNumber(internalMax ? agreedExclusive / internalMax : 0, 3)}.</small>
    </span>
  `;
  updateCalculation(
    summary,
    `Escala interna: ${breakdown} = ${formatNumber(internalMax)}\n`
      + `Simple: ${formatNumber(agreedSimple)} ÷ ${formatNumber(internalMax)} = ${formatNumber(internalMax ? agreedSimple / internalMax : 0, 3)}\n`
      + `Exclusiva: ${formatNumber(agreedExclusive)} ÷ ${formatNumber(internalMax)} = ${formatNumber(internalMax ? agreedExclusive / internalMax : 0, 3)}`
  );
  summary.tabIndex = 0;
}

function restoreProfesionalesDefaults() {
  const cargas = state.antecedentesProfesionales.cargas;
  const { modalidad, participacion, cargasEvaluadores, anotaciones } = state.antecedentesProfesionales;
  state.antecedentesProfesionales = {
    modalidad,
    participacion,
    cargasEvaluadores,
    anotaciones,
    tipos: clone(initialState.antecedentesProfesionales.tipos),
    cargas
  };
  seedProfesionales(state);
  render();
}

function renderProfesionalesMatrix() {
  const container = document.querySelector("#profesionales-matrix");
  const module = state.antecedentesProfesionales;
  if (module.modalidad !== "evaluadores") activeProfesionalesCargaId = "consolidada";
  const cargas = antecedentCargas(module, activeProfesionalesCargaId);
  renderAntecedentEvaluationControls(
    "antecedentesProfesionales",
    activeProfesionalesCargaId,
    (value) => { activeProfesionalesCargaId = value; },
    renderProfesionalesMatrix
  );
  const candidateHeaders = state.postulantes.map((postulante) => `
    <th>${candidateNameHtml(postulante)}</th>
  `).join("");
  const groups = state.antecedentesProfesionales.tipos.map((tipo, typeIndex) => `
    <details class="scientific-entry-group" ${typeIndex === 0 ? "open" : ""}>
      <summary>
        <strong>${tipo.nombre}</strong>
        <small>${tipo.instruccion || "Ingrese la cantidad correspondiente."}</small>
        <span>Tope interno: ${formatNumber(tipo.maxInterno)}</span>
      </summary>
      <div class="opposition-grid">
        <table class="data-table opposition-matrix">
          <thead>
            <tr>
              <th class="matrix-label">Antecedente profesional</th>
              ${candidateHeaders}
            </tr>
          </thead>
          <tbody>
            ${tipo.subitems.flatMap((subitem) => {
              const compositeParts = professionalCompositeParts(subitem);
              if (compositeParts) {
                return [
                  `
                    <tr class="extension-composite-heading">
                      <th class="matrix-label">${subitem.nombre}<span>${compositeParts.map((part) => `${part.label} ${formatNumber(part.points)}`).join(" · ")}</span></th>
                      ${state.postulantes.map((postulante) => {
                        const valores = cargas[postulante.id].valores || {};
                        const score = profesionalesSubitemRawScore(subitem, valores);
                        return `<td class="score-cell"><strong data-prof-composite="${subitem.id}:${postulante.id}">${formatNumber(score)}</strong></td>`;
                      }).join("")}
                    </tr>
                  `,
                  ...compositeParts.map((part) => `
                    <tr>
                      <th class="matrix-label subitem-nested-label">${part.label}<span>${formatNumber(part.points)} puntos por unidad</span></th>
                      ${state.postulantes.map((postulante) => {
                        const fieldId = professionalCompositeFieldId(subitem, part.kind);
                        const value = cargas[postulante.id].valores[fieldId] ?? "";
                        const difference = activeProfesionalesCargaId === "consolidada" && module.modalidad === "evaluadores"
                          ? antecedentDifference(module, postulante.id, fieldId)
                          : { differs: false, explanation: "" };
                        return `<td class="note-cell${difference.differs ? " has-difference" : ""}"><input type="number" min="0" step="1" inputmode="numeric" value="${value === "" ? "" : editableNumber(value, 0)}" data-prof-value="${fieldId}" data-prof-integer="true" data-postulante-id="${postulante.id}" ${difference.differs ? calculationAttribute(`Diferencia entre evaluadores:\n${difference.explanation}`) : ""}></td>`;
                      }).join("")}
                    </tr>
                  `)
                ];
              }
              return `
                <tr>
                  <th class="matrix-label">${subitem.nombre}<span>${formatNumber(subitem.puntos)} puntos por unidad</span></th>
                  ${state.postulantes.map((postulante) => {
                    const value = cargas[postulante.id].valores[subitem.id] ?? "";
                    const difference = activeProfesionalesCargaId === "consolidada" && module.modalidad === "evaluadores"
                      ? antecedentDifference(module, postulante.id, subitem.id)
                      : { differs: false, explanation: "" };
                    return `<td class="note-cell${difference.differs ? " has-difference" : ""}"><input type="number" min="0" step="1" inputmode="numeric" value="${value === "" ? "" : editableNumber(value, 0)}" data-prof-value="${subitem.id}" data-prof-integer="true" data-postulante-id="${postulante.id}" ${difference.differs ? calculationAttribute(`Diferencia entre evaluadores:\n${difference.explanation}`) : ""}></td>`;
                  }).join("")}
                </tr>
              `;
            }).join("")}
            <tr class="teaching-subtotal-row">
              <th class="matrix-label">Subtotal ${tipo.nombre}<span>Se aplica el tope de ${formatNumber(tipo.maxInterno)}</span></th>
              ${state.postulantes.map((postulante) => `
                <td class="score-cell"><strong class="${saturationClass(profesionalesTipoRawScore(tipo, postulante.id, cargas), tipo.maxInterno).trim()}" data-prof-subtotal="${tipo.id}:${postulante.id}" ${calculationAttribute(profesionalesTipoExplanation(tipo, postulante.id, cargas))}>${formatNumber(profesionalesTipoScore(tipo, postulante.id, cargas))}</strong></td>
              `).join("")}
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  `).join("");

  container.innerHTML = `
    <div class="${activeProfesionalesCargaId === "consolidada" ? "" : "evaluator-colored-load"}" ${activeProfesionalesCargaId === "consolidada" ? "" : `style="${evaluatorStyle(activeProfesionalesCargaId)}"`}>
      <div class="scientific-entry-list">${groups}</div>
      <div class="opposition-grid scientific-totals">
        <table class="data-table opposition-matrix">
          <thead>
            <tr>
              <th class="matrix-label">Resultado profesional</th>
              ${candidateHeaders}
            </tr>
          </thead>
          <tbody>
            <tr class="teaching-total-row">
              <th class="matrix-label">Total interno <span>Escala de ${formatNumber(profesionalesInternalMax())} puntos</span></th>
              ${state.postulantes.map((postulante) => `
              <td class="score-cell"><strong class="${saturationClass(profesionalesInternalScore(postulante.id, cargas), profesionalesInternalMax()).trim()}" data-prof-internal="${postulante.id}" ${calculationAttribute(profesionalesInternalExplanation(postulante.id, cargas))}>${formatNumber(profesionalesInternalScore(postulante.id, cargas))}</strong></td>
              `).join("")}
            </tr>
            <tr class="teaching-total-row">
              <th class="matrix-label">Total Simple relativizado <span>Máximo acordado ${formatNumber(getProfesionalesMaxSimple())}</span></th>
              ${state.postulantes.map((postulante) => `
              <td class="score-cell result-simple"><strong class="${postulante.simple ? saturationClass(profesionalesInternalScore(postulante.id, cargas), profesionalesInternalMax()).trim() : ""}" data-prof-simple="${postulante.id}" ${calculationAttribute(profesionalesRelativizedExplanationFromCargas(postulante.id, getProfesionalesMaxSimple(), "Simple", cargas))}>${postulante.simple ? formatNumber(profesionalesRelativizedValue(profesionalesInternalScore(postulante.id, cargas), getProfesionalesMaxSimple())) : "—"}</strong></td>
              `).join("")}
            </tr>
            <tr class="teaching-total-row">
              <th class="matrix-label">Total Exclusiva relativizado <span>Máximo acordado ${formatNumber(getProfesionalesMaxExclusiva())}</span></th>
              ${state.postulantes.map((postulante) => `
              <td class="score-cell result-exclusiva"><strong class="${postulante.exclusiva ? saturationClass(profesionalesInternalScore(postulante.id, cargas), profesionalesInternalMax()).trim() : ""}" data-prof-exclusive="${postulante.id}" ${calculationAttribute(profesionalesRelativizedExplanationFromCargas(postulante.id, getProfesionalesMaxExclusiva(), "Exclusiva", cargas))}>${postulante.exclusiva ? formatNumber(profesionalesRelativizedValue(profesionalesInternalScore(postulante.id, cargas), getProfesionalesMaxExclusiva())) : "—"}</strong></td>
              `).join("")}
            </tr>
          </tbody>
        </table>
      </div>
      ${renderAntecedentNotesSection(module, activeProfesionalesCargaId)}
    </div>
  `;

  attachAntecedentNotesHandler(container, module, activeProfesionalesCargaId);

  container.querySelectorAll("[data-prof-value]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const postulanteId = event.target.dataset.postulanteId;
      const value = event.target.value === "" ? "" : String(Math.max(0, Math.trunc(Number(event.target.value) || 0)));
      if (event.target.value !== value) event.target.value = value;
      cargas[postulanteId].valores[event.target.dataset.profValue] = value;
      if (activeProfesionalesCargaId === "consolidada") {
        updateProfesionalesCandidate(postulanteId);
      } else {
        syncConsolidatedAntecedentField(module, postulanteId, event.target.dataset.profValue);
        updateProfesionalesCandidate(postulanteId, cargas);
      }
      scheduleDerivedViewsRender();
      saveState();
    });
  });
}

function updateProfesionalesCandidate(postulanteId, cargas = state.antecedentesProfesionales.cargas) {
  state.antecedentesProfesionales.tipos.forEach((tipo) => {
    tipo.subitems.forEach((subitem) => {
      if (!professionalCompositeParts(subitem)) return;
      const composite = document.querySelector(`[data-prof-composite="${subitem.id}:${postulanteId}"]`);
      if (!composite) return;
      const valores = cargas[postulanteId]?.valores || {};
      composite.textContent = formatNumber(profesionalesSubitemRawScore(subitem, valores));
      updateCalculation(composite, profesionalesSubitemExplanationLines(subitem, valores).join("\n") || "Sin datos cargados.");
    });
    const subtotal = document.querySelector(`[data-prof-subtotal="${tipo.id}:${postulanteId}"]`);
    if (subtotal) {
      subtotal.textContent = formatNumber(profesionalesTipoScore(tipo, postulanteId, cargas));
      updateCalculation(subtotal, profesionalesTipoExplanation(tipo, postulanteId, cargas));
      updateSaturation(subtotal, profesionalesTipoRawScore(tipo, postulanteId, cargas), tipo.maxInterno);
    }
  });
  const postulante = state.postulantes.find((item) => item.id === postulanteId);
  const internal = document.querySelector(`[data-prof-internal="${postulanteId}"]`);
  const simple = document.querySelector(`[data-prof-simple="${postulanteId}"]`);
  const exclusive = document.querySelector(`[data-prof-exclusive="${postulanteId}"]`);
  if (internal) {
    internal.textContent = formatNumber(profesionalesInternalScore(postulanteId, cargas));
    updateCalculation(internal, profesionalesInternalExplanation(postulanteId, cargas));
    updateSaturation(internal, profesionalesInternalScore(postulanteId, cargas), profesionalesInternalMax());
  }
  if (simple) {
    simple.textContent = postulante.simple ? formatNumber(profesionalesRelativizedValue(profesionalesInternalScore(postulanteId, cargas), getProfesionalesMaxSimple())) : "—";
    updateCalculation(simple, profesionalesRelativizedExplanationFromCargas(postulanteId, getProfesionalesMaxSimple(), "Simple", cargas));
    updateSaturation(simple, postulante.simple ? profesionalesInternalScore(postulanteId, cargas) : 0, profesionalesInternalMax());
  }
  if (exclusive) {
    exclusive.textContent = postulante.exclusiva ? formatNumber(profesionalesRelativizedValue(profesionalesInternalScore(postulanteId, cargas), getProfesionalesMaxExclusiva())) : "—";
    updateCalculation(exclusive, profesionalesRelativizedExplanationFromCargas(postulanteId, getProfesionalesMaxExclusiva(), "Exclusiva", cargas));
    updateSaturation(exclusive, postulante.exclusiva ? profesionalesInternalScore(postulanteId, cargas) : 0, profesionalesInternalMax());
  }
}

function renderOtrosConfig() {
  const container = document.querySelector("#otros-types-list");
  const totalInput = document.querySelector("#otros-total-interno");
  totalInput.value = editableNumber(state.otrosAntecedentes.maxInternoTotal, 2);
  totalInput.oninput = (event) => {
    state.otrosAntecedentes.maxInternoTotal = Number(event.target.value);
    updateOtrosConfigDerived();
    saveState();
  };
  totalInput.onchange = () => {
    renderOtrosMatrix();
    renderResultados();
    renderMerit();
  };
  container.innerHTML = "";
  state.otrosAntecedentes.tipos.forEach((tipo, typeIndex) => {
    const section = document.createElement("section");
    section.className = "teaching-type";
    const subitems = tipo.subitems.map((subitem, itemIndex) => `
      <div class="teaching-subitem-row">
        <input type="text" value="${escapeAttribute(subitem.nombre)}" data-otros-type="${typeIndex}" data-otros-item="${itemIndex}" data-otros-field="nombre" aria-label="Nombre del subítem">
        <input type="number" min="0" step="0.01" value="${editableNumber(subitem.puntos, 2)}" data-otros-type="${typeIndex}" data-otros-item="${itemIndex}" data-otros-field="puntos" aria-label="Puntaje interno">
        <output class="teaching-derived-value" data-otros-item-simple="${typeIndex}:${itemIndex}">${formatNumber(otrosRelativizedValue(subitem.puntos, getOtrosMaxSimple()))}</output>
        <output class="teaching-derived-value" data-otros-item-exclusive="${typeIndex}:${itemIndex}">${formatNumber(otrosRelativizedValue(subitem.puntos, getOtrosMaxExclusiva()))}</output>
      </div>
    `).join("");
    section.innerHTML = `
      <div class="teaching-type-header">
        <label>
          Tipo de antecedente
          <input type="text" value="${escapeAttribute(tipo.nombre)}" data-otros-type="${typeIndex}" data-otros-type-field="nombre">
        </label>
        <label>
          Tope del bloque
          <input type="number" min="0" step="0.01" value="${editableNumber(tipo.maxInterno, 2)}" data-otros-type="${typeIndex}" data-otros-type-field="maxInterno">
        </label>
        <label>
          Tope Simple relativizado
          <output class="teaching-derived-value" data-otros-type-simple="${typeIndex}">${formatNumber(otrosRelativizedValue(tipo.maxInterno, getOtrosMaxSimple()))}</output>
        </label>
        <label>
          Tope Exclusiva relativizado
          <output class="teaching-derived-value" data-otros-type-exclusive="${typeIndex}">${formatNumber(otrosRelativizedValue(tipo.maxInterno, getOtrosMaxExclusiva()))}</output>
        </label>
      </div>
      <div class="teaching-subitems-heading">
        <span>Subítem</span>
        <span>Puntaje interno</span>
        <span>Simple relativizado</span>
        <span>Exclusiva relativizada</span>
      </div>
      <div>${subitems}</div>
      <div class="teaching-type-actions">
        <button class="small-button" type="button" data-add-otros-item="${typeIndex}">Agregar subítem</button>
      </div>
    `;
    container.appendChild(section);
  });

  container.querySelectorAll("[data-otros-type-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.otrosAntecedentes.tipos[Number(event.target.dataset.otrosType)];
      tipo[event.target.dataset.otrosTypeField] = event.target.dataset.otrosTypeField === "maxInterno"
        ? Number(event.target.value)
        : event.target.value;
      updateOtrosConfigDerived();
      saveState();
    });
    input.addEventListener("change", () => {
      renderOtrosMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-otros-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const tipo = state.otrosAntecedentes.tipos[Number(event.target.dataset.otrosType)];
      const subitem = tipo.subitems[Number(event.target.dataset.otrosItem)];
      subitem[event.target.dataset.otrosField] = event.target.dataset.otrosField === "puntos"
        ? Number(event.target.value)
        : event.target.value;
      updateOtrosConfigDerived();
      saveState();
    });
    input.addEventListener("change", () => {
      renderOtrosMatrix();
      renderResultados();
      renderMerit();
    });
  });
  container.querySelectorAll("[data-add-otros-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const tipo = state.otrosAntecedentes.tipos[Number(button.dataset.addOtrosItem)];
      tipo.subitems.push({
        id: `otros_item_${Date.now()}`,
        nombre: "Nuevo subítem",
        puntos: 0
      });
      render();
    });
  });
  updateOtrosConfigDerived();
}

function updateOtrosConfigDerived() {
  state.otrosAntecedentes.tipos.forEach((tipo, typeIndex) => {
    const typeSimple = document.querySelector(`[data-otros-type-simple="${typeIndex}"]`);
    const typeExclusive = document.querySelector(`[data-otros-type-exclusive="${typeIndex}"]`);
    if (typeSimple) {
      typeSimple.textContent = formatNumber(otrosRelativizedValue(tipo.maxInterno, getOtrosMaxSimple()));
      updateCalculation(typeSimple, `${formatNumber(tipo.maxInterno)} × ${formatNumber(getOtrosMaxSimple())} ÷ ${formatNumber(otrosInternalMax())} = ${typeSimple.textContent}`);
      typeSimple.tabIndex = 0;
    }
    if (typeExclusive) {
      typeExclusive.textContent = formatNumber(otrosRelativizedValue(tipo.maxInterno, getOtrosMaxExclusiva()));
      updateCalculation(typeExclusive, `${formatNumber(tipo.maxInterno)} × ${formatNumber(getOtrosMaxExclusiva())} ÷ ${formatNumber(otrosInternalMax())} = ${typeExclusive.textContent}`);
      typeExclusive.tabIndex = 0;
    }
    tipo.subitems.forEach((subitem, itemIndex) => {
      const simple = document.querySelector(`[data-otros-item-simple="${typeIndex}:${itemIndex}"]`);
      const exclusive = document.querySelector(`[data-otros-item-exclusive="${typeIndex}:${itemIndex}"]`);
      if (simple) {
        simple.textContent = formatNumber(otrosRelativizedValue(subitem.puntos, getOtrosMaxSimple()));
        updateCalculation(simple, `${formatNumber(subitem.puntos)} × ${formatNumber(getOtrosMaxSimple())} ÷ ${formatNumber(otrosInternalMax())} = ${simple.textContent}`);
        simple.tabIndex = 0;
      }
      if (exclusive) {
        exclusive.textContent = formatNumber(otrosRelativizedValue(subitem.puntos, getOtrosMaxExclusiva()));
        updateCalculation(exclusive, `${formatNumber(subitem.puntos)} × ${formatNumber(getOtrosMaxExclusiva())} ÷ ${formatNumber(otrosInternalMax())} = ${exclusive.textContent}`);
        exclusive.tabIndex = 0;
      }
    });
  });
  renderOtrosConfigSummary();
}

function renderOtrosConfigSummary() {
  const internalMax = otrosInternalMax();
  const agreedSimple = getOtrosMaxSimple();
  const agreedExclusive = getOtrosMaxExclusiva();
  const blockCaps = state.otrosAntecedentes.tipos.map((tipo) => formatNumber(tipo.maxInterno)).join(" + ");
  const summary = document.querySelector("#otros-config-summary");
  summary.innerHTML = `
    <span>
      Tope interno general: ${formatNumber(internalMax)}
      <small>Los topes de bloque (${blockCaps}) se aplican primero; luego el total satura en ${formatNumber(internalMax)}.</small>
    </span>
    <span>
      Simple acordado: ${formatNumber(agreedSimple)}
      <small>Factor proporcional: ${formatNumber(internalMax ? agreedSimple / internalMax : 0, 3)}.</small>
    </span>
    <span>
      Exclusiva acordado: ${formatNumber(agreedExclusive)}
      <small>Factor proporcional: ${formatNumber(internalMax ? agreedExclusive / internalMax : 0, 3)}.</small>
    </span>
  `;
  updateCalculation(
    summary,
    `Topes de bloque: ${blockCaps}\nTope interno general: ${formatNumber(internalMax)}\n`
      + `Simple: ${formatNumber(agreedSimple)} ÷ ${formatNumber(internalMax)} = ${formatNumber(internalMax ? agreedSimple / internalMax : 0, 3)}\n`
      + `Exclusiva: ${formatNumber(agreedExclusive)} ÷ ${formatNumber(internalMax)} = ${formatNumber(internalMax ? agreedExclusive / internalMax : 0, 3)}`
  );
  summary.tabIndex = 0;
}

function restoreOtrosDefaults() {
  const cargas = state.otrosAntecedentes.cargas;
  const { modalidad, participacion, cargasEvaluadores, anotaciones } = state.otrosAntecedentes;
  state.otrosAntecedentes = {
    modalidad,
    participacion,
    cargasEvaluadores,
    anotaciones,
    maxInternoTotal: initialState.otrosAntecedentes.maxInternoTotal,
    tipos: clone(initialState.otrosAntecedentes.tipos),
    cargas
  };
  seedOtros(state);
  render();
}

function renderOtrosMatrix() {
  const container = document.querySelector("#otros-matrix");
  const module = state.otrosAntecedentes;
  if (module.modalidad !== "evaluadores") activeOtrosCargaId = "consolidada";
  const cargas = antecedentCargas(module, activeOtrosCargaId);
  renderAntecedentEvaluationControls(
    "otrosAntecedentes",
    activeOtrosCargaId,
    (value) => { activeOtrosCargaId = value; },
    renderOtrosMatrix
  );
  const candidateHeaders = state.postulantes.map((postulante) => `
    <th>${candidateNameHtml(postulante)}</th>
  `).join("");
  const groups = state.otrosAntecedentes.tipos.map((tipo, typeIndex) => `
    <details class="scientific-entry-group" ${typeIndex === 0 ? "open" : ""}>
      <summary>
        <strong>${tipo.nombre}</strong>
        <small>${tipo.instruccion || "Ingrese la cantidad correspondiente."}</small>
        <span>Tope del bloque: ${formatNumber(tipo.maxInterno)}</span>
      </summary>
      <div class="opposition-grid">
        <table class="data-table opposition-matrix">
          <thead>
            <tr>
              <th class="matrix-label">Otro antecedente</th>
              ${candidateHeaders}
            </tr>
          </thead>
          <tbody>
            ${tipo.subitems.map((subitem) => `
              <tr>
                <th class="matrix-label">${subitem.nombre}<span>${formatNumber(subitem.puntos)} puntos por unidad${subitem.maxCantidad === 1 ? " · admite 1 o 0" : ""}</span></th>
                ${state.postulantes.map((postulante) => {
                  const value = cargas[postulante.id].valores[subitem.id] ?? "";
                  const difference = activeOtrosCargaId === "consolidada" && module.modalidad === "evaluadores"
                    ? antecedentDifference(module, postulante.id, subitem.id)
                    : { differs: false, explanation: "" };
                  if (subitem.maxCantidad === 1) {
                    const selectedValue = value === "" ? "" : String(Number(value) ? 1 : 0);
                    return `<td class="note-cell${difference.differs ? " has-difference" : ""}"><select data-otros-value="${subitem.id}" data-postulante-id="${postulante.id}" ${difference.differs ? calculationAttribute(`Diferencia entre evaluadores:\n${difference.explanation}`) : ""}><option value="" ${selectedValue === "" ? "selected" : ""}></option><option value="0" ${selectedValue === "0" ? "selected" : ""}>No</option><option value="1" ${selectedValue === "1" ? "selected" : ""}>Sí</option></select></td>`;
                  }
                  return `<td class="note-cell${difference.differs ? " has-difference" : ""}"><input type="number" min="0" step="1" inputmode="numeric" value="${value === "" ? "" : editableNumber(value, 0)}" data-otros-value="${subitem.id}" data-otros-integer="true" data-postulante-id="${postulante.id}" ${difference.differs ? calculationAttribute(`Diferencia entre evaluadores:\n${difference.explanation}`) : ""}></td>`;
                }).join("")}
              </tr>
            `).join("")}
            <tr class="teaching-subtotal-row">
              <th class="matrix-label">Subtotal ${tipo.nombre}<span>Se aplica el tope de ${formatNumber(tipo.maxInterno)}</span></th>
              ${state.postulantes.map((postulante) => `
                <td class="score-cell"><strong class="${saturationClass(otrosTipoRawScore(tipo, postulante.id, cargas), tipo.maxInterno).trim()}" data-otros-subtotal="${tipo.id}:${postulante.id}" ${calculationAttribute(otrosTipoExplanation(tipo, postulante.id, cargas))}>${formatNumber(otrosTipoScore(tipo, postulante.id, cargas))}</strong></td>
              `).join("")}
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  `).join("");

  container.innerHTML = `
    <div class="${activeOtrosCargaId === "consolidada" ? "" : "evaluator-colored-load"}" ${activeOtrosCargaId === "consolidada" ? "" : `style="${evaluatorStyle(activeOtrosCargaId)}"`}>
      <div class="scientific-entry-list">${groups}</div>
      <div class="opposition-grid scientific-totals">
        <table class="data-table opposition-matrix">
          <thead>
            <tr>
              <th class="matrix-label">Resultado de otros antecedentes</th>
              ${candidateHeaders}
            </tr>
          </thead>
          <tbody>
            <tr class="teaching-total-row">
              <th class="matrix-label">Total interno <span>Tope general ${formatNumber(otrosInternalMax())}</span></th>
              ${state.postulantes.map((postulante) => `
                <td class="score-cell"><strong class="${saturationClass(otrosInternalRawScore(postulante.id, cargas), otrosInternalMax()).trim()}" data-otros-internal="${postulante.id}" ${calculationAttribute(otrosInternalExplanation(postulante.id, cargas))}>${formatNumber(otrosInternalScore(postulante.id, cargas))}</strong></td>
              `).join("")}
            </tr>
            <tr class="teaching-total-row">
              <th class="matrix-label">Total Simple relativizado <span>Máximo acordado ${formatNumber(getOtrosMaxSimple())}</span></th>
              ${state.postulantes.map((postulante) => `
                <td class="score-cell result-simple"><strong class="${postulante.simple ? saturationClass(otrosInternalRawScore(postulante.id, cargas), otrosInternalMax()).trim() : ""}" data-otros-simple="${postulante.id}" ${calculationAttribute(otrosRelativizedExplanationFromCargas(postulante.id, getOtrosMaxSimple(), "Simple", cargas))}>${postulante.simple ? formatNumber(otrosRelativizedValue(otrosInternalScore(postulante.id, cargas), getOtrosMaxSimple())) : "—"}</strong></td>
              `).join("")}
            </tr>
            <tr class="teaching-total-row">
              <th class="matrix-label">Total Exclusiva relativizado <span>Máximo acordado ${formatNumber(getOtrosMaxExclusiva())}</span></th>
              ${state.postulantes.map((postulante) => `
                <td class="score-cell result-exclusiva"><strong class="${postulante.exclusiva ? saturationClass(otrosInternalRawScore(postulante.id, cargas), otrosInternalMax()).trim() : ""}" data-otros-exclusive="${postulante.id}" ${calculationAttribute(otrosRelativizedExplanationFromCargas(postulante.id, getOtrosMaxExclusiva(), "Exclusiva", cargas))}>${postulante.exclusiva ? formatNumber(otrosRelativizedValue(otrosInternalScore(postulante.id, cargas), getOtrosMaxExclusiva())) : "—"}</strong></td>
              `).join("")}
            </tr>
          </tbody>
        </table>
      </div>
      ${renderAntecedentNotesSection(module, activeOtrosCargaId)}
    </div>
  `;

  attachAntecedentNotesHandler(container, module, activeOtrosCargaId);

  container.querySelectorAll("[data-otros-value]").forEach((input) => {
    const updateValue = (event) => {
      const postulanteId = event.target.dataset.postulanteId;
      const tipo = module.tipos.find((item) => item.subitems.some((subitem) => subitem.id === event.target.dataset.otrosValue));
      const subitem = tipo?.subitems.find((item) => item.id === event.target.dataset.otrosValue);
      let value = event.target.value;
      if (subitem?.maxCantidad === 1) {
        value = value === "" ? "" : String(Number(value) ? 1 : 0);
      } else {
        value = value === "" ? "" : String(Math.max(0, Math.trunc(Number(value) || 0)));
      }
      if (event.target.value !== value) event.target.value = value;
      cargas[postulanteId].valores[event.target.dataset.otrosValue] = value;
      if (activeOtrosCargaId === "consolidada") {
        updateOtrosCandidate(postulanteId);
      } else {
        syncConsolidatedAntecedentField(module, postulanteId, event.target.dataset.otrosValue);
        updateOtrosCandidate(postulanteId, cargas);
      }
      scheduleDerivedViewsRender();
      saveState();
    };
    input.addEventListener("input", updateValue);
    input.addEventListener("change", updateValue);
  });
}

function updateOtrosCandidate(postulanteId, cargas = state.otrosAntecedentes.cargas) {
  state.otrosAntecedentes.tipos.forEach((tipo) => {
    const subtotal = document.querySelector(`[data-otros-subtotal="${tipo.id}:${postulanteId}"]`);
    if (subtotal) {
      subtotal.textContent = formatNumber(otrosTipoScore(tipo, postulanteId, cargas));
      updateCalculation(subtotal, otrosTipoExplanation(tipo, postulanteId, cargas));
      updateSaturation(subtotal, otrosTipoRawScore(tipo, postulanteId, cargas), tipo.maxInterno);
    }
  });
  const postulante = state.postulantes.find((item) => item.id === postulanteId);
  const internal = document.querySelector(`[data-otros-internal="${postulanteId}"]`);
  const simple = document.querySelector(`[data-otros-simple="${postulanteId}"]`);
  const exclusive = document.querySelector(`[data-otros-exclusive="${postulanteId}"]`);
  if (internal) {
    internal.textContent = formatNumber(otrosInternalScore(postulanteId, cargas));
    updateCalculation(internal, otrosInternalExplanation(postulanteId, cargas));
    updateSaturation(internal, otrosInternalRawScore(postulanteId, cargas), otrosInternalMax());
  }
  if (simple) {
    simple.textContent = postulante.simple ? formatNumber(otrosRelativizedValue(otrosInternalScore(postulanteId, cargas), getOtrosMaxSimple())) : "—";
    updateCalculation(simple, otrosRelativizedExplanationFromCargas(postulanteId, getOtrosMaxSimple(), "Simple", cargas));
    updateSaturation(simple, postulante.simple ? otrosInternalRawScore(postulanteId, cargas) : 0, otrosInternalMax());
  }
  if (exclusive) {
    exclusive.textContent = postulante.exclusiva ? formatNumber(otrosRelativizedValue(otrosInternalScore(postulanteId, cargas), getOtrosMaxExclusiva())) : "—";
    updateCalculation(exclusive, otrosRelativizedExplanationFromCargas(postulanteId, getOtrosMaxExclusiva(), "Exclusiva", cargas));
    updateSaturation(exclusive, postulante.exclusiva ? otrosInternalRawScore(postulanteId, cargas) : 0, otrosInternalMax());
  }
}

function renderResultados() {
  document.querySelector("#show-results-simple").classList.toggle("is-active", resultsCargo === "simple");
  document.querySelector("#show-results-exclusive").classList.toggle("is-active", resultsCargo === "exclusiva");
  const table = document.querySelector("#resultados-table");
  const thead = table.querySelector("thead");
  const tbody = document.querySelector("#resultados-table tbody");
  const tfoot = table.querySelector("tfoot");
  const cargoLabel = resultsCargo === "simple" ? "Simple" : "Exclusiva";
  const candidates = state.postulantes.filter((postulante) => postulante[resultsCargo]);

  thead.innerHTML = `
    <tr>
      <th class="results-label">Rubro / puntaje ${cargoLabel}</th>
      ${candidates.map((postulante) => `
        <th>${candidateNameHtml(postulante)}</th>
      `).join("")}
    </tr>
  `;
  tbody.innerHTML = "";
  state.rubros.forEach((rubro) => {
    const row = document.createElement("tr");
    const values = candidates.map((postulante) => resultValueForRubro(rubro.id, postulante.id, resultsCargo));
    const explanations = candidates.map((postulante) => resultExplanationForRubro(rubro.id, postulante.id, resultsCargo));
    row.innerHTML = `
      <th class="results-label">${rubro.nombre}<span class="muted">Máximo acordado: ${formatNumber(rubro[resultsCargo])}</span></th>
      ${values.map((value, index) => `
        <td class="${resultsCargo === "simple" ? "result-simple" : "result-exclusiva"}">
          <span class="${saturationClass(value, rubro[resultsCargo]).trim()}" ${calculationAttribute(explanations[index])}>${formatNumber(value)}</span>
        </td>
      `).join("")}
    `;
    tbody.appendChild(row);
  });

  const loadedRubros = new Set(["docentes", "cientificos", "extension", "profesionales", "otros", "oposicion"]);
  const totalMax = state.rubros.reduce((sum, rubro) => sum + Number(rubro[resultsCargo] || 0), 0);
  tfoot.innerHTML = `
    <tr>
      <th class="results-label">Total cargado actualmente<span class="muted">Máximo final configurado: ${formatNumber(totalMax)}</span></th>
      ${candidates.map((postulante) => {
        const contributions = state.rubros
          .filter((rubro) => loadedRubros.has(rubro.id))
          .map((rubro) => ({
            nombre: rubro.nombre,
            valor: resultValueForRubro(rubro.id, postulante.id, resultsCargo)
          }));
        const total = contributions.reduce((sum, contribution) => sum + contribution.valor, 0);
        const explanation = `${contributions.map((item) => `${item.nombre}: ${formatNumber(item.valor)}`).join("\n")}\nTotal cargado: ${formatNumber(total)}`;
        return `<td class="results-total"><span class="${saturationClass(total, totalMax).trim()}" ${calculationAttribute(explanation)}>${formatNumber(total)}</span></td>`;
      }).join("")}
    </tr>
  `;
}

function resultValueForRubro(rubroId, postulanteId, cargo) {
  if (rubroId === "docentes") {
    return cargo === "simple" ? docentesSimpleScore(postulanteId) : docentesExclusiveScore(postulanteId);
  }
  if (rubroId === "cientificos") {
    return cargo === "simple" ? cientificosSimpleScore(postulanteId) : cientificosExclusiveScore(postulanteId);
  }
  if (rubroId === "extension") {
    return cargo === "simple" ? extensionSimpleScore(postulanteId) : extensionExclusiveScore(postulanteId);
  }
  if (rubroId === "profesionales") {
    return cargo === "simple" ? profesionalesSimpleScore(postulanteId) : profesionalesExclusiveScore(postulanteId);
  }
  if (rubroId === "otros") {
    return cargo === "simple" ? otrosSimpleScore(postulanteId) : otrosExclusiveScore(postulanteId);
  }
  if (rubroId === "oposicion") {
    const simple = promedioOposicion(postulanteId);
    return cargo === "simple" ? simple : notaExclusivaDesdeSimple(simple);
  }
  return 0;
}

function resultExplanationForRubro(rubroId, postulanteId, cargo) {
  if (rubroId === "docentes") {
    return docentesRelativizedExplanation(
      postulanteId,
      cargo === "simple" ? getDocentesMaxSimple() : getDocentesMaxExclusiva(),
      cargo === "simple" ? "Simple" : "Exclusiva"
    );
  }
  if (rubroId === "cientificos") {
    return cientificosRelativizedExplanation(
      postulanteId,
      cargo === "simple" ? getCientificosMaxSimple() : getCientificosMaxExclusiva(),
      cargo === "simple" ? "Simple" : "Exclusiva"
    );
  }
  if (rubroId === "extension") {
    return extensionRelativizedExplanation(
      postulanteId,
      cargo === "simple" ? getExtensionMaxSimple() : getExtensionMaxExclusiva(),
      cargo === "simple" ? "Simple" : "Exclusiva"
    );
  }
  if (rubroId === "profesionales") {
    return profesionalesRelativizedExplanation(
      postulanteId,
      cargo === "simple" ? getProfesionalesMaxSimple() : getProfesionalesMaxExclusiva(),
      cargo === "simple" ? "Simple" : "Exclusiva"
    );
  }
  if (rubroId === "otros") {
    return otrosRelativizedExplanation(
      postulanteId,
      cargo === "simple" ? getOtrosMaxSimple() : getOtrosMaxExclusiva(),
      cargo === "simple" ? "Simple" : "Exclusiva"
    );
  }
  if (rubroId === "oposicion") {
    const simple = promedioOposicion(postulanteId);
    if (cargo === "simple") return promedioOposicionExplanation(postulanteId);
    return `${promedioOposicionExplanation(postulanteId)}\n\nConversión Exclusiva: ${formatNumber(simple)} × ${formatNumber(getOposicionMaxExclusiva())} ÷ ${formatNumber(getOposicionMaxSimple())} = ${formatNumber(notaExclusivaDesdeSimple(simple))}`;
  }
  return "Esta solapa todavía no fue incorporada. Puntaje provisional: 0,00.";
}

function currentLoadedTotal(postulanteId, cargo) {
  return resultValueForRubro("docentes", postulanteId, cargo)
    + resultValueForRubro("cientificos", postulanteId, cargo)
    + resultValueForRubro("extension", postulanteId, cargo)
    + resultValueForRubro("profesionales", postulanteId, cargo)
    + resultValueForRubro("otros", postulanteId, cargo)
    + resultValueForRubro("oposicion", postulanteId, cargo);
}

function currentLoadedTotalExplanation(postulanteId, cargo) {
  const docentes = resultValueForRubro("docentes", postulanteId, cargo);
  const cientificos = resultValueForRubro("cientificos", postulanteId, cargo);
  const extension = resultValueForRubro("extension", postulanteId, cargo);
  const profesionales = resultValueForRubro("profesionales", postulanteId, cargo);
  const otros = resultValueForRubro("otros", postulanteId, cargo);
  const oposicion = resultValueForRubro("oposicion", postulanteId, cargo);
  return `Antecedentes docentes: ${formatNumber(docentes)}\nAntecedentes científicos: ${formatNumber(cientificos)}\nAntecedentes de extensión: ${formatNumber(extension)}\nAntecedentes profesionales: ${formatNumber(profesionales)}\nOtros antecedentes: ${formatNumber(otros)}\nPruebas de oposición: ${formatNumber(oposicion)}\nTotal cargado: ${formatNumber(docentes + cientificos + extension + profesionales + otros + oposicion)}`;
}

function meritEntries(cargo) {
  return state.postulantes
    .filter((postulante) => postulante[cargo])
    .map((postulante) => ({
      postulante,
      total: currentLoadedTotal(postulante.id, cargo)
    }))
    .sort((a, b) => {
      if (Math.abs(b.total - a.total) > 0.000001) return b.total - a.total;
      return String(a.postulante.apellidos || "").localeCompare(String(b.postulante.apellidos || ""), "es", { sensitivity: "base" });
    });
}

function renderMerit() {
  document.querySelector("#show-merit-simple").classList.toggle("is-active", meritCargo === "simple");
  document.querySelector("#show-merit-exclusive").classList.toggle("is-active", meritCargo === "exclusiva");
  const tbody = document.querySelector("#merit-table tbody");
  const ranked = meritEntries(meritCargo);

  tbody.innerHTML = ranked.map((entry, index) => `
    <tr>
      <td>${index + 1}</td>
      <th>${candidateNameHtml(entry.postulante)}</th>
      <td><span ${calculationAttribute(currentLoadedTotalExplanation(entry.postulante.id, meritCargo))}>${formatNumber(entry.total)}</span></td>
    </tr>
  `).join("");
}

function addPostulante() {
  const postulante = {
    id: `postulante_${Date.now()}`,
    numero: 1,
    apellidos: "",
    nombres: "",
    simple: true,
    exclusiva: false,
    dege: false,
    otroDepto: false,
    licencia: false
  };
  state.postulantes.unshift(postulante);
  render();
  document.querySelector('#postulantes-table tbody input[data-field="apellidos"]')?.focus();
}

function addCriterio() {
  const criterio = { id: `criterio_${Date.now()}`, nombre: "", peso: 0 };
  state.oposicion.criterios.push(criterio);
  render();
  document.querySelector(`#criterios-list input[data-criterio="${state.oposicion.criterios.length - 1}"][data-field="nombre"]`)?.focus();
}

function addEvaluador() {
  const colors = ["#d8a21b", "#2d7fb8", "#5b9b52", "#a05ca5", "#c65c46", "#3c9687"];
  const evaluador = {
    id: `eval_${Date.now()}`,
    nombre: `Evaluador ${state.oposicion.evaluadores.length + 1}`,
    color: colors[state.oposicion.evaluadores.length % colors.length],
    evaluaciones: {}
  };
  state.oposicion.evaluadores.push(evaluador);
  seedDocentes(state);
  seedCientificos(state);
  seedExtension(state);
  activeEvaluatorId = evaluador.id;
  render();
}

function switchView(viewId) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === viewId));
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-visible", view.id === viewId));
}

function fileTimestamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-") + "-" + [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("-");
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `concurso-jtp-${fileTimestamp()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportWorkbook(rows, sheetName, filename, columnWidths) {
  if (typeof XLSX === "undefined") return;
  const roundedRows = rows.map((row) => row.map((value) => {
    return typeof value === "number" ? roundToThree(value) : value;
  }));
  const worksheet = XLSX.utils.aoa_to_sheet(roundedRows);
  worksheet["!cols"] = columnWidths.map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}-${fileTimestamp()}.xlsx`, { bookType: "xlsx" });
}


function exportContextLabel(activeId) {
  if (activeId === "consolidada") return "Carga consolidada";
  return state.oposicion.evaluadores.find((evaluador) => evaluador.id === activeId)?.nombre || activeId || "Carga";
}

function exportHeaderRows(title, activeId = "") {
  return [
    ["Concurso JTP"],
    [state.administrativeDetails || ""],
    ["Fecha de inicio", state.contestStartDate || ""],
    ["Fecha de finalización", state.contestEndDate || ""],
    [title],
    activeId ? ["Vista exportada", exportContextLabel(activeId)] : [],
    []
  ].filter((row) => row.length);
}

function candidateColumns() {
  return state.postulantes.map(candidatePlainName);
}

function valueFromCargas(cargas, postulanteId, fieldId) {
  const value = cargas?.[postulanteId]?.valores?.[fieldId];
  return value === undefined || value === null ? "" : value;
}

function exportAntecedentExcel(moduleKey, activeId, title, filename, options = {}) {
  const module = state[moduleKey];
  const cargas = antecedentCargas(module, activeId);
  const rows = [
    ...exportHeaderRows(title, activeId),
    ["Ítem", ...candidateColumns()]
  ];

  module.tipos.forEach((tipo) => {
    rows.push([tipo.nombre]);
    if (options.kind === "docentes") {
      tipo.subitems.forEach((subitem) => {
        if (TEACHING_ORIGIN_ITEM_IDS.has(subitem.id)) {
          TEACHING_APPOINTMENT_ORIGINS.forEach((origin) => {
            const fieldId = teachingOriginFieldId(subitem.id, origin.id);
            rows.push([
              `${subitem.nombre} · ${origin.nombre}`,
              ...state.postulantes.map((postulante) => valueFromCargas(cargas, postulante.id, fieldId))
            ]);
          });
          return;
        }
        rows.push([
          subitem.nombre,
          ...state.postulantes.map((postulante) => valueFromCargas(cargas, postulante.id, subitem.id))
        ]);
      });
      rows.push([`Subtotal ${tipo.nombre}`, ...state.postulantes.map((postulante) => docentesTipoScore(tipo, postulante.id, cargas))]);
      rows.push([]);
      return;
    }

    if (options.kind === "cientificos" && tipo.id === "publicaciones") {
      scientificPublicationGroups(tipo).forEach((group) => {
        group.subitems.forEach((subitem) => {
          const label = scientificPublicationGroupIsSingleScore(group) ? group.nombre : `${group.nombre} · ${subitem.posicionNombre}`;
          rows.push([
            label,
            ...state.postulantes.map((postulante) => valueFromCargas(cargas, postulante.id, subitem.id))
          ]);
        });
      });
    } else {
      tipo.subitems.forEach((subitem) => {
        const extensionParts = moduleKey === "antecedentesExtension" ? extensionCompositeParts(subitem) : null;
        if (extensionParts) {
          extensionParts.forEach((part) => {
            rows.push([
              `${subitem.nombre} · ${part.label}`,
              ...state.postulantes.map((postulante) => valueFromCargas(cargas, postulante.id, extensionCompositeFieldId(subitem, part.kind)))
            ]);
          });
          return;
        }
        const professionalParts = moduleKey === "antecedentesProfesionales" ? professionalCompositeParts(subitem) : null;
        if (professionalParts) {
          professionalParts.forEach((part) => {
            rows.push([
              `${subitem.nombre} · ${part.label}`,
              ...state.postulantes.map((postulante) => valueFromCargas(cargas, postulante.id, professionalCompositeFieldId(subitem, part.kind)))
            ]);
          });
          return;
        }
        rows.push([
          subitem.nombre,
          ...state.postulantes.map((postulante) => valueFromCargas(cargas, postulante.id, subitem.id))
        ]);
      });
    }

    const scoreFn = {
      antecedentesCientificos: cientificosTipoScore,
      antecedentesExtension: extensionTipoScore,
      antecedentesProfesionales: profesionalesTipoScore,
      otrosAntecedentes: otrosTipoScore
    }[moduleKey];
    if (scoreFn) rows.push([`Subtotal ${tipo.nombre}`, ...state.postulantes.map((postulante) => scoreFn(tipo, postulante.id, cargas))]);
    rows.push([]);
  });

  if (options.kind === "docentes") {
    rows.push(["Total interno", ...state.postulantes.map((postulante) => docentesInternalScore(postulante.id, cargas))]);
    rows.push(["Total Simple", ...state.postulantes.map((postulante) => postulante.simple ? docentesRelativizedValue(docentesInternalScore(postulante.id, cargas), getDocentesMaxSimple()) : "")]);
    rows.push(["Total Exclusiva", ...state.postulantes.map((postulante) => postulante.exclusiva ? docentesRelativizedValue(docentesInternalScore(postulante.id, cargas), getDocentesMaxExclusiva()) : "")]);
  } else if (moduleKey === "antecedentesCientificos") {
    rows.push(["Total interno", ...state.postulantes.map((postulante) => cientificosInternalScore(postulante.id, cargas))]);
    rows.push(["Total Simple", ...state.postulantes.map((postulante) => postulante.simple ? cientificosRelativizedValue(cientificosInternalScore(postulante.id, cargas), getCientificosMaxSimple()) : "")]);
    rows.push(["Total Exclusiva", ...state.postulantes.map((postulante) => postulante.exclusiva ? cientificosRelativizedValue(cientificosInternalScore(postulante.id, cargas), getCientificosMaxExclusiva()) : "")]);
  } else if (moduleKey === "antecedentesExtension") {
    rows.push(["Total interno", ...state.postulantes.map((postulante) => extensionInternalScore(postulante.id, cargas))]);
    rows.push(["Total Simple", ...state.postulantes.map((postulante) => postulante.simple ? extensionRelativizedValue(extensionInternalScore(postulante.id, cargas), getExtensionMaxSimple()) : "")]);
    rows.push(["Total Exclusiva", ...state.postulantes.map((postulante) => postulante.exclusiva ? extensionRelativizedValue(extensionInternalScore(postulante.id, cargas), getExtensionMaxExclusiva()) : "")]);
  } else if (moduleKey === "antecedentesProfesionales") {
    rows.push(["Total interno", ...state.postulantes.map((postulante) => profesionalesInternalScore(postulante.id, cargas))]);
    rows.push(["Total Simple", ...state.postulantes.map((postulante) => postulante.simple ? profesionalesRelativizedValue(profesionalesInternalScore(postulante.id, cargas), getProfesionalesMaxSimple()) : "")]);
    rows.push(["Total Exclusiva", ...state.postulantes.map((postulante) => postulante.exclusiva ? profesionalesRelativizedValue(profesionalesInternalScore(postulante.id, cargas), getProfesionalesMaxExclusiva()) : "")]);
  } else if (moduleKey === "otrosAntecedentes") {
    rows.push(["Total interno", ...state.postulantes.map((postulante) => otrosInternalScore(postulante.id, cargas))]);
    rows.push(["Total Simple", ...state.postulantes.map((postulante) => postulante.simple ? otrosRelativizedValue(otrosInternalScore(postulante.id, cargas), getOtrosMaxSimple()) : "")]);
    rows.push(["Total Exclusiva", ...state.postulantes.map((postulante) => postulante.exclusiva ? otrosRelativizedValue(otrosInternalScore(postulante.id, cargas), getOtrosMaxExclusiva()) : "")]);
  }

  const annotation = module.anotaciones?.[activeId] || "";
  if (annotation) rows.push([], ["Anotaciones", annotation]);

  exportWorkbook(rows, title.slice(0, 31), `${filename}-${activeId}`, [42, ...state.postulantes.map(() => 20)]);
}

function exportOposicionExcel() {
  const evaluador = state.oposicion.evaluadores.find((item) => item.id === activeEvaluatorId) || state.oposicion.evaluadores[0];
  if (!evaluador) return;
  const rows = [
    ...exportHeaderRows("Oposición", evaluador.id),
    ["Campo / criterio", ...candidateColumns()],
    ["Fecha", ...state.postulantes.map((postulante) => evaluador.evaluaciones[postulante.id]?.fecha || "")],
    ["Tema", ...state.postulantes.map((postulante) => evaluador.evaluaciones[postulante.id]?.tema || "")],
    ...state.oposicion.criterios.map((criterio) => [
      `${criterio.nombre} · Peso ${formatNumber(criterio.peso, 1)}`,
      ...state.postulantes.map((postulante) => evaluador.evaluaciones[postulante.id]?.notas?.[criterio.id] ?? "")
    ]),
    ["Comentarios", ...state.postulantes.map((postulante) => evaluador.evaluaciones[postulante.id]?.comentarios || "")],
    ["Anotaciones", evaluador.anotaciones || ""],
    ["Nota Simple", ...state.postulantes.map((postulante) => postulante.simple ? notaEvaluador(evaluador, postulante.id) : "")],
    ["Nota Exclusiva", ...state.postulantes.map((postulante) => postulante.exclusiva ? notaExclusivaDesdeSimple(notaEvaluador(evaluador, postulante.id)) : "")],
    ["Simple promedio", ...state.postulantes.map((postulante) => postulante.simple ? promedioOposicion(postulante.id) : "")],
    ["Exclusiva promedio", ...state.postulantes.map((postulante) => postulante.exclusiva ? notaExclusivaDesdeSimple(promedioOposicion(postulante.id)) : "")]
  ];
  exportWorkbook(rows, "Oposición", `oposicion-${evaluador.id}`, [42, ...state.postulantes.map(() => 20)]);
}

function exportResultsExcel() {
  const cargoLabel = resultsCargo === "simple" ? "JTP Simple" : "JTP Exclusiva";
  const candidates = state.postulantes.filter((postulante) => postulante[resultsCargo]);
  const rows = [
    ["Concurso JTP"],
    [state.administrativeDetails || ""],
    ["Fecha de inicio", state.contestStartDate || ""],
    ["Fecha de finalización", state.contestEndDate || ""],
    [`Resultados generales - ${cargoLabel}`],
    [],
    ["Rubro", ...candidates.map((postulante) => candidatePlainName(postulante))]
  ];
  state.rubros.forEach((rubro) => {
    rows.push([
      rubro.nombre,
      ...candidates.map((postulante) => resultValueForRubro(rubro.id, postulante.id, resultsCargo))
    ]);
  });
  rows.push([
    "Total cargado actualmente",
    ...candidates.map((postulante) => currentLoadedTotal(postulante.id, resultsCargo))
  ]);
  exportWorkbook(
    rows,
    "Resultados",
    `resultados-${resultsCargo}`,
    [48, ...candidates.map(() => 20)]
  );
}

function exportMeritExcel() {
  const cargoLabel = meritCargo === "simple" ? "JTP Simple" : "JTP Exclusiva";
  const ranked = meritEntries(meritCargo);
  const rows = [
    ["Concurso JTP"],
    [state.administrativeDetails || ""],
    ["Fecha de inicio", state.contestStartDate || ""],
    ["Fecha de finalización", state.contestEndDate || ""],
    [`Orden de mérito - ${cargoLabel}`],
    [],
    ["Orden", "Postulante", "Puntaje total"],
    ...ranked.map((entry, index) => [
      index + 1,
      candidatePlainName(entry.postulante),
      entry.total
    ])
  ];
  exportWorkbook(rows, "Orden de mérito", `orden-merito-${meritCargo}`, [12, 42, 18]);
}

function importData(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state = seedEvaluations(migrateState(JSON.parse(reader.result)));
    render();
  });
  reader.readAsText(file);
}

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findColumn(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)));
}

function parseParticipation(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = normalizeHeader(value);
  return ["1", "si", "sí", "x", "true", "verdadero", "yes"].map(normalizeHeader).includes(normalized);
}

function parseCargo(value) {
  const normalized = normalizeHeader(value);
  const both = normalized.includes("ambos")
    || normalized.includes("simpleyexclusiva")
    || normalized.includes("simpleexclusiva");
  return {
    simple: both || normalized.includes("simple"),
    exclusiva: both || normalized.includes("exclusiva")
  };
}

function rowsToPostulantes(rows) {
  const nonEmptyRows = rows.filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? "").trim() !== ""));
  if (nonEmptyRows.length < 2) throw new Error("La tabla no contiene encabezados y datos.");

  let headerIndex = nonEmptyRows.findIndex((row) => {
    const normalized = row.map(normalizeHeader);
    return normalized.some((value) => ["apellido", "apellidos"].includes(value))
      && normalized.some((value) => ["nombre", "nombres"].includes(value));
  });
  if (headerIndex < 0) headerIndex = 0;

  const headers = nonEmptyRows[headerIndex];
  const surnameColumn = findColumn(headers, ["Apellido", "Apellidos"]);
  const nameColumn = findColumn(headers, ["Nombre", "Nombres"]);
  const simpleColumn = findColumn(headers, ["Simple", "JTP Simple"]);
  const exclusivaColumn = findColumn(headers, ["Exclusiva", "JTP Exclusiva"]);
  const degeColumn = findColumn(headers, ["DEGE", "Personal DEGE"]);
  const otroDeptoColumn = findColumn(headers, ["Otro Depto", "Otro Departamento"]);
  const licenciaColumn = findColumn(headers, ["Licencia", "Licencias", "Covid", "Covid/Licencias", "Covid-Licencias"]);
  const cargoColumn = findColumn(headers, ["Tipo de cargo", "Cargo", "Cargos"]);

  if (surnameColumn < 0 || nameColumn < 0) {
    throw new Error("No encontré las columnas Apellido y Nombres.");
  }
  if (simpleColumn < 0 && exclusivaColumn < 0 && cargoColumn < 0) {
    throw new Error("No encontré columnas Simple/Exclusiva ni una columna Tipo de cargo.");
  }

  return nonEmptyRows.slice(headerIndex + 1)
    .filter((row) => String(row[surnameColumn] ?? "").trim() || String(row[nameColumn] ?? "").trim())
    .map((row, index) => {
      const cargo = cargoColumn >= 0 ? parseCargo(row[cargoColumn]) : { simple: false, exclusiva: false };
      return {
        id: `postulante_importado_${Date.now()}_${index}`,
        numero: index + 1,
        apellidos: String(row[surnameColumn] ?? "").trim(),
        nombres: String(row[nameColumn] ?? "").trim(),
        simple: simpleColumn >= 0 ? parseParticipation(row[simpleColumn]) : cargo.simple,
        exclusiva: exclusivaColumn >= 0 ? parseParticipation(row[exclusivaColumn]) : cargo.exclusiva,
        dege: degeColumn >= 0 ? parseParticipation(row[degeColumn]) : false,
        otroDepto: otroDeptoColumn >= 0 ? parseParticipation(row[otroDeptoColumn]) : false,
        licencia: licenciaColumn >= 0 ? parseParticipation(row[licenciaColumn]) : false
      };
    });
}

function replacePostulantes(postulantes) {
  if (!postulantes.length) throw new Error("No se encontraron postulantes para importar.");
  state.postulantes = postulantes;
  state.oposicion.evaluadores.forEach((evaluador) => {
    evaluador.evaluaciones = {};
  });
  state.antecedentesDocentes.cargas = {};
  state.antecedentesDocentes.cargasEvaluadores = {};
  state.antecedentesCientificos.cargas = {};
  state.antecedentesCientificos.cargasEvaluadores = {};
  state.antecedentesExtension.cargas = {};
  state.antecedentesExtension.cargasEvaluadores = {};
  state.antecedentesProfesionales.cargas = {};
  state.antecedentesProfesionales.cargasEvaluadores = {};
  state.otrosAntecedentes.cargas = {};
  state.otrosAntecedentes.cargasEvaluadores = {};
  seedEvaluations(state);
  render();
}

function showImportStatus(message, isError = false) {
  const status = document.querySelector("#postulantes-import-status");
  status.innerHTML = `<div class="alert${isError ? " error" : ""}">${message}</div>`;
}

function importPostulantesFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      let rows;
      if (extension === "csv") {
        if (typeof XLSX === "undefined") throw new Error("No se pudo cargar el lector de archivos.");
        const workbook = XLSX.read(reader.result, { type: "string" });
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
      } else {
        if (typeof XLSX === "undefined") throw new Error("No se pudo cargar el lector de Excel.");
        const workbook = XLSX.read(reader.result, { type: "array" });
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
      }
      const postulantes = rowsToPostulantes(rows);
      replacePostulantes(postulantes);
      showImportStatus(`Se cargaron ${postulantes.length} postulantes desde ${file.name}.`);
    } catch (error) {
      showImportStatus(error.message || "No se pudo leer el archivo.", true);
    }
  });

  if (extension === "csv") reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

function positionCalculationTooltip(x, y) {
  const tooltip = document.querySelector("#calculation-tooltip");
  const gap = 14;
  const maxLeft = window.innerWidth - tooltip.offsetWidth - 8;
  const maxTop = window.innerHeight - tooltip.offsetHeight - 8;
  tooltip.style.left = `${Math.max(8, Math.min(x + gap, maxLeft))}px`;
  tooltip.style.top = `${Math.max(8, Math.min(y + gap, maxTop))}px`;
}

function showCalculationTooltip(target, x, y) {
  const tooltip = document.querySelector("#calculation-tooltip");
  tooltip.textContent = target.dataset.calculation;
  tooltip.classList.add("is-visible");
  positionCalculationTooltip(x, y);
}

function hideCalculationTooltip() {
  document.querySelector("#calculation-tooltip").classList.remove("is-visible");
}

document.addEventListener("mouseover", (event) => {
  const target = event.target.closest("[data-calculation]");
  if (target) showCalculationTooltip(target, event.clientX, event.clientY);
});
document.addEventListener("mousemove", (event) => {
  if (event.target.closest("[data-calculation]")) positionCalculationTooltip(event.clientX, event.clientY);
});
document.addEventListener("mouseout", (event) => {
  if (event.target.closest("[data-calculation]") && !event.relatedTarget?.closest?.("[data-calculation]")) {
    hideCalculationTooltip();
  }
});
document.addEventListener("focusin", (event) => {
  const target = event.target.closest("[data-calculation]");
  if (!target) return;
  const rect = target.getBoundingClientRect();
  showCalculationTooltip(target, rect.left, rect.bottom);
});
document.addEventListener("focusout", (event) => {
  if (event.target.closest("[data-calculation]")) hideCalculationTooltip();
});

document.addEventListener("change", (event) => {
  if (event.target.type !== "number" || event.target.value === "") return;
  if (event.target.matches("[data-cien-value], [data-publication-value]")) {
    const previous = event.target.value;
    normalizeIntegerInput(event.target);
    if (event.target.value !== previous) event.target.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  const usesTwoDecimals = event.target.matches(
    "[data-cien-type-field], [data-cien-field], [data-teaching-origin-value], [data-ext-type-field], [data-ext-field], [data-ext-value], [data-prof-type-field], [data-prof-field], [data-prof-value], [data-otros-type-field], [data-otros-field], [data-otros-value], #otros-total-interno"
  );
  const rounded = editableNumber(event.target.value, usesTwoDecimals ? 2 : 3);
  if (event.target.value === rounded) return;
  event.target.value = rounded;
  event.target.dispatchEvent(new Event("input", { bubbles: true }));
}, true);

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});
document.querySelectorAll("[data-score-lock]").forEach((button) => {
  button.addEventListener("click", () => toggleScoreConfigurationLock(button.dataset.scoreLock));
});
document.querySelector("#add-postulante").addEventListener("click", addPostulante);
document.querySelector("#administrative-details").addEventListener("input", (event) => {
  state.administrativeDetails = event.target.value;
  saveState();
});
document.querySelector("#contest-start-date").addEventListener("change", (event) => {
  state.contestStartDate = event.target.value;
  saveState();
});
document.querySelector("#contest-end-date").addEventListener("change", (event) => {
  state.contestEndDate = event.target.value;
  saveState();
});
document.querySelector("#sort-postulantes").addEventListener("click", sortPostulantes);
document.querySelector("#add-criterio").addEventListener("click", addCriterio);
document.querySelector("#restore-opposition-defaults").addEventListener("click", restoreOppositionDefaults);
document.querySelector("#add-evaluador").addEventListener("click", addEvaluador);
document.querySelector("#show-criteria").addEventListener("click", () => {
  oppositionView = "criteria";
  renderOppositionView();
});
document.querySelector("#show-evaluations").addEventListener("click", () => {
  oppositionView = "evaluations";
  renderOppositionView();
});
document.querySelector("#show-docentes-config").addEventListener("click", () => {
  docentesView = "config";
  renderDocentesView();
});
document.querySelector("#show-docentes-entry").addEventListener("click", () => {
  docentesView = "entry";
  renderDocentesView();
});
document.querySelector("#restore-docentes-defaults").addEventListener("click", restoreDocentesDefaults);
document.querySelector("#show-cientificos-config").addEventListener("click", () => {
  cientificosView = "config";
  renderCientificosView();
});
document.querySelector("#show-cientificos-entry").addEventListener("click", () => {
  cientificosView = "entry";
  renderCientificosView();
});
document.querySelector("#restore-cientificos-defaults").addEventListener("click", restoreCientificosDefaults);
document.querySelector("#show-extension-config").addEventListener("click", () => {
  extensionView = "config";
  renderExtensionView();
});
document.querySelector("#show-extension-entry").addEventListener("click", () => {
  extensionView = "entry";
  renderExtensionView();
});
document.querySelector("#restore-extension-defaults").addEventListener("click", restoreExtensionDefaults);
document.querySelector("#show-profesionales-config").addEventListener("click", () => {
  profesionalesView = "config";
  renderProfesionalesView();
});
document.querySelector("#show-profesionales-entry").addEventListener("click", () => {
  profesionalesView = "entry";
  renderProfesionalesView();
});
document.querySelector("#restore-profesionales-defaults").addEventListener("click", restoreProfesionalesDefaults);
document.querySelector("#show-otros-config").addEventListener("click", () => {
  otrosView = "config";
  renderOtrosView();
});
document.querySelector("#show-otros-entry").addEventListener("click", () => {
  otrosView = "entry";
  renderOtrosView();
});
document.querySelector("#restore-otros-defaults").addEventListener("click", restoreOtrosDefaults);
document.querySelector("#show-results-simple").addEventListener("click", () => {
  resultsCargo = "simple";
  renderResultados();
});
document.querySelector("#show-results-exclusive").addEventListener("click", () => {
  resultsCargo = "exclusiva";
  renderResultados();
});
document.querySelector("#show-merit-simple").addEventListener("click", () => {
  meritCargo = "simple";
  renderMerit();
});
document.querySelector("#show-merit-exclusive").addEventListener("click", () => {
  meritCargo = "exclusiva";
  renderMerit();
});
document.querySelector("#export-docentes-excel")?.addEventListener("click", () => exportAntecedentExcel("antecedentesDocentes", activeDocentesCargaId, "Antecedentes docentes", "antecedentes-docentes", { kind: "docentes" }));
document.querySelector("#export-cientificos-excel")?.addEventListener("click", () => exportAntecedentExcel("antecedentesCientificos", activeCientificosCargaId, "Antecedentes científicos", "antecedentes-cientificos", { kind: "cientificos" }));
document.querySelector("#export-extension-excel")?.addEventListener("click", () => exportAntecedentExcel("antecedentesExtension", activeExtensionCargaId, "Antecedentes de extensión", "antecedentes-extension"));
document.querySelector("#export-profesionales-excel")?.addEventListener("click", () => exportAntecedentExcel("antecedentesProfesionales", activeProfesionalesCargaId, "Antecedentes profesionales", "antecedentes-profesionales"));
document.querySelector("#export-otros-excel")?.addEventListener("click", () => exportAntecedentExcel("otrosAntecedentes", activeOtrosCargaId, "Otros antecedentes", "otros-antecedentes"));
document.querySelector("#export-oposicion-excel")?.addEventListener("click", exportOposicionExcel);
document.querySelector("#export-results-excel").addEventListener("click", exportResultsExcel);
document.querySelector("#export-merit-excel").addEventListener("click", exportMeritExcel);
document.querySelector("#export-data").addEventListener("click", exportData);
document.querySelector("#import-data").addEventListener("change", (event) => {
  if (event.target.files[0]) importData(event.target.files[0]);
});
document.querySelector("#import-postulantes").addEventListener("change", (event) => {
  if (event.target.files[0]) importPostulantesFile(event.target.files[0]);
  event.target.value = "";
});

render();
