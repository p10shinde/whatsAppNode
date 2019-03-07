var dt = global.dtob.cntDt.fnGetData();
for(i=0; i<_.uniq(dt,'contactNumber').length;i++){
var mainObj = {}
mainObj.message = [];
var tmp = _.filter(dt,function(v){if(v.contactNumber == dt[i].contactNumber) return v})

_.each(tmp, function(v2){
	mainObj = _.clone(v2);
	

var dtArray = [];
var dtArrayObj = {idd : mainObj.idd, text : mainObj.text, url : mainObj.url, fName : mainObj.fName, delta : mainObj.delta}
dtArray.push(dtArrayObj)
var msgObj = { type : mainObj.type ,data : dtArray}
mainObj.message.push(msgObj)
	console.log(mainObj)
})

}