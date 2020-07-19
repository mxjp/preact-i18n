import { Language } from "./language";
import { I18n } from "./controller";

export type Formatter = (value: any, language: Language, format?: string) => string;
export type FormatterMap = Map<any, Formatter>;

function resolveFormatter(controller: I18n, formatters: Map<any, Formatter> | undefined, key: any): Formatter | undefined {
	if (formatters === undefined) {
		return controller.formatters.get(key);
	} else {
		const formatter = formatters.get(key);
		return formatter === undefined ? controller.formatters.get(key) : formatter;
	}
}

export function createInterpolationProcessor(controller: I18n): Language.InterpolationProcessor {
	return (value, fields, language, formatters) => {
		return value.replace(/\{([^,}]*)(?:,([^,}]*))?(?:,([^,}]*))?\}/g, (_, name: string, key?: string, format?: string) => {
			const value = fields[name];

			if (key !== undefined) {
				const formatter = resolveFormatter(controller, formatters, key);
				if (formatter !== undefined) {
					return formatter(value, language, format);
				}
			}

			const type = typeof value;
			if (type === "object" && value !== null) {
				for (let proto = Object.getPrototypeOf(value); proto !== null; proto = Object.getPrototypeOf(proto)) {
					const formatter = resolveFormatter(controller, formatters, proto);
					if (formatter !== undefined) {
						return formatter(value, language, format);
					}
				}
			}

			if (type === "string") {
				return value;
			} else {
				const formatter = resolveFormatter(controller, formatters, type);
				if (formatter === undefined) {
					return String(value);
				} else {
					return formatter(value, language, format);
				}
			}
		});
	};
}
