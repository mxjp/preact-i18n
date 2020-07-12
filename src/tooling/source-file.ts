import * as path from "path";
import * as ts from "typescript";
import * as stringEscape from "js-string-escape";
import { binarySearchIndex, binarySearch } from "./utility/binary-search";
import { Project } from "./project";

export class SourceFile {
	public constructor(filename: string, sourceText: string) {
		this.filename = path.resolve(filename);
		this.sourceText = sourceText;
		this.source = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.Latest, false);
	}

	public readonly filename: string;
	public readonly sourceText: string;
	public readonly source: ts.SourceFile;

	private readonly _componentNames = new Set<string>(["T", "TX"]);

	private _lineMap: number[] | undefined = undefined;
	private _fragmentMap: ReadonlyMap<string, SourceFile.Fragment> | undefined = undefined;
	private _fragments: SourceFile.Fragment[] | undefined = undefined;

	public static isSourceFile(filename: string) {
		return /\.[tj]sx$/i.test(filename);
	}

	public ids(): Set<string> {
		const ids = new Set<string>();
		(function traverse(this: SourceFile, node: ts.Node) {
			if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) && this._componentNames.has(node.tagName.text)) {
				const id = parseValue(getJsxAttribute(node.attributes, "id")?.initializer);
				if (typeof id === "string") {
					ids.add(id);
				}
			}
			ts.forEachChild(node, n => traverse.call(this, n));
		}).call(this, this.source);
		return ids;
	}

	public verify(context: SourceFile.VerifyContext) {
		let valid = true;
		(function traverse(this: SourceFile, node: ts.Node) {
			if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) && this._componentNames.has(node.tagName.text)) {
				const id = parseValue(getJsxAttribute(node.attributes, "id")?.initializer);
				const value = parseValue(getJsxAttribute(node.attributes, "value")?.initializer);
				if (typeof id === "string") {
					if (!context.verifyPair(id, value)) {
						valid = false;
					}
				} else if (id !== undefined) {
					valid = false;
				}
			}
			ts.forEachChild(node, n => traverse.call(this, n));
		}).call(this, this.source);
		return valid;
	}

	public get fragmentsById() {
		if (this._fragmentMap === undefined) {
			const fragmentMap = new Map<string, SourceFile.Fragment>();
			(function traverse(this: SourceFile, node: ts.Node) {
				if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) && this._componentNames.has(node.tagName.text)) {
					const id = parseValue(getJsxAttribute(node.attributes, "id")?.initializer);
					if (typeof id === "string") {
						const text = this.sourceText.slice(node.pos, node.end);
						fragmentMap.set(id, {
							id,
							start: node.pos + leadingSpace(text).length,
							end: node.end - trailingSpace(text).length
						});
					}
				}
				ts.forEachChild(node, n => traverse.call(this, n));
			}).call(this, this.source);
			this._fragmentMap = fragmentMap;
		}
		return this._fragmentMap;
	}

	public get fragments() {
		if (this._fragments === undefined) {
			this._fragments = Array.from(this.fragmentsById.values());
		}
		return this._fragments;
	}

	public fragmentAt(offset: number) {
		return binarySearch(this.fragments, fragment => {
			return fragment.end <= offset ? 1 : (fragment.start > offset ? -1 : 0);
		});
	}

	public fragmentsAt(start: number, end: number) {
		const fragments = this.fragments;
		const startIndex = binarySearchIndex(this.fragments, (fragment, index) => {
			return fragment.end <= start ? 1 : (index > 0 && fragments[index - 1].end > start ? -1 : 0);
		});
		const endIndex = binarySearchIndex(this.fragments, (fragment, index) => {
			return fragment.start > end ? -1 : (index < fragments.length - 1 && fragments[index + 1].start <= end ? 1 : 0);
		});
		return (startIndex === undefined || endIndex === undefined) ? [] : this.fragments.slice(startIndex, endIndex + 1);
	}

	public update(context: SourceFile.UpdateContext): SourceFile.UpdateResult {
		const rewrites: [number, number, string][] = [];
		const values = new Map<string, Project.Value | undefined>();
		(function traverse(this: SourceFile, node: ts.Node) {
			if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) && this._componentNames.has(node.tagName.text)) {
				const idAttribute = getJsxAttribute(node.attributes, "id");
				const id = parseValue(idAttribute?.initializer);
				const updatedId = context.updateId(typeof id === "string" ? id : undefined);
				if (id !== updatedId) {
					if (idAttribute) {
						const oldText = this.sourceText.slice(idAttribute.pos, idAttribute.end);
						rewrites.push([
							idAttribute.pos,
							idAttribute.end,
							`${leadingSpace(oldText)}id="${stringEscape(updatedId)}"${trailingSpace(oldText)}`
						]);
					} else {
						const oldText = this.sourceText.slice(node.attributes.pos, node.attributes.end);
						rewrites.push([
							node.attributes.pos,
							node.attributes.pos,
							`${leadingSpace(oldText) || " "}id="${stringEscape(updatedId)}"`
						]);
					}
				}
				const value = parseValue(getJsxAttribute(node.attributes, "value")?.initializer);
				values.set(updatedId, Project.isValue(value) ? value : undefined);
			}
			ts.forEachChild(node, n => traverse.call(this, n));
		}).call(this, this.source);

		let sourceText = "";
		let sourcePos = 0;
		rewrites.sort((a, b) => a[0] - b[0]);
		for (const [start, end, value] of rewrites) {
			sourceText += this.sourceText.slice(sourcePos, start);
			sourceText += value;
			sourcePos = end;
		}
		sourceText += this.sourceText.slice(sourcePos);

		return {
			changed: rewrites.length > 0,
			sourceText,
			values
		};
	}

	public get lineMap() {
		if (this._lineMap === undefined) {
			const map: number[] = [0];
			let offset = -1;
			while ((offset = this.sourceText.indexOf("\n",  offset + 1)) !== -1) {
				map.push(offset + 1);
			}
			this._lineMap = map;
		}
		return this._lineMap;
	}

	public positionToOffset(pos: SourceFile.Position) {
		return this.lineMap[pos.line] + pos.character;
	}

	public offsetToPosition(offset: number): SourceFile.Position | undefined {
		const { lineMap, sourceText } = this;
		const line = binarySearchIndex(lineMap, (start, line, lineMap) => {
			const end = line === lineMap.length - 1 ? sourceText.length : lineMap[line + 1];
			return offset < start ? -1 : (offset >= end ? 1 : 0);
		});
		return line === undefined ? undefined : { line, character: offset - lineMap[line] };
	}
}

function getJsxAttribute(attributes: ts.JsxAttributes, name: string) {
	return attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.text === name) as ts.JsxAttribute | undefined;
}

function parseValue(value?: ts.Expression): any {
	if (value === undefined) {
		return undefined;
	}
	if (ts.isStringLiteral(value)) {
		return value.text;
	}
	if (ts.isArrayLiteralExpression(value)) {
		return value.elements.map(parseValue);
	}
	if (ts.isJsxExpression(value) && value.expression) {
		return parseValue(value.expression);
	}
	return undefined;
}

function leadingSpace(value: string) {
	return /^\s*/.exec(value)![0];
}

function trailingSpace(value: string) {
	return /\s*$/.exec(value)![0];
}

export namespace SourceFile {
	export interface VerifyContext {
		/**
		 * Called to verify an id-value pair.
		 * @returns True if the id is unique in the project and the value is in sync with the project data.
		 */
		verifyPair(id: string, value: string | undefined): boolean;
	}

	export interface Position {
		readonly line: number;
		readonly character: number;
	}

	export interface Fragment {
		readonly id: string;
		readonly start: number;
		readonly end:  number;
	}

	export interface UpdateContext {
		/**
		 * Called to get a project wide unique id.
		 * @param id The preferred id.
		 * @returns The project wide unique id.
		 */
		updateId(id?: string): string;
	}

	export interface UpdateResult {
		readonly changed: boolean;
		readonly sourceText: string;
		/** Map of all (updated) ids to optional values. */
		readonly values: Map<string, Project.Value | undefined>;
	}
}
