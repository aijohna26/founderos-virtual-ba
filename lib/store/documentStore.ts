"use client";

import { PersistenceClient } from "@/lib/store/persistenceClient";
import { shouldApplyHydration } from "@/lib/store/hydrationGuard";

export type KnowledgeDocumentCategory =
  | "Customer Interview"
  | "PRD"
  | "Market Research"
  | "Meeting Notes"
  | "Specification";

export interface KnowledgeDocument {
  id: string;
  ventureId: string;
  title: string;
  category: KnowledgeDocumentCategory;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const DOCUMENTS_KEY = "founderally_knowledge_documents_v1";

export class DocumentStore {
  private static mutationVersions = new Map<string, number>();

  private static key(ventureId: string): string {
    return PersistenceClient.cacheKey(`${DOCUMENTS_KEY}_${ventureId}`);
  }

  private static markMutation(ventureId: string): void {
    this.mutationVersions.set(ventureId, (this.mutationVersions.get(ventureId) || 0) + 1);
  }

  static getDocuments(ventureId: string): KnowledgeDocument[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(this.key(ventureId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static save(ventureId: string, documents: KnowledgeDocument[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.key(ventureId), JSON.stringify(documents));
    window.dispatchEvent(new Event("founderally:documents"));
  }

  static async hydrate(ventureId: string): Promise<KnowledgeDocument[]> {
    const cached = this.getDocuments(ventureId);
    const versionAtStart = this.mutationVersions.get(ventureId) || 0;
    const rows = await PersistenceClient.list("documents", ventureId);
    if (!rows) return cached;
    if (rows.length === 0 && cached.length > 0) {
      await Promise.all(cached.map((document) => this.persist(document)));
      return cached;
    }
    if (!shouldApplyHydration(versionAtStart, this.mutationVersions.get(ventureId) || 0)) {
      return this.getDocuments(ventureId);
    }
    const documents: KnowledgeDocument[] = rows.map((row) => ({
      id: String(row.id),
      ventureId: String(row.venture_id),
      title: String(row.title),
      category: row.category as KnowledgeDocumentCategory,
      content: String(row.content),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
    this.save(ventureId, documents);
    return documents;
  }

  private static persist(document: KnowledgeDocument): Promise<boolean> {
    return PersistenceClient.upsert("documents", {
      id: document.id,
      venture_id: document.ventureId,
      title: document.title,
      category: document.category,
      content: document.content,
      created_at: document.createdAt,
      updated_at: document.updatedAt,
    });
  }

  static addDocument(
    ventureId: string,
    title: string,
    category: KnowledgeDocumentCategory,
    content: string,
  ): KnowledgeDocument {
    const now = new Date().toISOString();
    const document: KnowledgeDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ventureId,
      title: title.trim(),
      category,
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
    };
    this.markMutation(ventureId);
    this.save(ventureId, [document, ...this.getDocuments(ventureId)]);
    void this.persist(document);
    return document;
  }

  static deleteDocument(ventureId: string, id: string): void {
    this.markMutation(ventureId);
    this.save(ventureId, this.getDocuments(ventureId).filter((document) => document.id !== id));
    void PersistenceClient.remove("documents", ventureId, id);
  }
}
