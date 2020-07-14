import { I18n } from "./controller";
import { Language } from "./language";
import { defaultInterpolationProcessor } from "./interpolation";
import * as plurals from "./plurals";

export const languageFactory: I18n.LanguageFactory = (name, resources) => {
	return new Language({
		name,
		resources,
		pluralProcessor: (plurals as { [p: string]: Language.PluralProcessor })[`plural_${name}`],
		interpolationProcessor: defaultInterpolationProcessor
	});
};
