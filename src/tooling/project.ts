import { SourceFile } from "./source-file";
import { PairSet } from "./util/pair-set";

export class Project {
	/** Map of filenames to source instances. */
	private readonly _sources = new Map<string, SourceFile>();
	/** Set of filenames that have not been processed. */
	private readonly _unprocessedSources = new Set<string>();
	/** Set of filename/id pairs */
	private readonly _sourceIds = new PairSet<string, string>();
	/** Map of filenames to source update results that have not been persisted yet. */
	private readonly _modifiedSources = new Map<string, SourceFile.UpdateResult>();

	// TODO: Api for setting project data loaded from disk.

	public updateSource(source: SourceFile) {
		this._sources.set(source.filename, source);
		this._unprocessedSources.add(source.filename);
		this._sourceIds.setKey(source.filename, source.extract().pairs.keys());
	}

	public removeSource(filename: string) {
		this._sources.delete(filename);
		this._unprocessedSources.delete(filename);
		this._sourceIds.deleteKey(filename);
		this._modifiedSources.delete(filename);
	}

	public processSources() {
		let nextId = 0;
		const assignedIds = new Set<string>();

		// TODO: Extract and update project data.

		for (const filename of this._unprocessedSources) {
			const source = this._sources.get(filename)!;
			const result = source.update({
				updateId: id => {
					if (id === undefined || this._sourceIds.valueHasOtherKeys(id, filename)) {
						while (this._sourceIds.hasValue(String(nextId)) || assignedIds.has(String(nextId))) {
							nextId++;
						}
						id = String(nextId);
					}
					assignedIds.add(id);
					return id;
				}
			});
			if (result.changed) {
				this._modifiedSources.set(filename, result);
			}
		}

		this._unprocessedSources.clear();
	}

	public async handleModified() {
		// TODO: Invoke hooks for modified sources.
		// TODO: Invoke hook for modified project data.
		this._modifiedSources.clear();
	}
}
