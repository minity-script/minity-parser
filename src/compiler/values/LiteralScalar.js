const assert = require("assert");
const {
  OUTPUT,
  VALUE,
  CONVERT
} = require("../symbols");

const { CompilerValue } = require("./CompilerValue")
const { LiteralValue } = require("./Literal")

const LiteralScalar = exports.LiteralScalar = class LiteralScalar extends LiteralValue {
  constructor({ value, ...rest }) {
    super(rest);
    this.value = value;
    //console.log('STRING',{value})
  }
  [VALUE] = {
    'string': () => String(this.value),
  };
  [OUTPUT] = {
    ...this[OUTPUT],
    'json': () => JSON.stringify(this.value)
  };
}

const LiteralNumber = exports.LiteralNumber = class LiteralNumber extends LiteralScalar {
  [VALUE] = {
    ...this[VALUE],
    'string': () => String(this.value),
    'number': () => +this.value,
    'value': () => +this.value,
    'int': () => (0 | this.value),
    'float': () => +this.value,
    'boolean': () => !!this.value,
  };
  [OUTPUT] = {
    ...this[OUTPUT],
    'int': () => JSON.stringify(0 | this.value),
    'float': () => JSON.stringify(+this.value),
    'number': () => JSON.stringify(+this.value),
    'boolean': () => JSON.stringify(!!this.value),
    'string': () => JSON.stringify(String(this.value)),
  }
}

const LiteralFloat = exports.LiteralFloat = class LiteralFloat extends LiteralNumber {
  [OUTPUT] = {
    ...this[OUTPUT],
    'nbt': () => this.value + ((0 | this.value) == this.value ? 'f' : '')
  };
}

const LiteralInt = exports.LiteralInt = class LiteralInt extends LiteralNumber {
  [OUTPUT] = {
    ...this[OUTPUT],
    'nbt': () => this.value,
  };
}

const LiteralDouble = exports.LiteralDouble = class LiteralDouble extends LiteralNumber {
  [OUTPUT] = {
    ...this[OUTPUT],
    'nbt': () => this.value + 'd',
  };
}

const LiteralLong = exports.LiteralLong = class LiteralLong extends LiteralInt {
  [OUTPUT] = {
    ...this[OUTPUT],
    'nbt': () => this.value + 'l',
  };
}

const LiteralShort = exports.LiteralShort = class LiteralShort extends LiteralInt {
  [OUTPUT] = {
    ...this[OUTPUT],
    'nbt': () => this.value + 'l',
  };
}

const LiteralByte = exports.LiteralByte = class LiteralByte extends LiteralNumber {
  [OUTPUT] = {
    ...this[OUTPUT],
    'nbt': () => this.value + 'b',
  };
}

const LiteralBoolean = exports.LiteralBoolean = class LiteralBoolean extends LiteralNumber {
  [OUTPUT] = {
    ...this[OUTPUT],
    'nbt': () => +!!this.value + 'b',
  };
}

const LiteralString = exports.LiteralString = class LiteralString extends LiteralScalar {
  [VALUE] = {
    ...this[VALUE],
    'string': () => String(this.value),
    'value': () => this.get('string'),
  };
  [OUTPUT] = {
    ...this[OUTPUT],
    'nbt': () => {
      const { value } = this
      if (value.match(/^[a-z_][a-z0-9_]*$/i)) return value
      return JSON.stringify(value)
    }
  };
  [CONVERT] = {
    ...this[CONVERT],
    'ResTag': () => {
      const { ResTag } = require("./ResLoc");
      const match = this.get('string').match(/^#(\w+:)?(\w+(?:[/]\w+)*)$/);
      if (!match) return false;
      const [,ns,name] = match;
      return ResTag.createFrom(this,{
        ns:ns && LiteralString.createFrom(this, { value:ns }),
        nameParts:name.split('/').map(value=>LiteralString.createFrom(this,{value}))
      })
    },
    'ResLoc': () => {
      const { ResLoc } = require("./ResLoc");
      const match = this.get('string').match(/^(\w+:)?(\w+(?:[/]\w+)*)$/);
      if (!match) return false;
      const [,ns,name] = match;
      return ResLoc.createFrom(this,{
        ns:ns && LiteralString.createFrom(this, { value:ns }),
        nameParts:name.split('/').map(value=>LiteralString.createFrom(this,{value}))
      })
    },
  };
  
}

exports.FunctionJson = class FunctionJson extends CompilerValue {
  constructor({arg,...rest}) {
    super(rest)
    this.arg=arg
  }
  [VALUE] = {
    'string': () => this.arg.output('json'),
    'value': () => this.get('string'),
  };
  [OUTPUT] = {
    'string': () => "'"+this.get('string')
      .split(/([^'\\]+|\\.|')/)
      .map(t => t == "'" ? "\\'" : t)
      .join("")+"'",
    'nbt': () => this.output('string'),
    'json': () => JSON.stringify(this.get('string')),
  };
}

exports.FunctionSnbt = class FunctionSnbt extends CompilerValue {
  constructor({arg,...rest}) {
    super(rest)
    this.arg=arg
  }
  [VALUE] = {
    'string': () => this.arg.output('nbt'),
    'value': () => this.get('string'),
  };
  [OUTPUT] = {
    'string': () => "'"+this.get('string')
      .split(/([^'\\]+|\\.|')/)
      .map(t => t == "'" ? "\\'" : t)
      .join("")+"'",
    'nbt': () => this.output('string'),
    'json': () => JSON.stringify(this.get('string')),    
  };
}
