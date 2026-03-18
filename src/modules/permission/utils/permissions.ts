import { IPermission } from "../../../interfaces/permission.interface";

export const PERMISSIONS_TREE: IPermission[] = [
  {
    label: "Marcas",
    name: "Marcas",
    value: "ALL_BRANDS",
    children: [
      { label: "Listar marcas", name: "Listar marcas", value: "LIST_BRAND" },
      { label: "Crear marcas", name: "Crear marcas", value: "CREATE_BRAND" },
      { label: "Eliminar marcas", name: "deleteBrand", value: "DELETE_BRAND" },
      { label: "Actualizar marcas", name: "updateBrand", value: "UPDATE_BRAND" },
    ],
  },
  {
    label: "Categorias",
    name: "Categorias",
    value: "ALL_CATEGORIES",
    children: [
      { label: "Listar categorias", name: "Listar categorias", value: "LIST_CATEGORY" },
      { label: "Crear categorias", name: "Crear categorias", value: "CREATE_CATEGORY" },
      { label: "Eliminar categorias", name: "deleteCategory", value: "DELETE_CATEGORY" },
      { label: "Actualizar categorias", name: "updateCategory", value: "UPDATE_CATEGORY" },
    ],
  },
  {
    label: "Clientes",
    name: "Clientes",
    value: "ALL_CLIENTS",
    children: [
      { label: "Listar clientes", name: "Listar clientes", value: "LIST_CLIENT" },
      { label: "Crear clientes", name: "Crear clientes", value: "CREATE_CLIENT" },
      { label: "Listar ventas de clientes", name: "listSaleOrderByClient", value: "LIST_SALE_ORDER_BY_CLIENT" },
      { label: "Eliminar clientes", name: "deleteClient", value: "DELETE_CLIENT" },
      { label: "Actualizar clientes", name: "updateClient", value: "UPDATE_CLIENT" },
    ],
  },
  {
    label: "Inicio",
    name: "Inicio",
    value: "ALL_HOME",
    children: [
      { label: "Buscar productos", name: "searchProduct", value: "SEARCH_PRODUCT" },
      { label: "Datos generales", name: "generalData", value: "GENERAL_DATA" },
      { label: "Mejores clientes", name: "reportSaleOrderByClient", value: "REPORT_SALE_ORDER_BY_CLIENT" },
      { label: "Mejores vendedores", name: "reportSaleOrderBySeller", value: "REPORT_SALE_ORDER_BY_SELLER" },
      { label: "Mejores categorias", name: "reportSaleOrderByCategory", value: "REPORT_SALE_ORDER_BY_CATEGORY" },
      { label: "Ventas recientes", name: "reportSaleOrderByMonth", value: "REPORT_SALE_ORDER_BY_MONTH" },
    ],
  },
  {
    label: "Reportes",
    name: "Reportes",
    value: "ALL_REPORT",
    children: [
      { label: "Reporte de productos", name: "productReport", value: "PRODUCT_REPORT" },
      { label: "Reporte de compras", name: "purchaseOrderReport", value: "PURCHASE_ORDER_REPORT" },
      { label: "Reporte de ventas", name: "saleOrderReport", value: "SALE_ORDER_REPORT" },
    ],
  },
  {
    label: "Almacenes",
    name: "Almacenes",
    value: "ALL_WAREHOUSES",
    children: [
      { label: "Listar almacenes", name: "Listar almacenes", value: "LIST_WAREHOUSE" },
      { label: "Crear almacenes", name: "Crear almacenes", value: "CREATE_WAREHOUSE" },
      { label: "Eliminar almacenes", name: "deleteWarehouse", value: "DELETE_WAREHOUSE" },
      { label: "Actualizar almacenes", name: "updateWarehouse", value: "UPDATE_WAREHOUSE" },
    ],
  },
  {
    label: "Productos",
    name: "Productos",
    value: "ALL_PRODUCTS",
    children: [
      { label: "Listar productos", name: "Listar productos", value: "LIST_PRODUCT" },
      { label: "Crear productos", name: "Crear productos", value: "CREATE_PRODUCT" },
      { label: "Detalle de producto", name: "findProduct", value: "FIND_PRODUCT" },
      { label: "Ver costo del producto", name: "viewProductCost", value: "VIEW_PRODUCT_COST" },
      { label: "Listar seriales de producto", name: "listProductSerialByProduct", value: "LIST_PRODUCT_SERIAL_BY_PRODUCT" },
      { label: "Listar inventario de producto", name: "listProductInventoryByProduct", value: "LIST_PRODUCT_INVENTORY_BY_PRODUCT" },
      { label: "Eliminar productos", name: "deleteProduct", value: "DELETE_PRODUCT" },
      { label: "Actualizar productos", name: "updateProduct", value: "UPDATE_PRODUCT" },
    ],
  },
  {
    label: "Proveedores",
    name: "Proveedores",
    value: "ALL_PROVIDERS",
    children: [
      { label: "Listar proveedores", name: "Listar proveedores", value: "LIST_PROVIDER" },
      { label: "Crear proveedores", name: "Crear proveedores", value: "CREATE_PROVIDER" },
      { label: "Eliminar proveedores", name: "deleteProvider", value: "DELETE_PROVIDER" },
      { label: "Actualizar proveedores", name: "updateProvider", value: "UPDATE_PROVIDER" },
    ],
  },
  {
    label: "Compras",
    name: "Compras",
    value: "ALL_PURCHASES",
    children: [
      { label: "Listar compras", name: "Listar compras", value: "LIST_PURCHASE" },
      { label: "Crear compras", name: "Crear compras", value: "CREATE_PURCHASE" },
      { label: "Detalle de compra", name: "Detalle de compra", value: "DETAIL_PURCHASE" },
      { label: "Editar compra", name: "Editar compra", value: "EDIT_PURCHASE" },
      { label: "Eliminar compra", name: "Eliminar compra", value: "DELETE_PURCHASE" },
    ],
  },
  {
    label: "Ventas",
    name: "Ventas",
    value: "ALL_SALES",
    children: [
      { label: "Listar ventas", name: "Listar ventas", value: "LIST_SALE" },
      { label: "Crear ventas", name: "Crear ventas", value: "CREATE_SALE" },
      { label: "Detalle de venta", name: "Detalle de venta", value: "DETAIL_SALE" },
      { label: "Editar venta", name: "Editar venta", value: "EDIT_SALE" },
      { label: "Eliminar venta", name: "Eliminar venta", value: "DELETE_SALE" },
    ],
  },
  {
    label: "Pagos",
    name: "Pagos",
    value: "ALL_PAYMENTS",
    children: [
      { label: "Listar pagos", name: "Listar pagos", value: "LIST_PAYMENT" },
      { label: "Crear pagos", name: "Crear pagos", value: "CREATE_PAYMENT" },
      { label: "Eliminar pago", name: "Eliminar pago", value: "DELETE_PAYMENT" },
    ],
  },
  {
    label: "Usuarios y roles",
    name: "Usuarios",
    value: "USER_AND_ROLE",
  },
  {
    label: "Empresa",
    name: "Empresa",
    value: "ALL_COMPANY",
    children: [
      { label: "Actualizar empresa", name: "updateCompany", value: "UPDATE_COMPANY" },
    ],
  },
  {
    label: "Transferencias",
    name: "Transferencias",
    value: "ALL_TRANSFERS",
    children: [
      { label: "Listar transferencias", name: "Listar transferencias", value: "LIST_TRANSFER" },
      { label: "Crear transferencias", name: "Crear transferencias", value: "CREATE_TRANSFER" },
      { label: "Detalle de transferencia", name: "Detalle de transferencia", value: "DETAIL_TRANSFER" },
      { label: "Editar transferencia", name: "Editar transferencia", value: "EDIT_TRANSFER" },
      { label: "Eliminar transferencia", name: "Eliminar transferencia", value: "DELETE_TRANSFER" },
    ],
  },
];
