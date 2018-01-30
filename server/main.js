import fs from 'fs';

import util from 'util';

import request from 'request-promise';

import {parseString} from 'xml2js';

import path from 'path';

import chokidar from 'chokidar';

import rimraf from 'rimraf';

import dateFormat from 'dateFormat';

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
    this.intervalA;
    this.intervalB;

    this.bitRates = ["89984","280000", "619968", "1179968", "2014976", "3184960", "4864960"];

    this.hosts = {
      'original':{
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

    this.mainIntervalLength = 60000; //10 secs

    this.manifestIntervalLength = 10000; // 2 sec

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

      //hosts.original.ip = streamObj.host; //******** IMPORTANT TO SET THIS *************////

      return streamObj;

}

setUpWatchers(){

  for (var key in this.hosts) {
      if (!this.hosts.hasOwnProperty(key)) continue;
        var a = [];
        this.watchFolder(this.fragpath+key, key, a);
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

createTimeoutForIntervalB(){
  var self = this;
  if(!this.intervalB){
      this.intervalB = setTimeout(function(){
        self.chunkCheckInterval();
      }, self.mainIntervalLength); // one minute later pull the fragments from the 4 hosts
  }
}

createLogFile(){
  fs.writeFile('./logs/logFile.txt', 'TEST STARTED: '+new Date()+', STREAM UNDER TEST: '+this.streamObj.streamString+' , BITRATE: '+this.bitRates[this.Q_index]+', FRAGMENT OFFSET: '+this.fragmentOffSet+'\n', (err) => {
    if (err) {
      throw err;
    }
    console.log(this.LOG_FILE_SUCCESS);
  });
}


afterFolders(){
  this.manifestInterval(this.createTimeoutForIntervalB.bind(this), this.streamObj);
}

manifestInterval(callback, stream) {
  var self = this;
    if(!this.intervalA){
      this.intervalA = setInterval(function(){
        self.downloadManifest(callback, stream);
      }, self.manifestIntervalLength);
}
}

chunkCheckInterval(){

  var self = this;

  setInterval(function(){
            self.timecodes.shift();
            self.downloadChunk(self.timecodes[0], 'hostA', self.bitRates[self.Q_index]);
            self.downloadChunk(self.timecodes[0], 'hostB',self.bitRates[self.Q_index]);
            self.downloadChunk(self.timecodes[0], 'hostC', self.bitRates[self.Q_index]);
            self.downloadChunk(self.timecodes[0], 'hostD', self.bitRates[self.Q_index]);
        }, 2000);
}


getOptions(host, interval, url){
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
    options.headers.Host =  host;
  }

  return options;

}

buildBaseUrl (streamObj){
  return 'http://'+streamObj.host+'/'+streamObj.dir1+'/'+streamObj.dir2+'.isml';
}

buildManifestUrl (streamObj){
    return this.buildBaseUrl(streamObj)+'/Manifest';
}

buildChunkUrl (streamObj, q, t){
    return this.buildBaseUrl(streamObj)+'/QualityLevels('+q+')/Fragments(video='+t+')';
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


fragmentRequest (options, time, interval, callback, _hosts) {
  var self = this;
  var t = time;
  var i = interval;
  var f = '';

  request(options, function(err, res, body){

    console.log("THE URL"+options.url);

//this.fragpath, interval, this.bitRates[this.Q_index], time);
}.bind(t, i, f = self.buildFileName(self.fragpath, i, this.bitRates[this.Q_index], t))).pipe(fs.createWriteStream(f)).on('close', function(){

      //if(err !== null || res.statusCode !== 200){
      //  console.log(self.FRAGMENT_WARNING);
      //  self.log(self.FRAGMENT_WARNING+options.url);
      //  clearInterval(self.intervalB);
      //  return;

    //  } else {
        console.log(self.FRAGMENT_SUCCESS);
        //console.log("The file name: "+filename);
        if(!self.filesToTest[t]){
              self.filesToTest[t] = _hosts;
              self.filesToTest[t].counter = 0;
        }

        self.filesToTest[t][i].chunkPath = f;

        console.log(util.inspect(self.filesToTest, false, null));

        if(i !== 'original') {
              //filesToTest[time].totaltime+=(res.timings.end - res.timings.response); // the total of all request for a segment need to happen inside 2seconds
              if(self.filesToTest[t].counter < Object.keys(self.hosts).length){
                    self.filesToTest[t].counter++;
              }
        }


      if(self.filesToTest[t]){
        //console.log("COUNT "+self.filesToTest[time].counter);
        //console.log("hosts length "+Object.keys(_hosts).length);
        //console.log("hosts original "+self.filesToTest[time].original);
        if(self.filesToTest[t].counter === Object.keys(_hosts).length-2 && self.filesToTest[t].original){
            //console.log("RES "+self.testedFiles.indexOf(self.filesToTest[time].toString()));
            //console.log("VAL "+self.filesToTest[time].toString());
            //console.log("VAL2 "+self.testedFiles.length);
            console.log("The tested files"+ util.inspect(self.testedFiles, false, null))
            if(self.testedFiles.indexOf(time.toString()) === -1){
               self.testedFiles.push(time.toString());
               callback(self.filesToTest[t]);
               delete self.filesToTest[t];
            }
          }
      }
    });
}

downloadChunk (time, interval, qual){
      let url = this.buildChunkUrl(this.streamObj, qual, time);
      let options = this.getOptions(this.streamObj.host, interval, url);
      let fileName = this.buildFileName(this.fragpath, interval, this.bitRates[this.Q_index], time);

      this.fragmentRequest(options, time, interval, this.testFragmentEquality.bind(this), this.hosts);
}

relocateNonEqualFragments (obj){

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

   ///  ***********  FS WORk ************ testing beyond scope ******************** /////////////////

testFragmentEquality (obj){
  console.log("The obj"+ util.inspect(obj, false, null))

  //console.log("TEST TEST OBJ "+this);

  var now = new Date();
  var D = dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT");

  let sizes = [];

  for(var key in obj){

        if (!obj.hasOwnProperty(key)) continue;
        var frag = obj[key].chunkPath;
          if(typeof(frag) === 'string'){
            if(frag !== ''){
              console.log("frag"+frag);
                let stats = fs.stat(frag, function(){
                        sizes.push(stats.size);
                }.bind(this));
             } else {
              console.log(this.ERROR_EQUALITY_MESSAGE);
              var bits = obj.original.chunkPath.split('/');
              this.log('TEST: '+D+' - '+bits[bits.length-1]+' - '+ this.ERROR_EQUALITY_MESSAGE);
              relocateNonEqualFragments(obj);
            }
          }
       }
      let EQ = this.equivalence(obj, sizes);

      var bits = obj.original.chunkPath.split('/');
      var str = 'TEST: '+D+' - '+bits[bits.length-1]; // the file name

      if(EQ === false){
          str+=' - '+ this.NONEQUALITY_MESSAGE;
          console.log(str);
          this.log(str);
          relocateNonEqualFragments(obj);
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
                self.timecodes.push(parseInt(offSetChunk));
                self.downloadChunk(parseInt(offSetChunk), 'original',self.bitRates[self.Q_index]);
                callback();
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
