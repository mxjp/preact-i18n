import test from "ava";
import * as path from "path";
import { SourceFile } from "../../src/tooling/source-file";

const filename = path.join(__dirname, "test-source.jsx");

test("extract", t => {
	const sourceFile = new SourceFile(filename, `
		<T value="foo" />
		<T id="7" />
		<T value="bar" id="42" />
	`);

	const result = sourceFile.extract();
	t.deepEqual(result, {
		values: new Map([
			["7", undefined],
			["42", "bar"]
		])
	})
});

test("update", t => {
	const sourceFile = new SourceFile(filename, `
		<T value="foo" />
		<T id="7" />
		<T value="bar" id="42" />
	`);

	const result = sourceFile.update({
		updateId(id) {
			switch (id) {
				case "7": return "3";
				case "42": return "5";
				default: return "1";
			}
		}
	});

	t.is(result.sourceText, `
		<T id="1" value="foo" />
		<T id="3" />
		<T value="bar" id="5" />
	`);
});
