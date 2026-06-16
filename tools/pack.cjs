// biome-ignore-all lint/suspicious/noConsole: intended logging

const fs = require("node:fs");
const path = require("node:path");
const { ZipArchive } = require("archiver");

const MCADDON_FILENAME = "mcbedrock-give-xtra.mcaddon";
const OUTPUT_DIRECTORY_NAME = "_temp_mcaddon_directory";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BEHAVIOR_PACK_PATH = path.join(PROJECT_ROOT, "behavior_pack");
const RESOURCE_PACK_PATH = path.join(PROJECT_ROOT, "resource_pack");
const OUTPUT_DIRECTORY_PATH = path.join(PROJECT_ROOT, OUTPUT_DIRECTORY_NAME);
const BEHAVIOR_PACK_OUTPUT_DIRECTORY_PATH = path.join(OUTPUT_DIRECTORY_PATH, "behavior_pack");
const RESOURCE_PACK_OUTPUT_DIRECTORY_PATH = path.join(OUTPUT_DIRECTORY_PATH, "resource_pack");

const SKIP_DIRECTORIES = ["source"];

async function copyDirectory(source, destination) {
	await fs.promises.mkdir(destination, { recursive: true });
	for (const entry of await fs.promises.readdir(source, { withFileTypes: true })) {
		const name = entry.name;
		const sourcePath = path.join(source, name);
		const destinationPath = path.join(destination, name);
		if (entry.isDirectory()) {
			if (SKIP_DIRECTORIES.includes(name)) continue;
			await copyDirectory(sourcePath, destinationPath);
		} else {
			await fs.promises.copyFile(sourcePath, destinationPath);
		}
	}
}

async function createZip(sourceDir, outputFilePath) {
	return new Promise((resolve, reject) => {
		const output = fs.createWriteStream(outputFilePath);
		const archive = new ZipArchive({ zlib: { level: 9 } });

		output.on("close", resolve);
		archive.on("error", reject);

		archive.pipe(output);
		archive.directory(sourceDir, false);
		archive.finalize();
	});
}

async function build() {
	try {
		await fs.promises
			.rm(OUTPUT_DIRECTORY_PATH, { force: true, recursive: true })
			.catch(() => {});

		console.log(`Starting build in: ${PROJECT_ROOT}`);
		console.log("Cleaning up old output directory...");
		await fs.promises.rm(OUTPUT_DIRECTORY_PATH, { force: true, recursive: true });

		console.log(`Creating temporary directory at: ${OUTPUT_DIRECTORY_PATH}`);
		await copyDirectory(BEHAVIOR_PACK_PATH, BEHAVIOR_PACK_OUTPUT_DIRECTORY_PATH);
		await copyDirectory(RESOURCE_PACK_PATH, RESOURCE_PACK_OUTPUT_DIRECTORY_PATH);
		/* No longer copying files from root directory. None are needed.
		await copyDirectory(PROJECT_ROOT, OUTPUT_DIRECTORY_PATH);
		*/
		console.log("Successfully copied files.");

		const zipFilePath = path.join(PROJECT_ROOT, MCADDON_FILENAME);
		console.log(`Zipping contents to ${MCADDON_FILENAME}...`);
		await createZip(OUTPUT_DIRECTORY_PATH, zipFilePath);
		console.log(`Successfully created ${MCADDON_FILENAME}.`);

		console.log("Deleting temporary output directory...");
		await fs.promises.rm(OUTPUT_DIRECTORY_PATH, { force: true, recursive: true });
		console.log("Cleanup complete.");

		console.log("\nBuild finished successfully!");
	} catch (error) {
		console.error("\nAn error occurred during the build process:");
		console.error(error);
		process.exit(1);
	}
}

build();
