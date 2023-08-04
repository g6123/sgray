export const array = <T>(value: T | T[]) => (Array.isArray(value) ? value : [value]);
