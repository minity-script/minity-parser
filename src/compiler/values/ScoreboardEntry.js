const assert = require("assert");

const {
  OUTPUT,
  TEST_EQ,
  TEST_NEQ,
  TEST_LT,
  TEST_LTE,
  TEST_GT,
  TEST_GTE,
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
    'scoreboard': () => this.code,
    'getter':() => `run scoreboard players get ${this.code}`,
    'test_false': () => `score ${this.code} matches 0`
  };

  [ASSIGN] = {
    'int': value => `scoreboard players set ${this.code} ${value}`,
    'scoreboard': entry => `scoreboard players operation ${this.code} = ${entry}`,
    'getter': getter => `execute store result score ${this.code} ${getter}`
  };

  [ASSIGN_SUCCESS] = {
    'getter': getter => `execute store success score ${this.code} ${getter}`
  };
  
  [ASSIGN_INC] = () => `scoreboard players add ${this.code} 1`;
  
  [ASSIGN_DEC] = () => `scoreboard players remove ${this.code} 1`;

  [ASSIGN_ADD] = {
    'int': value => `scoreboard players add ${this.code} ${value}`,
    'scoreboard': entry => `scoreboard players operation ${this.code} += ${entry}`
  };
  
  [ASSIGN_SUB] = {
    'int': value => `scoreboard players remove ${this.code} ${value}`,
    'scoreboard': entry => `scoreboard players operation ${this.code} -= ${entry}`
  };

  [ASSIGN_MUL] = {
    'int': value => `scoreboard players operation ${this.code} *= ${this.frame.scoreboardConstant(value)}`,
    'scoreboard': entry => `scoreboard players operation ${this.code} *= ${entry}`
  };

  [ASSIGN_DIV] = {
    'int': value => `scoreboard players operation ${this.code} /= ${this.frame.scoreboardConstant(value)}`,
    'scoreboard': entry => `scoreboard players operation ${this.code} /= ${entry}`
  };

  [ASSIGN_MOD] = {
    'int': value => `scoreboard players operation ${this.code} %= ${this.frame.scoreboardConstant(value)}`,
    'scoreboard': entry => `scoreboard players operation ${this.code} %= ${entry}`
  };

  [ASSIGN_LT] = {
    'int': value => `scoreboard players operation ${this.code} < ${this.frame.scoreboardConstant(value)}`,
    'scoreboard': entry => `scoreboard players operation ${this.code} < ${entry}`
  };
  [ASSIGN_GT] = {
    'int': value => `scoreboard players operation ${this.code} > ${this.frame.scoreboardConstant(value)}`,
    'scoreboard': entry => `scoreboard players operation ${this.code} > ${entry}`
  };
  [ASSIGN_SWAP] = {
    'scoreboard': entry => `scoreboard players operation ${this.code} > ${entry}`
  };

  [TEST_EQ] = {
    'int': value => `score ${this.code} matches ${value}`,
    'scoreboard': entry => `score ${this.code} = ${entry}`
  };
  [TEST_GT] = {
    'int': value => `score ${this.code} matches ${+value+1}..`,
    'scoreboard': entry => `score ${this.code} > ${entry}`
  };
  [TEST_GTE] = {
    'int': value => `score ${this.code} matches ${value}..`,
    'scoreboard': entry => `score ${this.code} >= ${entry}`
  };
  [TEST_LT] = {
    'int': value => `score ${this.code} matches ..${+value-1}`,
    'scoreboard': entry => `if score ${this.code} < ${entry}`
  };
  [TEST_LTE] = {
    'int': value => `score ${this.code} matches ..${value}`,
    'scoreboard': entry => `score ${this.code} <= ${entry}`
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
  constructor({frame,left,right,...rest}) {
    const name = right.get('string');
    let {objective} = frame.scope.scores.get(name);
    const target = left.output('selector')
    super({frame,objective,target,...rest})
    this.name = name
  }
}