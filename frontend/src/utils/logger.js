/**
 * Small dev-only logger utility. In production builds the logging functions
 * become no-ops so we never leak debug information to end users.
 *
 * Vite replaces `import.meta.env.DEV` with a literal `false` for production
 * builds, allowing the bundler to tree-shake the console calls out entirely.
 */

const IS_DEV = (() => {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
})();

const noop = () => undefined;
const nativeConsole = typeof console !== "undefined" ? console : null;

const bind = (method) => {
  if (!IS_DEV || !nativeConsole || typeof nativeConsole[method] !== "function") {
    return noop;
  }
  return nativeConsole[method].bind(nativeConsole);
};

const devLog = bind("log");
const devWarn = bind("warn");
const devError = bind("error");

export { devLog, devWarn, devError };
