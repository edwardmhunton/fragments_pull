import fs from 'fs';

import util from 'util';

import request from 'request';

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

    this.starti = null;

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

    this.sceduleCount = 0;

    this.streamString = process.argv[2] || 'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301';

    this.fragmentOffSet = process.argv[3] || 53; // from oldest chunk to live

    this.Q_index = process.argv[4] || 6;

    this.mode = process.argv[5] || 'debug';

    //this.scedule = process.argv[6] || [];
    this.scedule = [{

    'stream':'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301',
    'startTime': '1517847000000',
      'endTime': '1517847200000'

  }, {

  'stream':'origin1.stage16.stage-hss.skydvn.com/stage16/1752',
  'startTime': '1517847400000',
  'endTime': '1517847600000'

  },

  {'stream':'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301',
  'startTime': '1517847800000',
    'endTime': '1517848000000'

  }
]

    this.fragpath = './fragments/';

    this.log_rvd = './logs/RAM_VS_DISC_logFile.txt';
    this.log_ac = './logs/ALL_CHUNKS_logFile.txt';

    this.mainIntervalLength = 60000; //60 secs

    this.manifestIntervalLength = 2000; // 2 sec

    this.fragmentLength = 20000000; // from oldest chunk to live

    this.streamObj = {};

    this.offSetBufferLength = 15; // how many files retain as a buffer before deleting them

    this.oldConsoleLog = null;

  }

consoleToggle(toggle){
  if(toggle){
    if(this.oldConsoleLog === null){
      return;
    }
    console.log = this.oldConsoleLog;
    } else {
      this.oldConsoleLog = console.log;
      console.log = function(){};
    }
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
    this.createFolder(this.fragpath, 'non-equals-ram_vs_disc', function(){});
    this.createFolder(this.fragpath, 'non-equals-all_chunks', this.afterFolders.bind(this));
  }.bind(this));
}

createChunkTimeout(obj, t){
    var self = this;
    (function(o, t){
      var myO = o;
      var to = setTimeout(function(){
        self.downloadAllChunks(myO, t);
      }, self.mainIntervalLength, myO, t); // one minute later pull the fragments from the 4 hosts

    })(obj, t);
}

createLogFile(){
  fs.writeFile(this.log_rvd, 'TEST STARTED: '+new Date()+', STREAM UNDER TEST: '+this.streamObj.path+' , BITRATE: '+this.bitRates[this.Q_index]+', FRAGMENT OFFSET: '+this.fragmentOffSet+'\n', (err) => {
    if (err) {
      throw err;
    }
    console.log(this.LOG_FILE_SUCCESS);
  });
  fs.writeFile(this.log_ac, 'TEST STARTED: '+new Date()+', STREAM UNDER TEST: '+this.streamObj.path+' , BITRATE: '+this.bitRates[this.Q_index]+', FRAGMENT OFFSET: '+this.fragmentOffSet+'\n', (err) => {
    if (err) {
      throw err;
    }
    console.log(this.LOG_FILE_SUCCESS);
  });
}

stopManifestInterval(){

  console.log("stop manifest interval");
  this.log('TEST ENDED: '+new Date()+', STREAM UNDER TEST: '+this.streamObj.path+' , BITRATE: '+this.bitRates[this.Q_index]+', FRAGMENT OFFSET: '+this.fragmentOffSet+'\n')

  clearInterval(this.intervalA);

  console.log(this.sceduleCount);
  console.log(this.scedule.length);


    if(this.sceduleCount < this.scedule.length-1){
      this.createScedule()
    }


}

stopScedule(scope){

  var self = this;

  console.log("SELF "+util.inspect(self, false, null))

  var stopi = setInterval(function(){

  var d = +new Date();

  console.log("stopi intrval"+self.sceduleCount);
    console.log("stopi intrval"+self.scedule.length);
  console.log(util.inspect(self.scedule[1], false, null));
  console.log("Curre "+d);
  console.log("Start "+self.scedule[self.sceduleCount].startTime);
  console.log(parseInt(self.scedule[self.sceduleCount].startTime) > d);



if(d > parseInt(self.scedule[self.sceduleCount].endTime)){

  console.log("stopi "+stopi);
  clearInterval(stopi);
  self.stopManifestInterval();

   }

}, 1000)}

createScedule(){

  var self = this;

  var startInt = null;

  function stopScedule(){

    self.stopScedule(self);

  }

  startInt = setInterval(function(){

  var d = +new Date();

  if(self.scedule[self.sceduleCount]){



  console.log("Curre "+d);
  console.log("Start "+self.scedule[self.sceduleCount].startTime);
  console.log(parseInt(self.scedule[self.sceduleCount].startTime) > d);

  if( d > parseInt(self.scedule[self.sceduleCount].startTime)){


    if(startInt){

          clearInterval(startInt);

     }
    self.sceduleCount++;
    self.manifestInterval(self.testFragmentEquality.bind(self), self.streamObj);
    self.stopScedule();

  } else {
    self.sceduleCount++;
  }

}

}, 1000)





}


afterFolders(){
  if(this.scedule.length === 0){
        this.manifestInterval(this.testFragmentEquality.bind(this), this.streamObj);
  } else {
    this.createScedule();
  }
}

manifestInterval(callback, stream) {
  console.log("mani");
  var self = this;
    if(!this.intervalA){
      this.intervalA = setInterval(function(){
        self.downloadManifest(callback, stream);
      }, self.manifestIntervalLength);
}
}

downloadAllChunks(obj, t){
  var self = this;
  var q = self.bitRates[self.Q_index];
//console.log("The index when downloadchunks is called "+util.inspect(obj, false, null));
  self.downloadChunk(t, 'hostA', q, false, function(){
    self.downloadChunk(t, 'hostB', q, false,  function(){
      self.downloadChunk(t, 'hostC', q, false, function(){
        self.downloadChunk(t, 'hostD', q, false, function(){}, obj);
      }, obj);
    }, obj);
  }, obj);
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
    return true;
  } else {
    return false;
  }
}

fragmentRequest (options, callback, _hosts, obj) {
  var self = this;
  request(options, function(err, res, body){

  }).pipe(fs.createWriteStream(self.fragpath+options.interval+'/'+options.t+'_'+options.q+'_chunk.mp4')).on('close', function(){
      obj[options.interval].chunkPath = self.fragpath+options.interval+'/'+options.t+'_'+options.q+'_chunk.mp4';

      var hostBool = (obj.hostA.chunkPath === '' && obj.hostB.chunkPath === '' && obj.hostC.chunkPath === '' && obj.hostD.chunkPath === '');

      if(obj.original_ram.chunkPath !== '' && obj.original.chunkPath !== '' && hostBool) {
        if(self.testedFiles.indexOf(options.t+'_originals') === -1){
                  self.testedFiles.push(options.t+'_originals');
                  self.testFragmentEquality({'original_ram':obj.original_ram, 'original': obj.original}, 'RAM_VS_DISC');
                }

       } else if(obj.hostA.chunkPath !== '' && obj.hostB.chunkPath !== '' && obj.hostC.chunkPath !== '' && obj.hostD.chunkPath !== ''){
                  if(self.testedFiles.indexOf(options.t+'_chunks') === -1){
                    self.testedFiles.push(options.t+'_chunks');
                    //self.testFragmentEquality(obj, 'ALL_CHUNKS');
                   }

       }

       callback(obj, options.t);


    });
}
downloadChunk (time, interval, qual, sub, callback, obj){
      let url = this.buildChunkUrl(this.streamObj, qual, time, sub);
      let options = this.getOptions(this.streamObj.host, interval, url, time, qual);

      if(options !== 'error'){
            this.fragmentRequest(options, callback.bind(this), this.hosts, obj);
      }
}

relocateNonEqualFragments (obj, testid){

  var folder = '';

  switch (testid) {
    case 'RAM_VS_DISC':
      folder = './fragments/non-equals-ram_vs_disc/';
      break;
    case 'ALL_CHUNKS':
        folder = './fragments/non-equals-all_chunks/';
        break;
    default:

  }

  for(var key in obj){
    if(obj.hasOwnProperty(key) && obj[key] !== ''  ){
          var s = obj[key];
          if(s.chunkPath){
              var bits = s.chunkPath.split('/');
              var host = bits[2];
              var fileName = bits[3];
              fs.createReadStream(obj[key].chunkPath).pipe(fs.createWriteStream('./fragments/non-equals/'+host+'_'+fileName));
          }
    }
  }
}

   ///  ***********  FS WORk ************ testing beyond scope ******************** /////////////////

testFragmentEquality (obj, testid){

  var now = new Date();
  var D = dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT");

  let sizes = [];

  for(var key in obj){
    if (!obj.hasOwnProperty(key)) continue;
        var frag = obj[key].chunkPath;
          if(typeof(frag) === 'string'){
            if(frag !== ''){
              try {
                  var stats = fs.statSync(frag);
                  sizes.push(stats.size)
                }
                  catch(err) {
                      console.log('it does not exist');
                  }
             } else {
              console.log(this.ERROR_EQUALITY_MESSAGE);
              var bits = obj.original.chunkPath.split('/');
              this.log('TEST: '+testid+' '+D+' - '+bits[bits.length-1]+' - '+ this.ERROR_EQUALITY_MESSAGE);
              this.relocateNonEqualFragments(obj, testid);
            }
          }
       }
      let EQ = this.equivalence(obj, sizes);

      var bits = obj.original.chunkPath.split('/');

      var str = 'TEST: '+testid+' '+D+' - '+bits[bits.length-1]; // the file name

      if(EQ === false){
        var si = util.inspect(sizes, false, null);
        var s = si.toString();
        str+=' - '+ this.NONEQUALITY_MESSAGE + s;
        this.log(str, testid);
        var sortable = [];
        for(var key in obj){
           sortable.push([key, obj[key]]);
        }
        sortable.sort(function(a, b) {
                return a[1] - b[1];
        });

        console.log("The sorted arrar "+util.inspect(sortable, false, null));

        this.relocateNonEqualFragments(obj, testid);
      } else {
        //var si = util.inspect(sizes, false, null);
        //var s = si.toString();
        var sortable = [];
        for(var key in obj){
           sortable.push([key, obj[key]]);
        }
        sortable.sort(function(a, b) {
                return a[1] - b[1];
        });

        console.log("The sorted arrar "+util.inspect(sortable, false, null));

        this.relocateNonEqualFragments(obj, testid);
        str+=' - '+ this.EQUALITY_MESSAGE;
        this.log(str, testid);
      }
      if(testid === 'RAM_VS_DISC'){

      for(var key in obj){
        fs.unlink(obj[key].chunkPath, function(){
              //array.shift();
        })
      }

      }
    }



downloadManifest(callback, streamObj){

  var self = this;
  self.consoleToggle(false);
  var url = this.buildManifestUrl(streamObj);
  request.get(url, function(err,res,body) {

    parseString(body, function (err, result) {

             const errFunc = function(){
                console.log(self.MANIFEST_WARNING);
                self.log(self.MANIFEST_WARNING+url);
                return;
              }
              if(err !== null || res.statusCode !== 200){
                errFunc();
              } else {
                console.log(self.MANIFEST_SUCCESS);
                let currentTimeCode = parseInt(result.SmoothStreamingMedia.StreamIndex[0].c[0].$.t);
                let offSetChunk = currentTimeCode+(self.fragmentLength*self.fragmentOffSet);
                let q = self.bitRates[self.Q_index];

                let obj = {'original':{'chunkPath':''}, 'original_ram':{'chunkPath':''}, 'hostA':{'chunkPath':''}, 'hostB':{'chunkPath':''}, 'hostC':{'chunkPath':''}, 'hostD':{'chunkPath':''}};
                self.downloadChunk(offSetChunk, 'original', q, false, function(){
                  self.downloadChunk(offSetChunk, 'original_ram', q, true, self.createChunkTimeout.bind(self), obj); // the chunk in RAM
                }, obj);
              self.consoleToggle(false);
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
                       callback(); //**************************** NO NEED TO WATCH FOLDERS NOW ***********************
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
         //console.log(self.UNLINK_FRAGMENT_MESSAGE+" path");
         //remove();
       }
     }

     var watch =  chokidar.watch(path, {ignored: /[\/\\]\./, persistent: true}).on('add', function(name) {
       array.push(name);
       testNum();
     })

   }

   log(str, testid){

     var logFile = '';
     switch (testid) {
       case 'RAM_VS_DISC':
       logFile = this.log_rvd;
         break;
        case 'ALL_CHUNKS':
        logFile = this.log_ac;
           break;
       default:
         logFile = this.log_rvd;
     }

     var stream = fs.createWriteStream(logFile, {flags:'a'});
     stream.write(str + "\n");
     stream.end();

   }

 }



var fragmentPuller = new FragmentPullComparison();
fragmentPuller.beginTest();

module.exports = FragmentPullComparison;
