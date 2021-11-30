const assert = require("assert");
const {
  ASSIGN_TYPE,
  ASSIGN_GET,
  ASSIGN_SET,
  ASSIGN,
  OUTPUT,
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue");

exports.Selector = class Selector extends CompilerValue {
  [OUTPUT] = {
    'selector': () => this.spec.format(),
    'selector_single': () => {
      this.assert(this.spec.isSingle,"must select single entity")
      return this.spec.format()
    },
    'test_true':() => `entity ${this.output('selector')}`,
    'data_source': () => `entity ${this.output('selector')}`
  };

  
  
  constructor({spec,...rest}) {
    super(rest);
    this.spec=spec
  }
}