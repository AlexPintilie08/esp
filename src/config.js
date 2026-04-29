export const DEFAULT_BACKEND_IP = "192.168.0.113:4000";

export function buildApiBase(ipOrUrl = DEFAULT_BACKEND_IP) {
  const raw = String(ipOrUrl || "").trim();

  if (!raw) {
    return `http://${DEFAULT_BACKEND_IP}`;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }

  return `http://${raw.replace(/\/+$/, "")}`;
}