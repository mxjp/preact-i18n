import test from "ava";
import { render } from "preact-render-to-string";
import { h } from "preact";
import { Language, I18n, I18nContext, languageFactory } from "../../src/runtime";

function createRenderer(deResources: Language.Resources) {
	const i18n = new I18n({ languageFactory });
	i18n.addResources("en", {});
	i18n.addResources("de", deResources);

	const { T, TX } = I18nContext.create({ namespace: "test" });

	return {
		i18n,
		T,
		TX,
		render(content: h.JSX.Element) {
			return render(<Language.Provider use={i18n}>{content}</Language.Provider>);
		},
	};
}

test("simple text", async t => {
	const { i18n, T, render } = createRenderer({
		test: {
			"0": "Bar"
		}
	});

	await i18n.setLanguage("en");
	t.is(render(<T id="0" value="Foo" />), "Foo");
	await i18n.setLanguage("de");
	t.is(render(<T id="0" value="Foo" />), "Bar");
});

test("pluralized text", async t => {
	const { i18n, TX, render } = createRenderer({
		test: {
			"0": ["baz", "boo"]
		}
	});

	await i18n.setLanguage("en");
	t.is(render(<TX id="0" value={["foo", "bar"]} count={0} />), "bar");
	t.is(render(<TX id="0" value={["foo", "bar"]} count={1} />), "foo");
	t.is(render(<TX id="0" value={["foo", "bar"]} count={-42.7} />), "bar");

	await i18n.setLanguage("de");
	t.is(render(<TX id="0" value={["foo", "bar"]} count={0} />), "boo");
	t.is(render(<TX id="0" value={["foo", "bar"]} count={1} />), "baz");
	t.is(render(<TX id="0" value={["foo", "bar"]} count={-42.7} />), "boo");
});

test("interpolated text", async t => {
	const { i18n, TX, render } = createRenderer({
		test: {
			"0": "Bar {field}"
		}
	});

	await i18n.setLanguage("en");
	t.is(render(<TX id="0" value="Foo {field}" />), "Foo {field}");
	t.is(render(<TX id="0" value="Foo {field}" fields={{field: 42}} />), "Foo 42");
	await i18n.setLanguage("de");
	t.is(render(<TX id="0" value="Foo {field}" />), "Bar {field}");
	t.is(render(<TX id="0" value="Foo {field}" fields={{field: 42}} />), "Bar 42");
});

test("interpolated pluralized text", async t => {
	const { i18n, TX, render } = createRenderer({
		test: {
			"0": ["baz", "boo {count}"]
		}
	});

	await i18n.setLanguage("en");
	t.is(render(<TX id="0" value={["foo", "bar {count}"]} count={-42.7} />), "bar -42.7");
	t.is(render(<TX id="0" value={["foo", "bar {count}"]} count={-42.7} fields={{count: 7}} />), "bar 7");
	await i18n.setLanguage("de");
	t.is(render(<TX id="0" value={["foo", "bar {count}"]} count={-42.7} />), "boo -42.7");
	t.is(render(<TX id="0" value={["foo", "bar {count}"]} count={-42.7} fields={{count: 7}} />), "boo 7");
});
