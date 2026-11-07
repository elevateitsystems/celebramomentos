import type { PodAdapter, PodProvider } from "../types";
import { gelatoAdapter } from "./gelato";
import { printeersAdapter } from "./printeers";
import { printfulAdapter } from "./printful";
import { prodigiAdapter } from "./prodigi";

const adapters: Partial<Record<PodProvider, () => PodAdapter>> = {
  PRODIGI: () => prodigiAdapter(),
  GELATO: () => gelatoAdapter(),
  PRINTFUL: () => printfulAdapter(),
  PRINTEERS: () => printeersAdapter(),
};

export const INACTIVE_PROVIDER = "This print shop is no longer used and receives no orders. Cancel this print order, or handle it by hand.";

// A print order kept from a print shop that is no longer used: it can be looked at and
// cancelled, but never sent or synced.
function inactiveAdapter(provider: PodProvider): PodAdapter {
  return {
    provider,
    configurationProblem: () => INACTIVE_PROVIDER,
    async submit() { throw new Error(INACTIVE_PROVIDER); },
    async findByReference() { return null; },
    async fetchStatus() { return null; },
  };
}

export function podAdapter(provider: PodProvider): PodAdapter {
  return adapters[provider]?.() ?? inactiveAdapter(provider);
}
