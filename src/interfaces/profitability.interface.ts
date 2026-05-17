export interface IProfitabilityByProduct {
  product_id: string;
  product_code: string;
  product_name: string;
  category_name: string;
  brand_name: string;
  units_sold: number;
  revenue: number;
  cost: number;
  gross_profit: number;
  margin_percent: number;
}

export interface IProfitabilityByCategory {
  category_id: string;
  category_name: string;
  units_sold: number;
  revenue: number;
  cost: number;
  gross_profit: number;
  margin_percent: number;
}

export interface IProfitabilityReport {
  by_product: IProfitabilityByProduct[];
  by_category: IProfitabilityByCategory[];
  total_revenue: number;
  total_cost: number;
  total_gross_profit: number;
  total_margin_percent: number;
}

export interface FilterProfitabilityInput {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}
