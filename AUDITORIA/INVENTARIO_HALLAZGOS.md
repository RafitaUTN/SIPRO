# Inventario de hallazgos

| ID | Severidad | Categoría | Módulo | Descripción | Estado |
| -- | --------- | --------- | ------ | ----------- | ------ |
| SEC-001 | CRÍTICO | Seguridad | Renderer | XSS almacenado con Node disponible | REPRODUCIDO |
| SEC-002 | CRÍTICO | Seguridad | Usuarios/Login | Contraseñas claras expuestas al renderer/sesión | REPRODUCIDO |
| AUTH-001 | CRÍTICO | Autorización | Global | No existe control real por rol o sesión | IDENTIFICADO |
| SEC-003 | CRÍTICO | Seguridad | Arranque | Administrador y contraseña hardcodeados | REPRODUCIDO |
| SEC-004 | ALTO | Secretos/RLS | Supabase/Forge | `.env` empaquetado y CRUD anónimo | REQUIERE_VALIDACIÓN |
| SEC-005 | ALTO | Supply chain | Vistas | CDN remoto sin CSP/SRI con Node | IDENTIFICADO |
| SEC-006 | ALTO | Seguridad | Express | API sin autenticación y CORS abierto | REPRODUCIDO |
| DB-001 | ALTO | Integridad | Stock | Movimiento duplicado | REPRODUCIDO |
| DB-002 | MEDIO | Integridad | Productos | BD admite stock negativo | REPRODUCIDO |
| DB-003 | ALTO | Concurrencia | Stock | Salidas concurrentes pierden actualización | REPRODUCIDO |
| DB-004 | ALTO | Integridad | Eliminación | Desvincular+borrar sin transacción | IDENTIFICADO |
| DB-005 | MEDIO | Validación | Esquema | Faltan invariantes de dominio | IDENTIFICADO |
| DB-006 | MEDIO | Consistencia | Esquema | `app` documentado vs `public` ejecutado | IDENTIFICADO |
| DB-007 | MEDIO | Rendimiento | Esquema | Índices de FK/filtros ausentes | IDENTIFICADO |
| BUG-001 | ALTO | Funcional | Express | Usuarios devuelve 500; writes incompatibles | REPRODUCIDO |
| BUG-002 | MEDIO | Funcional | UI | Helper de notificaciones mal cargado | REPRODUCIDO |
| FUNC-001 | MEDIO | Incompleto | Dashboard | Movimientos de hoy fijo en cero | REPRODUCIDO |
| FUNC-002 | MEDIO | Incompleto | Reportes/Facturas | Ingresos vacío y facturación desconectada | IDENTIFICADO |
| PERF-001 | ALTO | Escalabilidad | Listados | Truncamiento silencioso a 1.000 | REPRODUCIDO |
| PERF-002 | MEDIO | Rendimiento | Excel | Exportación trae relaciones sin límite | IDENTIFICADO |
| PERF-003 | MEDIO | Rendimiento | Dashboard | Polling de colecciones completas | IDENTIFICADO |
| DEP-001 | ALTO | Dependencias | Runtime/build | 40 vulnerabilidades npm | REPRODUCIDO |
| DEP-002 | BAJO | Dependencias | Build | Versiones Forge mezcladas/extraneous | IDENTIFICADO |
| ARCH-001 | ALTO | Arquitectura | Global | UI, negocio y datos en renderer | IDENTIFICADO |
| TEST-001 | ALTO | Testing | Global | Proyecto original sin pruebas | IDENTIFICADO |
| DEAD-001 | BAJO | Código muerto | Preload | Preload no conectado | REPRODUCIDO |
| DEAD-002 | BAJO | Código muerto | Servidor/modelos | Rutas, funciones y dependencias sin consumidor | IDENTIFICADO |
| DOC-001 | BAJO | Documentación | Docs | Arquitectura/rutas/DDL contradictorios | IDENTIFICADO |
| LOG-001 | BAJO | Observabilidad | Global | Solo consola, sin política de redacción | IDENTIFICADO |
| ENV-001 | BAJO | Configuración | Env | Ejemplo contiene variables obsoletas | IDENTIFICADO |
| ARCH-002 | MEJORA | Mantenibilidad | Datos | Clientes/consultas Supabase duplicados | IDENTIFICADO |

## Fichas completas

Formato: archivo/función/líneas; actual → esperado; evidencia y reproducción; causa e impacto; solución, riesgo, pruebas y dependencias.

### SEC-001

Categoría seguridad, CRÍTICO. `SRC/js/CRUDPRODUCTO.js:179-223` (`renderTabla`), `CRUDUSUARIO.JS:49-67`, `registro.js:38-65`, `notificaciones.js:16-28`. Actual: datos de BD entran en `innerHTML`; esperado: texto no ejecutable. Evidencia: insertar producto local con `onerror`, abrir Productos; `xssExecuted=true` y `require=function`. Causa: interpolación sin escape + Node integration. Impacto: posible RCE/archivos/credenciales. Solución: DOM+`textContent`, CSP, aislar Node. Riesgo de cambio medio (render). Pruebas: payloads en cada sink y regresión visual. Dependencias: SEC-005, ARCH-001. Estado REPRODUCIDO.

### SEC-002

Seguridad, CRÍTICO. `usuarioModel.getAllUsuarios:12-19`, `login.js:17-29`, `CRUDUSUARIO.JS:77-90`. Actual: `select('*')`, comparación clara y usuario completo en sesión; esperado: verificación segura sin devolver secretos. Evidencia: pruebas SEC-002 y `storedHasPassword=true`; reproducir con login local/DevTools. Causa: autenticación casera. Impacto: compromiso masivo y reutilización de passwords. Solución: Supabase Auth o backend con Argon2/bcrypt y DTO sin secreto. Riesgo alto por migración de cuentas. Pruebas de migración/login/reset/sesión. Dependencias: AUTH-001, SEC-004. Estado REPRODUCIDO.

### AUTH-001

Autorización, CRÍTICO. `panelPrincipal.js:27-37`, vistas y modelos completos. Actual: rol se almacena pero “se muestra todo”; navegación directa y CRUD anónimo. Esperado: permisos aplicados en capa confiable/RLS. Evidencia: código y recorrido como `usuario` con acceso a módulos. Reproducir iniciando con operador. Causa: renderer tratado como frontera de seguridad. Impacto: acceso administrativo no autorizado/IDOR. Solución: matriz validada + Auth/RLS/IPC. Riesgo alto por reglas desconocidas. Tests multirol/anon. Dependencias: Supabase/RLS. Estado IDENTIFICADO; reglas REQUIEREN_VALIDACIÓN.

### SEC-003

Seguridad, CRÍTICO. `index.js:112-126`, `crearUsuarioPorDefecto`. Actual: crea `admin@sistem.com`/`contra1234`; esperado: bootstrap seguro y único. Evidencia: arranque local creó la cuenta; reproducir con seed sin esa fila. Causa: credencial de conveniencia en runtime. Impacto: acceso predecible. Solución: retirar y aprovisionar fuera del cliente con cambio obligatorio. Riesgo medio (instalaciones nuevas). Tests primera instalación/recuperación. Dependencia AUTH-001. Estado REPRODUCIDO.

### SEC-004

Secretos/RLS, ALTO. `forge.config.js:2-8`, `.env`, modelos. Actual: empaqueta URL+legacy anon JWT y opera sin sesión; esperado: solo clave publicable y políticas mínimas. Evidencia: clasificación local del key (rol anon) y `extraResource`; no se consultó remoto. Repro: inspección de asar/recursos instalada. Causa: confundir anon con autorización. Impacto potencial: CRUD externo. Solución: RLS por usuario/rol, backend para secretos, retirar `.env`, rotar después. Riesgo alto si bloquea clientes viejos. Tests RLS por rol. Dependencia Supabase. Estado REQUIERE_VALIDACIÓN remota de solo lectura.

### SEC-005

Supply chain, ALTO. Todas las vistas, líneas 7-8/68-71. Actual: JS/CSS CDN sin CSP/SRI dentro de renderer Node; esperado: assets locales/verificados y CSP. Evidencia estática en HTML. Repro: desconectar red observa recursos fallar. Causa: dependencia remota. Impacto: compromiso CDN escala a ejecución local. Solución: empaquetar Bootstrap/icons, CSP y bloquear navegación. Riesgo bajo-medio (estilos). Tests offline/CSP. Dependencias Bootstrap/Electron. Estado IDENTIFICADO.

### SEC-006

Seguridad, ALTO. `server.js:8-122`, middleware/rutas. Actual: `cors()` abierto y CRUD sin auth; esperado: servidor no expuesto o autenticado/autorizado. Evidencia OPTIONS local devolvió `*` y métodos mutables. Repro: arrancar server con `.env.audit` y petición Origin atacante. Causa: API prototipo. Impacto: modificación remota si se despliega. Solución: retirar si muerto o bind localhost+auth+validación+CORS allowlist. Riesgo depende de consumidores. Tests HTTP auth/CORS. Dependencias Express. Estado REPRODUCIDO.

### DB-001

Integridad, ALTO. `productoModel.js:164-234`; trigger DDL. Actual: UPDATE dispara trigger y modelo inserta otro movimiento; esperado: exactamente uno. Evidencia test genera 2 filas; reproducir `entradaProducto(id,2)`. Causa: dos responsables de auditoría. Impacto: reportes/stock histórico falsos. Solución: una RPC transaccional y un único mecanismo. Riesgo alto para historial. Tests entrada/salida/edición. Dependencias trigger/PostgREST. Estado REPRODUCIDO.

### DB-002

Integridad, MEDIO. DDL `productos.stock`; UI `CRUDPRODUCTO.js:66-68`. Actual: BD aceptó -1; esperado `CHECK stock>=0`. Evidencia test DB-002. Causa validación solo UI. Impacto inventario imposible. Solución limpiar datos y añadir constraint. Riesgo medio si ya existen negativos. Tests límite -1/0/max. Dependencia migración. Estado REPRODUCIDO.

### DB-003

Concurrencia, ALTO. `productoModel.entradaProducto/salidaProducto:164-237`. Actual: leer-calcular-escribir; esperado operación atómica. Evidencia dos salidas 7/10 aprobadas, final 3. Repro `Promise.all`. Causa ausencia transacción/lock/CAS. Impacto pérdida de inventario/auditoría. Solución RPC con UPDATE condicional o row lock. Riesgo alto. Tests 20-100 concurrentes/rollback. Dependencias DB-001. Estado REPRODUCIDO.

### DB-004

Integridad, ALTO. `deleteProductoDesvincular:129-143`. Actual: UPDATE y DELETE separados; esperado atomicidad. Evidencia estática; reproducir requiere inducir fallo entre pasos. Causa Data API multi-request. Impacto estado parcial. Solución RPC transaccional o FK `ON DELETE SET NULL` validada. Riesgo alto por semántica histórica. Tests fallo/rollback/FK. Estado IDENTIFICADO.

### DB-005

Validación, MEDIO. DDL de usuarios/movimientos/detalle. Actual: acepta rol/tipo arbitrario y cantidades/precios negativos; esperado CHECKs de invariantes. Evidencia `ScripBD.txt` y catálogo local. Repro INSERT local inválido. Causa DDL incremental incompleto. Impacto estados imposibles. Solución constraints tras perfilar datos. Riesgo medio. Tests por constraint. Dependencias reglas de negocio. Estado IDENTIFICADO.

### DB-006

Consistencia, MEDIO. `documentacion/ScripBD.txt`, `script.txt`, modelos y `db.js`. Actual: DDL `app`, cliente `public` implícito y dos finales de trigger; esperado fuente canónica migrada. Evidencia comparación estática. Repro ejecutar DDL y modelo. Causa recuperación/versiones mezcladas. Impacto despliegues irreproducibles. Solución confirmar remoto y consolidar migraciones. Riesgo alto si se asume esquema incorrecto. Tests reset desde cero. Estado IDENTIFICADO.

### DB-007

Rendimiento, MEDIO. FKs/tablas del DDL. Actual: solo índices PK/UNIQUE; esperado índices según joins/filtros. Evidencia `pg_indexes` local. Repro EXPLAIN con volumen. Causa índices no declarados. Impacto scans en históricos. Solución índices en `producto_id`, `fecha`, FKs tras medir. Riesgo bajo-medio por costo escritura. Tests EXPLAIN/latencia. Estado IDENTIFICADO.

### BUG-001

Funcional, ALTO. `server.js:14-122`, `db.js:12-128`. Actual: productos GET 200, usuarios GET 500; writes producto omiten stock/categoría; esperado CRUD coherente. Evidencia HTTP local y stack “No se pudo detectar tabla”. Causa parser pseudo-SQL solo reconoce `app.` y contrato obsoleto. Impacto API inutilizable/insegura. Solución retirar o reemplazar por servicios explícitos. Riesgo según consumidores desconocidos. Tests REST completos. Dependencias SEC-006. Estado REPRODUCIDO.

### BUG-002

Funcional, MEDIO. vistas líneas de scripts y `notificaciones.js:2`. Actual: rutas `views/helpers` inexistentes y archivo ESM cargado clásico; panel no importa función. Esperado una carga módulo válida. Evidencia CDP: 404, SyntaxError, `toastFunctionType=undefined`. Repro abrir vistas. Causa rutas/tipos mezclados. Impacto mensajes fallan. Solución eliminar script duplicado e importar correctamente. Riesgo bajo. Tests consola/toast. Estado REPRODUCIDO.

### FUNC-001

Incompleto, MEDIO. `panelPrincipal.js:19-20`. Actual: movimientos siempre “0”; esperado conteo de hoy. Evidencia DOM tras login. Repro abrir panel con movimientos. Causa placeholder. Impacto dashboard engañoso. Solución consulta count con rango horario definido. Riesgo medio por zona horaria. Tests fechas/bordes. Estado REPRODUCIDO.

### FUNC-002

Incompleto, MEDIO. `productoModel.js:41-44`, tablas/trigger de facturas. Actual: ingresos `[]`, facturas sin consumidor; esperado implementar o retirar tras validación. Evidencia referencias cero. Repro llamar función. Causa trabajo a medias. Impacto reportes ausentes/DDL huérfano. Solución decisión de negocio. Riesgo alto si se elimina. Tests de venta/factura. Estado IDENTIFICADO.

### PERF-001

Escalabilidad, ALTO. getters/listados y filtros renderer. Actual: sin range/paginación; 1.503 BD -> 1.000 modelo. Esperado totalidad explícita paginada. Evidencia prueba de escala. Repro insertar 1.500 ficticios y contar. Causa límite PostgREST + diseño full-fetch. Impacto datos invisibles. Solución cursor/server-side. Riesgo medio UI. Tests 1k/10k/100k. Estado REPRODUCIDO.

### PERF-002

Rendimiento, MEDIO. `exportExcel.js:12-98`. Actual: trae productos y todos los movimientos anidados, agrega en memoria; esperado agregado paginado/SQL. Evidencia consulta estática. Repro dataset grande/perfil heap. Causa comodidad de relación embebida. Impacto memoria/latencia. Solución RPC agregado/stream. Riesgo medio formato. Tests XLSX y memoria. Dependencia ExcelJS. Estado IDENTIFICADO.

### PERF-003

Rendimiento, MEDIO. `panelPrincipal.js:45-52`. Actual: cada 30 s descarga productos/usuarios completos; esperado counts ligeros y ciclo administrado. Evidencia código. Repro observar red. Causa polling ingenuo. Impacto carga proporcional a datos/clientes. Solución count/head, invalidación/evento. Riesgo bajo. Tests timers/navegación. Estado IDENTIFICADO.

### DEP-001

Dependencias, ALTO. `package.json/package-lock.json`. Actual: npm audit 40 (1C/35A/3M/1B); esperado runtime parcheado compatible. Evidencia comando npm audit 2026-09-03. Repro `npm audit`. Causa versiones antiguas/rangos. Impacto incluye Electron/updater/build chain. Solución lotes y pruebas, sin `--force`. Riesgo alto por majors. Tests start/package/E2E. Estado REPRODUCIDO.

### DEP-002

Dependencias, BAJO. package/forge. Actual Forge 6 con publisher 7; dos extraneous y dependencias posiblemente sin uso; esperado conjunto coherente. Evidencia `npm ls/outdated`. Causa evolución parcial. Impacto build frágil/tamaño. Solución confirmar usos y alinear. Riesgo medio en packaging. Tests make/publish simulado. Estado IDENTIFICADO.

### ARCH-001

Arquitectura, ALTO. renderers/modelos/main/server. Actual UI accede BD/Node y duplica servicios; esperado frontera confiable. Evidencia imports directos y Node runtime. Repro DevTools `require`. Causa arquitectura monolítica sin aislamiento. Impacto amplifica toda inyección y dificulta auth. Solución incremental preload IPC/servicios. Riesgo alto; requiere tests de caracterización. Estado IDENTIFICADO.

### TEST-001

Testing, ALTO. package original/repositorio. Actual cero tests; esperado cobertura crítica. Evidencia inventario inicial. Repro `rg`/scripts package. Causa proyecto recuperado. Impacto regresiones no detectadas. Solución plan 15 y suite añadida. Riesgo bajo. Dependencias Node test/Supabase local. Estado IDENTIFICADO (parcialmente mitigado, no corregido).

### DEAD-001

Código muerto, BAJO. `preload.js`, `index.js:63-66`. Actual preload no configurado; esperado usarlo o retirarlo. Evidencia `electronAPI=undefined`. Repro abrir login. Causa migración de seguridad incompleta. Impacto falsa sensación de aislamiento. Solución integrarlo en P0. Riesgo alto al cambiar APIs. Tests bridge. Estado REPRODUCIDO.

### DEAD-002

Código muerto, BAJO. `server.js`, `db.js`, funciones listadas en `11_CODIGO_MUERTO.md`. Actual sin consumidores; esperado propósito confirmado. Evidencia grafo de referencias/scripts. Repro inventario estático. Causa versiones recuperadas mezcladas. Impacto mantenimiento/dependencias/ataque si se activa. Solución marcar/deprecar y eliminar solo con validación. Riesgo medio. Tests búsqueda/E2E. Estado IDENTIFICADO.

### DOC-001

Documentación, BAJO. README, uso, DDL y actualizaciones. Actual describe PostgreSQL directo, exportación distinta y roles inconsistentes; esperado docs del runtime. Evidencia comparación. Repro seguir README. Causa documentación rezagada. Impacto operación errónea. Solución actualizar después de decisiones P0/P1. Riesgo bajo. Tests comandos docs. Estado IDENTIFICADO.

### LOG-001

Observabilidad, BAJO. global `console.*`. Actual sin niveles/correlación/rotación; errores IPC a veces se convierten en `[]`; esperado diagnóstico seguro. Evidencia búsqueda estática. Repro fallo de Data API. Causa logging ad hoc. Impacto fallos silenciosos/datos sensibles. Solución logger con redacción y IDs. Riesgo bajo. Tests secretos no aparecen. Estado IDENTIFICADO.

### ENV-001

Configuración, BAJO. `.env.example`, helpers. Actual `DB_*` no usados y faltan keepalive; esperado contrato real documentado. Evidencia referencias. Repro configurar solo DB_* y arrancar. Causa transición PostgreSQL->Supabase. Impacto setup fallido. Solución actualizar ejemplo sin secretos. Riesgo bajo. Tests startup missing env. Estado IDENTIFICADO.

### ARCH-002

Mantenibilidad, MEJORA. cuatro modelos/helpers. Actual crean clientes y repiten selección/mapeo; esperado fábrica única y consultas reutilizables. Evidencia duplicación. Repro búsqueda `createClient`. Causa adaptación incremental. Impacto configuración/errores inconsistentes. Solución centralizar después de P0/P1. Riesgo medio de refactor; tests modelos. Dependencia Supabase JS. Estado IDENTIFICADO.
