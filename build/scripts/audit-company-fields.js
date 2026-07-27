"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = require("../db");
const company_model_1 = require("../modules/company/company.model");
dotenv_1.default.config();
const isLeafBsonValue = (v) => v instanceof Date ||
    typeof v?._bsontype === "string" || // ObjectId, Binary, Decimal128, etc.
    Buffer.isBuffer(v);
const collectPaths = (obj, prefix, into) => {
    if (obj === null || obj === undefined || typeof obj !== "object")
        return;
    if (isLeafBsonValue(obj))
        return;
    if (Array.isArray(obj)) {
        obj.forEach((item) => collectPaths(item, prefix, into));
        return;
    }
    for (const key of Object.keys(obj)) {
        if (key === "_id" || key === "__v")
            continue;
        const path = prefix ? `${prefix}.${key}` : key;
        into.add(path);
        collectPaths(obj[key], path, into);
    }
};
const main = async () => {
    await (0, db_1.connectToMongoDB)();
    const schemaPaths = new Set();
    const collectSchemaPaths = (schema, prefix) => {
        for (const [key, type] of Object.entries(schema.paths)) {
            if (key === "_id" || key === "__v")
                continue;
            const path = prefix ? `${prefix}.${key}` : key;
            schemaPaths.add(path);
            const nested = type.schema;
            if (nested)
                collectSchemaPaths(nested, path);
        }
    };
    collectSchemaPaths(company_model_1.Company.schema, "");
    if (!mongoose_1.default.connection.db)
        throw new Error("Sin conexión a la base de datos");
    const rawDocs = await mongoose_1.default.connection.db
        .collection("companies")
        .find({})
        .toArray();
    const dbPaths = new Set();
    for (const doc of rawDocs) {
        collectPaths(doc, "", dbPaths);
    }
    const onlyInDb = [...dbPaths].filter((p) => !schemaPaths.has(p) && !p.match(/\.\d+(\.|$)/) // ignora índices de array
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
            const count = rawDocs.filter((d) => d[top] !== undefined).length;
            console.log(`${field}: ${count} empresa(s)`);
        }
    }
    await mongoose_1.default.disconnect();
};
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
