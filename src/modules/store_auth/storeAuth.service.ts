import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  IStoreAuthResult,
  IStoreCartItem,
  IStoreClient,
  IStoreMeResult,
  IStoreOrderDetailResult,
  StoreCartItemInput,
  StoreRegisterInput,
  StoreUpdateProfileInput,
} from "../../interfaces/storeAuth.interface";
import { IStoreOrderResult } from "../../interfaces/store.interface";
import { codeType } from "../../utils/enums/orderType.enum";
import { paymentMethod } from "../../utils/enums/saleOrderPaymentMethod";
import { salePaymentMethod } from "../../utils/enums/salePaymentMethod";
import { productStatus } from "../../utils/enums/productStatus.enum";
import { stockType } from "../../utils/enums/stockType.enum";
import { generate, increment } from "../codeGenerator/codeGenerator.service";
import { Client } from "../client/client.model";
import { Company } from "../company/company.model";
import { Product } from "../product/product.model";
import { ProductInventory } from "../product/product_inventory.model";
import {
  create as createSaleOrder,
  createDetail as createSaleOrderDetail,
  deleteSaleOrder,
  findSaleOrder,
} from "../sale_order/saleOrder.service";
import { SaleOrder } from "../sale_order/sale_order.model";
import { SaleOrderDetail } from "../sale_order/sale_order_detail.model";
import { assertStoreIsAvailable, getEffectiveSalePrice } from "../store/store.service";
import { User } from "../user/user.model";
import { createNotification } from "../notification/notification.service";

const STORE_ORDER_SOURCE = "tienda_online";

const signClientToken = (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  fullName: string
): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está definido en el entorno");
  }

  const token = jwt.sign(
    { type: "client", clientId, companyId, fullName },
    secret,
    { expiresIn: "30d" }
  );

  return `Bearer ${token}`;
};

const toStoreClient = (client: any) => ({
  _id: client._id.toString(),
  fullName: client.fullName,
  phoneNumber: client.phoneNumber,
  email: client.email,
  address: client.address,
});

const populateCart = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  cartItems: any[]
): Promise<IStoreCartItem[]> => {
  if (!cartItems || cartItems.length === 0) return [];

  const productIds = cartItems.map((item) => item.product);
  const products = await Product.find({
    _id: { $in: productIds },
    company: companyId,
  }).lean();
  const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));

  const result: IStoreCartItem[] = [];
  for (const item of cartItems) {
    const product: any = productMap.get(item.product.toString());
    if (!product) continue;
    result.push({
      productId: product._id.toString(),
      name: product.name,
      image: product.image,
      sale_price: getEffectiveSalePrice(product),
      stock: product.stock,
      quantity: item.quantity,
    });
  }
  return result;
};

export const registerClient = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  input: StoreRegisterInput
): Promise<IStoreAuthResult> => {
  const company = await Company.findById(companyId).lean();
  assertStoreIsAvailable(company as any);

  let client = await Client.findOne({
    company: companyId,
    phoneNumber: input.phoneNumber,
  }).select("+password");

  if (client && client.password) {
    throw new Error("Ya existe una cuenta con este teléfono. Inicia sesión.");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(input.password, salt);

  if (client) {
    client.fullName = input.fullName;
    client.email = input.email || client.email;
    client.address = input.address || client.address;
    client.password = hashedPassword;
    await client.save();
  } else {
    client = await Client.create({
      code: await generate(companyId, codeType.CLIENT),
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      email: input.email || "",
      address: input.address || "",
      password: hashedPassword,
      company: companyId,
    });
    await increment(companyId, codeType.CLIENT);
  }

  const token = signClientToken(companyId, client._id, client.fullName);
  const cart = await populateCart(companyId, client.cart_items || []);

  return { token, client: toStoreClient(client), cart };
};

export const loginClient = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  phoneNumber: string,
  password: string
): Promise<IStoreAuthResult> => {
  const company = await Company.findById(companyId).lean();
  assertStoreIsAvailable(company as any);

  const client = await Client.findOne({ company: companyId, phoneNumber }).select(
    "+password"
  );

  if (!client || !client.password) {
    throw new Error("Credenciales inválidas");
  }

  const isMatch = await bcrypt.compare(password, client.password);
  if (!isMatch) {
    throw new Error("Credenciales inválidas");
  }

  const token = signClientToken(companyId, client._id, client.fullName);
  const cart = await populateCart(companyId, client.cart_items || []);

  return { token, client: toStoreClient(client), cart };
};

export const getMe = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IStoreMeResult> => {
  const client = await Client.findOne({ _id: clientId, company: companyId });
  if (!client) throw new Error("Cliente no encontrado");

  const cart = await populateCart(companyId, client.cart_items || []);

  return { client: toStoreClient(client), cart };
};

export const updateProfile = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  input: StoreUpdateProfileInput
): Promise<IStoreClient> => {
  const client = await Client.findOne({ _id: clientId, company: companyId });
  if (!client) throw new Error("Cliente no encontrado");

  if (input.fullName) client.fullName = input.fullName;
  if (input.email !== undefined) client.email = input.email;
  if (input.address !== undefined) client.address = input.address;

  await client.save();

  return toStoreClient(client);
};

export const updateCart = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  items: StoreCartItemInput[]
): Promise<IStoreCartItem[]> => {
  const client = await Client.findOne({ _id: clientId, company: companyId });
  if (!client) throw new Error("Cliente no encontrado");

  const validItems: { product: any; quantity: number }[] = [];

  for (const item of items) {
    if (item.quantity <= 0) continue;
    const product = await Product.findOne({ _id: item.productId, company: companyId });
    if (!product || product.status !== productStatus.DISPONIBLE) continue;
    const quantity = product.stock > 0 ? Math.min(item.quantity, product.stock) : item.quantity;
    validItems.push({ product: product._id, quantity });
  }

  client.cart_items = validItems as any;
  await client.save();

  return await populateCart(companyId, client.cart_items || []);
};

export const listOrdersByClient = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  return await SaleOrder.find({ company: companyId, client: clientId })
    .sort({ date: -1 })
    .populate("client")
    .lean();
};

export const getOrderDetail = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  orderId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IStoreOrderDetailResult> => {
  // El filtro por client asegura que un cliente nunca pueda ver el pedido de otro
  const order: any = await SaleOrder.findOne({
    _id: orderId,
    company: companyId,
    client: clientId,
  })
    .populate("client")
    .lean();

  if (!order) {
    throw new Error("Pedido no encontrado");
  }

  const details = await SaleOrderDetail.find({
    company: companyId,
    sale_order: orderId,
  })
    .populate("product")
    .lean();

  return {
    code: order.code,
    date: order.date,
    status: order.status,
    total: order.total,
    is_paid: order.is_paid,
    address: order.client?.address || "",
    items: details.map((detail: any) => ({
      productId: detail.product?._id?.toString() ?? "",
      productName: detail.product?.name ?? "Producto eliminado",
      productImage: detail.product?.image ?? "",
      quantity: detail.quantity,
      sale_price: detail.sale_price,
      subtotal: detail.subtotal,
    })),
  };
};

export const createOrderForClient = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  clientId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  items: StoreCartItemInput[],
  address?: string
): Promise<IStoreOrderResult> => {
  const company = await Company.findById(companyId).lean();
  assertStoreIsAvailable(company as any);

  if (!items || items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  const client = await Client.findOne({ _id: clientId, company: companyId });
  if (!client) throw new Error("Cliente no encontrado");

  if (address) {
    client.address = address;
    await client.save();
  }

  const storeUser = await User.findOne({ company: companyId, is_global: true });
  if (!storeUser) {
    throw new Error("La tienda no está disponible en este momento");
  }

  const newOrder: any = await createSaleOrder(companyId, storeUser._id, {
    date: new Date(),
    client: client._id.toString(),
    payment_method: paymentMethod.CONTADO,
    contado_payment_method: salePaymentMethod.EFECTIVO,
    source: STORE_ORDER_SOURCE,
  } as any);

  try {
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new Error("La cantidad debe ser mayor a 0");
      }

      const product = await Product.findOne({
        _id: item.productId,
        company: companyId,
      });

      if (!product || product.status !== productStatus.DISPONIBLE) {
        throw new Error("Uno de los productos ya no está disponible");
      }

      let warehouseId: MongooseTypes.ObjectId | undefined;

      if (product.stock_type === stockType.INDIVIDUAL) {
        const inventories = await ProductInventory.find({
          company: companyId,
          product: product._id,
          available: { $gte: item.quantity },
        }).sort({ available: -1 });

        if (inventories.length === 0) {
          throw new Error(
            `No hay suficiente stock disponible para "${product.name}"`
          );
        }

        warehouseId = inventories[0].warehouse;
      }

      await createSaleOrderDetail(companyId, {
        sale_order: newOrder._id,
        product: product._id,
        sale_price: getEffectiveSalePrice(product),
        quantity: item.quantity,
        warehouse: warehouseId,
      } as any);
    }
  } catch (error) {
    await deleteSaleOrder(companyId, newOrder._id);
    throw error;
  }

  client.cart_items = [] as any;
  await client.save();

  const finalOrder = await findSaleOrder(companyId, newOrder._id);

  try {
    await createNotification(companyId, {
      type: "store_order",
      title: "Nuevo pedido de la tienda",
      message: `${finalOrder.client.fullName} hizo un pedido (${finalOrder.code}) por ${finalOrder.total}.`,
      link: "/tienda/pedidos",
    });
  } catch (error) {
    console.error("⚠️ No se pudo crear la notificación de nuevo pedido:", error);
  }

  return {
    code: finalOrder.code,
    total: finalOrder.total,
    clientFullName: finalOrder.client.fullName,
  };
};
