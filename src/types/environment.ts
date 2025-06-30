// Environment types are now defined in src/lib/env.ts
// This file is kept for organizational purposes but all logic moved to lib/env.ts

// Environment validation error types
export interface EnvValidationError {
  missingVars: string[];
  invalidVars: string[];
  message: string;
}
