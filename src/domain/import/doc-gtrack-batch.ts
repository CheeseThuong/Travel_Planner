import { parseGTrackJson, type GTrackPlace } from "./gtrack-json";

export interface DocBatchItem {readonly place:GTrackPlace; readonly rawJson:string; readonly key:string;readonly ordinal:number}
export interface DocBatchResult {readonly items:readonly DocBatchItem[];readonly invalid:readonly {ordinal:number;reason:string}[];readonly duplicateCount:number}

/** Staging/preview only: no remote writes, no Google fetch, no unverified metadata publication. */
export function parseGTrackBatch(source:string):DocBatchResult {
  if (new TextEncoder().encode(source).byteLength>2_000_000) throw new Error("Tệp quá lớn (tối đa 2 MB).");
  let root:unknown;
  try {root=JSON.parse(source);} catch {throw new Error("Tệp không phải JSON hợp lệ.");}
  const records = Array.isArray(root)?root:root&&typeof root==="object"&&"places" in root&&Array.isArray((root as {places?:unknown}).places)?(root as {places:unknown[]}).places:[root];
  if(records.length>100) throw new Error("Mỗi lượt tối đa 100 địa điểm. Hãy chia tệp thành nhiều phần.");
  const seen=new Set<string>(), items:DocBatchItem[]=[],invalid:{ordinal:number;reason:string}[]=[];let duplicateCount=0;
  records.forEach((record,index)=>{
    try {
      const rawJson=JSON.stringify(record);
      const place=parseGTrackJson(rawJson);
      const locationKey=place.location.lat.toFixed(5)+"/"+place.location.lng.toFixed(5);
      const normalized=place.title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/đ/g,"d").trim();
      const key=place.placeId?`google:${place.placeId}`:place.cid?`cid:${place.cid}`:`geo:${normalized}:${locationKey}`;
      if(seen.has(key)){duplicateCount++;return;}seen.add(key);items.push({place,rawJson,key,ordinal:index+1});
    }catch(e){invalid.push({ordinal:index+1,reason:e instanceof Error?e.message:"Dữ liệu không hợp lệ"});}
  });
  return {items,invalid,duplicateCount};
}
