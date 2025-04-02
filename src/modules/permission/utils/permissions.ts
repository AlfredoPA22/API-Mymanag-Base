import { IPermission } from "../../../interfaces/permission.interface";

export const PERMISSIONS_TREE: IPermission[] = [
  {
    label: "Marcas",
    name: "Marcas",
    value: "ALL_BRANDS",
    children: [
      {
        label: "Listar y crear marcas",
        name: "Listar y crear marcas",
        value: "LIST_AND_CREATE_BRAND",
      },
      { label: "Eliminar marcas", name: "deleteBrand", value: "DELETE_BRAND" },
      {
        label: "Actualizar marcas",
        name: "updateBrand",
        value: "UPDATE_BRAND",
      },
    ],
  },
  {
    label: "Categorias",
    name: "Categorias",
    value: "ALL_CATEGORIES",
    children: [
      {
        label: "Listar y crear categorias",
        name: "Listar y crear categorias",
        value: "LIST_AND_CREATE_CATEGORY",
      },
      {
        label: "Eliminar categorias",
        name: "deleteCategory",
        value: "DELETE_CATEGORY",
      },
      {
        label: "Actualizar categorias",
        name: "updateCategory",
        value: "UPDATE_CATEGORY",
      },
    ],
  },
  {
    label: "Clientes",
    name: "Clientes",
    value: "ALL_CLIENTS",
    children: [
      {
        label: "Listar y crear clientes",
        name: "Listar y crear clientes",
        value: "LIST_AND_CREATE_CLIENT",
      },
      {
        label: "Listar ventas de clientes",
        name: "listSaleOrderByClient",
        value: "LIST_SALE_ORDER_BY_CLIENT",
      },
      {
        label: "Eliminar clientes",
        name: "deleteClient",
        value: "DELETE_CLIENT",
      },
      {
        label: "Actualizar clientes",
        name: "updateClient",
        value: "UPDATE_CLIENT",
      },
    ],
  },
  {
    label: "Inicio",
    name: "Inicio",
    value: "ALL_HOME",
    children: [
      {
        label: "Buscar productos",
        name: "searchProduct",
        value: "SEARCH_PRODUCT",
      },
      { label: "Datos generales", name: "generalData", value: "GENERAL_DATA" },
    ],
  },
  {
    label: "Productos",
    name: "Productos",
    value: "ALL_PRODUCTS",
    children: [
      {
        label: "Listar y crear productos",
        name: "Listar y crear productos",
        value: "LIST_AND_CREATE_PRODUCT",
      },
      {
        label: "Detalle de producto",
        name: "findProduct",
        value: "FIND_PRODUCT",
      },
      {
        label: "Listar seriales de producto",
        name: "listProductSerialByProduct",
        value: "LIST_PRODUCT_SERIAL_BY_PRODUCT",
      },
      {
        label: "Eliminar productos",
        name: "deleteProduct",
        value: "DELETE_PRODUCT",
      },
      {
        label: "Actualizar productos",
        name: "updateProduct",
        value: "UPDATE_PRODUCT",
      },
    ],
  },
  {
    label: "Proveedores",
    name: "Proveedores",
    value: "ALL_PROVIDERS",
    children: [
      {
        label: "Listar y crear proveedores",
        name: "Listar y crear proveedores",
        value: "LIST_AND_CREATE_PROVIDER",
      },
      {
        label: "Eliminar proveedores",
        name: "deleteProvider",
        value: "DELETE_PROVIDER",
      },
      {
        label: "Actualizar proveedores",
        name: "updateProvider",
        value: "UPDATE_PROVIDER",
      },
    ],
  },
  {
    label: "Compras",
    name: "Compras",
    value: "ALL_PURCHASES",
    children: [
      {
        label: "Listar y crear compras",
        name: "Listar y crear compras",
        value: "LIST_AND_CREATE_PURCHASE",
      },
      {
        label: "Detalle de compra",
        name: "Detalle de compra",
        value: "DETAIL_PURCHASE",
      },
      {
        label: "Editar compra",
        name: "Editar compra",
        value: "EDIT_PURCHASE",
      },
      {
        label: "Eliminar compra",
        name: "Eliminar compra",
        value: "DELETE_PURCHASE",
      },
    ],
  },
  {
    label: "Ventas",
    name: "Ventas",
    value: "ALL_SALES",
    children: [
      {
        label: "Listar y crear ventas",
        name: "Listar y crear ventas",
        value: "LIST_AND_CREATE_SALE",
      },
      {
        label: "Detalle de venta",
        name: "Detalle de venta",
        value: "DETAIL_SALE",
      },
      {
        label: "Editar venta",
        name: "Editar venta",
        value: "EDIT_SALE",
      },
      {
        label: "Eliminar venta",
        name: "Eliminar venta",
        value: "DELETE_SALE",
      },
    ],
  },

  {
    label: "Usuarios y roles",
    name: "Usuarios",
    value: "USER_AND_ROLE",
  },
];
