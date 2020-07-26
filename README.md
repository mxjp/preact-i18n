![Logo Splash](./resources/logo-splash.png)

# Preact I18n
Developer friendly full stack localization for preact apps.<br>
*This is a proof of concept and things might break or change at any time.*

+ [Getting Started](#getting-started)
+ [Text Components](#text-components)
    + [Pluralization](#pluralization)
    + [Interpolation](#interpolation)
    + [Formatting](#formatting)
+ [Namespacing & Context](#namespacing--context)
+ [Translation Workflow](#translation-workflow)
+ [Advanced Topics](#advanced-topics)
    + [Language context](#language-context)
    + [Update handlers](#update-handlers)

<br>



# Getting Started
```bash
npm i -D @mpt/preact-i18n
```

## Configuration
The configuration for a package is stored in a json5 file `i18n.json5`
```js
{
    // Translation data storage path:
    projectData: "./i18n-data.json",

    // The namespace for this package.
    // It is recommended to use the npm package name as namespace.
    namespace: "~",

    // An array of globs whre to find jsx/tsx source files.
    sources: [
        "src/**"
    ],

    // The output path for compiled language resources:
    // "[lang]" is replaced with the language tag.
    output: "dist/lang/[lang].json",

    // The language, sources are written in:
    sourceLanguage: "en",

    // An array of languages this package is translated to.
    // Default is an empty array.
    languages: ["de", "ch"]
}
```

## Runtime Setup
It is recommended to move the runtime configuration to a separate module:
```tsx
import { I18n, Language, languageFactory } from "@mpt/preact-i18n";

export const i18n = new I18n({
    // A set of clients that are used to fetch language resources:
    clients: [
        new FetchClient()
    ],

    // Include the default language factory to
    // support pluralization and interpolation:
    languageFactory,

    // When enabled, the document root "lang" attribute
    // will be set to the current language name.
    setLangAttribute: true,

    // The following options should match your configuration:
    namespace: "~",
    sourceLanguage: "en"
});

// Export text fragment components:
export const T = i18n.T;
export const TX = i18n.TX;
```

## Usage
```tsx
import { h, render } from "preact";
import { Language } from "@mpt/preact-i18n";
import { i18n, T } from "./i18n";

// Always set the language before rendering anything:
// Otherwise all text fragments will be empty.
await i18n.setLanguageAuto(["en", "de", "ch"], "en");

render(
    <Language.Provider use={i18n}>
        <T value="Hello World!" id="0"/>
    </Language.Provider>,
    document.body
);
```

<br>



# Text Components
There are two types of text components. `<T>` for simple text and `<TX>` for more complex things.
```tsx
<T value="Hello World!" />
// Hello World!
```

## Pluralization
```tsx
<TX value={["Apple", "Apples"]} count={3} />
// Apples

<TX value={["Apple", "Apples"]} count={1} />
// Apple

<TX value={["{count} apple", "{count} apples"]} count={7} />
// 7 apples
```
The number of forms depends on the language. You can lookup the number in [plurals.json5](./resources/plurals.json5).

## Interpolation
```tsx
<TX value="Hello {name}!" fields={{ name: "World" }} />
// Hello World!
```

### Escaping `{` and `}`
Escaping is not supported, but you can add two simple fields for that purpose if needed:
```tsx
<TX value="class {name} {<} ... {>}" fields={{ "<": "{", ">": "}", name: "Example" }} />
// class Example { ... }
```

## Formatting
Formatters are functions that are used by text components to format interpolated values.
```ts
new I18n({
    formatters: new Map([
        [Date.prototype, (value: any, language: Language, format?: string) => {
            return value.toLocaleString(language.name);
        }],

        ["hex", (value: number | bigint) => {
            return value.toString(16);
        }]
    ])
});

<TX value="The current date is {now}" fields={{ now: new Date() }} />
// The current date is 7/19/2020, 6:15:33 PM

<TX value="The memory address is {address,hex}" fields={{ address: 0xE2740C980AC100B0n }} />
// The memory address is E2740C980AC100B0
```
Formatters are selected as follows:
+ If a formatter name is specified (e.g. `hex`), that formatter is used.
+ If the value is an object, the formatter is selected based on the prototype chain.
+ If the primitive type is not `"string"`, the formatter is selected based on the primitive type.
+ Else, the value is converted using `String(value)`

<br>



# Namespacing & Context
When writing a package with components, you don't want your translations to collide with others.
To prevent that, you can create an `I18nContext` that provides text fragment components that automatically look up translations using a different namespace:
```tsx
import { createContext } from "@mpt/preact-i18n";

const { T, TX } = createContext({
    // The following options should match your configuration:
    namespace: "~",
    sourceLanguage: "en",

    // Additional formatters that are only available to this context:
    formatters: ...
});

export { T, TX };
```

<br>



# Translation Workflow

## Command Line
```bash
# Start translation workflow:
preact-i18n start

# Run diagnostics and compile translations:
preact-i18n compile
```

## Writing Translations
Translations are written by editing the project's translation data file (`i18n-data.json`)<br>
It is recommended to use a specialized editor for writing translations like [this vscode extension](https://marketplace.visualstudio.com/items?itemName=mxjp.preact-i18n-vscode).

<br>



# Advanced Topics

## Language context
The language context is used to pass the current language instance to text components.<br>
This can be used to set the `lang` attribute on the root element of your component if the component is beeing used in an application over which you have no control.
```tsx
import { Language } from "@mpt/preact-i18n";

<Language.Consumer>{language => {
    return <div lang={language?.name}>
        ...
    </div>;
}</Language.Consumer>
```

## Update handlers
Update handlers can be used to detect when the current language has been changed.<br>
This is used by the `I18n` class internally if `setLangAttribute` is true:
```tsx
i18n.addUpdateHandler(() => {
    if (i18n.language) {
        document.documentElement.lang = i18n.language.name;
    }
});
```

<br>

