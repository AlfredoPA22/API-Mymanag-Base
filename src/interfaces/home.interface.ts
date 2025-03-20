import { IProduct } from "./product.interface";

export interface IGeneralData {
  total_products_number: number;
  total_products_out: number;
  stock: number;
  best_product: IProduct | null;
  best_product_sales_number: number;
  total_sales_number: number;
  total_sales_value: number;
}
