
const {readFileSync} = require("fs");

const parser = (()=>{
  if (process.env.DEBUG) {
    const peggy = require("peggy");
    const grammar = readFileSync(__dirname + "/minity.pegjs", { encoding: "utf8" });
    return peggy.generate(grammar);
  } else {
    return require("./minity-parser.js")
  }
})()


const { TreeNode } = require("./TreeNode");
const { Result } = require("./Result");
const { Frame } = require("./Frame");

const minity = {
  Result,
  TreeNode,
  parse(text,options={}) {
    const ret =  parser.parse(text,options);
    return ret;
  },
  findError(text,{...rest}={}) {
    try {
      minity.compile(text,{checkErrors:true,...rest});
      return false;
    } catch (error) {
      return error;
    }
  },
  transform(tree, {result= new Result(),...rest}) {
    const root = new Frame.Root({result,...rest});
    root.transform(tree);
    return root.result;
  },
  compile(text, {...rest} ) {
    const tree = minity.parse(text,{
      ...rest,
      N: (...args) => {
        const node = new TreeNode(...args);
        return node;
      }
    })
    const ret = minity.transform(tree,{...rest});
    return ret;
  },
  compileFile(file,{...rest}) {
    try {
      const text = readFileSync(file, { encoding: "utf8" });
      return minity.compile(text,{file,...rest});
    } catch (e) {
      e.file ??= file;
      throw(e);
    }
  }
}

Object.assign(module.exports,{...minity});