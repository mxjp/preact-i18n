
export type Diagnostic = {
	readonly type: Diagnostic.Type.MissingTranslation;
	readonly id: string;
	readonly language: string;
} | {
	readonly type: Diagnostic.Type.OutdatedTranslation;
	readonly id: string;
	readonly language: string;
}

export namespace Diagnostic {
	export enum Type {
		MissingTranslation,
		OutdatedTranslation
	}
}
