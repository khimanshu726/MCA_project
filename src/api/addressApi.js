import { request } from "../lib/api";

export const getAddresses = (token) => request("/addresses", { token });

export const createAddress = (token, payload) =>
  request("/addresses", { method: "POST", body: payload, token });

export const updateAddress = (token, addressId, payload) =>
  request(`/addresses/${addressId}`, { method: "PUT", body: payload, token });

export const deleteAddress = (token, addressId) =>
  request(`/addresses/${addressId}`, { method: "DELETE", token });

export const setDefaultAddress = (token, addressId) =>
  request(`/addresses/${addressId}/default`, { method: "PATCH", token });
