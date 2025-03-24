export function sortByReference<T, K extends keyof T>(
  objects: T[],
  property: K,
  referenceArray: string[],
): T[] {
  return objects.sort((a, b) => {
    const indexA = referenceArray.indexOf(a[property] as string);
    const indexB = referenceArray.indexOf(b[property] as string);

    const rankA = indexA === -1 ? Infinity : indexA;
    const rankB = indexB === -1 ? Infinity : indexB;

    return rankA - rankB;
  });
}
