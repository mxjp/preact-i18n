import test from "ava";
import { I18n } from "../../src/runtime";

test("setLangAttribute", async t => {
	const doc = (global.document as any) = { documentElement: { lang: "" } };

	const i18n = new I18n({
		setLangAttribute: true
	});

	t.is(doc.documentElement.lang, "");
	await i18n.setLanguage("en");
	t.is(i18n.language?.name, "en");
	t.is(doc.documentElement.lang, "en");
	await i18n.setLanguage("de");
	t.is(i18n.language?.name, "de");
	t.is(doc.documentElement.lang, "de");
});
