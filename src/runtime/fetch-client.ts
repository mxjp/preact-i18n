import { I18n } from "./controller";

export class FetchClient implements I18n.Client {
	public constructor(options: FetchClient.Options = {}) {
		this._path = options.path ?? "lang/[lang].json";
	}

	private readonly _path: string;

	public async fetchResources(controller: I18n, language: string) {
		const path = this._path.replace(/\[lang\]/g, language);

		const res = await fetch(path);
		if (!res.ok) {
			throw Object.assign(new Error(`Failed to fetch language resources from: ${path}`), {
				res, body: await res.text()
			});
		}

		controller.addResources(language, await res.json());
	}
}

export namespace FetchClient {
	export interface Options {
		readonly path?: string;
	}
}
