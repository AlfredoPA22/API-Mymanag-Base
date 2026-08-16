import {
  ICuentaCobrarRow,
  IQrPaymentInfo,
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

// Un descuento "real" es un tipo distinto de NONE/null con un valor > 0 — el
// permiso de descuentos solo se exige cuando el request de verdad intenta
// aplicar uno, no en cada alta/edición de línea de venta.
const hasDiscount = (type?: string | null, value?: number | null): boolean =>
  !!type && type !== "NONE" && !!value && value > 0;
import {
  addSerialToOrder,
  approve,
  create,
  createCustomDetail,
  createDetail,
  deleteProductToOrder,
  deleteSaleOrder,
  deleteSerialToOrder,
  findAll,
  findDetail,
  findQrPaymentInfoBySaleOrder,
  findSaleOrder,
  findSaleOrderToPDF,
  getSaleOrderDetailDiscount,
  getSaleOrderDiscount,
  getStoreOrderStats,
  listCustomSaleOrderDetail,
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

// Un descuento "distinto" es el único caso en que de verdad hace falta el
// permiso: si el payload reenvía el mismo discount_type/discount_value que ya
// tenía la línea/nota (ej. la edición en línea de SaleOrderDetailList.tsx
// siempre reenvía el descuento existente aunque solo se haya tocado la
// cantidad), no se está "aplicando" nada nuevo.
const isDiscountUnchanged = (
  existing: { discount_type: string | null; discount_value: number } | null,
  newType?: string | null,
  newValue?: number | null
): boolean =>
  !!existing &&
  (existing.discount_type ?? null) === (newType ?? null) &&
  Number(existing.discount_value ?? 0) === Number(newValue ?? 0);

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
      // Acceso también permitido con el permiso de Empresa: quien administra
      // la tienda online (aunque no tenga permiso de Ventas) debe poder ver
      // sus propios pedidos, sin necesitar un permiso nuevo.
      checkAnyAbility(context.ability, [
        ["list", "Sale"],
        ["update", "Company"],
      ]);
      return await findAll(context.user.companyId, context.user.id, "tienda_online");
    },
    async storeOrderStats(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IStoreOrderStats> {
      checkAnyAbility(context.ability, [
        ["list", "Sale"],
        ["update", "Company"],
      ]);
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
    async listCustomSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<ISaleOrderByProduct[]> {
      checkAbility(context.ability, "list", "Product");
      return await listCustomSaleOrderDetail(
        context.user.companyId,
        context.user.id
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
    async findQrPaymentInfoBySaleOrder(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<IQrPaymentInfo | null> {
      checkAbility(context.ability, "list", "Sale");
      return await findQrPaymentInfoBySaleOrder(context.user.companyId, args.saleOrderId);
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
        context.user.id,
        args.startDate,
        args.endDate
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
    ): Promise<ICuentaCobrarRow[]> {
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
      if (hasDiscount(args.saleOrderDetailInput?.discount_type, args.saleOrderDetailInput?.discount_value)) {
        checkAbility(context.ability, "applyDiscount", "Sale");
      }
      return await createDetail(
        context.user.companyId,
        args.saleOrderDetailInput,
        context.ability.can("sellBelowMin", "Sale")
      );
    },
    async createCustomSaleOrderDetail(
      _: any,
      args: Record<string, any>,
      context: any
    ) {
      checkAnyAbility(context.ability, [
        ["create", "Sale"],
        ["update", "Sale"],
      ]);
      if (hasDiscount(args.createCustomSaleOrderDetailInput?.discount_type, args.createCustomSaleOrderDetailInput?.discount_value)) {
        checkAbility(context.ability, "applyDiscount", "Sale");
      }
      return await createCustomDetail(
        context.user.companyId,
        args.createCustomSaleOrderDetailInput
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
      if (hasDiscount(args.updateSaleOrderDetailInput?.discount_type, args.updateSaleOrderDetailInput?.discount_value)) {
        const existing = await getSaleOrderDetailDiscount(context.user.companyId, args.saleOrderDetailId);
        if (!isDiscountUnchanged(existing, args.updateSaleOrderDetailInput?.discount_type, args.updateSaleOrderDetailInput?.discount_value)) {
          checkAbility(context.ability, "applyDiscount", "Sale");
        }
      }
      return await updateSaleOrderDetail(
        context.user.companyId,
        args.saleOrderDetailId,
        args.updateSaleOrderDetailInput,
        context.ability.can("sellBelowMin", "Sale")
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
      if (hasDiscount(args.updateSaleOrderDiscountInput?.discount_type, args.updateSaleOrderDiscountInput?.discount_value)) {
        const existing = await getSaleOrderDiscount(context.user.companyId, args.saleOrderId);
        if (!isDiscountUnchanged(existing, args.updateSaleOrderDiscountInput?.discount_type, args.updateSaleOrderDiscountInput?.discount_value)) {
          checkAbility(context.ability, "applyDiscount", "Sale");
        }
      }
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
