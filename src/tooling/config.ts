import { dirname, resolve } from "path";
import { parse } from "json5";
import { readFile } from "fs/promises";

export interface Config {
	readonly context: string;
	readonly projectData: string;
	readonly namespace: string;
	readonly sources: string[];
	readonly output: string;
}

export namespace Config {
	export interface Json {
		readonly projectData?: string;
		readonly namespace?: string;
		readonly sources?: string[];
		readonly output?: string;
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

		return {
			context,
			projectData,
			namespace,
			sources,
			output
		};
	}

	export async function read(filename: string) {
		filename = resolve(filename);
		return fromJson(parse(await readFile(filename, "utf8")), dirname(filename));
	}
}
