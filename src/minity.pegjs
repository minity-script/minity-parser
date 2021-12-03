{

  const FN = fn => {
    fn||=($,location,...args)=>{
      const ret = {$}
      for (const arg of args) Object.assign(ret,arg);
      return ret;
    }
    return ($,...args) => {
      const loc = location();
      const {file} = options;
      loc.file = file;
      loc.source = options.source;
      const node = fn($,loc,...args)
      return node;  
    }
  }

  const N = FN(options.N);
  const V = FN(options.V);
  const I = FN(options.I);
}


file = ___ head:DeclareNamespace tail:(EOL @DeclareNamespace)* ___ {
  return N('file',{namespaces:[head,...tail]})
}
//\\ globals
  DeclareNamespace 
    = "namespace" __ ns:IDENT EOL statements:Globals {
        return V('DeclareNamespace',{},{ns,statements})
      }

  DeclareFunction 
    = "function" 
      __ resloc:ValueResName 
      tags:(__ @ValueResTag)* 
      (_ OPEN CLOSE _)? 
      BEGIN statements:NonGlobals END  {
          return I('DeclareFunction', { resloc, tags}, { statements } )
      }

  DeclareMacro 
    = "macro" 
      __ name:IDENT 
      args:macro_args 
      BEGIN statements:NonGlobals END {
        return V('DeclareMacro', {},{ name, args, statements  } )
      }

  Globals 
    = head:global tail:(EOL @global)* {
        return V('Statements',{statements:[head,...tail]})
      }
  
  NonGlobals 
    = head:Statement tail:(EOL @Statement)* {
        return V('Statements',{statements:[head,...tail]})
      }

  BlockStatements  
    = BEGIN @NonGlobals END  

  StatementOrBlock
    = BlockStatements / __ @Instruction


  globals 
    = head:global tail:(EOL @global)* {
        return [head,...tail]
      }

  global 
    = DeclareFunction
    / DeclareMacro
    / DeclareEvent 
    / Directive
    / Statement

  DeclareEvent 
    = "on" 
      __ trigger:ValueResLoc conditions:(CONCAT @LiteralObject) 
      __ "then" then:StatementOrBlock {
        return V('DeclareEvent',{trigger,conditions,then})
      }

Directive
  =  "import" 
    __ file:LiteralString {
      return I('Import',{file})
    } 
  / "define" __ resloc:ValueResLoc __ value:LiteralObject {
    return I('DefineJson',{resloc,value})
  }
//\\ compile-time constant

  arg_name 'macro argument'
    = "?" @WORD

  arg_value 
    = LiteralValue


  //\\ macro_args
    macro_args = OPEN head:macro_arg tail:(COMMA @macro_arg)* CLOSE {
      return [head,...tail]
    }
    / OPEN ___ CLOSE {
      return []
    }

    macro_arg = name:arg_name def:(EQUALS @arg_value)? {
      return {name,def}
    }


//\\ macro call

MacroCall
  = resloc:ValueResLoc _ OPEN args:call_args? CLOSE {
      return V('MacroCall', { resloc}, { args } )
    }
      
  //\\ call_args
    call_args 
    = numbered:call_args_numbered named:(COMMA @call_args_named)? {
      return {numbered,named:named||{}}
    }
    / named:call_args_named {
      return {numbered:[],named:named||{}}
    }

    call_args_numbered = head:call_arg_numbered tail:(COMMA @call_arg_numbered)* {
      return [head,...tail]
    }

    call_arg_numbered = ___ value:arg_value  {
      return value
    } 

    call_args_named = head:call_arg_named tail:(COMMA @call_arg_named)* {
      return [head,...tail]
    }

    call_arg_named = name:arg_name EQUALS value:arg_value {
      return {name,value}
    }

//\\ declare
Declaration 'declaration'
  = DeclareVar
  / DeclareScore
  / DeclareTag

    DeclareTag 
      = "tag" __ name:LiteralString &EOL {
        return I('DeclareTag',{name})
      }
  
    DeclareVar 
      = "var" __ "$" name:IDENT value:(EQUALS @RValue)? {
          return I('DeclareVar',{value},{name})
        }
  
    DeclareScore 
      = "score" __ name:IDENT criterion:(__ @CRITERION)? {
        return I('DeclareScore',{},{name,criterion})
      }
    
    CRITERION 'criterion'
      = $([a-z]i [a-z0-9.:_-]i+)


CompareOp 
    = ">=" { return 'OpGTE' }
    / "<=" { return 'OpLTE' }
    / "==" { return 'OpEQ' }
    / "!=" { return 'OpNEQ' }
    / "<" { return 'OpLT' }
    / ">" { return 'OpGT' }

ValueExpr
  = ValueCompare

ValueCompare
  = left:ValueAccessor _ op:CompareOp _ right:ValueAccessor {
      return V(op,{left,right})
    }
  / ValueAccessor

ValueAccessor
  = ValueScore 
  / ValueDataPath
  / ValueAtom

ValueAtom 
  = Parens
  / ValueConstant
  / ValueVariable
  / ValueDataPathVar
  / ValueSelector
  / ValueBossBarProp
  / ValuePosition
  / ValueRotation
  / LiteralValue

  Parens 
    = OPEN @ValueExpr CLOSE
  LValue
    = ValueConstant
    / ValueVariable
    / ValueDataPathVar
    / ValueBossBarProp
    / ValueScore
    / ValueDataPath
  
  RValue
    = Instruction
    / ValueExpr

  ValueDataPath
    = ValueDataPathStorage
    / ValueDataPathGeneric
        
    ValueDataPathGeneric
      = left:(ValueSelector/ValuePosition/ValueResLoc/Parens) "::" path:nbt_path {
          return V('DataPathGeneric', { left, path } )
        }

    ValueDataPathStorage
      = "@@" left:ValueResLoc "::" path:nbt_path {
          return V('DataPathGeneric', { name, path } )
        }

  ValueDataPathVar
    = "@@" path:nbt_path { return V('DataPathVar', { path } ) }

  ValueVariable 
    = "$" name:IDENT {
      return V('Variable',{},{name})
    }

  ValueConstant
    = "?" name:IDENT {
        return V('Constant',{},{name})
      }

  ValueTag 
    = name: LiteralString {
        return V('Tag',{name})
      } 

  ValueScore 
    = left:(ValueSelector/Parens) _ "->" _ right:(LiteralString/ValueConstant/Parens) {
      return V( 'Score', { left,right } )
    } 

  ValueSelector 
    = spec:selector_spec {
      return V( 'Selector', { spec } )
    } 

  ValueBossBarProp 
    = "bossbar" __ resloc:ValueResLoc __ prop:IDENT {
      return V( 'BossBarProp', { resloc},{ prop } )
    } 
 
  ValueNativeCommand
    = "/" command:command_parts {
      return V('NativeCommand', { command  } )
    } 

  
Assign 
  = AssignScaled 
  / AssignUnary 
  / AssignBinary

  AssignScaled
    = left:LValue EQUALS scale:AssignmentScale right:RValue {
        return I('AssignScaled',{left,right,scale})  
      } 
  AssignBinary
    = left:LValue _ op:AssignOp _ right:RValue {
        return I(op ,{left,right})  
      } 

  AssignUnary
    = left:LValue _ op:AssignOpUnary {
        return I(op ,{left})  
      } 

  AssignmentScale 
    = scale:(@typed_number _ "*" _) {
      return N('AssignmentScale',{scale})
    }

  AssignOp 
    = "<=>" { return 'AssignSwap' }
    / "+=" { return 'AssignAdd' }
    / "-=" { return 'AssignSub' }
    / "*=" { return 'AssignMul' }
    / "/=" { return 'AssignDiv' }
    / "%=" { return 'AssignMod' }
    / ">=" { return 'AssignGT' }
    / "<=" { return 'AssignLT' }
    / "?=" { return 'AssignSuccess' }
    / "=" { return 'Assign' }

  AssignOpUnary 
    = "++" { return 'AssignInc' }
    / "--" { return 'AssignDec' }
    

Assignment
  = AssignConstant
  / Assign

  AssignConstant 
    = name:arg_name EQUALS value:LiteralValue {
      return I('DeclareConstant',{value},{name})
    }



NativeCommand 
  = "/" command:command_parts {
      return I('NativeCommand', { command  } )
    }

  command_parts
    = parts:command_part* {
        return N('template_parts',{parts})
      }

  command_part
    = template_expand
    / command_chars

  command_chars  
    = chars:(@command_char)+ {
        return N('template_chars', { chars:chars.join('') } )
      }

  command_char 
    = no_expand_char_inline
    / &"{" !template_expand @"{"

  cmd_arg_count_item 
    = __
      count: unsigned_int
      __
      item: item_spec {
        return {count,item}
      }
    / __
      item: item_spec 
      count: ( __ @unsigned_int)? {
        return {count,item}
      }
      
//\\ minity commands

MinityCommand
  = "say" 
    __ line:raw_line {
      return I('CmdSay',{line})
    }
  / "print" 
    __ line:raw_line {
      return I('CmdPrint',{line})
    }
  / "tell" 
    __ selector:ValueSelector
    __ line:raw_line {
      return I('CmdTell',{selector,line})
    }
  / "append"
    __ left:LValue
    __ right:RValue {
      return I('Append',{left,right})
    }
  / "prepend"
    __ left:LValue
    __ right:RValue {
      return I('Prepend',{left,right})
    }
  / "merge"
    __ left:LValue
    __ right:RValue {
      return I('Merge',{left,right})
    }
  / "insert"
    __ index:ValueAtom
    __ left:LValue
    __ right:RValue {
      return I('Merge',{index,left,right})
    }
  / "remove"
    __ left:LValue {
      return I('Remove',{left})
    }
  / "tag" 
    __ selector:ValueAtom 
    __ tag:ValueExpr  {
      return V('CmdTag',{selector,tag})
    }
  / "untag" 
    __ selector:ValueAtom
    __ tag:ValueExpr   {
      return V('CmdUntag',{selector,tag})
    }
  / "bossbar" 
    __ "add" 
    __ resloc:(ValueResLoc/ValueConstant/Parens)
    __ name:ValueAtom? {
      return V('CmdBossbarAdd', { resloc, name} )
    }
  / "bossbar" 
    __ "remove" 
    __ resloc:(ValueResLoc/ValueConstant/Parens) {
      return V('CmdBossbarRemove', { resloc } )
  } 

WrappedCommand
  = command:cmd {
    return I('NativeCommand',{command})
  }
  cmd 
  = "summon" 
    position:(_ @ValuePosition)? 
    __ 
    type:ValueResLoc CONCAT 
    nbt:(@object)? 
    then:(__ "then" __ @StatementOrBlock )? {
      return N('cmd_summon', { position, type, nbt, then } )
    }
  / "give" 
    selector:cmd_arg_selector_optional 
    args: cmd_arg_count_item {
      return N('cmd_give', { selector,...args } )
    }
  / "clear" 
    selector:cmd_arg_selector_optional 
    args: cmd_arg_count_item {
      return N('cmd_clear', { selector,...args } )
    }
  / "setblock" 
    position:(_ @ValuePosition)? 
    __
    block:BlockSpec 
    mode: (__ @("destroy"/"keep"/"replace"))? {
      return N('cmd_setblock', { position, block, mode } )
    }
  

//\\ directives

    
//\\ execute
 
  mod_arg_axes 
    = OPEN @("xyz"/"xy"/"xz"/"yz"/"x"/"y"/"z") CLOSE
    / __ @("xyz"/"xy"/"xz"/"yz"/"x"/"y"/"z")
  
  mod_arg_anchor 
    = OPEN @ANCHOR CLOSE
    / __ @ANCHOR
  

  mod_arg_selector_anchor
    = OPEN selector:selector anchor:(__ @ANCHOR)? CLOSE {
        return [ selector, anchor ]
      }
    / __ selector:selector anchor:(__ @ANCHOR)? {
        return [ selector, anchor ]
      }

  
  dir_number = @float !"deg"
  rot_angle = @float "deg"
  
  mod_arg_number
  	= OPEN @dir_number CLOSE
    / __ @dir_number
    
  mod_arg_angle
  	= OPEN @rot_angle CLOSE
    / __ @rot_angle
    
  cmd_arg_selector_optional = spec:(__ @selector_spec)? {
    return N('selector_optional', { spec } )
  }

//\\ selector
  selector
    = spec: selector_spec {
      return N('selector', { spec } )
    }
  selector_single = spec:selector_spec {
      return N('selector_single', { spec } )
    }
  selector_spec  'selector'
    = selector_uuid
    / selector_complex

  selector_uuid
    = "@[" _ uuid:string _ "]" {
      return N('selector_uuid', { uuid } )
    }

  selector_complex 
    = sort:selector_sort? "@" !"@" initial:(selector_initial/selector_initial_type) conditions:conditions {
      return N('selector_spec', { initial,conditions:[...sort||[],...conditions] } )
    }
    
  //\\ sort
  selector_sort 
    = sort:sort_name __ "all" __ {
        return [N('cond_brackets_lit',{name:'sort',op:'include',value:sort})]
      }
    / sort:sort_name limit:(__ @(LiteralInt/ValueConstant/Parens)) ? __ {
      if (!limit) {
        return [
          N('cond_brackets_lit',{name:'sort',op:'include',value:sort}),
          N('cond_brackets_lit',{name:'limit',op:'include',value:1})
        ]
      }
      return [
        N('cond_brackets_lit',{name:'sort',op:'include',value:sort}),
        N('cond_brackets',{name:'limit',op:'include',value:limit}),
      ]
    }
    
  //\\ initial
    selector_initial
    = initial:[a-z] ![a-z0-9_]i {
      if (!initial.match(/[prase]/)) expected('@p, @r, @a, @s, @e or @<type>')
      return N('selector_initial', { initial } )
    }

    selector_initial_type
    = type:(ValueResLoc/ValueResTag/ValueConstant) {
      return N('selector_initial', { type } )
    }

  //\\ conditions
    conditions = parts:condition_part* {
      return parts.flat()
    }

    condition_part = condition_tag/condition_brackets/condition_nbt

    condition_tag 'selector tag'
    = CONCAT "." tag:(ValueTag/ValueConstant/Parens) { return [N('cond_tag', { op:'include', tag }) ]  }
    / CONCAT "!" tag:(ValueTag/ValueConstant/Parens) { return [N('cond_tag', { op:'exclude', tag }) ]   }

    condition_nbt 'selector nbt'
      = CONCAT value:LiteralObject {
        return N('cond_brackets_nbt', {name:'nbt',op:'include',value} )
      }

    condition_brackets 'selector brackets'
      = CONCAT "[" ___ 
        head:cond_brackets 
        tail:(COMMA @cond_brackets)* 
        ___ "]" {
        return [head,...tail]
    }
    
    cond_brackets  
      =   node: 
          (	 ($("d"? [xyz])     cond_op ValueExpr )
          /  (( "type" )        cond_op (ValueResLoc/ValueResTag) )
          /  (( "predicate" )   cond_op ValueResLoc )
          /  (( "limit")        cond_op ValueExpr)
          /  (( "scores")       cond_op cond_brackets_scores)
          /  (( "advancements") cond_op cond_brackets_advancements)
          )
        {
          const [name,op,value] = node;
          return N('cond_brackets', {name,op,value} )
        } 
      /  node:
         ( ("sort"         cond_op sort_name)
         / ("gamemode"     cond_op GAMEMODE)
         ) {
            const [name,op,value] = node;
            return N('cond_brackets_lit', {name,op,value} ) 
         }
      /  node:(( "tag" / "team" / "name") cond_op ValueExpr? ) {
          const [name,op,value] = node;
          return N('cond_brackets', {name,op,value} )
        } 
      / node:(( "nbt") cond_op ValueExpr ) {
          const [name,op,value] = node;
          return N('cond_brackets', {name,op,value} )
        }
      / name:"level" _ value:int_range_match {
          return N('cond_brackets', {name,op:'include',value} )
        }
      / name:("distance"/"x_rotation"/"y_rotation") _ value:range_match {
          return N('cond_brackets', {name,op:'include',value} )
      } 
      / "->" _ name:(LiteralString/ValueConstant/Parens) _ value:int_range_match {
          return N('cond_brackets_score', {name,op:'score',value} )
      }
    


    cond_op
      = _ "==" _ { return 'include' }
      / _ ("=!"/"!=") _ { return 'exclude' }
      / _ "=" _ { return 'include' }

    cond_brackets_scores 
      = BEGIN 
        head: cond_brackets_score 
        tail: (COMMA @cond_brackets_score)*
        END {
          return N('cond_brackets_braces', {items: [head, ...tail]})
        }

    cond_brackets_score
      = name:ident EQUALS value:range {
          return N('cond_brackets_pair', {name,value})
        }

    cond_brackets_advancements 
      = BEGIN 
        head: cond_brackets_advancement
        tail: (COMMA @cond_brackets_advancement)*
        END {
          return N('cond_brackets_braces', {items: [head, ...tail]})
        }

    cond_brackets_advancement
      = name:resloc_mc EQUALS value:ValueExpr {
          return N('cond_brackets_pair', {name,value})
        }
      / BEGIN 
        head: cond_brackets_advancement_criterion
        tail: (COMMA @cond_brackets_advancement_criterion)*
        END {
          return N('cond_brackets_braces', {items: [head, ...tail]})
        }

    cond_brackets_advancement_criterion
      = name:ident EQUALS value:ValueExpr {
          return N('cond_brackets_pair', {name,value})
        }
    
    sort_name 
      = ( "nearest" / "closest" ) { return "nearest" }
      / ( "furthest" / "farthest" ) { return "furthest" }
      / ( "random" / "any" ) { return "random" }
      / ( "arbitrary" / "oldest" ) { return "arbitrary" }

//\\ scoreboard
   



//\\ nbt
  //\\ datapath
  
    
  //\\ nbt_path
    nbt_path 
      = head:nbt_path_head tail:nbt_path_tail* {
          return N('nbt_path',{path:[head,...tail]})
        }

      nbt_path_head 
        = nbt_path_step
        / nbt_path_match
        / nbt_path_bracket

      nbt_path_tail 
        = nbt_path_member 
        / nbt_path_bracket

      nbt_path_member 
        = "." step:nbt_path_step {
            return N('nbt_path_member',{step})
          }

      nbt_path_step 
        = name:LiteralString match:nbt_path_match? {
            return N('nbt_path_step',{name,match})
          }

      nbt_path_bracket 
        = "[" match:LiteralObject "]" {
            return N('nbt_path_list_match',{match})
          } 
        / "[" index:ValueAtom "]" {
            return N('nbt_path_list_element',{index})
          }
        / "[]" {
            return N('nbt_path_list')
          }

      nbt_path_match 
        = match:LiteralObject {
            return N('nbt_path_match',{match})
          }


      
 

    

//\\ block_spec
 
    item_spec 'item predicate'
      = resloc:(ValueResLoc/ValueResTag) CONCAT nbt:(@LiteralObject)? {
          return N('item_spec',{resloc,nbt})
        }


//\\ parts

  ResPart = LiteralIdent/ValueConstant

  ValueResName 
    = nameParts:ResNameParts {
        return V('ResLoc',{ nameParts })
      }

  ResNameParts = head:ResPart tail:("/" @ResPart)* {
    return [head,...tail]
  }

  ValueResLoc 
    = ns:(@ResPart ":")? nameParts:ResNameParts {
        return V('ResLoc', {ns,nameParts})
      }

  ValueResLocFull
    = ns:(@ResPart ":") nameParts:ResNameParts {
        return V('ResLoc', {ns,nameParts})
      }


  ValueResTag
    = "#" ns:(@ResPart ":")? nameParts:ResNameParts {
        return V('ResTag', {ns,nameParts})
      }

 

  resloc_spec
    = ns:(@ident ":")? 
      head:ident tail:("/" @ident)* {
        return { ns, nameParts:[head,...tail] }
      }

  resname = head:ident tail:("/" @ident)* {
    return N('resname',{parts:[head,...tail]})
  }

  resloc
    = resloc_full
    / name: resname {
        return N('resloc', { name } )
      }

  resloc_full 
  	= ns:ident ":" name:resname {
        return N('resloc', { ns,name } )
      }

  resloc_or_tag 
    = restag 
    / resloc

  resloc_mc
    = resloc_full
    / name: resname {
        return N('resloc_mc', { name } )
      }

  restag
    = restag_full
    / "#" name:resname {
        return N('restag', { name } )
      }

  restag_full 
  	= "#" ns:ident ":" name:resname {
        return N('restag', { ns,name } )
      }

  restag_mc
    = restag_full
    / "#" name: resname {
        return N('restag_mc', { name } )
      }

  resloc_or_tag_mc
    = restag_mc
    / resloc_mc

  int_range_match
    = "=" "="? _ @int_range 
    / "<=" _ to:int { return N('range_to', { to }) }
    / ">=" _ from:int { return N('range_from', { from }) }
    / "<" _ to:int { return N('range_lt_int', { to }) }
    / ">" _ from:int { return N('range_gt_int', { from }) }

  int_range 
    = from:int ".." to:int { return N('range', { from,to } ) }
    / ".." to:int { return N('range_to', { to } ) }
    / from:int ".." { return N('range_from', { from } ) }
    / int

  range_match
    = "=" "="? _ @range 
    / "<=" _ to:number { return N('range_to', { to }) }
    / ">=" _ from:number { return N('range_from', { from }) }
    / "<" _ to:number { return N('range_lt', { to }) }
    / ">" _ from:number { return N('range_gt', { from }) }
    
  range 
    = from:number ".." to:number { return N('range', { from,to } ) }
    / ".." to:number { return N('range_to', { to } ) }
    / from:number ".." { return N('range_from', { from } ) }
    / number

//\\ values
  value
    = value_arg
    / value_lit

  value_arg
    = name:arg_name {
        return N('arg', { type:'value',name } )
      }

  value_lit
    = object
    / array
    / number
    / string


  typed_value 
    = typed_value_arg
    / typed_value_lit

  typed_value_arg
    = name:arg_name {
        return N('arg', { type:'value',name } )
      }

  typed_value_lit
    = object
    / array
    / typed_number
    / string


  //\\ bool
    bool 
      = bool_arg/bool_lit
    bool_arg
      = name:arg_name {
          return N('arg', { type:'bool',name } )
        }

    bool_lit
      = "true" { return N('boolean_lit', { type:'bool', value: true  } ) }
      / "false" { return N('boolean_lit', { type:'bool', value: false  } ) }

  //\\ object
    object 
      = object_arg
      / object_lit
    
    object_arg
      = name:arg_name { 
          return N('arg', { type:'object',name } ) 
        }


    object_lit
      = "{" ___
        members:(
          head:member tail:(COMMA @member)* COMMA? {
            return [head,...tail];
          }
        )?
        ___ "}"
        { return N('object_lit', { type:'object',members:members||[] } ) }
    member
      = name:(string) _":" ___ value:typed_value {
          return { name: name, value: value }
        }


  //\\ array
    array 
      = array_arg
      / array_lit

    array_arg 
      = name:arg_name {	return N('arg', { type:'array',name } ) }

    array_lit
      = "[" ___
        items:(
          head:array_item
          tail:(COMMA @array_item )*
          COMMA?
          { return [head].concat(tail); }
        )?
        ___ "]"
        { return N('array_lit', { type:'array', items: items || [] } ) }
  
    array_item 
      = "..." _ array:array {
          return N('array_spread', { array })
        } 
      / value:typed_value {
        return N('array_value', { value })
      }
  //\\ number
    typed_number 
      = name:arg_name {	
          return N('arg', { type:'number',name } ) 
        }
      / typed_number_lit

    typed_number_lit 
      = typed_float_lit
      / typed_int_lit

    number 
      = name:arg_name {	
          return N('arg', { type:'number',name } ) 
        }
      / number_lit

    number_lit 
      = float_lit
      / int_lit

    unsigned_int 
      = name:arg_name {	
          return N('arg', { type:'count',name } ) 
        }
      / unsigned_int_lit

    unsigned_int_lit 
      = $(UNSIGNED) {
          return N('number_lit', { type:'int',value:1 } )
        }
    
    int 
      = name:arg_name {	
          return N('arg', { type:'int',name } ) 
        }
      / int_lit

    int_lit  'integer'
      = "true" {
          return N('number_lit', { type:'int',value:1 } )
        }
      / "false" {
          return N('number_lit', { type:'int',value:0 } )
        }
      / value:INT {
          return N('number_lit', { type:'int',value:+value } )
        }

    typed_int 
      =  name:arg_name {	
          return N('arg', { type:'int',name } ) 
        }
      / typed_int_lit

    typed_int_lit  'integer'
      = "true" {
          return N('number_lit', { type:'int',value:1,suffix:"b" } )
        }
      / "false" {
          return N('number_lit', { type:'int',value:0,suffix:"b" } )
        }
      / value:INT suffix:[bsli]i? {
          return N('number_lit', { type:'int',value:+value,suffix } )
        }

    typed_float  
      = name:arg_name {	
          return N('arg', { type:'float',name } ) 
        }
      / typed_float_lit

    float  
      = name:arg_name {	
          return N('arg', { type:'float',name } ) 
        }
      / float_lit

    
    typed_float_lit 
      = value:FLOAT suffix:[fd]i? {
          return N('number_lit', { type:'float',value:+value,suffix:suffix||"f" } )
        } 
      / value:INT suffix:[fd]i {
          return N('number_lit', { type:'float',value:+value,suffix } )
        }
        
    float_lit
      = value:(FLOAT/INT) {
          return N('number_lit', { type:'float',value:+value } )
        } 

    FLOAT
      = value:$(INT (FRAC EXP?/EXP)) { return +value }

    EXP
      = [eE] ([-+])? DIGIT+

    FRAC
      = "." DIGIT+

    INT
      = value: $([+-]? UNSIGNED) { return +value }

    UNSIGNED
      = value:$( ZERO / !ZERO DIGIT+) { return +value }

    ZERO
      = "0"

    DIGIT
      = [0-9]

    DIGIT_NO_ZERO
      = [0-9]

  //\\ ident
    ident 
      = ident_arg
      / ident_lit

    ident_arg 
      = name:arg_name { 
          return N('arg',{type:'ident',name}) 
        } 

    ident_lit   
      =  word:WORD { 
        return N('string_lit', { type:'ident', value: word  } )
      }

  //\\ string
    string 
      = string_arg
      / string_lit
      
    string_arg 
      = name:arg_name {
          return N('arg', { type:'string',name } ) 
        }
    string_lit 
      = template_lit
      / string_json_lit 
      / string_snbt_lit 
      / ident_lit
      / raw_text_lit

    template 
      = template_arg 
      / template_lit
    
    template_arg 
      = name:arg_name {
          return N('arg', { name } ) 
        }


    template_lit  
      = '"' @template_content '"' 

    template_content  
      = parts:template_part* {
        return N('template_lit', { parts } )
      }


    template_parts 
      = parts:template_part* {
          return N('template_parts',{parts})
        }

    template_part 
      = template_expand
      / template_chars

    template_expand
      = template_expand_special
      / template_expand_value

    template_expand_special
      = template_expand_json
      / template_expand_tag
      / template_expand_score

    template_chars  
      = chars:(@template_char)+ {
          return N('template_chars', { chars:chars.join('') } )
        }

	  template_char 
    	= ![{}"] @char
      / "\\" @.

    template_expand_json  
    = "{=" value:LiteralValue "}" {
        return N('template_expand_json', { value } )
      }
    template_expand_tag  
      = "{." name:TemplateContent "}" {
          return N('template_expand_tag', { name } )
        }

    template_expand_score  
      = "{->" name:template_content"}" {
          return N('template_expand_score', { name } )
        }

    template_expand_value  
      = "{" value:ValueAtom "}" {
          return N('template_expand_value', { value } )
        }
        
    
  //\\ string_json
    string_json 
      = string_json_arg
      / string_json_lit

    string_json_arg 
      = name:arg_name {
          return N('arg', { type:'string_json',name } ) 
        }
    string_json_lit 
      = "json" __ value:value { 
        return N('string_json', { type:'string_json', value: value  } )
        } 

    string_snbt 
      = string_snbt_arg
      / string_snbt_lit

    string_snbt_arg 
      = name:arg_name {
          return N('arg', { type:'string_snbt',name } ) 
        }
    string_snbt_lit 
      = "snbt" __ value:typed_value { 
        return N('string_snbt', { type:'string_snbt', value: value  } )
        } 

    no_expand_char_inline
      = ![{\n\r] @char

    no_expand_char
      = ![{] @char

    char
      = unescaped
      / escape sequence:(
            
            'b' { return '\b'; }
          / 'f' { return '\f'; }
          / 'n' { return '\n'; }
          / 'r' { return '\r'; }
          / 't' { return '\t'; }
          / 'u' digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
              return String.fromCharCode(parseInt(digits, 16));
            }
          / .
        )
        { return sequence; }

    escape
      = "\\"
    
    quotation_mark
      = '"'

    unescaped
      = [^\0-\x1F\\]


//\\ raw text
  raw_text 
    = raw_text_arg
    / raw_text_lit
    
  raw_text_lit
    = raw_tag

  raw_text_arg 
    = name:arg_name {
        return N('arg', { type:'raw_text',name } ) 
      }
  

  raw_tag 
    = open:raw_tag_open ___ GT
      parts:raw_part*
      close:(
        tag:raw_tag_close {
          if(tag == open.tag) return tag;
          expected('</'+open.tag+'>')
        }
      ) { 
        open.parts = parts;
        return open;
      }
    / @raw_tag_open SGT 

  raw_tag_open
    = /*LT attr:(head:raw_attr tail:(___ @raw_attr)* { return [head,...tail] }) &(GT/SGT) {
      const tag = N('raw_tag',{props:{}})
      tag.attr = attr;
      return tag;	
      }
    / */
    !LTS LT tag:(WORD)  attr:(___ @raw_attr)* {
      return N('raw_tag',{tag,attr});
    }

    raw_attr = name:ident EQUALS value:LiteralValue {
      return {name,value}
    }

  raw_tag_close
    = LTS @WORD GT

  raw_line = parts:raw_line_part* {
    return N('raw_line',{parts})
  }

  raw_line_part 
    = raw_tag 
    / raw_expand
    / chars:$(__+) {
      return N('raw_chars_ws',{chars})
    }
    /  raw_chars

  raw_part 
    = raw_tag 
    / raw_expand
    /  chars:WS+ {
        return N('raw_chars_ws',{chars})
      }
    /  raw_chars


  raw_chars = 
      chars:$((!LT !WS raw_char)+) {
      return N('raw_chars',{chars})
    }

    raw_char 
      = no_expand_char
      / &"{" !raw_expand @"{"


  raw_expand
    = template_expand
    / raw_expand_value
    
    raw_expand_value  
      = "{" value:ValueExpr "}" {
          return N('raw_expand_value', { value } )
        }

//\\ TOKENS
  LT = "<" _
  LTS = "</" _
  GT = ___ ">"
  SGT = ___ "/>"
  CONCAT = (_ "&" _)?

  
  OPEN = _ "(" ___
  CLOSE =  ___ ")"
  BEGIN = _ "{" ___
  END =  ___ "}"

  COMMA = ___ "," ___
  EQUALS = _ "=" _

  HEXDIG = [0-9a-f]i
  WORD_INIT = [A-Z_]i
  WORD_CHAR = [A-Z0-9_]i
  WORD = $(WORD_INIT WORD_CHAR*)
  IDENT  = WORD

  _ 'whitespace' = SPACE*
  __ 'whitespace' = SPACE+
  ___ 'whitespace' = WSS*
  SPACE = [ \t]
  
  WS = [ \n\t\r]
  WSS  
    = WS
    / EOL_COMMENT
  
  EOL 'end of line' = __? [\n\r]+ ___ / EOL_COMMENT

  EOL_COMMENT 
    = _ "//" [^\n\r]* [\n\r]+ ___ 

  NAME_OR_DIE 
    = NAME
    / word:WORD &{ error(word +' is a reserved word')}

  NAME 
    = !RESERVED @$([a-z_][a-z0-9_]*)
  RESERVED 
    = ( CONDITION / GAMEMODE / SORT
      / MOD / ANCHOR / DIRECTION
      / KEYWORD / DECLARE / PSEUDO / COMMAND
      / STRINGIFY / BOOLEAN / OTHER
      ) ![a-z-_]i

  CONDITION
    = "advancements" / "distance" / "gamemode" / "level" 
    / "limit" / "name" / "scores" / "sort" / "type" 
    / "x_rotation" / "y_rotation" 

  GAMEMODE
    = "adventure" / "creative" / "spectator" / "survival" 

  SORT
    = "furthest" / "farthest" / "arbitrary" / "nearest" 
    / "oldest" / "random" / "all" / "any" 

  MOD
  = "align" / "anchored" / "as" / "at" / "facing" / "for" 
    / "in" / "pos" / "positioned" / "predicate" / "rot" / "rotated"

  ANCHOR 
    = "eyes"/"feet"


  DIRECTION
    = "back" / "down" / "downward" / "east" / "forward" / "left" 
    / "north" / "right" / "south" / "up" / "upward" / "west"  

  KEYWORD
    = "after" / "else" / "every" / "and" / "if" / "import" / "repeat" 
    / "test" / "then" / "until" / "unless" / "on" / "while" / "when" 
    / "except" / "catch"  

  PSEUDO
    = "resolve" / "reject" / "self" 

  DECLARE
    = "function" / "macro" / "namespace" / "score" / "tag" / "var" 

  COMMAND
    = "append" / "delete" / "merge" / "bossbar" / "clear" / "delete" / "give" / "prepend" / "remove" 
    / "print" / "say" / "setblock" / "summon" / "tag" / "untag" / "add" / "remove" / "max" / "players" 
    / "value" / "visible" / "style" / "color"

  BOOLEAN
    = "false" / "true" 

  STRINGIFY
    = "json" / "nbt" / "snbt" 

  OTHER  
    = "deg"



/*---------------------------------------------------------------------*/
  Statements 
    = head:Statement 
      tail:(EOL @Statement)* {
        return [head,...tail]
      }
  Statement 
    = statement:(
      Instruction / Declaration
    ) {
        statement.text = text();
        return statement;
      }
  Instruction 
    = Execution
    / Construct
    / WrappedConstruct
    
    / PseudoCall 
    / CallFunctionTag
    / MacroCall 

    / Assignment 

    / NativeCommand 
    / MinityCommand
    / WrappedCommand
     
    


  
//\\ execution context modifiers

Execution 
    = mods:Modifiers executable:StatementOrBlock {
      return V( 'Execute', { mods, executable } )
  }
  Modifiers 
    = head:Modifier tail:(__ @Modifier)* {
      return V('Mods',{mods:[head,...tail]})
    }

  Modifier  
    = "align" arg:mod_arg_axes {
        return V( 'ModAlign', {}, { arg } )
      }
    / "anchored" arg:mod_arg_anchor {
        return V( 'ModAnchored', {}, { arg } )
      }
    / "as" __ arg:ValueAtom { 
        return V( 'ModAs', { arg } )
      }
    / "at" __ arg:ValueAtom { 
        return V( 'ModAt', { arg } )
      }
    / "facing" arg:mod_arg_selector_anchor { 
        return V( 'ModFacing', {arg} )
      }
    / "for" __ arg:ValueAtom { 
        return V( 'ModFor', { arg } )
      }
    / "in" __ arg:ValueAtom {
      return V( 'ModIn', { arg } )
    }
    / "pos""itioned"? __ "as" __ arg:ValueAtom { 
        return V( 'ModPositionedAs', { arg } )
      }
    / "pos""itioned"? __ arg:ValueAtom { 
        return V( 'ModPositioned', { arg } )
      }
    / "rot""ated"? __ "as" __ arg:ValueAtom { 
        return V( 'ModRotatedAs', { arg } )
      }
    / "rot""ated"? __ arg:ValueAngles { 
        return V( 'ModRotated', { arg } )
      }
    / arg:AnglesRelative {
      return V('ModRotated', { arg } )
    }
    / arg:DirectionsRelative {
      return V('ModPositioned', { arg } )
    }
    / arg:DirectionsLocal {
      return V('ModPositioned', { arg } )
    }
//\\ construct  
  Construct 
    = test:Tests then:StatementOrBlock 
        otherwise:(__ "else" @StatementOrBlock)? {
        return V('IfElse', { test, then, otherwise } )
      }
    / "repeat" mods:(__ @mods:Modifiers)? 
      statements:StatementOrBlock? 
      __ test:LoopTests
      then:(__ "then" @StatementOrBlock)? {
        if (mods) return V('RepeatWithMods',{mods,statements,test,then})
        return V('Repeat',{statements,test,then})
      }
    / "after" __ time:ValueTime
      statements:StatementOrBlock 
      then:(__ "then" @StatementOrBlock)? {
        return V('After', { time, statements, then } )
      }
    /  "every" __ time:ValueTime 
        statements:StatementOrBlock 
        test:(__ @LoopTests)?
        then:(__ "then" @StatementOrBlock)? {
          return V('Every',{statements,test,time,then})
      } 
    / "every" __ time:ValueTime 
      test:(__ @LoopTests)?
      then:(__ "then" @StatementOrBlock) {
        return V('Every',{test,time,then})
      }
      
  

  WrappedConstruct 
    = command:(
        head:Promise tail:(__ "and" __ @Promise)* 
        clauses: ThenCatchClause {
          return N('PromiseCall',{promises:[head,...tail],...clauses})
        } 
    ) {
      return I('NativeCommand',{command})
    }
//\\ conditionals

//\\ block macros
  MacroCallSpec 
    = ns:(@WORD ":")? name:NAME args:(_ OPEN @call_args CLOSE)? {
        return N('MacroCallSpec', {ns, name, args})
      }


  Promise
    = "when" __ @PromiseTrue
    / "when" OPEN @PromiseTrue CLOSE
    / "except" __ @PromiseFalse
    / "except" OPEN @PromiseFalse CLOSE

  PromiseTrue = spec:MacroCallSpec {
    return N("PromiseTrue",{spec})
  }
  PromiseFalse = spec:MacroCallSpec {
    return N("PromiseFalse",{spec})
  }

  ThenCatchClause = then:ThenClause _catch:CatchClause? {
    return {then,_catch}
  }

  ThenClause = __ "then" __ @StatementOrBlock
  CatchClause = __ "catch" __ @StatementOrBlock
  

  PseudoCall
    = "reject" _ "(" _ ")" {
        return I('Reject')
      }
    / "resolve" _ "(" _ ")"  {
        return I('Resolve')
      }
    / "self" _ "(" _ ")" {
        return I('CallSelf', {} )
      }


 
  CallFunctionTag
    =  restag:ValueResTag _ OPEN _ CLOSE {
      return I('CallFunctionTag', { restag } )
    }


  LiteralValue
    = ValueConstant
    / PseudoFunction
    / LiteralArray
    / LiteralObject
    / LiteralRaw
    / LiteralScalar
    

  LiteralScalar
    = LiteralBoolean
    / LiteralString
    / LiteralFloat
    / LiteralInt 

  LiteralBoolean 
    = "true" {  return V('LiteralBoolean', {}, { value: true  } ) }
    / "false" { return V('LiteralBoolean', {}, { value: false } ) }

  


  LiteralInt
    = value:INT ![.df]i suffix:[islb]i? { 
      const Class = ({
        i: 'LiteralInt',
        b: 'LiteralByte',
        l: 'LiteralLong',
        s: 'LiteralShort'
      })[suffix||"i"]
      return V(Class, {}, {value})
    }

  LiteralFloat
    = value:(FLOAT/INT) ![islb]i suffix:[df]i? { 
      const Class = ({
        f: 'LiteralFloat',
        d: 'LiteralDouble'
      })[suffix||"f"]
      return V(Class, {}, {value})
    }

  LiteralUntypedNumber
    = value:(FLOAT/INT) {
      return V('LiteralFloat', {}, {value})
    }


  LiteralArray
    = "[" ___
      items: (
        head:ArrayItem
        tail:(COMMA @ArrayItem)*
        COMMA?
        { return [head].concat(tail); }
      )?
      ___ "]"
      { return V('LiteralArray', { items: items || [] } ) }

    ArrayItem
      = SpreadArray / LiteralValue
    
    SpreadArray
      = "..." _ right:LiteralValue {
        return V('SpreadArray',{right})
      }
  
  LiteralObject
    = "{" ___
      props:(
        head:ObjectProp tail:(COMMA @ObjectProp)* COMMA? {
          return [head, ...tail];
        }
      )?
      ___ "}"
      { return V('LiteralObject', { props: props || [] } ) }
    
    ObjectProp
      = SpreadObject
      / key:(ObjectPropKey) _":" ___ value:LiteralValue {
          return  V('LiteralProp', { key, value })
        }
    ObjectPropKey
      = LiteralScalar

    SpreadObject
      = "..." _ right:LiteralValue {
        return V('SpreadObject', {right})
      }

  LiteralString
    = LiteralTemplate
    / LiteralIdent

  LiteralRaw
    = value:raw_tag {
      return V('LiteralRaw',{value})
    }

  LiteralTemplate
    = '"' @TemplateContent '"'

  TemplateContent
    = value:template_content {
      return V('LiteralString', { value } )
    }

  LiteralIdent
    = value:IDENT {
      return V('LiteralString', {},{ value } )
    }

  PseudoFunction
    = "json" __ arg:LiteralValue {
        return V('FunctionJson',{arg})
      }
    / "snbt" __ arg:LiteralValue {
        return V('FunctionSnbt',{arg})
      }

  BlockPredicate
    = OPEN position:ValueCoords __ block:BlockSpec CLOSE {
      return V('BlockPredicate',{position,block})
    }
    / BlockSpec

  BlockSpec 
    = resloc: (ValueConstant/ValueResLoc/ValueResTag)
      states:(CONCAT @BlockStates)?
      nbt:(CONCAT @LiteralObject)? {
        return V('BlockSpec',{resloc,states,nbt})
      }

    BlockStates
      = "[" ___
        props:(
          head:BlockState tail:(COMMA @BlockState)* COMMA? {
            return [head, ...tail];
          }
        )?
        ___ "]"
        { return V('LiteralObject', { props: props || [] } ) }
    
    BlockState
      = SpreadObject
      / key:(ObjectPropKey) _"=" ___ value:LiteralValue {
          return  V('LiteralProp', { key, value })
        }    


    Tests 
      = head:Test tail:(__ "and" __ @Test)* {
          return V('Tests',{tests:[head,...tail]})
        }
    
    Test
      = "if" __ arg:TestValue {
          return V('TestTrue',{arg})
        }
      / "unless" __ arg:TestValue {
        return V('TestFalse',{arg})
      }


    LoopTests 
      = head:LoopTest tail:(__ "and" __ @LoopTest)* {
          return V('Tests',{tests:[head,...tail]})
        }
    
    LoopTest
      = "while" __ arg:TestValue {
          return V('TestTrue',{arg})
        }
      / "until" __ arg:TestValue {
        return V('TestFalse',{arg})
      }

    TestValue
      = OPEN @TestValue CLOSE
      / ValuePredicate      
      / BlockPredicate
      / ValueExpr
    
    ValuePredicate
      = "predicate" __ resloc:ValueResLoc {
        return V('ValuePredicate',{resloc})
      }

ValueTime
  = value:(LiteralUntypedNumber/Parens)
    unit:[tds] {
      return V('Time',{value},{unit})
    }


ValuePosition 
    = OPEN @ValueCoords CLOSE 
    
  ValueCoords 
    = DirectionsRelative
    / DirectionsLocal
    / PositionLocal
    / PositionWorld
  
  DirectionsRelative
    = head: DirectionRelative tail:(__ @DirectionRelative)* {
      return V('DirectionsRelative',{ directions: [head, ...tail]} )
    }
    
  DirectionRelative
    = direction:DirectionRelativeName __ arg:ValueAtom {
        return V('DirectionRelative', { arg } , { direction } ) 
      }
  DirectionRelativeName
    = "east"  
    / "west"  
    / "up"    
    / "down"  
    / "south" 
    / "north" 

  DirectionsLocal
    = head: DirectionLocal tail:(__ @DirectionLocal)* {
      return V('DirectionsLocal',{ directions: [head, ...tail]} )
    }
    
  DirectionLocal
    = direction:DirectionLocalName __ arg:ValueAtom {
        return V('DirectionLocal', { arg } , { direction } ) 
      }

  DirectionLocalName
    = "left"        
    / "right"       
    / "upward"      
    / "downward"    
    / "forward"     
    / "back""ward"? { return "back" }

  PositionLocal
    = "^" x:ValueAtom? __ "^" y:ValueAtom? __ "^" z:ValueAtom? {
        return V('PositionLocal',{x,y,z})  
      }

  PositionWorld
    = x:CoordWorld __ y:CoordWorld __ z:CoordWorld {
        return V('PositionWorld',{x,y,z})  
      }

  CoordWorld
    = tilde:"~" arg:ValueAtom? {
        return V('CoordWorld',{arg},{relative:!!tilde})  
      }
    / arg:ValueAtom {
        return V('CoordWorld',{arg},{relative:false})  
      }

  ValueRotation
    = OPEN @ValueAngles CLOSE

  ValueAngles
    = AnglesRelative
    / RotationWorld

  AnglesRelative
    = head: AngleRelative 
      tail:(__ @AngleRelative)* {
        return V('AnglesRelative',{ directions: [head, ...tail]} )
      }
    
  AngleRelative
    = direction:AngleRelativeName 
      __ arg:(LiteralUntypedNumber/Parens) "deg" {
        return V('AngleRelative', { arg } , { direction } ) 
      }
  AngleRelativeName
    = "up"    
    / "down"  
    / "left" 
    / "right" 

  RotationWorld
    = x:CoordWorld __ y:CoordWorld {
        return V('RotationWorld',{x,y})  
      }
