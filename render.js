const { desktopCapturer, remote, app } = require('electron');
const ElectronGoogleOAuth2 = require('@getstation/electron-google-oauth2').default;
var request = require('request');
const axios = require("axios"); 
const { writeFile } = require('fs');
const sql = require('mssql');
const {google} = require('googleapis');

google.options({adapter: require('axios/lib/adapters/http')});
const fs = require('fs');
let ep = "https://ie.kcss.in/api/";
let curUserID=0;
let curProjectID=0;
let curClientId=0;
let curTaskID=0;
let curSubTaskID=0;
let userProjects = [];
let userClients= [];
let userClientsD = {};
let curActivity=new Date().getTime();
let curActivityId = "";
let performanceData = 100;
let avgPerformance = 100;
let ppp=0;
let userData = {};
let curProject = {};
let daysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
let daysSort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const config = {
    user: 'SSM',
    password: 'SSM@12345',
    server: '198.71.225.146',
    database: 'ScreenShotMonitor',
}
let iioauth2Client;

let sstime=600000;
let apause=5;

async function qry(q){
  let result1 = {};
    try {
        let pool = await sql.connect(config)
        result1 = await pool.request()
            .query(q)
    } catch (err) {}
    return result1;
}

async function qryIns(q, a=new Date(), b=new Date()){
  let result1 = {};
    try {
        let pool = await sql.connect(config)
        result1 = await pool.request()
        .input('p1', sql.DateTime, a)
        .input('p2', sql.DateTime, b)
            .query(q)
            
    } catch (err) { }
    return result1;
}

const { dialog, Menu } = remote;
let lastCaptured = "";
let gggc=1;
let timmer = 0;
let intVaal = 0;
let intCapt = 0;

const gDetails = {
  id: '121350216032-gkma8l391sdb2ia9aqd99it2thdsherb.apps.googleusercontent.com',
  sd: 'GhCC0Ncgnm-vxq1FffzeVk0s',
  scope: ['https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile', 
  'https://www.googleapis.com/auth/drive'],
  cb: 'http://127.0.0.1:42813/callback'
}
let ctoken = {};
let reqToken="";
reqHeaders = {
  Authorization: 'Bearer '
}

const oAuth2Client1 = new google.auth.OAuth2({
  clientId: gDetails.id
});

const googleDrive = google.drive({
  version: 'v3',
  auth: oAuth2Client1
});

let mediaRecorder; 
const recordedChunks = [];

var options = {
  method: 'GET',
  json: true,
  url: 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
  headers: {
    'Authorization':'Bearer xxxx'
  }
};

function callProjects(q){
axios.post(ep+"kcs/list/smproject", q, { headers:reqHeaders}).then((resP) => {
  userProjects=resP.data;
  renderProjects();
});
}

async function selectProject(idx){
  curProject = userProjects[idx];
  curProjectID = userProjects[idx]["_id"];
  curClientId = userProjects[idx]["client"];
  axios.post(ep+"kcs/list/smtasks", {project: curProjectID, status:"active"}, { headers:reqHeaders}).then((resP) => {
    
  let hc = "";
  for(let i=0; i<resP.data.length; i++){
    if(i==0){
      hc = hc + "<option value='"+resP.data[i]["_id"]+"' selected>"+resP.data[i]["name"]+"</option>";
    }else{
      hc = hc + "<option value='"+resP.data[i]["_id"]+"' >"+resP.data[i]["name"]+"</option>";
    }
  }
  if(resP.data.length==0){
    hc = hc + "<option value='0' selected>No Tasks!</option>";
  }
  document.getElementById("selectTask").innerHTML = hc;
  
  const tm = secondsToHms( curProject.consumetime, "h:mm");
  document.getElementById("hProjectName").innerHTML = curProject.name;
  document.getElementById("hClientName").innerHTML =  userClientsD[curProject.client]["name"];
  document.getElementById("hProjectDesc").innerHTML = curProject.description;
  document.getElementById("hDayOfWeek").innerHTML = daysSort[new Date().getDay()];
  document.getElementById("hConsumeTime").innerHTML = tm + " hrs";
  document.getElementById("hOutOfTime").innerHTML = tm + " of " + curProject.hours + " hrs";
  document.getElementById('timId').innerHTML = secondsToHms(curProject.consumetime);

  });
}

async function searchProjects(t){
  if(t.value==""){
    refreshProjects();
  }
  if(t.value.length<3)
      return;
  callProjects({ "employees": curUserID, status: "active", "name": { $regex: '.*' + t.value + '.*' }});
}

async function refreshProjects(){
  document.getElementById("searchbox").value = "";
  callProjects({ "employees": curUserID, status: "active"});
}

function renderProjects(){
  let hc = "<div class=\"col\">";
  if(userProjects.length == 0)
      hc = hc + "<h1 style='text-align: center;'>No project found!</h1>";


  for(let i=0; i<userProjects.length; i++){
    const p = userProjects[i];
    p["consumetime"] = p.consumetime>0?p.consumetime:0;
    hc = hc + "<div class=\"row\">";
    hc = hc + "<div onclick=\"selectProject("+i+");document.getElementById('task-details').style='display: block;';document.getElementById('main-details').style='display: none;';\" class=\"col-7\" style=\"text-align: left; cursor: pointer;\">";
    hc = hc + "<h5 style=\"color: green; margin-bottom: 0px;\">"+p.name+"</h5>";
    hc = hc + "<span style=\"font-size: 12px;\">"+userClientsD[p.client]["name"]+", "+p.description+"</span>";
    hc = hc + "</div>";
    hc = hc + "<div class=\"col-5\" style=\"text-align: right;\">";
    hc = hc + "<h5 style=\"margin-bottom: 0px;\">"+secondsToHms(p.consumetime)+"</h5>";
    hc = hc + "<div class=\"progress\" style=\"height: 5px; margin-top:5px;\">";
    hc = hc + "<div class=\"progress-bar\" role=\"progressbar\" style=\"width: "+(p.consumetime*100/(p.hours*3600))+"%; background-color: green;\" aria-valuenow=\""+(p.consumetime*100/(p.hours*3600))+"\" aria-valuemin=\"0\" aria-valuemax=\"100\"></div>";
    hc = hc + "</div>";
    hc = hc + "<span style=\"font-size: 12px;\">of "+p.hours+"hr</span>";
    hc = hc + "</div>";
    hc = hc + "<div class=\"col\" >";
    hc = hc + "<hr />";
    hc = hc + "</div>";
    hc = hc + "</div>";
  }
  hc = hc + "</div>";
  document.getElementById("allprojectsv").innerHTML = hc;
}

async function callback(error, response, body) {
  if (!error && response.statusCode == 200) {
    userData["gmail"]=body;
    axios.post(ep+"glogin", {password:ctoken.access_token}).then((res) => { 
      if(res && res.data && res.data.token){
        reqToken=res.data.token;
        reqHeaders["Authorization"] = 'Bearer '+res.data.token ;
        userData["server"]=res.data.server;
        curUserID=res.data.server._id;
        
        axios.post(ep+"kcs/list/smemployees", {uid:curUserID}).then((resEE) => { 
          if(resEE && resEE.data && resEE.data.length>0){
            userData["settings"] = resEE.data[0];
            apause=resEE.data[0]["autopause"];
            sstime=resEE.data[0]["imagerate"]*60000;
          }
        });
        axios.post(ep+"kcs/list/smclient", {}, { headers:reqHeaders}).then((resC) => {
          userClients=resC.data;
          for(let m=0;m<resC.data.length;m++){
            userClientsD[resC.data[m]["_id"]] = resC.data[m];
          }
          callProjects({ "employees": curUserID, status: "active"});
          document.getElementById("login-details").style = "display:none";
          document.getElementById("main-details").style = "display: block; margin: 15px;margin-top: 0px;";
          document.getElementById("footer").style = "display: block";
          document.getElementById("user-name").innerHTML = body.name;
      });
      }
    }); 
  }
  else{
    document.getElementById("errorL").innerHTML="You are not registered, Please contact Admin."
  }
}

const btn = document.querySelector('span#start-auth');
  btn.addEventListener('click', () => {
    document.getElementById("errorL").innerHTML="";
    btn.setAttribute('disabled', true);
    iioauth2Client = new ElectronGoogleOAuth2(gDetails.id, gDetails.sd, gDetails.scope,{
        successRedirectURL: 'http://kcss.in',
        loopbackInterfaceRedirectionPort: 42813,
        refocusAfterSuccess: true,
      });

      iioauth2Client.openAuthWindowAndGetTokens()
        .then(async (token) => {
            ctoken=token;
            oAuth2Client1.setCredentials(token);
            options.method= 'GET';
            options.url= 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json';
            options.headers= {
              'Authorization':'Bearer ' + token.access_token
            }
            request(options, callback);
        });
  });
  
const videoElement = document.querySelector('video');

const startBtn = document.getElementById('startBtn');
startBtn.onclick = e => {
  mediaRecorder.start();
  startBtn.classList.add('is-danger');
  startBtn.innerText = 'Recording';
};

const stopBtn = document.getElementById('stopBtn');

stopBtn.onclick = e => {
  mediaRecorder.stop();
  startBtn.classList.remove('is-danger');
  startBtn.innerText = 'Start';
};

async function doScreens(){
  const inputSources = await desktopCapturer.getSources({
    types: ['screen', 'window'], thumbnailSize : {width: 1024, height: 768 }
  });
}

async function doCapture(d){
  const photos = [];
  const inputSources = await desktopCapturer.getSources({
    types: ['screen'], thumbnailSize : {width: 1024, height: 768 }
  });

  const inputSourcesWin = await desktopCapturer.getSources({
    types: ['window'], thumbnailSize : {width: 1024, height: 768 }
  });
  let title="None";
  if(inputSourcesWin && inputSourcesWin.length>0){
    title = inputSourcesWin[0]["name"];
  }

  for(let i=0; i<inputSources.length; i++){
    const fileName = makeid(10)+"-"+new Date().getTime()+".png";
    const filePath = "./images/captured/"+fileName;
    const ffile = new File([inputSources[i].thumbnail.toPNG()], "foo.png", {
      type: "image/png",
    });
    var formData = new FormData();
      formData.append("file", ffile);
    const newHed={'Content-Type':'multipart/form-data'};
    axios.post(ep+"uploadile", formData, { headers:newHed}).then((resP) => {
      if(d){
        const actData = {file:resP.data, employee:curUserID, project:curProjectID, task:curTaskID, image:resP.data.filename, activityat:new Date(), activity:curActivity, activityid: curActivityId, performanceData:performanceData, title:title};
        axios.post(ep+"kcs/smactivityimage", actData, { headers:reqHeaders}).then((resPK) => {
        });
        const actDataAct = {endTime:new Date(), consumetime:parseInt(curProject.consumetimeCur), performanceData:avgPerformance};
        axios.put(ep+"kcs/smactivity/"+curActivityId, actDataAct, { headers:reqHeaders}).then((resPK) => {
          performanceData = 100;
          avgPerformance = 100;
        });
      }
    });
    writeFile(filePath, inputSources[i].thumbnail.toPNG(), () => {});
    const img = {dataURL:inputSources[i].thumbnail.toDataURL(), path: filePath};
    photos.push(img);
  }
  return photos;
}

async function setLastImage(d){
  const p  = await doCapture(d);
  if(p && p.length>0){
    lastCaptured = p[0]["dataURL"];
    document.getElementById('lastImage').src = lastCaptured;
  }
  if(d){
    new Notification('Screenshot Captured', {
      body: 'Your screenshot captured sucessfully;'
    });
  }
}

async function handleCapture(t){
  curTaskID=document.getElementById("selectTask").value;
  if(t.checked){
    curActivity=makeid(10)+"-"+new Date().getTime();
    createFiles(iioauth2Client.oauth2Client);
    setLastImage(false);
    runTimmer(true, 0);
    runCapture(true);
    curProject["consumetimeCur"] = 0;
    curProject["startD"] = new Date();
    const actData = {client:curClientId, employee:curUserID, project:curProjectID, task:curTaskID, starttime:new Date(), endTime:new Date(), activityat:new Date(), activity:curActivity, performanceData:100};
    axios.post(ep+"kcs/smactivity", actData, { headers:reqHeaders}).then((resPK) => {
      curActivityId = resPK.data._id;
    });
    
new Notification('Start Monitoring', { body: 'Your '+
'screenshot monitoring is started sucessfully;' });

  }else{
    setLastImage(true);
    runTimmer(false, curProject.consumetime);
    runCapture(false);
    curProject["stopD"] = new Date();
    curProject.consumetime =  parseInt(curProject.consumetimeCur) +  parseInt(curProject.consumetime);
  const tm = secondsToHms( parseInt(curProject.consumetime) , "h:mm");
  document.getElementById("hConsumeTime").innerHTML = tm + " hrs";
  document.getElementById("hOutOfTime").innerHTML = tm + " of " + curProject.hours + " hrs";
  
  const actData = {endTime:new Date(), consumetime:parseInt(curProject.consumetimeCur), performanceData:avgPerformance};
  axios.put(ep+"kcs/smactivity/"+curActivityId, actData, { headers:reqHeaders}).then((resPK) => {});
  axios.put(ep+"kcs/smproject/"+curProjectID, {consumetime: curProject.consumetime}, { headers:reqHeaders}).then((resPK) => {});
  new Notification('Stop Monitoring', { body: 'Your screenshot monitoring is started sucessfully;' });
  }
}

function runTimmer(t, s){
  if(t){
    intVaal = setInterval(()=>{
      s++;
      curProject.consumetimeCur = curProject.consumetimeCur + 1;
      document.getElementById('timId').innerHTML = secondsToHms(s);
    }, 1000);
  }else{
    clearInterval(intVaal);
  }
}

function runCapture(t){
  if(t){
    intCapt = setInterval(()=>{
      setLastImage(true);
    }, sstime);
  }else{
    clearInterval(intCapt);
  }
}

async function handleCapture1(t){
  if(t.checked){
    const inputSources = await desktopCapturer.getSources({
      types: ['screen'], thumbnailSize : {width: 1024, height: 768 }
    });
    await selectSource(inputSources[0]);
    lastCaptured = inputSources[0].thumbnail.toDataURL();
    document.getElementById('lastImage').src = lastCaptured;
    mediaRecorder.start();
    intVaal = setInterval(()=>{
      timmer++;
      document.getElementById('timId').innerHTML = secondsToHms(timmer); 
    }, 1000);
  }else{
    mediaRecorder.stop();
    clearInterval(intVaal);
  }
}

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

async function getVideoSources() {
  alert(desktopCapturer);
  const inputSources = await desktopCapturer.getSources({
    types: ['screen']
  });
  alert(inputSources);
  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map(source => {
      return {
        label: source.name,
        click: () => selectSource(source)
      };
    })
  );


  videoOptionsMenu.popup();
}

async function selectSource(source) {

  videoSelectBtn.innerText = source.name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id
      }
    }
  };

  const stream = await navigator.mediaDevices
    .getUserMedia(constraints);

  videoElement.srcObject = stream;
  videoElement.play();

  const options = { mimeType: 'video/webm; codecs=vp9' };
  mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;
}

function handleDataAvailable(e) { recordedChunks.push(e.data); }

async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: 'video/webm; codecs=vp9'
  });

  const buffer = Buffer.from(await blob.arrayBuffer());
  gggc++;
  filePath = "assets/videos/video_"+gggc+".webm";

  if (filePath) {
    writeFile(filePath, buffer, () => {});
  }
  recordedChunks.splice(0,recordedChunks.length);
}

function secondsToHms(d, ttt="hrm") {
  d = Number(d);
  var h = Math.floor(d / 3600);
  var m = Math.floor(d % 3600 / 60);
  var s = Math.floor(d % 3600 % 60);
  if(ttt == "h:mm"){
    var hDisplay = h > 0 ? h : "0";
    var mDisplay = m > 0 ? (m<10?"0"+m:m) : "00";
    var sDisplay = "";
    return hDisplay +":"+ mDisplay + sDisplay; 
  }
  else{
    var hDisplay = h > 0 ? h + (h == 1 ? " hr " : " hrs ") : "0 hr ";
    var mDisplay = m > 0 ? m + (m == 1 ? " m" : " m") : " 00 m";
    var sDisplay = "";
    return hDisplay + mDisplay + sDisplay; 
  }
}

function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function createFiles(auth) {
  const drive = google.drive({version: 'v3', auth});
var fileMetadata = {
  'name': 'photo.png'
};
var media = {
  mimeType: 'image/png',
  body: fs.createReadStream('assets/images/loginGoogle.png')
};
drive.files.create({
  resource: fileMetadata,
  media: media,
  fields: 'id'
}, function (err, file) {});
}

const dir = "./images/captured";
if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir, {
		recursive: true
	});
}

function eventHandler(event) {}

function logout(){
  location.reload();
}
