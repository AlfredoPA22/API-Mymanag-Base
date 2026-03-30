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
