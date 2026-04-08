import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ordersFilePath = path.resolve(process.cwd(), "server", "data", "orders.json");

const ensureOrdersFile = async () => {
  await mkdir(path.dirname(ordersFilePath), { recursive: true });

  try {
    await access(ordersFilePath);
  } catch {
    await writeFile(ordersFilePath, "[]", "utf8");
  }
};

const readOrders = async () => {
  await ensureOrdersFile();
  const raw = await readFile(ordersFilePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeOrders = async (orders) => {
  await ensureOrdersFile();
  await writeFile(ordersFilePath, JSON.stringify(orders, null, 2), "utf8");
};

export const listOrders = async ({
  status,
  date,
  query,
  onlyNew = false,
  includeArchived = false,
} = {}) => {
  const orders = await readOrders();

  return orders
    .filter((order) => (includeArchived ? true : !order.archived))
    .filter((order) => (status ? order.orderStatus === status : true))
    .filter((order) => {
      if (!date) {
        return true;
      }

      return new Date(order.createdAt).toISOString().slice(0, 10) === date;
    })
    .filter((order) => (onlyNew ? order.notificationStatus === "Unread" : true))
    .filter((order) => {
      if (!query) {
        return true;
      }

      const haystack = [
        order.orderId,
        order.customerName,
        order.phone,
        order.email,
        order.productName,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query.toLowerCase());
    })
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
};

export const getOrderById = async (id) => {
  const orders = await readOrders();
  return orders.find((order) => order.id === id || order.orderId === id) ?? null;
};

export const createOrderRecord = async (order) => {
  const orders = await readOrders();
  const nextOrders = [order, ...orders];
  await writeOrders(nextOrders);
  return order;
};

export const updateOrderRecord = async (id, updater) => {
  const orders = await readOrders();
  const index = orders.findIndex((order) => order.id === id || order.orderId === id);

  if (index === -1) {
    return null;
  }

  const currentOrder = orders[index];
  const nextOrder = typeof updater === "function" ? updater(currentOrder) : { ...currentOrder, ...updater };
  orders[index] = nextOrder;
  await writeOrders(orders);
  return nextOrder;
};

export const deleteOrderRecord = async (id) => {
  const orders = await readOrders();
  const nextOrders = orders.filter((order) => order.id !== id && order.orderId !== id);

  if (nextOrders.length === orders.length) {
    return false;
  }

  await writeOrders(nextOrders);
  return true;
};
