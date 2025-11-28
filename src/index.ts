import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import { Types as MongooseTypes } from "mongoose";
import multer from "multer";
import { initCompanyExpirationCron } from "./cron/checkCompanyExpirations";
import { connectToMongoDB } from "./db";
import { resolvers, typeDefs } from "./graphql";
import { previewImportProducts } from "./modules/product/product.service";
import { verifyEmailConnection } from "./utils/emailTransporter";

dotenv.config();
const app = express();

// const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];
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

const port = process.env.PORT || 3000;

const bootstrapServer = async () => {
  connectToMongoDB();
  
  // Verificar conexión de correo al iniciar (no bloquea el inicio si falla)
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

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => {
        const publicOperations = ["Login", "loginLanding"];
        const query = req.body?.query || "";

        if (query.includes("__schema")) {
          return {};
        }

        const isPublic = publicOperations.some((op) => query.includes(op));
        if (isPublic) {
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
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "");
          return { user: decoded };
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {
        companyId: string;
      };
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
