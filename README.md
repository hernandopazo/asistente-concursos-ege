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

## Persistencia actual

Los datos se guardan en el almacenamiento local del navegador. También pueden
exportarse e importarse como archivos JSON.

Esta primera versión pública está destinada a pruebas y recepción de sugerencias.
Todavía no incorpora autenticación ni una base de datos compartida entre evaluadores.
