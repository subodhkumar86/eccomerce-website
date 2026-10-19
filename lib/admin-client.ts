import { csvText } from "@/lib/admin-utils";
export async function adminRequest<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, cache: "no-store", headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { window.location.assign("/admin/login"); throw new Error("Your session expired. Please sign in again."); }
  if (!response.ok) throw new Error(data.error || "The request failed. Please try again.");
  return data as T;
}
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", csvText(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
