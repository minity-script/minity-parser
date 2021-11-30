

const { transformers } = require("./nodeTransformers");
const { Compiler } = require("./compiler");
const { MinityError } = require("./utils");

const TreeNode = exports.TreeNode = class TreeNode {
  constructor($, location) {
    this.$ = $
    this.location = location
  }
}

const GenericNode = exports.GenericNode = class GenericNode extends TreeNode {
  constructor($, location, props) {
    super($, location)
    Object.assign(this, props);
    this.transformer = transformers[this.$];
    if (!this.transformer) {
      throw new MinityError("no transformer for " + this.$, this.location);
    }
  }
  transform = (frame, ...args) => {
    try {
      return this.transformer(this, frame, ...args)
    } catch (e) {
      e.location ??= this.location;
      throw (e)
    }
  }
}

const ValueNode = exports.ValueNode = class ValueNode extends TreeNode {
  constructor($, location, children, values) {
    if(!location.file) throw new MinityError("WTF",location)
    super($, location)

    this.children = children
    this.values = values
    this.ValueClass = Compiler[this.$]
    if (!this.ValueClass) {
      throw new MinityError("no value class for " + this.$, this.location);
    }
  }
  transform = (frame, ...args) => {
    try {
      const { children, values, location } = this;
      const args = {}
      for (const id in children) {
        const child = children[id];
        if (Array.isArray(child)) {
          if (id=='nameParts') {
            //console.log(child)
          }
          args[id] = child.map(grandchild=>grandchild&&frame.transform(grandchild))
        }
        else args[id] = child && frame.transform(child)
      }

      for (const id in values) {
        args[id] = values[id]
      }
      const it = this.ValueClass.create({frame, location, ...args})
      it.doDeclare && it.doDeclare()
      return it
    } catch (e) {
      e.location||=this.location;
      throw(e)
    }
  }
}

const InstructionNode = exports.InstructionNode = ValueNode