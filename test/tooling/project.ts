import test from "ava";
import * as path from "path";
import { Project, SourceFile } from "../../src/tooling";

const filenameA = path.join(__dirname, "test-source-a.jsx");
const filenameB = path.join(__dirname, "test-source-b.jsx");

const lastModified = new Date(Date.now() - 1000).toISOString();

test("workflow", async t => {
	const project = new Project({
		namespace: "app"
	});

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
	}

	project.updateSource(new SourceFile(filenameA, `
		<T value="foo" id="42" />
		<T value="bar" id="42" />
		<T value="a" id="7" />
	`));

	const sourceAOutput = `
		<T value="foo" id="42" />
		<T value="bar" id="0" />
		<T value="a" id="7" />
	`;

	project.updateSource(new SourceFile(filenameB, `
		<T value="a" id="7" />
		<T value="b" id="8" />
	`));

	const sourceBOutput = `
		<T value="a" id="1" />
		<T value="b" id="8" />
	`;

	project.processSources();

	t.is(project.data.values["0"].value, "bar");
	t.is(project.data.values["1"].value, "a");
	t.is(project.data.values["7"].value, "a");
	t.not(project.data.values["7"].lastModified, lastModified);
	t.is(project.data.values["7"].translations.de.value, "x");
	t.is(project.data.values["7"].translations.de.lastModified, lastModified);
	t.is(project.data.values["8"].value, "b");
	t.is(project.data.values["42"].value, "foo");
	t.not(project.data.values["42"].lastModified, lastModified);

	let dataWritten = false;
	let sourceAWritten = false;
	let sourceBWritten = false;
	await project.handleModified({
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
			t.is(data, project.data);
			t.true(sourceAWritten);
			t.true(sourceBWritten);
			dataWritten = true;
		}
	});
	t.true(dataWritten);

	const { resources } = await project.compile();
	t.is(resources.size, 1);
	t.is(resources.get("de")!["app"]["7"], undefined);
	t.is(resources.get("de")!["app"]["8"], "y");
});
