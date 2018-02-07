##Node JS tool for comparing the size of HSS fragments ##

###Follow these steps to run the Application###

prerequisites: Node version > 8, npm version 5 >

1. clone this repo

2. run 'npm install' to install the dependencies

3. Define the values in the ./config.json file (or leave )

* testIds - These are the ids of tests that can be run, 'RAM_VS_DISC' downloads the fragments from the disc and also from RAM, whilst the ALL_CHUNKS test downloads from disc, RAM and also the 4 different hosts for the front end (AI Cache)
* Q_Index - the bitrate in the quality (0-6).
* Bitrates - these tend to stay the same but can be tweaked here if necessary
* fragmentOffSet - the proximity to the live edge. The manifest includes the timestamp of a fragment that is 70 from 'live', a player will try and pull a chunk close to 'live' but a bit further back, we choose fragment 53
* fragmentLength - length of a fragment in milliseconds 200000
* mainIntervalLength - length between request for original and request for the alternative AI cache fragments
* offSetBufferLength - The number of fragments to keep if watching the folders and deleting
* schedule (OPTIONAL) - an array of JSON, each item contains a stream URL, startTme and endTime (epoch time), without this list the test just begins to run against stream passed to npm start
* mail - configuration for sending the logs to a list of recipients



3. Run 'npm start'

When the start command is run without commands it includes the following defaults which can be overridden:

* The stream is 'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301'
* The bitrate is assumed to be the top one (4864960). The bitrates are set to:
const bitRates = ["89984","280000", "619968", "1179968", "2014976", "3184960", "4864960"];
* In HSS the manifests include the timecode of the OLDEST fragment, the one that is about to be delated. Players typically jump forward to pull the newest fragment that the latency of the system can tolerate. In order to replicate player behavior we add an offset. Default value for this is 53 (as shown when looking at chunks pulled on ruku, now tv).

example: npm start http://origin8.skymoviesdisney.hss.skydvn.com/ss/30/z2skymoviesdisney/1838.isml/Manifest-30 45 3  

this command will set the stream, set the offset to 45 and the bitrate to 3 (1179968)

The ips of the different hosts to check are hardcoded as there is an assumption that these won't change:

const hosts = {
  'hostA':{
    'ip': '90.211.176.20'
  },'hostB':{
    'ip': '90.211.176.148'
  },'hostC':{
    'ip': '2.122.212.14'
  },'hostD':{
    'ip': '2.122.212.142'
  }
}
