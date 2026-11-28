const API="https://www.googleapis.com/drive/v3/files";
const FOLDER="application/vnd.google-apps.folder";
const quote=s=>String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
const children=id=>"'"+quote(id)+"' in parents and trashed=false";
export async function listDriveFiles(request,q){
  const files=[];const seen=new Set();let pageToken;
  do{
    const params=new URLSearchParams({q,spaces:"drive",fields:"nextPageToken,files(id,name,mimeType,createdTime)",pageSize:"1000",...(pageToken?{pageToken}:{})});
    const page=await request(API+"?"+params);
    if(!Array.isArray(page?.files))throw new Error("Invalid Drive file listing");
    files.push(...page.files);
    pageToken=page.nextPageToken;
    if(pageToken){if(seen.has(pageToken))throw new Error("Repeated Drive page");seen.add(pageToken);}
  }while(pageToken);
  return files;
}
export async function listDriveSnapshots(request){
  const roots=await listDriveFiles(request,"name='FriendshipTree Sync' and mimeType='"+FOLDER+"' and trashed=false");
  const snapshots=[];
  for(const root of roots){
    const folders=await listDriveFiles(request,children(root.id)+" and mimeType='"+FOLDER+"' and name contains 'snapshot-'");
    for(const f of folders){
      if(!f.name.startsWith("snapshot-"))continue;
      const manifests=await listDriveFiles(request,children(f.id)+" and name='manifest.json'");
      if(manifests.length===1)snapshots.push({...f,manifestId:manifests[0].id});
    }
  }
  return snapshots.sort((a,b)=>String(b.createdTime||b.name).localeCompare(String(a.createdTime||a.name)));
}
const getJson=(request,id)=>request(API+"/"+encodeURIComponent(id)+"?alt=media");
export function validateDriveManifest(m,folderId){
  if(m?.format!=="FriendshipTreeDriveSnapshot"||m.version!==1||m.driveSnapshot?.complete!==true||m.driveSnapshot.snapshotFolderId!==folderId||typeof m.driveSnapshot.photosFolderId!=="string"||!m.driveSnapshot.photosFolderId)throw new Error("Unsupported or incomplete Drive snapshot");
  for(const [field,count] of [["profilePhotoKeys","profilePhotos"],["galleryPhotoKeys","galleryPhotos"]]){
    const keys=m[field];
    if(!Array.isArray(keys)||keys.some(k=>typeof k!=="string"||!k)||new Set(keys).size!==keys.length||m.counts?.[count]!==keys.length)throw new Error("Invalid photo index: "+field);
  }
  if(typeof m.selection?.appData!=="boolean"||!m.localStorageData||typeof m.localStorageData!=="object"||!Array.isArray(m.nodes)||!Array.isArray(m.links))throw new Error("Invalid snapshot data");
  return m;
}
export async function downloadDriveSnapshot({request,snapshot,write,progress=()=>{}}){
  const m=validateDriveManifest(await getJson(request,snapshot.manifestId),snapshot.id);
  const folders=await listDriveFiles(request,children(snapshot.id)+" and mimeType='"+FOLDER+"'");
  if(!folders.some(f=>f.id===m.driveSnapshot.photosFolderId&&f.name==="photos"))throw new Error("Snapshot photos folder is missing");
  const files=await listDriveFiles(request,children(m.driveSnapshot.photosFolderId));
  const expected={photos:new Set(m.profilePhotoKeys),gallery:new Set(m.galleryPhotoKeys)};
  const count=expected.photos.size+expected.gallery.size;
  if(new Set(files.map(f=>f.name)).size!==files.length||files.length!==count)throw new Error("Snapshot photo file count mismatch");
  await write("manifest.json.partial",{format:m.format,status:"downloading"});
  let done=0;
  for(const file of files){
    const match=/^(photos|gallery)-\d+-[A-Za-z0-9._-]*\.json$/.exec(file.name);
    if(!match)throw new Error("Unexpected snapshot file name");
    const store=match[1];const record=await getJson(request,file.id);
    const key=store==="photos"?record?.nodeId:record?.key;
    if(!expected[store].delete(key)||typeof record?.dataUrl!=="string"||!record.dataUrl)throw new Error("Unexpected, duplicate or invalid photo record");
    await write("photos/"+file.name,record);
    progress(++done,count);
  }
  if(expected.photos.size||expected.gallery.size)throw new Error("Snapshot missing expected photo records");
  await write("manifest.json",m);
  return {manifest:m,count};
}
