/**
 * Auditoría de campos reales en la colección `companies`.
 *
 * Lee los documentos crudos (sin pasar por el schema de Mongoose) y compara
 * el conjunto de campos que realmente existen en la base de datos contra los
 * campos definidos hoy en `company.model.ts`, para detectar campos huérfanos
 * de versiones anteriores del schema. NO modifica nada en la base de datos.
 *
 * Uso:
 *   npx ts-node src/scripts/audit-company-fields.ts
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectToMongoDB } from "../db";
import { Company } from "../modules/company/company.model";

dotenv.config();

const isLeafBsonValue = (v: any) =>
  v instanceof Date ||
  typeof v?._bsontype === "string" || // ObjectId, Binary, Decimal128, etc.
  Buffer.isBuffer(v);

const collectPaths = (obj: any, prefix: string, into: Set<string>) => {
  if (obj === null || obj === undefined || typeof obj !== "object") return;
  if (isLeafBsonValue(obj)) return;
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectPaths(item, prefix, into));
    return;
  }
  for (const key of Object.keys(obj)) {
    if (key === "_id" || key === "__v") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    into.add(path);
    collectPaths(obj[key], path, into);
  }
};

const main = async () => {
  await connectToMongoDB();

  const schemaPaths = new Set<string>();
  const collectSchemaPaths = (schema: mongoose.Schema, prefix: string) => {
    for (const [key, type] of Object.entries(schema.paths)) {
      if (key === "_id" || key === "__v") continue;
      const path = prefix ? `${prefix}.${key}` : key;
      schemaPaths.add(path);
      const nested = (type as any).schema as mongoose.Schema | undefined;
      if (nested) collectSchemaPaths(nested, path);
    }
  };
  collectSchemaPaths(Company.schema, "");

  if (!mongoose.connection.db) throw new Error("Sin conexión a la base de datos");

  const rawDocs = await mongoose.connection.db
    .collection("companies")
    .find({})
    .toArray();

  const dbPaths = new Set<string>();
  for (const doc of rawDocs) {
    collectPaths(doc, "", dbPaths);
  }

  const onlyInDb = [...dbPaths].filter(
    (p) => !schemaPaths.has(p) && !p.match(/\.\d+(\.|$)/) // ignora índices de array
  ).sort();

  const onlyInSchema = [...schemaPaths].filter((p) => !dbPaths.has(p)).sort();

  console.log(`\nTotal empresas: ${rawDocs.length}`);
  console.log(`\n=== Campos en la BD que YA NO están en el schema actual (candidatos a limpiar) ===`);
  console.log(onlyInDb.length ? onlyInDb.join("\n") : "(ninguno)");

  console.log(`\n=== Campos del schema actual que NUNCA aparecen en ningún documento ===`);
  console.log(onlyInSchema.length ? onlyInSchema.join("\n") : "(ninguno)");

  // Conteo de cuántos documentos tienen cada campo huérfano, para dimensionar el impacto
  if (onlyInDb.length > 0) {
    console.log(`\n=== Cuántas empresas tienen cada campo huérfano ===`);
    for (const field of onlyInDb) {
      const [top] = field.split(".");
      const count = rawDocs.filter((d: any) => d[top] !== undefined).length;
      console.log(`${field}: ${count} empresa(s)`);
    }
  }

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
