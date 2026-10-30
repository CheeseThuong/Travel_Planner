"use client";
import { validatedSavedPlan, type SavedPlan } from "./saved-plan";

const DB = "doc-personal-trips-v1";
const STORE = "plans";
function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Trình duyệt không hỗ trợ lưu kế hoạch cục bộ."));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "code" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Không mở được kho dữ liệu trên thiết bị."));
  });
}
async function transaction<T>(mode: IDBTransactionMode, task: (store: IDBObjectStore, finish: (value: T) => void, fail: (error: unknown) => void) => void): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    let result: T; let hasResult = false;
    const tx = db.transaction(STORE, mode), store = tx.objectStore(STORE);
    const finish = (value: T) => { result = value; hasResult = true; };
    const fail = (error: unknown) => { try { tx.abort(); } catch { /* tx may already be closed */ } reject(error); };
    tx.oncomplete = () => { db.close(); if (hasResult) resolve(result); else reject(new Error("Thao tác lưu chưa hoàn tất.")); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Dữ liệu chưa được lưu.")); };
    tx.onerror = () => {};
    try { task(store, finish, fail); } catch (error) { fail(error); }
  });
}
export async function saveLocalPlan(value: SavedPlan): Promise<SavedPlan> {
  const plan = validatedSavedPlan(value);
  // Browser origin isolation: data is not uploaded or exposed to another user.
  return transaction("readwrite", (store, finish) => { const req = store.put(plan); req.onsuccess = () => finish(plan); });
}
export async function listLocalPlans(): Promise<SavedPlan[]> {
  const entries = await transaction<unknown[]>("readonly", (store, finish) => { const req = store.getAll(); req.onsuccess = () => finish(req.result); });
  return entries.flatMap(value => { try { return [validatedSavedPlan(value)]; } catch { return []; } }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}
export async function findLocalPlan(code: string): Promise<SavedPlan | null> {
  const value = await transaction<unknown>("readonly", (store, finish) => { const req = store.get(code); req.onsuccess = () => finish(req.result); });
  return value === undefined ? null : validatedSavedPlan(value);
}
export async function removeLocalPlan(code: string): Promise<void> {
  await transaction<void>("readwrite", (store, finish) => { const req = store.delete(code); req.onsuccess = () => finish(undefined); });
}
export function downloadPlanFile(plan: SavedPlan): void {
  const blob = new Blob([JSON.stringify(validatedSavedPlan(plan), null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download=`DOC-${plan.draft.destination_slug}-${plan.code.slice(-10)}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
