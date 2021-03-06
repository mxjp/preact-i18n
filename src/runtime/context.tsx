import { h } from "preact";
import { Language } from "./language";
import { Formatter } from "./interpolation";

export interface I18nContext {
	readonly T: I18nContext.T;
	readonly TX: I18nContext.TX;
}

export namespace I18nContext {
	export interface Options {
		readonly namespace?: string;
		readonly sourceLanguage?: string;
		readonly formatters?: Map<any, Formatter>;
	}

	export interface T {
		(props: TProps): h.JSX.Element;
	}

	export interface TProps {
		readonly id?: string;
		readonly value: string;
	}

	export interface TX {
		(props: TXProps): h.JSX.Element;
	}

	export type TXProps = {
		readonly id?: string;
		readonly fields?: Language.InterpolationFields;
	} & ({
		readonly value: string;
	} | {
		readonly value: string[];
		readonly count: number;
	});

	export function create(options: Options = {}): I18nContext {
		const namespace = options.namespace || "~";
		const sourceLanguage = options.sourceLanguage || "en";

		function T(props: TProps): h.JSX.Element {
			return <Language.Consumer>{language => {
				if (language === null || props.id === undefined) {
					return "";
				}
				return language.name === sourceLanguage ? props.value : language.t(namespace, props.id);
			}}</Language.Consumer>;
		}

		function TX(props: TXProps): h.JSX.Element {
			return <Language.Consumer>{language => {
				if (language === null || props.id === undefined) {
					return "";
				}
				let value = language.name === sourceLanguage ? props.value : language.t(namespace, props.id);
				if (value === undefined) {
					return "";
				}
				if ("count" in props) {
					value = language.pluralize(value as string[], props.count);
				}
				const fields = (props.fields === undefined && ("count" in props)) ? { count: props.count } : props.fields;
				if (fields) {
					value = language.interpolate(value as string, fields, options.formatters);
				}
				return value;
			}}</Language.Consumer>;
		}

		return { T, TX };
	}
}
