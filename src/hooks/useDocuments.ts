import { useState, useCallback } from 'react';
import axios from 'axios';
import { BASE } from '../components/constants';
import type { Document, CanvasJSON, DocType, DocumentPage } from '../types/document';

// ── List ─────────────────────────────────────────────────────────────────────

export function useDocuments(projectId?: number) {
  const [docs, setDocs]       = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = projectId
        ? `${BASE}/documents/?project_id=${projectId}`
        : `${BASE}/documents/`;
      const r = await axios.get<Document[]>(url);
      setDocs(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return { docs, loading, error, fetch, setDocs };
}

// ── Single document (with pages) ──────────────────────────────────────────────

export function useDocument(docId: number | null) {
  const [doc, setDoc]         = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await axios.get<Document>(`${BASE}/documents/${docId}/`);
      setDoc(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  const saveCanvas = useCallback(async (canvas: CanvasJSON) => {
    if (!docId) return;
    setSaving(true);
    try {
      const r = await axios.patch<Document>(`${BASE}/documents/${docId}/`, { canvas_json: canvas });
      setDoc(r.data);
    } finally {
      setSaving(false);
    }
  }, [docId]);

  const saveTitle = useCallback(async (title: string) => {
    if (!docId) return;
    const r = await axios.patch<Document>(`${BASE}/documents/${docId}/`, { title });
    setDoc(r.data);
  }, [docId]);

  const savePage = useCallback(async (pageNumber: number, canvas: CanvasJSON) => {
    if (!docId) return;
    const r = await axios.patch<DocumentPage>(
      `${BASE}/documents/${docId}/pages/${pageNumber}/`,
      { canvas_json: canvas },
    );
    setDoc(prev => {
      if (!prev) return prev;
      const pages = (prev.pages ?? []).map(p =>
        p.page_number === pageNumber ? { ...p, canvas_json: r.data.canvas_json } : p,
      );
      return { ...prev, pages };
    });
  }, [docId]);

  const addPage = useCallback(async () => {
    if (!docId) return;
    const r = await axios.post<DocumentPage>(`${BASE}/documents/${docId}/pages/`);
    setDoc(prev => prev ? { ...prev, pages: [...(prev.pages ?? []), r.data] } : prev);
    return r.data;
  }, [docId]);

  const deletePage = useCallback(async (pageNumber: number) => {
    if (!docId) return;
    await axios.delete(`${BASE}/documents/${docId}/pages/${pageNumber}/`);
    setDoc(prev => {
      if (!prev) return prev;
      const pages = (prev.pages ?? [])
        .filter(p => p.page_number !== pageNumber)
        .map((p, i) => ({ ...p, page_number: i + 1 }));
      return { ...prev, pages };
    });
  }, [docId]);

  return { doc, loading, saving, error, fetch, saveCanvas, saveTitle, savePage, addPage, deletePage, setDoc };
}

// ── Create / delete ───────────────────────────────────────────────────────────

export async function createDocument(
  projectId: number,
  docType: DocType,
  title: string,
  canvasJson?: CanvasJSON,
): Promise<Document> {
  const body: Record<string, unknown> = { project_id: projectId, doc_type: docType, title };
  if (canvasJson) body.canvas_json = canvasJson;
  const r = await axios.post<Document>(`${BASE}/documents/`, body);
  return r.data;
}

export async function createDocumentFromThread(
  projectId: number,
  entryId: number,
  title?: string,
  docType: DocType = 'infographic',
): Promise<Document> {
  const r = await axios.post<Document>(`${BASE}/documents/from-thread/`, {
    project_id: projectId,
    entry_id:   entryId,
    title,
    doc_type:   docType,
  });
  return r.data;
}

export async function deleteDocument(docId: number): Promise<void> {
  await axios.delete(`${BASE}/documents/${docId}/`);
}
