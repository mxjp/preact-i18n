import { h, createContext, ComponentChildren, Component } from "preact";
import { I18n } from "./controller";

const context = createContext<Language | null>(null);

export class Language {
	public constructor(options: Language.Options) {
		this.name = options.name;
		this.resources = options.resources || {};
	}

	public readonly name: string;
	public resources: Language.Resources;

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

	public t(namespace: string, id: string): string | undefined {
		return this.resources[namespace]?.[id];
	}
}

export namespace Language {
	export interface Options {
		readonly name: string;
		readonly resources?: Resources;
	}

	export interface Resources {
		[namespace: string]: {
			[id: string]: string;
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
