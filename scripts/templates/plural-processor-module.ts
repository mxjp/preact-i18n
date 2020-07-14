import { generatedHint } from "./generated-hint";

export const countSymbol = "c";

export const pluralProcessorModule = (args: {
	readonly defaultIndex: number;
	readonly parts: string[];
	readonly languages: string[];
}) => `${generatedHint}
import { Language } from "../language";

const p: Language.PluralProcessor = (value: string[], ${countSymbol}: number) => {
	${countSymbol} = (${countSymbol} < 0 ? -${countSymbol} : ${countSymbol}) | 0;
	${args.parts.join("\n\t")}
	return value[${args.defaultIndex}];
};

${args.languages.map(l => `export const plural_${l} = p;`).join("\n")}
`;

export function pluralFormPart(include: string[], exclude: string[], index: number) {
	return `if (${exclude.length > 0
		? `${exclude.join(" && ")} && ${include.length > 1 ? `(${include.join(" || ")})` : include[0]}`
		: include.join(" || ")}) {
		return value[${index}];
	}`;
}

export function pluralIncludeCondition(matcher: number | [number, number], symbol = countSymbol) {
	return typeof matcher === "number"
		? `${symbol} === ${matcher}`
		: `(${symbol} >= ${matcher[0]} && ${symbol} <= ${matcher[1]})`;
}

export function pluralExcludeCondition(matcher: number | [number, number], symbol = countSymbol) {
	return typeof matcher === "number"
		? `${symbol} !== ${matcher}`
		: `(${symbol} < ${matcher[0]} || ${symbol} > ${matcher[1]})`;
}

export function pluralExpressionPartHandler(parts: string[]) {
	return (expression: string) => {
		parts.push(expression);
	};
}
