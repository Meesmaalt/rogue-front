export function isProceduralMapId(id) {
  if (typeof id !== 'string') return false;
  const match=/^procedural-(?:v(?:3|4|5|6|7|8)-(balanced|river|highlands|urban|coastal|forest)-(?:1536|1792|2048)|(?:v2-)?(balanced|river|highlands|urban|coastal|forest))-(\d+)$/.exec(id);
  return !!match && Number(match[3]) <= 4294967295;
}
