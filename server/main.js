import fs from 'fs';

import util from 'util';

import request from 'request-promise';

import {parseString} from 'xml2js';

import path from 'path';

import chokidar from 'chokidar';

import rimraf from 'rimraf';

import dateFormat from 'dateFormat';

import watch from 'watchjs';

class FragmentPullComparison {

  constructor() {

    this.MANIFEST_WARNING = "THERE WAS AN ISSUE DOWNLOADING THE MANIFEST";
    this.MANIFEST_SUCCESS = "MANIFEST SUCCESSFULLY DOWNLOADED";
    this.FRAGMENT_SUCCESS = "FRAGMENT SUCCESSFULLY DOWNLOADED";
    this.LOG_FILE_SUCCESS = "LOG FILE CRTEATED";
    this.FRAGMENT_WARNING = "THERE WAS AN ERROR REQUESTING THE FRAGMENT";
    this.EQUALITY_MESSAGE = "FRAGMENTS TESTED EQUAL IN SIZE";
    this.NONEQUALITY_MESSAGE = "FRAGMENTS TESTED NON-EQUAL IN SIZE";
    this.ERROR_EQUALITY_MESSAGE = "FRAGMENTS TESTED NON-EQUAL IN SIZE";
    this.UNLINK_FRAGMENT_MESSAGE = "FRAGMENT HAS BEEN DELETED";

    this.filesToTest = {};
    this.testedFiles = []; // array of the files that have been tested
    this.timecodes = []; // taken from the hss manifests
    this.intervalA; // the manifest

    this.bitRates = ["89984","280000", "619968", "1179968", "2014976", "3184960", "4864960"];

    this.hosts = {
      'non-equals':{
        'ip': ''
      },
      'original_ram':{
        'ip': ''
      },'original':{
        'ip': ''
      },'hostA':{
        'ip': '90.211.176.20'
      },'hostB':{
        'ip': '90.211.176.148'
      },'hostC':{
        'ip': '2.122.212.14'
      },'hostD':{
        'ip': '2.122.212.142'
      }
    }
    this.Q_index = process.argv[4] || 6;

    this.fragpath = './fragments/';

    this.logLocation = './logs/logFile.txt';

    this.mainIntervalLength = 60000; //60 secs

    this.manifestIntervalLength = 2000; // 2 sec

    this.fragmentOffSet = process.argv[3] || 53; // from oldest chunk to live

    this.fragmentLength = 20000000; // from oldest chunk to live

    this.streamString = process.argv[2] || 'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301';

    this.streamObj = {};

    this.offSetBufferLength = 10; // how many files retain as a buffer before deleting them

  }





 streamParse(streamString){

      let streamObj = {};

      var res = streamString.substring(0, 7);

      if(res === 'http://') streamString = streamString.substring(7, streamString.length);

      let subpaths = streamString.split('/');
      streamObj.host = subpaths[0];
      streamObj.dir1 = subpaths[1];
      streamObj.dir2 = subpaths[2];
      streamObj.path = streamString;
      streamObj.substr = 'ss/30/';

      //hosts.original.ip = streamObj.host; //******** IMPORTANT TO SET THIS *************////

      return streamObj;

}

setUpWatchers(){

  for (var key in this.hosts) {
      if (!this.hosts.hasOwnProperty(key)) continue;
      if(key !== 'non-equals'){
        var a = [];
        this.watchFolder(this.fragpath+key, key, a);
      }
    }
}

beginTest(){

  this.streamObj = this.streamParse(this.streamString);

  this.createFolder('./', 'logs', this.createLogFile.bind(this));
  this.deleteFolder(this.fragpath, function(){
    this.createChunkFolders(this.fragpath, this.hosts, this.setUpWatchers.bind(this));
    this.createFolder(this.fragpath, 'non-equals', this.afterFolders.bind(this));
  }.bind(this));
}

createChunckTimeout(t){
  console.log("set time out  "+t);
    var self = this;
    self.t = t;
    setTimeout(function(){

      self.downloadAllChunks(self.t);
    }, self.mainIntervalLength); // one minute later pull the fragments from the 4 hosts

}

/*createTimeoutForIntervalB(){
  var self = this;
  if(!this.intervalB){
      this.intervalB = setTimeout(function(){
        self.chunkCheckInterval();
      }, self.mainIntervalLength); // one minute later pull the fragments from the 4 hosts
  }
}*/

createLogFile(){
  fs.writeFile('./logs/logFile.txt', 'TEST STARTED: '+new Date()+', STREAM UNDER TEST: '+this.streamObj.path+' , BITRATE: '+this.bitRates[this.Q_index]+', FRAGMENT OFFSET: '+this.fragmentOffSet+'\n', (err) => {
    if (err) {
      throw err;
    }
    console.log(this.LOG_FILE_SUCCESS);
  });
}


afterFolders(){
  this.manifestInterval(this.createChunckTimeout.bind(this), this.streamObj);
}

manifestInterval(callback, stream) {
  var self = this;
    if(!this.intervalA){
      this.intervalA = setInterval(function(){
        self.downloadManifest(callback, stream);
      }, self.manifestIntervalLength);
}
}

downloadAllChunks(t){

  console.log("T IN DL chunks "+t);

  var self = this;

  ///setTimeout(function(){

            self.downloadChunk(t, 'hostA', self.bitRates[self.Q_index], false);
            self.downloadChunk(t, 'hostB',self.bitRates[self.Q_index], false);
            self.downloadChunk(t, 'hostC', self.bitRates[self.Q_index], false);
            self.downloadChunk(t, 'hostD', self.bitRates[self.Q_index], false);
            //self.timecodes.shift();
      //  }, 2000);
}


getOptions(host, interval, url, t, q){

if(!host || !interval || !url || !t || !q ){

  return 'error';
}

  let options = {
      time: true,
      t: t,
      url: url,
      q:q,
      interval: interval,
      method: 'GET',
      host: host,
      headers: {
          'Accept': 'application/json',
          'Accept-Charset': 'utf-8',
          'User-Agent': 'fragment-puller'
        }
      };

  if(interval !== 'original'){
    options.headers.Host =  host;
  }

  return options;

}

buildBaseUrl (streamObj, subBool){
    return (subBool ? 'http://'+streamObj.host+'/'+streamObj.substr+streamObj.dir1+'/'+streamObj.dir2+'.isml': 'http://'+streamObj.host+'/'+streamObj.dir1+'/'+streamObj.dir2+'.isml');
}

buildManifestUrl (streamObj){
    return this.buildBaseUrl(streamObj)+'/Manifest';
}

buildChunkUrl (streamObj, q, t, subBool){
    return this.buildBaseUrl(streamObj, subBool)+'/QualityLevels('+q+')/Fragments(video='+t+')';
}

buildFileName (path, interval, quality, time){
  return path+interval+'/chunk_'+quality+'_'+time+'.mp4';
}

equivalence (obj, sizes){
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
    console.log(this.EQUALITY_MESSAGE);
    return true;
  } else {
    console.log(this.NONEQUALITY_MESSAGE);
    return false;
  }
}

fragmentRequest (options, callback, _hosts) {
  var self = this;
  request(options, function(err, res, body){

    if(!self.filesToTest[options.t]){
                self.filesToTest[options.t] = _hosts;
        }
    self.filesToTest[options.t][options.interval].chunkPath = self.fragpath+options.interval+'/'+options.t+'_'+options.q+'_chunk.mp4';

}).pipe(fs.createWriteStream(self.fragpath+options.interval+'/'+options.t+'_'+options.q+'_chunk.mp4')).on('close', function(){

      console.log("ENTIRE OBJ "+util.inspect(self.filesToTest[options.t], false, null));


       if((self.filesToTest[options.t].original_ram.chunkPath && self.filesToTest[options.t].original.chunkPath) && !(self.filesToTest[options.t].hostA.chunkPath && self.filesToTest[options.t].hostB.chunkPath && self.filesToTest[options.t].hostC.chunkPath && self.filesToTest[options.t].hostD.chunkPath)){
                //console.log(self.testedFiles.indexOf(options.t+'_originals'));
                if(self.testedFiles.indexOf(options.t+'_originals') === -1){
                  self.testedFiles.push(options.t+'_originals');
                  console.log("ram test test "+options.t);
                  callback(self.filesToTest[options.t], 'RAM_VS_DISC');
                }
                //callback(self.filesToTest[options.t], 'RAM_VS_DISC');
       } else if(self.filesToTest[options.t].hostA.chunkPath && self.filesToTest[options.t].hostB.chunkPath && self.filesToTest[options.t].hostC.chunkPath && self.filesToTest[options.t].hostD.chunkPath){
                   if(self.testedFiles.indexOf(options.t+'_chunks') === -1){
                    self.testedFiles.push(options.t+'_chunks');
                   console.log("chunk test "+options.t);
                    callback(self.filesToTest[options.t], 'ALL CHUNKS');
                   }

       }
    });
}
downloadChunk (time, interval, qual, sub){
      let url = this.buildChunkUrl(this.streamObj, qual, time, sub);
      let options = this.getOptions(this.streamObj.host, interval, url, time, qual);

      if(options !== 'error'){
            this.fragmentRequest(options, this.testFragmentEquality.bind(this), this.hosts);
      }
}

relocateNonEqualFragments (obj){

  console.log("THE OBJ"+ util.inspect(obj, false, null));

  for(var key in obj){
    if(obj.hasOwnProperty(key) && obj[key] !== ''  ){
          var s = obj[key];
          //console.log("S "+util.inspect(s, false, null));
          if(s.chunkPath){
              var bits = s.chunkPath.split('/');
              console.log("bits "+util.inspect(bits, false, null));
              var host = bits[2];
              var fileName = bits[3];
              fs.createReadStream(obj[key].chunkPath).pipe(fs.createWriteStream('./fragments/non-equals/'+host+'_'+fileName));
          }
    }
  }
}

   ///  ***********  FS WORk ************ testing beyond scope ******************** /////////////////

testFragmentEquality (obj, testid){
  //console.log("The obj"+ util.inspect(obj, false, null))

  //console.log("TEST TEST OBJ "+this);

  var now = new Date();
  var D = dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT");

  let sizes = [];

  for(var key in obj){

        if (!obj.hasOwnProperty(key)) continue;
        var frag = obj[key].chunkPath;
          if(typeof(frag) === 'string'){
            if(frag !== ''){
              //console.log("frag"+frag);
                let stats = fs.statSync(frag, function(){

                        sizes.push(stats.size);
                }.bind(this));
             } else {
              console.log(this.ERROR_EQUALITY_MESSAGE);
              var bits = obj.original.chunkPath.split('/');
              this.log('TEST: '+testid+' '+D+' - '+bits[bits.length-1]+' - '+ this.ERROR_EQUALITY_MESSAGE);
              relocateNonEqualFragments(obj);
            }
          }
       }
      let EQ = this.equivalence(obj, sizes);

      var bits = obj.original.chunkPath.split('/');
      var str = 'TEST: '+testid+' '+D+' - '+bits[bits.length-1]; // the file name

      if(EQ === false){
          str+=' - '+ this.NONEQUALITY_MESSAGE;
          console.log(str);
          this.log(str);
          this.relocateNonEqualFragments(obj);
      } else {
          str+=' - '+ this.EQUALITY_MESSAGE;
          console.log(str);
          this.log(str);
      }
    }



downloadManifest(callback, streamObj){
  var self = this;
  var url = this.buildManifestUrl(streamObj);
  request.get(url, function(err,res,body) {

    parseString(body, function (err, result) {

             const errFunc = function(){
                console.log(self.MANIFEST_WARNING);
                self.log(self.MANIFEST_WARNING+url);
                clearInterval(self.intervalA);
                return;
              }
              if(err !== null || res.statusCode !== 200){
                errFunc();
              } else {
                console.log(self.MANIFEST_SUCCESS);
                let currentTimeCode = parseInt(result.SmoothStreamingMedia.StreamIndex[0].c[0].$.t);
                let offSetChunk = currentTimeCode+(self.fragmentLength*self.fragmentOffSet);
                //self.timecodes.push(parseInt(offSetChunk));
                //self.downloadChunk(parseInt(offSetChunk), 'original',self.bitRates[self.Q_index]);
                self.downloadChunk(offSetChunk, 'original', self.bitRates[self.Q_index], false);
                self.downloadChunk(offSetChunk, 'original_ram', self.bitRates[self.Q_index], true); // the chunk in RAM
                //callback(offSetChunk); // set up intervalB for the chunks in 1 min from now
              }
          }.bind(this));



     });

   }



   deleteFolder (path, callback){
     rimraf(path, function(){
       callback();
     });
   }



   createFolder(path, name, callback) {
       fs.mkdir(path+name, function(){
             callback();
       });

   }

   createChunkFolders(fragpath, hosts, callback){
     //console.log("The hosts"+ util.inspect(hosts, false, null));
     let count = 0;

     if(!fs.existsSync(fragpath)){
       fs.mkdir(fragpath, function(){
         for (var key in hosts) {
           if (!hosts.hasOwnProperty(key)) continue;
           if(!fs.exists(fragpath+key)){
                   fs.mkdir(fragpath+key, function(){
                     count++;
                     if(count === Object.keys(hosts).length){
                       callback();
                     }
                   });
                 }
               }
             });
       }
   }

   watchFolder(path, name, array){
     var self = this;

     const testNum = function(){
       const remove = function(){
         fs.unlink(array[0], function(){
               array.shift();
         })
       }
       if(array.length >= self.offSetBufferLength) {
         console.log(self.UNLINK_FRAGMENT_MESSAGE+" path");
         remove();
       }
     }

     var watch =  chokidar.watch(path, {ignored: /[\/\\]\./, persistent: true}).on('add', function(name) {
       array.push(name);
       testNum();
     })

   }

   log(str){

     var stream = fs.createWriteStream(this.logLocation, {flags:'a'});
     stream.write(str + "\n");
     stream.end();

   }

 }



var fragmentPuller = new FragmentPullComparison();
fragmentPuller.beginTest();

module.exports = FragmentPullComparison;
