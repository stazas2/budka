const fs = require('fs');
const path = require('path');

class FileSystemUtils {
    /**
     * Ensures a directory exists, creating it if necessary
     * @param {string} dirPath - Path to the directory
     * @returns {boolean} True if directory exists or was created
     */
    static ensureDirectoryExists(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`[FileSystem] Created directory: ${dirPath}`);
            }
            return true;
        } catch (error) {
            console.error(`[FileSystem] Failed to create directory ${dirPath}:`, error);
            return false;
        }
    }

    /**
     * Safely writes data to a file, ensuring the directory exists
     * @param {string} filePath - Path to the file
     * @param {string|Buffer} data - Data to write
     * @param {object} options - Write options
     * @returns {boolean} True if write was successful
     */
    static safeWriteFile(filePath, data, options = {}) {
        try {
            const dir = path.dirname(filePath);
            this.ensureDirectoryExists(dir);
            fs.writeFileSync(filePath, data, options);
            return true;
        } catch (error) {
            console.error(`[FileSystem] Failed to write file ${filePath}:`, error);
            return false;
        }
    }

    /**
     * Safely reads a file with error handling
     * @param {string} filePath - Path to the file
     * @param {object} options - Read options
     * @returns {string|null} File contents or null if error
     */
    static safeReadFile(filePath, options = {}) {
        try {
            if (!fs.existsSync(filePath)) {
                console.warn(`[FileSystem] File does not exist: ${filePath}`);
                return null;
            }
            return fs.readFileSync(filePath, options);
        } catch (error) {
            console.error(`[FileSystem] Failed to read file ${filePath}:`, error);
            return null;
        }
    }

    /**
     * List all directories in a given path
     * @param {string} dirPath - Path to search in
     * @returns {string[]} Array of directory names
     */
    static listDirectories(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                console.warn(`[FileSystem] Directory does not exist: ${dirPath}`);
                return [];
            }

            return fs.readdirSync(dirPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
        } catch (error) {
            console.error(`[FileSystem] Failed to list directories in ${dirPath}:`, error);
            return [];
        }
    }

    /**
     * List files in a directory with optional extension filter
     * @param {string} dirPath - Path to search in
     * @param {string} [extension] - Optional file extension filter
     * @returns {string[]} Array of file names
     */
    static listFiles(dirPath, extension = null) {
        try {
            if (!fs.existsSync(dirPath)) {
                console.warn(`[FileSystem] Directory does not exist: ${dirPath}`);
                return [];
            }

            let files = fs.readdirSync(dirPath, { withFileTypes: true })
                .filter(dirent => dirent.isFile())
                .map(dirent => dirent.name);

            if (extension) {
                files = files.filter(file => file.toLowerCase().endsWith(extension.toLowerCase()));
            }

            return files;
        } catch (error) {
            console.error(`[FileSystem] Failed to list files in ${dirPath}:`, error);
            return [];
        }
    }

    /**
     * Safely deletes a file or directory
     * @param {string} path - Path to delete
     * @param {object} options - Delete options (recursive, force)
     * @returns {boolean} True if deletion was successful
     */
    static safeDelete(path, options = { recursive: false, force: false }) {
        try {
            if (!fs.existsSync(path)) {
                console.warn(`[FileSystem] Path does not exist: ${path}`);
                return true;
            }

            const stats = fs.statSync(path);
            if (stats.isDirectory()) {
                fs.rmSync(path, options);
            } else {
                fs.unlinkSync(path);
            }
            return true;
        } catch (error) {
            console.error(`[FileSystem] Failed to delete ${path}:`, error);
            return false;
        }
    }

    /**
     * Copies a file or directory
     * @param {string} src - Source path
     * @param {string} dest - Destination path
     * @param {object} options - Copy options (recursive)
     * @returns {boolean} True if copy was successful
     */
    static safeCopy(src, dest, options = { recursive: false }) {
        try {
            if (!fs.existsSync(src)) {
                console.warn(`[FileSystem] Source path does not exist: ${src}`);
                return false;
            }

            const stats = fs.statSync(src);
            if (stats.isDirectory()) {
                if (!options.recursive) {
                    throw new Error('Cannot copy directory without recursive option');
                }
                this.ensureDirectoryExists(dest);
                fs.cpSync(src, dest, { recursive: true });
            } else {
                this.ensureDirectoryExists(path.dirname(dest));
                fs.copyFileSync(src, dest);
            }
            return true;
        } catch (error) {
            console.error(`[FileSystem] Failed to copy from ${src} to ${dest}:`, error);
            return false;
        }
    }

    /**
     * Gets file stats with error handling
     * @param {string} path - Path to check
     * @returns {object|null} File stats or null if error
     */
    static getFileStats(path) {
        try {
            if (!fs.existsSync(path)) {
                console.warn(`[FileSystem] Path does not exist: ${path}`);
                return null;
            }
            return fs.statSync(path);
        } catch (error) {
            console.error(`[FileSystem] Failed to get stats for ${path}:`, error);
            return null;
        }
    }
}

module.exports = FileSystemUtils;