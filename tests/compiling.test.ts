import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import build from "../src/build.ts";
import install from "../src/install.ts";
import versions from "../src/versions.ts";
import init from "../src/init.ts";
import got from "got";
import { platform } from "node:os";
let skipping = false;

describe(
	"compiling",
	() => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		beforeAll(async function (this: any) {
			try {
				if ((await got("https://api.github.com")).statusCode !== 200) {
					console.log(
						"GitHub API is not reachable. Rate limit exceeded or network issue.",
					);
					skipping = true;
				}
			} catch (error) {
				console.log(
					"GitHub API is not reachable. Rate limit exceeded or network issue.",
				);
				skipping = true;
			}
			fs.rmSync("temp", { recursive: true, force: true });
			execSync("yarn build");
			fs.mkdirSync("temp");
			fs.mkdirSync("temp/hello-i-am-a-folder");
			fs.writeFileSync(
				"temp/test.esm.ts",
				"import log from'console';log('Hello world!');",
			);
			fs.writeFileSync(
				"temp/test.cjs.ts",
				"const {log}=require('console');log('Hello world!');",
			);
			fs.writeFileSync("temp/im-not-a-js-ts-file", "Hello world!");
			if (!process.env.CI) {
				await install({
					ver: "node_v22.15.1-win-x64",
				});
			}
		}, 1000 * 120);

		(skipping ? it.skip : it)("esm compiling", async () => {
			await build({
				entry: "temp/test.esm.ts",
				outDir: "temp",
				node: "node_v22.15.1-win-x64",
				disShasumCheck: false,
				noMetadata: platform() !== "win32",
			});
		});

		(skipping ? it.skip : it)("cjs compiling", async () => {
			await build({
				entry: "temp/test.cjs.ts",
				outDir: "temp",
				node: "node_v22.15.1-win-x64",
				disShasumCheck: false,
				noMetadata: platform() !== "win32",
			});
		});

		(skipping ? it.skip : it)("should throw do not exists error", async () => {
			const spy = vi.spyOn(process, "exit").mockImplementation((code) => {
				throw new Error(`exit ${code}`);
			});

			await expect(
				build({
					entry: "temp/i-do-not-exist.ts",
					outDir: "temp/b.exe",
					node: "node_v22.15.1-win-x64",
					disShasumCheck: false,
					noMetadata: true,
				}),
			).rejects.toThrow("exit 1");

			spy.mockRestore();
		});

		(skipping ? it.skip : it)(
			"should throw error if entry is not defined",
			async () => {
				const spy = vi.spyOn(process, "exit").mockImplementation((code) => {
					throw new Error(`exit ${code}`);
				});

				await expect(
					build({
						// @ts-ignore
						entry: undefined,
						outDir: "temp/b.exe",
						node: "node_v99.99.99-win-x64",
						disShasumCheck: false,
						noMetadata: true,
					}),
				).rejects.toThrow("exit 1");

				spy.mockRestore();
			},
		);

		(skipping ? it.skip : it)(
			"should throw not a js/ts file error",
			async () => {
				const spy = vi.spyOn(process, "exit").mockImplementation((code) => {
					throw new Error(`exit ${code}`);
				});

				await expect(
					build({
						entry: "temp/im-not-a-js-ts-file",
						outDir: "temp/b.exe",
						node: "node_v22.15.1-win-x64",
						disShasumCheck: false,
						noMetadata: true,
					}),
				).rejects.toThrow("exit 1");

				spy.mockRestore();
			},
		);

		(skipping ? it.skip : it)("should throw not a file error", async () => {
			const spy = vi.spyOn(process, "exit").mockImplementation((code) => {
				throw new Error(`exit ${code}`);
			});

			await expect(
				build({
					entry: "temp/hello-i-am-a-folder",
					outDir: "temp/b.exe",
					node: "node_v22.15.1-win-x64",
					disShasumCheck: false,
					noMetadata: true,
				}),
			).rejects.toThrow("exit 1");

			spy.mockRestore();
		});

		(skipping ? it.skip : it)(
			"should show avaliable node versions",
			async () => {
				await expect(versions()).resolves.not.toThrow();
			},
		);

		(skipping ? it.skip : it)("should create config file", async () => {
			const spy = vi.spyOn(process, "cwd").mockReturnValue("temp");
			const spy2 = vi
				.spyOn(process, "exit")
				.mockImplementation((() => {}) as typeof process.exit);
			expect(() => init()).not.toThrow();
			if (!fs.existsSync("temp/astra.config.js")) {
				expect(true).toBe(false); // Crash if config file does not exist
			}
			fs.rmSync("temp/astra.config.js");
			spy.mockRestore();
			spy2.mockRestore();
		});

		(skipping ? it.skip : it)(
			"should crash beacuse i didn't provide all arguments",
			async () => {
				const spy = vi.spyOn(process, "exit").mockImplementation((code) => {
					throw new Error(`exit ${code}`);
				});

				await expect(
					// @ts-ignore
					build({
						entry: "temp/hello-i-am-a-folder",
						node: "node_v22.15.1-win-x64",
						disShasumCheck: false,
						noMetadata: true,
					}),
				).rejects.toThrow("exit 1");

				spy.mockRestore();
			},
		);

		// (skipping ? it.skip : it)("should throw error if config file already exists", async () => {
		// 	const spy = vi.spyOn(process, "cwd").mockReturnValue("temp");
		// 	const spy2 = vi.spyOn(process, "exit").mockImplementation((code) => {
		// 		throw new Error(`exit ${code}`);
		// 	});

		// 	expect(() => init()).not.toThrow();
		// 	await expect(() => init()).rejects.toThrow("exit 0");

		// 	spy2.mockRestore();

		// 	fs.rmSync("temp/astra.config.js");
		// 	spy.mockRestore();
		// 	spy2.mockRestore();
		// });
	},
	1000 * 120,
);

afterAll(() => {
	fs.rmSync("temp", { recursive: true, force: true });
});
