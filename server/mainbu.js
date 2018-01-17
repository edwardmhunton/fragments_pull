import http from 'http';
import xml2js from 'xml2js';
import eyes from 'eyes';
//import http from 'http';
import fs from 'fs';
import express from 'express';

import util from 'util';

import Set from 'Set';

import request from 'request';

import {parseString} from 'xml2js';

const server = express();

import download from 'download-file';

let timecodes = [];

let count = 0;

let returned = 0;





let filesToTest = [];

const beginTest = function(){

console.log("begin the test");

 cInterval('intervalA', 'manifest');
 createTimeoutForIntervalB();



}

const createTimeoutForIntervalB = function(){

//  console.log("create interval B")

  setTimeout(function(){

      cInterval('intervalB', 'array');

  }, 10000)

}

const manifestInterval = function() {

    downloadManifest();

}

const pullChunks = function(time) {


  downloadChunk(time, 'hostA');
  downloadChunk(time, 'hostB');
  downloadChunk(time, 'hostC');

}


const cInterval = function(intervalName, type){




      setInterval(function(){

            if(type === 'manifest'){

            downloadManifest(intervalName);

          } else {



            timecodes.shift();

            downloadChunk(timecodes[0], 'hostA', count);
            downloadChunk(timecodes[0], 'hostB', count);
            downloadChunk(timecodes[0], 'hostC', count);
            //downloadChunk(timecodes[0], 'hostD');

          }
        }, 2000);

}

const downloadChunk = function(time, interval, localcount){

  console.log("downloadChunk")

  var host = "";

  switch(interval) {

    case 'original': host = 'skysportsmainevent-go-hss.ak-cdn.skydvn.com';
    case 'hostA': host = '90.211.176.20';
    case 'hostB': host = '90.211.176.148';
    case 'hostC': host = '2.122.212.14';
    case 'hostD': host = '2.122.212.142';

  }



//  var url = 'http://'+host+'/z2skysportsmainevent/1301.isml/QualityLevels(4864960)/Fragments(video='+time+')';

  var url = 'http://'+host+'/z2skysportsmainevent/1301.isml/QualityLevels(4864960)/Fragments(video='+time+')';

  console.log(url)

  const options = {
    url: url,
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
        'User-Agent': 'my-reddit-client',
        'Host': 'origin7.skysportsmainevent.hss.skydvn.com'

    }
};

var filename = './server/fragments/'+interval+'/chunk_'+time+'.mp4';

console.log(filename);




request(options, function(err, res, body){

  //console.log("grab file"+body);

}).pipe(fs.createWriteStream(filename)).on('close', function(){

//console.log("write");

    if(interval === 'original'){

      filesToTest.push({'original':filename})

    } else {

    //  console.log("the interval"+interval);

      returned++;


      filesToTest[localcount][interval] = filename;
      console.log(util.inspect(filesToTest, false, null))

    //  console.log(returned);

      if(returned === 4){

        testThem(filesToTest[localcount]);

      }
    }
  });

}

const equivalence = function(obj, sizes){

  console.log("sizes: "+sizes)

  function allEqual(arr) {

    !!arr.reduce(
      function(a, b){
        return (a === b) ? a : NaN;
      });
        /*for(var i in arr){

          if(i == arr[i+1]){
            return false
          }

        }

        return true;*/
}


  var EQ = allEqual(sizes);

  console.log(EQ);

  if(EQ) {

    console.log("All the same");
    //fs.unlink(obj.original);
    fs.unlink(obj.hostA);
    fs.unlink(obj.hostB);
    fs.unlink(obj.hostC);
    //fs.unlink(obj.hostD);

  } else {

    console.log("Not all the same");


  }

    count++;


}

const testThem = function(obj){

      returned = 0;

      //console.log(util.inspect(obj, false, null))

      let sizes = [];

    /*  let statsO = fs.statSync(obj.original);
      sizes.origin_fileSizeInBytes = statsO.size*/

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

            timecodes.push(currentTimeCode);

            console.log("currentTimeCode "+currentTimeCode)

            downloadChunk(currentTimeCode, 'original', count);

        });

     });


}

beginTest();
