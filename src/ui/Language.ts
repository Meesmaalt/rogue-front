import english from '../data/english.json';
export type Language='et'|'en';
export function getLanguage():Language {try{return localStorage.getItem('rogue-front.language')==='en'?'en':'et';}catch{return 'et';}}
export function setLanguage(language:Language):void {localStorage.setItem('rogue-front.language',language);location.reload();}
const entries=Object.entries(english).sort((a,b)=>b[0].length-a[0].length);
const dictionary=new Map(entries.map(([a,b])=>[a.toLocaleLowerCase('et'),b]));
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=new RegExp(`(?<![\\p{L}])(?:${entries.map(([a])=>escape(a)).join('|')})(?![\\p{L}])`,'giu');
/** Presentation-only translation: never translate IDs, form values, saves or commands. */
const translationCache=new Map<string,string>();
export function englishText(text:string):string {
 const cached=translationCache.get(text);if(cached!==undefined)return cached;
 const result=text.replace(pattern,match=>{const translated=dictionary.get(match.toLocaleLowerCase('et'))??match;return match===match.toLocaleUpperCase('et')?translated.toUpperCase():translated;});
 if(translationCache.size>=2048)translationCache.clear();translationCache.set(text,result);return result;
}
export function installLanguage():void {
 document.documentElement.lang=getLanguage();if(getLanguage()!=='en')return;
 const attributes=['title','aria-label','placeholder'];
 const visit=(node:Node):void=>{
  if(node instanceof Text){if(node.parentElement?.closest('script,style,textarea,input,[contenteditable="true"],[data-no-translate]'))return;const source=node.data,translated=englishText(source);if(source!==translated)node.data=translated;return;}
  if(node instanceof Element){if(node.matches('script,style,textarea,input[type="text"],[contenteditable="true"],[data-no-translate]'))return;for(const key of attributes){const value=node.getAttribute(key);if(value){const translated=englishText(value);if(translated!==value)node.setAttribute(key,translated);}}}
  node.childNodes.forEach(visit);
 };
 visit(document.body);
 const observer=new MutationObserver(records=>{
  // Disconnect during our writes to avoid feedback and a second observer pass.
  observer.disconnect();
  for(const record of records){if(record.type==='childList')record.addedNodes.forEach(visit);else visit(record.target);}
  observe();
 });
 const observe=()=>observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});observe();
}
