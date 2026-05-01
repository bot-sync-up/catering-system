export * from "./hebrew";
export * from "./id";

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
