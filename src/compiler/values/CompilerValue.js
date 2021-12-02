const assert = require("assert");
const { CompilerNode } = require("../CompilerNode");
const {
  ITEMS
} = require("../symbols")
const CompilerValue = exports.CompilerValue = class CompilerValue extends CompilerNode {
  [ITEMS]=()=>[this];

}
