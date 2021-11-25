const { readFileSync, readdirSync, statSync, rmSync, writeFileSync, cpSync, mkdirSync } = require("fs");
const { relative, dirname, basename, resolve, extname } = require("path");
const { mergeAndConcat:merge } =require('merge-anything');
const minity = require("./minity");
const { Result } = require("./Result");
const { walk } = require("./utils");
const print = console['log']
exports.Builder = class Builder {

  static scan(options) {
    const builder = new Builder(options);
    builder.scan();
    return builder.input;
  }

  static prepare(options) {
    const builder = new Builder(options);
    builder.scan();
    builder.prepare();
    const { input, output } = builder
    return { input, output };
  }

  static build(options) {
    const builder = new Builder(options);
    return builder.build();
  }


  input = {
    files: [],
  }

  output = {
    json: {},
    mcfunction: {},
    other: {},
    constants: {}
  }

  result = new Result;

  constructor(options) {
    const { description, path, entryPoint, copyDirectories, buildDirectory } = options;
    this.description =description || basename(path);
    this.projectDirectory = path;
    this.entryPoint = entryPoint;
    this.copyDirectories = copyDirectories;
    this.buildDirectory = buildDirectory
  }

  scan() {
    for (const path of this.copyDirectories) {
      const files = walk(resolve(path));
      for (const { path, rel, extension } of files) {
        this.input.files.push({rel,path});
      }
    }
  }

  mergeJson(dest, obj) {
    const { output } = this;
    if (output.json[dest]) {
      output.json[dest] = merge(output.json[dest], obj)
    } else {
      output.json[dest] = obj
    }
  }


  prepare() {
    const { input, output } = this;
    for (const { rel, path } of input.files) {
      const dest = resolve(this.buildDirectory, rel);
      output.other[dest] = path;
    }
    
    minity.compileFile(this.entryPoint, { result: this.result });
    print("\n  "+this.entryPoint+" compiled OK.")
  }

  build() {
    this.scan();
    this.prepare();
    this.write();
    return this.output;
  }

  write() {
    let copied = 0;
    let wrote = 0;
    const { buildDirectory, projectDirectory, output } = this;
    if (this.checkTo()) {
      rmSync(buildDirectory, { recursive: true });
    };
    mkdirSync(buildDirectory, { recursive: true });
    writeFileSync(resolve(buildDirectory, ".minity.fecit"), "", { encoding: "utf8" })
    for (const dest in output.other) {
      const path = output.other[dest];
      copied++
      //console.log('copying', relative(projectDirectory, path))
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(path, dest);
    }
    for (const file of this.result.files) {
      //console.log("writing", resolve(buildDirectory, file.dest));
      wrote++
      file.write(buildDirectory);
    }
    writeFileSync(resolve(buildDirectory,"pack.mcmeta"),JSON.stringify({
      "pack": {
          "pack_format": 8,
          "description": this.description
      }
    },null,2),{encoding:"utf-8",recursive:true})
    print(`  Copied ${copied} files, wrote ${wrote} files.`)
  }

  checkTo() {
    const { buildDirectory } = this;
    const entry = statSync(buildDirectory, { throwIfNoEntry: false });
    if (!entry) return false;
    if (!entry.isDirectory()) {
      throw new Error("Destination exists, but is not a directory: " + buildDirectory)
    };
    const isMinityDirectory = !!statSync(resolve(buildDirectory, ".minity.fecit"), { throwIfNoEntry: false });
    if (!isMinityDirectory) {
      throw new Error("Destination exists, but was not built with minity: " + buildDirectory)
    };
    return true;
  }
}
