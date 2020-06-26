
export function code(code: string) {
	let indentation: number | undefined = undefined;
	return code.split(/\r?\n/g).map(line => {
		if (indentation === undefined) {
			const match = /^(\s*)(.*)$/.exec(line);
			if (match && match[2]) {
				indentation = match[1].length;
			}
		}
		return line.slice(indentation);
	}).join("\n").trim();
}
