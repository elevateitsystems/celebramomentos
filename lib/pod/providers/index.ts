import type { PodAdapter, PodProvider } from "../types";
import { alerioAdapter } from "./alerioprint";
import { gelatoAdapter } from "./gelato";
import { printfulAdapter } from "./printful";
import { prodigiAdapter } from "./prodigi";

const adapters: Record<PodProvider, () => PodAdapter> = {
  PRODIGI: () => prodigiAdapter(),
  GELATO: () => gelatoAdapter(),
  PRINTFUL: () => printfulAdapter(),
  ALERIO_PRINT: () => alerioAdapter(),
};

export function podAdapter(provider: PodProvider): PodAdapter {
  return adapters[provider]();
}
