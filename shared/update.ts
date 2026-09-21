export function stableVersion(tag:string){
  const match=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag.trim())
  return match?{tag:`v${match[1]}.${match[2]}.${match[3]}`,version:`${match[1]}.${match[2]}.${match[3]}`,parts:match.slice(1).map(Number)}:undefined
}

export function isNewerStableVersion(current:string,latestTag:string){
  const latest=stableVersion(latestTag);if(!latest)return false
  const currentMatch=/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(current.trim())
  if(!currentMatch)return false
  const currentParts=currentMatch.slice(1,4).map(Number)
  for(let i=0;i<3;i++){if(latest.parts[i]!==currentParts[i])return latest.parts[i]>currentParts[i]}
  return !!currentMatch[4]
}
