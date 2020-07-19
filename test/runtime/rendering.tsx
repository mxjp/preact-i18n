import test from "ava";
import { render } from "preact-render-to-string";
import { h } from "preact";
import { Language, I18n, I18nContext, languageFactory } from "../../src/runtime";

function createRenderer(deResources?: Language.Resources) {
	const i18n = new I18n({ languageFactory });
	i18n.addResources("en", {});
	if (deResources) {
		i18n.addResources("de", deResources);
	}

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

test("format by key", async t => {
	const { i18n, TX, render } = createRenderer({});
	await i18n.setLanguage("en");
	i18n.formatters.set("test", (value: number, language, factor?: string) => String(value * Number(factor)));
	t.is(render(<TX id="0" value="{value,test,2}" fields={{ value: 42 }} />), "84");
});

test("format by primitive type", async t => {
	const { i18n, TX, render } = createRenderer({});
	await i18n.setLanguage("en");
	i18n.formatters.set("number", (value: number) => String(value / 2));
	t.is(render(<TX id="0" value="{value}" fields={{ value: 42 }} />), "21");
	t.is(render(<TX id="0" value="{value}" fields={{ value: true }} />), "true");
	t.is(render(<TX id="0" value="{value}" fields={{ value: BigInt(42) }} />), "42");
	t.is(render(<TX id="0" value="{value}" fields={{ value: undefined }} />), "undefined");
});

test("format by prototype", async t => {
	class Foo { }
	class Bar extends Foo { }

	const { i18n, TX, render } = createRenderer({});
	await i18n.setLanguage("en");
	i18n.formatters.set(Date.prototype, (value: Date, language) => value.toLocaleString(language.name));
	i18n.formatters.set(Foo.prototype, () => "foo");

	t.is(render(<TX id="0" value="{value}" fields={{ value: new Date(2020, 1, 2, 1, 2, 3) }} />), "2/2/2020, 1:02:03 AM");
	t.is(render(<TX id="0" value="{value}" fields={{ value: new Bar() }} />), "foo");
});

test("format fallback", async t => {
	const { i18n, TX, render } = createRenderer({});
	await i18n.setLanguage("en");
	t.is(render(<TX id="0" value="{value}" fields={{ value: 42 }} />), "42");
	t.is(render(<TX id="0" value="{value}" fields={{ value: true }} />), "true");
	t.is(render(<TX id="0" value="{value}" fields={{ value: undefined }} />), "undefined");
	t.is(render(<TX id="0" value="{value}" fields={{ value: null }} />), "null");
	t.is(render(<TX id="0" value="{value}" fields={{ value: { toString: () => "42" } }} />), "42");
});
