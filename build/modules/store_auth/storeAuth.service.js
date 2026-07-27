"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderForClient = exports.getOrderDetail = exports.listOrdersByClient = exports.updateCart = exports.updateProfile = exports.getMe = exports.loginClient = exports.registerClient = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const orderType_enum_1 = require("../../utils/enums/orderType.enum");
const saleOrderPaymentMethod_1 = require("../../utils/enums/saleOrderPaymentMethod");
const salePaymentMethod_1 = require("../../utils/enums/salePaymentMethod");
const productStatus_enum_1 = require("../../utils/enums/productStatus.enum");
const stockType_enum_1 = require("../../utils/enums/stockType.enum");
const codeGenerator_service_1 = require("../codeGenerator/codeGenerator.service");
const client_model_1 = require("../client/client.model");
const company_model_1 = require("../company/company.model");
const product_model_1 = require("../product/product.model");
const product_inventory_model_1 = require("../product/product_inventory.model");
const saleOrder_service_1 = require("../sale_order/saleOrder.service");
const sale_order_model_1 = require("../sale_order/sale_order.model");
const sale_order_detail_model_1 = require("../sale_order/sale_order_detail.model");
const qr_payment_model_1 = require("../qr_payment/qr_payment.model");
const store_service_1 = require("../store/store.service");
const user_model_1 = require("../user/user.model");
const notification_service_1 = require("../notification/notification.service");
const STORE_ORDER_SOURCE = "tienda_online";
const signClientToken = (companyId, clientId, fullName) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET no está definido en el entorno");
    }
    const token = jsonwebtoken_1.default.sign({ type: "client", clientId, companyId, fullName }, secret, { expiresIn: "30d" });
    return `Bearer ${token}`;
};
const toStoreClient = (client) => ({
    _id: client._id.toString(),
    fullName: client.fullName,
    phoneNumber: client.phoneNumber,
    phoneCountry: client.phoneCountry || "BO",
    email: client.email,
    address: client.address,
});
const populateCart = async (companyId, cartItems) => {
    if (!cartItems || cartItems.length === 0)
        return [];
    const productIds = cartItems.map((item) => item.product);
    const products = await product_model_1.Product.find({
        _id: { $in: productIds },
        company: companyId,
    }).lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const result = [];
    for (const item of cartItems) {
        const product = productMap.get(item.product.toString());
        if (!product)
            continue;
        result.push({
            productId: product._id.toString(),
            name: product.name,
            image: product.image,
            sale_price: (0, store_service_1.getEffectiveSalePrice)(product),
            stock: product.stock,
            quantity: item.quantity,
        });
    }
    return result;
};
const PHONE_REGEX = /^\d{6,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const registerClient = async (companyId, input) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    (0, store_service_1.assertStoreIsAvailable)(company);
    if (!PHONE_REGEX.test(input.phoneNumber)) {
        throw new Error("Ingresa un número de teléfono válido (solo dígitos).");
    }
    if (input.email && !EMAIL_REGEX.test(input.email)) {
        throw new Error("Ingresa un correo válido.");
    }
    let client = await client_model_1.Client.findOne({
        company: companyId,
        phoneNumber: input.phoneNumber,
    }).select("+password");
    if (client && client.password) {
        throw new Error("Ya existe una cuenta con este teléfono. Inicia sesión.");
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(input.password, salt);
    if (client) {
        client.fullName = input.fullName;
        client.email = input.email || client.email;
        client.address = input.address || client.address;
        client.password = hashedPassword;
        client.phoneCountry = input.phoneCountry || client.phoneCountry || "BO";
        await client.save();
    }
    else {
        client = await client_model_1.Client.create({
            code: await (0, codeGenerator_service_1.generate)(companyId, orderType_enum_1.codeType.CLIENT),
            fullName: input.fullName,
            phoneNumber: input.phoneNumber,
            phoneCountry: input.phoneCountry || "BO",
            email: input.email || "",
            address: input.address || "",
            password: hashedPassword,
            company: companyId,
        });
        await (0, codeGenerator_service_1.increment)(companyId, orderType_enum_1.codeType.CLIENT);
    }
    const token = signClientToken(companyId, client._id, client.fullName);
    const cart = await populateCart(companyId, client.cart_items || []);
    return { token, client: toStoreClient(client), cart };
};
exports.registerClient = registerClient;
const loginClient = async (companyId, phoneNumber, password) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    (0, store_service_1.assertStoreIsAvailable)(company);
    const client = await client_model_1.Client.findOne({ company: companyId, phoneNumber }).select("+password");
    if (!client || !client.password) {
        throw new Error("Credenciales inválidas");
    }
    const isMatch = await bcryptjs_1.default.compare(password, client.password);
    if (!isMatch) {
        throw new Error("Credenciales inválidas");
    }
    const token = signClientToken(companyId, client._id, client.fullName);
    const cart = await populateCart(companyId, client.cart_items || []);
    return { token, client: toStoreClient(client), cart };
};
exports.loginClient = loginClient;
const getMe = async (companyId, clientId) => {
    const client = await client_model_1.Client.findOne({ _id: clientId, company: companyId });
    if (!client)
        throw new Error("Cliente no encontrado");
    const cart = await populateCart(companyId, client.cart_items || []);
    return { client: toStoreClient(client), cart };
};
exports.getMe = getMe;
const updateProfile = async (companyId, clientId, input) => {
    const client = await client_model_1.Client.findOne({ _id: clientId, company: companyId });
    if (!client)
        throw new Error("Cliente no encontrado");
    if (input.email && !EMAIL_REGEX.test(input.email)) {
        throw new Error("Ingresa un correo válido.");
    }
    if (input.fullName)
        client.fullName = input.fullName;
    if (input.email !== undefined)
        client.email = input.email;
    if (input.address !== undefined)
        client.address = input.address;
    await client.save();
    return toStoreClient(client);
};
exports.updateProfile = updateProfile;
const updateCart = async (companyId, clientId, items) => {
    const client = await client_model_1.Client.findOne({ _id: clientId, company: companyId });
    if (!client)
        throw new Error("Cliente no encontrado");
    const validItems = [];
    for (const item of items) {
        if (item.quantity <= 0)
            continue;
        const product = await product_model_1.Product.findOne({ _id: item.productId, company: companyId });
        if (!product || product.status !== productStatus_enum_1.productStatus.DISPONIBLE)
            continue;
        const quantity = product.stock > 0 ? Math.min(item.quantity, product.stock) : item.quantity;
        validItems.push({ product: product._id, quantity });
    }
    client.cart_items = validItems;
    await client.save();
    return await populateCart(companyId, client.cart_items || []);
};
exports.updateCart = updateCart;
const listOrdersByClient = async (companyId, clientId) => {
    return await sale_order_model_1.SaleOrder.find({ company: companyId, client: clientId })
        .sort({ date: -1 })
        .populate("client")
        .lean();
};
exports.listOrdersByClient = listOrdersByClient;
const getOrderDetail = async (companyId, clientId, orderId) => {
    // El filtro por client asegura que un cliente nunca pueda ver el pedido de otro
    const order = await sale_order_model_1.SaleOrder.findOne({
        _id: orderId,
        company: companyId,
        client: clientId,
    })
        .populate("client")
        .lean();
    if (!order) {
        throw new Error("Pedido no encontrado");
    }
    const details = await sale_order_detail_model_1.SaleOrderDetail.find({
        company: companyId,
        sale_order: orderId,
    })
        .populate("product")
        .lean();
    let qrPaymentInfo = null;
    if (order.is_paid) {
        const qrPayment = await qr_payment_model_1.QrPayment.findOne({
            company: companyId,
            sale_order: orderId,
            type: "venta_contado",
            processed: true,
        }).sort({ createdAt: -1 });
        if (qrPayment) {
            qrPaymentInfo = {
                amount: qrPayment.amount,
                currency: qrPayment.currency,
                amount_bob: qrPayment.amount_bob ?? undefined,
                exchange_rate: qrPayment.exchange_rate ?? undefined,
            };
        }
    }
    return {
        _id: order._id.toString(),
        code: order.code,
        date: order.date,
        status: order.status,
        total: order.total,
        is_paid: order.is_paid,
        address: order.client?.address || "",
        payment_method: order.payment_method,
        contado_payment_method: order.contado_payment_method,
        items: details.map((detail) => ({
            productId: detail.product?._id?.toString() ?? "",
            productName: detail.product?.name ?? "Producto eliminado",
            productImage: detail.product?.image ?? "",
            quantity: detail.quantity,
            sale_price: detail.sale_price,
            subtotal: detail.subtotal,
        })),
        qr_payment_info: qrPaymentInfo,
    };
};
exports.getOrderDetail = getOrderDetail;
const STORE_PAYMENT_METHODS = [salePaymentMethod_1.salePaymentMethod.EFECTIVO, salePaymentMethod_1.salePaymentMethod.QR];
const createOrderForClient = async (companyId, clientId, items, address, contadoPaymentMethod) => {
    const company = await company_model_1.Company.findById(companyId).lean();
    (0, store_service_1.assertStoreIsAvailable)(company);
    if (!items || items.length === 0) {
        throw new Error("El carrito está vacío");
    }
    const paymentMethodToUse = contadoPaymentMethod || salePaymentMethod_1.salePaymentMethod.EFECTIVO;
    if (!STORE_PAYMENT_METHODS.includes(paymentMethodToUse)) {
        throw new Error("Método de pago no válido");
    }
    const client = await client_model_1.Client.findOne({ _id: clientId, company: companyId });
    if (!client)
        throw new Error("Cliente no encontrado");
    if (address) {
        client.address = address;
        await client.save();
    }
    const storeUser = await user_model_1.User.findOne({ company: companyId, is_global: true });
    if (!storeUser) {
        throw new Error("La tienda no está disponible en este momento");
    }
    const newOrder = await (0, saleOrder_service_1.create)(companyId, storeUser._id, {
        date: new Date(),
        client: client._id.toString(),
        payment_method: saleOrderPaymentMethod_1.paymentMethod.CONTADO,
        contado_payment_method: paymentMethodToUse,
        source: STORE_ORDER_SOURCE,
    });
    try {
        for (const item of items) {
            if (item.quantity <= 0) {
                throw new Error("La cantidad debe ser mayor a 0");
            }
            const product = await product_model_1.Product.findOne({
                _id: item.productId,
                company: companyId,
            });
            if (!product || product.status !== productStatus_enum_1.productStatus.DISPONIBLE) {
                throw new Error("Uno de los productos ya no está disponible");
            }
            let warehouseId;
            if (product.stock_type === stockType_enum_1.stockType.INDIVIDUAL) {
                const inventories = await product_inventory_model_1.ProductInventory.find({
                    company: companyId,
                    product: product._id,
                    available: { $gte: item.quantity },
                }).sort({ available: -1 });
                if (inventories.length === 0) {
                    throw new Error(`No hay suficiente stock disponible para "${product.name}"`);
                }
                warehouseId = inventories[0].warehouse;
            }
            await (0, saleOrder_service_1.createDetail)(companyId, {
                sale_order: newOrder._id,
                product: product._id,
                sale_price: (0, store_service_1.getEffectiveSalePrice)(product),
                quantity: item.quantity,
                warehouse: warehouseId,
            });
        }
    }
    catch (error) {
        await (0, saleOrder_service_1.deleteSaleOrder)(companyId, newOrder._id);
        throw error;
    }
    client.cart_items = [];
    await client.save();
    const finalOrder = await (0, saleOrder_service_1.findSaleOrder)(companyId, newOrder._id);
    try {
        await (0, notification_service_1.createNotification)(companyId, {
            type: "store_order",
            title: "Nuevo pedido de la tienda",
            message: `${finalOrder.client.fullName} hizo un pedido (${finalOrder.code}) por ${finalOrder.total}.`,
            link: "/tienda/pedidos",
        });
    }
    catch (error) {
        console.error("⚠️ No se pudo crear la notificación de nuevo pedido:", error);
    }
    return {
        _id: finalOrder._id.toString(),
        code: finalOrder.code,
        total: finalOrder.total,
        clientFullName: finalOrder.client.fullName,
    };
};
exports.createOrderForClient = createOrderForClient;
