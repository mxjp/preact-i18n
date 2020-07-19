import { I18n } from "./controller";
import { Language } from "./language";
import { createInterpolationProcessor } from "./interpolation";
import * as plurals from "./plurals";

export const languageFactory: I18n.LanguageFactory = (controller, name, resources) => {
	return new Language({
		controller,
		name,
		resources,
		pluralProcessor: (plurals as { [p: string]: Language.PluralProcessor })[`plural_${name}`],
		interpolationProcessor: createInterpolationProcessor(controller)
	});
};
