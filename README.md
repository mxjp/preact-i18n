# Preact Localization Stack

## Installation
```bash
npm i -D preact-i18n-stack
```

<br>



## Getting Started
TODO: Explain config and tooling
```js
// i18n.json
{
    "sources": "./src",
    "namespace": "app",
    "sourceLanguage": "en"
}
```

TODO: Explain contexts
```ts
// src/i18n.ts

import { I18nContext } from "preact-i18n-stack";

const { T } = I18nContext.create({
    namespace: "app",
    sourceLanguage: "en"
});

export { T };
```

TODO: Explain controller
```tsx
// src/app.tsx

import { h, render } from "preact";
import { I18n, Language } from "preact-i18n-stack";
import { T } from "./i18n";

const i18n = new I18n({
    languages: ["en", "de"]
});

await i18n.setLanguageAuto();

render(<Language.Provider use={i18n}>
    <h1><T value="Hello World!" id="0"/></h1>
</Language.Provider>, document.body);
```

<br>



## Writing Translations

TODO: Write a vscode extension to..
+ ..highlight text fragments with missing or outdated translations.
+ ..edit translations directly in the code view.
