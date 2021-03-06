import { dirname } from "path";
import { readFile, writeFile, stat, mkdir } from "fs/promises";
import { findFiles, watchFiles, watchFile } from "./utility/files";
import { SourceFile } from "./source-file";
import { Project } from "./project";

export class CliProject extends Project {
	private _projectDataMtime: number | undefined = undefined;

	private async _loadProjectData() {
		const stats = await stat(this.config.projectData).catch(error => {
			if (error?.code !== "ENOENT") {
				throw error;
			}
		});
		if (stats && this._projectDataMtime !== stats.mtimeMs) {
			this._projectDataMtime = stats.mtimeMs;
			this.data = Project.Data.parse(await readFile(this.config.projectData, "utf8"));
		}
	}

	private async _loadSources() {
		for await (const filename of findFiles(this.config.context, this.config.sources)) {
			if (SourceFile.isSourceFile(filename)) {
				this.updateSource(new SourceFile(filename, await readFile(filename, "utf8")));
			}
		}
	}

	public async load() {
		await this._loadProjectData();
		await this._loadSources();
	}

	public async processAndWrite() {
		await this.processSources({
			writeProjectData: data => {
				return writeFile(this.config.projectData, Project.Data.stringify(data));
			},
			writeSource: (filename, sourceText) => {
				return writeFile(filename, sourceText, "utf8");
			}
		});
	}

	public watch() {
		const stopSources = watchFiles(this.config.context, this.config.sources, async (changed, deleted) => {
			await this._loadProjectData();
			for (const filename of changed) {
				if (SourceFile.isSourceFile(filename)) {
					this.updateSource(new SourceFile(filename, await readFile(filename, "utf8")));
				}
			}
			for (const filename of deleted) {
				if (SourceFile.isSourceFile(filename)) {
					this.removeSource(filename);
				}
			}
			await this.processAndWrite();
			await this.compileAndWrite();
		});

		const stopProjectData = watchFile(this.config.projectData, async exists => {
			await this._loadProjectData();
			await this.processAndWrite();
			await this.compileAndWrite();
		});

		return async () => {
			await stopSources();
			await stopProjectData();
		}
	}

	public async compileAndWrite(minify = true) {
		const { resources } = await this.compile();
		for (const [lang, resource] of resources) {
			const filename = this.config.output.replace(/\[lang\]/g, lang);
			await mkdir(dirname(filename), { recursive: true });
			await writeFile(filename, Project.LanguageResources.stringify(resource, minify));
		}
	}
}
