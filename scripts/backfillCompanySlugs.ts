/**
 * Backfill de `slug` para companies que no lo tienen.
 *
 * Solo escribe el campo `slug` (nunca toca ningún otro campo) en companies
 * donde `slug` no existe, es null o es cadena vacía. No modifica companies
 * que ya tienen slug. Usa la misma lógica de generación que
 * `company.service.ts` (generateSlug/generateUniqueSlug).
 *
 * Por defecto corre en modo DRY RUN (no escribe nada, solo muestra qué haría).
 *
 * Ejecutar:
 *   npx ts-node scripts/backfillCompanySlugs.ts            (dry run, solo lectura)
 *   npx ts-node scripts/backfillCompanySlugs.ts --apply     (aplica los cambios)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mymanag";
const APPLY = process.argv.includes("--apply");

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String },
    slug: { type: String },
  },
  { strict: false }
);
const Company = mongoose.model("company", CompanySchema);

const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);

const generateUniqueSlug = async (name: string): Promise<string> => {
  const base = generateSlug(name) || "empresa";
  let slug = base;
  let counter = 1;
  while (await Company.findOne({ slug })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
};

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Conectado a MongoDB${APPLY ? "" : " (DRY RUN — no se escribirá nada)"}\n`);

  const missingSlug = await Company.find({
    $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
  }).lean();

  console.log(`Companies sin slug: ${missingSlug.length}\n`);

  if (missingSlug.length === 0) {
    console.log("Nada que hacer.\n");
    await mongoose.disconnect();
    return;
  }

  for (const company of missingSlug as any[]) {
    const slug = await generateUniqueSlug(company.name || "empresa");
    console.log(`  ${company._id}  "${company.name}"  →  slug: "${slug}"`);

    if (APPLY) {
      await Company.updateOne({ _id: company._id }, { $set: { slug } });
    }
  }

  console.log(
    APPLY
      ? "\nListo. Se asignó slug a todas las companies listadas arriba."
      : "\nDry run completo. Ejecuta con --apply para escribir estos slugs."
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
