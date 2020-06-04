import * as path from "path";
import * as ts from "typescript";
import * as stringEscape from "js-string-escape";

export class SourceFile {
	public constructor(filename: string, sourceText: string) {
		this.filename = path.resolve(filename);
		this.sourceText = sourceText;
		this.source = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.Latest, false);
	}

	public readonly filename: string;
	public readonly sourceText: string;
	public readonly source: ts.SourceFile;

	public ids(): Set<string> {
		const ids = new Set<string>();
		(function traverse(this: SourceFile, node: ts.Node) {
			if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) && node.tagName.text === "T") {
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
			if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) && node.tagName.text === "T") {
				const id = parseValue(getJsxAttribute(node.attributes, "id")?.initializer);
				const value = parseValue(getJsxAttribute(node.attributes, "value")?.initializer);
				if (typeof id === "string") {
					if (!context.verifyPair(id, value)) {
						// TODO: Emit diagnostic.
						valid = false;
					}
				} else if (id !== undefined) {
					// TODO: Emit diagnostic.
					valid = false;
				}
			}
			ts.forEachChild(node, n => traverse.call(this, n));
		}).call(this, this.source);
		return valid;
	}

	public update(context: SourceFile.UpdateContext): SourceFile.UpdateResult {
		const rewrites: [number, number, string][] = [];
		const values = new Map<string, string | undefined>();
		(function traverse(this: SourceFile, node: ts.Node) {
			if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) && node.tagName.text === "T") {
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
				values.set(updatedId, value);
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
}

function getJsxAttribute(attributes: ts.JsxAttributes, name: string) {
	return attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.text === name) as ts.JsxAttribute | undefined;
}

function parseValue(value: ts.StringLiteral | ts.JsxExpression | undefined) {
	if (value === undefined) {
		return undefined;
	}
	if (ts.isStringLiteral(value)) {
		return value.text;
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
		readonly values: Map<string, string | undefined>;
	}
}
