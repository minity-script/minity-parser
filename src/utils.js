exports.randomString = ()=>Math.random().toString(36).substr(2)

const {readdirSync} = require("fs");
const { relative, dirname, basename, resolve, extname } = require("path");

exports.walk = function walk(dir, cur = dir) {
  var ret = [];
  const entries = readdirSync (cur, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(cur, entry.name);
    if (entry.isFile()) {
      ret.push({
        path,
        rel: relative(dir, path),
        extension: extname(path),
        directory: dirname(path)
      })
    } else if (entry.isDirectory()) {
      ret = [...ret, ...walk(dir, path)]
    }
  }
  return ret;
}