/**
 * validation.ts — Shared client-side field validation helpers.
 *
 * These are used by form dialogs and pages throughout the system
 * to do lightweight, consistent short-text and long-text validation
 * before a request is sent to the server.
 */

export type FieldError = string | null;

// ── Short text (names, titles, labels) ─────────────────────────────────────

export interface ShortTextOptions {
  /** Display label used in error messages. Defaults to "This field". */
  label?: string;
  /** Whether a non-empty value is required. Defaults to true. */
  required?: boolean;
  /** Minimum character count after trimming. Defaults to 2. */
  minLength?: number;
  /** Maximum character count (before or after trimming). Defaults to 150. */
  maxLength?: number;
  /**
   * When true, rejects values that contain characters frequently used in
   * injection attacks: < > { } [ ] ; `  Defaults to true.
   */
  blockDangerousChars?: boolean;
}

export function validateShortText(
  value: string,
  options: ShortTextOptions = {},
): FieldError {
  const {
    label              = "This field",
    required           = true,
    minLength          = 2,
    maxLength          = 150,
    blockDangerousChars = true,
  } = options;

  const trimmed = value.trim();

  if (required && trimmed.length === 0) {
    return `${label} is required.`;
  }

  // Skip remaining checks if the field is optional and currently empty
  if (!required && trimmed.length === 0) return null;

  if (trimmed.length < minLength) {
    return `${label} must be at least ${minLength} characters.`;
  }

  if (trimmed.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer (currently ${trimmed.length}).`;
  }

  if (blockDangerousChars && /[<>{}\[\];`]/.test(trimmed)) {
    return `${label} contains invalid characters (< > { } [ ] ; \`).`;
  }

  return null; // valid
}

// ── Long text (notes, descriptions, remarks) ───────────────────────────────

export interface LongTextOptions {
  /** Display label used in error messages. Defaults to "Note". */
  label?: string;
  /** Maximum character count. Defaults to 500. */
  maxLength?: number;
  /**
   * When true, rejects values that contain characters frequently used in
   * injection attacks. Defaults to false for notes (users may legitimately
   * quote or use angle brackets in prose).
   */
  blockDangerousChars?: boolean;
}

export function validateLongText(
  value: string,
  options: LongTextOptions = {},
): FieldError {
  const {
    label              = "Note",
    maxLength          = 500,
    blockDangerousChars = false,
  } = options;

  if (value.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer (currently ${value.length}).`;
  }

  if (blockDangerousChars && /[<>{}\[\];`]/.test(value)) {
    return `${label} contains invalid characters.`;
  }

  return null; // valid
}

// ── Convenience: run multiple validators and return first error ─────────────

export function firstError(...errors: FieldError[]): FieldError {
  return errors.find((e) => e !== null) ?? null;
}

// ── Numeric fields (prices, quantities, levels) ────────────────────────────

export interface NumberOptions {
  /** Display label used in error messages. Defaults to "This field". */
  label?: string;
  /** Whether the field is required (non-empty). Defaults to true. */
  required?: boolean;
  /** Minimum allowed value. Pass 0 to block negatives. Defaults to 0. */
  min?: number;
  /** Maximum allowed value. Defaults to no limit. */
  max?: number;
  /** When true, value must be a whole number (no decimals). Defaults to false. */
  integer?: boolean;
}

export function validateNumber(
  value: string | number,
  options: NumberOptions = {},
): FieldError {
  const {
    label    = "This field",
    required = true,
    min      = 0,
    max,
    integer  = false,
  } = options;

  const str = String(value).trim();

  if (required && str === "") {
    return `${label} is required.`;
  }

  if (!required && str === "") return null;

  const num = Number(str);

  if (isNaN(num)) {
    return `${label} must be a valid number.`;
  }

  if (min !== undefined && num < min) {
    return min === 0
      ? `${label} cannot be negative.`
      : `${label} must be at least ${min}.`;
  }

  if (max !== undefined && num > max) {
    return `${label} must be ${max} or less.`;
  }

  if (integer && !Number.isInteger(num)) {
    return `${label} must be a whole number.`;
  }

  return null; // valid
}

// ── Email ──────────────────────────────────────────────────────────────────

export function validateEmail(
  value: string,
  options: { label?: string; required?: boolean } = {},
): FieldError {
  const { label = "Email", required = false } = options;
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return required ? `${label} is required.` : null;
  }

  // RFC-5322 light check: something@something.something
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRe.test(trimmed)) {
    return `${label} is not a valid email address.`;
  }

  if (trimmed.length > 254) {
    return `${label} must be 254 characters or fewer.`;
  }

  return null;
}

// ── Phone ──────────────────────────────────────────────────────────────────

export function validatePhone(
  value: string,
  options: { label?: string; required?: boolean } = {},
): FieldError {
  const { label = "Phone", required = false } = options;
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return required ? `${label} is required.` : null;
  }

  // Allow: +63 900 000 0000, 09XX-XXX-XXXX, +1-555-0101, etc.
  // Must contain at least 7 digits, only digits/spaces/dashes/parens/plus allowed
  const phoneRe = /^\d+$/;
  if (!phoneRe.test(trimmed)) {
    return `${label} must contain digits only (no spaces, dashes, or special characters).`;
  }

  if (trimmed.length < 7 || trimmed.length > 15) {
    return `${label} must be between 7 and 15 digits.`;
  }

  return null;
}

// ── URL ────────────────────────────────────────────────────────────────────

export function validateUrl(
  value: string,
  options: { label?: string; required?: boolean } = {},
): FieldError {
  const { label = "Website", required = false } = options;
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return required ? `${label} is required.` : null;
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(url.protocol)) {
      return `${label} must be an http or https URL.`;
    }
  } catch {
    return `${label} is not a valid URL.`;
  }

  if (trimmed.length > 2083) {
    return `${label} is too long.`;
  }

  return null;
}
