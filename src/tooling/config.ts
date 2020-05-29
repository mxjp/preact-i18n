import { dirname, resolve } from "path";
import { parse } from "json5";
import { readFile } from "fs/promises";

export interface Config {
	readonly namespace: string;
}

export namespace Config {
	export interface Json {
		readonly namespace?: string;
	}

	export function fromJson(json: Json, context: string) {
		const namespace = json.namespace ?? "~";
		if (typeof namespace !== "string") {
			throw new TypeError("config.namespace must be a string.");
		}

		return {
			namespace
		};
	}

	export async function read(filename: string): Promise<Config> {
		filename = resolve(filename);
		const json: Json = parse(await readFile(filename, "utf8"));
		return fromJson(json, dirname(filename));
	}
}
