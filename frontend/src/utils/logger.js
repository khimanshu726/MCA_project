/**
 * Small dev-only logger utility. In production builds these become no-ops so
 * we never leak debug information to end users.
 */

const isDevEnvironment = () => {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
};

const forwardIfDev = (method, args) => {
  if (!isDevEnvironment()) return;
  console[method](...args);
};

export const devLog = (...args) => forwardIfDev("log", args);
export const devWarn = (...args) => forwardIfDev("warn", args);
export const devError = (...args) => forwardIfDev("error", args);
