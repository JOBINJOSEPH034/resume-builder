export function readableMessage(value,fallback='Something went wrong. Please try again.') {
  if(typeof value==='string'){const text=value.trim();if(!text)return fallback;if(text.startsWith('{')||text.startsWith('[')){try{return readableMessage(JSON.parse(text),fallback);}catch{return fallback;}}return text.length>500?fallback:text;}
  if(Array.isArray(value))return readableMessage(value.find(item=>typeof item==='string'),fallback);
  if(value&&typeof value==='object')return readableMessage(value.error||value.detail||value.message||Object.values(value).find(item=>typeof item==='string'),fallback);
  return fallback;
}
export function announce(message,type='info'){window.dispatchEvent(new CustomEvent('rc-notice',{detail:{message:readableMessage(message),type}}));}
export function askConfirmation(options){return new Promise(resolve=>window.dispatchEvent(new CustomEvent('rc-dialog',{detail:{...options,resolve}})));}
