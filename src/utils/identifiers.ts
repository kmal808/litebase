const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

export function assertValidIdentifier(value: string, field: string): void {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`Invalid ${field}: "${value}"`)
  }
}

export function assertValidIdentifierList(
  values: string[],
  field: string
): void {
  for (const value of values) {
    assertValidIdentifier(value, field)
  }
}
