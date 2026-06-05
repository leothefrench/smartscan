/**
 * Secure Input Sanitizer for SQL and XSS defense
 */

export function sanitizeInput(input: string): string {
  if (!input) return "";
  
  // 1. Defend against common SQL Injection payloads
  let sanitized = input;
  const sqlKeywords = [
    /select\s+/gi,
    /union\s+/gi,
    /insert\s+/gi,
    /delete\s+/gi,
    /update\s+/gi,
    /drop\s+/gi,
    /alter\s+/gi,
    /truncate\s+/gi,
    /cast\(/gi,
    /convert\(/gi,
    /having\s+/gi,
    /or\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi, // e.g., OR 1=1
    /['"]\s*or\s*['"]/gi,
    /--/g, // SQL Comments
    /\/\*/g, // Multi-line comment open
    /\*\//g, // Multi-line comment close
  ];

  sqlKeywords.forEach((regex) => {
    sanitized = sanitized.replace(regex, "");
  });

  // 2. Defend against Cross-Site Scripting (XSS)
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/onload=/gi, "")
    .replace(/onerror=/gi, "")
    .replace(/onclick=/gi, "");

  // Escape HTML characters for maximum rendering safety
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");

  return sanitized.trim();
}

/**
 * Validates whether the email addresses have correct syntactical representation
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  // Standard RFC 5322 e-mail regex validation match
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}
