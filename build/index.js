"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = require("mongoose");
const multer_1 = __importDefault(require("multer"));
const http_1 = __importDefault(require("http"));
const socket_1 = require("./socket");
const restaurant_1 = require("./restaurant");
const checkCompanyExpirations_1 = require("./cron/checkCompanyExpirations");
const checkLowStock_1 = require("./cron/checkLowStock");
const checkAccountsReceivable_1 = require("./cron/checkAccountsReceivable");
const db_1 = require("./db");
const graphql_1 = require("./graphql");
const company_model_1 = require("./modules/company/company.model");
const product_service_1 = require("./modules/product/product.service");
const emailTransporter_1 = require("./utils/emailTransporter");
const ability_1 = require("./utils/ability");
const planLimits_1 = require("./utils/planLimits");
const qr_payment_service_1 = require("./modules/qr_payment/qr_payment.service");
dotenv_1.default.config();
const app = (0, express_1.default)();
const allowedOrigins = [
    "https://mymanag.vercel.app",
    "https://www.inventasys.site",
    "https://inventasys.vercel.app",
    "https://mymanag-store.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "https://extends-cartoons-eau-charge.trycloudflare.com"
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("No permitido por CORS"));
        }
    },
    credentials: true,
    // PUT/PATCH/DELETE agregados para el sistema de fichas del restaurant
    // (editar plato, cambiar estado de ficha, borrar categoría/plato).
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Set-Cookie",
        "Access-Control-Allow-Origin",
        "Cache-Control",
        "Pragma",
    ],
};
// Rate limiting para login de staff: máx 10 intentos por IP cada 15 minutos
const loginRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiting propio para login/registro de clientes de la tienda,
// completamente separado del de staff para que el tráfico de una tienda
// (que puede tener muchos clientes desde la misma red/IP) nunca bloquee
// el login del panel de MyManag.
const storeAuthRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
});
const STAFF_LOGIN_OPERATIONS = new Set(["Login", "loginLanding"]);
const STORE_AUTH_OPERATIONS = new Set(["StoreLogin", "StoreRegister"]);
function matchesOperation(body, operations) {
    if (body?.operationName && operations.has(body.operationName)) {
        return true;
    }
    if (body?.query) {
        const match = body.query.match(/^\s*(?:query|mutation)\s+(\w+)/);
        if (match && operations.has(match[1])) {
            return true;
        }
    }
    return false;
}
const port = process.env.PORT || 3000;
// Operaciones GraphQL públicas (no requieren token)
const PUBLIC_OPERATIONS = new Set([
    "Login",
    "loginLanding",
    "StoreListProducts",
    "StoreCreateOrder",
    "StoreRegister",
    "StoreLogin",
]);
/**
 * Detecta si el cuerpo del request es una operación pública.
 * Usa operationName cuando está disponible; sino busca en el query.
 * Más robusto que un simple string includes().
 */
function isPublicOperation(body) {
    if (body?.operationName && PUBLIC_OPERATIONS.has(body.operationName)) {
        return true;
    }
    if (body?.query) {
        // Fallback: parseo simple de la primera operación del query
        const match = body.query.match(/^\s*(?:query|mutation)\s+(\w+)/);
        if (match && PUBLIC_OPERATIONS.has(match[1])) {
            return true;
        }
    }
    return false;
}
const bootstrapServer = async () => {
    (0, db_1.connectToMongoDB)();
    (0, emailTransporter_1.verifyEmailConnection)().catch((error) => {
        console.warn("⚠️ Advertencia: No se pudo verificar la conexión de correo al iniciar:", error);
    });
    (0, checkCompanyExpirations_1.initCompanyExpirationCron)();
    (0, checkLowStock_1.initLowStockCron)();
    (0, checkAccountsReceivable_1.initAccountsReceivableCron)();
    const server = new server_1.ApolloServer({
        typeDefs: graphql_1.typeDefs,
        resolvers: graphql_1.resolvers,
        formatError: (error) => {
            return { message: error.message };
        },
    });
    await server.start();
    app.use((0, cors_1.default)(corsOptions));
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // Aplicar rate limiting solo a operaciones de login (staff y clientes por separado)
    app.use("/graphql", (req, res, next) => {
        if (matchesOperation(req.body, STAFF_LOGIN_OPERATIONS)) {
            return loginRateLimiter(req, res, next);
        }
        if (matchesOperation(req.body, STORE_AUTH_OPERATIONS)) {
            return storeAuthRateLimiter(req, res, next);
        }
        next();
    });
    app.use("/graphql", (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => {
            if (req.body?.query?.includes("__schema")) {
                return {};
            }
            if (isPublicOperation(req.body)) {
                return {};
            }
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                throw new Error("No autorizado: Token no proporcionado.");
            }
            const token = authHeader.startsWith("Bearer ")
                ? authHeader.split("Bearer ")[1]
                : authHeader;
            if (!token) {
                throw new Error("No autorizado: Token no proporcionado.");
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "");
                // Construir ability CASL una sola vez por request, sin query a DB
                const ability = (0, ability_1.buildAbility)(decoded.permissions ?? []);
                return { user: decoded, ability };
            }
            catch (error) {
                throw new Error("No autorizado: Token inválido.");
            }
        },
    }));
    app.get("/", (req, res) => {
        res.send("hello world!");
    });
    // Public REST: resolve slug → company info (used by ReservaYa booking page)
    app.get("/company/by-slug/:slug", async (req, res) => {
        try {
            const company = await company_model_1.Company.findOne({ slug: req.params.slug.toLowerCase() })
                .select("_id name slug")
                .lean();
            if (!company)
                return res.status(404).json({ message: "Empresa no encontrada" });
            return res.json({ companyId: company._id, name: company.name, slug: company.slug });
        }
        catch {
            return res.status(500).json({ message: "Error al buscar empresa" });
        }
    });
    // Public REST: get full company profile by companyId (used by ReservaYa booking page & admin)
    app.get("/company/info/:id", async (req, res) => {
        try {
            const company = await company_model_1.Company.findById(req.params.id)
                .select("_id name slug tagline description image address phone email country currency store_banner_image store_theme plan store_enabled")
                .lean();
            if (!company)
                return res.status(404).json({ message: "Empresa no encontrada" });
            const hasStorePlan = planLimits_1.companyPlanLimits[company.plan]?.hasStore ?? false;
            return res.json({
                companyId: company._id,
                name: company.name,
                slug: company.slug,
                tagline: company.tagline || "",
                description: company.description || "",
                image: company.image || "",
                address: company.address || "",
                phone: company.phone || "",
                email: company.email || "",
                country: company.country || "",
                currency: company.currency || "Bs",
                store_banner_image: company.store_banner_image || "",
                store_theme: company.store_theme || null,
                // Solo lo consume el storefront de MyManag para mostrar un mensaje
                // claro cuando el plan no incluye tienda o está desactivada, en vez
                // de un error crudo al cargar el catálogo.
                store_available: hasStorePlan && !!company.store_enabled,
            });
        }
        catch {
            return res.status(500).json({ message: "Error al buscar empresa" });
        }
    });
    // Protected REST: update company profile (called by ReservaYa backend with API key)
    app.put("/company/update/:id", async (req, res) => {
        const apiKey = req.headers["x-api-key"];
        const expectedKey = process.env.RESERVAYA_API_KEY;
        if (!expectedKey || apiKey !== expectedKey) {
            return res.status(401).json({ message: "No autorizado" });
        }
        try {
            const allowed = ["name", "tagline", "description", "image", "address", "phone", "email", "country"];
            const update = {};
            for (const key of allowed) {
                if (req.body[key] !== undefined && req.body[key] !== null) {
                    update[key] = req.body[key];
                }
            }
            const company = await company_model_1.Company.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).select("_id name slug tagline description image address phone email country").lean();
            if (!company)
                return res.status(404).json({ message: "Empresa no encontrada" });
            return res.json({ companyId: company._id, ...company });
        }
        catch {
            return res.status(500).json({ message: "Error al actualizar empresa" });
        }
    });
    app.post("/webhooks/mesadepagos/:secret", async (req, res) => {
        if (req.params.secret !== process.env.MESADEPAGOS_WEBHOOK_SECRET) {
            return res.status(404).json({ message: "Not found" });
        }
        try {
            const { status, externalReference, details } = req.body || {};
            await (0, qr_payment_service_1.handleMesaDePagosWebhook)({
                status,
                transactionId: details?.transactionId,
                externalReference,
            });
            return res.status(200).json({ received: true });
        }
        catch (error) {
            console.error("❌ Error procesando webhook de Mesa de Pagos:", error);
            return res.status(500).json({ message: "Error interno" });
        }
    });
    const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
    app.post("/upload-preview", upload.single("file"), async (req, res) => {
        const file = req.file;
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res
                .status(401)
                .json({ message: "No autorizado: Token no proporcionado" });
        }
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.split("Bearer ")[1]
            : authHeader;
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "");
            // Verificar permiso de importar productos
            const ability = (0, ability_1.buildAbility)(decoded.permissions ?? []);
            if (!ability.can("create", "Product")) {
                return res.status(403).json({ message: "No tienes permisos para importar productos" });
            }
            const companyId = new mongoose_1.Types.ObjectId(decoded.companyId);
            if (!file) {
                return res.status(400).json({ message: "Archivo no proporcionado" });
            }
            const fileLike = {
                arrayBuffer: async () => file.buffer,
                name: file.originalname,
                type: file.mimetype,
            };
            const preview = await (0, product_service_1.previewImportProducts)(companyId, fileLike);
            return res.json(preview);
        }
        catch (error) {
            return res.status(401).json({ message: error.message });
        }
    });
    const httpServer = http_1.default.createServer(app);
    (0, socket_1.initSocket)(httpServer, allowedOrigins);
    (0, restaurant_1.mountRestaurantApi)(app, httpServer, allowedOrigins);
    httpServer.listen(port, () => {
        console.log(`server ready on port ${port}`);
    });
};
bootstrapServer();
