
const { rawTags } = require("./rawTags");
const { Selector, SelectorUUID } = require("./Selector");
const { randomString } = require("./utils");
const assert = require("assert");
const { Compiler } = require("./compiler");
const print = console["log"]
const transformers = exports.transformers = {
  file: ({ namespaces }, { T }) => {
    namespaces.map(T);
  },
  DeclareNamespace: ({ ns, statements }, { T, declareNamespace }) => {
    const fn = declareNamespace(ns, statements);
    fn.addTag("minecraft", "load");
    return "";
  },
  DeclareEvent({ trigger, conditions, then }, { T, ns, declareEvent, addBlock }) {
    const id = randomString();
    const block = addBlock([
      ...T(then).getCode(),
      `advancement revoke @s only ${ns}:${id}`
    ])

    declareEvent(id, T(trigger), T(conditions), block.resloc);
    return "";
  },
  string_lit: ({ value }, { Nbt }) => Nbt(String(value)),
  number_lit: ({ value, suffix }, { Nbt }) => {
    return Nbt(+value, suffix)
  },
  boolean_lit: ({ value }, { Nbt }) => Nbt(!!value),
  object_lit: ({ members }, { T, Nbt, toJson }) => {
    //console.log(members)

    const ret = Nbt({});
    for (const { name, value } of members) {
      ret[Nbt(name)] = Nbt(value);
      //console.log(name,JSON.stringify(ret))
    }
    return ret;
  },
  string_json: ({ value }, { Nbt, toJson }) => {
    return Nbt(JSON.stringify(Nbt(value)), true);
  },
  string_snbt: ({ value }, { Nbt, toNbt }) => {
    return Nbt(toNbt(value), true);
  },
  array_value: ({ value }, { T }) => [T(value)],
  array_spread: ({ array }, { T }) => T(array),
  array_lit: ({ items }, { T, Nbt }) => {
    let values = items.map(T).flat()
    return Nbt(values)
  },
  template_lit: ({ parts }, { T, Nbt }) => Nbt(parts.map(Nbt).join("")),


  arg: ({ name }, { scope }) => scope.getArg(name),

  selector_spec: ({ initial, conditions }, { T, toNbt }) => {
    const spec = T(initial);
    for (const c of conditions) T(c, { spec });
    return spec
  },
  selector_uuid: ({ uuid }, T) => new SelectorUUID(T(uuid)),
  selector: ({ spec }, { T }) => T(spec).format(),
  selector_single: ({ spec }, { T, toNbt }) => {
    const it = T(spec);
    assert(it.isSingle, "Selector must select a single entity")
    return it.format();
  },
  selector_optional: ({ spec }, { T, toNbt }) => {
    if (spec) return T(spec).format();
    return new Selector("s").format();
  },
  selector_initial: ({ initial }) => new Selector(initial),
  selector_initial_type: ({ type }, { T }) => new Selector(T(type)),
  cond_tag: ({ op, tag }, { T }, { spec }) => spec[op]("tag", T(tag).id),
  cond_brackets: ({ name, op, value }, { T }, { spec }) => {
    //if (!value) console.log(name,op,value)
    spec[op](name, T(value))
  },
  cond_brackets_lit: ({ name, op, value }, { T }, { spec }) => {
    spec[op](name, value)
  },
  cond_brackets_score: ({ name, value }, { T, scope }, { spec }) => {
    const score = scope.objectives.get(T(name));
    spec.score(score.objective, T(value))
  },
  cond_brackets_nbt: ({ name, op, value }, { T, toNbt }, { spec }) => {
    spec[op](name, toNbt(value))
  },
  cond_brackets_pair: ({ name, value }, { T, toNbt }) => T(name) + "=" + T(value),
  cond_brackets_braces: ({ items }, { T, toNbt }) => "{" + items.map(T).join(",") + "}",


  item_spec: ({ resloc, nbt }, { T, toNbt }) => `${T(resloc)}${nbt ? toNbt(nbt) : ""}`,
  block_state: ({ name, value }, { T }) => T(name) + "=" + T(value),
  block_states: ({ states }, { T }) => "[" + states.map(T).join(",") + "]",
  block_spec: ({ resloc, states, nbt }, { T, O, toNbt }) => `${T(resloc)}${O(states)}${nbt ? toNbt(nbt) : ""}`,
  
  test_block: ({ spec }, { T }) => `block ~ ~ ~ ${T(spec)}`,
  test_block_pos: ({ pos, spec }, { T }) => `block ${T(pos)} ${T(spec)}`,
  test_predicate: ({ resloc }, { T }) => `predicate ${T(resloc)}`,
  
  resname: ({ parts }, { T }) => parts.map(T).join("/"),
  resloc(node, { T, ns }) {
    return (node.ns ? T(node.ns) : ns) + ":" + T(node.name);
  },
  resloc_mc(node, { T }) {
    return (node.ns ? T(node.ns) : "minecraft") + ":" + T(node.name);
  },
  restag(node, { T, ns }) {
    return '#' + (node.ns ? T(node.ns) : ns) + ":" + T(node.name);
  },
  restag_mc(node, { T }) {
    return '#' + (node.ns ? T(node.ns) : "minecraft") + ":" + T(node.name);
  },


  range: ({ from, to }, { T }) => `${T(from)}..${T(to)}`,
  range_from: ({ from }, { T }) => `${T(from)}..`,
  range_to: ({ to }, { T }) => `..${T(to)}`,
  range_gt_int: ({ from }, { Nbt }) => `${Nbt(from) + 1}..`,
  range_lt_int: ({ to }, { Nbt }) => `..${Nbt(to) - 1}`,
  range_gt: ({ from }, { Nbt }) => `${Nbt(from) + 0.000001}..`,
  range_lt: ({ to }, { Nbt }) => `..${Nbt(to) - 0.000001}`,


  cmd_summon: ({ pos, type, nbt, then }, { T, anonFunction, Nbt, toNbt }) => {
    if (!then) return `summon ${T(type)} ${pos ? T(pos) : "~ ~ ~"} ${nbt ? toNbt(nbt) : ''}`
    const tag = "--minity--internal-summoned"
    nbt = Nbt(nbt || {});
    nbt.Tags = [...nbt.Tags || [], tag];
    return anonFunction([
      `summon ${T(type)} ${pos ? T(pos) : "~ ~ ~"} ${nbt ? toNbt(nbt) : ''}`,
      `execute as @e[tag=${tag}] run ${anonFunction([
        `tag @s remove ${tag}`,
        ...T(then).getCode()
      ])}`
    ])
  },
  cmd_give: ({ selector, count, item }, { toNbt, T }) => {
    return `give ${T(selector)} ${T(item)} ${toNbt(count ?? 1)}`
  },
  cmd_clear: ({ selector, count, item }, { toNbt, T }) => {
    count = count ? toNbt(count) : "";
    return `clear ${T(selector)} ${T(item)} ${count}`
  },
  cmd_setblock: ({ pos, block }, { T }) => {
    return `setblock ${pos ? T(pos) : "~ ~ ~"} ${T(block)}`
  },


  var_id: ({ name }, { T, scope }) => scope.vars.get(name).code(),
  score_id: ({ holder, id }, { T, scope }) => scope.scores.get(T(id)).code(T(holder)),
  constant_id: ({ value }, { constantId, Nbt }) => constantId(Nbt(value)),


  datapath: ({ spec }, { T }) => {
    const { type, id, path } = T(spec);
    return `${type} ${id} ${path}`
  },
  datapath_var: ({ path }, { T, ns }) => ({ type: "storage", id: `${ns}:zzz_minity_vars`, path: T(path) }),
  datapath_storage: ({ name, path }, { T }) => ({ type: "storage", id: T(name), path: T(path) }),
  datapath_entity: ({ selector, path }, { T }) => ({ type: "entity", id: T(selector), path: T(path) }),
  datapath_block: ({ position, path }, { T }) => ({ type: "block", id: T(position), path: T(path) }),
  
  nbt_path: ({ path }, { T }) => path.map(T).join(""),
  nbt_path_root: ({ name, match }, { T }) => [name, match].filter(Boolean).map(T).join(""),
  nbt_path_member: ({ name, match }, { T }) => "." + [name, match].filter(Boolean).map(T).join(""),
  nbt_path_list: () => "[]",
  nbt_path_list_element: ({ index }, { T }) => (`[${T(index)}]`),
  nbt_path_list_match: ({ match }, { toNbt }) => `[${toNbt(match)}]`,
  nbt_path_match: ({ match }, { toNbt }) => `${toNbt(match)}`,

  template_chars: ({ chars }) => chars,
  template_parts: ({ parts }, { T }) => parts.map(T).join(""),
  template_expand_arg: ({ name }, { toNbt, Nbt, scope }) => Nbt(scope.getArg(Nbt(name))),
  template_expand_tag: ({ name }, { T, scope }) => scope.tags.get(T(name)).code(),
  template_expand_var: ({ name }, { T, scope }) => scope.vars.get(T(name)).code(),
  template_expand_score: ({ name }, { T, scope }) => scope.scores.get(T(name)).objective,
  template_expand_value: ({ value }, { Nbt }) => {
    return JSON.stringify(Nbt(value))
  },
  template_expand_score_id: ({ id }, { T }) => (T(id)),
  template_expand_selector: ({ selector }, { T }) => T(selector),
  template_expand_coords: ({ coords }, { T }) => T(coords),

  raw_line: ({ parts }, { T }) => parts.map(T),
  raw_expand_var: ({ name }, { T, Nbt, scope }) => {
    const { objective, target } = scope.vars.get(T(name))
    return Nbt({ score: { objective, name: target } })
  },
  raw_expand_score_id: ({ holder, id }, { T, Nbt, scope }) => Nbt({
    score: {
      objective: scope.objectives.get(T(id)).objective,
      name: Nbt(T(holder)),
    }
  }),
  raw_expand_nbt: ({ spec }, { T }) => {
    const { type, id, path } = T(spec);
    return {
      [type]: id,
      nbt: path,
    }
  },
  ident(node) {
    return node.ident;
  },


  test_entity: ({ selector }, { T }) => `entity ${T(selector)}`,
  test_datapath: ({ path }, { T }) => `data ${T(path)}`,
  test_scoreboard: ({ left, op, right }, { T }) => `score ${T(left)} ${op} ${T(right)}`,
  test_scoreboard_true: ({ left }, { T }) => `score ${T(left)} matches 1..`,
  test_scoreboard_zero: ({ id }, { T }) => `score ${T(id)} matches 0`,
  test_scoreboard_range: ({ left, right }, { T, Nbt }) => `score ${T(left)} matches ${T(right)}`,

  tag_id: ({ name }, { T, scope }) => scope.tags.get(T(name)),
  tag_set: ({ selector, tag }, { T }) => `tag ${T(selector)} add ${T(tag).id}`,
  tag_unset: ({ selector, tag }, { T }) => `tag ${T(selector)} remove ${T(tag).id}`,

  tilde: ({ number }) => `~${number}`,
  raw_tag: ({ tag, attr, parts }, { T, Nbt, toNbt }, state = { block: true, first: true, last: true }) => {
    var props = {};
    var block = false, paragraph = false;
    var attrs = {};
    for (const { name, value } of attr) {
      attrs[Nbt(name)] = Nbt(value);
    }
    const spec = rawTags[tag];
    if (!spec) {
      props = { ...attrs }
    } else {
      block = spec.block;
      paragraph = spec.paragraph;
      if (typeof spec.props === "function") {
        props = spec.props(attrs)
      } else {
        props = { ...attrs, ...spec.props }
      }
    }
    const ret = Nbt({ ...props })

    ret.text ??= "";

    if (parts) {
      let text = "";
      const myState = Object.assign({}, state)
      ret.extra = [];
      let first = true;
      for (const i in parts) {
        myState.first = first;
        first = false;
        myState.last = i == parts.length - 1;
        const res = T(parts[i], myState);
        if (res instanceof String) {
          text += res;
        } else {
          if (text) ret.extra.push(Nbt(text))
          ret.extra.push(res)
          text = ""
        }
      }
      if (text) ret.extra.push(Nbt(text))
    }
    if (paragraph) {
      state.block = true;
      if (!state.block && (!state.last)) {
        return ["\n", Nbt(ret), "\n\n"]
      } else if (!state.last) {
        return [Nbt(ret), "\n\n"]
      }
    } else if (block) {
      state.block = true;
      if (!state.block && (!state.last)) {
        return ["\n", Nbt(ret), "\n"]
      } else if (!state.last) {
        return [Nbt(ret), "\n"]
      }
    }
    return Nbt(ret);
  },
  raw_chars: ({ chars }, { Nbt }, state) => {
    if (state.first) chars = chars.trimStart();
    if (state.last) chars = chars.trimEnd();
    state.block = false;
    return Nbt(chars)
  },
  raw_chars_ws: ({ chars }, { Nbt }, state) => {
    if (state.block || state.last || state.first) {
      return Nbt("")
    }
    return Nbt(" ")
    if (!state.block) {
      state.block = true;
      return "\n";
    }
    return ""
  },

  bossbar_add: ({ id, name }, { T, Nbt }) => `bossbar add ${T(id)} ${JSON.stringify(Nbt(name))}`,
  bossbar_remove: ({ id }, { T, toNbt }) => `bossbar remove ${T(id)}`,

  /************************************************************************* */

  
  RelativeCoords: ({ _coords }, { sumCoords }) => {
    let { x, y, z } = sumCoords(_coords);
    return `~${x || ""} ~${y || ""} ~${z || ""}`
  },
  LocalCoords: ({ _coords }, { sumCoords }) => {
    let { x, y, z } = sumCoords(_coords);
    return `^${x || ""} ^${y || ""} ^${z || ""}`
  },
  RelativeAngles: ({ _coords }, { sumCoords }) => {
    let { x, y } = sumCoords(_coords);
    return `~${x || ""} ~${y || ""}`
  },
  NativeAngles: ({ x, y }, { T }) => `${T(x)} ${T(y)}`,
  NativeCoords: ({ x, y, z }, { T }) => `${T(x)} ${T(y)} ${T(z)}`,
  TildeCoord: ({ arg }, { T }) => arg ? `~${T(arg)}` : '~',
  CaretCoord: ({ arg }, { T }) => arg ? `^${T(arg)}` : '^',
  
  

  Conditionals: ({ subs }, { T }) => subs.map(T).join(" "),
  ConditionalIf: ({ arg }, { T }) => `if ${T(arg)}`,
  ConditionalUnless: ({ arg }, { T }) => `unless ${T(arg)}`,



  MacroCallSpec: (
    { ns, name, args },
    { macroExists, ns: NS }
  ) => {
    ns ||= NS
    assert(macroExists(ns, name), `no such macro ${ns || NS}:${name}`)
    return { ns, name, args };
  },
  PromiseTrue: ({ spec }, { expandMacro, T }, { thenCode, catchCode }) => {
    const { ns, name, args } = T(spec);
    return expandMacro(ns, name, args, thenCode, catchCode)
  },
  PromiseFalse: ({ spec }, { expandMacro, T }, { thenCode, catchCode }) => {
    const { ns, name, args } = T(spec);
    return expandMacro(ns, name, args, thenCode, catchCode)
  },
  PromiseCall: ({ promises, then, _catch }, { T, O }) => {
    let thenCode = T(then).output('instruction');
    const catchCode = _catch ? T(_catch).output('instruction') : null;
    for (const promise of promises.concat().reverse()) {
      thenCode = T(promise, { thenCode, catchCode })
    }
    return thenCode;
  },

  ValueDataPathVar: ({ name, path }, { T, ns }) => Compiler.DataPathStorage.create({
    resloc: `${ns}:zzz_minity_vars`,
    path: T(path)
  }),
  AssignmentScale: ({ scale }, { T, Nbt }) => {
    scale = Nbt(scale);
    const type = { s: "short", i: "int", b: "byte", l: "long", d: "double", f: "float" }[scale.suffix || "i"]
    return { type, scale: +scale };
  },
}
