import { Language } from "./language";

export class I18n {
	public constructor(options: I18n.Options) {
		this._clients = new Set(options.clients);
		this._languageFactory = options.languageFactory || ((name, resources) => {
			return new Language({ name, resources });
		});
	}

	private readonly _clients: Set<I18n.Client>;
	private readonly _languageFactory: I18n.LanguageFactory;
	private readonly _updateHandlers = new Set<I18n.UpdateHandler>();
	private readonly _languages = new Map<string, Language>();

	private _language: Language | null = null;

	public get languages(): ReadonlyMap<string, Language> {
		return this._languages;
	}

	public get language() {
		return this._language;
	}

	public async setLanguage(name: string) {
		const tasks: Promise<void>[] = [];
		this._clients.forEach(client => tasks.push(client.fetchResources(this, name)));
		await Promise.all(tasks);
		this._language = this._languages.get(name) ?? null;
		this.update();
	}

	public setLanguageAuto(names: string[], fallback: string) {
		const nameSet = new Set(names);
		const name = navigator.languages.find(name => nameSet.has(name)) || fallback;
		return this.setLanguage(name);
	}

	public addResources(name: string, resources: Language.Resources) {
		let language = this._languages.get(name);
		if (language === undefined) {
			language = this._languageFactory(name, resources);
			this._languages.set(name, language);
		} else {
			language.addResources(resources);
		}
	}

	public update() {
		this._updateHandlers.forEach(h => h(this));
	}

	public addUpdateHandler(handler: I18n.UpdateHandler) {
		this._updateHandlers.add(handler);
	}

	public removeUpdateHandler(handler: I18n.UpdateHandler) {
		this._updateHandlers.delete(handler);
	}

	public addClient(client: I18n.Client) {
		this._clients.add(client);
	}

	public removeClient(client: I18n.Client) {
		this._clients.delete(client);
	}
}

export namespace I18n {
	export interface Options {
		readonly clients?: Client[];
		readonly languageFactory?: LanguageFactory;
	}

	export type LanguageFactory = (name: string, resources?: Language.Resources) => Language;

	export type UpdateHandler = (controller: I18n) => void;

	export interface Client {
		fetchResources(controller: I18n, language: string): Promise<void>;
	}
}
