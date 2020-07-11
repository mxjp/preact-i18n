import { parse } from "json5";
import { readFile, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { pluralProcessorModule, pluralFormPart, pluralIncludeCondition, pluralExcludeCondition, pluralExpressionPartHandler, countSymbol } from "./templates/plural-processor-module";
import { ExpressionCache } from "./templates/expression-cache";
import { indexModule } from "./templates/index-module";
import { pluralMeta } from "./templates/plural-meta";

interface Rule {
	readonly languages: string[];
	readonly forms: ("default" | {
		readonly is?: Matcher;
		readonly modE1?: Matcher;
		readonly modE2?: Matcher;
		readonly modE6?: Matcher;
		readonly exclude?: Matcher;
	})[];
}

type Matcher = (number | [number, number])[];

async function main() {
	const rules: Rule[] = parse(await readFile(join(__dirname, "../resources/plurals.json5"), "utf8"));

	const out = join(__dirname, "../src/runtime/plurals");
	await mkdir(out, { recursive: true });

	for (let r = 0; r < rules.length; r++) {
		const rule = rules[r];

		const defaultIndex =  rule.forms.indexOf("default");
		if (defaultIndex < 0) {
			throw new Error(`"default" form is not defined.`);
		}

		const parts: string[] = [];
		const expressions = new ExpressionCache();
		const addExpression = pluralExpressionPartHandler(parts);

		for (let f = 0; f < rule.forms.length; f++) {
			const form = rule.forms[f];
			if (form !== "default") {
				const include: string[] = [];
				const exclude: string[] = [];
				if (form.is) {
					include.push(...form.is.map(f => pluralIncludeCondition(f)));
				}
				for (const [key, mod] of [
					["modE1", "1e1"],
					["modE2", "1e2"],
					["modE6", "1e6"]
				] as ["modE1" | "modE2" | "modE6", string][]) {
					if (form[key]) {
						const symbol = expressions.cache(`${countSymbol} % ${mod}`, addExpression);
						include.push(...form[key]!.map(f => pluralIncludeCondition(f, symbol)));
					}
				}
				if (form.exclude) {
					exclude.push(...form.exclude.map(f => pluralExcludeCondition(f)));
				}
				parts.push(pluralFormPart(include, exclude, f));
			}
		}

		await writeFile(join(out, `r${r}.ts`), pluralProcessorModule({
			defaultIndex,
			parts,
			languages: rule.languages
		}));
	}

	await writeFile(join(out, "index.ts"), indexModule(rules.map((rule, r) => `./r${r}`)));

	await writeFile(join(__dirname, "../src/tooling/plural-meta.ts"), pluralMeta(rules));
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
