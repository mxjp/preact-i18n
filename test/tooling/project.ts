import test from "ava";
import * as path from "path";
import { Project, SourceFile, Config } from "../../src/tooling";
import { Diagnostic } from "../../src/tooling/diagnostic";

const config = Config.fromJson({
	namespace: "app",
	languages: [
		"de"
	]
}, __dirname);

const filenameA = path.join(__dirname, "test-source-a.jsx");
const filenameB = path.join(__dirname, "test-source-b.jsx");

const lastModified = new Date(Date.now() - 1000).toISOString();
const lastModifiedOutdated = new Date(Date.now() - 2000).toISOString();

test("workflow", async t => {
	const project = new Project(config);

	project.data = {
		values: {
			"42": {
				value: "",
				lastModified,
				translations: {}
			},
			"7": {
				value: "b",
				lastModified,
				translations: {
					de: {
						value: "x",
						lastModified
					}
				}
			},
			"8": {
				value: "b",
				lastModified,
				translations: {
					de: {
						value: "y",
						lastModified
					}
				}
			}
		}
	};

	project.updateSource(new SourceFile(filenameA, `
		<T value="foo" id="42" />
		<TX value="bar" id="42" />
		<T value="a" id="7" />
	`));

	const sourceAOutput = `
		<T value="foo" id="42" />
		<TX value="bar" id="0" />
		<T value="a" id="7" />
	`;

	project.updateSource(new SourceFile(filenameB, `
		<TX value="a" id="7" />
		<T value="b" id="8" />
	`));

	const sourceBOutput = `
		<TX value="a" id="1" />
		<T value="b" id="8" />
	`;

	let dataWritten = false;
	let sourceAWritten = false;
	let sourceBWritten = false;
	await project.processSources({
		writeSource(filename, sourceText) {
			if (filename === filenameA) {
				t.is(sourceText, sourceAOutput);
				sourceAWritten = true;
			} else if (filename === filenameB) {
				t.is(sourceText, sourceBOutput);
				sourceBWritten = true;
			} else {
				t.fail("Invalid source filename.");
			}
		},
		writeProjectData(data) {
			t.is(data.values["0"].value, "bar");
			t.is(data.values["1"].value, "a");
			t.is(data.values["7"].value, "a");
			t.not(data.values["7"].lastModified, lastModified);
			t.is(data.values["7"].translations.de.value, "x");
			t.is(data.values["7"].translations.de.lastModified, lastModified);
			t.is(data.values["8"].value, "b");
			t.is(data.values["42"].value, "foo");
			t.not(data.values["42"].lastModified, lastModified);

			t.is(data, project.data);
			t.true(sourceAWritten);
			t.true(sourceBWritten);
			dataWritten = true;
		}
	});
	t.true(dataWritten);

	const { resources } = await project.compile();
	t.is(resources.size, 2);
	t.true(resources.has("en"));
	t.is(resources.get("de")!["app"]["7"], undefined);
	t.is(resources.get("de")!["app"]["8"], "y");
});

test("verify (valid)", t => {
	const project = new Project(config);

	project.data = {
		values: {
			"1": { value: "a", lastModified, translations: {} },
			"2": { value: "b", lastModified, translations: {} },
			"3": { value: "c", lastModified, translations: {} }
		}
	};

	project.updateSource(new SourceFile(filenameA, `
		<TX value="a" id="1" />
		<T value="b" id="2" />
	`));

	project.updateSource(new SourceFile(filenameB, `
		<T value="c" id="3" />
	`));

	t.true(project.verify());
});

test("verify (duplicate id)", t => {
	const project = new Project(config);

	project.data = {
		values: {
			"1": { value: "a", lastModified, translations: {} },
			"2": { value: "b", lastModified, translations: {} },
			"3": { value: "c", lastModified, translations: {} }
		}
	};

	project.updateSource(new SourceFile(filenameA, `
		<T value="a" id="1" />
		<T value="b" id="2" />
	`));

	project.updateSource(new SourceFile(filenameB, `
		<TX value="c" id="1" />
	`));

	t.false(project.verify());
});

test("verify (missing data)", t => {
	const project = new Project(config);

	project.data = {
		values: {
			"1": { value: "a", lastModified, translations: {} }
		}
	};

	project.updateSource(new SourceFile(filenameA, `
		<TX value="a" id="1" />
		<T value="b" id="2" />
	`));

	t.false(project.verify());
});

test("verify (missing source)", t => {
	const project = new Project(config);

	project.data = {
		values: {
			"1": { value: "a", lastModified, translations: {} },
			"2": { value: "b", lastModified, translations: {} }
		}
	};

	project.updateSource(new SourceFile(filenameA, `
		<T value="a" id="1" />
	`));

	t.false(project.verify());
});

test("verify (same plural value)", t => {
	const project = new Project(config);

	project.data = {
		values: {
			"1": { value: ["a", "b"], lastModified, translations: {} }
		}
	};

	project.updateSource(new SourceFile(filenameA, `
		<TX value={["a", "b"]} id="1" />
	`));

	t.true(project.verify());
});

test("verify (value missmatch)", t => {
	const project = new Project(config);

	project.data = {
		values: {
			"1": { value: "b", lastModified, translations: {} }
		}
	};

	project.updateSource(new SourceFile(filenameA, `
		<T value="a" id="1" />
	`));

	t.false(project.verify());
});

test("verify (plural plural value missmatch)", t => {
	const project = new Project(config);

	project.data = {
		values: {
			"1": { value: ["a", "b"], lastModified, translations: {} }
		}
	};

	project.updateSource(new SourceFile(filenameA, `
		<TX value={["a", "c"]} id="1" />
	`));

	t.false(project.verify());
});

test("diagnostics", t => {
	const project = new Project(config);

	project.data = {
		values: {
			"1": { value: "b", lastModified, translations: {
				"de": { value: "b", lastModified }
			} },
			"2": { value: "b", lastModified, translations: {
				"de": { value: "b", lastModified: lastModifiedOutdated }
			} },
			"3": { value: "b", lastModified, translations: {
				"unknown": { value: "c", lastModified: lastModifiedOutdated }
			} },
			"4": { value: ["a", "b"], lastModified, translations: {
				"de": { value: "c", lastModified }
			} },
			"5": { value: ["a"], lastModified, translations: {
				"de": { value: ["c", "d"], lastModified }
			} },
			"6": { value: ["a", "b"], lastModified, translations: {
				"de": { value: ["c"], lastModified }
			} },
			"7": { value: ["a", "b"], lastModified, translations: {
				"de": { value: ["c", "d"], lastModified }
			} }
		}
	};

	const source = new SourceFile(filenameA, `
		<T value="a" id="1" />
		<T value="b" id="2" />
		<T value="c" id="3" />
		<T value="d" id="4" />
	`);
	project.updateSource(source);

	t.is(project.getSourceForId("1"), source);
	t.is(project.getSourceForId("2"), source);
	t.is(project.getSourceForId("3"), source);
	t.is(project.getSourceForId("4"), source);
	t.is(project.getSourceForId("5"), undefined);

	t.deepEqual(project.getDiagnostics(), [
		{ type: Diagnostic.Type.OutdatedTranslation, id: "2", language: "de" },
		{ type: Diagnostic.Type.MissingTranslation, id: "3", language: "de" },
		{ type: Diagnostic.Type.UnconfiguredTranslatedLanguage, id: "3", language: "unknown" },
		{ type: Diagnostic.Type.TranslationTypeMissmatch, id: "4", language: "de" },
		{ type: Diagnostic.Type.PluralFormCountMissmatch, id: "5", language: "en" },
		{ type: Diagnostic.Type.PluralFormCountMissmatch, id: "6", language: "de" }
	]);
});
