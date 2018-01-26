import assert from 'assert';
import util from 'util';

import {someFunc, streamParse, deleteFolder} from './main';

describe("FragmentPullComparison", function(){

  it("Parses the stream string and returns an object", function(){
    let testPath = 'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301';

    assert.deepEqual(streamParse(testPath),{'host':'skysportsmainevent-go-hss.ak-cdn.skydvn.com', 'dir1':'z2skysportsmainevent', 'dir2':'1301','path':'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301'});



  }),

  /*it("Removes a folder when suplied with a path", function() {

console.log(deleteFolder);

    let testPath = './test';

    var func = function(){return 'removed';};

    assert.equal(deleteFolder(testPath, func), 'removed');



  })*/



})
