var mongoose = require('mongoose');
var beautifyUnique = require('mongoose-beautiful-unique-validation');
let mongooseHidden = require('mongoose-hidden')({ hidden: { _id: true, __v: true } });

var messageDataSchema = new mongoose.Schema({
   text: String,
   delta: String,
   url: String,
   fName: String 
}, { _id : false, __v: false })

var messageSchema = new mongoose.Schema({
   type: String,
   id: Number,
   data : [messageDataSchema],
   
}, { _id : false, __v: false })
var contactSchema = new mongoose.Schema({
   stepNo: Number,
   stepCheckBox: String,
   contactName: String,
   contactNumber: String,
   messageStatus: String,
   message: [messageSchema]
}, { __v: false });
               


contactSchema.index({contactNumber: 1, text: 1}, {unique: true});

contactSchema.plugin(mongooseHidden);
contactSchema.plugin(beautifyUnique); 

// Export the Mongoose model
module.exports = mongoose.model('contacts', contactSchema);