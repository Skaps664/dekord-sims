// API helper functions for consistent error handling and response formatting

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: any
}

export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  }
}

export function createErrorResponse(error: string, message?: string, details?: any): ApiResponse {
  return {
    success: false,
    error,
    message,
    details,
  }
}

export function handleApiError(error: unknown): ApiResponse {
  console.error("API Error:", error)

  if (error instanceof Error) {
    if (error.message.includes("relation") && error.message.includes("does not exist")) {
      return createErrorResponse(
        "Database tables not found. Please run the database setup scripts first.",
        "Run scripts/01-create-tables.sql, then scripts/02-seed-data.sql, then scripts/03-create-views.sql",
      )
    }

    if (error.message.includes("connect") || error.message.includes("connection")) {
      return createErrorResponse(
        "Database connection failed. Please check your database configuration.",
        "Verify your MONGODB_URI (or DATABASE_URL) environment variable is correct",
      )
    }

    return createErrorResponse(error.message)
  }

  return createErrorResponse("An unexpected error occurred")
}

// Validation helpers
export function validateRequired(fields: Record<string, any>): string[] {
  const errors: string[] = []

  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === "") {
      errors.push(`${key} is required`)
    }
  }

  return errors
}

export function validateNumber(value: any, fieldName: string): string[] {
  const errors: string[] = []

  if (isNaN(Number(value))) {
    errors.push(`${fieldName} must be a valid number`)
  } else if (Number(value) < 0) {
    errors.push(`${fieldName} must be a positive number`)
  }

  return errors
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Date helpers
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toISOString().split("T")[0]
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}
