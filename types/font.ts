export interface CustomFont {
  id: string;
  name: string;
  family: string;
  fileName: string;
  format: "truetype" | "opentype" | "woff" | "woff2";
  createdAt: string;
}
