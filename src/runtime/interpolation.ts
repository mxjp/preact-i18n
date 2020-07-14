import { Language } from "./language";

export const defaultInterpolationProcessor: Language.InterpolationProcessor = (value, fields) => {
	return value.replace(/\{([^\}]*)\}/g, (_, name: string) => {
		return String(fields[name]) || "";
	});
};
