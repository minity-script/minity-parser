const assert = require("assert");
const { LiteralString } = require("./LiteralScalar");
const {
  OUTPUT,
  CONVERT,
  ITEMS,
  PROPS
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue");

const ResLoc = exports.ResLoc = class ResLoc extends CompilerValue {
  constructor({ ns, nameParts, ...rest }) {
    super(rest)
    this.ns = ns;
    this.name = nameParts.map(it=>it.get('string')).join("/")
  };
  getNs = def => {
    return this.ns ? this.ns.get('string') : (def || this.frame.ns)
  };
  [CONVERT] = {
    'BlockSpec': ()=> {
      const { BlockSpec } = require("./BlockSpec");
      return BlockSpec.createFrom(this,{resloc:this})
    },
  };
  [OUTPUT] = {
    'resloc': () => `${this.getNs()}:${this.name}`,
    'resloc_mc': () => `${this.getNs('minecraft')}:${this.name}`,
    'resloc_or_tag': () => this.output('resloc'),
    'resloc_or_tag_mc': () => this.output('resloc_mc'),
    'data_source': () => `storage ${this.output('resloc')}`
  };
}

exports.ResTag = class ResTag extends ResLoc {
  [OUTPUT] = {
    'restag': () => `#${this.getNs()}:${this.name}`,
    'restag_mc': () => `#${this.getNs('minecraft')}:${this.name}`,
    'resloc_or_tag': () => this.output('restag'),
    'resloc_or_tag_mc': () => this.output('restag_mc')
  };
}