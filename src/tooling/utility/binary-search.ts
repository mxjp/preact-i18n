
export type SearchComparator<T> = (value: T, index: number, array: T[]) => -1 | 0 | 1;

export function binarySearchIndex<T>(array: T[], comparator: SearchComparator<T>) {
	let start = 0;
	let end = array.length - 1;
	while (start <= end) {
		const mid = (start + end) >> 1;
		const comp = comparator(array[mid], mid, array);
		switch (comp) {
			case 0: return mid;
			case -1: end = mid - 1; break;
			case 1: start = mid + 1; break;
		}
	}
}

export function binarySearch<T>(array: T[], comparator: SearchComparator<T>) {
	const index = binarySearchIndex(array, comparator);
	return index === undefined ? undefined : array[index];
}
