
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


const { GenericNode,ValueNode,InstructionNode } = require("./TreeNode");
const { Result } = require("./Result");
const { Frame } = require("./Frame");

const minity = {
  Result,
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
        const node = new GenericNode(...args);
        return node;
      },
      V: (...args) => {
        const node = new ValueNode(...args);
        return node;
      },
      I: (...args) => {
        const node = new InstructionNode(...args);
        return node;
      }
    })
    const ret = minity.transform(tree,{...rest});
    return ret;
  },
  compileFile(file,{...rest}) {
    try {
      const text = readFileSync(file, { encoding: "utf8" });
      return minity.compile(text,{file,grammarSource:file,...rest});
    } catch (e) {
      e.file ??= file;
      if (e.location) e.location.file ??= file;
      throw(e);
    }
  }
}

Object.assign(module.exports,{...minity});