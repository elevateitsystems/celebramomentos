// Raised when a cart line references something that cannot be sold (deleted or
// inactive product, wrong category, archived template, missing options).
export class CatalogError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
    this.name = "CatalogError";
  }
}
