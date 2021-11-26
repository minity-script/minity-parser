const assert = require("assert");

const {
  OUTPUT,
  ASSIGN,
  ASSIGN_SUCCESS,
  ASSIGN_SWAP,
  ASSIGN_INC,
  ASSIGN_DEC,
  ASSIGN_ADD,
  ASSIGN_SUB,
  ASSIGN_MUL,
  ASSIGN_DIV,
  ASSIGN_MOD,
  ASSIGN_GT,
  ASSIGN_LT
} = require("../symbols");

const {CompilerValue} = require("./CompilerValue")

const ScoreboardEntry = exports.ScoreboardEntry = class ScoreboardEntry extends CompilerValue {
  constructor({ objective, target, ...rest }) {
    super(rest);
    this.objective = objective
    this.target = target
    this.code = target + " " + objective
  };

  [OUTPUT] = {
    ...super[OUTPUT],
    scoreboard: () => this.code,
    getter:() => `run scoreboard players get ${this.code}`,
  };

  [ASSIGN] = {
    integer: value => `scoreboard players set ${this.code} ${value}`,
    scoreboard: entry => `scoreboard players operation ${this.code} = ${entry}`,
    getter: getter => `execute store result score ${this.code} ${getter}`
  };

  [ASSIGN_SUCCESS] = {
    getter: getter => `execute store success score ${this.code} ${getter}`
  };
  
  [ASSIGN_INC] = () => `scoreboard players add ${this.code} 1`;
  
  [ASSIGN_DEC] = () => `scoreboard players remove ${this.code} 1`;

  [ASSIGN_ADD] = {
    integer: value => `scoreboard players add ${this.code} ${value}`,
    scoreboard: entry => `scoreboard players operation ${this.code} += ${entry}`
  };
  
  [ASSIGN_SUB] = {
    integer: value => `scoreboard players remove ${this.code} ${value}`,
    scoreboard: entry => `scoreboard players operation ${this.code} -= ${entry}`
  };

  [ASSIGN_MUL] = {
    integer: value => `scoreboard players operation ${this.code} *= ${this.frame.scoreboardConstant(value)}`,
    scoreboard: entry => `scoreboard players operation ${this.code} *= ${entry}`
  };

  [ASSIGN_DIV] = {
    integer: value => `scoreboard players operation ${this.code} /= ${this.frame.scoreboardConstant(value)}`,
    scoreboard: entry => `scoreboard players operation ${this.code} /= ${entry}`
  };

  [ASSIGN_MOD] = {
    integer: value => `scoreboard players operation ${this.code} %= ${this.frame.scoreboardConstant(value)}`,
    scoreboard: entry => `scoreboard players operation ${this.code} %= ${entry}`
  };

  [ASSIGN_LT] = {
    integer: value => `scoreboard players operation ${this.code} < ${this.frame.scoreboardConstant(value)}`,
    scoreboard: entry => `scoreboard players operation ${this.code} < ${entry}`
  };
  [ASSIGN_GT] = {
    integer: value => `scoreboard players operation ${this.code} > ${this.frame.scoreboardConstant(value)}`,
    scoreboard: entry => `scoreboard players operation ${this.code} > ${entry}`
  };
  [ASSIGN_SWAP] = {
    scoreboard: entry => `scoreboard players operation ${this.code} > ${entry}`
  };
}

exports.Variable = class Variable extends ScoreboardEntry {
  constructor({frame,name,...rest}) {
    let {objective,target} = frame.scope.vars.get(name);
    super({frame,objective,target,...rest})
    this.name = name
  }
}

exports.Score = class Score extends ScoreboardEntry {
  constructor({frame,name,...rest}) {
    let {objective} = frame.scope.scores.get(name);
    super({frame,objective,...rest})
    this.name = name
  }
}