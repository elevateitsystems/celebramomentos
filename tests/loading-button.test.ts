// @vitest-environment jsdom
import { createElement as h } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.mock("next/link", () => ({ default: (props: Record<string, unknown>) => h("a", props) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/cart" }));

import { LoadingButton, LoadingLink, useActionLock } from "@/components/loading-button";

let host: HTMLDivElement; let root: Root;
beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });

const render = (node: Parameters<Root["render"]>[0]) => act(() => root.render(node));
const button = () => host.querySelector("button")!;
const click = (el: Element = button()) => act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); });
const deferred = () => { let resolve!: () => void; let reject!: (reason: unknown) => void; const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };
const spinner = () => host.querySelector("span.animate-spin");

describe("LoadingButton", () => {
  it("shows a spinner beside the text, disables itself and ignores more clicks while the action runs, then restores", async () => {
    const work = deferred(); const action = vi.fn(() => work.promise);
    render(h(LoadingButton, { onClick: action, loadingLabel: "Guardando…" }, "Guardar"));
    expect(spinner()).toBeNull(); expect(button().textContent).toBe("Guardar");

    await click(); await click(); await click();
    expect(action).toHaveBeenCalledTimes(1);
    expect(spinner()).not.toBeNull();
    expect(button().disabled).toBe(true);
    expect(button().getAttribute("aria-busy")).toBe("true");
    expect(button().textContent).toBe("Guardando…");

    await act(async () => { work.resolve(); await work.promise; });
    expect(spinner()).toBeNull(); expect(button().disabled).toBe(false); expect(button().textContent).toBe("Guardar");
    await click();
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("restores the button and shows an error when the action fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const work = deferred();
    render(h(LoadingButton, { onClick: () => work.promise }, "Guardar"));
    await click();
    expect(button().disabled).toBe(true);
    await act(async () => { work.reject(new Error("El servidor no responde")); await work.promise.catch(() => undefined); });
    expect(button().disabled).toBe(false); expect(spinner()).toBeNull();
    expect(host.textContent).toContain("El servidor no responde");
  });

  it("falls back to a generic message when the error has no readable text", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(h(LoadingButton, { onClick: async () => { throw "boom"; }, errorMessage: "No se pudo guardar." }, "Guardar"));
    await click();
    expect(host.textContent).toContain("No se pudo guardar.");
  });

  it("passes errors to onError instead of the toast when given", async () => {
    const onError = vi.fn();
    render(h(LoadingButton, { onClick: async () => { throw new Error("x"); }, onError }, "Guardar"));
    await click();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(host.textContent).not.toContain("Algo salió mal");
  });

  it("follows a controlled loading flag and never calls onClick while it is on", async () => {
    const action = vi.fn();
    render(h(LoadingButton, { loading: true, loadingLabel: "Procesando…", onClick: action, type: "submit" }, "Pagar"));
    expect(spinner()).not.toBeNull(); expect(button().disabled).toBe(true); expect(button().textContent).toBe("Procesando…");
    await click();
    expect(action).not.toHaveBeenCalled();
    render(h(LoadingButton, { loading: false, onClick: action, type: "submit" }, "Pagar"));
    expect(spinner()).toBeNull(); expect(button().disabled).toBe(false);
  });

  it("a busy submit button cannot submit its form a second time", async () => {
    const submitted = vi.fn((event: Event) => event.preventDefault());
    render(h("form", { onSubmit: (event: unknown) => submitted(event as Event) }, h(LoadingButton, { type: "submit", loading: true }, "Enviar")));
    await click();
    expect(submitted).not.toHaveBeenCalled();
  });

  it("does nothing special for synchronous actions", async () => {
    const action = vi.fn();
    render(h(LoadingButton, { onClick: action }, "Abrir"));
    await click();
    expect(action).toHaveBeenCalledTimes(1);
    expect(spinner()).toBeNull(); expect(button().disabled).toBe(false);
  });
});

describe("LoadingLink", () => {
  it("shows the spinner after a click and ignores further clicks while the next page loads", async () => {
    render(h(LoadingLink, { href: "/checkout", loadingLabel: "Abriendo…" }, "Continuar"));
    const link = host.querySelector("a")!;
    vi.spyOn(console, "error").mockImplementation(() => undefined); // jsdom does not implement real navigation
    await click(link);
    expect(spinner()).not.toBeNull(); expect(link.textContent).toBe("Abriendo…"); expect(link.getAttribute("aria-busy")).toBe("true");
    const second = new MouseEvent("click", { bubbles: true, cancelable: true });
    await act(async () => { link.dispatchEvent(second); });
    expect(second.defaultPrevented).toBe(true);
  });

  it("keeps normal link behaviour for a new-tab click", async () => {
    render(h(LoadingLink, { href: "/checkout" }, "Continuar"));
    const link = host.querySelector("a")!;
    await act(async () => { link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true })); });
    expect(spinner()).toBeNull();
  });
});

describe("useActionLock", () => {
  it("runs one action at a time", async () => {
    let api!: ReturnType<typeof useActionLock>;
    const Probe = () => { api = useActionLock(); return h("span", null, api.pending ? "busy" : "idle"); };
    render(h(Probe));
    const work = deferred(); const action = vi.fn(() => work.promise);
    let first!: Promise<unknown>;
    await act(async () => { first = api.run(action); await api.run(action); });
    expect(action).toHaveBeenCalledTimes(1);
    expect(host.textContent).toBe("busy");
    await act(async () => { work.resolve(); await first; });
    expect(host.textContent).toBe("idle");
  });
});
