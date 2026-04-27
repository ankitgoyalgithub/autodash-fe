// ── Canvas element types ──────────────────────────────────────────────────────

export interface TextStyle {
  fontSize?:    number;
  fontWeight?:  string;
  fontStyle?:   string;
  color?:       string;
  textAlign?:   'left' | 'center' | 'right';
  lineHeight?:  number;
  fontFamily?:  string;
}

export interface ShapeStyle {
  fill?:         string;
  stroke?:       string;
  strokeWidth?:  number;
  opacity?:      number;
  borderRadius?: number;
}

export type CanvasElementType = 'chart' | 'text' | 'image' | 'shape';

interface BaseElement {
  id:      string;
  type:    CanvasElementType;
  x:       number;
  y:       number;
  w:       number;
  h:       number;
  locked?: boolean;
  opacity?: number;
}

export interface ChartElement extends BaseElement {
  type:       'chart';
  /** Format: "<entry_id>:<card_index>" — resolved to live chart data at render time */
  chart_ref:  string;
}

export interface TextElement extends BaseElement {
  type:    'text';
  content: string;
  style:   TextStyle;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  url:  string;
  alt?: string;
}

export interface ShapeElement extends BaseElement {
  type:  'shape';
  shape: 'rect' | 'circle' | 'line';
  style: ShapeStyle;
}

export type CanvasElement = ChartElement | TextElement | ImageElement | ShapeElement;

// ── Canvas JSON (the editable document state) ─────────────────────────────────

export interface CanvasJSON {
  width:      number;
  height:     number;
  background: string;
  elements:   CanvasElement[];
}

// ── Document & DocumentPage ───────────────────────────────────────────────────

export type DocType = 'infographic' | 'poster' | 'slide_deck';

export interface DocumentPage {
  id:          number;
  page_number: number;
  canvas_json: CanvasJSON;
  updated_at:  string;
}

export interface Document {
  id:            number;
  project:       number;
  doc_type:      DocType;
  title:         string;
  canvas_json:   CanvasJSON;
  thumbnail_url: string;
  created_at:    string;
  updated_at:    string;
  pages?:        DocumentPage[];
}

// ── Canvas size presets ───────────────────────────────────────────────────────

export const DOC_SIZES: Record<DocType, { width: number; height: number; label: string }> = {
  infographic: { width: 1200, height: 1600, label: 'Infographic  1200 × 1600' },
  poster:      { width: 1080, height: 1350, label: 'Poster  1080 × 1350' },
  slide_deck:  { width: 1920, height: 1080, label: 'Slide  1920 × 1080' },
};

export function blankCanvas(docType: DocType): CanvasJSON {
  const { width, height } = DOC_SIZES[docType];
  return { width, height, background: '#ffffff', elements: [] };
}
