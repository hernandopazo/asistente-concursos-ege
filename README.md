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
- Elegir si una solapa se trabaja como carga consolidada o como carga independiente por evaluador.
- Consolidar resultados.
- Importar respaldos JSON completos o cargas individuales.
- Descargar respaldos JSON y planillas Excel.

### Co-administrador

El administrador principal puede asignar un único co-administrador. El co-administrador puede ayudar a corregir y revisar cargas, pero no reemplaza al administrador principal en la organización general del concurso.

### Evaluador

Cada evaluador carga su propia evaluación individual. En modo de carga independiente, cada evaluador trabaja sobre su propia planilla y no necesita seleccionar participantes manualmente: todos los evaluadores de la terna intervienen.

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

## Resultados Y Orden De Mérito

Resultados muestra la suma horizontal de las secciones del concurso, siguiendo el orden de los rubros definidos en Puntajes.

Orden de mérito permite ver el ranking según el cargo seleccionado. Ambas secciones pueden exportarse a Excel.

## Respaldo JSON

El botón **Exportar JSON** descarga una copia completa del concurso en el estado actual del navegador.

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

Restaura una copia completa del concurso. Es una acción amplia y puede reemplazar el estado actual.

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
