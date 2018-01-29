import assert from 'assert';
import util from 'util';

import  FragmentPullComparison from './main';

describe("FragmentPullComparison", function(){

  it("Parses the stream string and returns an object", function(){
    let testPath = 'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301';
    let FPC = new FragmentPullComparison();
    assert.deepEqual(FPC.streamParse(testPath),{'host':'skysportsmainevent-go-hss.ak-cdn.skydvn.com', 'dir1':'z2skysportsmainevent', 'dir2':'1301','path':'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301'});
  })

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
              let manifestString = 'http://skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301.isml/QualityLevels(3184960)/Fragments(video=5000000000)';
              assert.deepEqual(FPC.buildChunkUrl(testStreamObj, 3184960, 5000000000), manifestString);
      })

      it('sent info to build up a file name for the fs pipe', function(){
              let FPC = new FragmentPullComparison();



              let fileString = './fragments/original/chunk_3184960_5000000000.mp4';
              assert.deepEqual(FPC.buildFileName('./fragments/', 'original', '3184960', '5000000000'), fileString);
      })

      //equivalence

      it('proves the equality of file sizes', function(){
              let FPC = new FragmentPullComparison();

              let testObj = { original:
   { ip: '',
     chunkPath: './fragments/original/chunk_4864960_156012095865333.mp4' },
  hostA:
   { ip: '90.211.176.20',
     chunkPath: './fragments/hostA/chunk_4864960_156011495865333.mp4' },
  hostB:
   { ip: '90.211.176.148',
     chunkPath: './fragments/hostB/chunk_4864960_156011495865333.mp4' },
  hostC:
   { ip: '2.122.212.14',
     chunkPath: './fragments/hostC/chunk_4864960_156011495865333.mp4' },
  hostD:
   { ip: '2.122.212.142',
     chunkPath: './fragments/hostD/chunk_4864960_156011495865333.mp4' },
  counter: 4 }

     let sizes = [10000, 10000, 10000,10000 ];

     assert.deepEqual(FPC.equivalence(testObj,sizes), true);


      })

      it('proves the non-equality of file sizes', function(){
              let FPC = new FragmentPullComparison();

              let testObj = { original:
   { ip: '',
     chunkPath: './fragments/original/chunk_4864960_156012095865333.mp4' },
  hostA:
   { ip: '90.211.176.20',
     chunkPath: './fragments/hostA/chunk_4864960_156011495865333.mp4' },
  hostB:
   { ip: '90.211.176.148',
     chunkPath: './fragments/hostB/chunk_4864960_156011495865333.mp4' },
  hostC:
   { ip: '2.122.212.14',
     chunkPath: './fragments/hostC/chunk_4864960_156011495865333.mp4' },
  hostD:
   { ip: '2.122.212.142',
     chunkPath: './fragments/hostD/chunk_4864960_156011495865333.mp4' },
  counter: 4 }

     let sizes = [10000, 10000, 100000,10000 ];

     assert.deepEqual(FPC.equivalence(testObj,sizes), false);


      })


})





    //it('sent the streamObj and builds framenent path', function(){
            //let FPC = new FragmentPullComparison();
            //let testStreamObj = {'host':'skysportsmainevent-go-hss.ak-cdn.skydvn.com', 'dir1':'z2skysportsmainevent', 'dir2':'1301','path':'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301'};
            //let manifestString = 'http://skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301.isml/QualityLevels('+q+')/Fragments(video='+t+')';
            //console.log(manifestString);
            //assert.deepEqual(FPC.buildChunkUrl('./fragments', 'original', 5, 5000000000), 'http://skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301.isml/QualityLevels('+q+')/Fragments(video='+t+')');

  //  })*/
