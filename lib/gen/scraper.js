const path      = require("path");
const fs        = require("fs");
const cheerio   = require("cheerio");

// Slightly modified from: https://stackoverflow.com/questions/25460574/find-files-by-extension-html-under-a-folder-in-nodejs
function findHTML(sourcePath, filter, callback){

    if(!fs.existsSync(sourcePath)){
        console.log(`No Dir at ${sourcePath}`);
        return;
    }

    let files = fs.readdirSync(sourcePath); // reads the contents of the src directory
    files.forEach( (file) => {
        let filePath = path.join(sourcePath, file); // Remember: the Path includes the File Name & extension / 'filter'
        let stat = fs.lstatSync(filePath);  // 'Provides information abt a file' -> see if File or Dir.

        if(stat.isDirectory()){
            findHTML(filePath, filter, callback); // recurse
        }
        else if(filePath.indexOf(filter) != -1){
            callback(filePath);
            //console.log(`--found: ${filePath}`);
        };
    });
}

function discriminate(path, filter){
    let isPresent = false;

    if(Array.isArray(filter)){
        for(let i = 0; i < filter.length; i++){
            let currFilter = filter[i];

            if(path.indexOf(currFilter) != -1){
                isPresent = true;
                break;
            }
        }
    } else {
        if(path.indexOf(filter) != -1){
            isPresent = true;
        }
    }

    return isPresent;
}

// Sync. File-folder scraper.
module.exports = {
    getMetadata: function(directoryPath, ignoredFileNames){
        let metadata = [];

        findHTML(directoryPath, '.html', (filePath) => {
            if(discriminate(filePath, ignoredFileNames))
                return;

            // Cheerio Metadata scraping from: https://www.codepedia.org/ama/how-to-get-the-title-of-a-remote-web-page-using-javascript-and-nodejs
            let $ = cheerio.load( fs.readFileSync(filePath) );

            let pageData = {
                pagePath        : path.basename(filePath),
                title           : $("title").text(),
                metaDescription : $("meta[name=description]").attr("content"),
                date            : $("meta[name=date]").attr("content"),

                tags            : $("meta[name=keywords]").attr("content"),
            }

            metadata.push(pageData);
        });

        //console.table(metadata);

        return metadata;
    },
}