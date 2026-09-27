/** Only removes this application's old browser entries; never clears another app's storage. */
export function clearLegacyStorage() {
  try {
    for (const key of [
      "ddp-admin-theme",
      "ddp-admin-zoom",
      "ddp-public-zoom",
      "ddp-tratamentos-view",
      "ddp_mysql_chat",
    ]) {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* The browser may disable storage entirely. */
  }
}
