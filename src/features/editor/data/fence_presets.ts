// Fence preset configuration types and data

export interface FencePreset {
  name: string;
  ref: string;
  price: number;
  postType: "square" | "round";
  postWidth?: number;
  postRadius?: number;
  postHeight: number;
  railType: "frame" | "none";
  railShape?: "square" | "round";
  railThickness?: number;
  railRadius?: number;
  slatWidth: number;
  slatThickness: number;
  slatGap?: number;
  fixedCount?: number;
  multiColor?: boolean;
  isSolidPanel?: boolean;
  defaultColors: {
    post: number;
    slatA: number;
    slatB?: number;
    slatC?: number;
  };
}

export const FENCE_PRESETS: Record<string, FencePreset> = {
  wood: {
    name: "Valla Madera Clásica",
    ref: "VALMAD-01",
    price: 36,
    postType: "square",
    postWidth: 0.1,
    postHeight: 1.0,
    railType: "frame",
    railShape: "square",
    railThickness: 0.08,
    slatWidth: 0.1,
    slatThickness: 0.02,
    slatGap: 0.05,
    defaultColors: {
      post: 0x8b5a2b,
      slatA: 0xd2b48c,
    },
  },

  metal_slats: {
    name: "Valla Metálica Fina",
    ref: "VALFN-01",
    price: 42,
    postType: "round",
    postRadius: 0.04,
    postHeight: 1.0,
    railType: "frame",
    railShape: "round",
    railRadius: 0.03,
    slatWidth: 0.08,
    slatThickness: 0.01,
    fixedCount: 9,
    multiColor: true,
    defaultColors: {
      post: 0x1a1a1a,
      slatA: 0xcccccc,
      slatB: 0x888888,
      slatC: 0x444444,
    },
  },

  wide_panel: {
    name: "Valla Metálica Ancha",
    ref: "VALAN-01",
    price: 45,
    postType: "round",
    postRadius: 0.04,
    postHeight: 1.0,
    railType: "frame",
    railShape: "round",
    railRadius: 0.04,
    slatWidth: 0.2,
    slatThickness: 0.02,
    fixedCount: 6,
    multiColor: true,
    defaultColors: {
      post: 0x222222,
      slatA: 0x22c55e,
      slatB: 0x3b82f6,
      slatC: 0xeab308,
    },
  },

  game_panel: {
    name: "Valla Lisa / Panel",
    ref: "VALLI-01",
    price: 61,
    postType: "round",
    postRadius: 0.04,
    postHeight: 1.0,
    railType: "frame",
    railShape: "round",
    railRadius: 0.03,
    isSolidPanel: true,
    slatWidth: 1.0,
    slatThickness: 0.02,
    defaultColors: {
      post: 0x111111,
      slatA: 0xffffff,
    },
  },
};