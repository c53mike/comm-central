bespin.tiki.register("::syntax_worker",{name:"syntax_worker",dependencies:{syntax_directory:"0.0.0",underscore:"0.0.0"}});
bespin.tiki.module("syntax_worker:index",function(b,f){var c=b("bespin:promise"),d=b("underscore")._;b("bespin:console");var a=b("syntax_directory").syntaxDirectory;f.syntaxWorker={engines:{},annotate:function(e,m){function n(i){return i.split(":")}function o(){p.push(d(g).invoke("join",":").join(" "))}var l=this.engines,p=[],j=[],q=[],g=d(e.split(" ")).map(n);d(m).each(function(i){o();for(var r=[],t={},k=0;k<i.length;){for(var s;;){s=d(g).last();if(s.length<3)break;var h=s[2];if(i.substring(k,k+
h.length)!==h)break;g.pop()}h=l[s[0]].get(s,i,k);if(h==null)k={state:"plain",tag:"plain",start:k,end:i.length};else{g[g.length-1]=h.state;h.hasOwnProperty("newContext")&&g.push(h.newContext);k=h.token;h=h.symbol;if(h!=null)t["-"+h[0]]=h[1]}r.push(k);k=k.end}j.push(r);q.push(t)});o();return{states:p,attrs:j,symbols:q}},loadSyntax:function(e){var m=new c.Promise,n=this.engines;if(n.hasOwnProperty(e)){m.resolve();return m}var o=a.get(e);if(o==null)throw new Error('No syntax engine installed for syntax "'+
e+'".');o.extension.load().then(function(l){n[e]=l;l=l.subsyntaxes;l==null?m.resolve():c.group(d(l).map(this.loadSyntax,this)).then(d(m.resolve).bind(m))}.bind(this));return m}}});bespin.tiki.register("::stylesheet",{name:"stylesheet",dependencies:{standard_syntax:"0.0.0"}});
bespin.tiki.module("stylesheet:index",function(b,f){b("bespin:promise");b=b("standard_syntax").StandardSyntax;var c={regex:/^\/\/.*/,tag:"comment"},d=function(a){return[{regex:/^[^*\/]+/,tag:"comment"},{regex:/^\*\//,tag:"comment",then:a},{regex:/^[*\/]/,tag:"comment"}]};c={start:[{regex:/^([a-zA-Z-\s]*)(?:\:)/,tag:"identifier",then:"style"},{regex:/^([\w]+)(?![a-zA-Z0-9_:])([,|{]*?)(?!;)(?!(;|%))/,tag:"keyword",then:"header"},{regex:/^#([a-zA-Z]*)(?=.*{*?)/,tag:"keyword",then:"header"},{regex:/^\.([a-zA-Z]*)(?=.*{*?)/,
tag:"keyword",then:"header"},c,{regex:/^\/\*/,tag:"comment",then:"comment"},{regex:/^./,tag:"plain"}],header:[{regex:/^[^{|\/\/|\/\*]*/,tag:"keyword",then:"start"},c,{regex:/^\/\*/,tag:"comment",then:"comment_header"}],style:[{regex:/^[^;|}|\/\/|\/\*]+/,tag:"plain"},{regex:/^;|}/,tag:"plain",then:"start"},c,{regex:/^\/\*/,tag:"comment",then:"comment_style"}],comment:d("start"),comment_header:d("header"),comment_style:d("style")};f.CSSSyntax=new b(c)});bespin.tiki.register("::html",{name:"html",dependencies:{standard_syntax:"0.0.0"}});
bespin.tiki.module("html:index",function(b,f){b=b("standard_syntax").StandardSyntax;var c={},d=function(a,e){c[a+"_beforeAttrName"]=[{regex:/^\s+/,tag:"plain"},{regex:/^\//,tag:"operator",then:a+"_selfClosingStartTag"},{regex:/^>/,tag:"operator",then:e},{regex:/^./,tag:"keyword",then:a+"_attrName"}];c[a+"_attrName"]=[{regex:/^\s+/,tag:"plain",then:a+"_afterAttrName"},{regex:/^\//,tag:"operator",then:a+"_selfClosingStartTag"},{regex:/^=/,tag:"operator",then:a+"_beforeAttrValue"},{regex:/^>/,tag:"operator",
then:e},{regex:/^["'<]+/,tag:"error"},{regex:/^[^ \t\n\/=>"'<]+/,tag:"keyword"}];c[a+"_afterAttrName"]=[{regex:/^\s+/,tag:"plain"},{regex:/^\//,tag:"operator",then:a+"_selfClosingStartTag"},{regex:/^=/,tag:"operator",then:a+"_beforeAttrValue"},{regex:/^>/,tag:"operator",then:e},{regex:/^./,tag:"keyword",then:a+"_attrName"}];c[a+"_beforeAttrValue"]=[{regex:/^\s+/,tag:"plain"},{regex:/^"/,tag:"string",then:a+"_attrValueQQ"},{regex:/^(?=&)/,tag:"plain",then:a+"_attrValueU"},{regex:/^'/,tag:"string",
then:a+"_attrValueQ"},{regex:/^>/,tag:"error",then:e},{regex:/^./,tag:"string",then:a+"_attrValueU"}];c[a+"_attrValueQQ"]=[{regex:/^"/,tag:"string",then:a+"_afterAttrValueQ"},{regex:/^[^"]+/,tag:"string"}];c[a+"_attrValueQ"]=[{regex:/^'/,tag:"string",then:a+"_afterAttrValueQ"},{regex:/^[^']+/,tag:"string"}];c[a+"_attrValueU"]=[{regex:/^\s/,tag:"string",then:a+"_beforeAttrName"},{regex:/^>/,tag:"operator",then:e},{regex:/[^ \t\n>]+/,tag:"string"}];c[a+"_afterAttrValueQ"]=[{regex:/^\s/,tag:"plain",
then:a+"_beforeAttrName"},{regex:/^\//,tag:"operator",then:a+"_selfClosingStartTag"},{regex:/^>/,tag:"operator",then:e},{regex:/^(?=.)/,tag:"operator",then:a+"_beforeAttrName"}];c[a+"_selfClosingStartTag"]=[{regex:/^>/,tag:"operator",then:"start"},{regex:/^./,tag:"error",then:a+"_beforeAttrName"}]};c={start:[{regex:/^[^<]+/,tag:"plain"},{regex:/^<!--/,tag:"comment",then:"commentStart"},{regex:/^<!/,tag:"directive",then:"markupDeclarationOpen"},{regex:/^<\?/,tag:"comment",then:"bogusComment"},{regex:/^</,
tag:"operator",then:"tagOpen"}],tagOpen:[{regex:/^\//,tag:"operator",then:"endTagOpen"},{regex:/^script/i,tag:"keyword",then:"script_beforeAttrName"},{regex:/^[a-zA-Z]/,tag:"keyword",then:"tagName"},{regex:/^(?=.)/,tag:"plain",then:"start"}],scriptData:[{regex:/^<(?=\/script>)/i,tag:"operator",then:"tagOpen"},{regex:/^[^<]+/,tag:"plain"}],endTagOpen:[{regex:/^[a-zA-Z]/,tag:"keyword",then:"tagName"},{regex:/^>/,tag:"error",then:"start"},{regex:/^./,tag:"error",then:"bogusComment"}],tagName:[{regex:/^\s+/,
tag:"plain",then:"normal_beforeAttrName"},{regex:/^\//,tag:"operator",then:"normal_selfClosingStartTag"},{regex:/^>/,tag:"operator",then:"start"},{regex:/^[^ \t\n\/>]+/,tag:"keyword"}],bogusComment:[{regex:/^[^>]+/,tag:"comment"},{regex:/^>/,tag:"comment",then:"start"}],markupDeclarationOpen:[{regex:/^doctype/i,tag:"directive",then:"doctype"},{regex:/^(?=.)/,tag:"comment",then:"bogusComment"}],commentStart:[{regex:/^--\>/,tag:"comment",then:"start"},{regex:/^[^-]+/,tag:"comment"}],doctype:[{regex:/^\s/,
tag:"plain",then:"beforeDoctypeName"},{regex:/^./,tag:"error",then:"beforeDoctypeName"}],beforeDoctypeName:[{regex:/^\s+/,tag:"plain"},{regex:/^>/,tag:"error",then:"start"},{regex:/^./,tag:"directive",then:"doctypeName"}],doctypeName:[{regex:/^\s/,tag:"plain",then:"afterDoctypeName"},{regex:/^>/,tag:"directive",then:"start"},{regex:/^[^ \t\n>]+/,tag:"directive"}],afterDoctypeName:[{regex:/^\s+/,tag:"directive"},{regex:/^>/,tag:"directive",then:"start"},{regex:/^public/i,tag:"directive",then:"afterDoctypePublicKeyword"},
{regex:/^system/i,tag:"directive",then:"afterDoctypeSystemKeyword"},{regex:/^./,tag:"error",then:"bogusDoctype"}],afterDoctypePublicKeyword:[{regex:/^\s+/,tag:"plain",then:"beforeDoctypePublicId"},{regex:/^"/,tag:"error",then:"doctypePublicIdQQ"},{regex:/^'/,tag:"error",then:"doctypePublicIdQ"},{regex:/^>/,tag:"error",then:"start"},{regex:/^./,tag:"error",then:"bogusDoctype"}],beforeDoctypePublicId:[{regex:/^\s+/,tag:"plain"},{regex:/^"/,tag:"string",then:"doctypePublicIdQQ"},{regex:/^'/,tag:"string",
then:"doctypePublicIdQ"},{regex:/^>/,tag:"error",then:"start"},{regex:/^./,tag:"error",then:"bogusDoctype"}],doctypePublicIdQQ:[{regex:/^"/,tag:"string",then:"afterDoctypePublicId"},{regex:/^>/,tag:"error",then:"start"},{regex:/^[^>"]+/,tag:"string"}],doctypePublicIdQ:[{regex:/^'/,tag:"string",then:"afterDoctypePublicId"},{regex:/^>/,tag:"error",then:"start"},{regex:/^[^>']+/,tag:"string"}],afterDoctypePublicId:[{regex:/^\s/,tag:"plain",then:"betweenDoctypePublicAndSystemIds"},{regex:/^>/,tag:"directive",
then:"start"},{regex:/^"/,tag:"error",then:"doctypeSystemIdQQ"},{regex:/^'/,tag:"error",then:"doctypeSystemIdQ"},{regex:/^./,tag:"error",then:"bogusDoctype"}],betweenDoctypePublicAndSystemIds:[{regex:/^\s+/,tag:"plain",then:"betweenDoctypePublicAndSystemIds"},{regex:/^>/,tag:"directive",then:"start"},{regex:/^"/,tag:"string",then:"doctypeSystemIdQQ"},{regex:/^'/,tag:"string",then:"doctypeSystemIdQ"},{regex:/^./,tag:"error",then:"bogusDoctype"}],afterDoctypeSystemKeyword:[{regex:/^\s/,tag:"plain",
then:"beforeDoctypeSystemId"},{regex:/^"/,tag:"error",then:"doctypeSystemIdQQ"},{regex:/^'/,tag:"error",then:"doctypeSystemIdQ"},{regex:/^>/,tag:"error",then:"start"},{regex:/^./,tag:"error",then:"bogusDoctype"}],beforeDoctypeSystemId:[{regex:/^\s+/,tag:"plain",then:"beforeDoctypeSystemId"},{regex:/^"/,tag:"string",then:"doctypeSystemIdQQ"},{regex:/^'/,tag:"string",then:"doctypeSystemIdQ"},{regex:/^>/,tag:"error",then:"start"},{regex:/./,tag:"error",then:"bogusDoctype"}],doctypeSystemIdQQ:[{regex:/^"/,
tag:"string",then:"afterDoctypeSystemId"},{regex:/^>/,tag:"error",then:"start"},{regex:/^[^">]+/,tag:"string"}],doctypeSystemIdQ:[{regex:/^'/,tag:"string",then:"afterDoctypeSystemId"},{regex:/^>/,tag:"error",then:"start"},{regex:/^[^'>]+/,tag:"string"}],afterDoctypeSystemId:[{regex:/^\s+/,tag:"plain"},{regex:/^>/,tag:"directive",then:"start"},{regex:/^./,tag:"error",then:"bogusDoctype"}],bogusDoctype:[{regex:/^>/,tag:"directive",then:"start"},{regex:/^[^>]+/,tag:"directive"}]};d("normal","start");
d("script","start js:start:<\/script>");f.HTMLSyntax=new b(c,["js"])});bespin.tiki.register("::js_syntax",{name:"js_syntax",dependencies:{standard_syntax:"0.0.0"}});
bespin.tiki.module("js_syntax:index",function(b,f){b=b("standard_syntax").StandardSyntax;f.JSSyntax=new b({start:[{regex:/^var(?=\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*require\s*\(\s*['"]([^'"]*)['"]\s*\)\s*[;,])/,tag:"keyword",symbol:"$1:$2"},{regex:/^(?:break|case|catch|continue|default|delete|do|else|false|finally|for|function|if|in|instanceof|let|new|null|return|switch|this|throw|true|try|typeof|var|void|while|with)(?![a-zA-Z0-9_])/,tag:"keyword"},{regex:/^[A-Za-z_][A-Za-z0-9_]*/,tag:"plain"},{regex:/^[^'"\/ \tA-Za-z0-9_]+/,
tag:"plain"},{regex:/^[ \t]+/,tag:"plain"},{regex:/^'(?=.)/,tag:"string",then:"qstring"},{regex:/^"(?=.)/,tag:"string",then:"qqstring"},{regex:/^\/\/.*/,tag:"comment"},{regex:/^\/\*/,tag:"comment",then:"comment"},{regex:/^./,tag:"plain"}],qstring:[{regex:/^(?:\\.|[^'\\])*'?/,tag:"string",then:"start"}],qqstring:[{regex:/^(?:\\.|[^"\\])*"?/,tag:"string",then:"start"}],comment:[{regex:/^[^*\/]+/,tag:"comment"},{regex:/^\*\//,tag:"comment",then:"start"},{regex:/^[*\/]/,tag:"comment"}]})});
bespin.tiki.register("::standard_syntax",{name:"standard_syntax",dependencies:{syntax_worker:"0.0.0",syntax_directory:"0.0.0",underscore:"0.0.0"}});
bespin.tiki.module("standard_syntax:index",function(b,f){b("bespin:promise");var c=b("underscore")._;b("bespin:console");b("syntax_directory");f.StandardSyntax=function(d,a){this.states=d;this.subsyntaxes=a};f.StandardSyntax.prototype={get:function(d,a,e){var m=d[0],n=d[1];if(!this.states.hasOwnProperty(n))throw new Error('StandardSyntax: no such state "'+n+'"');var o=a.substring(e),l={start:e,state:d},p=null;c(this.states[n]).each(function(j){var q=j.regex.exec(o);if(q!=null){var g=q[0].length;l.end=
e+g;l.tag=j.tag;var i=null;if(j.hasOwnProperty("symbol")){i=/^([^:]+):(.*)/.exec(j.symbol.replace(/\$([0-9]+)/g,function(t,k){return q[k]}));i=[i[1],i[2]]}var r=null;if(j.hasOwnProperty("then")){g=j.then.split(" ");j=[m,g[0]];if(g.length>1)r=g[1].split(":")}else if(g===0)throw new Error("StandardSyntax: Infinite loop detected: zero-length match that didn't change state");else j=d;p={state:j,token:l,symbol:i};if(r!=null)p.newContext=r;c.breakLoop()}});return p}}});
bespin.metadata={js_syntax:{resourceURL:"resources/js_syntax/",name:"js_syntax",environments:{worker:true},dependencies:{standard_syntax:"0.0.0"},testmodules:[],provides:[{pointer:"#JSSyntax",ep:"syntax",fileexts:["js","json"],name:"js"}],type:"plugins/supported",description:"JavaScript syntax highlighter"},stylesheet:{resourceURL:"resources/stylesheet/",name:"stylesheet",environments:{worker:true},dependencies:{standard_syntax:"0.0.0"},testmodules:[],provides:[{pointer:"#CSSSyntax",ep:"syntax",fileexts:["css",
"less"],name:"css"}],type:"plugins/supported",description:"CSS syntax highlighter"},syntax_worker:{resourceURL:"resources/syntax_worker/",description:"Coordinates multiple syntax engines",environments:{worker:true},dependencies:{syntax_directory:"0.0.0",underscore:"0.0.0"},testmodules:[],type:"plugins/supported",name:"syntax_worker"},standard_syntax:{resourceURL:"resources/standard_syntax/",description:"Easy-to-use basis for syntax engines",environments:{worker:true},dependencies:{syntax_worker:"0.0.0",
syntax_directory:"0.0.0",underscore:"0.0.0"},testmodules:[],type:"plugins/supported",name:"standard_syntax"},html:{resourceURL:"resources/html/",name:"html",environments:{worker:true},dependencies:{standard_syntax:"0.0.0"},testmodules:[],provides:[{pointer:"#HTMLSyntax",ep:"syntax",fileexts:["htm","html"],name:"html"}],type:"plugins/supported",description:"HTML syntax highlighter"}};
if(typeof window!=="undefined")throw new Error('"worker.js can only be loaded in a web worker. Use the "worker_manager" plugin to instantiate web workers.');var messageQueue=[],target=null;if(typeof bespin==="undefined")bespin={};
function pump(){if(messageQueue.length!==0){var b=messageQueue[0];switch(b.op){case "load":var f=b.base;bespin.base=f;bespin.hasOwnProperty("tiki")||importScripts(f+"tiki.js");if(!bespin.bootLoaded){importScripts(f+"plugin/register/boot");bespin.bootLoaded=true}var c=bespin.tiki.require;c.loader.sources[0].xhr=true;c.ensurePackage("::bespin",function(){var a=c("bespin:plugins").catalog,e=c("bespin:promise").Promise;if(bespin.hasOwnProperty("metadata")){a.registerMetadata(bespin.metadata);a=new e;
a.resolve()}else a=a.loadMetadataFromURL("plugin/register/worker");a.then(function(){c.ensurePackage(b.pkg,function(){target=c(b.module)[b.target];messageQueue.shift();pump()})})});break;case "invoke":f=function(a){postMessage(JSON.stringify({op:"finish",id:b.id,result:a}));messageQueue.shift();pump()};if(!target.hasOwnProperty(b.method))throw new Error("No such method: "+b.method);var d=target[b.method].apply(target,b.args);typeof d==="object"&&d.isPromise?d.then(f,function(a){throw a;}):f(d);break}}}
onmessage=function(b){messageQueue.push(JSON.parse(b.data));messageQueue.length===1&&pump()};
