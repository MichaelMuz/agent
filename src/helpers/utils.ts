/*
 * Exhaustiveness check helper
 */
export function assertUnreachable(value: never): never {
  throw new Error(`Unreachable case: ${JSON.stringify(value)}`);
}

export function assert(value: boolean, msg: string): asserts value {
  if (!value) throw Error(msg);
}

export function checkUnion<V, U extends V>(
  value: V,
  union: readonly U[]
): value is U {
  return (union as readonly V[]).includes(value);
}
