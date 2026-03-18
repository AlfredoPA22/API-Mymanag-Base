/**
 * Migration: Set contado_payment_method = "Efectivo" for existing Contado sale orders
 *
 * Run once: node scripts/migrate-contado-payment-method.js
 *
 * Requires MONGODB_URI in .env (or set it in the environment before running).
 */

require("dotenv").config();
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in environment");
  process.exit(1);
}

async function migrate() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const saleOrders = db.collection("sale_orders");

    // Find Contado orders without contado_payment_method
    const result = await saleOrders.updateMany(
      {
        payment_method: "Contado",
        contado_payment_method: { $exists: false },
      },
      {
        $set: { contado_payment_method: "Efectivo" },
      }
    );

    console.log(`Migration complete. ${result.modifiedCount} order(s) updated with contado_payment_method = "Efectivo".`);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrate();
