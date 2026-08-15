export class RepositoryError extends Error {
  public constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message, options);
    this.name = "RepositoryError";
  }
}
