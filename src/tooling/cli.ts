#!/usr/bin/env node

import * as parseArgv from "minimist";
import { Config } from "./config";
import { Project } from "./project";

async function main() {
	const argv = process.argv.slice(2);
	const command = argv.shift();
	const args = parseArgv(argv, {
		alias: {
			config: "c"
		}
	});

	const configFilename = args.config ?? "i18n.json5";
	if (typeof configFilename !== "string") {
		throw new Error(`Usage: --config <filename>`);
	}
	const config = await Config.read(configFilename);
	const project = new Project(config);

	switch (command) {
		case "start": {
			// TODO: Load project data.
			// TODO: Load sources.
			// TODO: Start project server for integrated translation tools.
			// TODO: Initially and on change:
			// - Update sources.
			// - Process sources
			// - Write modified sources and data to disk.
			break;
		}

		case "compile": {
			// TODO: Load project data.
			// TODO: Load sources.
			// TODO: Process sources for diagnostics.
			// TODO: Fail when sources and data are out of sync.
			// TODO: Compile and write resources to disk.
			break;
		}

		default: throw new Error(`Unknown command: ${command}`);
	}
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
