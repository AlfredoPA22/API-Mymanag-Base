import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { Types as MongooseTypes } from "mongoose";
import multer from "multer";
import { initCompanyExpirationCron } from "./cron/checkCompanyExpirations";
import { connectToMongoDB } from "./db";
import { resolvers, typeDefs } from "./graphql";
import { previewImportProducts } from "./modules/product/product.service";
import { verifyEmailConnection } from "./utils/emailTransporter";
import { buildAbility } from "./utils/ability";

dotenv.config();
const app = express();

const allowedOrigins = [
  "https://mymanag.vercel.app",
  "https://www.inventasys.site",
  "http://localhost:5173",
  "http://localhost:5174",
];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Set-Cookie",
    "Access-Control-Allow-Origin",
    "Cache-Control",
    "Pragma",
  ],
};

// Rate limiting para login: máx 10 intentos por IP cada 15 minutos
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const port = process.env.PORT || 3000;

// Operaciones GraphQL públicas (no requieren token)
const PUBLIC_OPERATIONS = new Set(["Login", "loginLanding"]);

/**
 * Detecta si el cuerpo del request es una operación pública.
 * Usa operationName cuando está disponible; sino busca en el query.
 * Más robusto que un simple string includes().
 */
function isPublicOperation(body: any): boolean {
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
  connectToMongoDB();

  verifyEmailConnection().catch((error) => {
    console.warn("⚠️ Advertencia: No se pudo verificar la conexión de correo al iniciar:", error);
  });

  initCompanyExpirationCron();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (error) => {
      return { message: error.message };
    },
  });

  await server.start();

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Aplicar rate limiting solo a operaciones de login
  app.use("/graphql", (req, res, next) => {
    if (isPublicOperation(req.body)) {
      return loginRateLimiter(req, res, next);
    }
    next();
  });

  app.use(
    "/graphql",
    expressMiddleware(server, {
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
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as any;
          // Construir ability CASL una sola vez por request, sin query a DB
          const ability = buildAbility(decoded.permissions ?? []);
          return { user: decoded, ability };
        } catch (error) {
          throw new Error("No autorizado: Token inválido.");
        }
      },
    })
  );

  app.get("/", (req, res) => {
    res.send("hello world!");
  });

  const upload = multer({ storage: multer.memoryStorage() });

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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as any;

      // Verificar permiso de importar productos
      const ability = buildAbility(decoded.permissions ?? []);
      if (!ability.can("create", "Product")) {
        return res.status(403).json({ message: "No tienes permisos para importar productos" });
      }

      const companyId = new MongooseTypes.ObjectId(decoded.companyId);
      if (!file) {
        return res.status(400).json({ message: "Archivo no proporcionado" });
      }

      const fileLike = {
        arrayBuffer: async () => file.buffer,
        name: file.originalname,
        type: file.mimetype,
      } as unknown as File;

      const preview = await previewImportProducts(companyId, fileLike);

      return res.json(preview);
    } catch (error: any) {
      return res.status(401).json({ message: error.message });
    }
  });

  app.listen(port, () => {
    console.log(`server ready on port ${port}`);
  });
};

bootstrapServer();
