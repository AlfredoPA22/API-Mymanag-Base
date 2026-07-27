"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCompanyBackup = exports.deleteCompanyPermanently = exports.getCompanyDeletionReport = exports.adjustSubscription = exports.update = exports.detailCompany = exports.activateFirstReservaYaUser = exports.activateFirstMyManagUser = exports.generatePassword = exports.generateUniqueSlug = exports.generateSlug = exports.generateUsername = exports.create = exports.findAllAdmin = exports.findAll = void 0;
const date_fns_1 = require("date-fns");
const companyPlan_enum_1 = require("../../utils/enums/companyPlan.enum");
const planLimits_1 = require("../../utils/planLimits");
const companyStatus_enum_1 = require("../../utils/enums/companyStatus.enum");
const systemType_enum_1 = require("../../utils/enums/systemType.enum");
const company_model_1 = require("./company.model");
const sale_order_model_1 = require("../sale_order/sale_order.model");
const purchase_order_model_1 = require("../purchase_order/purchase_order.model");
const user_model_1 = require("../user/user.model");
const role_model_1 = require("../role/role.model");
const permissionsMock_1 = require("../permission/utils/permissionsMock");
const mongoose_1 = __importStar(require("mongoose"));
const companyDataModels_1 = require("../../utils/companyDataModels");
const sendCredentialsEmail_1 = require("../../utils/sendCredentialsEmail");
const user_landing_model_1 = require("../user_landing/user_landing.model");
const userLandingType_enum_1 = require("../../utils/enums/userLandingType.enum");
const reservayaClient_1 = require("../../utils/reservayaClient");
const sendAdminNotificationEmail_1 = require("../../utils/sendAdminNotificationEmail");
const ALLOWED_CURRENCIES = ["Bs", "$"];
// El último pago de una empresa depende de a qué sistema pertenece — una
// empresa con MyManag y ReservaYa tiene un "último pago" distinto para cada
// uno. Sin este scoping, un pago reciente de un sistema podía ocultar que el
// otro sistema tenía un pago pendiente o rechazado sin resolver.
const attachLatestPayments = (companies) => {
    return companies.map((company) => {
        const payments = (company.payments ?? []);
        const sortedAsc = [...payments].sort((a, b) => {
            const dateA = new Date(a.paid_at ?? a.createdAt).getTime();
            const dateB = new Date(b.paid_at ?? b.createdAt).getTime();
            return dateA - dateB;
        });
        const latestForSystem = (system) => {
            for (let i = sortedAsc.length - 1; i >= 0; i--) {
                const paymentSystem = sortedAsc[i].system || systemType_enum_1.systemType.MYMANAG;
                if (paymentSystem === system)
                    return sortedAsc[i];
            }
            return null;
        };
        const subscriptions = (company.subscriptions ?? []).map((sub) => ({
            ...sub,
            latest_payment: latestForSystem(sub.system),
        }));
        const { payments: _omit, ...rest } = company;
        return {
            ...rest,
            subscriptions,
            latest_payment: latestForSystem(systemType_enum_1.systemType.MYMANAG),
        };
    });
};
const findAll = async (userId) => {
    const listCompany = await company_model_1.Company.aggregate([
        {
            $match: { created_by: new mongoose_1.Types.ObjectId(`${userId}`) },
        },
        {
            $lookup: {
                from: "payment_landings",
                localField: "_id",
                foreignField: "company",
                as: "payments",
            },
        },
    ]);
    return attachLatestPayments(listCompany);
};
exports.findAll = findAll;
const findAllAdmin = async (userId) => {
    const findUser = await user_landing_model_1.UserLanding.findById(userId);
    if (!findUser) {
        throw new Error("No existe el usuario");
    }
    else if (findUser.user_type !== userLandingType_enum_1.userLandingType.ADMIN) {
        throw new Error("Acceso denegado: solo para administradores");
    }
    const listCompany = await company_model_1.Company.aggregate([
        {
            $lookup: {
                from: "payment_landings",
                localField: "_id",
                foreignField: "company",
                as: "payments",
            },
        },
    ]);
    return attachLatestPayments(listCompany);
};
exports.findAllAdmin = findAllAdmin;
const create = async (userId, companyInput) => {
    const userInfo = await user_landing_model_1.UserLanding.findById(userId);
    if (!userInfo) {
        throw new Error("usuario no encontrado");
    }
    if (companyInput.currency && !ALLOWED_CURRENCIES.includes(companyInput.currency)) {
        throw new Error("Moneda no válida. Solo se admite Bs o $.");
    }
    const company = await company_model_1.Company.findOne({
        name: companyInput.name,
    });
    if (company) {
        throw new Error("La empresa ya existe");
    }
    const companyLimit = await company_model_1.Company.find({ created_by: userId });
    const isLandingAdmin = userInfo.user_type === userLandingType_enum_1.userLandingType.ADMIN;
    if (!isLandingAdmin && companyLimit.length >= 3) {
        throw new Error("Llegaste al límite de empresas.");
    }
    const system = companyInput.system || systemType_enum_1.systemType.MYMANAG;
    const isMyManag = system === systemType_enum_1.systemType.MYMANAG;
    // Check free plan limit per system (los administradores de la Landing no
    // están sujetos a este límite — lo necesitan para crear empresas de
    // demostración/pruebas sin restricción).
    if (!isLandingAdmin && companyInput.plan === companyPlan_enum_1.companyPlan.FREE) {
        const alreadyHasFreeForSystem = companyLimit.some((c) => {
            const sub = c.subscriptions?.find((s) => s.system === system);
            if (sub)
                return sub.plan === companyPlan_enum_1.companyPlan.FREE;
            return isMyManag && c.plan === companyPlan_enum_1.companyPlan.FREE;
        });
        if (alreadyHasFreeForSystem) {
            throw new Error("Solo puedes tener una empresa con plan gratuito para este sistema.");
        }
    }
    const isFreePlan = companyInput.plan === companyPlan_enum_1.companyPlan.FREE;
    const now = new Date();
    const subStatus = isFreePlan ? companyStatus_enum_1.companyStatus.ACTIVE : companyStatus_enum_1.companyStatus.PENDING;
    const subTrialExpires = isFreePlan ? (0, date_fns_1.addDays)(now, 7) : null;
    const subscription = {
        system,
        plan: companyInput.plan || companyPlan_enum_1.companyPlan.FREE,
        status: subStatus,
        trial_expires_at: subTrialExpires,
        subscription_expires_at: null,
        notified_before_expiration: false,
    };
    const slug = await (0, exports.generateUniqueSlug)(companyInput.name);
    const newCompany = await company_model_1.Company.create({
        name: companyInput.name,
        slug,
        legal_name: companyInput.legal_name,
        nit: companyInput.nit,
        email: companyInput.email,
        phone: companyInput.phone,
        address: companyInput.address,
        country: companyInput.country,
        currency: companyInput.currency,
        exchange_rate: companyInput.exchange_rate,
        plan: isMyManag ? (companyInput.plan || companyPlan_enum_1.companyPlan.FREE) : companyPlan_enum_1.companyPlan.FREE,
        status: isMyManag ? subStatus : companyStatus_enum_1.companyStatus.PENDING,
        trial_expires_at: isMyManag ? subTrialExpires : null,
        subscriptions: [subscription],
        created_by: userId,
    });
    // Enviar welcome email solo para planes de pago (los gratuitos solo reciben credenciales)
    if (!isFreePlan) {
        const { sendWelcomeEmail } = await Promise.resolve().then(() => __importStar(require("../../utils/sendWelcomeEmail")));
        try {
            await sendWelcomeEmail({
                to: userInfo.email,
                company_name: newCompany.name,
                plan: subscription.plan,
            });
        }
        catch (error) {
            console.error("⚠️ No se pudo enviar el correo de bienvenida, pero la empresa se creó correctamente:", error);
        }
    }
    // Notificar al administrador de Inventasys
    await (0, sendAdminNotificationEmail_1.sendAdminNewCompanyEmail)({
        company_name: newCompany.name,
        user_name: userInfo.fullName,
        user_email: userInfo.email,
        plan: subscription.plan,
        system,
    });
    // Only create MyManag admin user for free MyManag plan
    if (isFreePlan && isMyManag) {
        const newRole = await role_model_1.Role.create({
            company: newCompany._id,
            name: "Administrador",
            description: "Rol administrador",
            permission: permissionsMock_1.PERMISSIONS_MOCK,
        });
        const user_name = (0, exports.generateUsername)(companyInput.name);
        const password = (0, exports.generatePassword)();
        await user_model_1.User.create({
            company: newCompany._id,
            user_name,
            password,
            role: newRole._id,
            is_global: true,
            is_admin: true,
        });
        try {
            await (0, sendCredentialsEmail_1.sendCredentialsEmail)({
                to: userInfo.email,
                user_name,
                password,
                company_name: newCompany.name,
            });
        }
        catch (error) {
            console.error("⚠️ No se pudo enviar el correo con credenciales, pero el usuario se creó correctamente:", error);
        }
        return {
            company: newCompany,
            adminCredentials: { user_name, password },
        };
    }
    // Create ReservaYa admin user for free ReservaYa plan
    if (isFreePlan && system === systemType_enum_1.systemType.RESERVAYA) {
        const user_name = (0, exports.generateUsername)(companyInput.name);
        const password = (0, exports.generatePassword)();
        const adminResult = await (0, reservayaClient_1.createReservaYaAdmin)(companyInput.name, user_name, password, companyInput.phone, newCompany._id.toString());
        if (!adminResult) {
            // Rollback: delete the company so the user can retry cleanly
            await newCompany.deleteOne();
            throw new Error("No se pudo crear el usuario administrador en ReservaYa. " +
                "Verificá que el servicio de reservas esté disponible e intentá de nuevo.");
        }
        try {
            await (0, sendCredentialsEmail_1.sendCredentialsEmail)({
                to: userInfo.email,
                user_name,
                password,
                company_name: newCompany.name,
                loginUrl: `${process.env.RESERVAYA_CLIENT_URL || 'http://localhost:5173'}/login`,
                systemName: 'ReservaYa',
            });
        }
        catch (error) {
            console.error("⚠️ No se pudo enviar credenciales de ReservaYa:", error);
        }
        return {
            company: newCompany,
            adminCredentials: { user_name, password },
        };
    }
    return {
        company: newCompany,
        adminCredentials: { user_name: "", password: "" },
    };
};
exports.create = create;
const generateUsername = (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-").slice(0, 12);
    const random = Math.floor(100 + Math.random() * 900);
    return `${slug}-${random}`;
};
exports.generateUsername = generateUsername;
const generateSlug = (name) => name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
exports.generateSlug = generateSlug;
const generateUniqueSlug = async (name) => {
    const base = (0, exports.generateSlug)(name);
    let slug = base;
    let counter = 1;
    while (await company_model_1.Company.findOne({ slug })) {
        slug = `${base}-${counter++}`;
    }
    return slug;
};
exports.generateUniqueSlug = generateUniqueSlug;
const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};
exports.generatePassword = generatePassword;
// Crea el rol Administrador + usuario de MyManag para una empresa que se
// activa por primera vez, y le envía las credenciales. Compartido entre
// approvePaymentLanding (aprobar un pago) y adjustSubscription (activación
// manual desde el panel admin de Landing) para que ninguno de los dos
// caminos deje a la empresa activa sin ningún usuario para entrar.
const activateFirstMyManagUser = async (company, creatorEmail) => {
    const role = await role_model_1.Role.create({
        company: company._id,
        name: "Administrador",
        description: "Rol administrador",
        permission: permissionsMock_1.PERMISSIONS_MOCK,
    });
    const user_name = (0, exports.generateUsername)(company.name);
    const password = (0, exports.generatePassword)();
    await user_model_1.User.create({
        company: company._id,
        user_name,
        password,
        role: role._id,
        is_global: true,
        is_admin: true,
    });
    try {
        await (0, sendCredentialsEmail_1.sendCredentialsEmail)({
            to: creatorEmail,
            user_name,
            password,
            company_name: company.name,
        });
    }
    catch (error) {
        console.error("⚠️ No se pudo enviar credenciales de MyManag:", error);
    }
};
exports.activateFirstMyManagUser = activateFirstMyManagUser;
// Equivalente para ReservaYa: crea el usuario administrador en el sistema
// externo de ReservaYa y envía credenciales. Mismo motivo que la función
// anterior — compartido entre approvePaymentLanding y adjustSubscription.
const activateFirstReservaYaUser = async (company, creatorEmail) => {
    const user_name = (0, exports.generateUsername)(company.name);
    const password = (0, exports.generatePassword)();
    await (0, reservayaClient_1.createReservaYaAdmin)(company.name, user_name, password, company.phone, company._id.toString());
    try {
        await (0, sendCredentialsEmail_1.sendCredentialsEmail)({
            to: creatorEmail,
            user_name,
            password,
            company_name: company.name,
            loginUrl: `${process.env.RESERVAYA_CLIENT_URL || "http://localhost:5173"}/login`,
            systemName: "ReservaYa",
        });
    }
    catch (error) {
        console.error("⚠️ No se pudo enviar credenciales de ReservaYa:", error);
    }
};
exports.activateFirstReservaYaUser = activateFirstReservaYaUser;
const detailCompany = async (companyId) => {
    const company = await company_model_1.Company.findOne({
        _id: companyId,
    }).lean();
    if (!company) {
        throw new Error("No existe la empresa");
    }
    return company;
};
exports.detailCompany = detailCompany;
const update = async (companyId, updateCompanyInput) => {
    const company = await company_model_1.Company.findById(companyId);
    if (!company) {
        throw new Error("No existe la empresa");
    }
    if (updateCompanyInput.currency && !ALLOWED_CURRENCIES.includes(updateCompanyInput.currency)) {
        throw new Error("Moneda no válida. Solo se admite Bs o $.");
    }
    if (updateCompanyInput.currency && updateCompanyInput.currency !== company.currency) {
        const [hasSaleOrder, hasPurchaseOrder] = await Promise.all([
            sale_order_model_1.SaleOrder.exists({ company: companyId }),
            purchase_order_model_1.PurchaseOrder.exists({ company: companyId }),
        ]);
        if (hasSaleOrder || hasPurchaseOrder) {
            throw new Error("No se puede cambiar la moneda: la empresa ya tiene ventas o compras registradas.");
        }
    }
    const nextCurrency = updateCompanyInput.currency ?? company.currency;
    const nextExchangeRate = updateCompanyInput.exchange_rate ?? company.exchange_rate;
    if (nextCurrency === "$" && (!nextExchangeRate || nextExchangeRate <= 0)) {
        throw new Error("Configura un tipo de cambio válido para operar en dólares.");
    }
    const updateData = {};
    for (const [key, value] of Object.entries(updateCompanyInput)) {
        if (value !== null && value !== undefined) {
            updateData[key] = value;
        }
    }
    const updated = await company_model_1.Company.findByIdAndUpdate(companyId, { $set: updateData }, { new: true }).lean();
    return updated;
};
exports.update = update;
const adjustSubscription = async (adminUserId, input) => {
    const adminUser = await user_landing_model_1.UserLanding.findById(adminUserId);
    if (!adminUser)
        throw new Error("Usuario no encontrado");
    if (adminUser.user_type !== userLandingType_enum_1.userLandingType.ADMIN) {
        throw new Error("Acceso denegado: solo para administradores");
    }
    const company = await company_model_1.Company.findById(input.companyId);
    if (!company)
        throw new Error("Empresa no encontrada");
    const system = input.system;
    const isMyManag = system === systemType_enum_1.systemType.MYMANAG;
    const expiresAt = input.subscription_expires_at
        ? new Date(input.subscription_expires_at)
        : null;
    const trialExpiresAt = input.trial_expires_at
        ? new Date(input.trial_expires_at)
        : null;
    // Update or create subscription in subscriptions array
    const subIndex = company.subscriptions.findIndex((s) => s.system === system);
    const existingSubStatus = subIndex !== -1 ? company.subscriptions[subIndex].status : null;
    const updatedSub = {
        system,
        plan: input.plan,
        status: input.status,
        trial_expires_at: trialExpiresAt,
        subscription_expires_at: expiresAt,
        notified_before_expiration: false,
    };
    if (subIndex === -1) {
        company.subscriptions.push(updatedSub);
    }
    else {
        company.subscriptions[subIndex] = updatedSub;
    }
    // Si el admin activa manualmente una empresa que nunca pasó por un pago
    // aprobado (o nunca tuvo esta suscripción), no existe todavía ningún
    // usuario para entrar — se crea aquí con el mismo criterio que
    // approvePaymentLanding, para que "Ajustar" nunca deje una empresa
    // activa sin nadie que pueda usarla.
    if (input.status === companyStatus_enum_1.companyStatus.ACTIVE) {
        const companyCreator = await user_landing_model_1.UserLanding.findById(company.created_by);
        if (companyCreator) {
            if (isMyManag) {
                const existingMyManagUser = await user_model_1.User.findOne({ company: company._id });
                if (!existingMyManagUser) {
                    await (0, exports.activateFirstMyManagUser)(company, companyCreator.email);
                }
            }
            else if (system === systemType_enum_1.systemType.RESERVAYA &&
                (subIndex === -1 || existingSubStatus === companyStatus_enum_1.companyStatus.PENDING)) {
                await (0, exports.activateFirstReservaYaUser)(company, companyCreator.email);
            }
        }
    }
    // Sync legacy top-level fields for MyManag backward compatibility
    if (isMyManag) {
        company.plan = input.plan;
        company.status = input.status;
        company.subscription_expires_at = expiresAt;
        company.trial_expires_at = trialExpiresAt;
        company.notified_before_expiration = false;
        // Si el plan nuevo no incluye tienda online, se apaga de verdad — así,
        // si más adelante vuelve a subir a un plan con tienda, queda apagada
        // hasta que el admin la reactive manualmente (no se reactiva sola).
        if (!planLimits_1.companyPlanLimits[input.plan]?.hasStore) {
            company.store_enabled = false;
        }
    }
    company.markModified("subscriptions");
    await company.save();
    return company.toObject();
};
exports.adjustSubscription = adjustSubscription;
const assertLandingAdmin = async (adminUserId) => {
    const adminUser = await user_landing_model_1.UserLanding.findById(adminUserId);
    if (!adminUser)
        throw new Error("Usuario no encontrado");
    if (adminUser.user_type !== userLandingType_enum_1.userLandingType.ADMIN) {
        throw new Error("Acceso denegado: solo para administradores");
    }
};
const countCompanyData = async (companyId) => {
    const counts = await Promise.all(companyDataModels_1.companyDataModels.map(({ model }) => model.countDocuments({ company: companyId })));
    return Object.fromEntries(companyDataModels_1.companyDataModels.map(({ key }, i) => [key, counts[i]]));
};
const getCompanyDeletionReport = async (adminUserId, companyId) => {
    await assertLandingAdmin(adminUserId);
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const counts = await countCompanyData(companyId);
    return { companyName: company.name, ...counts };
};
exports.getCompanyDeletionReport = getCompanyDeletionReport;
const deleteCompanyPermanently = async (adminUserId, companyId, confirmationText) => {
    await assertLandingAdmin(adminUserId);
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    if (confirmationText.trim() !== company.name) {
        throw new Error("El texto de confirmación no coincide con el nombre de la empresa");
    }
    const counts = await countCompanyData(companyId);
    const session = await mongoose_1.default.startSession();
    try {
        await session.withTransaction(async () => {
            for (const { model } of companyDataModels_1.companyDataModels) {
                await model.deleteMany({ company: companyId }, { session });
            }
            await company_model_1.Company.deleteOne({ _id: companyId }, { session });
        });
    }
    finally {
        await session.endSession();
    }
    return { success: true, deletedCounts: { companyName: company.name, ...counts } };
};
exports.deleteCompanyPermanently = deleteCompanyPermanently;
const generateCompanyBackup = async (adminUserId, companyId) => {
    await assertLandingAdmin(adminUserId);
    const company = await company_model_1.Company.findById(companyId).lean();
    if (!company)
        throw new Error("Empresa no encontrada");
    const data = {};
    for (const { key, model } of companyDataModels_1.companyDataModels) {
        data[key] = await model.find({ company: companyId }).lean();
    }
    const backup = {
        generatedAt: new Date().toISOString(),
        company,
        data,
    };
    return JSON.stringify(backup);
};
exports.generateCompanyBackup = generateCompanyBackup;
