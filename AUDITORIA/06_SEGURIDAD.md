# Seguridad

## Riesgos confirmados

- XSS almacenado ejecutado con éxito (`SEC-001`).
- Contraseñas en texto claro, enumeración completa y almacenamiento en sesión (`SEC-002`).
- Sin autenticación/autorización real (`AUTH-001`).
- Cuenta administrativa predecible (`SEC-003`).
- REST sin autenticación y CORS `*` si se activa (`SEC-006`).

## Configuración empaquetada

El `.env` contiene URL remota y legacy anon JWT; no contiene `service_role`. Una anon/publishable key está diseñada para clientes, pero solo es segura con RLS/políticas correctas. Como SIPRO opera sin sesión, debe asumirse exposición amplia hasta revisar políticas de solo lectura en el proyecto remoto. No se realizó esa conexión.

Rotación recomendada: corregir políticas/autorización, publicar cliente seguro y después rotar la legacy anon key distribuida. No rotar antes como sustituto de la corrección.

No se observó concatenación SQL con entradas en los modelos activos; el riesgo principal no es SQL injection sino acceso anónimo, XSS y ausencia de autorización.
