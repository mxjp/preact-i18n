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
			await project.load();
			await project.processAndWrite();
			await project.compileAndWrite();
			project.watch();
			break;
		}

		case "compile": {
			await project.load();
			if (!project.verify()) {
				throw new Error("Sources and project data are out of sync.");
			}
			await project.compileAndWrite();
			break;
		}

		default: throw new Error(`Unknown command: ${command}`);
	}
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
