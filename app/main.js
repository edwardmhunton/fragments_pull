import fs from 'fs';

import events from 'events';

import util from 'util';

import request from 'request';

import externalip from 'externalip';

import {parseString} from 'xml2js';

import path from 'path';

import chokidar from 'chokidar';

import rimraf from 'rimraf';

import dateFormat from 'dateformat';

import watch from 'watchjs';

import Mail from './Mail';

/*    {"stream":"skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301", "startTime":"1518020160000", "endTime":"1518030960000"},
    {"stream":"skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301", "startTime":"1518020460000", "endTime":"1518020640000"},
    {"stream":"skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301", "startTime":"1518020820000", "endTime":"1518021000000"}

    */

class FragmentPullComparison {

  constructor() {

    this.config = require('../config.json');

    this.MANIFEST_WARNING = "THERE WAS AN ISSUE DOWNLOADING THE MANIFEST";
    this.MANIFEST_SUCCESS = "MANIFEST SUCCESSFULLY DOWNLOADED";
    this.FRAGMENT_SUCCESS = "FRAGMENT SUCCESSFULLY DOWNLOADED";
    this.LOG_FILE_SUCCESS = "LOG FILE CRTEATED";
    this.FRAGMENT_WARNING = "THERE WAS AN ERROR REQUESTING THE FRAGMENT";
    this.EQUALITY_MESSAGE = "FRAGMENTS TESTED EQUAL IN SIZE";
    this.NONEQUALITY_MESSAGE = "FRAGMENTS TESTED NON-EQUAL IN SIZE";
    this.ERROR_EQUALITY_MESSAGE = "FRAGMENTS TESTED NON-EQUAL IN SIZE";
    this.UNLINK_FRAGMENT_MESSAGE = "FRAGMENT HAS BEEN DELETED";

    this.testedFiles = []; // array of the files that have been tested

    this.called = 0; // change this !!!!!!!!!!!!

    this.hourlySummaryTemplate = {
                                  "time":"",
                                  "comparisions":0,
                                  "equal":0,
                                  "non-equal":0,
                                  "percentage_non_equal":0,
                                  "percentage_hourly_change":0
                                }


    this.testData = {"test":{

                  "start_date": "",
                  "stream": "",
                  "log_location": "",
                  "comparisions_total": 0,
                  "equal": 0,
                  "non_equal": 0,
                  "percentage_non_equal": 0,
                  "rolling_snap_shot":new Array(),
                  "non_equal_fragments":new Array()

                  }};

    // best Epoh time converter https://www.epochconverter.com/
    this.hosts = {
      'non-equals':{
        'ip': ''
      },
      'RAM':{
        'ip': ''
      },'DISC':{
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

    this.mainIntervalLength = 60000; //60 secs

    this.manifestIntervalLength = 2000; // 2 sec

    this.fragmentLength = 20000000; // from oldest chunk to live

    this.streamString = process.argv[2] || 'origin7.skysportsmainevent.hss.skydvn.com/z2skysportsmainevent/1301';

    this.fragmentOffSet = process.argv[3] || 53; // from oldest chunk to live

    this.Q_index = process.argv[4] || 6;

    this.mode = process.argv[5] || 'debug';

    this.offSetBufferLength = 15; // how many files retain as a buffer before deleting them

    this.bitRates = ["89984","280000", "619968", "1179968", "2014976", "3184960", "4864960"];

    this.testIds = ["RAM_VS_DISC"]; //ALL_CHUNKS

    ///////////////////////////////////////////////////

    this.scheduleCount = 0;

    this.fragpath = './fragments/';

    this.log_rvd = './logs/RAM_VS_DISC_logFile.txt';
    this.log_ac = './logs/ALL_CHUNKS_logFile.txt';

    this.streamObj = {};

    this.oldConsoleLog = null;

  }


  /*this.testData = {"test":{

                "start_date": "",
                "stream": "",
                "log_location": "",
                "comparisions_total": 0,
                "equal": 0,
                "non_equal": 0,
                "percentage_non_equal": 0,
                "hourly_summaries":[]

                }};

*/

getPercentageNonEqualsLastHour(lastHour){
  var count = 0;
  for(var i in lastHour){
    if(lastHour[i].hasOwnProperty('fragment')) continue;
    if(lastHour[i].fragment){
      count++;
    }
  }

  return (count/30)*100;

}

  getPercentageNonEquals(t, ne){

    console.log(t);
    console.log(ne);

    return ne/t*100;

  }

  setUpTestData(streamObj){
    var self = this;
    self.testData.test.start_date = new Date();
    self.testData.test.stream = streamObj.path;

    externalip(function (err, ip) {
          self.testData.test.log_location = "http://"+ip+__dirname + '/../logs/RAM_VS_DISC.txt';
          self.testData.test.script_location = "http://"+ip+__dirname;
    });
}

  updateTestData(testObj, sizes, result){

     //console.log("testObj"+util.inspect(testObj, false, null));

    this.testData.test.comparisions_total=this.testData.test.comparisions_total+1;

    if(this.testData.test.non_equal_fragments.length > 30){ // there are 3600 seconds in 1hr, the comparison is performed every 2 seconds
      //this.testData.test.rolling_snap_shot.shift();
      this.testData.test.non_equal_fragments.shift();
    }

  if(result === true){
      this.testData.test.equal++;
    //  this.testData.test.rolling_snap_shot.push(result);
      this.testData.test.non_equal_fragments.push({'fragment':''}) // push in an empty holder
    //  this.testData.test.non_equal_fragments.push({'fragment': testObj.fragment, 'quality':testObj.bitrate, 'disc':sizes[0], 'ram':sizes[1]});

  } else {

    for(var i in sizes){ // dont cound zero byte fragments as partials
        if(sizes[i] === '0' || sizes[i] === 0){
          return;

        } else {

      this.testData.test.non_equal++;
      //this.testData.test.rolling_snap_shot.push(result);
      this.testData.test.non_equal_fragments.push({'fragment': testObj.fragment, 'quality':testObj.bitrate, 'disc':sizes[0], 'ram':sizes[1]});
    }
    }
  }


    //console.log(util.inspect(this.testData, false, null));

}

sendHourlySummary(html){

  this.mailObj.send({'html':html});

}

  buildHorlySummary(data, callback){

    var D = dateFormat(data.test.start_date, "dddd, mmmm dS, yyyy, h:MM:ss TT");

    data.test.percentage_non_equal_alltime = this.getPercentageNonEquals(data.test.comparisions_total,this.testData.test.non_equal);

    data.test.percentage_non_equal_lasthour = this.getPercentageNonEqualsLastHour(data.test.non_equal_fragments);

    function getNonEqualListItem(obj){

    //  console.log("OB "+util.inspect(obj, false, null));

      return '<li>Fragment: '+obj.fragment+', Bitrate: '+obj.quality+', Size in RAM: '+obj.ram+', Size on DISC: '+obj.disc+'</li>';

    }

    var textHtml = "<h2>Fragment comparison testing - Test started at "+D+"</h2>"+
               "<p>Stream under test: "+data.test.stream+"</p>"+
               "<p>Script running here: "+data.test.script_location+'</p>'+
               '<p>The logs for the tests are located <a href="'+data.test.log_location+'">here</a></p>'+
               '<h3>Summary since test started</h3>'+
               '<p>Total comparisons: '+data.test.comparisions_total+'</p>'+
               '<p>Non-patial / Patial: '+data.test.equal+' / '+data.test.non_equal+'</p>'+
               '<p>Average of patial fragments over test duration : '+data.test.percentage_non_equal_alltime+'</p>'+
               '<p>Average of patial fragments during the last hour : '+data.test.percentage_non_equal_lasthour+'</p>';

               if(data.test.non_equal_fragments.length > 0){
                 textHtml+="<h4>Unequal fragments in the last hour</h4><ul>";
                 for(var i in data.test.non_equal_fragments){

                   if(data.test.non_equal_fragments[i].fragment){ // if its an empty string do nothing

                   textHtml+=getNonEqualListItem(data.test.non_equal_fragments[i]);

                   }

                 }
                 textHtml+="</ul>";
               }




               console.log(textHtml)

               callback(textHtml);



  }




setConstants(obj){

    for(var key in obj){
      if(obj.hasOwnProperty(key) && obj[key] !== ''){
          //console.log("OB KEY "+key+" : "+util.inspect(obj[key], false, null));
          this[key] = obj[key];
      }
    }
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

setUpMail(recipiants){

  var files = [
    {filename: 'test.txt',
     path: './logs/RAM_VS_DISC_logFile.txt' // stream this file]
   }]

  var mailObj = new Mail(recipiants, this.mail.transporterAuth, files);
  this.mailObj = mailObj;

}

emailInterval(){

  var self = this;

  var emailInterval = setInterval(function(){

    self.buildHorlySummary(self.testData, self.sendHourlySummary.bind(self));
    console.log('buildHorlySummary');

  }, 6000) // 1 min

  //300000 = 5mins!!!!!
  //3600000 = 1hr


}



beginTest(){

  if(this.config){this.setConstants(this.config.config)};

    this.streamObj = this.streamParse(this.streamString);
    this.setUpTestData(this.streamObj);
    this.createFolder('./', 'logs', this.createLogFile.bind(this));
    this.deleteFolder(this.fragpath, function(){
    this.createChunkFolders(this.fragpath, this.hosts, this.setUpWatchers.bind(this));
    this.createFolder(this.fragpath, 'non-equals-ram_vs_disc', function(){});
    this.createFolder(this.fragpath, 'non-equals-all_chunks', this.afterFolders.bind(this));
    if(this.mail.recipiants){
      this.setUpMail(this.mail.recipiants);
    };

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
  fs.writeFile(this.log_rvd, 'APP RUN: '+new Date()+', STREAM UNDER TEST: '+this.streamObj.path+' , BITRATE: '+this.bitRates[this.Q_index]+', FRAGMENT OFFSET: '+this.fragmentOffSet+'\n', (err) => {
    if (err) {
      throw err;
    }
    console.log(this.LOG_FILE_SUCCESS);
  });

  fs.writeFile(this.log_ac, 'APP RUN: '+new Date()+', STREAM UNDER TEST: '+this.streamObj.path+' , BITRATE: '+this.bitRates[this.Q_index]+', FRAGMENT OFFSET: '+this.fragmentOffSet+'\n', (err) => {
    if (err) {
      throw err;
    }
    console.log(this.LOG_FILE_SUCCESS);
  });
}

stopManifestInterval(){

  var d = +new Date();

  console.log("stop man called");


  clearInterval(this.intervalA);
  this.intervalA = null;
  this.scheduleCount++;
  if(this.scheduleCount < this.schedule.length){
    var t = this.schedule[this.scheduleCount].startTime;
    var now = +new Date();
    var startTime = t - now;
    this.startEvent(startTime, this.schedule[this.scheduleCount].stream);
    //this.mailObj.send({'testStream':this.streamObj.path, 'testDate': d, 'testData':this.testData}); // only send the logs when final test is compleate
  } else if(this.scheduleCount === this.schedule.length && this.mail){
    //this.mailObj.send({'testStream':this.streamObj.path, 'testDate': d}); // only send the logs when final test is compleate
  }

  this.log('MANIFEST INTERVAL ENDED: '+d+', STREAM UNDER TEST: '+this.streamObj.path+' , BITRATE: '+this.bitRates[this.Q_index]+', FRAGMENT OFFSET: '+this.fragmentOffSet+'\n');

}

stopEvent(stopTime){
  var self = this;
  //console.log("timeout until stop"+stopTime/10);
  let stopInt = setTimeout(function(){
    self.stopManifestInterval(self.testFragmentEquality.bind(self), self.streamObj);
  }, stopTime);

}
startEvent(startTime, stream){

  //console.log("STREAM"+stream);
  var self = this;
  //console.log("timeout until start"+startTime/10);
  self.streamObj = self.streamParse(stream);
  let startInt = setTimeout(function(){
    self.log('TEST STARTED: '+new Date()+', STREAM UNDER TEST: '+self.streamObj.path+' , BITRATE: '+self.bitRates[self.Q_index]+', FRAGMENT OFFSET: '+self.fragmentOffSet);
    console.log("start event");
    self.manifestInterval(self.testFragmentEquality.bind(self), self.streamObj);
  }, startTime);

}


afterFolders(){


  console.log("The sced: "+util.inspect(this.schedule, false, null));
    var now = +new Date();
  //console.log(this.schedule[0].startTime < now);
  if(this.schedule.length === 0 || this.schedule[0].startTime < now){
        this.manifestInterval(this.testFragmentEquality.bind(this), this.streamObj);
        this.emailInterval();
  } else {
    var t = this.schedule[this.scheduleCount].startTime;

    var startTime = t - now;
    this.startEvent(startTime, this.schedule[this.scheduleCount].stream);
    this.emailInterval();
  }
}

manifestInterval(callback, stream) {

  console.log("manifestInterval: "+stream);

  var self = this;
  var now = +new Date();
  console.log("self.intervalA: "+self.intervalA);
  //  if(!self.intervalA){
    //  self.intervalA = setInterval(function(){
        self.downloadManifest(callback, stream);
    //  }, self.manifestIntervalLength);
  //  }

    if(this.schedule.length > 0 && this.schedule.startTime > now){
      if(this.scheduleCount < this.schedule.length){
        var t = this.schedule[this.scheduleCount].endTime;

        var stopTime = t - now;
        this.stopEvent(stopTime);
      }
  }
}

downloadAllChunks(obj, t){
  var self = this;
  var q = self.bitRates[self.Q_index];
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

  if(interval !== 'DISC'){
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

//  "user": "k72za5pewcfr2hcd@ethereal.email",
//  "pass": "1d91yxXUAE7zvpPGqd"

equivalence (obj, sizes){
  function allEqual(arr) {
    for(var i = 0; i <arr.length-1; i++){
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


fragmentRequest (options, callback, _hosts, obj){
  var self = this;
  var tempFilepath = self.fragpath+options.interval+'/'+options.t+'_'+options.q+'_chunk.mp4';
  //var tempFile = fs.createWriteStream(tempFilepath);

//  tempFile.on('open', function(){

    request(options, function(err, res, body){

    }).pipe(fs.createWriteStream(tempFilepath)).on('close', function(){

    console.log(" "+self.FRAGMENT_SUCCESS);

                      obj[options.interval].chunkPath = self.fragpath+options.interval+'/'+options.t+'_'+options.q+'_chunk.mp4';

                      var hostBool = (obj.hostA.chunkPath === '' && obj.hostB.chunkPath === '' && obj.hostC.chunkPath === '' && obj.hostD.chunkPath === '');

                      if(obj.RAM.chunkPath !== '' && obj.DISC.chunkPath !== '' && hostBool) {
                      console.log("1 "+util.inspect(self.testedFiles, false, null));
                        if(self.testedFiles.indexOf(options.t+'_originals') === -1){
                        console.log("2 ")
                                  self.testedFiles.push(options.t+'_originals');
                                  if(self.testedFiles.length > 15){
                                    self.testedFiles.shift(); ///
                                  }
                                    if(self.testIds.indexOf('RAM_VS_DISC') > -1){
                                     console.log("3")
                                        self.testFragmentEquality({'RAM':obj.RAM, 'DISC': obj.DISC, 'fragment': options.t, 'bitrate':options.q, 'originalPath':options.url}, 'RAM_VS_DISC');


                                    }
                                } else {
                                  self.downloadManifest(self.testFragmentEquality.bind(self), self.streamObj);
                                }

                       } else if(obj.hostA.chunkPath !== '' && obj.hostB.chunkPath !== '' && obj.hostC.chunkPath !== '' && obj.hostD.chunkPath !== ''){
                                  if(self.testedFiles.indexOf(options.t+'_chunks') === -1){
                                    self.testedFiles.push(options.t+'_chunks');
                                    if(self.testIds.indexOf('ALL_CHUNKS') > -1){
                                        self.testFragmentEquality(obj, 'ALL_CHUNKS');
                                        //self.downloadManifest(self.testFragmentEquality.bind(self), self.streamObj); // this CB shoul be ownloaManifest
                                    }
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

//formatObj(obj, sizes){

  //console.log("obj:   "+util.inspect(obj, false, null));

  //var n = {};



//}//

testFragmentEquality (obj, testid){

  console.log("TEST EQUALITY");

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

                      console.log('check on file '+frag+' : it does not exist');
                  }
             } else {
              console.log(this.ERROR_EQUALITY_MESSAGE);
              var bits = obj.DISC.chunkPath.split('/');
              this.log('TEST: '+testid+' '+D+' - '+bits[bits.length-1]+' - '+ this.ERROR_EQUALITY_MESSAGE);
              this.relocateNonEqualFragments(obj, testid);
            }
          }
       }

      // console.log("SIZES"+ sizes);


      let EQ = this.equivalence(obj, sizes);

      var bits = obj.DISC.chunkPath.split('/');

      var str = 'TEST: '+testid+' '+D+' - '+bits[bits.length-1]; // the file name

      //console.log("The OBJ: "+util.inspect(obj, false, null));

      this.updateTestData(obj,sizes,EQ);

      if(EQ === false){
        var si = util.inspect(sizes, false, null);
        var s = si.toString();
        str+=' - '+ this.NONEQUALITY_MESSAGE + s;
        this.log(str, testid);



        //console.log("The sorted arrar "+util.inspect(sortable, false, null));

        this.relocateNonEqualFragments(obj, testid);
      } else {


      ///  this.relocateNonEqualFragments(obj, testid);
        str+=' - '+ this.EQUALITY_MESSAGE;
        this.log(str, testid);
      }
      //console.log(testid);
      if(testid === 'RAM_VS_DISC'){

      //  console.log(util.inspect(obj, false, null));

    //  for(var key in obj){
        //console.log(obj[key].chunkPath);
          fs.unlink(obj.RAM.chunkPath, function(){
          })
          fs.unlink(obj.DISC.chunkPath, function(){
          })

          this.downloadManifest(this.testFragmentEquality.bind(this), this.streamObj); // this CB shoul be ownloaManifest
        //fs.unlink(obj[key].chunkPath, function(){

              //array.shift();
      //  })
      //}

      }
    }



downloadManifest(callback, streamObj){

//  console.log("DL");

  //console.log("cb: "+util.inspect(callback, false, null));

  //console.log("streamObj: "+util.inspect(streamObj, false, null));

  var self = this;
  var url = this.buildManifestUrl(streamObj);

  //console.log("DL: "+url);

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
                if(result.SmoothStreamingMedia){
                    let currentTimeCode = parseInt(result.SmoothStreamingMedia.StreamIndex[0].c[0].$.t);
                    let offSetChunk = currentTimeCode+(self.fragmentLength*self.fragmentOffSet);
                    let q = self.bitRates[self.Q_index];
                    let obj = {'DISC':{'chunkPath':''}, 'RAM':{'chunkPath':''}, 'hostA':{'chunkPath':''}, 'hostB':{'chunkPath':''}, 'hostC':{'chunkPath':''}, 'hostD':{'chunkPath':''}};
                    self.downloadChunk(offSetChunk, 'DISC', q, false, function(){
                      var callback;
                      self.testIds.indexOf('ALL_CHUNKS') > -1 ? callback = self.createChunkTimeout.bind(self) : callback = function(){} ;

                      self.downloadChunk(offSetChunk, 'RAM', q, true, callback, obj); // the chunk in RAM

                    }, obj);
                  } else {
                    self.downloadManifest(self.testFragmentEquality.bind(self), self.streamObj); // this CB shoul be ownloaManifest

                  }
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
