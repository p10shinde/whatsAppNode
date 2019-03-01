// ############## DECLARATIONS ######################
var fs = require('fs')
var nocache = require('nocache')
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var router = express.Router();
var puppeteer = require('puppeteer-core');
var path = require('path');
var getChrome = require('get-chrome');
const excelToJson = require('convert-excel-to-json');
var Excel = require('exceljs');
const _ = require('underscore');
var nedbPromise= require('nedb-promise'), Datastore = require('nedb');
var store = new Datastore({ filename: 'db/db.db', autoload: true });
const nedb = nedbPromise.fromInstance(store);

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

global.imageurl = path.join(global.dir,'i');
global.videourl = path.join(global.dir,'v');

(function(){
	admin.initializeApp({
	  credential: admin.credential.cert(serviceAccount)
	});
	global.db = admin.firestore();
	console.log('Connected to firebase...')

	db.collection("users").doc("userid1")
	    .onSnapshot(function(doc) {
	        console.log("Current data: ", doc.data());
            global.isActive = doc.data().isActive
	    });
})();

function updateFbUser(res){
	db.collection('users').doc('userid1').set({'isActive' : res}, {merge:true})
}



//############ General APIs ############
router.get('/windowclosed', windowClosed);
router.get('/logout', logout);
router.get('/start', startBrowser);
router.get('/getcode/:ref', getcode);
router.get('/isloggedin', isloggedin);
router.get('/getcontactdata', getcontactdata);
router.post('/sendmessage', sendmessage);
router.put('/updatecontacts', updateContacts);
router.get('/serve/:name', servefiles);

async function servefiles(req, res){
	console.log(req.protocol + '://' + req.get('host'))
	console.log(req.originalUrl)
	var file = path.join(global.imageurl,req.params.name);
	var type = global.mime[path.extname(file).slice(1)];
	var s = fs.createReadStream(file);
	s.on('open', function () {
         res.set('Content-Type', type);
      	s.pipe(res);
   });
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


router.get('/', function(req, res) {  var scott = {  
    name: 'Scott',
    twitter: '@ScottWRobinson'
};
// nedb.insert(scott, function(err, doc) {
// 	console.log('Inserted', doc.name, 'with ID', doc._id);
// });
// nedb.find({ twitter: '@ScottWRobinson' }, function(err, doc) {  
//     console.log('Found user:', doc);
// });
// nedb.update({ twitter: '@ScottWRobinson' }, { $set: { name: 'pankaj' } }, { multi: true }, function (err, numReplaced) {
//   console.log(numReplaced)
// });
nedb.remove({ twitter: '@ScottWRobinson' }, { multi: true }, function (err, numRemoved) {
  // numRemoved = 1
});
store.persistence.compactDatafile();
res.json('running'); });
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

				json['url'] = json['url'] + req.protocol + '://' + req.get('host') + '/api/serve/'+v.split('##||##')[0] + "##||##";
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