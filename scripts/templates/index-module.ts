import { generatedHint } from "./generated-hint";

export const indexModule = (modules: string[]) => `${generatedHint}
${modules.map(m => `export * from "${m}";`).join("\n")}
`;
