exports.randomString = ()=>Math.random().toString(36).substr(2)

const assert = require("assert");
const {readdirSync, statSync, existsSync} = require("fs");
const { relative, dirname, basename, resolve, extname, isAbsolute } = require("path");

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

exports.resolveModulePath = (from,to) => {
  assert(isAbsolute(to) || to.startsWith("."), "Relative paths must begin with '.'");
  var path = resolve(dirname(from),to)
  if (!existsSync(path)) {
    path+=".minity"
  } else  {
    const entry = statSync(path,{throwIfNoEntry:false})
    if (entry.isDirectory()) path=resolve(path,"index.minity");
  }
  //console.log({from,to,path})
  assert(existsSync(path),"module not found: "+path)
  return path;
}