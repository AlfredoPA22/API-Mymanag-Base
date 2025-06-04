import { companyPlan } from "./enums/companyPlan.enum";

export const companyPlanLimits: Record<
  companyPlan,
  {
    maxBrand: number;
    maxCategory: number;
    maxClient: number;
    maxProduct: number;
    maxProvider: number;
    maxPurchaseOrder: number;
    maxRole: number;
    maxSaleOrder: number;
    maxSalePayment: number;
    maxUser: number;
    maxWarehouse: number;
    features: {
      dashboard: {
        generalData: boolean;
        reportSaleOrderByCategory: boolean;
        reportSaleOrderByClient: boolean;
        reportSaleOrderByMonth: boolean;
        searchProduct: boolean;
      };
      reports: boolean;
    };
  }
> = {
  [companyPlan.FREE]: {
    maxBrand: 3,
    maxCategory: 3,
    maxClient: 3,
    maxProduct: 10,
    maxProvider: 3,
    maxPurchaseOrder: 3,
    maxRole: 1,
    maxSaleOrder: 3,
    maxSalePayment: 3,
    maxUser: 1,
    maxWarehouse: 1,
    features: {
      dashboard: {
        generalData: true,
        reportSaleOrderByCategory: true,
        reportSaleOrderByClient: false,
        reportSaleOrderByMonth: false,
        searchProduct: true,
      },
      reports: false,
    },
  },
  [companyPlan.BASIC]: {
    maxBrand: 50,
    maxCategory: 50,
    maxClient: 50,
    maxProduct: 200,
    maxProvider: 50,
    maxPurchaseOrder: 100,
    maxRole: 3,
    maxSaleOrder: 100,
    maxSalePayment: 100,
    maxUser: 3,
    maxWarehouse: 3,
    features: {
      dashboard: {
        generalData: true,
        reportSaleOrderByCategory: true,
        reportSaleOrderByClient: true,
        reportSaleOrderByMonth: true,
        searchProduct: true,
      },
      reports: true,
    },
  },
  [companyPlan.PRO]: {
    maxBrand: Infinity,
    maxCategory: Infinity,
    maxClient: Infinity,
    maxProduct: Infinity,
    maxProvider: Infinity,
    maxPurchaseOrder: Infinity,
    maxRole: Infinity,
    maxSaleOrder: Infinity,
    maxSalePayment: Infinity,
    maxUser: Infinity,
    maxWarehouse: Infinity,
    features: {
      dashboard: {
        generalData: true,
        reportSaleOrderByCategory: true,
        reportSaleOrderByClient: true,
        reportSaleOrderByMonth: true,
        searchProduct: true,
      },
      reports: true,
    },
  },
};
