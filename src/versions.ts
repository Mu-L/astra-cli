import chalk from "chalk";
import nameparse from "./helpers/nameparse.ts";
import semver from "semver";
import log from "signale";
import got, { RequestError } from "got";
import { cache } from "./helpers/cache.ts";
export default async function versions() {
	let res: Record<string, unknown> = {};
	try {
		res = (await got(
			"https://api.github.com/repos/astracompiler/binaries/releases/latest",
			{
				headers: {
					"User-Agent": "AstraCLI",
				},
				cache: {
					get: (key: string) => cache.get(key),
					set: (key: string, value: unknown) => cache.set(key, value),
					delete: (key: string) => cache.delete(key),
					clear: () => cache.clear(),
				},
			},
		).json()) as Record<string, unknown>;
	} catch (err) {
		if (err instanceof RequestError) {
			if (err.code === "ENOTFOUND") {
				log.error(
					"Could not connect to GitHub. Please check your internet connection.",
				);
				process.exit(1);
			}
			log.error("Request failed!");
			log.error("We don't know what happened... Maybe this helps:");
			log.error(
				`Error code: ${err.response?.statusCode} (${err.response?.statusMessage})`,
			);
			log.error(
				`Axios error code (try googling "node http error ${err.code}"): ${err.code}`,
			);
		}
	}
	const assetNames: string[] = [];
	assetNames.push(
		...(res.assets as { name: string }[]).map((asset) => asset.name),
	);
	const versions = assetNames.map(nameparse);
	versions.sort((a, b) => semver.compare(b.version, a.version));

	for (const version of versions) {
		let platform: string;
		switch (version.os) {
			case "win":
				platform = chalk.blue("Windows");
				break;
			case "linux":
				platform = chalk.green("Linux");
				break;
			case "macos":
				platform = chalk.magenta("macOS");
				break;
			default:
				platform = chalk.red("???");
		}
		console.log(
			`${chalk.green(version.version)} ${platform} ${chalk.gray(version.arch)} ${version.isLTS ? chalk.green("LTS") : ""}`,
		);
	}
}
