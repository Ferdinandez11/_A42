export interface ProductDefinition {
  id: string;
  name: string;
  price: number;
  type: "model" | string;
  modelUrl: string;
  img_2d?: string;
  line?: string;
  category?: string;

  // Estos los añadimos pero son opcionales
  url_tech?: string;
  url_cert?: string;
  url_inst?: string;
  description?: string;
}
