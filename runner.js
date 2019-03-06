// ############## DECLARATIONS ######################
var mongoose = require('mongoose');
var dbInfo = {
    user: '', pass: '',  host: 'localhost',  port: 27018, database: 'WAPP'
};

// ############## DB OPTIONS ######################
var OPTIONS = { 
	auto_reconnect: true,
	reconnectTries: Number.MAX_VALUE,
	reconnectInterval: 1000,
	keepAlive: 1, 
	connectTimeoutMS: 30000,
	useNewUrlParser: true
};
// ############## PROJECT DB ######################
var wappURI = 'mongodb://' + dbInfo.host + ':' + dbInfo.port + '/' + dbInfo.database;
mongoose.connect(wappURI, OPTIONS); // Connect to MongoDB

var projectDB = mongoose.connection;
projectDB.on('error', console.error.bind(console, 'error connecting with mongodb (project) database:'));
projectDB.once('open', function() {  console.log('connected to mongodb (project) database'); });    
projectDB.on('disconnected', function () {
   //Reconnect on timeout
   console.log('Reconnecting to mongodb (project) database');  mongoose.connect(wappURI, OPTIONS);
   projectDB = mongoose.connection;  console.log('Reconnected to mongodb (project) database');
});

var MDLcontacts = require('./models/MDLcontacts');


var fs = require('fs');
var nocache = require('nocache')
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var router = express.Router();
var Busboy = require('busboy');
var puppeteer = require('puppeteer-core');
var path = require('path');
var getChrome = require('get-chrome');
const excelToJson = require('convert-excel-to-json');
var Excel = require('exceljs');
const _ = require('underscore');
var multer	=	require('multer');
var gm = require('gm');


const admin = require('firebase-admin');
var serviceAccount = require('./wtsapproject-cd387d40d4a1.json');
var urlencode = require('urlencode');
var userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36'
var appUrl = "https://web.whatsapp.com/"//"https://google.co.in/"
var columns = {A:'c_#', B:'c_', C: 'c_Number', D: 'c_Name', E: 'm_Type', F: 'm_Message', G: 'c_Status', H: 'm_Delta'}, sheet = ["data"], sourceFile = './input/data.xlsx';
var browser,page = null;
global.timeout = 60000;
global.ctcURL = "https://wa.me/##__NUMBER__##?text=##__TEXT__##"
global.db;
global.isActive = false
global.imageDir = "data/i/";
global.videoDir = "data/v/";

// ############## APP OPTIONS ######################
var app = express();
app.use(bodyParser.json({limit: '50mb'}))
app.use(bodyParser.urlencoded({limit: '50mb', extended: false }));
app.use(bodyParser.text({ type: 'text/html' }));
app.use(cors());
app.use(nocache());
global.dir = path.join(__dirname, 'data');
global.mime = {
    gif: 'image/gif',
    jpg: 'image/jpeg',
    png: 'image/png',
};

global.resurl = path.join(global.dir);
global.imageurl = path.join(global.dir,'i');
global.videourl = path.join(global.dir,'v');
global.allowedExtensions = {
	image : /(\.jpg|\.jpeg|\.png|\.gif)$/i,
	video : /(\.mp4|\.3gp|\.avi)$/i,
	audio : /(\.ogg|\.wav|\.mp3)$/i,
	ms : /(\.docx|\.xlsx|\.pptx|\.doc|\.xls|\.ppt)$/i,
	msfd : /(\.doc|\.docx)$/i,
	msfx : /(\.xls|\.xlsx)$/i,
	msfp : /(\.ppt|\.pptx)$/i,
	text : /(\.txt)$/i
};
global.uploadedFiles = {files:[]};


// (function(){
// 	admin.initializeApp({
// 	  credential: admin.credential.cert(serviceAccount)
// 	});
// 	global.db = admin.firestore();
// 	console.log('Connected to firebase...')

// 	db.collection("users").doc("userid1")
// 	    .onSnapshot(function(doc) {
// 	        console.log("Current data: ", doc.data());
//             global.isActive = doc.data().isActive
// 	    });
// })();

function updateFbUser(res){
	db.collection('users').doc('userid1').set({'isActive' : res}, {merge:true})
}


var storage	=	multer.diskStorage({
  destination: async function (req, file, callback) {
  	global.uploadedFiles.files=[];
  	var basicUrl = 'http://localhost:4001/api';
  	if(global.allowedExtensions.image.exec(file.originalname)){
	    callback(null, './data/i');
  	}else if(global.allowedExtensions.video.exec(file.originalname)){
	    callback(null, './data/v');
  	}else if(global.allowedExtensions.audio.exec(file.originalname)){
	    callback(null, './data/a');
  	}else if(global.allowedExtensions.ms.exec(file.originalname)){
	    callback(null, './data/d');
  	}else{
	    callback(null, './data/junk');
  	}
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  }
});

// var fileFilter = function fileFilter (req, file, cb) {
// 	cb(null, true)
// }
// var upload = multer({ storage : storage, fileFilter : fileFilter}).single('files[]');
const upload = multer({ storage : storage})/*.single('files[]');*/



//############ General APIs ############
router.get('/windowclosed', windowClosed);
router.get('/logout', logout);
router.get('/start', startBrowser);
router.get('/getcode/:ref', getcode);
router.get('/isloggedin', isloggedin);
router.get('/getcontactdata', getcontactdata);
router.post('/sendmessage', sendmessage);
router.put('/updatecontacts', updateContacts);
router.get('/serve', servefiles);
router.get('/getc', getc);
router.put('/putc', putc);
router.delete('/delc', delc);

router.get('/getimages', function(req, res){
	var files = { files : [] }
	var basicUrl = 'http://localhost:4001/api';
	try{
		fs.readdirSync(global.imageDir).forEach(file => {
			var thumbnailUrl = basicUrl+'/serve?res=thumbnail/'+file;
			var url = basicUrl+'/serve?res=i/'+file;
		   files.files.push({
			  	name:file,
			  	title:file,
			  	size:file.size,
				type:'image',
				url:url,
				href:url,
				thumbnail : thumbnailUrl,
				thumbnailUrl : thumbnailUrl,
				deleteUrl: thumbnailUrl,
				deleteType:'DELETE'
			})
		});
		// const stats = fs.statSync(global.imageDir+'/test.jpg')
		res.json(files);
	}catch(E_){
		console.log(E_)
		res.json('Error')
	}
});

router.get('/getvideos', function(req, res){
	var files = { files : [] }
	var basicUrl = 'http://localhost:4001/api';
	try{
		fs.readdirSync(global.videoDir).forEach(file => {
			var thumbnailUrl = basicUrl+'/serve?res=refer/.mp4.png';
			var url = basicUrl+'/serve?res=v/'+file;
		   files.files.push({
				title:file,
				poster : thumbnailUrl,
				href : url,
			  	name:file,
			  	size:file.size,
				type:'video',
				url:url,
				thumbnailUrl : thumbnailUrl,
				deleteUrl: url,
				deleteType:'DELETE'
			})
		});
		// const stats = fs.statSync(global.imageDir+'/test.jpg')
		res.json(files);
	}catch(E_){
		console.log(E_)
		res.json('Error')
	}
});

router.delete('/deleteRes', function(req, res){
	try{
		var data = req.body;
		if(data.type == 'image'){
			fs.unlinkSync(global.imageDir + data.name)
			fs.unlinkSync(global.imageDir + '../thumbnail/' + data.name)
			res.json('Deleted');
		}else if(data.type == 'video'){
			fs.unlinkSync(global.videoDir + data.name)
			res.json('Deleted');
		}else{
			res.json('Unknonw type');

		}
	}catch(E_){
		if(E_.code == 'ENOENT'){
			res.json('File not found')
		}else{
			res.json('Error')
		}
		console.log(E_)
	}
});


router.post('/uploadres',upload.single('files[]') , async function(req,res){
	global.uploadedFiles.files=[];
	if (req.file) {
        var basicUrl = 'http://localhost:4001/api';
        var file = req.file;
	  	if(global.allowedExtensions.image.exec(file.originalname)){
		  		await gm(global.imageDir + file.originalname)
				  .resize(117, 110)
				  .write(global.imageDir + '../thumbnail/' + file.originalname, async function(err){
				    if (err) return console.dir(arguments)
				    var thumbnailUrl = basicUrl+'/serve?res=thumbnail/'+file.originalname;
				    var url = basicUrl+'/serve?res=i/'+file.originalname;
				    global.uploadedFiles.files = [];
				  	 global.uploadedFiles.files.push({name:file.originalname,size:file.size,
				  	 					title:file.originalname,
				  	 					type:'image',
				  	 					url:url,
				  	 					thumbnailUrl : thumbnailUrl,
				  	 					deleteUrl: thumbnailUrl,
				  	 					deleteType:'DELETE'})
				  	 res.json(global.uploadedFiles)
				  }
				)
	  	}else if(global.allowedExtensions.ms.exec(file.originalname)){
	  		global.uploadedFiles.files = [];
	  		
		    var thumbnailUrl = basicUrl+'/serve?res=refer/'+global.allowedExtensions.ms.exec(file.originalname)[0]+'.png';
		  	 global.uploadedFiles.files.push({name:file.originalname,size:file.size,
		  	 					title:file.originalname,
		  	 					type:'ms',
		  	 					url:thumbnailUrl,
		  	 					thumbnailUrl : thumbnailUrl,
		  	 					deleteUrl: basicUrl+'/serve/'+file.originalname,
		  	 					deleteType:'DELETE'})
		  	 res.json(global.uploadedFiles)
	  	}else if(global.allowedExtensions.video.exec(file.originalname)){
	  		global.uploadedFiles.files = [];
	  		
		    var thumbnailUrl = basicUrl+'/serve?res=refer/.mp4.png';
		    var url = basicUrl+'/serve?res=v/'+file.originalname;
		  	 global.uploadedFiles.files.push({name:file.originalname,size:file.size,
		  	 					title:file.originalname,
		  	 					type:'video',
		  	 					url:url,
		  	 					thumbnailUrl : thumbnailUrl,
		  	 					poster : thumbnailUrl,
		  	 					href : url,
		  	 					deleteUrl: basicUrl+'/serve/'+file.originalname,
		  	 					deleteType:'DELETE'})
		  	 res.json(global.uploadedFiles)
	  	}else if(global.allowedExtensions.audio.exec(file.originalname)){
	  		global.uploadedFiles.files = [];
		    var thumbnailUrl = basicUrl+'/serve?res=refer/'+global.allowedExtensions.audio.exec(file.originalname)[0]+'.png';
		  	 global.uploadedFiles.files.push({name:file.originalname,size:file.size,
		  	 					type:'audio',
		  	 					url:thumbnailUrl,
		  	 					thumbnailUrl : thumbnailUrl,
		  	 					deleteUrl: basicUrl+'/serve/'+file.originalname,
		  	 					deleteType:'DELETE'})
		  	 res.json(global.uploadedFiles)
	  	}else{
		    console.log('junk')
		    var thumbnailUrl = basicUrl+'/serve?res=refer/unknown.png';
		  	 global.uploadedFiles.files.push({name:file.originalname,size:file.size,
		  	 					type:'junk',
		  	 					url:thumbnailUrl,
		  	 					thumbnailUrl : thumbnailUrl,
		  	 					deleteUrl: thumbnailUrl,
		  	 					deleteType:'DELETE'})
		  	 res.json(global.uploadedFiles)
	  	}
	  	// console.log(global.uploadedFiles)
        // res.json(global.uploadedFiles)
    } else {
        console.log('No File Uploaded');
        var filename = 'FILE NOT UPLOADED';
        var uploadStatus = 'File Upload Failed';
        return res.json("Error uploading file.");
    }

	// upload(req,res,function(err) {
	//  	if (err instanceof multer.MulterError) {
	// 		console.log(err)
	//       return res.json("Multer Error uploading file.");
	//     } else if(err) {
	// 		console.log(err)
	// 		return res.json("Error uploading file.");
	// 	}
	// 	res.json(global.uploadedFiles)
	// 	// res.json({"files": [
	// 	//   {
	// 	//     "name": "picture1.jpg",
	// 	//     "size": 902604,
	// 	//     "url": "http:\/\/example.org\/files\/picture1.jpg",
	// 	//     "thumbnailUrl": "http:\/\/example.org\/files\/thumbnail\/picture1.jpg",
	// 	//     "deleteUrl": "http:\/\/example.org\/files\/picture1.jpg",
	// 	//     "deleteType": "DELETE"
	// 	//   },
	// 	//   {
	// 	//     "name": "picture2.jpg",
	// 	//     "size": 841946,
	// 	//     "url": "http:\/\/example.org\/files\/picture2.jpg",
	// 	//     "thumbnailUrl": "http:\/\/example.org\/files\/thumbnail\/picture2.jpg",
	// 	//     "deleteUrl": "http:\/\/example.org\/files\/picture2.jpg",
	// 	//     "deleteType": "DELETE"
	// 	//   }
	// 	// ]})
	// 	// res	.json("File is uploaded");
	// });
});

async function getc(req, res){
	try{
		var json = [];
		var list = await MDLcontacts.find({}).sort({'stepNo': 1}).exec();
		var stepNo = 1;
		_.each(list, function(v){
			_.each(v['message'], function(msg){
					var obj = {}
					
					obj['stepCheckBox'] = v['stepCheckBox'];obj['contactName'] = v['contactName'];obj['contactNumber'] = v['contactNumber'];
					
					obj['type'] = msg['type'];
					obj['id'] = msg['id'];
					if(msg['type'] == 'image'){
						obj['stepNo'] = stepNo++;
						obj['data'] = msg['data'];
						json.push(obj);
					}else{
						_.each(msg['data'], function(msgData){
								obj['stepNo'] = stepNo++;
								obj['id'] = msg['id'];
								obj['text'] = msgData['text'];
								obj['url'] = msgData['url'];
								obj['fName'] = msgData['fName'];
								obj['delta'] = msgData['delta'];
							json.push(obj);
						});
					}
			})
		})
		res.json(json)
	}catch(E_){
		console.log(E_)
		res.json('Error')
	}
}

async function putc(req, res){
	try{
		_.each(req.body, async function(v){
			try{
				var collection = await MDLcontacts.findOne({'contactNumber':v['contactNumber']}).exec();
				if(collection == null){
					await new MDLcontacts(v).save();
				}
				else{
					await MDLcontacts.deleteOne({'contactNumber':v['contactNumber']}).exec();
					
				}
			}catch(E_){
				console.log(E_)
			}
		})
		res.json('yess')
	}catch(E_){
		res.json('Error')
	}
}

async function delc(req, res){
	try{
		await _.each(req.body, async function(v){
			try{
				var list = await MDLcontacts.find({'contactNumber':v['contactNumber']}).exec();
				var list2 = _.map(list, function(contactDetails){
				    var f_message = _.filter(contactDetails.message, function(msg){
				        if(msg.id != v['id']) return msg;
				    })
				    contactDetails.message = f_message;
				    return contactDetails
				})
				await MDLcontacts.findOneAndUpdate({'contactNumber':v['contactNumber']},{ $set : { 'message' : list[0]['message'] }}).exec();
			}catch(E_){
				console.log(E_)
				res.json('Error')
			}
		})
		res.json('updated');
	}catch(E_){
		res.json('Error')
	}
}


async function servefiles(req, res){
	try{
		var file = path.join(global.resurl,req.query.res);
		var type = global.mime[path.extname(file).slice(1)];
		var s = fs.createReadStream(file);
		s.on('open', function () {
	         res.set('Content-Type', type);
	      	s.pipe(res);
	   });
	}catch(E_){
		console.log(E_)
		res.json('Error');
	}
}

async function listenBrowser(){
	browser.on('disconnected', async function(){
		updateFbUser(false)
	})
}

async function windowClosed(req,res){
	try{
		updateFbUser(false);
		if(page != null) {
			if(global.isActive){}
				await logout(req,res);
			await browser.close()
		}
	}catch(e){
		console.log({'Error' : e.message})
	}
}

async function startBrowser(req,res){//, userDataDir: `Default`
	try{
		browser = await puppeteer.launch({ headless: false, executablePath : getChrome(), /*args: ['--start-maximized']*/});
		page = await browser.newPage();
		await page.setUserAgent(userAgent);
		await page.goto(appUrl, { waitUntil: 'networkidle2' });
		listenBrowser();
		
		res.status(200).json({'msg':'started'})
	}catch(e){
		console.log(e)
		res.status(400).json({'Error' : e.message})
	}
}

async function getcode(req,res){
	try{
		if(page == null) res.status(400).json({'Error' : 'Not connected.'})
		else{
			if(req.params.ref) await page.reload({ waitUntil: 'networkidle2' });
			await page.waitForSelector('._2EZ_m img[src]',{ timeout: global.timeout }).then(() => console.log('qr code received...'))
			var base64 = await page.$$eval('._2EZ_m img[src]', aTags => aTags.map(a => a.getAttribute("src")))
			res.status(200).json({'msg' : base64[0]})
		}
	}catch(e){
		console.log(e)
		res.status(400).json({'Error' : e.message})
	}
}

async function isloggedin(req,res){
	try{
		if(page == null) res.status(400).json({'Error' : 'Not connected.'})
		else{
			await page.waitForSelector('.RLfQR',{ timeout: global.timeout }).then(() => console.log('User logged in...'))
			updateFbUser(true);
			res.status(200).json({'msg' : 'success'})
		}
	}catch(e){
		console.log(e)
		res.status(400).json({'Error' : e.message})
	}
}

async function logout(req,res){
	try{
		if(page == null) res.status(400).json({'Error' : 'Not connected.'})
		else{
			await page.click('#side div:nth-child(3) > div[title="Menu"]');
			await page.click('div[title="Log out"]');
			await browser.close()
			console.log('Logged out session')
			res.status(200).json({'msg' : 'success'})
		}
	}catch(e){
		console.log(e)
		res.status(400).json({'Error' : e.message})
	}
}

async function getcontactdata(req,res){
	try{
		// if(page == null) res.json({'Error' : 'Not connected.'})
		var data = await parseExcel(req, res)
		res.status(200).json({msg : data})
	}catch(e){
		console.log(e)
		res.status(400).json({'Error' : e.message})
	}
}

async function sendmessage(req, res){
	try{
		if(page == null) res.status(500).json({'Error' : 'Not connected.'})
		else{
			//remove html entities .replace(/<\/?[^>]+(>|$)/g, "")
            req.body['m_Message'] =  req.body['m_Message'].replace(/<b>/g, "*").replace(/<\/b>/g,"*").
						      replace(/<strike>/g, "~").replace(/<\/strike>/g,"~").
						      replace(/<i>/g, "_").replace(/<\/i>/g,"_").
						      replace(/<tt>/g, "```").replace(/<\/tt>/g,"```");
	      	req.body['m_Message'] = req.body['m_Message'].replace(/{#name#}/g,req.body['c_Name'] != '__BLANK__' ? req.body['c_Name'] : 'User');
	      	req.body['m_Message'] = req.body['m_Message'].replace(/<\/?[^>]+(>|$)/g, "")
	      	req.body['m_Message'] = urlencode(req.body['m_Message'])
			await page.goto(ctcURL.replace('##__NUMBER__##',`91${req.body['c_Number']}`).replace('##__TEXT__##',req.body['m_Message']), { waitUntil: 'networkidle2',timeout: 0 });
			await page.click('#action-button');
			await page.waitForSelector('._35EW6',{ timeout: global.timeout }).then(async () => {console.log('send button found...');/*await page.click('._35EW6');*/})
			await page.keyboard.press('Enter');
			// await page.waitForSelector('._32uRw>span[data-icon="msg-check"]:last-child',{ timeout: global.timeout }).then(() => console.log('message sent...'))
			// await page.waitFor(2000);
			res.status(200).json({'msg' : 'sent'})
		}
	}catch(e){
		console.log(e)
		res.status(400).json({'Error' : e.message})
	}
}


router.get('/', function(req, res) { 
gm(__dirname + '/data/junk/Untitled.png')
				  .resize(58, 50, '%')
				  .write(__dirname + '/data/junk/thumb/t_Untitled.png', function(err){
				    if (err) return console.dir(arguments)
				    console.log(this.outname + " created  ::  " + arguments[3])
				  }
				);res.json('running'); });
app.use('/api', router); app.listen(4001); console.log('running...');



async function parseExcel(req, res){
	var result = excelToJson({
	    sourceFile: sourceFile,
	    columnToKey: columns,
	    sheets: sheet,
	    header:{rows: 1}
	})[sheet[0]];
	var jsonArray = [];
	_.each(result, function(v,k){
		var json = {}
		json['c_#']=v['c_#'];json['c_']=v['c_'];json['c_Name']=v['c_Name'];json['c_Number']=v['c_Number'];
		json['c_Status']=
				`<span class="fa-stack">
               <i class="fas fa-circle fa-stack-2x"></i>
               <i class="fas fa-ellipsis-h fa-stack-1x fa-inverse"></i>
            </span>`;
		json['m_Type']=v['m_Type'];
		if(v['m_Type'] == "image"){
			var i_message = v['m_Message'].split("###|||###");
			json['name'] = '';
			json['url'] = '';
			console.log(i_message);
			var cntr = 0;
			_.each(i_message, function(v){
			   json['name'] = json['name'] + v.split('##||##')[0] + "##||##";

				json['url'] = json['url'] + req.protocol + '://' + req.get('host') + '/api/serve/i/'+v.split('##||##')[0] + "##||##";
				json['thumbnailurl'] = json['thumbnailurl'] + req.protocol + '://' + req.get('host') + '/api/serve/thumbnail/'+v.split('##||##')[0] + "##||##";
				// json['base'] = json['base'] + await base64_encode(v.split('##||##')[0]) + "##||##";

			})
			json['name']=json.name.split("").reverse().join("").replace('##||##','').split("").reverse().join("")
			json['url']=json.url.split("").reverse().join("").replace('##||##','').split("").reverse().join("")
			json['m_Message']=v['m_Message'];
			json['m_Delta']=v['m_Delta']

		}else{
			json['m_Message']=v['m_Message'];
	      json['m_Delta']=v['m_Delta']
		}
		jsonArray.push(json)
	})
	return jsonArray;
}

async function updateContacts(req,res){
	try{
		var WB = new Excel.Workbook();
		var WS = WB.addWorksheet(sheet[0]);
		WS.columns = [
		    { header: 'c_#', key: 'c_#', width : 5},
		    { header: 'c_', key: 'c_'},
		    { header: 'c_Number', key: 'c_Number', width: 15 },
		    { header: 'c_Name', key: 'c_Name', width: 30 },
		    { header: 'm_Type', key: 'm_Type', width: 10 },
		    { header: 'm_Message', key: 'm_Message', width: 100 },
		    { header: 'c_Status', key: 'c_Status', width: 10 },
		    { header: 'm_Delta', key: 'm_Delta'}]
		_.each(req.body, function(v){
			WS.addRow({
				'c_#' : v['c_#'],
				'c_' : v['c_'],
				'c_Number' : v['c_Number'],
				'c_Name' : v['c_Name'],
				'm_Type' : v['m_Type'],
				'm_Message' : v['m_Message'],
				'c_Status' : v['c_Status'],
				'm_Delta' : v['m_Delta'],
			})
		})
		WS.getColumn(2).hidden = true;WS.getColumn(7).hidden = true;WS.getColumn(8).hidden = true;
		await WB.xlsx.writeFile(sourceFile);
		res.status(200).json({'msg' : 'Updated'})
	}catch(e){
		console.log(e)
		res.status(400).json({'Error' : e.code})
	}	
}

async function sortIt(data){
	var resp = [];
	_.each(data, function(v,k){
		var unordered = v;
		const ordered = {};
		Object.keys(unordered).sort().forEach(function(key) {
		  ordered[key] = unordered[key];
		});
		resp.push(ordered)
	})
	return resp;
}

function base64_encode(file) {
    var bitmap = fs.readFileSync(global.imageDir + file);
    return new Buffer(bitmap).toString('base64');
}