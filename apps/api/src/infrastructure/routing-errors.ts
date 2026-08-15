import type { DomainErrorDetail } from "../domain/errors.js";

export class RoutingRepositoryError extends Error {
  public readonly details: readonly DomainErrorDetail[];

  public constructor(
    message: string,
    details: readonly DomainErrorDetail[] = [],
    options?: { readonly cause?: unknown },
  ) {
    super(message, options);
    this.name = "RoutingRepositoryError";
    this.details = details;
  }
}
