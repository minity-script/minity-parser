const assert = require("assert");

const {
  ASSIGN,
  ASSIGN_SUCCESS,
  OUTPUT
} = require("../symbols");

const {CompilerValue} = require("./CompilerValue")

const BossBarProp = exports.BossBarProp = class BossBarProp extends CompilerValue {
  static create({ prop, ...rest }) {
    const PropClass = ({
      value: BossBarPropInt,
      max: BossBarPropInt,
      visible: BossBarPropBoolean,
      name: BossBarPropName,
      players: BossBarPropPlayers,
      style: BossBarPropStyle,
      color: BossBarPropColor
    })[prop]
    assert(PropClass,"bad bossbar prop "+prop);
    return new PropClass({prop, ...rest})
  }

  constructor({ resloc, prop, ...rest }) {
    super(rest)
    this.resloc = resloc
    this.prop = prop
    this.code = this.resloc + " " + this.prop 
  };

  [ASSIGN] = {
    
  };
}

class BossBarPropAssignable extends BossBarProp {
  [OUTPUT] = {
    getter: () => `bossbar get ${this.code}`
  };

  [ASSIGN_SUCCESS] = {
    getter: getter=> `execute store success bossbar ${this.code} run ${getter}`,
  }

  [ASSIGN] = {
    getter: getter=> `execute store result bossbar ${this.code} run ${getter}`,
    ...this[ASSIGN],
  };
}

class BossBarPropInt extends BossBarPropAssignable {
  [ASSIGN] = {
    integer: value => `bossbar set ${this.code} ${value}`,
    ...this[ASSIGN],
  }; 
}

class BossBarPropBoolean extends BossBarPropAssignable {
  [ASSIGN] = {
    boolean: value => `bossbar set ${this.code} ${value}`,
    ...this[ASSIGN],
  };
}

class BossBarPropPlayers extends BossBarProp {
  [ASSIGN] = {
    selector: selector => `bossbar set ${this.code} ${selector}`
  };
}

class BossBarPropStyle extends BossBarProp {
  [ASSIGN] = {
    token: token => `bossbar set ${this.code} ${token}`
  };
}

class BossBarPropColor extends BossBarProp {
  [ASSIGN] = {
    token: token => `bossbar set ${this.code} ${token}`
  };
}


class BossBarPropName extends BossBarProp {
  [ASSIGN] = {
    json: value => `bossbar set ${this.code} ${value}`
  };
}