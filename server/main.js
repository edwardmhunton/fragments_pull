import http from 'http';
import xml2js from 'xml2js';
import eyes from 'eyes';
//import http from 'http';
import fs from 'fs';
import express from 'express';

import watch from 'node-watch';

import _ from 'lodash';

import util from 'util';

import Set from 'Set';

import request from 'request';

import {parseString} from 'xml2js';

const server = express();

import download from 'download-file';

let timecodes = [];

import path from 'path';

import chokidar from 'chokidar';

var bitRates = ["89984","280000", "619968", "1179968", "2014976", "3184960", "4864960"];

var Q_index = 0

var filesToTest = {};

var fragpath = path.join(__dirname + '/fragments/');

var folderNames = ['hostA','hostB','hostC','hostD', 'original'];

var watchers = [];




const createFolders = function(fragpath, folderNames, callback){

console.log(fragpath);

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
    if(array.length > 20){

      fs.unlink(array[0], function(){
            array.shift();
      });
    }
  }

var watch =  chokidar.watch(path, {ignored: /[\/\\]\./, persistent: true}).on('change', function(name) {

        array.push(name);
        testNum();
      })

}

const beginTest = function(){

    console.log("begin the test");

    createFolders(fragpath, folderNames, watchFolder);

     manifestInterval();
     createTimeoutForIntervalB();
}

const createTimeoutForIntervalB = function(){

//  console.log("create interval B")

  setTimeout(function(){

      cInterval('intervalB', 'array');

  }, 10000)

}

const manifestInterval = function() {

  setInterval(function(){

    downloadManifest();

  }, 2000);

}

const cInterval = function(intervalName, type){

  setInterval(function(){

            if(type === 'manifest'){

            downloadManifest(intervalName);

          } else {

          //  console.log("TIMECODES"+timecodes);



            timecodes.shift();

            downloadChunk(timecodes[0], 'hostA');
            downloadChunk(timecodes[0], 'hostB');
            downloadChunk(timecodes[0], 'hostC');
          //  downloadChunk(timecodes[0], 'hostD');


          }
        }, 2000);

}

const downloadChunk = function(time, interval){



  var host = "";

  switch(interval) {

    case 'original':
      host = 'skysportsmainevent-go-hss.ak-cdn.skydvn.com';
      break;
    case 'hostA':
      host = '90.211.176.20';
      break;
    case 'hostB':
      host = '90.211.176.148';
      break;
    case 'hostC':
      host = '2.122.212.14';
      break;
    case 'hostD':
      host = '2.122.212.142';
      break;

  }

  var url = 'http://'+host+'/z2skysportsmainevent/1301.isml/QualityLevels('+bitRates[Q_index]+'])/Fragments(video='+time+')';

  console.log(bitRates[Q_index]);
  console.log(Q_index);

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


var filename = './server/fragments/'+interval+'/chunk_'+time+'.mp4';

request(options, function(err, res, body){


  if(!filesToTest[time]){

       filesToTest[time] = {'original':'', 'hostA':'', 'hostB':'', 'hostC':'', 'counter':0, 'totaltime':0}

  }


  filesToTest[time][interval] = filename;

  filesToTest[time].totaltime+=(res.timings.end - res.timings.response); // the total of all request for a segment need to happen inside 2seconds
  //console.log(res.timings.end - res.timings.response);


  if(interval !== 'original'){
  if(filesToTest[time].counter < 3){

     filesToTest[time].counter++;

   }

 }




}).pipe(fs.createWriteStream(filename)).on('close', function(){



  //console.log("TEST THE OBJ "+util.inspect(filesToTest, false, null));






     if(filesToTest[time].counter === 3 && filesToTest[time].original){
         testThem(filesToTest[time]);
         delete filesToTest[time] 
     }




  //}

});


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

    } else {
      moveThem(obj)
    }
  }

const moveThem = function(obj){

  delete obj['counter'];

  console.log("MOVE SOME FILES SOMWHERE");
  //console.log("THE OBJ "+util.inspect(obj, false, null));

  for(var key in obj){

        if(obj.hasOwnProperty(key)){

          var s = obj[key]

          //console.log("The value of S: "+s);

            var bits = s.split('/');
            var host = bits[3]
            var fileName = bits[4];

            fs.rename(obj[key], './server/fragments/non-equals/'+host+'_'+fileName, function(){

            //  console.log("MOVE FILE");

            });


  }



  }

}

const whatQ = function(tt){
  console.log(tt);

  if(tt < 2 && Q_index+1 < bitRates.length-1){
    Q_index++;
  } else if(Q_index-1 >= 0) {
    Q_index--;
  }

}

const testThem = function(obj){

     let sizes = [];
     whatQ(obj.totaltime);


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
       equivalence(obj, sizes);

    }

const downloadManifest = function(intName){
  request.get('http://skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301.isml/Manifest', function(err,res,body) {
    parseString(body, function (err, result) {
    //  console.log("MANIFEST "+util.inspect(result, false, null));

          let currentTimeCode = result.SmoothStreamingMedia.StreamIndex[0].c[0].$.t;
            timecodes.push(parseInt(currentTimeCode));
                 downloadChunk(currentTimeCode, 'original');
            });

     });
   }

beginTest();
