export function isProceduralMapId(id) {
  if (typeof id !== 'string') return false;
  const match=/^procedural-(?:v(?:3|4|5|6|7|8|9)-(balanced|river|highlands|urban|coastal|forest)-(?:1536|1792|2048|4096|6144)|(?:v2-)?(balanced|river|highlands|urban|coastal|forest))-(\d+)$/.exec(id);
  return !!match && (id.includes('-v9-') ? /-(4096|6144)-/.test(id) : !/-(4096|6144)-/.test(id)) && Number(match[3]) <= 4294967295;
}
