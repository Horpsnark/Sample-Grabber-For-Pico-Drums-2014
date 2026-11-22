export interface LibraryEntry {
  id: string;
  name: string;        // filename with extension
  path: string;        // relative path inside library
  categories: Set<string>;
  sizeBytes: number;
  sourceType: 'file' | 'url';
  file?: File;
  url?: string;
}

export interface SlotSample {
  name: string;        // cleaned export name (up to 24 chars)
  cat: string;         // assigned category
  path: string;        // source relative path / identifier
  data: Int16Array;    // active 44.1kHz 16-bit mono PCM samples
  base: Int16Array;    // base category-capped PCM samples
  more: boolean;       // true if source had audio cut off to fit
}

export interface NoticeMessage {
  id: number;
  type: 'info' | 'success' | 'error';
  text: string;
}
