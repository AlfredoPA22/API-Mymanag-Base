/**
 * Carga un catálogo de demostración (periféricos y tecnología) para una
 * empresa, usando las funciones reales del backend (no inserts directos a
 * Mongo) para que inventario, seriales y stock queden consistentes con lo
 * que produciría el flujo normal de la app: crear producto → crear compra →
 * agregar detalle (crea ProductInventory) → asignar seriales (si aplica) →
 * aprobar compra (incrementa stock, marca inventario/seriales disponibles).
 *
 * Requiere que la empresa ya tenga al menos un usuario (se usa como
 * `created_by` de las compras) y que sus datos operativos ya estén vacíos
 * (correr wipeCompanyData.ts antes si hace falta).
 *
 * Ejecutar con:
 *   npx ts-node scripts/seedTechStoreDemo.ts <companyId>
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

import { create as createCategory } from "../src/modules/category/category.service";
import { create as createBrand } from "../src/modules/brand/brand.service";
import { create as createWarehouse } from "../src/modules/warehouse/warehouse.service";
import { create as createProvider } from "../src/modules/provider/provider.service";
import { createProduct } from "../src/modules/product/product.service";
import {
  create as createPurchaseOrder,
  createDetail as createPurchaseOrderDetail,
  addManySerialsToOrder,
  approve as approvePurchaseOrder,
} from "../src/modules/purchase_order/purchaseOrder.service";
import { Company } from "../src/modules/company/company.model";
import { User } from "../src/modules/user/user.model";
import { stockType } from "../src/utils/enums/stockType.enum";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mymanag";

const COMPANY_ID = process.argv[2] || "69585cd84ebfe266170e95c8";

const img = (photoId: string) =>
  `https://images.unsplash.com/photo-${photoId}?w=1000&q=80&auto=format&fit=crop`;

const IMG = {
  mouse1: img("1615663245857-ac93bb7c39e7"),
  mouse2: img("1605773527852-c546a8584ea3"),
  keyboard1: img("1618384887929-16ec33fab9ef"),
  keyboard2: img("1547394765-185e1e68f34e"),
  headset: img("1610041321327-b794c052db27"),
  monitor: img("1547658718-1cdaa0852790"),
  laptop: img("1630794180018-433d915c34ac"),
  storage: img("1601737487795-dab272f52420"),
  router: img("1606904825846-647eb07f5be2"),
  motherboard: img("1597138804456-e7dca7f59d54"),
  webcam: img("1726127461372-547b9ffa4236"),
};

interface SeedProduct {
  code: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  stockType: stockType;
  sale_price: number;
  cost: number;
  min_stock: number;
  max_stock: number;
  image: string;
  qty: number;
  providerIndex: 0 | 1;
}

const CATEGORIES = [
  { key: "perifericos", name: "Periféricos", description: "Mouse, teclados, audífonos y accesorios de escritorio" },
  { key: "monitores", name: "Monitores", description: "Monitores gaming y de oficina" },
  { key: "laptops", name: "Laptops", description: "Laptops gaming y de uso general" },
  { key: "almacenamiento", name: "Almacenamiento", description: "Discos SSD, HDD y almacenamiento externo" },
  { key: "redes", name: "Redes y Conectividad", description: "Routers, adaptadores y equipos de red" },
  { key: "componentes", name: "Componentes PC", description: "Memoria RAM, fuentes de poder y componentes internos" },
];

const BRANDS = [
  { key: "logitech", name: "Logitech", description: "Periféricos y accesorios" },
  { key: "redragon", name: "Redragon", description: "Periféricos gaming" },
  { key: "hyperx", name: "HyperX", description: "Periféricos y accesorios gaming" },
  { key: "asus", name: "ASUS", description: "Laptops, monitores y componentes" },
  { key: "hp", name: "HP", description: "Laptops y equipos de cómputo" },
  { key: "dell", name: "Dell", description: "Laptops y equipos de cómputo" },
  { key: "samsung", name: "Samsung", description: "Monitores y almacenamiento" },
  { key: "kingston", name: "Kingston", description: "Memorias y almacenamiento" },
  { key: "tplink", name: "TP-Link", description: "Redes y conectividad" },
  { key: "corsair", name: "Corsair", description: "Componentes y accesorios gaming" },
];

const PROVIDERS = [
  { name: "TecnoImport Bolivia SRL", address: "Av. Circunvalación 123, Santa Cruz de la Sierra", phoneNumber: "77712345" },
  { name: "Distribuidora Andina Tech", address: "Calle Comercio 456, La Paz", phoneNumber: "77798765" },
];

const PRODUCTS: SeedProduct[] = [
  // Periféricos
  {
    code: "G502-HERO", name: "Mouse Logitech G502 HERO",
    description: "Mouse gaming con sensor HERO 25K de hasta 25,600 DPI, 11 botones programables, sistema de pesas ajustables y RGB LIGHTSYNC. Cable trenzado, sensor de precisión sin aceleración.",
    category: "perifericos", brand: "logitech", stockType: stockType.INDIVIDUAL,
    sale_price: 45.9, cost: 32, min_stock: 5, max_stock: 40, image: IMG.mouse1, qty: 25, providerIndex: 0,
  },
  {
    code: "M711-COBRA", name: "Mouse Redragon M711 Cobra",
    description: "Mouse gaming con sensor óptico de 16,000 DPI, iluminación RGB de 16.8 millones de colores, 7 botones programables y memoria integrada para 5 perfiles.",
    category: "perifericos", brand: "redragon", stockType: stockType.INDIVIDUAL,
    sale_price: 22.5, cost: 14, min_stock: 8, max_stock: 50, image: IMG.mouse2, qty: 30, providerIndex: 0,
  },
  {
    code: "K552-KUMARA", name: "Teclado Mecánico Redragon K552 Kumara",
    description: "Teclado mecánico compacto (87 teclas) con switches azules, retroiluminación RGB, estructura de aleación de zinc resistente a derrames y anti-ghosting en teclas de uso frecuente.",
    category: "perifericos", brand: "redragon", stockType: stockType.INDIVIDUAL,
    sale_price: 38, cost: 25, min_stock: 5, max_stock: 30, image: IMG.keyboard1, qty: 20, providerIndex: 0,
  },
  {
    code: "HX-ALLOY-CORE", name: "Teclado HyperX Alloy Origins Core",
    description: "Teclado mecánico con switches HyperX Aqua táctiles, carcasa de aluminio de grado aeronáutico, retroiluminación RGB dinámica y software HyperX NGENUITY.",
    category: "perifericos", brand: "hyperx", stockType: stockType.INDIVIDUAL,
    sale_price: 65, cost: 46, min_stock: 4, max_stock: 20, image: IMG.keyboard2, qty: 15, providerIndex: 1,
  },
  {
    code: "HX-CLOUD-STINGER2", name: "Audífonos HyperX Cloud Stinger 2",
    description: "Audífonos gaming con sonido envolvente DTS Headphone:X, drivers de 50mm, diadema ajustable con giro de 90°, micrófono con cancelación de ruido y control de volumen en la oreja.",
    category: "perifericos", brand: "hyperx", stockType: stockType.INDIVIDUAL,
    sale_price: 42, cost: 29, min_stock: 5, max_stock: 30, image: IMG.headset, qty: 20, providerIndex: 1,
  },
  {
    code: "G435", name: "Audífonos Logitech G435 Lightspeed",
    description: "Audífonos inalámbricos ultraligeros (161g) con conexión LIGHTSPEED y Bluetooth simultáneos, hasta 18 horas de batería y micrófonos duales con reducción de ruido.",
    category: "perifericos", brand: "logitech", stockType: stockType.INDIVIDUAL,
    sale_price: 55, cost: 38, min_stock: 4, max_stock: 25, image: IMG.headset, qty: 18, providerIndex: 0,
  },
  {
    code: "FLICK-M", name: "Mousepad Redragon Flick M",
    description: "Mousepad de tela fina de 320 x 270 x 3 mm, base de goma antideslizante, superficie optimizada para control y velocidad, bordes cosidos anti-deshilache.",
    category: "perifericos", brand: "redragon", stockType: stockType.INDIVIDUAL,
    sale_price: 6.5, cost: 3.8, min_stock: 15, max_stock: 60, image: IMG.mouse1, qty: 40, providerIndex: 0,
  },
  {
    code: "C920-PRO", name: "Webcam Logitech C920 Pro HD",
    description: "Webcam Full HD 1080p a 30fps, enfoque automático, corrección de luz HDR, dos micrófonos estéreo integrados y clip universal para monitores o laptops.",
    category: "perifericos", brand: "logitech", stockType: stockType.INDIVIDUAL,
    sale_price: 55, cost: 40, min_stock: 4, max_stock: 25, image: IMG.webcam, qty: 20, providerIndex: 1,
  },

  // Monitores (serializados)
  {
    code: "VA24EHF", name: "Monitor ASUS VA24EHF 24\" FHD IPS 100Hz",
    description: "Monitor de 23.8\" Full HD (1920x1080), panel IPS, 100Hz, Adaptive-Sync, 1ms MPRT, Low Blue Light y Flicker Free. Entradas HDMI y VGA. Diseño sin bordes.",
    category: "monitores", brand: "asus", stockType: stockType.SERIALIZADO,
    sale_price: 135, cost: 98, min_stock: 2, max_stock: 12, image: IMG.monitor, qty: 6, providerIndex: 0,
  },
  {
    code: "VG249Q5A", name: "Monitor ASUS TUF Gaming VG249Q5A 23.8\" 200Hz",
    description: "Monitor gaming Fast-IPS de 23.8\" Full HD, 200Hz, 0.3ms (GTG), Extreme Low Motion Blur, FreeSync Premium y compatibilidad G-SYNC. Ideal para esports.",
    category: "monitores", brand: "asus", stockType: stockType.SERIALIZADO,
    sale_price: 178, cost: 132, min_stock: 2, max_stock: 10, image: IMG.monitor, qty: 5, providerIndex: 0,
  },
  {
    code: "ODYSSEY-G5-27", name: "Monitor Samsung Odyssey G5 27\" QHD 165Hz Curvo",
    description: "Monitor curvo (1000R) de 27\" QHD (2560x1440), panel VA, 165Hz, 1ms (MPRT), FreeSync Premium y HDR10. Diseño Core Sync con iluminación ambiental trasera.",
    category: "monitores", brand: "samsung", stockType: stockType.SERIALIZADO,
    sale_price: 245, cost: 190, min_stock: 1, max_stock: 8, image: IMG.monitor, qty: 4, providerIndex: 1,
  },

  // Laptops (serializados)
  {
    code: "HP-VICTUS15", name: "Laptop HP Victus 15 Gaming (i5, RTX 3050, 16GB, 512GB SSD)",
    description: "Intel Core i5-12450H, NVIDIA GeForce RTX 3050 4GB, 16GB RAM DDR4, SSD NVMe 512GB, pantalla de 15.6\" FHD 144Hz, teclado retroiluminado, Windows 11.",
    category: "laptops", brand: "hp", stockType: stockType.SERIALIZADO,
    sale_price: 899, cost: 720, min_stock: 1, max_stock: 8, image: IMG.laptop, qty: 4, providerIndex: 1,
  },
  {
    code: "TUF-F15", name: "Laptop ASUS TUF Gaming F15 (i7, RTX 4050, 16GB, 512GB SSD)",
    description: "Intel Core i7-13620H, NVIDIA GeForce RTX 4050 6GB, 16GB RAM DDR5, SSD NVMe 512GB, pantalla de 15.6\" FHD 144Hz, chasis con certificación militar MIL-STD-810H.",
    category: "laptops", brand: "asus", stockType: stockType.SERIALIZADO,
    sale_price: 950, cost: 780, min_stock: 1, max_stock: 6, image: IMG.laptop, qty: 3, providerIndex: 0,
  },
  {
    code: "DELL-INSP15", name: "Laptop Dell Inspiron 15 3000 (i5, 8GB, 256GB SSD)",
    description: "Intel Core i5-1235U, 8GB RAM DDR4, SSD NVMe 256GB, pantalla de 15.6\" FHD, gráficos Intel Iris Xe, ideal para trabajo y estudio. Windows 11.",
    category: "laptops", brand: "dell", stockType: stockType.SERIALIZADO,
    sale_price: 520, cost: 410, min_stock: 2, max_stock: 10, image: IMG.laptop, qty: 5, providerIndex: 1,
  },

  // Almacenamiento
  {
    code: "NV2-1TB", name: "SSD Kingston NV2 1TB NVMe M.2",
    description: "Unidad de estado sólido NVMe PCIe 4.0 de 1TB, velocidades de lectura hasta 3,500 MB/s, formato M.2 2280, compatible con laptops y PC de escritorio.",
    category: "almacenamiento", brand: "kingston", stockType: stockType.INDIVIDUAL,
    sale_price: 58, cost: 42, min_stock: 8, max_stock: 45, image: IMG.storage, qty: 35, providerIndex: 0,
  },
  {
    code: "870EVO-500", name: "SSD Samsung 870 EVO 500GB SATA",
    description: "Unidad de estado sólido SATA III de 500GB, velocidad de lectura hasta 560 MB/s, formato 2.5\", tecnología V-NAND, ideal para actualizar laptops y PCs.",
    category: "almacenamiento", brand: "samsung", stockType: stockType.INDIVIDUAL,
    sale_price: 45, cost: 33, min_stock: 6, max_stock: 35, image: IMG.storage, qty: 25, providerIndex: 1,
  },
  {
    code: "HDD-EXT-2TB", name: "Disco Duro Externo Kingston 2TB USB 3.2",
    description: "Disco duro externo portátil de 2TB, conexión USB 3.2 Gen 1, compatible con Windows y Mac, incluye software de respaldo automático.",
    category: "almacenamiento", brand: "kingston", stockType: stockType.INDIVIDUAL,
    sale_price: 72, cost: 55, min_stock: 5, max_stock: 30, image: IMG.storage, qty: 20, providerIndex: 0,
  },

  // Redes y conectividad
  {
    code: "ARCHER-C6", name: "Router TP-Link Archer C6 AC1200 Doble Banda",
    description: "Router inalámbrico AC1200 de doble banda (300 Mbps en 2.4GHz + 867 Mbps en 5GHz), 4 antenas externas, 4 puertos LAN Gigabit, tecnología MU-MIMO y beamforming.",
    category: "redes", brand: "tplink", stockType: stockType.INDIVIDUAL,
    sale_price: 38, cost: 27, min_stock: 6, max_stock: 30, image: IMG.router, qty: 22, providerIndex: 1,
  },
  {
    code: "DECO-M4-2PK", name: "Sistema Mesh WiFi TP-Link Deco M4 (Pack de 2)",
    description: "Sistema WiFi mesh AC1200 de doble banda, cobertura de hasta 260 m² con 2 unidades, roaming sin interrupciones, control parental y red de invitados vía app.",
    category: "redes", brand: "tplink", stockType: stockType.INDIVIDUAL,
    sale_price: 89, cost: 68, min_stock: 3, max_stock: 20, image: IMG.router, qty: 15, providerIndex: 1,
  },
  {
    code: "ARCHER-T2U", name: "Adaptador USB WiFi TP-Link Archer T2U AC600",
    description: "Adaptador USB inalámbrico AC600 de doble banda, diseño compacto, antena de alta ganancia, compatible con Windows, ideal para dar WiFi a PCs de escritorio.",
    category: "redes", brand: "tplink", stockType: stockType.INDIVIDUAL,
    sale_price: 14.5, cost: 9, min_stock: 10, max_stock: 45, image: IMG.router, qty: 30, providerIndex: 0,
  },

  // Componentes PC
  {
    code: "VENGEANCE-16GB", name: "Memoria RAM Corsair Vengeance LPX 16GB DDR4 3200MHz",
    description: "Kit de memoria RAM DDR4 de 16GB (2x8GB) a 3200MHz, disipador de aluminio de perfil bajo, compatible con placas Intel y AMD, alta compatibilidad garantizada.",
    category: "componentes", brand: "corsair", stockType: stockType.INDIVIDUAL,
    sale_price: 42, cost: 30, min_stock: 8, max_stock: 50, image: IMG.motherboard, qty: 40, providerIndex: 0,
  },
  {
    code: "CV550", name: "Fuente de Poder Corsair CV550 550W 80+ Bronze",
    description: "Fuente de poder de 550W con certificación 80 PLUS Bronze, ventilador de 120mm de bajo ruido, protecciones OCP/OVP/SCP/OPP, cableado no modular.",
    category: "componentes", brand: "corsair", stockType: stockType.INDIVIDUAL,
    sale_price: 48, cost: 35, min_stock: 5, max_stock: 25, image: IMG.motherboard, qty: 18, providerIndex: 1,
  },
];

const randomSerial = (code: string, i: number) => {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SN-${code}-${String(i + 1).padStart(3, "0")}-${rand}`;
};

async function run() {
  await mongoose.connect(MONGODB_URI);
  const companyId = new mongoose.Types.ObjectId(COMPANY_ID);

  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");
  console.log(`Empresa: ${(company as any).name}\n`);

  const user = await User.findOne({ company: companyId }).lean();
  if (!user) throw new Error("La empresa no tiene usuarios — no se puede asignar created_by de las compras");
  const userId = user._id;

  // 1. Almacén
  console.log("Creando almacén...");
  const warehouse = await createWarehouse(companyId, {
    name: "Almacén Principal",
    description: "Almacén principal de la tienda",
  });

  // 2. Proveedores
  console.log("Creando proveedores...");
  const providers = [];
  for (const p of PROVIDERS) {
    providers.push(await createProvider(companyId, p));
  }

  // 3. Categorías
  console.log("Creando categorías...");
  const categoryMap = new Map<string, any>();
  for (const c of CATEGORIES) {
    const created = await createCategory(companyId, { name: c.name, description: c.description });
    categoryMap.set(c.key, created);
  }

  // 4. Marcas
  console.log("Creando marcas...");
  const brandMap = new Map<string, any>();
  for (const b of BRANDS) {
    const created = await createBrand(companyId, { name: b.name, description: b.description });
    brandMap.set(b.key, created);
  }

  // 5. Productos
  console.log("Creando productos...");
  const createdProducts: Array<SeedProduct & { _id: any }> = [];
  for (const p of PRODUCTS) {
    const category = categoryMap.get(p.category);
    const brand = brandMap.get(p.brand);
    const created = await createProduct(companyId, {
      code: p.code,
      name: p.name,
      description: p.description,
      image: p.image,
      images: [p.image],
      show_in_store: true,
      sale_price: p.sale_price,
      category: category._id,
      brand: brand._id,
      stock_type: p.stockType,
      min_stock: p.min_stock,
      max_stock: p.max_stock,
    });
    createdProducts.push({ ...p, _id: created._id });
  }

  // 6. Compras (una por proveedor) con sus detalles
  console.log("Creando órdenes de compra...");
  const purchaseOrderIds: any[] = [];
  for (let providerIndex = 0 as 0 | 1; providerIndex <= 1; providerIndex = (providerIndex + 1) as 0 | 1) {
    const productsForThisOrder = createdProducts.filter((p) => p.providerIndex === providerIndex);
    if (productsForThisOrder.length === 0) continue;

    const po = await createPurchaseOrder(companyId, userId, {
      date: new Date(),
      provider: providers[providerIndex]._id.toString(),
    });

    for (const p of productsForThisOrder) {
      const detail = await createPurchaseOrderDetail(companyId, {
        purchase_order: po._id,
        product: p._id,
        purchase_price: p.cost,
        quantity: p.qty,
        warehouse: p.stockType === stockType.INDIVIDUAL ? warehouse._id : undefined,
      });

      if (p.stockType === stockType.SERIALIZADO) {
        const serials = Array.from({ length: p.qty }, (_, i) => randomSerial(p.code, i));
        await addManySerialsToOrder(companyId, {
          purchase_order_detail: (detail as any)._id,
          warehouse: warehouse._id,
          serials,
        });
      }
    }

    purchaseOrderIds.push(po._id);
    console.log(`  Compra ${(po as any).code} creada con ${productsForThisOrder.length} producto(s)`);
  }

  // 7. Aprobar las compras (esto sube el stock, marca inventario/seriales disponibles)
  console.log("Aprobando órdenes de compra...");
  for (const poId of purchaseOrderIds) {
    await approvePurchaseOrder(companyId, poId);
  }

  // 8. Activar la tienda
  console.log("Activando la tienda...");
  await Company.updateOne({ _id: companyId }, { $set: { store_enabled: true } });

  console.log("\n✅ Listo. Resumen:");
  console.log(`  Categorías: ${CATEGORIES.length}`);
  console.log(`  Marcas: ${BRANDS.length}`);
  console.log(`  Proveedores: ${PROVIDERS.length}`);
  console.log(`  Productos: ${PRODUCTS.length}`);
  console.log(`  Órdenes de compra aprobadas: ${purchaseOrderIds.length}`);
  console.log(`  store_enabled: true`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
