import http from 'http';
import xml2js from 'xml2js';
import eyes from 'eyes';
//import http from 'http';
import fs from 'fs';
import express from 'express';

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
            downloadChunk(timecodes[0], 'hostD');


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

  console.log("The URL: "+url);

  const options = {
    url: url,
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
        'User-Agent': 'my-reddit-client',

    }

};


var filename = './server/fragments/'+interval+'/chunk_'+time+'.mp4';

request(options, function(err, res, body){

}).pipe(fs.createWriteStream(filename)).on('close', function(){



  if(!filesToTest[time]){

       filesToTest[time] = {'original':'', 'hostA':'', 'hostB':'', 'hostC':'', 'hostD':'','counter':0}

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
  //  }
  console.log(util.inspect(filesToTest, false, null));

});


}

const equivalence = function(obj, sizes){

  console.log("sizes: "+sizes)

  function allEqual(arr) {



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



  if(EQ === true) {

    console.log("All the same");
    fs.unlink(obj.original);
    fs.unlink(obj.hostA);
    fs.unlink(obj.hostB);
    fs.unlink(obj.hostC);
    fs.unlink(obj.hostD);

  } else {

    console.log("Not all the same");


  }

    count++;


}

const testThem = function(obj){

      //returned = 0;

      console.log("THE OBJ "+util.inspect(obj, false, null))

      let sizes = [];

      let statsO = fs.statSync(obj.original);
      sizes.origin_fileSizeInBytes = statsO.size;

      let statsA = fs.statSync(obj.hostA);
      console.log(statsA);
      sizes.push(statsA.size);

      let statsB = fs.statSync(obj.hostB);
      sizes.push(statsB.size);

      let statsC = fs.statSync(obj.hostC);
      sizes.push(statsC.size);

      //let statsD = fs.statSync(obj.hostD);
    //  sizes.hostD_fileSizeInBytes = statsD.size


      console.log(util.inspect(sizes, false, null))

      equivalence(obj, sizes);








}




const downloadManifest = function(intName){

  console.log("download manifest");

  request.get('http://skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301.isml/Manifest', function(err,res,body) {

        console.log("first request");

        parseString(body, function (err, result) {

          //  console.log("string parsed: "+result);

            let currentTimeCode = result.SmoothStreamingMedia.StreamIndex[0].c[0].$.t;

            //var offSet = 20000000*53;

            //timecodes.push(currentTimeCode+offSet);
            timecodes.push(parseInt(currentTimeCode));


            downloadChunk(currentTimeCode, 'original');

        });

     });


}

beginTest();
