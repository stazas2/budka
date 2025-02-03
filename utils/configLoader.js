module.exports.loadConfig = function() {
    const fs = require("fs");
    const path = require("path");
    const configPath = path.join(__dirname, "..", "config.json");
    if(fs.existsSync(configPath)){
         return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
    return {};
};