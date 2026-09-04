# Lógica de negocio reconstruida

## Actores y roles

- `usuario`, `admin`, `superadmin` aparecen en código/documentación.
- Regla observada real: todos ven y pueden ejecutar todo. La matriz deseada es `REQUIERE_VALIDACIÓN_DE_NEGOCIO`.

## Flujos

```text
correo + contraseña -> descargar usuarios -> comparar en renderer -> guardar fila en sessionStorage -> panel
producto nuevo -> validar categoría/stock en UI -> INSERT
producto existente -> UPDATE completo -> trigger registra diferencia de stock
entrada/salida -> leer stock -> calcular -> UPDATE -> trigger + INSERT explícito de movimiento
eliminar producto -> movimientos.producto_id=NULL -> DELETE producto
exportar -> consultar colección -> construir XLSX -> diálogo de guardado
```

## Reglas verificadas

- Código de barra, email y categoría son únicos en BD.
- Precio no negativo está protegido en BD.
- Stock no negativo solo se intenta proteger en UI; la BD no lo preserva.
- Una salida mayor al stock se rechaza en ejecución secuencial, pero no concurrente.
- El historial pretende sobrevivir al borrado del producto.
- Facturación automática aparece en `script.txt`, pero no hay UI ni consumo: `HIPÓTESIS` de funcionalidad abandonada/incompleta.
