export function createLogger(context: string) {
  return {
    info: (msg: string, ...args: unknown[]) => {
      console.log(`[${context}] ${msg}`, ...args);
    },
    warn: (msg: string, ...args: unknown[]) => {
      console.warn(`[${context}] ${msg}`, ...args);
    },
    error: (msg: string, ...args: unknown[]) => {
      console.error(`[${context}] ${msg}`, ...args);
    },
  };
}
