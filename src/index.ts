import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { connectToMongoDB } from "./db";
import { resolvers, typeDefs } from "./graphql";

dotenv.config();
const app = express();
const corsOptions = {
  // origin: "https://client-my-manag.vercel.app",
  origin: "http://localhost:5173",
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
  app.use("/graphql", expressMiddleware(server));

  app.get("/", (req, res) => {
    res.send("hello world!");
  });

  app.listen(port, () => {
    console.log(`server ready on port ${port}`);
  });
};

bootstrapServer();
