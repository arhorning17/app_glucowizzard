export function formatTimeLocal(ms: number): string {
    if (!Number.isFinite(ms)) return "";
    const d = new Date(ms);
    // Example: 2026-02-05 13:14:31
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }
  
  export function formatTimeISO(ms: number): string {
    if (!Number.isFinite(ms)) return "";
    return new Date(ms).toISOString();
  }
  