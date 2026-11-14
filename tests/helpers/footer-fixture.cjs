const fs=require('node:fs'),Module=require('node:module'),ts=require('typescript'),React=require('react');
async function renderFooter(kind='home',long=false){
 const site={siteName:'প্রশ্নোদয়',tagline:'অনলাইনে প্রশ্নপত্র তৈরি করুন',footerText:'অনলাইনে প্রশ্ন তৈরি, কুইজ ও লাইভ মডেল টেস্টের এক ঠিকানা।',social:[],contact:long?{phone:'+8801712345678',email:'a-very-long-contact-address@example.edu.bd'}:{}};
 const mocks={'@/lib/brand':require('./brand.cjs'),'next/link':({href,children,...props})=>React.createElement('a',{href,...props},children),'next/image':()=>null,'@/lib/site':{getSite:async()=>site},'@/lib/db':{db:{page:{findMany:async()=>long?[{slug:'guide',title:'শিক্ষার্থীদের জন্য বিস্তারিত নির্দেশনা এবং অতিরিক্ত সহায়তা পাতা'}]:[]}}}};
 const file=kind==='home'?'components/proshnoday/home/home-footer.tsx':'components/site-footer.tsx';const m=new Module(file);m.require=n=>mocks[n]||require(n);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return require('react-dom/server').renderToStaticMarkup(await m.exports.default());
}
module.exports={renderFooter};
