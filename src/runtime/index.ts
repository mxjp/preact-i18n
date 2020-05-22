
export interface I18nOptions {
	sourceLanguage?: string;
	resources?: string;
}

export class I18n {
	public constructor(options: I18nOptions) {
		this._sourceLanguage = options.sourceLanguage || "en";
		this._resources = options.resources || "lang/[name].json";
	}

	private readonly _sourceLanguage: string;
	private readonly _resources: string;
}
