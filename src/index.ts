import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";

import {
  checkCompanyExpirations,
  initCompanyExpirationCron,
} from "./cron/checkCompanyExpirations";
import { connectToMongoDB } from "./db";
import { resolvers, typeDefs } from "./graphql";

dotenv.config();
const app = express();

const corsOptions = {
  origin: "https://inventasys.vercel.app",
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
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

  app.get("/admin/test-cron", async (req, res) => {
    await checkCompanyExpirations();
    res.send("✔ Cron ejecutado manualmente.");
  });

  app.listen(port, () => {
    console.log(`server ready on port ${port}`);
  });
};

bootstrapServer();
