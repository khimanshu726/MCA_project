import crypto from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const productsFilePath = path.resolve(process.cwd(), "server", "data", "products.json");

const ensureProductsFile = async () => {
  await mkdir(path.dirname(productsFilePath), { recursive: true });

  try {
    await access(productsFilePath);
  } catch {
    await writeFile(productsFilePath, "[]", "utf8");
  }
};

const readProducts = async () => {
  await ensureProductsFile();
  const rawValue = await readFile(productsFilePath, "utf8");

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const writeProducts = async (products) => {
  await ensureProductsFile();
  await writeFile(productsFilePath, JSON.stringify(products, null, 2), "utf8");
};

export const createProductRecord = async (payload) => {
  const products = await readProducts();
  const nextProduct = {
    id: crypto.randomUUID(),
    name: payload.name.trim(),
    description: payload.description.trim(),
    category: payload.category.trim(),
    imageUrl: payload.imageUrl.trim(),
    basePrice: Number(payload.basePrice),
    status: payload.status || "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  products.unshift(nextProduct);
  await writeProducts(products);
  return nextProduct;
};
