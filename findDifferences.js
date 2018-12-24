const fs=require("fs");

ROOT_PATH=".\\Playlists";
DIFF_PATH=".\\Differences"

function log(v){console.log(v);}
function Slog(v){console.log(JSON.stringify(v));}

function array_map(f){
    return (arr)=>(arr.map(f));
}

function array_pick(x){
    return (arr)=>(arr[x]);
}

function open_a_file(file){
    return new Promise((resolve,reject)=>{
        fs.readFile(file,(err,data)=>{
            if(err)reject(err);
            resolve(JSON.parse(data));
        });
    });
}

function write_a_file([file,data]){
    return new Promise((resolve,reject)=>{
        fs.writeFile(file,JSON.stringify(data),(err)=>{
            if(err)reject(err);
            resolve(file);
        });
    });
}

function open_files(files){
    return Promise.all(files.map(open_a_file));
}

function get_last_two_snapshots(path){
    return new Promise((resolve,reject)=>{
        var snapshots_list = [];
        fs.readdir(path,{withFileTypes:true},(err,files)=>{
            if(err)reject(err);
            files.forEach((file)=>{
                if(file.isFile()&&file.name.match(/^\d+.json$/)){
                    snapshots_list.push(Number(file.name.split(".")[0]));
            }});
            if(snapshots_list.length<2){reject(new Error(`[get last 2]len=${snapshots_list.length}.`));}
            snapshots_list=snapshots_list.sort();
            resolve([snapshots_list.pop(),snapshots_list.pop()]);
        });
    });
}

function array_compare([arr_1,arr_2]){
    return new Promise((resolve,reject)=>{
        var same_ele = [];
        var added_ele = [];
        var deleted_ele = [];
        for(var i=0;i<arr_1.length;i+=1){
            flag=false;
            for(var j=0;j<arr_2.length;j+=1){
                if(arr_1[i].id==arr_2[j].id){
                    flag=true;
                    break;
                }
            }
            if(flag){
                same_ele.push(arr_1[i]);
                arr_2.splice(j,1);
            } else {
                added_ele.push(arr_1[i]);
            }
        }
        deleted_ele=arr_2;
        resolve([same_ele,added_ele,deleted_ele]);
    });
}

function wrap_diffs(samef,addedf,deletedf){
    return ([ss,as,ds])=>{
        //console.log(`[ss]${ss}`);
        //console.log(`[as]${as}`);
        //console.log(`[ds]${ds}`);
        var ans = [];
        if(samef) ans=ans.concat(ss.map(samef));
        if(addedf) ans=ans.concat(as.map(addedf));
        if(deletedf) ans=ans.concat(ds.map(deletedf));
        //console.log(`[ans]${ans}`);
        return ans;
    }
}

function same_playlists_compare([paths,playlists]){
    var ans=[];
    playlists.forEach((pl)=>{
        ans.push(
            Promise.resolve(paths)
                .then(array_map(path=>`${path}\\${pl.id}.json`))
                .then(open_files)
                .then(array_map(p=>p["playlist"]["tracks"]))
                .then(array_compare)
                .then(wrap_diffs(
                    //(s)=>({type:"~",music:s}),
                    null,
                    (a)=>({type:"+",music:a}),
                    (d)=>({type:"-",music:d})))
                .then(dif=>({type:"~",playlist:pl,music_change:dif}))
        )
    });
    return Promise.all(ans);
}

function added_playlists_compare([path,playlists]){
    var ans=[];
    playlists.forEach((pl)=>{
        ans.push(
            Promise.resolve(path)
                .then(p=>`${p}\\${pl.id}.json`)
                .then(open_a_file)
                .then(p=>p["playlist"]["tracks"])
                .then(array_map((a)=>({type:"+",music:a})))
                .then(dif=>({type:"+",playlist:pl,music_change:dif}))
        );
    });
    return Promise.all(ans);
}

function deleted_playlists_compare([path,playlists]){
    var ans=[];
    playlists.forEach((pl)=>{
        ans.push(
            Promise.resolve(path)
                .then(p=>`${p}\\${pl.id}.json`)
                .then(open_a_file)
                .then(p=>p["playlist"]["tracks"])
                .then(array_map((a)=>({type:"-",music:a})))
                .then(dif=>({type:"-",playlist:pl,music_change:dif}))
        );
    });
    return Promise.all(ans);
}

function clean_same_playlists([spl,apl,dpl]){
    return [spl.filter(p=>(p["music_change"].length)),apl,dpl];
}

var last_two_snapshots=Promise.resolve(ROOT_PATH)
                                        .then(get_last_two_snapshots)
                                        
var playlist_diffs=last_two_snapshots
                            .then(array_map(sid=>`${ROOT_PATH}\\${sid}.json`))
                            .then(open_files)
                            .then(array_map(snp=>snp["playlist"]))
                            .then(array_compare)
                            //.then(log);
                            
var on_same_playlists=Promise.all([
                        last_two_snapshots
                            .then(array_map(sid=>`${ROOT_PATH}\\${sid}`)),
                        playlist_diffs
                            .then(array_pick(0))])
                        .then(same_playlists_compare)
                        //.then(log);
                        
var on_added_playlists=Promise.all([
                        last_two_snapshots
                            .then(array_pick(0))
                            .then(sid=>`${ROOT_PATH}\\${sid}`),
                        playlist_diffs
                            .then(array_pick(1))])
                        .then(added_playlists_compare);
                        //.then(log);

var on_deleted_playlists=Promise.all([
                        last_two_snapshots
                            .then(array_pick(1))
                            .then(sid=>`${ROOT_PATH}\\${sid}`),
                        playlist_diffs
                            .then(array_pick(2))])
                        .then(deleted_playlists_compare);
                        
var final_stage=Promise.all([
                        on_same_playlists,
                        on_added_playlists,
                        on_deleted_playlists
                    ])
                    .then(clean_same_playlists)
                    //.then(log);
                    
var write_in_file=Promise.all([
                        last_two_snapshots
                            .then(array_pick(0))
                            .then(sid=>`${DIFF_PATH}\\${sid}.json`),
                        final_stage])
                        .then(write_a_file);
                    
                        