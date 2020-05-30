#!/usr/bin/env node

import { resolve } from "path";
import * as parseArgv from "minimist";
import { Config } from "./config";
import { StandaloneProject } from "./standalone-project";

async function main() {
	const argv = process.argv.slice(2);
	const command = argv.shift();
	const args = parseArgv(argv, {
		string: ["config"],
		boolean: ["verbose"],
		alias: {
			config: "c",
			verbose: "v"
		}
	});

	if (args.verbose) {
		console.log("Args:", args);
	}

	const configFilename = resolve(args.config ?? "i18n.json5");
	if (args.verbose) {
		console.log("Using config file:", configFilename);
	}

	const config = await Config.read(configFilename);
	if (args.verbose) {
		console.log("Using config:", config);
	}

	const project = new StandaloneProject(config);

	switch (command) {
		case "start": {
			await project.loadProjectData();
			await project.loadSources();
			// TODO: Start project server for integrated translation tools.
			// TODO: Initially and on change:
			// - Update sources.
			// - Process sources
			// - Write modified sources and data to disk.
			break;
		}

		case "compile": {
			await project.loadProjectData();
			await project.loadSources();
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
