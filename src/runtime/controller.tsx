import { Language } from "./language";

export class I18n {
	public constructor(options: I18n.Options) {
		this._languageFactory = options.languageFactory || ((name, resources) => {
			return new Language({ name, resources });
		});
	}

	private readonly _languageFactory: I18n.LanguageFactory;
	private readonly _languageChangeHandlers = new Set<I18n.LanguageChangeHandler>();
	private readonly _languages = new Map<string, Language>();

	public addResources(name: string, resources: Language.Resources) {
		let language = this._languages.get(name);
		if (language === undefined) {
			language = this._languageFactory(name, resources);
			this._languages.set(name, language);
		} else {
			language.addResources(resources);
		}
		return language;
	}

	public addLanguageChangeHandler(handler: I18n.LanguageChangeHandler) {
		this._languageChangeHandlers.add(handler);
	}

	public removeLanguageChangeHandler(handler: I18n.LanguageChangeHandler) {
		this._languageChangeHandlers.delete(handler);
	}
}

export namespace I18n {
	export interface Options {
		readonly languageFactory?: LanguageFactory;
	}

	export type LanguageFactory = (name: string, resource: Language.Resources) => Language;
	export type LanguageChangeHandler = (language: Language) => void;
}
