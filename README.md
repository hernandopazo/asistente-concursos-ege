# Asistente de Concursos EGE

Aplicación web para asistir a la comisión evaluadora de concursos docentes del
Departamento de Ecología, Genética y Evolución, FCEyN - UBA.

Permite configurar los puntajes del concurso, cargar postulantes y evaluar:

- Antecedentes docentes.
- Antecedentes científicos.
- Antecedentes de extensión.
- Antecedentes profesionales.
- Otros antecedentes.
- Prueba de oposición.

Incluye cargas consolidadas o independientes por evaluador, resultados generales,
orden de mérito y exportación de datos.

## Abrir localmente

La aplicación es estática y no requiere instalación.

Para probarla con servidor local:

```bash
python3 -m http.server 8787
```

Luego abrir:

```text
http://localhost:8787
```

## Publicar en Netlify

1. Subir este directorio al repositorio de GitHub `asistente-concursos-ege`.
2. En Netlify, elegir **Add new site** y conectar ese repositorio.
3. Build command: dejar vacío.
4. Publish directory: `.`
5. Deploy.

## Colaboración y persistencia

La aplicación utiliza Supabase para:

- Autenticar a administradores y evaluadores mediante email y contraseña.
- Guardar la configuración compartida de cada concurso.
- Mantener separada la carga individual de cada evaluador.
- Sincronizar los cambios entre computadoras en tiempo real.
- Controlar mediante políticas RLS qué datos puede leer o modificar cada usuario.

El navegador conserva además una copia local y la aplicación permite exportar e
importar archivos JSON.

### Permisos

- El administrador principal configura el concurso, administra la terna y puede
  escribir o corregir las cargas de cualquier evaluador.
- Solo los administradores eligen entre carga única consolidada o carga
  independiente por evaluador.
- Un evaluador común solo puede modificar su propia carga individual.
- El administrador principal puede nombrar un único co-administrador adicional.
- El co-administrador puede corregir cargas y configuración, pero no puede nombrar
  otro co-administrador.
- El administrador principal puede revocar evaluadores activos o cancelar
  autorizaciones pendientes. Las cargas históricas se conservan.

### Resguardo de información

Los cambios se guardan en Supabase y existe además una copia local del navegador.
Antes de cerrar sesión se ofrece descargar un archivo JSON. Esta combinación
reduce mucho el riesgo de pérdida, pero ningún sistema puede prometer riesgo cero:
el JSON descargado sigue siendo el respaldo externo recomendado al cerrar una
jornada o después de cambios importantes.

La configuración pública del cliente se encuentra en `supabase-config.js`. La
estructura de la base de datos, funciones y políticas está documentada en
`supabase/schema.sql`.

## Primer uso

1. La persona administradora crea su cuenta desde la pantalla de acceso.
2. Confirmar el email, si la confirmación está habilitada en Supabase.
3. Ingresar al concurso fijo configurado para esta versión de prueba.
4. Abrir **Accesos**, autorizar el email de cada evaluador, asignarle un lugar
   libre de la terna y copiar su enlace seguro.
5. Cada evaluador abre su enlace, define una contraseña y queda incorporado
   automáticamente al concurso.

La autorización no depende del correo electrónico. El administrador genera un
enlace secreto y de un solo uso desde la aplicación y lo comunica directamente
al evaluador. Al abrirlo, la persona define su contraseña y queda vinculada con
el lugar asignado en la terna.

La función de Netlify que genera esos enlaces requiere estas variables de
entorno, configuradas únicamente en el panel de Netlify:

- `SUPABASE_SERVICE_ROLE_KEY`: clave `service_role` del proyecto de Supabase.
- `SUPABASE_URL`: URL del proyecto (opcional para este despliegue).
- `SITE_URL`: URL pública de Netlify (opcional para este despliegue).

La clave `service_role` nunca debe agregarse a `supabase-config.js`, al
repositorio ni al código ejecutado en el navegador.

En Supabase, la URL del sitio y las URLs de redirección de autenticación deben
incluir el dominio publicado en Netlify.

Esta versión utiliza un único concurso compartido:
`Concurso JTP EGE. Semi y Exclusiva. Julio 2026`. La creación de concursos
adicionales está deshabilitada tanto en la interfaz como en la base de datos.
