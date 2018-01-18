//import express from 'express';

import curl from 'curlrequest';
import request from 'request';

import fs from 'fs';


import path from 'path';


let options = {
  manifest: 'http://skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301.isml/',
  chunk: 'QualityLevels(3184960)/Fragments(video=',

};

const manPath = '/manifest';

const loaclPathA = '/fragments/int_1/';
const loaclPathB = '/fragments/int_2/';

const stash = function (url, path, callback) {
  request({uri: url})
      .pipe(fs.createWriteStream(__dirname + path+'/test'))
      .on('close', function() {
        callback();
      });

    }


      const getChunk = function(){

        stash(options.manifest+'Manifest', manPath, done);

      }


var intervalA = setInterval(function(){

  stash(options.chunk+'Manifest', manPath, done)

}, 2000);



/*curl.request(options, function (err, parts) {
    parts = parts.split('\r\n');
    var data = parts.pop()
      , head = parts.pop();

      console.log(data);
});*/

/*function (url, path, callback) {
  request({uri: url})
      .pipe(fs.createWriteStream(path))
      .on('close', function() {
        callback();
      });*/


 



// Pshdo logic

// 1) grab the URL


// 2)

/*  grep.configure({
      buildArgs: function(args) {
        return ['-n', args, 'some.log']
      },
      execOptions:  {cwd: '/var/log'}
  });*/

/*  var warning = grep('[+} Warning');
  var errors  = grep('[!] Error');

  warning.pipe(warningFile);
  errors.pipe(errorFile);*/

/*  var options = {};
  var bar = grep(['-m', '1', 't=', __dirname+'/manifest/manifest.txt'], options);
  bar.pipe(process.stdout); */


grep('t=', __dirname+'/manifest/manifest.txt', function(list){
console.log(util.inspect(list, false, null));
});




}

/*  grep(['-o','t=', __dirname+'/manifest/manifest.txt'], function(err, stdout, stderr) {
if (err || stderr) {
console.log(err, stderr);
} else {
console.log(stdout);
}
});

}*/
