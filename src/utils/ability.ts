import { AbilityBuilder, createMongoAbility, MongoAbility } from "@casl/ability";

// Mapeo de acciones y sujetos para CASL
// Cada permiso existente se traduce a (action, subject)
export type AppAbility = MongoAbility;

/**
 * Construye la Ability de CASL a partir del array de permisos del JWT.
 * Los permisos en DB/JWT no cambian — este factory los traduce al formato CASL.
 */
export function buildAbility(permissions: string[]): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  for (const perm of permissions) {
    switch (perm) {
      // ── Marcas ──────────────────────────────────────────────────────────────
      case "ALL_BRANDS":
        can("manage", "Brand");
        break;
      case "LIST_BRAND":
        can("list", "Brand");
        break;
      case "CREATE_BRAND":
        can("create", "Brand");
        break;
      case "DELETE_BRAND":
        can("delete", "Brand");
        break;
      case "UPDATE_BRAND":
        can("update", "Brand");
        break;

      // ── Categorías ──────────────────────────────────────────────────────────
      case "ALL_CATEGORIES":
        can("manage", "Category");
        break;
      case "LIST_CATEGORY":
        can("list", "Category");
        break;
      case "CREATE_CATEGORY":
        can("create", "Category");
        break;
      case "DELETE_CATEGORY":
        can("delete", "Category");
        break;
      case "UPDATE_CATEGORY":
        can("update", "Category");
        break;

      // ── Clientes ────────────────────────────────────────────────────────────
      case "ALL_CLIENTS":
        can("manage", "Client");
        break;
      case "LIST_CLIENT":
        can("list", "Client");
        break;
      case "CREATE_CLIENT":
        can("create", "Client");
        break;
      case "LIST_SALE_ORDER_BY_CLIENT":
        can("listSaleOrders", "Client");
        break;
      case "DELETE_CLIENT":
        can("delete", "Client");
        break;
      case "UPDATE_CLIENT":
        can("update", "Client");
        break;

      // ── Inicio / Dashboard ──────────────────────────────────────────────────
      case "ALL_HOME":
        can("manage", "Home");
        break;
      case "SEARCH_PRODUCT":
        can("search", "Product");
        break;
      case "GENERAL_DATA":
        can("read", "GeneralData");
        break;
      case "REPORT_SALE_ORDER_BY_CLIENT":
        can("read", "ReportByClient");
        break;
      case "REPORT_SALE_ORDER_BY_SELLER":
        can("read", "ReportBySeller");
        break;
      case "REPORT_SALE_ORDER_BY_CATEGORY":
        can("read", "ReportByCategory");
        break;
      case "REPORT_SALE_ORDER_BY_MONTH":
        can("read", "ReportByMonth");
        break;
      case "REPORT_SALE_ORDER_BY_PRODUCT":
        can("read", "ReportByProduct");
        break;

      // ── Reportes ────────────────────────────────────────────────────────────
      case "ALL_REPORT":
        can("manage", "Report");
        break;
      case "PRODUCT_REPORT":
        can("read", "ProductReport");
        break;
      case "PURCHASE_ORDER_REPORT":
        can("read", "PurchaseReport");
        break;
      case "SALE_ORDER_REPORT":
        can("read", "SaleReport");
        break;

      // ── Almacenes ───────────────────────────────────────────────────────────
      case "ALL_WAREHOUSES":
        can("manage", "Warehouse");
        break;
      case "LIST_WAREHOUSE":
        can("list", "Warehouse");
        break;
      case "CREATE_WAREHOUSE":
        can("create", "Warehouse");
        break;
      case "DELETE_WAREHOUSE":
        can("delete", "Warehouse");
        break;
      case "UPDATE_WAREHOUSE":
        can("update", "Warehouse");
        break;

      // ── Productos ───────────────────────────────────────────────────────────
      case "ALL_PRODUCTS":
        can("manage", "Product");
        break;
      case "LIST_PRODUCT":
        can("list", "Product");
        break;
      case "CREATE_PRODUCT":
        can("create", "Product");
        break;
      case "FIND_PRODUCT":
        can("read", "Product");
        break;
      case "VIEW_PRODUCT_COST":
        can("read", "ProductCost");
        break;
      case "LIST_PRODUCT_SERIAL_BY_PRODUCT":
        can("listSerials", "Product");
        break;
      case "LIST_PRODUCT_INVENTORY_BY_PRODUCT":
        can("listInventory", "Product");
        break;
      case "DELETE_PRODUCT":
        can("delete", "Product");
        break;
      case "UPDATE_PRODUCT":
        can("update", "Product");
        break;

      // ── Proveedores ─────────────────────────────────────────────────────────
      case "ALL_PROVIDERS":
        can("manage", "Provider");
        break;
      case "LIST_PROVIDER":
        can("list", "Provider");
        break;
      case "CREATE_PROVIDER":
        can("create", "Provider");
        break;
      case "DELETE_PROVIDER":
        can("delete", "Provider");
        break;
      case "UPDATE_PROVIDER":
        can("update", "Provider");
        break;

      // ── Compras ─────────────────────────────────────────────────────────────
      case "ALL_PURCHASES":
        can("manage", "Purchase");
        break;
      case "LIST_PURCHASE":
        can("list", "Purchase");
        break;
      case "CREATE_PURCHASE":
        can("create", "Purchase");
        break;
      case "DETAIL_PURCHASE":
        can("read", "Purchase");
        break;
      case "EDIT_PURCHASE":
        can("update", "Purchase");
        break;
      case "DELETE_PURCHASE":
        can("delete", "Purchase");
        break;

      // ── Ventas ──────────────────────────────────────────────────────────────
      case "ALL_SALES":
        can("manage", "Sale");
        break;
      case "LIST_SALE":
        can("list", "Sale");
        break;
      case "CREATE_SALE":
        can("create", "Sale");
        break;
      case "DETAIL_SALE":
        can("read", "Sale");
        break;
      case "EDIT_SALE":
        can("update", "Sale");
        break;
      case "DELETE_SALE":
        can("delete", "Sale");
        break;

      // ── Pagos ───────────────────────────────────────────────────────────────
      case "ALL_PAYMENTS":
        can("manage", "Payment");
        break;
      case "LIST_PAYMENT":
        can("list", "Payment");
        break;
      case "CREATE_PAYMENT":
        can("create", "Payment");
        break;
      case "DELETE_PAYMENT":
        can("delete", "Payment");
        break;

      // ── Usuarios y Roles ────────────────────────────────────────────────────
      case "USER_AND_ROLE":
        can("manage", "User");
        can("manage", "Role");
        break;

      // ── Empresa ─────────────────────────────────────────────────────────────
      case "ALL_COMPANY":
        can("manage", "Company");
        break;
      case "UPDATE_COMPANY":
        can("update", "Company");
        break;

      // ── Transferencias ──────────────────────────────────────────────────────
      case "ALL_TRANSFERS":
        can("manage", "Transfer");
        break;
      case "LIST_TRANSFER":
        can("list", "Transfer");
        break;
      case "CREATE_TRANSFER":
        can("create", "Transfer");
        break;
      case "DETAIL_TRANSFER":
        can("read", "Transfer");
        break;
      case "EDIT_TRANSFER":
        can("update", "Transfer");
        break;
      case "DELETE_TRANSFER":
        can("delete", "Transfer");
        break;
    }
  }

  return build();
}

/**
 * Verifica un permiso con CASL y lanza error si no lo tiene.
 * Reemplaza la función hasPermission anterior — sin query a la base de datos.
 */
export function checkAbility(
  ability: AppAbility,
  action: string,
  subject: string
): void {
  if (!ability.can(action, subject)) {
    throw new Error("No tienes permisos para esta accion");
  }
}

/**
 * Verifica que el usuario tenga AL MENOS UNO de los pares [accion, sujeto].
 * Útil para resolvers que son accesibles desde múltiples módulos.
 * Ejemplo: listBrand es accesible si tienes permisos de Brand O de Product.
 */
export function checkAnyAbility(
  ability: AppAbility,
  checks: Array<[string, string]>
): void {
  const hasAny = checks.some(([action, subject]) => ability.can(action, subject));
  if (!hasAny) {
    throw new Error("No tienes permisos para esta accion");
  }
}
