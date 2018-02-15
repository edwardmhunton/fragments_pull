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

  //  var d = new Date();

    this.timeStamp = new Date().getTime();

    this.emailIntervalNumber = 10; //mins

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
                  "percentage_non_equal_lasthour": 0.000,
                  "percentage_non_equal_alltime": 0.000,
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

    this.log_rvd = 'RAM_VS_DISC_logFile.txt';
    this.log_ac = 'ALL_CHUNKS_logFile.txt';

    this.streamObj = {};

    this.oldConsoleLog = null;

  }


getPercentageNonEqualsLastHour(callback){

  var count = 0;
  for(var i in this.testData.test.non_equal_fragments){
    if(this.testData.test.non_equal_fragments[i].fragment){
      count++;
    }
  }
  console.log("NEs: "+util.inspect(this.testData.test.non_equal_fragments, false, null));

  var c = (count/this.testData.test.non_equal_fragments.length)*100;
//  console.log("c: "+c);
  this.testData.test.percentage_non_equal_lasthour = c;
  callback.bind(this);
  callback();
  //return c.toFixed(4);



}

  getPercentageNonEquals(callback){
    //data.test.comparisions_total,this.testData.test.non_equal

    this.testData.test.percentage_non_equal_alltime = this.testData.test.non_equal/this.testData.test.comparisions_total*100;

    console.log("all testData"+util.inspect(this.testData, false, null));


    //  console.log("p: "+p);

    callback();
    //return p.toFixed(4);

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
    this.testData.test.comparisions_total=this.testData.test.comparisions_total+1;

    if(this.testData.test.non_equal_fragments.length >= this.emailIntervalNumber*30){ // there are 3600 seconds in 1hr, the comparison is performed every 2 seconds
      this.testData.test.non_equal_fragments.shift();
    }
//  result = false;
  if(result === true){
      this.testData.test.equal++;
      this.testData.test.non_equal_fragments.push({'fragment':''}) // push in an empty holder
  } else {
    for(var i in sizes){ // dont count zero byte fragments as partials
        if(sizes[i] === '0' || sizes[i] === 0){
          return;

        }
      }
      this.testData.test.non_equal++;
      this.testData.test.non_equal_fragments.push({'fragment': testObj.fragment, 'quality':testObj.bitrate, 'disc':sizes[0], 'ram':sizes[1]});
    }
  }

  resetLogs(){

    console.log("RESET LOGS CALLED"+this);

    this.timeStamp = new Date().getTime();

    this.createLogFile();
  }

sendHourlySummary(html){



  this.mailObj.send({'html':html}, [{
    filename: this.timeStamp+'.txt',
    path: './logs/'+this.timeStamp+'_RAM_VS_DISC_logFile.txt' // stream this file]
  }], this.resetLogs.bind(this));



}

genHtml(data){

  function getNonEqualListItem(obj){
    return '<li>Fragment: '+obj.fragment+', Bitrate: '+obj.quality+', Size in RAM: '+obj.ram+', Size on DISC: '+obj.disc+'</li>';
  }

  var cpm = data.test.non_equal_fragments.length/this.emailIntervalNumber;
  var cp = cpm.toFixed(4);

  console.log("cmp: "+cpm);
  console.log("cp: "+cp);

  console.log("last hr: "+data.test.percentage_non_equal_lasthour);

  var textHtml = "<h2>Fragment comparison testing - Test started at "+data.test.start_date+"</h2>"+
             "<p>Stream under test: "+data.test.stream+"</p>"+
             "<p>Script running here: "+data.test.script_location+'</p>'+
             '<p>The logs for the tests are located <a href="'+data.test.log_location+'">here</a></p>'+
             '<h3>Summary over lifetime of test</h3>'+
             '<p>Total comparisons: '+data.test.comparisions_total+'</p>'+
             '<p>Non-patial / Patial: '+data.test.equal+' / '+data.test.non_equal+'</p>'+
             '<p>Percentage of patial fragments over test duration : '+data.test.percentage_non_equal_alltime+'</p>'+
             '<h3>Summary of previous '+this.emailIntervalNumber+' mins</h3>'+
             '<p>Total comparisons in previous '+this.emailIntervalNumber+' mins: '+data.test.non_equal_fragments.length+'</p>'+
             '<p>Average number of comparisons per minute in previous '+this.emailIntervalNumber+' mins: '+cp+'</p>'+
             '<p>Percentage of patial fragments during the last '+ this.emailIntervalNumber+' mins: '+data.test.percentage_non_equal_lasthour+'</p>';

             if(data.test.percentage_non_equal_lasthour > 0){
               textHtml+='<h4>Unequal fragments in the previous '+this.emailIntervalNumber+' mins</h4><ul>';
               for(var i in data.test.non_equal_fragments){

                 if(data.test.non_equal_fragments[i].fragment){ // if its an empty string do nothing

                 textHtml+=getNonEqualListItem(data.test.non_equal_fragments[i]);

                 }

               }
               textHtml+="</ul>";
             }


             return textHtml;

}

  buildHorlySummary(callback){





     this.getPercentageNonEquals(function(){

           this.getPercentageNonEqualsLastHour(function(){

            //console.log("data for summary "+util.inspect(data, false, null));

                  var html = this.genHtml(this.testData);

                  console.log("The state of the test data before we send:  "+util.inspect(this.testData, false, null));

                  callback(html);

          }.bind(this));

    }.bind(this));






}




setConstants(obj){

    for(var key in obj){
      if(obj.hasOwnProperty(key) && obj[key] !== ''){
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


  var mailObj = new Mail(recipiants, this.mail.transporterAuth);
  this.mailObj = mailObj;



}

emailInterval(){

  var self = this;

  var emailInterval = setInterval(function(){

    self.buildHorlySummary(self.sendHourlySummary.bind(self));
    console.log('buildHorlySummary');

  },this.emailIntervalNumber*60000)
  //3600000 = 1hr
}



beginTest(){

  if(this.config){this.setConstants(this.config.config)};

    this.streamObj = this.streamParse(this.streamString);
    this.setUpTestData(this.streamObj);

    this.deleteFolder('./logs', function(){
      this.createFolder('./', 'logs', this.createLogFile.bind(this));
    }.bind(this));

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
  fs.writeFile('./logs/'+this.timeStamp+'_'+this.log_rvd, 'APP RUN: '+new Date()+', STREAM UNDER TEST: '+this.streamObj.path+' , BITRATE: '+this.bitRates[this.Q_index]+', FRAGMENT OFFSET: '+this.fragmentOffSet+'\n', (err) => {
    if (err) {
      throw err;
    }
    console.log(this.LOG_FILE_SUCCESS);
  });

  fs.writeFile('./logs/'+this.timeStamp+'_'+this.log_ac, 'APP RUN: '+new Date()+', STREAM UNDER TEST: '+this.streamObj.path+' , BITRATE: '+this.bitRates[this.Q_index]+', FRAGMENT OFFSET: '+this.fragmentOffSet+'\n', (err) => {
    if (err) {
      throw err;
    }
    console.log(this.LOG_FILE_SUCCESS);
  });
}

stopManifestInterval(){

  var d = +new Date();
  clearInterval(this.intervalA);
  this.intervalA = null;
  this.scheduleCount++;
  if(this.scheduleCount < this.schedule.length){
    var t = this.schedule[this.scheduleCount].startTime;
    var now = +new Date();
    var startTime = t - now;
    this.startEvent(startTime, this.schedule[this.scheduleCount].stream);
  } else if(this.scheduleCount === this.schedule.length && this.mail){
  }

  this.log('MANIFEST INTERVAL ENDED: '+d+', STREAM UNDER TEST: '+this.streamObj.path+' , BITRATE: '+this.bitRates[this.Q_index]+', FRAGMENT OFFSET: '+this.fragmentOffSet+'\n');

}

stopEvent(stopTime){
  var self = this;
  let stopInt = setTimeout(function(){
    self.stopManifestInterval(self.testFragmentEquality.bind(self), self.streamObj);
  }, stopTime);

}
startEvent(startTime, stream){
  var self = this;
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

  var self = this;
  var now = +new Date();
  self.downloadManifest(callback, stream);


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

    request(options, function(err, res, body){

    }).pipe(fs.createWriteStream(tempFilepath)).on('close', function(){

                      obj[options.interval].chunkPath = self.fragpath+options.interval+'/'+options.t+'_'+options.q+'_chunk.mp4';

                      var hostBool = (obj.hostA.chunkPath === '' && obj.hostB.chunkPath === '' && obj.hostC.chunkPath === '' && obj.hostD.chunkPath === '');

                      if(obj.RAM.chunkPath !== '' && obj.DISC.chunkPath !== '' && hostBool) {
                        if(self.testedFiles.indexOf(options.t) === -1){
                                  self.testedFiles.push(options.t);
                                  if(self.testedFiles.length > 15){
                                    self.testedFiles.shift(); ///
                                  }
                                  if(self.testIds.indexOf('RAM_VS_DISC') > -1){
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


      let EQ = this.equivalence(obj, sizes);

      var bits = obj.DISC.chunkPath.split('/');

      var str = 'TEST: '+testid+' '+D+' - '+bits[bits.length-1]; // the file name

      this.updateTestData(obj,sizes,EQ);

      if(EQ === false){
        var si = util.inspect(sizes, false, null);
        var s = si.toString();
        str+=' - '+ this.NONEQUALITY_MESSAGE + s;
        this.log(str, testid);
        this.relocateNonEqualFragments(obj, testid);
      } else {


        str+=' - '+ this.EQUALITY_MESSAGE;
        this.log(str, testid);
      }
      if(testid === 'RAM_VS_DISC'){


          fs.unlink(obj.RAM.chunkPath, function(){
          })
          fs.unlink(obj.DISC.chunkPath, function(){
          })

          this.downloadManifest(this.testFragmentEquality.bind(this), this.streamObj);


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
                return;
              }
              if(err !== null || res.statusCode !== 200){
                errFunc();
              } else {
                //console.log(self.MANIFEST_SUCCESS);
                if(result.SmoothStreamingMedia){
                    let currentTimeCode = parseInt(result.SmoothStreamingMedia.StreamIndex[0].c[0].$.t);
                    let offSetChunk = currentTimeCode+(self.fragmentLength*self.fragmentOffSet);

                    let q = self.bitRates[self.Q_index];
                    let obj = {'DISC':{'chunkPath':''}, 'RAM':{'chunkPath':''}, 'hostA':{'chunkPath':''}, 'hostB':{'chunkPath':''}, 'hostC':{'chunkPath':''}, 'hostD':{'chunkPath':''}};
                    if(self.testedFiles.indexOf(offSetChunk) === -1){
                          self.downloadChunk(offSetChunk, 'DISC', q, false, function(){
                            var callback;
                            self.testIds.indexOf('ALL_CHUNKS') > -1 ? callback = self.createChunkTimeout.bind(self) : callback = function(){} ;

                            self.downloadChunk(offSetChunk, 'RAM', q, true, callback, obj); // the chunk in RAM

                          }, obj);
                      } else {
                          self.downloadManifest(self.testFragmentEquality.bind(self), self.streamObj); // this CB shoul be ownloaManifest
                      }
                  } else {


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
       logFile = './logs/'+this.timeStamp+'_'+this.log_rvd;
         break;
        case 'ALL_CHUNKS':
        logFile = './logs/'+this.timeStamp+'_'+this.log_ac;
           break;
       default:
         logFile = './logs/'+this.timeStamp+'_'+this.log_rvd;
     }

     var stream = fs.createWriteStream(logFile, {flags:'a'});
     stream.write(str + "\n");
     stream.end();

   }

 }



var fragmentPuller = new FragmentPullComparison();
fragmentPuller.beginTest();

module.exports = FragmentPullComparison;
