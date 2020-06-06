import { resolve } from "path";

export interface Config {
	readonly context: string;
	readonly projectData: string;
	readonly namespace: string;
	readonly sources: string[];
	readonly output: string;
	readonly languages: string[];
}

export namespace Config {
	export interface Json {
		readonly projectData?: string;
		readonly namespace?: string;
		readonly sources?: string[];
		readonly output?: string;
		readonly languages?: string[];
	}

	export function fromJson(json: Json, context: string): Config {
		const projectData = resolve(context, json.projectData ?? "./i18n-data.json");

		const namespace = json.namespace ?? "~";
		if (typeof namespace !== "string") {
			throw new TypeError("config.namespace must be a string.");
		}

		const sources = json.sources ?? ["**"];
		if (!Array.isArray(sources) || !sources.every(s => typeof s === "string")) {
			throw new TypeError("config.sources must be an array of strings.");
		}

		const output = resolve(json.output ?? "dist/lang/[lang].json");

		const languages = json.languages ?? [];
		if (!Array.isArray(languages) || !languages.every(s => typeof s === "string")) {
			throw new TypeError("config.languages must be an array of strings.");
		}

		return {
			context,
			projectData,
			namespace,
			sources,
			output,
			languages
		};
	}
}
