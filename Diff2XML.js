const fs = require("fs");
const xmlbuilder = require("xmlbuilder");

const DIFF_PATH=".\\Differences";
const XML_PATH=".\\XMLs";
const USER_ID = "587376989";//S1

function log(v){console.log(v);}
function Slog(v){console.log(JSON.stringify(v));}

function get_last_diffrence(path){
    return new Promise((resolve,reject)=>{
        var differences_list = [];
        fs.readdir(path,{withFileTypes:true},(err,files)=>{
            if(err)reject(err);
            files.forEach((file)=>{
                if(file.isFile()&&file.name.match(/^\d+.json$/)){
                    differences_list.push(Number(file.name.split(".")[0]));
            }});
            if(differences_list.length==0){reject(new Error(`[get last diff]No diff.`));}
            differences_list=differences_list.sort();
            resolve(differences_list.pop());
        });
    });
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
        fs.writeFile(file,data,(err)=>{
            if(err)reject(err);
            resolve(file);
        });
    });
}

function symbol_to_english(s){
    if(s=="~")return "same";
    if(s=="+")return "added";
    if(s=="-")return "deleted";
    return null;
}

function convert_snapshot_to_xml([did,diff_data]){
    var ans=xmlbuilder.create("span",null,null,{headless:true});
    var dt=new Date(did);
    var playlists_added=0;
    var playlists_deleted=0;
    var total_musics_added=0;
    var total_musics_deleted=0;
    ans
    .att("id",did)
    .att("class","snapshot")
        .ele("span")
            .att("class","caret")
            .txt(`${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日${dt.getHours()}时${dt.getMinutes()}分${dt.getSeconds()}秒`)
        .up();
    var snapshot_change = ans.ele("span").att("class","snapshot-change");
    snapshot_change.up();
    var playlists = ans.ele("ul").att("class","nested");
    diff_data.forEach((pl)=>{
        var musics_added = 0;
        var musics_deleted = 0;
        var playlist = playlists.ele("li").att("id",pl["playlist"]["id"]);
        var cls="playlist";
        //if(pl["type"]=="+"){playlists_added+=1;playlist.att("class","playlist added");}
        if(pl["type"]=="+"){playlists_added+=1;cls+=" added";}
        //if(pl["type"]=="-"){playlists_deleted+=1;playlist.att("class","playlist deleted")}
        if(pl["type"]=="-"){playlists_deleted+=1;cls+=" deleted";}
        //if(pl["type"]=="~"){playlist.att("class","playlist same");}
        if(pl["type"]=="~"){cls+=" same";}
        if(pl["playlist"]["creator"]["userId"]!=USER_ID){cls+=" collect";}else{cls+=" own";}
        playlist.att("class",cls);
        //playlist.att("class",`playlist ${symbol_to_english(pl["type"])}`);
        playlist.ele("span").att("class","caret").txt(pl["playlist"]["name"]).up();
        var playlist_change=playlist.ele("span").att("class","playlist-change");
        playlist_change.up();
        playlist.ele("a").att("class","jump").att("href",`https://music.163.com/#/playlist?id=${pl["playlist"]["id"]}`).txt("JUMP").up();
        playlist.ele("a").att("class","copy-playlist").txt("COPY").up();
        var music_list = playlist.ele("ul").att("class","nested");
        pl["music_change"].forEach((msc)=>{
            var music_li = music_list.ele("li").att("id",msc["music"]["id"]);
            if(msc["type"]=="+"){musics_added+=1;total_musics_added+=1;music_li.att("class","music added");}
            if(msc["type"]=="-"){musics_deleted+=1;total_musics_deleted+=1;music_li.att("class","music deleted");}
            music_li.ele("span").att("class","music-name").txt(msc["music"]["name"]).up();
            music_li.ele("a").att("class","jump").att("href",`https://music.163.com/#/song?id=${msc["music"]["id"]}`).txt("JUMP").up();
            music_li.ele("a").att("class","copy-music").txt("COPY").up();
            music_li.up();
        });
        music_list.up();
        playlist_change.txt(`歌曲+${musics_added}-${musics_deleted}`);
        playlist.up();
    });
    snapshot_change.txt(`歌单+${playlists_added}-${playlists_deleted}/歌曲+${total_musics_added}-${total_musics_deleted}`);
    playlists.up();
    return [did,ans.end({pretty:true})];
}

function concat_playlists([sp,ap,dp]){
    var ans=[];
    sp.forEach((p)=>{ans.push(p)});
    ap.forEach((p)=>{ans.push(p)});
    dp.forEach((p)=>{ans.push(p)});
    return ans;
}

var Diff_id = Promise.resolve(DIFF_PATH)
                    .then(get_last_diffrence)

var modified_playlists = Diff_id
                    .then(did=>`${DIFF_PATH}\\${did}.json`)
                    .then(open_a_file)
                    .then(concat_playlists)
                    
var final_xml = Promise.all([Diff_id,modified_playlists])
                    .then(convert_snapshot_to_xml)
                    .then(([did,data])=>([`${XML_PATH}\\${did}.json`,data]))
                    .then(write_a_file)
                    .then(log);
                    
            