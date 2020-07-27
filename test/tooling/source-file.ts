import test from "ava";
import * as path from "path";
import { SourceFile, Project } from "../../src/tooling";
import { code } from "./_utility";

const filename = path.join(__dirname, "test-source.jsx");

test("ids", t => {
	const sourceFile = new SourceFile(filename, `
		<T value="foo" />
		<T id="7" />
		<T id="7" />
		<T value="bar" id="42" />
	`);

	t.deepEqual(sourceFile.ids(), new Set(["7", "42"]));
});

test("update", t => {
	const sourceFile = new SourceFile(filename, code(`
		<T value="foo" />
		<TX id="7" />
		<T value="bar" id="42" />
		<TX value={["foo", "bar"]} />
		<TX value={42} id={7} />
	`));

	let nextId = 0;
	const result = sourceFile.update({
		updateId(id) {
			switch (id) {
				case "7": return "3";
				case "42": return "42";
				default: return String(nextId++);
			}
		}
	});

	t.is(result.sourceText, code(`
		<T id="0" value="foo" />
		<TX id="3" />
		<T value="bar" id="42" />
		<TX id="1" value={["foo", "bar"]} />
		<TX value={42} id="2" />
	`));

	t.deepEqual(result.fragments, new Map<string, SourceFile.UpdateResult.Fragment>([
		["0", {
			value: "foo",
			oldId: undefined
		}],
		["3", {
			value: undefined,
			oldId: "7"
		}],
		["42", {
			value: "bar",
			oldId: "42"
		}],
		["1", {
			value: ["foo", "bar"],
			oldId: undefined
		}],
		["2", {
			value: undefined,
			oldId: undefined
		}]
	]));
});

test("fragmentsById", t => {
	const sourceFile = new SourceFile(filename, code(`
		<T value="foo" />
		<TX id="7" />
		<T value="bar" id="42" />
	`));

	t.deepEqual(sourceFile.fragmentsById, new Map<string, SourceFile.Fragment>([
		["7", { id: "7", start: 18, end: 31 }],
		["42", { id: "42", start: 32, end: 57 }]
	]));
});

test("fragments", t => {
	const sourceFile = new SourceFile(filename, code(`
		<T value="foo" />
		<TX id="7" />
		<T value="bar" id="42" />
	`));

	t.deepEqual(sourceFile.fragments, [
		{ id: "7", start: 18, end: 31 },
		{ id: "42", start: 32, end: 57 }
	]);
});

test("fragmentAt", t => {
	const sourceFile = new SourceFile(filename, code(`
		<T value="foo" />
		<T id="7" />
		const foo = <T value="bar" id="42" />
	`));

	t.deepEqual(sourceFile.fragmentAt(0), undefined);
	t.deepEqual(sourceFile.fragmentAt(17), undefined);
	t.deepEqual(sourceFile.fragmentAt(18), { id: "7", start: 18, end: 30 });
	t.deepEqual(sourceFile.fragmentAt(29), { id: "7", start: 18, end: 30 });
	t.deepEqual(sourceFile.fragmentAt(30), undefined);
	t.deepEqual(sourceFile.fragmentAt(42), undefined);
	t.deepEqual(sourceFile.fragmentAt(43), { id: "42", start: 43, end: 68 });
	t.deepEqual(sourceFile.fragmentAt(67), { id: "42", start: 43, end: 68 });
	t.deepEqual(sourceFile.fragmentAt(68), undefined);
});

test("fragmentsAt", t => {
	const sourceFile = new SourceFile(filename, code(`
		<T value="foo" />
		<T id="7" />
		const foo = <T value="bar" id="42" />
	`));

	t.deepEqual(sourceFile.fragmentsAt(0, 17), []);
	t.deepEqual(sourceFile.fragmentsAt(17, 18), [{ id: "7", start: 18, end: 30 }]);
	t.deepEqual(sourceFile.fragmentsAt(18, 18), [{ id: "7", start: 18, end: 30 }]);
	t.deepEqual(sourceFile.fragmentsAt(29, 29), [{ id: "7", start: 18, end: 30 }]);
	t.deepEqual(sourceFile.fragmentsAt(29, 30), [{ id: "7", start: 18, end: 30 }]);
	t.deepEqual(sourceFile.fragmentsAt(30, 30), []);
	t.deepEqual(sourceFile.fragmentsAt(0, 69), [{ id: "7", start: 18, end: 30 }, { id: "42", start: 43, end: 68 }]);
	t.deepEqual(sourceFile.fragmentsAt(29, 43), [{ id: "7", start: 18, end: 30 }, { id: "42", start: 43, end: 68 }]);
	t.deepEqual(sourceFile.fragmentsAt(42, 43), [{ id: "42", start: 43, end: 68 }]);
	t.deepEqual(sourceFile.fragmentsAt(43, 68), [{ id: "42", start: 43, end: 68 }]);
	t.deepEqual(sourceFile.fragmentsAt(68, 69), []);
});

test("lineMap", t => {
	const sourceFile = new SourceFile(filename, code(`
		1
		12
		1234
	`));

	t.is(sourceFile.lineMap, sourceFile.lineMap);

	t.deepEqual(sourceFile.lineMap, [
		0,
		2,
		5
	]);
});

test("position/offset conversion", t => {
	const sourceFile = new SourceFile(filename, code(`
		1
		12
		1234
	`));

	t.deepEqual(sourceFile.offsetToPosition(-1), undefined);
	t.deepEqual(sourceFile.offsetToPosition(0), { line: 0, character: 0 });
	t.deepEqual(sourceFile.offsetToPosition(1), { line: 0, character: 1 });
	t.deepEqual(sourceFile.offsetToPosition(2), { line: 1, character: 0 });
	t.deepEqual(sourceFile.offsetToPosition(3), { line: 1, character: 1 });
	t.deepEqual(sourceFile.offsetToPosition(4), { line: 1, character: 2 });
	t.deepEqual(sourceFile.offsetToPosition(5), { line: 2, character: 0 });
	t.deepEqual(sourceFile.offsetToPosition(6), { line: 2, character: 1 });
	t.deepEqual(sourceFile.offsetToPosition(7), { line: 2, character: 2 });
	t.deepEqual(sourceFile.offsetToPosition(8), { line: 2, character: 3 });
	t.deepEqual(sourceFile.offsetToPosition(9), undefined);

	t.is(sourceFile.positionToOffset({ line: 0, character: 0 }), 0);
	t.is(sourceFile.positionToOffset({ line: 0, character: 1 }), 1);
	t.is(sourceFile.positionToOffset({ line: 1, character: 0 }), 2);
	t.is(sourceFile.positionToOffset({ line: 1, character: 1 }), 3);
	t.is(sourceFile.positionToOffset({ line: 1, character: 2 }), 4);
	t.is(sourceFile.positionToOffset({ line: 2, character: 0 }), 5);
	t.is(sourceFile.positionToOffset({ line: 2, character: 1 }), 6);
	t.is(sourceFile.positionToOffset({ line: 2, character: 2 }), 7);
	t.is(sourceFile.positionToOffset({ line: 2, character: 3 }), 8);
});

test("component name comments", t => {
	const sourceFile = new SourceFile(filename, code(`
		// preact-i18n-components: F, FX, FX2
		function render() {
			return <div>
				<F id="7" />
				<FX id="42" />
				<FX2 id="111" />
				<T id="3" />
				<TX id="11" />
			</div>;
		}
	`));
	t.deepEqual(sourceFile.fragments, [
		{ id: "7", start: 74, end: 86 },
		{ id: "42", start: 89, end: 103 },
		{ id: "111", start: 106, end: 122 }
	]);
	t.pass();
});
