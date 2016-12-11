/* Created by tommyZZM.OSX on 2016/12/10. */
"use strict";
const fs = require("fs");
const path = require("path");
const yargv = require("yargs").argv;
const vfs = require("vinyl-fs");
const through = require("through2");
const imageType = require('image-type');
const zip = require("gulp-zip");
const unzip = require("gulp-unzip");
const bufferIndexOf = require("buffer-indexof");
const bufferToVinyl = require("buffer-to-vinyl");
const cwd = process.cwd();
const argv = process.argv;

const identity = "|--***--|"

let [ exec , ...rest_ ] = yargv._

if (exec === "unzip") {
    unzipTarget();
} else if (exec === "zip") {
    zipTarget();
}

function unzipTarget() {
    let [ imageFile, output ] = rest_;

    let imageBuffer = fs.readFileSync(path.join(cwd,imageFile));
    let imageFileDir = path.dirname(imageFile);
    let imageFileName = path.basename(imageFile).replace(/\.[-_\w]+$/i,"");

    let archiveName = imageFileName+".zip";

    let search = bufferIndexOf(imageBuffer, identity);

    if (search<=0) return;

    let zipBuffer = imageBuffer.slice(search+identity.length,imageBuffer.length);

    return bufferToVinyl.stream(zipBuffer,archiveName)
        .pipe(unzip())
        .pipe(vfs.dest(path.join(cwd, imageFileDir, imageFileName)))

}

function zipTarget() {

    let [ zipFiles, toImage, output ] = rest_

    if (!zipFiles || !toImage || !output) {
        return;
    }

    let targetBase = path.join(cwd, zipFiles);
    let targetFiles = path.join(targetBase, "**", "*");

    let outputFileName = path.basename(output);
    let outputDirName  = path.dirname(output)

    return vfs.src(path.join(cwd,toImage))
        .pipe(through.obj((file, _, next)=>{
            //check is valid image file
            let buf = file.contents;
            let { mime } = imageType(buf);
            if (!["image/jpeg", "image/png", "image/gif"].includes(mime)){
                //TODO: throw error
                return next()
            }

            vfs.src(targetFiles).pipe(zip("_")).pipe(through.obj((zip, _, end)=>{
                file.contents = Buffer.concat([
                    buf, new Buffer(identity), zip.contents
                ]);

                let filePath = file.path;

                file.path = path.join(path.dirname(filePath),outputFileName);

                next(null, file)
                end();
            }))
        }))
        .pipe(vfs.dest(outputDirName))
}
