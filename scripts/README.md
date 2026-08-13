# Scripts de mantenimiento

Todos se ejecutan desde la raíz del proyecto.

---

## auditStock.ts ⭐ empezar aquí

**Solo lectura — no modifica nada.**
Compara el stock actual de cada producto contra el valor correcto calculado desde las colecciones fuente e imprime los que están descompaginados.

```
npx ts-node scripts/auditStock.ts
```

---

## reconcileStock.ts

**Qué hace:** Recalcula y corrige el `stock` y `status` de todos los productos desde cero.

- `individual` → `SUM(available + reserved)` de `product_inventory` en `Disponible` o `Sin stock`
- `serializado` → `COUNT(product_serial)` donde `status = Disponible`

```
npx ts-node scripts/reconcileStock.ts
```

**Cuándo usarlo:** Cuando `auditStock` detecta descompaginaciones masivas.

---

## fixBorradorInventory.ts

**Qué hace:** Corrige los `product_inventory` que quedaron en `Borrador` aunque su orden de compra ya fue aprobada.

- Pone el inventory en `Disponible` y asigna `available = quantity`
- Incrementa `stock` del producto y actualiza `last_cost_price`

```
npx ts-node scripts/fixBorradorInventory.ts
```

---

## fixProductStock.ts

**Qué hace:** Complemento de `fixBorradorInventory`. Incrementa el stock de productos cuyos inventories fueron corregidos **hoy** pero sin reflejarse en el producto.

```
npx ts-node scripts/fixProductStock.ts
```

**Cuándo usarlo:** Inmediatamente después de `fixBorradorInventory` si el stock del producto no se actualizó.

---

## migrate-split-permissions.js

**Qué hace:** Migración de permisos — divide permisos existentes en la nueva estructura.

```
node scripts/migrate-split-permissions.js
```

---

## migrate-contado-payment-method.js

**Qué hace:** Migración de método de pago — normaliza el método `contado` en los registros existentes.

```
node scripts/migrate-contado-payment-method.js
```

---

## migrate-add-cash-register-permissions.js

**Qué hace:** Agrega los permisos de Caja (`LIST_CASH_REGISTER`, `OPEN_CASH_REGISTER`, `CLOSE_CASH_REGISTER`) a los roles administradores **existentes** — la función de Caja es nueva, así que las empresas creadas antes no la tienen. Las empresas nuevas ya la reciben automáticamente vía `PERMISSIONS_MOCK`.

Alcance: cualquier rol que ya tenga `USER_AND_ROLE` (se usa como marcador de "es rol de administrador", sin depender del nombre del rol).

```
node scripts/migrate-add-cash-register-permissions.js --dry-run   # solo muestra qué haría
node scripts/migrate-add-cash-register-permissions.js             # aplica los cambios
```

**Cuándo usarlo:** Una sola vez, al desplegar la función de Caja a producción. Después de correrlo, los administradores que ya tengan sesión iniciada no ven el cambio hasta cerrar sesión y volver a entrar (los permisos van en el JWT, vigente 1 día).

---

## migrate-add-view-product-cost-permission.js

**Qué hace:** Agrega el permiso `VIEW_PRODUCT_COST` a los roles administradores **existentes** — gatea la columna de costo en la ficha de producto y en la pestaña "Fuera de inventario" (Productos), pero los roles creados antes de que ese permiso existiera no lo tienen. Las empresas nuevas ya lo reciben automáticamente vía `PERMISSIONS_MOCK`.

Alcance: cualquier rol que ya tenga `USER_AND_ROLE` (se usa como marcador de "es rol de administrador", sin depender del nombre del rol).

```
node scripts/migrate-add-view-product-cost-permission.js --dry-run   # solo muestra qué haría
node scripts/migrate-add-view-product-cost-permission.js             # aplica los cambios
```

**Cuándo usarlo:** Una sola vez, al desplegar la pestaña "Fuera de inventario". Después de correrlo, los administradores que ya tengan sesión iniciada no ven el cambio hasta cerrar sesión y volver a entrar (los permisos van en el JWT, vigente 1 día).

---

## migrate-enable-pos-sale-mode.js

**Qué hace:** Activa `pos_sale_mode_enabled` (Modo de venta rápida / POS en "Nueva venta") en **todas** las empresas existentes — el campo es nuevo con default `false`, así que sin esto ninguna empresa creada antes de esta funcionalidad lo ve. A diferencia de las migraciones de permisos, esto actualiza directo la colección `companies`, no `roles`.

```
node scripts/migrate-enable-pos-sale-mode.js --dry-run   # solo muestra qué haría
node scripts/migrate-enable-pos-sale-mode.js             # aplica los cambios
```

**Cuándo usarlo:** Una sola vez, para que el modo POS quede disponible de entrada en todas las empresas ya existentes (las nuevas nacen con el campo en `false`, así que no las toca el default — si también se quiere eso por default habría que cambiar el schema, no este script).
