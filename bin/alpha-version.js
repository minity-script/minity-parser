#!/usr/bin/env node
const print = console['log']
const { writeFileSync } = require("fs")
const { resolve } = require('path')
const pkgPath = resolve(__dirname, "..", "package.json");
const pkg = require(pkgPath)
var version = pkg.version = pkg.version.replace(/\d+$/, $ => ++$)
print(version)
