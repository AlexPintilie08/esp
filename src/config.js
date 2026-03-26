export const DEFAULT_BACKEND_IP = "192.168.0.121";
export const DEFAULT_BACKEND_PORT = "4000";

export function buildApiBase(ip = DEFAULT_BACKEND_IP, port = DEFAULT_BACKEND_PORT) {
  return `http://${ip}:${port}`;
}