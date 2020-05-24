import { h, ComponentChild } from "preact";
import { Language } from "./language";

export interface I18nContext {
	T(props: I18nContext.TProps): ComponentChild;
}

export namespace I18nContext {
	export interface Options {
		namespace?: string;
		sourceLanguage?: string;
	}

	export interface TProps {
		readonly id?: string;
		readonly value: string;
	}

	export function create(options: Options): I18nContext {
		const namespace = options.namespace || "default";
		const sourceLanguage = options.sourceLanguage || "en";

		function T(props: TProps): ComponentChild {
			return <Language.Consumer>{language => {
				if (language !== null && language.name !== sourceLanguage && props.id !== undefined) {
					const value = language.t(namespace, props.id);
					if (value !== undefined) {
						return value;
					}
					// TODO: Emit warning when value is undefined.
				}
				return props.value;
			}}</Language.Consumer>;
		}

		return { T };
	}
}
