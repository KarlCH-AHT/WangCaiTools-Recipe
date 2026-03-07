export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the path to the login page.
 * In the standalone version, auth is handled via /login page (email/password).
 */
export const getLoginUrl = (returnPath?: string): string => {
  const base = "/login";
  if (returnPath) return `${base}?return=${encodeURIComponent(returnPath)}`;
  return base;
};
