import http from 'http';
import xml2js from 'xml2js';
import eyes from 'eyes';
//import http from 'http';
import fs from 'fs';
import express from 'express';

import watch from 'node-watch';

import chokidar from 'chokidar';

import _ from 'lodash';

import util from 'util';

import Set from 'Set';

import request from 'request';

import {parseString} from 'xml2js';

const server = express();

import download from 'download-file';

import path from 'path';



let timecodes = [];

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
    callback(fragpath+dir, dir);
  });
}


}


const beginTest = function(){

    console.log("begin the test");

    createFolders(fragpath, folderNames, watchFolder)
    manifestInterval();
    createTimeoutForIntervalB();
}


const watchFolder = function(path, name, array){

  array.push(name);

  const testNum = function(){
    if(array.length > 10){

      fs.unlink(path+'/'+array[0], function(){
            array.shift();
      });
    }
  }

var watch =  chokidar.watch(path, {ignored: /[\/\\]\./, persistent: true}).on('change', function(name) {

        testNum();


  })

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

            timecodes.shift();

          /*  folderNames.map((folder, i, folderNames) => {
              //console.log("D chunk: "+folder)
                downloadChunk(timecodes[0], folder);
            });*/

          /*  for(var i in folderNames){
                downloadChunk(timecodes[0], folderNames[i]);
            }*/

             downloadChunk(timecodes[0], 'hostA');
           downloadChunk(timecodes[0], 'hostB');
            downloadChunk(timecodes[0], 'hostC');
            downloadChunk(timecodes[0], 'hostD');


          }
        }, 2000);

}

const downloadChunk = function(time, interval){

//  console.log("Int in dl "+interval);



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

  var url = 'http://'+host+'/z2skysportsmainevent/1301.isml/QualityLevels(4864960)/Fragments(video='+time+')';

  //console.log("The URL: "+url);

  let options = {
    url: url,
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
        'User-Agent': 'fragment-puller'

    },
    folder: interval



};

if(interval !== 'original'){
  options.headers.Host =  'origin7.skysportsmainevent.hss.skydvn.com';
}


var filename = './server/fragments/'+interval+'/chunk_'+time+'.mp4';

request(options, function(err, res, body){

  if(!filesToTest[time]){

    filesToTest[time] = {'original':'', 'hostA':'', 'hostB':'', 'hostC':'', 'counter':0}

  }

  filesToTest[time][interval] = filename;


}).pipe(fs.createWriteStream(filename)).on('close', function(){

//  console.log("THE options OBJ "+util.inspect(options, false, null));

//  console.log("Int in after write "+interval);


  //if(!filesToTest[time]){

  //  filesToTest[time] = {'original':'', 'hostA':'', 'hostB':'', 'hostC':'', 'counter':0}

    /*filesToTest[time]={};
    folderNames.map((folder, i, folderNames) => {

      filesToTest[time][folder] = '';
    });
    filesToTest[time].couter = 0;*/
//  } //else {
  //  filesToTest[time][interval] = filename;
//  }

//filesToTest[time][interval] = filename;

//console.log("The int name: "+options.folder);



  console.log("THE OBJs "+interval+"    "+util.inspect(filesToTest, false, null));

  if(interval !== 'original'){
  if(filesToTest[time].counter < 3){

     filesToTest[time].counter++;

     if(filesToTest[time].counter === 3 && filesToTest[time].original){
         testThem(filesToTest[time]);
     }


   }

  }

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

const testThem = function(obj){


     console.log("TEST THE OBJ "+util.inspect(obj, false, null));

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
          let currentTimeCode = result.SmoothStreamingMedia.StreamIndex[0].c[0].$.t;
            timecodes.push(parseInt(currentTimeCode));
                 downloadChunk(currentTimeCode, 'original');
            });

     });
   }

beginTest();
