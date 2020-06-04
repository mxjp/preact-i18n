import { SourceFile } from "./source-file";
import { PairSet } from "./util/pair-set";
import { Config } from "./config";

export class Project {
	public constructor(config: Config) {
		this.config = config;
	}

	public readonly config: Config;

	/** Map of filenames to source instances. */
	private readonly _sources = new Map<string, SourceFile>();
	/** Set of filenames that have not been processed. */
	private readonly _unprocessedSources = new Set<string>();
	/** Set of filename/id pairs */
	private readonly _sourceIds = new PairSet<string, string>();
	/** Map of filenames to source update results that have not been persisted yet. */
	private readonly _modifiedSources = new Map<string, SourceFile.UpdateResult>();
	/** Current project data. */
	private _data: Project.Data = Project.Data.createEmpty();
	/** Indicator if the project data has been modified. */
	private _dataModified = false;

	public get data() {
		return this._data;
	}

	public set data(value: Project.Data) {
		this._data = value;
		this._dataModified = false;
	}

	public updateSource(source: SourceFile) {
		this._sources.set(source.filename, source);
		this._unprocessedSources.add(source.filename);
		this._sourceIds.setKey(source.filename, source.ids());
	}

	public removeSource(filename: string) {
		this._sources.delete(filename);
		this._unprocessedSources.delete(filename);
		this._sourceIds.deleteKey(filename);
		this._modifiedSources.delete(filename);
	}

	public verify() {
		if (this._modifiedSources.size > 0 || this._dataModified) {
			throw new Error("unhandled modifications");
		}

		let valid = true;

		const verifiedIds = new Set<string>();
		for (const source of this._sources.values()) {
			if (!source.verify({
				verifyPair: (id, value) => {
					if (verifiedIds.has(id)) {
						// TODO: Emit diagnostic.
						return false;
					}
					verifiedIds.add(id);

					if (!(id in this._data.values) || this._data.values[id].value !== value) {
						// TODO: Emit diagnostic.
						return false;
					}

					return true;
				}
			})) {
				valid = false;
			}
		}

		for (const id in this._data.values) {
			if (!verifiedIds.has(id)) {
				// TODO: Emit diagnostic.
				valid = false;
			}
		}

		return valid;
	}

	public async processSources(context: Project.SourceProcessingContext) {
		// Update sources:
		let nextId = 0;
		const updatedIds = new Set<string>();

		for (const filename of this._unprocessedSources) {
			let source = this._sources.get(filename)!;
			const result = source.update({
				updateId: id => {
					if (id === undefined || updatedIds.has(id)) {
						do {
							id = String(nextId++);
						} while (this._sourceIds.hasValue(id) || updatedIds.has(id));
					}
					updatedIds.add(id);
					return id;
				}
			});
			if (result.changed) {
				this._modifiedSources.set(filename, result);
			}
			this._unprocessedSources.delete(filename);
		}

		// Write changed sources to disk and adjust project data:
		for (const [filename, result] of this._modifiedSources) {
			await context.writeSource(filename, result.sourceText);
			this._modifiedSources.delete(filename);

			for (const [id, value] of result.values) {
				if (value !== undefined && Project.Data.updateValue(this._data, id, value)) {
					this._dataModified = true;
				}
			}
			this._sourceIds.setKey(filename, result.values.keys());
		}

		// Remove values from project data that do not exist anymore:
		for (const id in this._data.values) {
			if (!this._sourceIds.hasValue(id)) {
				delete this._data.values[id];
				this._dataModified = true;
			}
		}

		// Write modified project data to disk:
		if (this._dataModified) {
			await context.writeProjectData(this._data);
			this._dataModified = false;
		}
	}

	public async compile() {
		if (this._modifiedSources.size > 0 || this._dataModified) {
			throw new Error("unhandled modifications");
		}

		const resources = new Map<string, Project.LanguageResources>();

		const { values } = this._data;
		for (const id in values) {
			const { translations, lastModified } = values[id];
			const lastModifiedTime = Date.parse(lastModified);
			for (const name in translations) {
				let language = resources.get(name);
				if (language === undefined) {
					language = Project.LanguageResources.createEmpty();
					resources.set(name, language);
				}
				if (lastModifiedTime <= Date.parse(translations[name].lastModified)) {
					Project.LanguageResources.setValue(language, this.config.namespace, id, translations[name].value);
				}
			}
		}

		// TODO: For application builds, add external language resources.

		return { resources };
	}
}

export namespace Project {
	export interface SourceProcessingContext {
		writeSource(filename: string, sourceText: string): Promise<void> | void;
		writeProjectData(data: Project.Data): Promise<void> | void;
	}

	export interface CompileResult {
		readonly resources: Map<string, LanguageResources>;
	}

	export interface Translation {
		value: string;
		lastModified: string;
	}

	export interface TranslationSet extends Translation {
		translations: { [language: string]: Translation };
	}

	export interface Data {
		values: { [id: string]: TranslationSet };
	}

	export namespace Data {
		export function createEmpty(): Data {
			return {
				values: Object.create(null)
			};
		}

		export function updateValue(data: Data, id: string, value: string) {
			if (id in data.values) {
				if (data.values[id].value !== value) {
					data.values[id].value = value;
					data.values[id].lastModified = new Date().toISOString();
					return true;
				}
			} else {
				data.values[id] = {
					value,
					lastModified: new Date().toISOString(),
					translations: {}
				};
				return true;
			}
			return false;
		}
	}

	export interface LanguageResources {
		[namespace: string]: {
			[id: string]: string;
		};
	}

	export namespace LanguageResources {
		export function createEmpty(): LanguageResources {
			return Object.create(null);
		}

		export function setValue(resources: LanguageResources, namespace: string, id: string, value: string) {
			let namespaceObj = resources[namespace];
			if (namespaceObj === undefined) {
				namespaceObj = Object.create(null);
				resources[namespace] = namespaceObj;
			}
			namespaceObj[id] = value;
		}
	}
}
