const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 5003;

const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use(express.static(__dirname));

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function ensureFile(filePath) {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]", "utf8");
}

function readJson(filePath) {
  ensureFile(filePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeJson(filePath, data) {
  ensureFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function parseList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((v) => String(v || "").trim()).filter(Boolean))];
  }
  const text = String(value || "").trim();
  if (!text) return [];
  return [...new Set(text.split(",").map((v) => v.trim()).filter(Boolean))];
}

function collectUploadedPaths(files) {
  if (!files) return [];
  const list = [];
  const allowed = new Set(["imageFile", "imageFiles", "images"]);

  if (Array.isArray(files)) {
    files.forEach((f) => {
      if (f && f.filename && allowed.has(String(f.fieldname || ""))) {
        list.push(`uploads/${f.filename}`);
      }
    });
    return list;
  }

  Object.keys(files).forEach((key) => {
    const group = files[key];
    if (!allowed.has(String(key || ""))) return;
    if (!Array.isArray(group)) return;
    group.forEach((f) => {
      if (f && f.filename) list.push(`uploads/${f.filename}`);
    });
  });

  return list;
}

function getProductImages(product) {
  const images = Array.isArray(product.images) ? [...new Set(product.images.filter(Boolean))] : [];
  if (images.length) return images;
  return product.image ? [product.image] : [];
}

function deleteUploadFiles(paths) {
  paths.forEach((img) => {
    if (!String(img).startsWith("uploads/")) return;
    const filePath = path.join(__dirname, img);
    if (!fs.existsSync(filePath)) return;
    try {
      fs.unlinkSync(filePath);
    } catch {}
  });
}

ensureDir(UPLOADS_DIR);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `prd_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({ storage });
const productUpload = upload.any();

function normalizeProduct(body, uploadedFiles) {
  const existingImages = parseList(body.existingImages || body.existingImage);
  const uploadedPaths = collectUploadedPaths(uploadedFiles);
  // Keep newly uploaded images first so home/shop immediately reflect updates.
  const images = [...new Set([...uploadedPaths, ...existingImages].filter(Boolean))];

  return {
    id: body.id || `prd_${Date.now()}`,
    name: String(body.name || "").trim(),
    price: Number(body.price || 0),
    oldPrice: Number(body.oldPrice || 0),
    category: String(body.category || "").trim(),
    desc: String(body.desc || "").trim(),
    image: images[0] || "",
    images,
    sizes: String(body.sizes || "").trim(),
    colors: String(body.colors || "").trim(),
    createdAt: body.createdAt || new Date().toISOString(),
  };
}

app.get("/api/products", (req, res) => {
  const products = readJson(PRODUCTS_FILE);
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const products = readJson(PRODUCTS_FILE);
  const product = products.find((p) => String(p.id) === String(req.params.id));

  if (!product) {
    return res.status(404).json({ message: "Mahsulot topilmadi" });
  }

  res.json(product);
});

app.post("/api/products", productUpload, (req, res) => {
  const products = readJson(PRODUCTS_FILE);
  const product = normalizeProduct(req.body, req.files);

  if (!product.name || !product.category || !product.desc || !product.images.length || !product.price) {
    return res.status(400).json({ message: "Majburiy maydonlar toldirilmagan" });
  }

  products.unshift(product);
  writeJson(PRODUCTS_FILE, products);

  res.json({ success: true, product });
});

app.put("/api/products/:id", productUpload, (req, res) => {
  const products = readJson(PRODUCTS_FILE);
  const index = products.findIndex((p) => String(p.id) === String(req.params.id));

  if (index === -1) {
    return res.status(404).json({ message: "Mahsulot topilmadi" });
  }

  const current = products[index];
  const currentImages = getProductImages(current);
  const uploadedPaths = collectUploadedPaths(req.files);
  const requestedExisting = parseList(req.body.existingImages || req.body.existingImage);
  const updated = normalizeProduct(
    {
      ...current,
      ...req.body,
      id: current.id,
      createdAt: current.createdAt,
      // Respect client-side per-image removals; if new files are uploaded, replace with new set.
      existingImages: uploadedPaths.length
        ? ""
        : (requestedExisting.length ? requestedExisting.join(",") : currentImages.join(",")),
    },
    req.files
  );

  // Remove files that are no longer referenced after update.
  const removedImages = currentImages.filter((img) => !updated.images.includes(img));
  deleteUploadFiles(removedImages);

  products[index] = updated;
  writeJson(PRODUCTS_FILE, products);

  res.json({ success: true, product: updated });
});

app.delete("/api/products/:id", (req, res) => {
  const products = readJson(PRODUCTS_FILE);
  const target = products.find((p) => String(p.id) === String(req.params.id));

  const imagePaths = target ? getProductImages(target) : [];
  deleteUploadFiles(imagePaths);

  const filtered = products.filter((p) => String(p.id) !== String(req.params.id));
  writeJson(PRODUCTS_FILE, filtered);

  res.json({ success: true });
});

app.get("/api/orders", (req, res) => {
  const orders = readJson(ORDERS_FILE);
  res.json(orders);
});

const orderUpload = upload.single("paymentScreenshot");

app.post("/api/orders", orderUpload, (req, res) => {
  const orders = readJson(ORDERS_FILE);
  const paymentType = String(req.body.paymentType || "naqd").trim().toLowerCase();

  let parsedItems = [];
  const parseItemsField = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const decoded = JSON.parse(value);
        return Array.isArray(decoded) ? decoded : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  parsedItems = parseItemsField(req.body.items);
  if (!parsedItems.length) parsedItems = parseItemsField(req.body.itemsJson);

  // Fallback for bracket-style multipart fields: items[0][productId], items[0][qty], ...
  if (!parsedItems.length && req.body && typeof req.body === "object") {
    const map = {};
    Object.keys(req.body).forEach((key) => {
      const m = key.match(/^items\[(\d+)\]\[(\w+)\]$/);
      if (!m) return;
      const idx = Number(m[1]);
      const field = m[2];
      if (!map[idx]) map[idx] = {};
      map[idx][field] = req.body[key];
    });
    parsedItems = Object.keys(map)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => map[k]);
  }

  const order = {
    id: `ord_${Date.now()}`,
    name: String(req.body.name || "").trim(),
    phone: String(req.body.phone || "").trim(),
    address: String(req.body.address || "").trim(),
    note: String(req.body.note || "").trim(),
    total: Number(req.body.total || 0),
    items: parsedItems,
    paymentType: paymentType === "karta" ? "karta" : "naqd",
    paymentScreenshot: req.file ? `uploads/${req.file.filename}` : "",
    createdAt: new Date().toISOString(),
  };

  if (order.paymentType === "karta" && !order.paymentScreenshot) {
    return res.status(400).json({ message: "Karta to'lovi uchun skrinshot majburiy" });
  }

  if (!order.name || !order.phone || !order.address || !order.items.length) {
    return res.status(400).json({ message: "Buyurtma uchun malumot yetarli emas" });
  }

  orders.unshift(order);
  writeJson(ORDERS_FILE, orders);

  res.json({ success: true, order });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


