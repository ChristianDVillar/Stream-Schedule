/**
 * For non-fatal fallbacks (localStorage, optional image in PDF, etc.).
 * Logs only in development to avoid noisy production consoles.
 * @param {string} scope - Short label for grep (e.g. "HeaderBanners.config").
 * @param {unknown} err
 */
export function devCatchLog(scope, err) {
  if (process.env.NODE_ENV !== 'development') return;
  const msg =
    err && typeof err === 'object' && err !== null && 'message' in err
      ? String(/** @type {{ message?: string }} */ (err).message)
      : String(err);
  // eslint-disable-next-line no-console -- intentional dev-only diagnostics
  console.warn(`[${scope}]`, msg);
}

/** @type {Map<string, number>} */
const throttleLastMs = new Map();

/**
 * Same as {@link devCatchLog} but at most once per `minIntervalMs` per `scope` (e.g. hot paths like JWT parse).
 */
export function devCatchLogThrottled(scope, err, minIntervalMs = 60_000) {
  if (process.env.NODE_ENV !== 'development') return;
  const now = Date.now();
  const last = throttleLastMs.get(scope) ?? 0;
  if (now - last < minIntervalMs) return;
  throttleLastMs.set(scope, now);
  devCatchLog(scope, err);
}
