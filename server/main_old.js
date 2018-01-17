import curl from 'curlrequest';
import request from 'request';
import fs from 'fs';
import path from 'path';
import grep from 'simple-grep';
import util from 'util';

const express = require('express');

const server = express();

import libxmljs from 'libxmljs';
//import ngrep from 'ngrep';

var warningFile = fs.createWriteStream('./warnings.txt');
var errorFile   = fs.createWriteStream('./errors.txt');

// step 1 - curl the manifest

const options = {"url": "http://skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301.isml/Manifest"}


const manPath = '/manifest';


  /*grep(' t=', __dirname+'/manifest/manifest.txt', function(list){
  console.log(list);
});*/

var makeXML = function(){
  console.log("make");
  server.get ('/manifest', (req, res) => {
    let readStream = fs.createReadStream(__dirname + '/manifest.txt')

    // When the stream is done being read, end the response
    readStream.on('close', () => {
        res.end()
    })

    // Stream chunks to response
    readStream.pipe(res)
    console.log("res  "+res)
});
}



/*var makeXML = function(){

var xml = fs.createReadStream(__dirname+'/manifest/manifest.txt');

console.log(xml);

//var xmlDoc = libxmljs.parseXml(xml);


}*/



const stash = function (url, path, callback) {
  request({uri: url})
      .pipe(fs.createWriteStream(__dirname + path+'/manifest.txt'))
      .on('close', function() {
        callback();
      });

    }

  const getManifest = stash(options.url, manPath, makeXML);




// step 2 - grep 't='




//step 3 - request the fragments
