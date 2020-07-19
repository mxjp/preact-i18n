import { h, createContext, ComponentChildren, Component } from "preact";
import { I18n } from "./controller";
import { I18nContext } from "./context";
import { Formatter, FormatterMap } from "./interpolation";

const context = createContext<Language | null>(null);

export class Language {
	public constructor(options: Language.Options) {
		this.controller = options.controller;
		this.name = options.name;
		this.resources = options.resources || {};
		this._pluralProcessor = options.pluralProcessor;
		this._interpolationProcessor = options.interpolationProcessor;
	}

	public readonly controller: I18n;
	public readonly name: string;
	public resources: Language.Resources;

	private readonly _pluralProcessor?: Language.PluralProcessor;
	private readonly _interpolationProcessor?: Language.InterpolationProcessor;

	public addResources(resources: Language.Resources) {
		for (const ns in resources) {
			const source = resources[ns];
			const target = this.resources[ns];
			if (source === undefined) {
				this.resources[ns] = target;
			} else {
				// TODO: Emit warnings for already existing ids.
				this.resources[ns] = Object.assign({}, target, source);
			}
		}
	}

	public t(namespace: string, id: string): string | string[] | undefined {
		return this.resources[namespace]?.[id];
	}

	public pluralize(value: string[], count: number) {
		if (this._pluralProcessor === undefined) {
			throw new Error(`pluralization is not supported for language: ${this.name}`);
		}
		return this._pluralProcessor(value, count);
	}

	public interpolate(value: string, fields: Language.InterpolationFields, formatters?: FormatterMap) {
		if (this._interpolationProcessor === undefined) {
			throw new Error(`interpolation is not supported for language: ${this.name}`);
		}
		return this._interpolationProcessor(value, fields, this, formatters);
	}
}

export namespace Language {
	export interface Options {
		readonly controller: I18n;
		readonly name: string;
		readonly resources?: Resources;
		readonly pluralProcessor?: PluralProcessor;
		readonly interpolationProcessor?: InterpolationProcessor;
	}

	export interface PluralProcessor {
		(value: string[], count: number): string;
	}

	export interface InterpolationFields {
		[name: string]: any;
	}

	export interface InterpolationProcessor {
		(value: string, fields: InterpolationFields, language: Language, formatters?: Map<any, Formatter>): string;
	}

	export interface Resources {
		[namespace: string]: {
			[id: string]: string | string[];
		};
	}

	export namespace Resources {
		export function parse(data: string): Resources {
			return JSON.parse(data);
		}
	}

	export class Provider extends Component<Provider.Props, Provider.State> {
		public constructor(props?: Provider.Props) {
			super();
			this.state = {
				language: props?.use?.language || null
			};
		}

		private readonly handleLanguageChange: I18n.UpdateHandler = controller => {
			this.setState({
				language: controller.language
			});
		};

		public componentDidMount() {
			this.props.use.addUpdateHandler(this.handleLanguageChange);
		}

		public componentWillUnmount() {
			this.props.use.removeUpdateHandler(this.handleLanguageChange);
		}

		public render(props: Provider.Props, state: Provider.State) {
			return <context.Provider value={state.language}>
				{props.children}
			</context.Provider>;
		}
	}

	export namespace Provider {
		export interface Props {
			readonly children: ComponentChildren;
			readonly use: I18n;
		}

		export interface State {
			readonly language: Language | null;
		}
	}

	export const Consumer = context.Consumer;
}
