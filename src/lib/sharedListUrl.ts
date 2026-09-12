export function getSharedListCode() {
  return new URLSearchParams(window.location.search).get("list")?.trim().toUpperCase() ?? "";
}

export function clearSharedListUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

export function setSharedListUrl(code: string) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("list", code);
  url.hash = "";
  window.history.replaceState({}, document.title, `${url.pathname}?${url.searchParams.toString()}`);
}
