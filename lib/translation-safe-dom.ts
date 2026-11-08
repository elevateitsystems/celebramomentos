// Keeps the site working while a browser translator (Chrome's "Translate to English",
// Edge, Safari…) is active. Server-safe: does nothing outside the browser.
//
// Root cause it handles: the translator replaces each text node React rendered with
// <font><font>translated text</font></font>. React still holds the original text node,
// which is now detached. When a later render removes or moves that node (e.g. going to
// the next customization step), React calls parent.removeChild(node) or
// parent.insertBefore(newNode, node) and the browser throws
// "NotFoundError: The node to be removed is not a child of this node". React then
// unmounts the whole page: "Application error: a client-side exception has occurred".
// (React issue #11538; reproduced on /customize with a simulated translation.)
//
// Fix: when — and only when — the node React refers to is no longer a child of that
// parent, skip the impossible DOM call instead of throwing. Every normal call is passed
// through unchanged. Must run before React mounts, so it is imported first by app/providers.
const FLAG = "__celebraTranslationSafeDom";

export function installTranslationSafeDom() {
  if (typeof window === "undefined" || typeof Node !== "function") return;
  const proto = Node.prototype as Node & Record<string, unknown>;
  if (proto[FLAG]) return;
  proto[FLAG] = true;

  let warned = false;
  const warn = (operation: string) => {
    if (warned) return;
    warned = true;
    console.warn(`[celebra] ${operation}: the page was changed by a browser translator; the DOM update was adapted to keep the page working.`);
  };

  const removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      warn("removeChild");
      // The translator already took it out (or moved it): remove it from where it is now, if anywhere.
      if (child.parentNode) removeChild.call(child.parentNode, child);
      return child;
    }
    return removeChild.call(this, child) as T;
  };

  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, node: T, reference: Node | null): T {
    if (reference && reference.parentNode !== this) {
      warn("insertBefore");
      // The reference node is gone: append at the end of the parent instead of failing.
      return insertBefore.call(this, node, null) as T;
    }
    return insertBefore.call(this, node, reference) as T;
  };
}

installTranslationSafeDom();
