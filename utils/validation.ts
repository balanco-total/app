// Allowed: alphanumeric, dash, slash, dot, space, accented characters (À-ÿ)
const ALLOWED_FIELD = /^[a-zA-Z0-9\-\/\. À-ÿ]+$/

export function isValidFieldText(value: string): boolean {
  return ALLOWED_FIELD.test(value)
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}
