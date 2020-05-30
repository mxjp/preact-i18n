import { Project } from "./project";
import { readFile } from "fs/promises";
import {} from "chokidar";
import createIgnore from "ignore";

export class StandaloneProject extends Project {
	async loadProjectData() {
		const projectData = await readFile(this.config.projectData, "utf8").catch(error => {
			if (error?.code !== "ENOENT") {
				throw error;
			}
		});
		if (projectData) {
			this.data = JSON.parse(projectData);
		}
	}

	async loadSources() {
		const match = createIgnore();
		match.add("**/*.tsx");

	}
}
