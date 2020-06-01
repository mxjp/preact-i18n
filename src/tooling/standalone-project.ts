import { Project } from "./project";
import { dirname } from "path";
import { readFile, writeFile, stat, mkdir } from "fs/promises";
import { findFiles, watchFiles } from "./util/files";
import { SourceFile } from "./source-file";

export class StandaloneProject extends Project {
	private _projectDataMtime: number | undefined = undefined;

	async loadProjectData() {
		const stats = await stat(this.config.projectData).catch(error => {
			if (error?.code !== "ENOENT") {
				throw error;
			}
		});
		if (stats && this._projectDataMtime !== stats.mtimeMs) {
			this._projectDataMtime = stats.mtimeMs;
			this.data = JSON.parse(await readFile(this.config.projectData, "utf8"));
		}
	}

	async loadSources() {
		for await (const filename of findFiles(this.config.context, this.config.sources)) {
			if (/\.[jt]sx$/.test(filename)) {
				this.updateSource(new SourceFile(filename, await readFile(filename, "utf8")));
			}
		}
	}

	async writeModified() {
		await this.handleModified({
			writeProjectData: data => {
				return writeFile(this.config.projectData, JSON.stringify(data, null, "\t") + "\n", "utf8");
			},
			writeSource: (filename, sourceText) => {
				return writeFile(filename, sourceText, "utf8");
			}
		});
	}

	watchSources() {
		return watchFiles(this.config.context, this.config.sources, async (changed, deleted) => {
			await this.loadProjectData();
			for (const filename of changed) {
				this.updateSource(new SourceFile(filename, await readFile(filename, "utf8")));
			}
			for (const filename of deleted) {
				this.removeSource(filename);
			}
			this.processSources();
			await this.writeModified();
			await this.writeOutput();
		});
	}

	async writeOutput() {
		const { resources } = await this.compile();
		for (const [lang, resource] of resources) {
			const filename = this.config.output.replace(/\[lang\]/g, lang);
			await mkdir(dirname(filename), { recursive: true });
			await writeFile(filename, JSON.stringify(resource, null, "\t") + "\n");
		}
	}
}
