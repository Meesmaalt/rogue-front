export function isProceduralMapId(id) {
  if (typeof id !== 'string') return false;
  const custom=/^(procedural-v13-(?:balanced|river|highlands|urban|coastal|forest)-(?:2048|2560|3072|4096|5120|6144)-\d+)-o(\d+)$/.exec(id);
  if(custom)return Number(custom[2])<=15&&String(Number(custom[2]))===custom[2]&&isProceduralMapId(custom[1]);
  if(/^procedural-v(?:11|12|13)-(balanced|river|highlands|urban|coastal|forest)-(2048|2560|3072|4096|5120|6144)-(\d+)$/.test(id))return Number(id.split('-').at(-1))<=4294967295;
  const match=/^procedural-(?:v(?:3|4|5|6|7|8|9|10)-(balanced|river|highlands|urban|coastal|forest)-(?:1536|1792|2048|4096|6144)|(?:v2-)?(balanced|river|highlands|urban|coastal|forest))-(\d+)$/.exec(id);
  return !!match && (/-v(9|10)-/.test(id) ? /-(4096|6144)-/.test(id) : !/-(4096|6144)-/.test(id)) && Number(match[3]) <= 4294967295;
}
