import { SourceFile } from "./source-file";
import { PairSet } from "./utility/pair-set";
import { Config } from "./config";
import { Diagnostic } from "./diagnostic";
import { plurals } from "./plural-meta";

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
	/** Current project data. */
	private _data: Project.Data = Project.Data.createEmpty();

	public get sources(): ReadonlyMap<string, SourceFile> {
		return this._sources;
	}

	public get data() {
		return this._data;
	}

	public set data(value: Project.Data) {
		this._data = value;
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
	}

	public getSourceForId(id: string) {
		const filename = this._sourceIds.getAnyKey(id);
		if (filename) {
			return this._sources.get(filename);
		}
	}

	public verify() {
		let valid = true;

		const verifiedIds = new Set<string>();
		for (const source of this._sources.values()) {
			if (!source.verify({
				verifyPair: (id, value) => {
					if (verifiedIds.has(id)) {
						return false;
					}
					verifiedIds.add(id);

					if (!(id in this._data.values) || !Project.valueEquals(this._data.values[id].value, value)) {
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
				valid = false;
			}
		}

		return valid;
	}

	public async processSources(context: Project.SourceProcessingContext) {
		// Update sources:
		let nextId = 0;
		const updatedIds = new Set<string>();
		const updateResults = new Map<string, SourceFile.UpdateResult>();

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
			updateResults.set(filename, result);
			this._unprocessedSources.delete(filename);
		}

		// Write changed sources to disk and adjust project data:
		let dataModified = false;
		for (const [filename, result] of updateResults) {
			if (result.changed) {
				await context.writeSource(filename, result.sourceText);
			}

			updateResults.delete(filename);

			for (const [id, { value, oldId }] of result.fragments) {
				if (value !== undefined && Project.Data.updateValue(this._data, id, value, oldId)) {
					dataModified = true;
				}
			}
			this._sourceIds.setKey(filename, result.fragments.keys());
		}

		// Remove values from project data that do not exist anymore:
		for (const id in this._data.values) {
			if (!this._sourceIds.hasValue(id)) {
				Project.Data.removeValue(this._data, id);
				dataModified = true;
			}
		}

		// Write modified project data to disk:
		if (dataModified) {
			await context.writeProjectData(this._data);
		}
	}

	public async compile() {
		const resources = new Map<string, Project.LanguageResources>();

		const { values } = this._data;
		for (const id in values) {
			const { translations, lastModified } = values[id];
			const lastModifiedTime = Date.parse(lastModified);
			for (const languageName in translations) {
				let language = resources.get(languageName);
				if (language === undefined) {
					language = Project.LanguageResources.createEmpty();
					resources.set(languageName, language);
				}
				if (lastModifiedTime <= Date.parse(translations[languageName].lastModified)) {
					Project.LanguageResources.setValue(language, this.config.namespace, id, translations[languageName].value);
				}
			}
		}

		if (!resources.has(this.config.sourceLanguage)) {
			resources.set(this.config.sourceLanguage, Project.LanguageResources.createEmpty());
		}
		for (const name of this.config.languages) {
			if (!resources.has(name)) {
				resources.set(name, Project.LanguageResources.createEmpty());
			}
		}

		// TODO: For application builds, add external language resources.

		return { resources };
	}

	public getDiagnostics() {
		const diagnostics: Diagnostic[] = [];
		const { sourceLanguage, languages } = this.config;
		const languageSet = new Set(languages);

		const unknownLanguagePlurals = new Set<string>();
		function checkLanguagePlural(id: string, language: string, actualCount: number) {
			const rule = plurals.getRule(language);
			if (rule === undefined) {
				unknownLanguagePlurals.add(sourceLanguage);
			} else if (rule.forms.length !== actualCount) {
				diagnostics.push({ type: Diagnostic.Type.PluralFormCountMissmatch, id, language });
			}
		}

		const { values } = this._data;
		for (const id in values) {
			const { translations, lastModified, value } = values[id];
			const lastModifiedTime = Date.parse(lastModified);

			const valueType = Project.getValueType(value);
			if (valueType === Project.ValueType.Plural) {
				checkLanguagePlural(id, sourceLanguage, value.length);
			}

			for (const language of languages) {
				if (language in translations) {
					if (Project.getValueType(translations[language].value) !== valueType) {
						diagnostics.push({ type: Diagnostic.Type.TranslationTypeMissmatch, id, language });
					} else if (valueType === Project.ValueType.Plural) {
						checkLanguagePlural(id, language, translations[language].value.length);
					}

					if (lastModifiedTime > Date.parse(translations[language].lastModified)) {
						diagnostics.push({ type: Diagnostic.Type.OutdatedTranslation, id, language });
					}
				} else {
					diagnostics.push({ type: Diagnostic.Type.MissingTranslation, id, language });
				}
			}

			for (const language in translations) {
				if (!languageSet.has(language)) {
					diagnostics.push({ type: Diagnostic.Type.UnconfiguredTranslatedLanguage, id, language });
				}
			}
		}

		for (const language of unknownLanguagePlurals) {
			diagnostics.push({ type: Diagnostic.Type.UnknownLanguagePlural, language });
		}

		return diagnostics;
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
		value: Value;
		lastModified: string;
	}

	export interface TranslationSet extends Translation {
		translations: { [language: string]: Translation };
	}

	export interface Data {
		readonly version: 1;
		readonly values: { [id: string]: TranslationSet };
	}

	export type SimpleValue = string;
	export type PluralValue = string[];
	export type Value = SimpleValue | PluralValue;

	export enum ValueType {
		Unknown,
		Simple,
		Plural
	}

	export function getValueType(value: any) {
		if (typeof value === "string") {
			return ValueType.Simple;
		}
		if (Array.isArray(value) && value.every(v => typeof v === "string")) {
			return ValueType.Plural;
		}
		return ValueType.Unknown;
	}

	export function isId(id: any): id is string {
		return typeof id === "string";
	}

	export function valueEquals(a?: Value, b?: Value) {
		return a === b || JSON.stringify(a) === JSON.stringify(b);
	}

	export namespace Data {
		export function now() {
			return new Date().toISOString();
		}

		export function stringify(data: Data) {
			return JSON.stringify(data, null, "\t") + "\n";
		}

		export function parse(value: string): Data {
			return JSON.parse(value);
		}

		export function createEmpty(): Data {
			return {
				version: 1,
				values: Object.create(null)
			};
		}

		export function updateValue(data: Data, id: string, value: Value, oldId: string | undefined) {
			if (id in data.values) {
				if (!valueEquals(data.values[id].value, value)) {
					const translationSet = data.values[id];
					translationSet.value = value;
					translationSet.lastModified = now();
					return true;
				}
			} else {
				data.values[id] = {
					value,
					lastModified: now(),
					translations: (oldId !== undefined && valueEquals(value, data.values[oldId]?.value))
						? JSON.parse(JSON.stringify(data.values[oldId].translations))
						: Object.create(null)
				};
				return true;
			}
			return false;
		}

		export function removeValue(data: Data, id: string) {
			delete data.values[id];
		}
	}

	export interface LanguageResources {
		[namespace: string]: {
			[id: string]: Value;
		};
	}

	export namespace LanguageResources {
		export function stringify(resources: LanguageResources, minify = true) {
			return minify
				? JSON.stringify(resources)
				: JSON.stringify(resources, null, "\t") + "\n";
		}

		export function parse(value: string): LanguageResources {
			return JSON.parse(value);
		}

		export function createEmpty(): LanguageResources {
			return Object.create(null);
		}

		export function setValue(resources: LanguageResources, namespace: string, id: string, value: string | string[]) {
			let namespaceObj = resources[namespace];
			if (namespaceObj === undefined) {
				namespaceObj = Object.create(null);
				resources[namespace] = namespaceObj;
			}
			namespaceObj[id] = value;
		}
	}
}
