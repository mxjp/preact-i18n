import { generatedHint } from "./generated-hint";

export const pluralMeta = (rules: {
	languages: string[];
	forms: any[];
}[]) => `${generatedHint}
export namespace plurals {
	export function getFormCount(language: string): number | undefined {
		switch (language) {
			${rules.map(rule => `${rule.languages.map(l => `case "${l}":`).join("\n\t\t\t")}
				return ${rule.forms.length};`).join("\n\t\t\t")}
		}
	}
}
`;
