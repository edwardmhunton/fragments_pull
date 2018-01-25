steps to run

prerequisites: Node version > 8, new npm

1) clone this repo

2) run 'npm install'

3) run 'npm start'

When the start command is run without commands it includes the following defaults which can be overridden:

i) The stream is 'skysportsmainevent-go-hss.ak-cdn.skydvn.com/z2skysportsmainevent/1301'
ii) The bitrate is assumed to be the top one (4864960). The bitrates are set to:
const bitRates = ["89984","280000", "619968", "1179968", "2014976", "3184960", "4864960"];
iii) In HSS the manifests include the timecode of the OLDEST fragment, the one that is about to be delated. Players typically jump forward to pull the newest fragment that the latency of the system can tolerate. In order to replicate player behavior we add an offset. Default value for this is 53 (as shown when looking at chunks pulled on ruku, now tv).

example: npm start http://origin8.skymoviesdisney.hss.skydvn.com/ss/30/z2skymoviesdisney/1838.isml/Manifest-30 45 3  -- this command will set the stream, set the offset to 45 and the bitrate to 3 (1179968)

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
