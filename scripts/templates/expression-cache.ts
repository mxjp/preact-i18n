
export class ExpressionCache {
	private readonly _expressionIds = new Map<string, string>();
	private _nextId = 0;

	public cache(expression: string, addPart: (expression: string) => void) {
		let id = this._expressionIds.get(expression);
		if (id === undefined) {
			id = `c${this._nextId++}`;
			this._expressionIds.set(expression, id);
			addPart(`const ${id} = ${expression};`);
		}
		return id;
	}
}
