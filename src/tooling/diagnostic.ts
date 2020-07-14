
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

export function getDiagnosticMessage(diagnostic: Diagnostic) {
	switch (diagnostic.type) {
		case Diagnostic.Type.MissingTranslation:
			return `Translation for fragment #${diagnostic.id} for language "${diagnostic.language}" is missing.`;

		case Diagnostic.Type.OutdatedTranslation:
			return `Translation for fragment #${diagnostic.id} for language "${diagnostic.language}" is outdated.`;

		case Diagnostic.Type.UnconfiguredTranslatedLanguage:
			return `Fragment #${diagnostic.id} is translated to the language "${diagnostic.language}" that is not configured for this project.`;

		case Diagnostic.Type.UnknownLanguagePlural:
			return `Pluralization for language "${diagnostic.language}" is not supported.`;

		case Diagnostic.Type.TranslationTypeMissmatch:
			return `Translation value type for fragment #${diagnostic.id} for language "${diagnostic.language}" is incorrect.`;

		case Diagnostic.Type.PluralFormCountMissmatch:
			return `Value for fragment #${diagnostic.id} for language "${diagnostic.language}" has a wrong number of plural forms.`;
	}
}
