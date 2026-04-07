export type SweetbookRawResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; message: string; status?: number; data?: unknown };
