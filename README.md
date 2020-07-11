# Preact I18n

## Status
This is a proof of concept and things like context and pluralization are not yet supported.

## Installation
```bash
npm i -D @mpt/preact-i18n
```

<br>



# Getting Started

## Configuration
```js
// i18n.json5
{
    // Translation data storage path:
    projectData: "./i18n-data.json",

    // The namespace for this application/library.
    // It is recommended to use the npm package name as namespace.
    namespace: "~",

    // An array of globs whre to find jsx/tsx source files.
    sources: [
        "src/**"
    ],

    // The output path for compiled language resources:
    // "[lang]" is replaced with the language code.
    output: "dist/lang/[lang].json",

    // The language, sources are written in:
    sourceLanguage: "en",

    // An array of languages this package is translated to.
    // Default is an empty array.
    languages: ["de", "ch"]
}
```

## Context
Every application or library has it's own localization context that defines things like the namespace.
The context also exposes the text fragment component that translates texts inside the namespace.
```ts
// src/i18n.ts

import { I18nContext } from "@mpt/preact-i18n";

const { T, TX } = I18nContext.create({
    // The namespace of this package:
    namespace: "~",
    // The language, sources are written in:
    sourceLanguage: "en"
});

export { T, TX };
```

## Controller
Every application has a localization controller that manages language resources at runtime.<br>
This controller can be used by the `Language.Provider` component that passes the current language down to text fragment components.
```tsx
// src/app.tsx
import { I18n, FetchClient } from "@mpt/preact-i18n";

const i18n = new I18n({
    clients: [
        new FetchClient({
            path: "lang/[lang].json"
        })
    ]
});
```

Before rendering any translated UI, you should set the language.<br>
`setLanguageAuto` detects the preferred language from the browser to use with a fallback.
```tsx
// src/app.tsx
import { h, render } from "preact";
import { Language } from "@mpt/preact-i18n";
import { T } from "./i18n";

await i18n.setLanguageAuto(["en", "de", "ch"], "en");

render(<Language.Provider use={i18n}>
    <h1><T value="Hello World!" id="0"/></h1>
</Language.Provider>, document.body);
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
```
The number of forms depends on the language. You can lookup the number in [plurals.json5](./resources/plurals.json5).

## Interval Plurals
Interval plurals are not yet supported.

## Interpolation
```tsx
<TX value={["{count} apple", "{count} apples"]} count={7} fields={{ count: 7 }} />
// 7 apples

<TX value="Hello {name}!" fields={{ name: "World" }} />
// Hello World!
```
Note, that interpolation braces have no effect if the fields property is undefined.

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
