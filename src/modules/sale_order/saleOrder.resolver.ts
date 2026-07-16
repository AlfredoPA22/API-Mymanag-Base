import {
  ISaleOrder,
  ISaleOrderByProduct,
  ISaleOrderToPDF,
  ISalesReportByCategory,
  ISalesReportByClient,
  ISalesReportBySeller,
  ISalesReportByProduct,
  IReportMonthlySales,
  IStoreOrderStats,
} from "../../interfaces/saleOrder.interface";
import { ISaleOrderDetail } from "../../interfaces/saleOrderDetail.interface";
import { checkAbility, checkAnyAbility } from "../../utils/ability";
import {
  addSerialToOrder,
  approve,
  create,
  createDetail,
  deleteProductToOrder,
  deleteSaleOrder,
  deleteSerialToOrder,
  findAll,
  findDetail,
  findSaleOrder,
  findSaleOrderToPDF,
  getStoreOrderStats,
  listSaleOrderByProduct,
  reportSaleOrderByCategory,
  reportSaleOrderByClient,
  reportSaleOrderBySeller,
  reportSaleOrderByProduct,
  reportMonthlySales,
  reportSaleOrderByMonth,
  reportCuentasCobrar,
  saleOrderReport,
  updateSaleOrderDetail,
  updateSaleOrderDiscount,
  updateSaleOrderPaymentMethod,
  addManySerialsToOrder,
} from "./saleOrder.service";

export const saleOrderResolver = {
  Query: {
    async listSaleOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrder[]> {
      checkAbility(context.ability, "list", "Sale");
      return await findAll(context.user.companyId, context.user.id);
    },
    async listStoreOrders(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrder[]> {
      checkAbility(context.ability, "list", "Sale");
      return await findAll(context.user.companyId, context.user.id, "tienda_online");
    },
    async storeOrderStats(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IStoreOrderStats> {
      checkAbility(context.ability, "list", "Sale");
      return await getStoreOrderStats(context.user.companyId);
    },
    async listSaleOrderByProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrderByProduct[]> {
      return await listSaleOrderByProduct(
        context.user.companyId,
        context.user.id,
        args.productId
      );
    },
    async findSaleOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrder> {
      checkAnyAbility(context.ability, [
        ["read", "Sale"],
        ["update", "Sale"],
      ]);
      return await findSaleOrder(context.user.companyId, args.saleOrderId);
    },
    async listSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrderDetail[]> {
      checkAnyAbility(context.ability, [
        ["list", "Sale"],
        ["read", "Sale"],
        ["update", "Sale"],
      ]);
      return await findDetail(context.user.companyId, args.saleOrderId);
    },
    async findSaleOrderToPDF(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrderToPDF> {
      checkAbility(context.ability, "list", "Sale");
      return await findSaleOrderToPDF(context.user.companyId, args.saleOrderId);
    },
    async reportSaleOrderByClient(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISalesReportByClient[]> {
      checkAbility(context.ability, "read", "ReportByClient");
      return await reportSaleOrderByClient(
        context.user.companyId,
        context.user.id,
        args.startDate,
        args.endDate
      );
    },
    async reportSaleOrderBySeller(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISalesReportBySeller[]> {
      checkAbility(context.ability, "read", "ReportBySeller");
      return await reportSaleOrderBySeller(
        context.user.companyId,
        context.user.id,
        args.startDate,
        args.endDate
      );
    },
    async reportSaleOrderByCategory(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISalesReportByCategory[]> {
      checkAbility(context.ability, "read", "ReportByCategory");
      return await reportSaleOrderByCategory(
        context.user.companyId,
        context.user.id,
        args.startDate,
        args.endDate
      );
    },
    async reportSaleOrderByProduct(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISalesReportByProduct[]> {
      checkAbility(context.ability, "read", "ReportByProduct");
      return await reportSaleOrderByProduct(
        context.user.companyId,
        context.user.id,
        args.startDate,
        args.endDate
      );
    },
    async reportMonthlySales(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IReportMonthlySales[]> {
      checkAbility(context.ability, "read", "ReportByMonth");
      return await reportMonthlySales(
        context.user.companyId,
        context.user.id
      );
    },
    async reportSaleOrderByMonth(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrder[]> {
      checkAbility(context.ability, "read", "ReportByMonth");
      return await reportSaleOrderByMonth(
        context.user.companyId,
        context.user.id,
        args.startDate,
        args.endDate
      );
    },
    async saleOrderReport(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrder[]> {
      checkAbility(context.ability, "read", "SaleReport");
      return await saleOrderReport(
        context.user.companyId,
        context.user.id,
        args.filterSaleOrderInput
      );
    },
    async reportCuentasCobrar(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrder[]> {
      checkAbility(context.ability, "read", "SaleReport");
      return await reportCuentasCobrar(
        context.user.companyId,
        context.user.id,
        args.startDate,
        args.endDate
      );
    },
  },
  Mutation: {
    async createSaleOrder(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "create", "Sale");
      return await create(
        context.user.companyId,
        context.user.id,
        args.saleOrderInput
      );
    },
    async deleteSaleOrder(_: any, args: Record<string, any>, context: any) {
      checkAbility(context.ability, "delete", "Sale");
      return await deleteSaleOrder(context.user.companyId, args.saleOrderId);
    },
    async createSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAnyAbility(context.ability, [
        ["create", "Sale"],
        ["update", "Sale"],
      ]);
      return await createDetail(
        context.user.companyId,
        args.saleOrderDetailInput
      );
    },
    async updateSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAnyAbility(context.ability, [
        ["create", "Sale"],
        ["update", "Sale"],
      ]);
      return await updateSaleOrderDetail(
        context.user.companyId,
        args.saleOrderDetailId,
        args.updateSaleOrderDetailInput
      );
    },
    async deleteProductToSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAnyAbility(context.ability, [
        ["create", "Sale"],
        ["update", "Sale"],
      ]);
      return await deleteProductToOrder(
        context.user.companyId,
        args.saleOrderDetailId
      );
    },
    async addSerialToSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAnyAbility(context.ability, [
        ["create", "Sale"],
        ["update", "Sale"],
      ]);
      return await addSerialToOrder(
        context.user.companyId,
        args.addSerialToSaleOrderDetailInput
      );
    },
    async deleteSerialToSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAnyAbility(context.ability, [
        ["create", "Sale"],
        ["update", "Sale"],
      ]);
      return await deleteSerialToOrder(
        context.user.companyId,
        args.productSerialId
      );
    },
    async approveSaleOrder(_: any, args: Record<string, any>, context: any) {
      checkAnyAbility(context.ability, [
        ["create", "Sale"],
        ["update", "Sale"],
      ]);
      return await approve(context.user.companyId, args.saleOrderId);
    },
    async updateSaleOrderPaymentMethod(_: any, args: Record<string, any>, context: any) {
      checkAnyAbility(context.ability, [
        ["create", "Sale"],
        ["update", "Sale"],
      ]);
      return await updateSaleOrderPaymentMethod(
        context.user.companyId,
        args.saleOrderId,
        args.updateSaleOrderPaymentMethodInput?.payment_method,
        args.updateSaleOrderPaymentMethodInput?.contado_payment_method
      );
    },
    async updateSaleOrderDiscount(_: any, args: Record<string, any>, context: any) {
      checkAnyAbility(context.ability, [
        ["create", "Sale"],
        ["update", "Sale"],
      ]);
      return await updateSaleOrderDiscount(
        context.user.companyId,
        args.saleOrderId,
        args.updateSaleOrderDiscountInput?.discount_type,
        args.updateSaleOrderDiscountInput?.discount_value
      );
    },
    async addManySerialsToSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAnyAbility(context.ability, [
        ["create", "Sale"],
        ["update", "Sale"],
      ]);
      return await addManySerialsToOrder(
        context.user.companyId,
        args.addManySerialsToSaleOrderDetailInput
      );
    },
  },
};
