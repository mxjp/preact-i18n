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

	public extract(): SourceFile.ExtractResult {
		const values = new Map<string, string | undefined>();
		(function traverse(this: SourceFile, node: ts.Node) {
			if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) && node.tagName.text === "T") {
				const id = parseValue(getJsxAttribute(node.attributes, "id")?.initializer);
				const value = parseValue(getJsxAttribute(node.attributes, "value")?.initializer);
				if (typeof id === "string") {
					values.set(id, value);
				}
			}
			ts.forEachChild(node, n => traverse.call(this, n));
		}).call(this, this.source);
		return { values };
	}

	public update(context: SourceFile.UpdateContext) {
		const rewrites: [number, number, string][] = [];
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

		return { sourceText };
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
	export interface ExtractResult {
		readonly values: Map<string, string | undefined>;
	}

	export interface UpdateContext {
		updateId(id?: string): string;
	}

	export interface UpdateResult {
		readonly sourceText: string;
	}
}
