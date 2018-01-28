import assert from 'assert';
import util from 'util';

import  FragmentPullComparison from './main';

describe("FragmentPullComparison", function(){

  it("Parses the stream string and returns an object", function(){
    let testPath = 'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301';
    let FPC = new FragmentPullComparison();
    assert.deepEqual(FPC.streamParse(testPath),{'host':'skysportsmainevent-go-hss.ak-cdn.skydvn.com', 'dir1':'z2skysportsmainevent', 'dir2':'1301','path':'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301'});
  })

  /*it("Removes a folder when suplied with a path", function() {
    let FPC = new FragmentPullComparison();
    let testPath = './logs';
    var func = function(){return 'removed';};
    assert.equals(FPC.deleteFolder(testPath, func), 'removed');
  })*/

  it("Is passed host, interval name and url and returns options for a request", function(){

    let FPC = new FragmentPullComparison();
    let host = 'sdjdskjhvx';
    assert.deepEqual(FPC.getOptions(host, 'original', 'jgfsdhfkdshbf'),{
      time: true,
      url: 'jgfsdhfkdshbf',
      method: 'GET',
      headers: {
          'Accept': 'application/json',
          'Accept-Charset': 'utf-8',
          'User-Agent': 'fragment-puller'
        }
      })


  })

  it('Is sent parts of a path to build and returns the first part of the url', function(){
        let FPC = new FragmentPullComparison();
        let testStreamObj = {'host':'skysportsmainevent-go-hss.ak-cdn.skydvn.com', 'dir1':'z2skysportsmainevent', 'dir2':'1301','path':'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301'};
        assert.deepEqual(FPC.buildBaseUrl(testStreamObj), 'http://skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301.isml');
      })

  it('Is sent parts of a path to build and returns the first part of the url', function(){
            let FPC = new FragmentPullComparison();
            let testStreamObj = {'host':'skysportsmainevent-go-hss.ak-cdn.skydvn.com', 'dir1':'z2skysportsmainevent', 'dir2':'1301','path':'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301'};
            assert.deepEqual(FPC.buildManifestUUrl(testStreamObj), 'http://skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301.isml/Manifest');
          })

it('sent the streamObj and builds framenent path', function(){
                    let FPC = new FragmentPullComparison();
                    let testStreamObj = {'host':'skysportsmainevent-go-hss.ak-cdn.skydvn.com', 'dir1':'z2skysportsmainevent', 'dir2':'1301','path':'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301'};
                    assert.deepEqual(FPC.buildChunkUrl('./fragments', 'original', 5, 5000000000), 'http://skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301.isml/QualityLevels('+q+')/Fragments(video='+t+')''; 



})
