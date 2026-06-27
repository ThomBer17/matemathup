type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

function emit(level: LogLevel, event: string, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    ts: new Date().toISOString(),
    ...fields,
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};

export function errorFields(error: unknown): LogFields {
  if (error instanceof Error) {
    return { error: error.message, stack: error.stack };
  }
  return { error: String(error) };
}
