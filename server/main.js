import fs from 'fs';

import util from 'util';

import request from 'request';

import {parseString} from 'xml2js';

import path from 'path';

import chokidar from 'chokidar';

import winston from 'winston';

import rimraf from 'rimraf';

import dateFormat from 'dateFormat';






let timecodes = [];

var bitRates = ["89984","280000", "619968", "1179968", "2014976", "3184960", "4864960"];

var hosts = {
  'original':{
    'ip': 'skysportsmainevent-go-hss.ak-cdn.skydvn.com'
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

var Q_index = 6;

var filesToTest = {};

var fragpath = path.join(__dirname + '/fragments/');

var mainIntervalLength = 1000;



//var folderNames = ['hostA','hostB','hostC','hostD', 'original','non-equals'];

var chunkFolders = ['hostA','hostB','hostC','hostD'];

var chunkOffSet = 53; // from oldest chunk to live

var intervalB, intervalA;

const debug = require('debug')('my-namespace')
const name = 'my-app'

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


const createChunkFolders = function(fragpath, folderNames, callback){

  var f = chunkFolders;
  f.push('original');

  if(!fs.existsSync(fragpath)){
    fs.mkdir(fragpath, function(){
      f.map((dir, i, f) => {
                  var folders = [];
                  if(!fs.existsSync(fragpath+dir)){
                    fs.mkdir(fragpath+dir, function(){
                      var a = [];
                      callback(fragpath+dir, dir, a);
                    });

                  }
        });
      })
    } else {
  folderNames.map((dir, i, folderNames) => {
    var a = [];
    callback(fragpath+dir, dir, a);
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
    } else if(array.length >= 30) {
      remove();
    }
  }

  var watch =  chokidar.watch(path, {ignored: /[\/\\]\./, persistent: true}).on('add', function(name) {
    array.push(name);
    testNum();
  })

}

const log = function(str){

  var stream = fs.createWriteStream(__dirname+'/fragments/logs/logFile.txt', {flags:'a'});
  stream.write(str + "\n");
  stream.end();

}





const beginTest = function(){

    deleteFolder(fragpath, function(){
    createChunkFolders(fragpath, chunkFolders, watchFolder);
    createFolder(fragpath, 'non-equals', afterFolders);
    createFolder(fragpath, 'logs', createLogFile);

    /*var str = 'HOST IPS \n';

    for(var i in hosts){
      str+=hosts[i]+', ';
    }

    console.log(str);

    log(str);*/


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
  fs.writeFile(__dirname+'/fragments/logs/logFile.txt', 'TEST STARTED: '+new Date()+'\n', (err) => {
    if (err) {
      throw err;
    }
    console.log("log file created");
  });
}


const afterFolders = function(){
  manifestInterval(createTimeoutForIntervalB);
}

const manifestInterval = function(callback) {
    if(!intervalA){
      intervalA = setInterval(function(){
        downloadManifest(callback);
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

/*const whichHost = function(int) {
  var host = "";

  switch(int) {

    case 'original':
       return 'skysportsmainevent-go-hss.ak-cdn.skydvn.com';
      break;
    case 'hostA':
      return hostIps[0];
      break;
    case 'hostB':
      return hostIps[1];
      break;
    case 'hostC':
      return hostIps[2];
      break;
    case 'hostD':
      return hostIps[3];
      break;

  }
}*/

const getOptions = function(interval, url){

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
    options.headers.Host =  'origin7.skysportsmainevent.hss.skydvn.com';
  }

  return options;

}

const buildUrl = function(h, q, t){
    return 'http://'+h+'/z2skysportsmainevent/1301.isml/QualityLevels('+q+')/Fragments(video='+t+')';
}

const buildFileName = function(p, i, q, t){
  return p+i+'/chunk_'+q+'_'+t+'.mp4';
}


const performRequest = function(options, time, interval, filename, callback) {
  request(options, function(err, res, body){
    if(!filesToTest[time]){
      filesToTest[time] = {'original':'', 'hostA':'', 'hostB':'', 'hostC':'', 'hostD':'', 'counter':0}
    }

    filesToTest[time][interval] = filename;

    if(interval !== 'original') {
      //filesToTest[time].totaltime+=(res.timings.end - res.timings.response); // the total of all request for a segment need to happen inside 2seconds
          if(filesToTest[time].counter < 4){
            filesToTest[time].counter++;
          }
      }
    }).pipe(fs.createWriteStream(filename)).on('close', function(){
      //console.log(filesToTest[time].counter)
      //console.log(chunkFolders.length)
      if(filesToTest[time]){
        if(filesToTest[time].counter === chunkFolders.length-1 && filesToTest[time].original){
            callback(filesToTest[time]);
            delete filesToTest[time];
        }
      }

      });

}

const downloadChunk = function(time, interval){

  console.log("interval "+interval);


let host = hosts[interval].ip;
let url = buildUrl(host, bitRates[Q_index], time);
let options = getOptions(interval, url);
let fileName = buildFileName(fragpath, interval, bitRates[Q_index], time);

performRequest(options, time, interval, fileName, testThem);





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

    console.log("THEY ARE ALL EQUAL");

    return true;

  } else {

    console.log("THEY ARE NOT ALL EQUAL");

    return false;



  }
}

const moveThem = function(obj){

  delete obj['counter'];
  delete obj['totaltime'];

//  console.log("MOVE SOME FILES SOMWHERE");
  //console.log("THE OBJ "+util.inspect(obj, false, null));

  for(var key in obj){

        if(obj.hasOwnProperty(key) && obj[key] !== ''  ){

          var s = obj[key]

        //console.log("The value of S: "+s);

          var bits = s.split('/');
          var host = bits[7];
          var fileName = bits[8];


          fs.createReadStream(obj[key]).pipe(fs.createWriteStream('./server/fragments/non-equals/'+host+'_'+fileName));

        }
  }

}

const whatQ = function(tt){
  //console.log(tt);

  if(tt < 1.75 || tt > 2.25){ // only change if sub optimal

   if(tt < 1.75 && Q_index+1 < bitRates.length-1){
     console.log("jump up");
      Q_index++;
   } else if(tt > 2.25 && Q_index-1 >= 0) {
       console.log("jump down");
       Q_index--;
     }

   }

}

const testThem = function(obj){

  var now = new Date();

  var D = dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT");

  //console.log("test them"+obj);

  let sizes = [];

  for(var key in obj){

        if (!obj.hasOwnProperty(key)) continue;
        var frag = obj[key];
          if(typeof(frag) === 'string'){
            if(frag !== ''){
                let stats = fs.statSync(frag, function(){
                        sizes.push(stats.size);
                });
             } else {

               //console.log("TEST ERROR");
                var bits = obj.original.split('/');
                log('TEST: '+D+' - '+bits[bits.length-1]+' - test ERRORED');
                moveThem(obj);



             }
          }
       }
      let EQ = equivalence(obj, sizes);

      var bits = obj.original.split('/');
      var str = 'TEST: '+D+' - '+bits[bits.length-1];

      if(EQ === false){
          str+' - tested UNEQUAL';
          console.log(str);
          log(str);
          moveThem(obj);
      } else {
          str+' - tested EQUAL';
          console.log(str);
          log(str);
      }

    }

const downloadManifest = function(callback){
  request.get('http://skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301.isml/Manifest', function(err,res,body) {
    parseString(body, function (err, result) {

                let currentTimeCode = parseInt(result.SmoothStreamingMedia.StreamIndex[0].c[0].$.t);
                let offSetChunk = currentTimeCode+(20000000*chunkOffSet);
                timecodes.push(parseInt(offSetChunk));
                callback();
                downloadChunk(parseInt(offSetChunk), 'original');
          });

     });
   }

beginTest();
