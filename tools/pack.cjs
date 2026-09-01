// biome-ignore-all lint/suspicious/noConsole: intended logging

const fs = require("node:fs");
const path = require("node:path");
const { ZipArchive } = require("archiver");

const MCADDON_FILENAME = "GiveXtra.mcaddon";
const OUTPUT_DIRECTORY_NAME = "_temp_mcaddon_directory";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BEHAVIORS_DIRECTORY = path.join(PROJECT_ROOT, "behaviors");
const RESOURCES_DIRECTORY = path.join(PROJECT_ROOT, "resources");
const OUTPUT_DIRECTORY = path.join(PROJECT_ROOT, OUTPUT_DIRECTORY_NAME);
const BEHAVIOR_OUTPUT_DIRECTORY = path.join(OUTPUT_DIRECTORY, "behaviors");
const RESOURCE_OUTPUT_DIRECTORY = path.join(OUTPUT_DIRECTORY, "resources");

const SKIP_DIRECTORIES = ["source"];
const LICENSE_PATH = path.join(PROJECT_ROOT, "LICENSE.md");

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

async function copyFileToDirectory(filePath, destination) {
	await fs.promises.mkdir(destination, { recursive: true });
	const name = path.basename(filePath);
	const destinationPath = path.join(destination, name);
	await fs.promises.copyFile(filePath, destinationPath);
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
		await fs.promises.rm(OUTPUT_DIRECTORY, { force: true, recursive: true }).catch(() => {});

		console.log(`Starting build in: ${PROJECT_ROOT}`);
		console.log("Cleaning up old output directory...");
		await fs.promises.rm(OUTPUT_DIRECTORY, { force: true, recursive: true });

		console.log(`Creating temporary directory at: ${OUTPUT_DIRECTORY}`);
		await copyDirectory(BEHAVIORS_DIRECTORY, BEHAVIOR_OUTPUT_DIRECTORY);
		await copyFileToDirectory(LICENSE_PATH, BEHAVIOR_OUTPUT_DIRECTORY);
		await copyDirectory(RESOURCES_DIRECTORY, RESOURCE_OUTPUT_DIRECTORY);
		await copyFileToDirectory(LICENSE_PATH, RESOURCE_OUTPUT_DIRECTORY);
		console.log("Successfully copied files.");

		const zipFilePath = path.join(PROJECT_ROOT, MCADDON_FILENAME);
		console.log(`Zipping contents to ${MCADDON_FILENAME}...`);
		await createZip(OUTPUT_DIRECTORY, zipFilePath);
		console.log(`Successfully created ${MCADDON_FILENAME}.`);

		console.log("Deleting temporary output directory...");
		await fs.promises.rm(OUTPUT_DIRECTORY, { force: true, recursive: true });
		console.log("Cleanup complete.");

		console.log("\nBuild finished successfully!");
	} catch (error) {
		console.error("\nAn error occurred during the build process:");
		console.error(error);
		process.exit(1);
	}
}

build();
