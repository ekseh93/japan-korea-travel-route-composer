import type { DetailCode, ErrorCode } from "@route-composer/contracts";

export type DomainErrorDetail = {
  readonly code: DetailCode;
  readonly field?: string;
  readonly message: string;
  readonly relatedPlaceId?: string;
};

export class DomainError extends Error {
  public readonly code: ErrorCode;
  public readonly details: readonly DomainErrorDetail[];

  public constructor(code: ErrorCode, message: string, details: readonly DomainErrorDetail[] = []) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export function domainInvariant(
  condition: boolean,
  code: ErrorCode,
  message: string,
  details: readonly DomainErrorDetail[] = [],
): asserts condition {
  if (!condition) {
    throw new DomainError(code, message, details);
  }
}
