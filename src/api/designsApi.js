import { request } from "../lib/api";

export const getDesigns = (token) => request("/designs", { token });

export const getDesignById = (token, designId) => request(`/designs/${encodeURIComponent(designId)}`, { token });

export const createDesignRemote = (token, payload) => request("/designs", { method: "POST", body: payload, token });

export const updateDesignRemote = (token, designId, payload) =>
  request(`/designs/${encodeURIComponent(designId)}`, { method: "PUT", body: payload, token });

export const duplicateDesignRemote = (token, designId) =>
  request(`/designs/${encodeURIComponent(designId)}/duplicate`, { method: "POST", token });

export const deleteDesignRemote = (token, designId) =>
  request(`/designs/${encodeURIComponent(designId)}`, { method: "DELETE", token });

export const uploadDesignAssetRemote = (token, file) => {
  const formData = new FormData();
  formData.append("asset", file);
  return request("/designs/assets", { method: "POST", body: formData, token });
};
