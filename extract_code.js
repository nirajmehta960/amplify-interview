import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Configuration: Folders and files to IGNORE
const IGNORE_DIRS = [
    'node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 'coverage',
    '.next', '.nuxt', 'out', 'bin', 'obj', '.fvm', 'vendor'
];

const IGNORE_FILES = [
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock',
    '.DS_Store', 'Thumbs.db', '.env', '.env.local', '.gitignore'
];

// Configuration: Binary/Media extensions to skip (TEXT ONLY)
// Note: .svg has been removed from here so it is now included as code.
const BINARY_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
    '.pdf', '.exe', '.dll', '.so', '.zip', '.tar', '.gz',
    '.mp4', '.mp3', '.wav', '.mov', '.ttf', '.woff', '.woff2', '.eot'
];

const OUTPUT_FILENAME = 'full_codebase_output.txt';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function isTextFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return !BINARY_EXTENSIONS.includes(ext);
}

function shouldIgnore(entryName) {
    return IGNORE_DIRS.includes(entryName) || IGNORE_FILES.includes(entryName);
}

// Recursive function to walk through directories
function walkDir(currentPath, allFiles = []) {
    const entries = fs.readdirSync(currentPath);

    for (const entry of entries) {
        if (shouldIgnore(entry)) continue;

        const fullPath = path.join(currentPath, entry);
        let stats;

        try {
            stats = fs.statSync(fullPath);
        } catch (err) {
            console.error(`Could not read stats for ${fullPath}: ${err.message}`);
            continue;
        }

        if (stats.isDirectory()) {
            walkDir(fullPath, allFiles);
        } else if (stats.isFile()) {
            if (isTextFile(fullPath)) {
                allFiles.push(fullPath);
            }
        }
    }
    return allFiles;
}

function run() {
    console.log("--- Codebase Extractor for Mac ---");
    rl.question('Drag and drop your project folder here (or type path): ', (inputPath) => {

        let basePath = inputPath.trim();

        // MAC FIX: Remove backslash escapes sometimes added by drag-and-drop
        // Converts "My\ Folder" to "My Folder"
        basePath = basePath.replace(/\\ /g, ' ');

        // Remove surrounding quotes if they exist
        basePath = basePath.replace(/^"|"$/g, '').replace(/^'|'$/g, '');

        if (!basePath) {
            basePath = process.cwd(); // Default to current folder if empty
        }

        if (!fs.existsSync(basePath)) {
            console.error(`\nError: The path "${basePath}" does not exist.`);
            rl.close();
            return;
        }

        console.log(`\nScanning directory: ${basePath}...`);

        try {
            const allFiles = walkDir(basePath);
            console.log(`Found ${allFiles.length} files. Extracting text...`);

            const writeStream = fs.createWriteStream(OUTPUT_FILENAME);

            allFiles.forEach((filePath) => {
                const relativePath = path.relative(basePath, filePath);

                try {
                    const content = fs.readFileSync(filePath, 'utf8');

                    const header = `\n\n${'='.repeat(80)}\n` +
                        `FILE PATH: ${relativePath}\n` +
                        `${'='.repeat(80)}\n\n`;

                    writeStream.write(header);
                    writeStream.write(content);
                } catch (err) {
                    console.error(`Failed to read file: ${relativePath}`);
                }
            });

            writeStream.end();
            console.log(`\nSuccess! Created: ${path.join(process.cwd(), OUTPUT_FILENAME)}`);

        } catch (error) {
            console.error('An error occurred:', error.message);
        }

        rl.close();
    });
}

run();
