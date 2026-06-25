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

La configuración pública del cliente se encuentra en `supabase-config.js`. La
estructura de la base de datos, funciones y políticas está documentada en
`supabase/schema.sql`.

## Primer uso

1. Crear la cuenta de la persona administradora desde la pantalla de acceso.
2. Confirmar el email, si la confirmación está habilitada en Supabase.
3. Ingresar y crear el concurso compartido.
4. Abrir **Accesos**, autorizar el email de cada evaluador y asignarle su identidad.
5. Cada evaluador crea su cuenta con exactamente el email autorizado.

En Supabase, la URL del sitio y las URLs de redirección de autenticación deben
incluir el dominio publicado en Netlify.
