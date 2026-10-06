/** Browser-owned fullscreen, invoked only by an explicit button click. */
export function bindFullscreen(button:HTMLButtonElement,onError:(message:string)=>void=()=>{}):void {
 const refresh=()=>{button.textContent=document.fullscreenElement?'Välju täisekraanist':'Täisekraan';button.setAttribute('aria-pressed',String(!!document.fullscreenElement));};
 button.disabled=!document.fullscreenEnabled;
 button.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{onError('Brauser ei lubanud täisekraani.');}refresh();};
 document.addEventListener('fullscreenchange',refresh);refresh();
}
