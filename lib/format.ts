// Locale pinned explicitly everywhere in the app (rather than the runtime
// default via `undefined`) for two reasons: it keeps dates/numbers reading
// identically for every visitor regardless of their browser's locale, and it
// removes a real hydration-mismatch source — `undefined` locale resolves to
// whatever ICU default the environment has, which is not guaranteed to be
// the same on the server and in the visitor's browser even for identical
// input data. en-GB over en-US: Sierra Leone is Anglophone-Commonwealth
// (DD/MM/YYYY, 24-hour clock), not US conventions.
const LOCALE = "en-GB";

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString(LOCALE);
}

export function formatDate(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleDateString(LOCALE, opts);
}

export function formatNumber(n: number): string {
  return n.toLocaleString(LOCALE);
}
