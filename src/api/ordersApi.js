import { request } from "../lib/api";

export const getCustomerOrders = (token) => request("/orders/customer", { token });

export const getCustomerOrder = (orderId, token) => request(`/orders/customer/${orderId}`, { token });

export const cancelCustomerOrder = (orderId, token) =>
  request(`/orders/customer/${orderId}/cancel`, { method: "POST", token });

export const returnCustomerOrder = (orderId, token) =>
  request(`/orders/customer/${orderId}/return`, { method: "POST", token });
