import fs from 'fs';

import util from 'util';

import request from 'request';

import {parseString} from 'xml2js';

import path from 'path';

import chokidar from 'chokidar';

//import winston from 'winston';

import rimraf from 'rimraf';

import dateFormat from 'dateFormat';

const MANIFEST_WARNING = "THERE WAS AN ISSUE DOWNLOADING THE MANIFEST";
const FRAGMENT_WARNING = "THERE WAS AN ERROR REQUESTING THE FRAGMENT";
const EQUALITY_MESSAGE = "FRAGMENTS TESTED EQUAL IN SIZE";
const NONEQUALITY_MESSAGE = "FRAGMENTS TESTED NON-EQUAL IN SIZE";
const ERROR_EQUALITY_MESSAGE = "FRAGMENTS TESTED NON-EQUAL IN SIZE";

let filesToTest = {};
let timecodes = []; // rea from the hss manifests
let intervalA, intervalB;

const bitRates = ["89984","280000", "619968", "1179968", "2014976", "3184960", "4864960"];

const hosts = {
  'original':{
    'ip': ''
  },
  'hostA':{
    'ip': '90.211.176.20'
  },'hostB':{
    'ip': '90.211.176.148'
  },'hostC':{
    'ip': '2.122.212.14'
  },'hostD':{
    'ip': '2.122.212.142'
  }
}



const Q_index = process.argv[4] || 6;

const fragpath = './fragments/';

const mainIntervalLength = 60000;

const fragmentOffSet = process.argv[3] || 53; // from oldest chunk to live

let streamString = process.argv[2] || 'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301';




const streamParse = function(){

  let streamObj = {};

  var res = streamString.substring(0, 7);

  if(res === 'http://'){
    streamString = streamString.substring(7, streamString.length);
  }

  let subpaths = streamString.split('/');
  streamObj.host = subpaths[0];
  streamObj.dir1 = subpaths[1];
  streamObj.dir2 = subpaths[2];

  hosts.original.ip = streamObj.host; //******** IMPORTANT TO SET THIS *************////

  return streamObj;

}





const streamObj = streamParse();




/* process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
});*/




const deleteFolder = function(path, callback){
  rimraf(path, function(){
    callback();
  });
};


const createFolder = function(path, name, callback) {

  console.log(path+name);

    fs.mkdir(path+name, function(){
          callback();
    });

}


const createChunkFolders = function(fragpath, hosts, callback){
  if(!fs.existsSync(fragpath)){
    fs.mkdir(fragpath, function(){
      for (var key in hosts) {
        if (!hosts.hasOwnProperty(key)) continue;
        if(!fs.existsSync(fragpath+key)){
                fs.mkdir(fragpath+key, function(){
                  var a = [];
                  callback(fragpath+key, key, a);
                });
              }
            }
          });
    }
}

const watchFolder = function(path, name, array){
  const testNum = function(){
    const remove = function(){
      fs.unlink(array[0], function(){
            array.shift();
      })
    }
    if(name === 'original' && array.length >= 40) {
      remove();
    } else if(array.length >= 40) {
      remove();
    }
  }

  var watch =  chokidar.watch(path, {ignored: /[\/\\]\./, persistent: true}).on('add', function(name) {
    array.push(name);
    testNum();
  })

}

const log = function(str){

  var stream = fs.createWriteStream('./logs/logFile.txt', {flags:'a'});
  stream.write(str + "\n");
  stream.end();

}





const beginTest = function(){

    createFolder('./', 'logs', createLogFile);
    deleteFolder(fragpath, function(){
      createChunkFolders(fragpath, hosts, watchFolder);
      createFolder(fragpath, 'non-equals', afterFolders);
    })




}

const createTimeoutForIntervalB = function(){
  if(!intervalB){
      intervalB = setTimeout(function(){
        chunkCheckInterval();
      }, mainIntervalLength); // one minute later pull the fragments from the 4 hosts
  }
}

const createLogFile = function(){
  //console.log(__dirname+'/fragments/logs/logFile.txt');
  fs.writeFile('./logs/logFile.txt', 'TEST STARTED: '+new Date()+', STREAM UNDER TEST: '+streamString+' , BITRATE: '+bitRates[Q_index]+', FRAGMENT OFFSET: '+fragmentOffSet+'\n', (err) => {
    if (err) {
      throw err;
    }
    console.log("log file created");
  });
}


const afterFolders = function(){
  manifestInterval(createTimeoutForIntervalB, streamObj);
}

const manifestInterval = function(callback, stream) {
    if(!intervalA){
      intervalA = setInterval(function(){
        downloadManifest(callback, stream);
      }, 2000);
}
}

const chunkCheckInterval = function(){

  setInterval(function(){
            timecodes.shift();
            downloadChunk(timecodes[0], 'hostA');
            downloadChunk(timecodes[0], 'hostB');
            downloadChunk(timecodes[0], 'hostC');
            downloadChunk(timecodes[0], 'hostD');
        }, 2000);
}


const getOptions = function(streamObj, interval, url){

  console.log("URL"+url);

  let options = {
      time: true,
      url: url,
      method: 'GET',
      headers: {
          'Accept': 'application/json',
          'Accept-Charset': 'utf-8',
          'User-Agent': 'fragment-puller'
        }
      };

  if(interval !== 'original'){
    options.headers.Host =  streamObj.host;
  }

  return options;

}

const buildBaseUrl = function(streamObj){
  return 'http://'+streamObj.host+'/'+streamObj.dir1+'/'+streamObj.dir2+'.isml';
}

const buildManifestUUrl = function(streamObj){
  return buildBaseUrl(streamObj)+'/Manifest';
}

const buildChunkUrl = function(streamObj, q, t){
    return buildBaseUrl(streamObj)+'/QualityLevels('+q+')/Fragments(video='+t+')';
}

const buildFileName = function(p, i, q, t){
  return p+i+'/chunk_'+q+'_'+t+'.mp4';
}


const performRequest = function(options, time, interval, filename, callback, _hosts) {

  request(options, function(err, res, body){



    if(err !== null || res.statusCode !== 200){
      console.log(FRAGMENT_WARNING);
      log(FRAGMENT_WARNING+options.url);
      clearInterval(intervalB);
      return;

    } else {

      if(!filesToTest[time]){
            filesToTest[time] = _hosts;
            filesToTest[time].counter = 0;
          }
          filesToTest[time][interval].chunkPath = filename;
          if(interval !== 'original') {
            //filesToTest[time].totaltime+=(res.timings.end - res.timings.response); // the total of all request for a segment need to happen inside 2seconds
                if(filesToTest[time].counter < 4){
                  filesToTest[time].counter++;
                }
            }
        }
    }).pipe(fs.createWriteStream(filename)).on('close', function(){
      if(filesToTest[time]){
        if(filesToTest[time].counter === Object.keys(hosts).length-2 && filesToTest[time].original){
            callback(filesToTest[time]);
            delete filesToTest[time];
        }
      }

    });







}

const downloadChunk = function(time, interval){
      let url = buildChunkUrl(streamObj, bitRates[Q_index], time);
      let options = getOptions(streamObj, interval, url);
      let fileName = buildFileName(fragpath, interval, bitRates[Q_index], time);

      performRequest(options, time, interval, fileName, testThem, hosts);

}

const equivalence = function(obj, sizes){

  function allEqual(arr) {
    for(var i = 0; i <arr.length-1; i++ ){

          if(arr[i] !== arr[i+1]){
            return false;
          }
    }
    return true;
  }

  var EQ = allEqual(sizes);

  if(EQ === true) {

    console.log(EQUALITY_MESSAGE);

    return true;

  } else {

    console.log(NONEQUALITY_MESSAGE);

    return false;



  }
}

const moveThem = function(obj){

  delete obj['counter'];
  delete obj['totaltime'];

  for(var key in obj){
    if(obj.hasOwnProperty(key) && obj[key] !== ''  ){
          var s = obj[key];
          var bits = s.split('/');
          var host = bits[7];
          var fileName = bits[8];
          fs.createReadStream(obj[key]).pipe(fs.createWriteStream('./fragments/non-equals/'+host+'_'+fileName));
    }
  }

}

const testThem = function(obj){



  var now = new Date();
  var D = dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT");

  let sizes = [];

  for(var key in obj){

        if (!obj.hasOwnProperty(key)) continue;
        var frag = obj[key].chunkPath;
          if(typeof(frag) === 'string'){
            if(frag !== ''){
                let stats = fs.statSync(frag, function(){
                        sizes.push(stats.size);
                });
             } else {
              console.log(ERROR_EQUALITY_MESSAGE);
              var bits = obj.original.chunkPath.split('/');
              log('TEST: '+D+' - '+bits[bits.length-1]+' - '+ERROR_EQUALITY_MESSAGE);
              moveThem(obj);



             }
          }
       }
      let EQ = equivalence(obj, sizes);

      var bits = obj.original.chunkPath.split('/');
      var str = 'TEST: '+D+' - '+bits[bits.length-1];

      if(EQ === false){
          str+=' - '+NONEQUALITY_MESSAGE;
          console.log(str);
          log(str);
          moveThem(obj);
      } else {
          str+=' - '+EQUALITY_MESSAGE;
          console.log(str);
          log(str);
      }
    }



const downloadManifest = function(callback, streamObj){

   var url = buildManifestUUrl(streamObj);

  request.get(url, function(err,res,body) {

    //console.log("URL "+url);

    parseString(body, function (err, result) {

              const errFunc = function(){
                console.log(MANIFEST_WARNING);
                log(MANIFEST_WARNING+url);
                clearInterval(intervalA);
                return;
              }
              if(err !== null || res.statusCode !== 200){
                errFunc();
              } else {

                let currentTimeCode = parseInt(result.SmoothStreamingMedia.StreamIndex[0].c[0].$.t);
                let offSetChunk = currentTimeCode+(20000000*fragmentOffSet);
                timecodes.push(parseInt(offSetChunk));
                callback();
                downloadChunk(parseInt(offSetChunk), 'original');

              }
          });



     });
   }

beginTest();
