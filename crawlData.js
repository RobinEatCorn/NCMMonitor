const fs = require("fs");
const request = require("request");
const url = require("url");

const ROOT_PATH = ".\\Playlists";
const NETEASE_API = "http://localhost:3000";
const PLAYLIST_LIMIT = 1000;
//const USER_ID = "327265884";//Myself
const USER_ID = "587376989";//S1

function request_api_for_snapshot(url){
    return new Promise((resolve,reject) => {
        request(url,(err,res,body)=>{
            console.log(`[Querying snapshot]${url}`);
            if(err)reject(err);
            if(res.statusCode!=200)reject(new Error("[Request]Failed to access api."));
            var json_snapshot = JSON.parse(body);
            if(json_snapshot.code!=200)reject(new Error(`[Api]Failed to get snapshot. User id = ${USER_ID}.`));
            snapshot_name = (new Date()).getTime();
            console.log(`[snapshot_name]${snapshot_name}`);
            resolve([snapshot_name,json_snapshot]);
        });
    });
}

function make_dir_of_snapshot([snapshot_name,json_snapshot]){
    return new Promise((resolve,reject) => {
        fs.mkdir(`${ROOT_PATH}\\${snapshot_name}`,err=>{
            console.log(`[Making dir]${ROOT_PATH}\\${snapshot_name}`);
            if(err)reject(err);
            resolve(snapshot_name);
        });
    });
}

function write_snapshot_json([snapshot_name,json_snapshot]){
    return new Promise((resolve,reject)=>{
        fs.writeFile(`${ROOT_PATH}\\${snapshot_name}.json`,JSON.stringify(json_snapshot),(err)=>{
            console.log(`[Writing snapshot]${ROOT_PATH}\\${snapshot_name}.json`);
            if(err)reject(err);
            resolve(`${ROOT_PATH}\\${snapshot_name}.json`);
        });
    });
}

function request_api_for_playlists([snapshot_name,json_snapshot]){
    var ans=[];
    json_snapshot.playlist.forEach((playlist)=>{
        ans.push(new Promise((resolve,reject)=>{
            var playlist_api = new URL(NETEASE_API);
            playlist_api.pathname = "/playlist/detail";
            playlist_api.searchParams.set("id",playlist.id);
            request(playlist_api.href,(err,res,body)=>{
                console.log(`[Querying playlist]${playlist_api}`);
                if(err)reject(err);
                if(res.statusCode!=200)reject(new Error("[Request]Failed to access api."));
                json_playlist = JSON.parse(body);
                if(json_playlist.code!=200)reject(new Error(`[Api]Failed to get playlist. Id = ${playlist.id}`));
                resolve(json_playlist);
            });
        }));
    });
    return ans;
}

function check_for_dir([snapshot_name,query_list]){
    var all_query=[];
    query_list.forEach((query)=>{
        all_query.push(Promise.all([step_2_1,query]).then(write_playlist_json));
    });
    return Promise.all(all_query);
}

function write_playlist_json([snapshot_name,json_playlist]){
    return new Promise((resolve,reject)=>{
        fs.writeFile(`${ROOT_PATH}\\${snapshot_name}\\${json_playlist.playlist.id}.json`,JSON.stringify(json_playlist),(err)=>{
            console.log(`[Writing playlist]${ROOT_PATH}\\${snapshot_name}\\${json_playlist.playlist.id}.json`);
            if(err)reject(err);
            resolve(`${ROOT_PATH}\\${snapshot_name}\\${json_playlist.playlist.id}.json`);
        });
    });
}

var snapshot_api = new URL(NETEASE_API);
snapshot_api.pathname = "/user/playlist";
snapshot_api.searchParams.set("uid",USER_ID);
snapshot_api.searchParams.set("limit",PLAYLIST_LIMIT);

var step_1 = Promise.resolve(snapshot_api.href).then(request_api_for_snapshot);
var step_2_1 = step_1.then(make_dir_of_snapshot);
var step_2_2 = step_1.then(request_api_for_playlists);
var step_2_3 = step_1.then(write_snapshot_json);
var step_3 = Promise.all([step_2_1,step_2_2]).then(check_for_dir);
step_1.catch((err)=>{console.log(`[error-1]${err}`);});
step_2_1.catch((err)=>{console.log(`[error-2-1]${err}`);});
step_2_2.catch((err)=>{console.log(`[error-2-2]${err}`);});
step_2_3.catch((err)=>{console.log(`[error-2-3]${err}`);});
step_3.catch((err)=>{console.log(`[error-3]${err}`);});
