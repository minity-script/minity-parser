const assert = require("assert");
const {
  ASSIGN_TYPE,
  ASSIGN_GET,
  ASSIGN_SET,
  ASSIGN,
  OUTPUT
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue");

exports.Selector = class Selector extends CompilerValue {
  [OUTPUT] = {
    selector: () => this.spec.format(),
    selector_single: () => {
      assert(this.spec.isSingle,"must select single entity")
    }
  };
  
  constructor({spec,...rest}) {
    super(rest);
    this.spec=spec
  }
}