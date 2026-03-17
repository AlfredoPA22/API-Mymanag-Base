/**
 * Migration: Split LIST_AND_CREATE_* permissions into LIST_* + CREATE_*
 *
 * Run once: node scripts/migrate-split-permissions.js
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

// Mapping: old permission → [new permissions that replace it]
const SPLITS = {
  LIST_AND_CREATE_BRAND: ["LIST_BRAND", "CREATE_BRAND"],
  LIST_AND_CREATE_CATEGORY: ["LIST_CATEGORY", "CREATE_CATEGORY"],
  LIST_AND_CREATE_CLIENT: ["LIST_CLIENT", "CREATE_CLIENT"],
  LIST_AND_CREATE_WAREHOUSE: ["LIST_WAREHOUSE", "CREATE_WAREHOUSE"],
  LIST_AND_CREATE_PRODUCT: ["LIST_PRODUCT", "CREATE_PRODUCT"],
  LIST_AND_CREATE_PROVIDER: ["LIST_PROVIDER", "CREATE_PROVIDER"],
  LIST_AND_CREATE_PURCHASE: ["LIST_PURCHASE", "CREATE_PURCHASE"],
  LIST_AND_CREATE_SALE: ["LIST_SALE", "CREATE_SALE"],
  LIST_AND_CREATE_PAYMENT: ["LIST_PAYMENT", "CREATE_PAYMENT"],
  LIST_AND_CREATE_TRANSFER: ["LIST_TRANSFER", "CREATE_TRANSFER"],
};

const OLD_PERMISSIONS = Object.keys(SPLITS);

async function migrate() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const roles = db.collection("roles");

    // Find all roles that have at least one of the old permissions
    const affectedRoles = await roles
      .find({ permissions: { $in: OLD_PERMISSIONS } })
      .toArray();

    console.log(`Found ${affectedRoles.length} role(s) to migrate`);

    let totalUpdated = 0;

    for (const role of affectedRoles) {
      const oldPerms = role.permissions;
      const newPerms = [];

      for (const perm of oldPerms) {
        if (SPLITS[perm]) {
          // Replace old permission with the two split ones
          newPerms.push(...SPLITS[perm]);
        } else {
          newPerms.push(perm);
        }
      }

      // Remove duplicates (in case role somehow had both old and new)
      const dedupedPerms = [...new Set(newPerms)];

      await roles.updateOne(
        { _id: role._id },
        { $set: { permissions: dedupedPerms } }
      );

      const replaced = oldPerms.filter((p) => SPLITS[p]);
      console.log(`  Role "${role.name}" (${role._id}): replaced [${replaced.join(", ")}]`);
      totalUpdated++;
    }

    console.log(`\nMigration complete. ${totalUpdated} role(s) updated.`);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrate();
