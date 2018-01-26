import fs from 'fs';

import util from 'util';

import request from 'request';

import {parseString} from 'xml2js';

import path from 'path';

import chokidar from 'chokidar';

import rimraf from 'rimraf';

import dateFormat from 'dateFormat';

const FragmentPullComparison = {



MANIFEST_WARNING : "THERE WAS AN ISSUE DOWNLOADING THE MANIFEST",
FRAGMENT_WARNING : "THERE WAS AN ERROR REQUESTING THE FRAGMENT",
EQUALITY_MESSAGE : "FRAGMENTS TESTED EQUAL IN SIZE",
NONEQUALITY_MESSAGE : "FRAGMENTS TESTED NON-EQUAL IN SIZE",
ERROR_EQUALITY_MESSAGE : "FRAGMENTS TESTED NON-EQUAL IN SIZE",

filesToTest : {},
timecodes : [], // rea from the hss manifests


bitRates :["89984","280000", "619968", "1179968", "2014976", "3184960", "4864960"],

someFunc: function(){
  return 'test';
},

 hosts:  {
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
},

streamString:process.argv[2] || '',



Q_index: process.argv[4] || 6,

fragpath:  './fragments/',

mainIntervalLength: 60000,

fragmentOffSet: process.argv[3] || 53, // from oldest chunk to live


streamParse: function(streamString){

  let streamObj = {};

  var res = streamString.substring(0, 7);

  if(res === 'http://'){
    streamString = streamString.substring(7, streamString.length);
  }

  let subpaths = streamString.split('/');
  streamObj.host = subpaths[0];
  streamObj.dir1 = subpaths[1];
  streamObj.dir2 = subpaths[2];
  streamObj.path = streamString;

  //hosts.original.ip = streamObj.host; //******** IMPORTANT TO SET THIS *************////

  return streamObj;

},






deleteFolder: function(path, callback){
  rimraf(path, function(){
    callback();
  });
},


createFolder: function(path, name, callback) {

  console.log(path+name);

    fs.mkdir(path+name, function(){
          callback();
    });

},


createChunkFolders: function(fragpath, hosts, callback){
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
},

watchFolder: function(path, name, array){
  const testNum = function(){
    const remove = function(){
      fs.unlink(array[0], function(){
            array.shift();
      })
    }
    if(array.length >= 40) {
      remove();
    }
  }

  chokidar.watch(path, {ignored: /[\/\\]\./, persistent: true}).on('add', function(name) {
    array.push(name);
    testNum();
  });

},

log: function(str){

  var stream = fs.createWriteStream('./logs/logFile.txt', {flags:'a'});
  stream.write(str + "\n");
  stream.end();

},





//const beginTest = function(){






//}

createTimeoutForIntervalB: function(){
  if(!intervalB){
      intervalB = setTimeout(function(){
        chunkCheckInterval();
      }, mainIntervalLength); // one minute later pull the fragments from the 4 hosts
  }
},

createLogFile: function(streamObj, bitRates, fragmentOffSet){

  console.log('streamObj: '+streamObj)
  //console.log(__dirname+'/fragments/logs/logFile.txt');
  fs.writeFile('./logs/logFile.txt', 'TEST STARTED: '+new Date()+', STREAM UNDER TEST: '+streamObj.path+' , BITRATE: '+bitRates[Q_index]+', FRAGMENT OFFSET: '+fragmentOffSet+'\n', (err) => {
    if (err) {
      throw err;
    }
    console.log("log file created");
  });
},


afterFolders: function(){
  manifestInterval(createTimeoutForIntervalB, streamObj);
},

manifestInterval: function(callback, stream) {
    if(!intervalA){
      intervalA = setInterval(function(){
        downloadManifest(callback, stream);
      }, 2000);
}
},

chunkCheckInterval: function(){

  setInterval(function(){
            timecodes.shift();
            downloadChunk(timecodes[0], 'hostA');
            downloadChunk(timecodes[0], 'hostB');
            downloadChunk(timecodes[0], 'hostC');
            downloadChunk(timecodes[0], 'hostD');
        }, 2000);
},


getOptions: function(streamObj, interval, url){

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

},

buildBaseUrl: function(streamObj){
  return 'http://'+streamObj.host+'/'+streamObj.dir1+'/'+streamObj.dir2+'.isml';
},

buildManifestUUrl: function(streamObj){
  return buildBaseUrl(streamObj)+'/Manifest';
},

buildChunkUrl: function(streamObj, q, t){
    return buildBaseUrl(streamObj)+'/QualityLevels('+q+')/Fragments(video='+t+')';
},

buildFileName: function(p, i, q, t){
  return p+i+'/chunk_'+q+'_'+t+'.mp4';
},


performRequest: function(options, time, interval, filename, callback, _hosts) {

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
},

constdownloadChunk: function(time, interval){
      let url = buildChunkUrl(streamObj, bitRates[Q_index], time);
      let options = getOptions(streamObj, interval, url);
      let fileName = buildFileName(fragpath, interval, bitRates[Q_index], time);

      performRequest(options, time, interval, fileName, testThem, hosts);

},

equivalence: function(obj, sizes){

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
},

moveThem: function(obj){

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

},

testThem: function(obj){
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
},



downloadManifest: function(callback, streamObj){

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

   },

   setUp: function(){
     this.createFolder('./', 'logs', this.createLogFile(this.streamObj, this.bitrates, this.fragmentOffSet));
     this.deleteFolder(this.fragpath, function(){
       this.createChunkFolders(this.fragpath, this.hosts, this.watchFolder);
       this.createFolder(this.fragpath, 'non-equals', this.afterFolders);
     })

   }




};

FragmentPullComparison.setUp();

module.exports = FragmentPullComparison;
