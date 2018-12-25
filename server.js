const url=require("url");
const fs=require("fs");
const http=require("http");

const PORT=8081;
const MAIN_FILE=".\\index.html";
const XML_PATH=".\\XMLs"

function open_a_file(file){
    return new Promise((resolve,reject)=>{
        fs.readFile(file,"utf8",(err,data)=>{
            if(err)reject(err);
            resolve(data);
        });
    });
}
function get_last_xml([path,t]){
    return new Promise((resolve,reject)=>{
        var xmls_list = [];
        fs.readdir(path,{withFileTypes:true},(err,files)=>{
            if(err)reject(err);
            files.forEach((file)=>{
                if(file.isFile()&&file.name.match(/^\d+.json$/)){
                    xmls_list.push(Number(file.name.split(".")[0]));
            }});
            xmls_list=xmls_list.filter((v)=>(t>v)).sort();
            if(xmls_list.length==0){
                resolve("<span class=\"no-more\">无更多记录</span>");
            } else {
                var xid=xmls_list.pop();
                resolve(Promise.resolve(`${XML_PATH}\\${xid}.json`)
                                .then(open_a_file));
            }
        });
    });
}

function get_current_time(){
    let t=new Date();
    return `${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()}-${t.getHours()}:${t.getMinutes()}:${t.getSeconds()}`;
}

http.createServer((req,res)=>{
    console.log(`${get_current_time()}||${req.connection.remoteAddress}||${req.url}`);
    req_url = url.parse(req.url,true);
    req_t = req_url["query"]["t"];
    if(req_t){
        Promise.resolve([XML_PATH,req_t])
            .then(get_last_xml)
            .then((data)=>{
                res.writeHead(200,{"Content-Type":"text/plain"});
                res.end(data);
            })
    } else {
        Promise.resolve(MAIN_FILE)
                .then(open_a_file)
                .then((data)=>{
                    res.writeHead(200,{"Content-Type":"text/html"});
                    res.end(data);
                })
    }
}).listen(PORT);