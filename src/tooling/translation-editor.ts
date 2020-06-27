
// Integrated editing workflow:
// + IDE watches project configs and source files.
// + When a file is viewed and there is a corresponding source file:
//   + The IDE should check if the project is in sync.
//   + The IDE may display meta information for every text fragment that has an id.
//   + When the user selects one or more text fragments with ids,
//     + The IDE fetches translation sets (and updates on demand when the project data has been updated)
//       and allows the user to edit translations values.
//     + The IDE maintains a set of id/sourceLastModified/language/value tuples that have been changed by the user.
//     + When the user wants to save translations (or the IDE automatically saves changes):
//     + The IDE checks, if the project data has been changed since last load and reloads it if needed.
//     + The IDE updates all change tuples where the sourceValue/sourceLocation still matches the current one.
//     + The IDE saves project data to disk and discards all chage tuples.

import { Project } from "./project";

export class TranslationEditor {
	public constructor(public readonly project: Project) {
	}

	private readonly _updates = new Map<string, Map<string, TranslationUpdate>>();

	public set(id: string, language: string, value: string) {
		let updates = this._updates.get(id);
		if (!updates) {
			this._updates.set(id, updates = new Map());
		}
		const translationSet = this.project.data.values[id];
		updates.set(language, {
			sourceLastModified: translationSet ? translationSet.lastModified : undefined,
			value
		});
	}

	public applyUpdates() {
		const now = Project.Data.now();
		const values = this.project.data.values;
		for (const [id, updates] of this._updates) {
			const translationSet = values[id];
			if (translationSet) {
				for (const [language, update] of updates) {
					if (update.sourceLastModified === translationSet.lastModified) {
						translationSet.translations[language] = {
							value: update.value,
							lastModified: now
						};
					}
				}
			}
		}

		this._updates.clear();
	}

	public discardUpdates() {
		this._updates.clear();
	}
}

interface TranslationUpdate {
	readonly sourceLastModified: string | undefined;
	readonly value: string;
}
