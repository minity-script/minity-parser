
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
  template_lit: ({ parts }, { T, Nbt }) => {    console.log(parts)
    return Nbt(parts.map(part=>{
      return T(part);
    }).join(""))
  },


  arg: ({ name }, { scope }) => scope.getArg(name),

  selector_spec: ({ initial, conditions }, { T}) => {
    const spec = T(initial);
    for (const c of conditions) T(c, { spec });
    return spec
  },
  selector_uuid: ({ uuid }, T) => new SelectorUUID(T(uuid)),
  selector: ({ spec }, { T }) => T(spec).format(),
  selector_single: ({ spec }, { T }) => {
    const it = T(spec);
    assert(it.isSingle, "Selector must select a single entity")
    return it.format();
  },
  selector_optional: ({ spec }, { T }) => {
    if (spec) return T(spec).format();
    return new Selector({initial:"s"}).format();
  },
  selector_initial: ({ initial,type },{T}) => new Selector({initial,type:type && T(type)}),
  cond_tag: ({ op, tag }, { T }, { spec }) => {
    spec[op]("tag", T(tag), true)
  },
  cond_brackets: ({ name, op, value }, { T }, { spec }) => {
    spec[op](name, T(value),true)
  },
  cond_brackets_lit: ({ name, op, value }, { T }, { spec }) => {
    spec[op](name, value)
  },
  cond_brackets_score: ({ name, value }, { T, scope }, { spec }) => {
    const score = scope.objectives.get(T(name).get('string'));
    spec.score(score.objective, T(value))
  },
  cond_brackets_nbt: ({ name, op, value }, { T }, { spec }) => {
    spec[op](name, T(value).output('nbt'))
  },
  cond_brackets_pair: ({ name, value }, { T, toNbt }) => T(name) + "=" + T(value).output('bool'),
  cond_brackets_braces: ({ items }, { T, toNbt }) => "{" + items.map(T).join(",") + "}",


  item_spec: ({ resloc, nbt }, { T, toNbt }) => `${T(resloc).output('resloc_or_tag_mc')}${nbt ? T(nbt).output('nbt') : ""}`,
  
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


  cmd_summon: ({ position, type, nbt, then }, { T, anonFunction, Nbt, toNbt }) => {
    position = position ? T(position).output('position') : "~ ~ ~";
    type = T(type).output('resloc_mc')
    if (!then) return `summon ${type} ${position} ${nbt ? toNbt(nbt) : ""}`
    const tag = "--minity--internal-summoned"
    nbt = Nbt(nbt || {});
    nbt.Tags = [...nbt.Tags || [], tag];
    return anonFunction([
      `summon ${type} ${position} ${toNbt(nbt)}`,
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
  cmd_setblock: ({ position, block }, { T }) => {
    return `setblock ${position ? T(position).output('position') : "~ ~ ~"} ${T(block).output('block_spec')}`
  },


  nbt_path: ({ path }, { T }) => {
    console.log(path)
    return path.map(T).join("")
  },
  nbt_path_step: ({ name, match }, { T }) => {
    console.log(name,match)
    let ret = "";
    if (name) {
      name = T(name);
      assert (name.canGet('string'),"must be a string");
      ret+=name.output('nbt')
    }
    if (match) {
      match = T(match);
      ret+=match;
    }
    return ret;
  },
  nbt_path_member: ({ step }, { T }) => {
    return '.'+T(step)
  },
  nbt_path_list: () => "[]",
  nbt_path_list_element: ({ index }, { T }) => (`[${T(index).output('int')}]`),
  nbt_path_list_match: ({ match }, { T }) => `[${T(match).output('nbt')}]`,
  nbt_path_match: ({ match }, { T }) => `${T(match).output('nbt')}`,

  template_chars: ({ chars }) => chars,
  template_parts: ({ parts }, { T }) => parts.map(T).join(""),
  template_expand_tag: ({ name }, { T }) => T(name).output('tag'),
  template_expand_score: ({ name }, { T, scope }) => scope.scores.get(T(name)).objective,
  template_expand_json: ({ value }, { T }) => {
    return T(value).output('json')
  },
  template_expand_value: ({ value }, { T }) => {
    value = T(value);
    if (value.canOutput('template_expand')) {
      return value.output('template_expand')
    } else {
      return value.get('string')
    }
  },

  raw_line: ({ parts }, { T }) => parts.map(T),
  raw_expand_value: ({ value }, { T }) => {
    value = T(value);
    if (value.canGet('raw_component')) {
      return value.get('raw_component')
    } else if (value.canOutput('template_expand')) {
      return value.output('template_expand')
    } else {
      return value.get('string')
    }
  },
  ident(node) {
    return node.ident;
  },

  tag_id: ({ name }, { T, scope }) => scope.tags.get(T(name)),
  tag_set: ({ selector, tag }, { T }) => `tag ${T(selector)} add ${T(tag).id}`,
  tag_unset: ({ selector, tag }, { T }) => `tag ${T(selector)} remove ${T(tag).id}`,

  tilde: ({ number }) => `~${number}`,
  raw_tag: ({ tag, attr, parts }, { T, Nbt, toNbt }, state = { block: true, first: true, last: true }) => {
    var props = {};
    var block = false, paragraph = false;
    var attrs = {};
    for (const { name, value } of attr) {
      //console.log(value.$,T(value).get('value'));
      attrs[Nbt(name)] = T(value).get('value');
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

  bossbar_add: ({ resloc, name }, { T, Nbt }) => {
    if (!name) return `bossbar add ${T(resloc).output('resloc')}`;
    return `bossbar add ${T(resloc).output('resloc')} ${T(name).output('json')}`
  },
  bossbar_remove: ({ resloc }, { T }) => `bossbar remove ${T(resloc).output('resloc')}`,

  /************************************************************************* */

  
  
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
