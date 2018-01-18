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

let count = 0;

let returned = 0;

let originals = [];

var filesToTest = {};


var OLDTIME = '';





const beginTest = function(){

    console.log("begin the test");

    watchFolders();

     manifestInterval();
     createTimeoutForIntervalB();
}


const watchFolders = function(){
  var origCount = [];
  var ACount = [];
  var BCount = [];
  var CCount = [];

  fs.watch('./server/fragments/hostA', { recursive: false }, function(evt, name) {

      ACount.push(name);
      if(ACount.length > 10){

        fs.unlink('./server/fragments/hostA/'+ACount[0], function(){
              ACount.shift();
        });
      }
  });
  fs.watch('./server/fragments/hostB', { recursive: false }, function(evt, name) {
    BCount.push(name);

    if(BCount.length > 10){

      fs.unlink('./server/fragments/hostB/'+BCount[0], function(){
            BCount.shift();
      });


    }
  });
  fs.watch('./server/fragments/hostC', { recursive: false }, function(evt, name) {
    CCount.push(name);
    if(CCount.length > 10){

      fs.unlink('./server/fragments/hostC/'+CCount[0], function(){
             CCount.shift();
      });


    }
  });
  fs.watch('./server/fragments/hostD', { recursive: false }, function(evt, name) {
    DCount.push(name);
    if(DCount.length > 10){

      fs.unlink('./server/fragments/hostD/'+DCount[0], function(){
             DCount.shift();
      });


    }
  });

  fs.watch('./server/fragments/original', { recursive: false }, function(evt, name) {
    origCount.push(name);
    console.log("OG COUNT: "+origCount)
    console.log("LEN "+origCount.length)
    if(origCount.length > 20){

      fs.unlink('./server/fragments/original/'+origCount[0], function(){
        console.log("unlink");
             origCount.shift();
      });


    }
  });

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
<<<<<<< HEAD
          //  downloadChunk(timecodes[0], 'hostD');
=======
            downloadChunk(timecodes[0], 'hostD');
>>>>>>> b785978e346fed56f737afef977d657b8729b558


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

  var url = 'http://'+host+'/z2skysportsmainevent/1301.isml/QualityLevels(4864960)/Fragments(video='+time+')';

<<<<<<< HEAD
  //console.log("The URL: "+url);

  let options = {
=======
  console.log("The URL: "+url);

  const options = {
>>>>>>> b785978e346fed56f737afef977d657b8729b558
    url: url,
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
<<<<<<< HEAD
        'User-Agent': 'fragment-puller'
=======
        'User-Agent': 'my-reddit-client',
>>>>>>> b785978e346fed56f737afef977d657b8729b558

    }



};

<<<<<<< HEAD
if(interval !== 'original'){

  options.headers.Host =  'origin7.skysportsmainevent.hss.skydvn.com';
}

=======
>>>>>>> b785978e346fed56f737afef977d657b8729b558

var filename = './server/fragments/'+interval+'/chunk_'+time+'.mp4';

request(options, function(err, res, body){

}).pipe(fs.createWriteStream(filename)).on('close', function(){



  if(!filesToTest[time]){

<<<<<<< HEAD
       filesToTest[time] = {'original':'', 'hostA':'', 'hostB':'', 'hostC':'', 'counter':0}
=======
       filesToTest[time] = {'original':'', 'hostA':'', 'hostB':'', 'hostC':'', 'hostD':'','counter':0}
>>>>>>> b785978e346fed56f737afef977d657b8729b558

  }


  filesToTest[time][interval] = filename;


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

<<<<<<< HEAD
          if(arr[i] != arr[i+1]){
            return false;
          }
    }
    return true;
  }

  var EQ = allEqual(sizes);

=======


    for(var i = 0; i <arr.length-1; i++ ){

      console.log("Val of i "+arr[i]);
      console.log("Val of i+1 "+arr[i+1]);

          if(arr[i] != arr[i+1]){
            return false
          }

    }

    return true;
  }


  var EQ = allEqual(sizes);



>>>>>>> b785978e346fed56f737afef977d657b8729b558
  if(EQ === true) {
    /*fs.unlink(obj.original, function(err){
        console.log("del Orig");
        fs.unlink(obj.hostA, function(err){
            console.log("del A");

          fs.unlink(obj.hostB, function(err){
              console.log("del B");
            fs.unlink(obj.hostC, function(err){
                console.log("del C");

<<<<<<< HEAD
            })
=======
    console.log("All the same");
    fs.unlink(obj.original);
    fs.unlink(obj.hostA);
    fs.unlink(obj.hostB);
    fs.unlink(obj.hostC);
    fs.unlink(obj.hostD);
>>>>>>> b785978e346fed56f737afef977d657b8729b558

          })

        })

      })*/

    } else {
      moveThem(obj)
    }
  }

const moveThem = function(obj){

  delete obj['counter'];

  console.log("MOVE SOME FILES SOMWHERE");
  console.log("THE OBJ "+util.inspect(obj, false, null));

  for(var key in obj){

        if(obj.hasOwnProperty(key)){

          var s = obj[key]

          console.log("The value of S: "+s);

<<<<<<< HEAD
            var bits = s.split('/');
            var host = bits[3]
            var fileName = bits[4];
=======
      let statsO = fs.statSync(obj.original);
      sizes.origin_fileSizeInBytes = statsO.size;
>>>>>>> b785978e346fed56f737afef977d657b8729b558

            fs.rename(obj[key], './server/fragments/non-equals/'+host+'_'+fileName, function(){

              console.log("MOVE FILE");

            });


  }


<<<<<<< HEAD
=======
      equivalence(obj, sizes);
>>>>>>> b785978e346fed56f737afef977d657b8729b558

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
<<<<<<< HEAD
    parseString(body, function (err, result) {
          let currentTimeCode = result.SmoothStreamingMedia.StreamIndex[0].c[0].$.t;
            timecodes.push(parseInt(currentTimeCode));
                 downloadChunk(currentTimeCode, 'original');
            });
=======

        console.log("first request");

        parseString(body, function (err, result) {

          //  console.log("string parsed: "+result);

            let currentTimeCode = result.SmoothStreamingMedia.StreamIndex[0].c[0].$.t;

            //var offSet = 20000000*53;

            //timecodes.push(currentTimeCode+offSet);
            timecodes.push(parseInt(currentTimeCode));


            downloadChunk(currentTimeCode, 'original');

        });
>>>>>>> b785978e346fed56f737afef977d657b8729b558

     });
   }

beginTest();
