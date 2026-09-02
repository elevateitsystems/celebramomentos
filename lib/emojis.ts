export type EmojiTone = "natural" | "pink" | "blue" | "gold";

export type EmojiPosition = {
  x: number;
  y: number;
};

export type EmojiOption = {
  id: string;
  emoji: string;
  label: string;
  tone?: EmojiTone;
};

export const emojiOptions: EmojiOption[] = [
  { id: "sparkles", emoji: "✨", label: "Destellos" },
  { id: "heart-red", emoji: "❤️", label: "Corazón rojo" },
  { id: "heart-orange", emoji: "🧡", label: "Corazón naranja" },
  { id: "heart-yellow", emoji: "💛", label: "Corazón amarillo" },
  { id: "heart-green", emoji: "💚", label: "Corazón verde" },
  { id: "heart-blue", emoji: "💙", label: "Corazón azul" },
  { id: "heart-purple", emoji: "💜", label: "Corazón morado" },
  { id: "heart-black", emoji: "🖤", label: "Corazón negro" },
  { id: "heart-white", emoji: "🤍", label: "Corazón blanco" },
  { id: "heart-brown", emoji: "🤎", label: "Corazón marrón" },
  { id: "two-hearts", emoji: "💕", label: "Dos corazones" },
  { id: "revolving-hearts", emoji: "💞", label: "Corazones girando" },
  { id: "growing-heart", emoji: "💗", label: "Corazón creciente" },
  { id: "sparkling-heart", emoji: "💖", label: "Corazón brillante" },
  { id: "heart-ribbon", emoji: "💝", label: "Corazón con lazo" },
  { id: "paw", emoji: "🐾", label: "Huella de perro" },
  { id: "birthday-cake", emoji: "🎂", label: "Tarta de cumpleaños" },
  { id: "balloon-red", emoji: "🎈", label: "Globo rojo", tone: "natural" },
  { id: "balloon-pink", emoji: "🎈", label: "Globo rosa", tone: "pink" },
  { id: "balloon-blue", emoji: "🎈", label: "Globo azul", tone: "blue" },
  { id: "balloon-gold", emoji: "🎈", label: "Globo dorado", tone: "gold" },
  { id: "kiss", emoji: "💋", label: "Beso" },
  { id: "party", emoji: "🎉", label: "Celebración" },
  { id: "flower", emoji: "🌷", label: "Tulipán" },
  { id: "smile", emoji: "😊", label: "Sonrisa" },
];

export const emojiToneFilters: Record<EmojiTone, string> = {
  natural: "none",
  pink: "hue-rotate(300deg) saturate(1.25)",
  blue: "hue-rotate(145deg) saturate(1.35)",
  gold: "hue-rotate(35deg) saturate(1.4) brightness(1.15)",
};

export const defaultEmojiPosition: EmojiPosition = { x: 88, y: 12 };
