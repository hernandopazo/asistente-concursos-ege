# Asistente de Concursos EGE

Aplicación web para asistir a la comisión evaluadora de concursos docentes del Departamento de Ecología, Genética y Evolución, FCEyN - UBA.

La versión actual está preparada para el concurso compartido:

**Concurso JTP EGE. Semi y Exclusiva. Julio 2026**

La creación de concursos adicionales está deshabilitada en esta etapa para reducir errores operativos.

## Qué Permite Hacer

La aplicación organiza la evaluación de postulantes en las secciones principales del concurso:

- Postulantes.
- Puntajes generales configurados.
- Antecedentes docentes.
- Antecedentes científicos.
- Antecedentes de extensión.
- Antecedentes profesionales.
- Otros antecedentes.
- Prueba de oposición.
- Resultados.
- Orden de mérito.

Cada solapa calcula los puntajes relativizados según los puntajes generales acordados para JTP Simple y JTP Exclusiva.

## Roles

### Administrador

El administrador puede:

- Configurar la terna de evaluadores.
- Autorizar accesos.
- Editar nombres y colores de evaluadores.
- Corregir cargas de cualquier evaluador.
- Ver si cada evaluador de la terna está online u offline.
- Cerrar o reabrir la carga de evaluadores.
- Elegir si una solapa se trabaja como carga consolidada o como carga independiente por evaluador.
- Consolidar resultados.
- Importar respaldos JSON completos o cargas individuales.
- Recuperar cargas de oposición desde una planilla Excel exportada por el asistente.
- Descargar respaldos JSON y planillas Excel.

### Co-administrador

El administrador principal puede asignar un único co-administrador. El co-administrador puede ayudar a corregir y revisar cargas, pero no reemplaza al administrador principal en la organización general del concurso.

### Evaluador

Cada evaluador carga su propia evaluación individual. En modo de carga independiente, cada evaluador trabaja sobre su propia planilla y no necesita seleccionar participantes manualmente: todos los evaluadores de la terna intervienen.

## Estado De Evaluadores

En la solapa Concurso, sección **Evaluadores de la comisión**, el administrador puede ver si cada evaluador está **Online** u **Offline**.

El estado online/offline se basa en la presencia en tiempo real de Supabase: indica si esa persona tiene una sesión activa conectada al concurso compartido. No reemplaza los respaldos JSON ni confirma que todos los cambios hayan terminado de sincronizarse.

También aparece un indicador compacto en las solapas de evaluadores de Oposición para facilitar el trabajo simultáneo.

## Cierre De Cargas

El administrador dispone del botón **Cerrar carga de evaluadores** en la solapa Concurso.

Este botón bloquea la edición de las cargas individuales de todos los evaluadores, pero mantiene visibles sus solapas para revisión, comparación y exportación. Cuando la carga está cerrada, el botón cambia a **Reabrir carga de evaluadores**.

Cerrar carga de evaluadores no es lo mismo que bloquear el concurso:

- **Cerrar carga de evaluadores:** congela las cargas individuales de evaluadores. Sirve para terminar la etapa de carga y revisar resultados.
- **Bloquear concurso:** congela de forma general el concurso y sus datos principales. Es una acción más amplia, pensada para el cierre final.

Flujo recomendado:

1. Mantener el concurso editable durante la evaluación.
2. Usar **Cerrar carga de evaluadores** cuando todos hayan terminado.
3. Revisar diferencias, resultados, exportaciones y orden de mérito.
4. Usar **Bloquear concurso** sólo cuando el estado final ya esté confirmado.

## Postulantes

La solapa Postulantes contiene los datos básicos y marcas administrativas:

- Apellido.
- Nombres.
- Inscripción a JTP Simple.
- Inscripción a JTP Exclusiva.
- DEGE.
- Otro departamento.
- Covid/Licencias.
- Opo virtual.

**Opo virtual** no modifica ningún puntaje. Sólo sirve para recordar qué postulantes realizarán la prueba de oposición de modo no presencial.

La lista puede cargarse desde Excel o CSV. Si el archivo incluye columnas como `Opo virtual`, `Oposición virtual`, `Virtual` u `Opo no presencial`, la marca se importa automáticamente.

## Cargas De Antecedentes

Las solapas de antecedentes pueden trabajarse de dos maneras:

- **Carga única de la comisión:** se completa una única planilla consolidada.
- **Carga independiente por evaluador:** cada evaluador completa su propia carga individual.

Cuando hay carga independiente, la app permite comparar diferencias entre evaluadores. La carga consolidada no se reemplaza automáticamente: el administrador decide cuándo y cómo consolidar.

Las solapas de antecedentes incluyen un campo de **Anotaciones** al final de la carga. Estas anotaciones son comentarios de trabajo y no afectan los puntajes.

## Prueba De Oposición

La solapa Oposición maneja:

- Fecha.
- Tema.
- Notas por criterio.
- Comentarios.
- Anotaciones del evaluador.

Los pesos de oposición se normalizan para obtener el máximo acordado en Simple y Exclusiva. Las notas cargadas por evaluadores van de 1 a 10.

El botón de limpieza de antecedentes **no borra datos de oposición**. No borra fechas, temas, notas, comentarios ni anotaciones de oposición.

### Respaldo Y Recuperación De Oposición En Excel

En la vista de evaluaciones de Oposición se puede elegir:

- **Evaluador actual:** genera una planilla con la carga del evaluador seleccionado.
- **Todos los evaluadores:** genera un libro con una hoja de resumen y una hoja por evaluador.

Para disponer de una recuperación paralela al JSON, se recomienda descargar periódicamente la opción **Todos los evaluadores**.

El botón **Recuperar desde Excel** admite las planillas de oposición generadas por el propio asistente. Antes de aplicar una recuperación:

1. Valida la estructura del libro.
2. Asocia evaluadores y postulantes por sus nombres.
3. Comprueba que estén presentes todos los criterios actuales.
4. Rechaza notas que no estén entre 1 y 10.
5. Muestra una vista previa de las asociaciones y valores encontrados.
6. Exige guardar un JSON del estado actual.

La recuperación desde Excel modifica únicamente fechas, temas, notas, comentarios, anotaciones y abstenciones de Oposición. No reemplaza postulantes, evaluadores, criterios, pesos, antecedentes ni configuración administrativa. Los totales y promedios incluidos en la planilla no se importan: la aplicación vuelve a calcularlos.

## Resultados Y Orden De Mérito

Resultados muestra la suma horizontal de las secciones del concurso, siguiendo el orden de los rubros definidos en Puntajes.

Orden de mérito permite ver el ranking según el cargo seleccionado. Ambas secciones pueden exportarse a Excel.

## Guardado De JSON Y Excel

El botón **Exportar JSON** guarda una copia completa del concurso en el estado actual del navegador.

En navegadores compatibles se abre el cuadro **Guardar como…**, que permite elegir la ubicación, crear una carpeta y confirmar el nombre. Las descargas de Excel utilizan el mismo mecanismo y el navegador intenta recordar la última carpeta utilizada. Si el navegador no admite esta función, los archivos se guardan mediante la descarga habitual.

Conviene exportar JSON:

- Antes de comenzar una jornada de evaluación.
- Después de una carga importante.
- Antes de cerrar la aplicación.
- Antes de limpiar anotaciones.
- Si hay problemas de internet.
- Al finalizar la carga de cada evaluador.

El JSON es el respaldo externo principal. Supabase guarda los datos en línea y el navegador conserva una copia local, pero el JSON permite recuperar información si hubo fallos de conexión, sesiones viejas o errores operativos.

## Trabajo Con Mala Conexión

Si durante la evaluación se corta internet o la conexión es inestable, cada evaluador puede seguir trabajando en su navegador siempre que haya abierto previamente la app y el concurso con conexión.

Flujo recomendado:

1. Cada evaluador entra al sitio antes de empezar.
2. Verifica que ve el concurso correcto y su nombre.
3. Trabaja sólo sobre su carga individual.
4. Si falla internet, continúa cargando localmente.
5. Al terminar, exporta un JSON.
6. El administrador puede incorporar luego esa carga individual desde el JSON exportado.

## Importar JSON Completo O Individual

En Respaldo existen dos caminos diferentes:

### Importar JSON completo

Restaura una copia completa del concurso. Es una acción amplia, por lo que utiliza un flujo protegido:

1. Lee y valida el JSON sin modificar el concurso.
2. Comprueba postulantes, evaluadores, rubros y estructura general.
3. Muestra una comparación entre el concurso actual y el contenido del archivo.
4. Advierte diferencias de identidades o referencias administrativas.
5. Exige guardar un JSON del estado actual.
6. Crea una recuperación interna.
7. Recién después de confirmar reemplaza y sincroniza los datos.

Si la validación falla, se cancela el guardado del respaldo o no puede crearse la recuperación interna, el concurso no se modifica.

### Recuperación avanzada después de importar

Después de aplicar una importación completa o una recuperación de Oposición desde Excel, aparece la sección cerrada **Recuperación avanzada**.

La opción **Restaurar estado anterior…**:

- Informa qué archivo se importó y a qué hora.
- Está disponible durante una hora.
- Advierte si se detectaron cambios posteriores.
- Pide una confirmación inicial.
- Exige escribir exactamente `RESTAURAR`.
- Obliga a guardar un JSON del estado actual antes de restaurar.

Restaurar vuelve al estado inmediatamente anterior a la importación. Si se cargaron datos nuevos después, esos cambios dejarán de estar activos, aunque quedarán guardados en el JSON exigido antes de restaurar. Por este motivo debe utilizarse sólo para revertir una importación reciente que resultó incorrecta.

### Importar JSON de un evaluador

Permite al administrador incorporar sólo la carga individual de un evaluador desde un JSON completo exportado por esa persona.

Esta acción:

- Copia la carga individual de oposición.
- Copia la carga individual de antecedentes docentes, científicos, extensión, profesionales y otros.
- Copia las anotaciones individuales correspondientes.
- No toca la carga consolidada.
- No toca puntajes generales.
- No toca criterios.
- No toca postulantes.
- No toca cargas de otros evaluadores.

Si el JSON no coincide con todos los postulantes actuales, la app avisa antes de continuar.

## Estrategia Recomendada De Respaldo

Para reducir el riesgo operativo:

1. Exportar un JSON completo antes de cada jornada o cambio importante.
2. En Oposición, descargar periódicamente el Excel de **Todos los evaluadores**.
3. Conservar los archivos con su fecha y hora sin sobrescribir versiones anteriores.
4. Revisar siempre la vista previa antes de importar.
5. No continuar cargando datos mientras una importación está pendiente de revisión.
6. Usar **Restaurar estado anterior…** únicamente inmediatamente después de detectar una importación incorrecta.

El JSON es la recuperación integral. El Excel de Oposición es una vía paralela y limitada a esa solapa.

## Limpieza De Anotaciones

Existe una **Zona de limpieza** al final de la solapa Concurso.

El botón **Limpiar anotaciones de antecedentes**:

- Sólo puede usarlo un administrador.
- Exige haber exportado un JSON en esa misma sesión.
- Pide doble confirmación.
- Borra únicamente anotaciones de antecedentes.

No borra:

- Puntajes.
- Criterios.
- Postulantes.
- Cargas numéricas.
- Carga consolidada.
- Notas de oposición.
- Fechas o temas de oposición.
- Comentarios de oposición.

## Acceso De Evaluadores

El administrador autoriza a cada evaluador desde la solapa Concurso y genera un enlace seguro. El evaluador abre ese enlace, define su contraseña y queda vinculado a su lugar en la terna.

Si un evaluador ve datos raros, una sesión vieja o falta de sincronización, se recomienda:

1. Exportar JSON si ya cargó datos.
2. Cerrar pestañas previas.
3. Abrir nuevamente el enlace seguro.
4. Verificar que ve el concurso correcto y su nombre.

Una ventana incógnito puede servir para diagnosticar problemas de sesión o datos locales del navegador, pero no es obligatoria para el trabajo normal.

## Persistencia Técnica

La aplicación utiliza Supabase para:

- Autenticar administradores y evaluadores.
- Guardar la configuración compartida del concurso.
- Mantener separada la carga individual de cada evaluador.
- Sincronizar datos entre computadoras.
- Mostrar presencia online/offline de evaluadores conectados.
- Controlar permisos mediante políticas RLS.

El navegador conserva además una copia local mediante `localStorage`.

La configuración pública del cliente está en `supabase-config.js`. La estructura de la base de datos, funciones y políticas está en `supabase/schema.sql`.

La clave `service_role` de Supabase se configura sólo como variable de entorno secreta en Netlify y nunca debe guardarse en el repositorio ni en código ejecutado por el navegador.

## Desarrollo Local

La aplicación es estática. Para probarla localmente:

```bash
python3 -m http.server 8787
```

Luego abrir:

```text
http://localhost:8787
```

## Publicación En Netlify

El sitio se publica desde GitHub en Netlify.

Configuración general:

- Build command: vacío.
- Publish directory: `.`

Variables de entorno necesarias para funciones de acceso:

- `SUPABASE_SERVICE_ROLE_KEY` como secreto.
- `SUPABASE_URL` si corresponde.
- `SITE_URL` si corresponde.

En Supabase deben estar configuradas las URLs de redirección para el dominio publicado en Netlify.
