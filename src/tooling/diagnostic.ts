
export type Diagnostic = {
	readonly type: Diagnostic.Type.MissingTranslation;
	readonly id: string;
	readonly language: string;
} | {
	readonly type: Diagnostic.Type.OutdatedTranslation;
	readonly id: string;
	readonly language: string;
} | {
	readonly type: Diagnostic.Type.UnconfiguredTranslatedLanguage;
	readonly id: string;
	readonly language: string;
} | {
	readonly type: Diagnostic.Type.UnknownLanguagePlural;
	readonly language: string;
} | {
	readonly type: Diagnostic.Type.TranslationTypeMissmatch;
	readonly id: string;
	readonly language: string;
} | {
	readonly type: Diagnostic.Type.PluralFormCountMissmatch;
	readonly id: string;
	readonly language: string;
};

export namespace Diagnostic {
	export enum Type {
		MissingTranslation,
		OutdatedTranslation,
		UnconfiguredTranslatedLanguage,
		UnknownLanguagePlural,
		TranslationTypeMissmatch,
		PluralFormCountMissmatch
	}
}
