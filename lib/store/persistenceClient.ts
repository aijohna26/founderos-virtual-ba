"use client";

export type PersistenceResource = "ventures" | "commitments" | "learnings" | "memories" | "documents" | "operations";

export class PersistenceClient {
  private static userScope = "signed-out";

  static setUserScope(userId: string | null | undefined): void {
    this.userScope = userId || "signed-out";
  }

  static cacheKey(baseKey: string): string {
    const scopedKey = `${baseKey}:${this.userScope}`;
    if (typeof window !== "undefined" && this.userScope !== "signed-out") {
      const claimedByKey = `${baseKey}:claimed-by`;
      const legacyValue = localStorage.getItem(baseKey);
      if (!localStorage.getItem(scopedKey) && legacyValue && !localStorage.getItem(claimedByKey)) {
        localStorage.setItem(scopedKey, legacyValue);
        localStorage.setItem(claimedByKey, this.userScope);
        localStorage.removeItem(baseKey);
      }
    }
    return scopedKey;
  }

  static async list(resource: PersistenceResource, ventureId?: string): Promise<Record<string, unknown>[] | null> {
    try {
      const params = new URLSearchParams({ resource });
      if (ventureId) params.set("ventureId", ventureId);
      const response = await fetch(`/api/persistence?${params}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) return null;
      const payload = await response.json() as { records?: Record<string, unknown>[] };
      return Array.isArray(payload.records) ? payload.records : [];
    } catch {
      return null;
    }
  }

  static async upsert(resource: PersistenceResource, record: Record<string, unknown>): Promise<boolean> {
    try {
      const response = await fetch("/api/persistence", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource, record }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async remove(resource: PersistenceResource, ventureId: string, id: string): Promise<boolean> {
    try {
      const params = new URLSearchParams({ resource, ventureId, id });
      const response = await fetch(`/api/persistence?${params}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
