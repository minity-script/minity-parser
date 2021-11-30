const assert = require("assert");
const {
  OUTPUT,
  VALUE,
  ITEMS,
  PROPS
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue")
const { LiteralValue } = require("./Literal")


const LiteralArray = exports.LiteralArray = class LiteralArray extends LiteralValue {
  constructor({ items, ...rest }) {
    super(rest)
    this.items = items.flatMap(it=>it[ITEMS]())
  }
  [VALUE] = {
    ...this[VALUE],
    'array': () => this.items.map(it=>it.get('value')),
    'value': () => this.get('array')
  };
  [OUTPUT] = {
    ...this[OUTPUT],
    'nbt': () => '[' + this.items.map(it => it.output('nbt')).join(',') + ']',
    'json': () => '[' + this.items.map(it => it.output('json')).join(',') + ']',
  }
}



const LiteralObject = exports.LiteralObject = class LiteralObject extends LiteralValue {

  constructor({ props, ...rest }) {
    super(rest)
    //console.log(props)
    this.props = props.flatMap(it=>it[PROPS]())
  };
  [VALUE] = {
    'object': () => {
      const ret = {};
      for (const { key, value } of this.props) {
        ret[key.get('string')] = value.get('value')
      }
      return ret;
    },
    'value': () => this.get('object')
  };
  [OUTPUT] = {
    ...this[OUTPUT],
    'nbt': () => '{' + this.props.map(it => (
      it.key.output('nbt') + ":" + it.value.output('nbt')
    )).join(',') + '}',
    'block_states': () => '[' + this.props.map(it => (
      it.key.output('nbt') + "=" + it.value.output('nbt')
    )).join(',') + ']',
    'json': () => '{' + this.props.map(it => (
      it.key.output('json') + ":" + it.value.output('json')
    )).join(',') + '}',
  }
}

const SpreadObject = exports.SpreadObject = class SpreadObject extends CompilerValue {
  constructor({ right, ...rest }) {
    super(rest);
    this.right = right;
  };
  [PROPS] = () => this.right.props
}

const SpreadArray = exports.SpreadArray = class SpreadArray extends CompilerValue {
  constructor({ right, ...rest }) {
    super(rest);
    this.right = right;
  };
  [ITEMS] = () => this.right.items
}
