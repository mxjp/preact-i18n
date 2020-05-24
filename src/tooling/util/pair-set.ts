
export class PairSet<K, V> {
	private readonly _keys = new Map<K, Set<V>>();
	private readonly _values = new Map<V, Set<K>>();

	public add(key: K, value: V) {
		add(this._keys, key, value);
		add(this._values, value, key);
	}

	public delete(key: K, value: V) {
		del(this._keys, key, value);
		del(this._values, value, key);
	}

	public setKey(key: K, values: Iterable<V>) {
		// TODO: Optimize this method.
		this.deleteKey(key);
		for (const value of values) {
			this.add(key, value);
		}
	}

	public deleteKey(key: K) {
		const values = this._keys.get(key);
		if (values) {
			this._keys.delete(key);
			for (const value of values) {
				del(this._values, value, key);
			}
		}
	}

	public hasValue(value: V) {
		return this._values.has(value);
	}

	public valueHasOtherKeys(value: V, key: K) {
		const keys = this._values.get(value);
		return keys ? (keys.has(key) ? keys.size > 1 : keys.size > 0) : false;
	}
}

function add<K, V>(map: Map<K, Set<V>>, key: K, value: V) {
	const values = map.get(key);
	if (values) {
		values.add(value);
	} else {
		map.set(key, new Set([value]));
	}
}

function del<K, V>(map: Map<K, Set<V>>, key: K, value: V) {
	const values = map.get(key);
	if (values && values.delete(value) && values.size === 0) {
		map.delete(key);
	}
}
