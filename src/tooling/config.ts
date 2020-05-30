import { dirname, resolve } from "path";
import { parse } from "json5";
import { readFile } from "fs/promises";

export interface Config {
	readonly context: string;
	readonly projectData: string;
	readonly namespace: string;
}

export namespace Config {
	export interface Json {
		readonly projectData?: string;
		readonly namespace?: string;
	}

	export function fromJson(json: Json, context: string): Config {
		const namespace = json.namespace ?? "~";
		if (typeof namespace !== "string") {
			throw new TypeError("config.namespace must be a string.");
		}

		const projectData = resolve(context, json.projectData ?? "./i18n-data.json");

		return {
			context,
			projectData,
			namespace
		};
	}

	export async function read(filename: string) {
		filename = resolve(filename);
		return fromJson(parse(await readFile(filename, "utf8")), dirname(filename));
	}
}
