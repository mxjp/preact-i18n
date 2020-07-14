import { generatedHint } from "./generated-hint";

export const pluralMeta = (rules: {
	languages: string[];
	forms: any[];
}[]) => `${generatedHint}
export namespace plurals {
	export interface Rule {
		readonly languages: string[];
		readonly forms: ("default" | Form)[];
	}

	export interface Form {
		readonly is?: FormMatcher;
		readonly modE1?: FormMatcher;
		readonly modE2?: FormMatcher;
		readonly modE6?: FormMatcher;
		readonly exclude?: FormMatcher;
	}

	export type FormMatcher = (number | [number, number])[];

	export function getRule(language: string): Rule | undefined {
		switch (language) {
			${rules.map(rule => `${rule.languages.map(l => `case "${l}":`).join("\n\t\t\t")}
				return ${JSON.stringify(rule)};`).join("\n\t\t\t")}
		}
	}
}
`;
