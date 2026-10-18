const entities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '\"': "&quot;",
  "'": "&#39;",
};
/** Escape text and quoted attributes before interpolating into our DOM templates. */
export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => entities[character]);
