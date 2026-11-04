export const SITE_URL = "https://vzbadris.ru";

export function siteUrl(path = "") {
  return `${SITE_URL}${path.startsWith("/") || path === "" ? path : `/${path}`}`;
}
