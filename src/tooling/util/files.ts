import { join, relative } from "path";
import { readdir } from "fs/promises";
import { watch } from "chokidar";
import * as createMatcher from "picomatch";

export async function * findFiles(cwd: string, patterns: string[]): AsyncGenerator<string> {
	const matchers = patterns.map(pattern => createMatcher(pattern));
	const bases = patterns.map(pattern => {
		// Types for .scan are incorrect.
		return (createMatcher.scan as any)(pattern).base;
	});
	yield * (async function * traverse(filename: string): AsyncGenerator<string> {
		const names = await readdir(filename).catch(error => {
			if (error?.code !== "ENOTDIR") {
				throw error;
			}
		});
		if (names === undefined) {
			if (matchers.some(m => m(relative(cwd, filename)))) {
				yield filename;
			}
		} else {
			for (const name of names) {
				const child = join(filename, name);
				const rel = relative(cwd, child);
				if (matchers.some(m => m(rel)) || bases.some(b => !/^\.\.($|[\\\/])/.test(relative(rel, b)))) {
					yield * traverse(child);
				}
			}
		}
	})(cwd);
}

export function watchFiles(cwd: string, patterns: string[], action: (changed: string[], deleted: string[]) => Promise<void>) {
	const changed = new Set<string>();
	const deleted = new Set<string>();

	let currentAction: Promise<void> | null = null;

	const watcher = watch(patterns, {
		cwd,
		ignoreInitial: true
	});

	function runAction() {
		if (!currentAction) {
			const changedArray = Array.from(changed);
			changed.clear();
			const deletedArray = Array.from(deleted);
			deleted.clear();
			currentAction = action(changedArray, deletedArray).catch(error => {
				console.error(error);
			}).then(() => {
				currentAction = null;
				if (changed.size > 0 || deleted.size > 0) {
					runAction();
				}
			});
		}
	}

	watcher.on("error", error => {
		console.error(error);
	});

	watcher.on("add", filename => {
		deleted.delete(filename);
		changed.add(filename);
		runAction();
	});

	watcher.on("change", filename => {
		deleted.delete(filename);
		changed.add(filename);
		runAction();
	});

	watcher.on("unlink", filename => {
		changed.delete(filename);
		deleted.add(filename);
		runAction();
	});

	return async () => {
		await watcher.close();
		await currentAction;
	};
}
