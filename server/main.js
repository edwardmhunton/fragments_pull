import http from 'http';
import xml2js from 'xml2js';
import eyes from 'eyes';
//import http from 'http';
import fs from 'fs';
import express from 'express';

import watch from 'node-watch';

import util from 'util';

import request from 'request';

import {parseString} from 'xml2js';

import path from 'path';

import chokidar from 'chokidar';



let timecodes = [];

var bitRates = ["89984","280000", "619968", "1179968", "2014976", "3184960", "4864960"];

var Q_index = 6;

var filesToTest = {};

var fragpath = path.join(__dirname + '/fragments/');

var folderNames = ['hostA','hostB','hostC','hostD', 'original','non-equals'];

var chunkOffSet = 53; // from oldest chunk to live

var intervalB;




const createFolders = function(fragpath, folderNames, callback){

  if(!fs.existsSync(fragpath)){
    fs.mkdir(fragpath, function(){
      folderNames.map((dir, i, folderNames) => {
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
    if(name === 'original' && array.length >= 40){
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

const beginTest = function(){
  createFolders(fragpath, folderNames, watchFolder);
  manifestInterval(createTimeoutForIntervalB);
}

const createTimeoutForIntervalB = function(){
  if(!intervalB){
    console.log("int B created");
      intervalB = setTimeout(function(){
        chunkCheckInterval();
      }, 60000); // one minute later pull the fragments from the 4 hosts
  }
}

const manifestInterval = function(callback) {
  setInterval(function(){
    downloadManifest(callback);
  }, 2000);
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

const whichHost = function(int) {
  var host = "";

  switch(int) {

    case 'original':
       return 'skysportsmainevent-go-hss.ak-cdn.skydvn.com';
      break;
    case 'hostA':
      return '90.211.176.20';
      break;
    case 'hostB':
      return '90.211.176.148';
      break;
    case 'hostC':
      return '2.122.212.14';
      break;
    case 'hostD':
      return '2.122.212.142';
      break;

  }
}

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

const requestCallback = function(time, callback){
  if(filesToTest[time] !== undefined){
       if(filesToTest[time].counter === 4 && filesToTest[time].original){
           callback(filesToTest[time]);
           delete filesToTest[time]
       }
 }
}

const performRequest = function(options, time, interval, filename, callback, callback2) {
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
      }}).pipe(fs.createWriteStream(filename)).on('close', function(){
        callback(time, callback2)
      });

}

const downloadChunk = function(time, interval){


let host = whichHost(interval);
let url = buildUrl(host, bitRates[Q_index], time);
let options = getOptions(interval, url);
let fileName = buildFileName(fragpath, interval, bitRates[Q_index], time);

performRequest(options, time, interval, fileName, requestCallback, testThem);





}

const equivalence = function(obj, sizes){

  function allEqual(arr) {
    for(var i = 0; i <arr.length-1; i++ ){

          if(arr[i] != arr[i+1]){
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

   return false;

      console.log("THEY ARE NOT ALL EQUAL");

    }
  }

const moveThem = function(obj){

  delete obj['counter'];
  delete obj['totaltime'];

  console.log("MOVE SOME FILES SOMWHERE");
  console.log("THE OBJ "+util.inspect(obj, false, null));

  for(var key in obj){

        if(obj.hasOwnProperty(key)){

          var s = obj[key]

          console.log("The value of S: "+s);

            var bits = s.split('/');
            var host = bits[7];
            var fileName = bits[8];

            fs.createReadStream(obj[key]).pipe(fs.createWriteStream('./server/fragments/non-equals/'+host+'_'+fileName));

            //fs.rename(obj[key], './server/fragments/non-equals/'+host+'_'+fileName, function(){

            //  console.log("MOVE FILE");

            //});


  }



  }

}

const whatQ = function(tt){
  console.log(tt);

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

  //console.log("THE OBJ sent to test "+util.inspect(obj, false, null));


     let sizes = [];

    // whatQ(obj.totaltime);


      for(var key in obj){

        if (!obj.hasOwnProperty(key)) continue;
        var frag = obj[key];
          if(typeof(frag) === 'string'){
            if(frag !== ''){
                let stats = fs.statSync(frag, function(){
                        sizes.push(stats.size);
                });
             } else {

               console.log("TEST ERROR");
               moveThem(obj)

             }
          }
       }
      let EQ = equivalence(obj, sizes);
      if(EQ === false){
         moveThem(obj)
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
