import { h, createContext, ComponentChildren, Component } from "preact";
import { I18n } from "./controller";

const context = createContext<Language | null>(null);

export class Language {
	public constructor(options: Language.Options) {
		this.name = options.name;
		this.resources = options.resources || {};
		this._pluralProcessor = options.pluralProcessor;
		this._interpolationProcessor = options.interpolationProcessor || Language.interpolate;
	}

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

	public interpolate(value: string, fields: Language.InterpolationFields) {
		if (this._interpolationProcessor === undefined) {
			throw new Error(`interpolation is not supported for language: ${this.name}`);
		}
		return this._interpolationProcessor(value, fields);
	}

	public static interpolate(value: string, fields: Language.InterpolationFields) {
		return value.replace(/(^\{|[^\\]\{)([^\}]*)\}/g, (_, pre: string, name: string) => {
			return pre.slice(0, -1) + (fields[name] || "");
		});
	}
}

export namespace Language {
	export interface Options {
		readonly name: string;
		readonly resources?: Resources;
		readonly pluralProcessor?: PluralProcessor;
		readonly interpolationProcessor?: InterpolationProcessor;
	}

	export interface PluralProcessor {
		(value: string[], count: number): string;
	}

	export interface InterpolationFields {
		[name: string]: string;
	}

	export interface InterpolationProcessor {
		(value: string, fields: InterpolationFields): string;
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
