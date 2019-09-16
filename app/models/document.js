var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// create User Schema
var Document = new Schema({
	id: String,
	status: String,
	name: String,
	owner: String,
	documentUri: [{ name: String, uri: String }],
	textRaw: String,
	textClean: String,
	words: [{ text: String, order: Number }],
	date: { type: Date, default: Date.now },
	entities: [{ text: String, uri: String, type: String, addedBy: String }],
	entityMap: [{ entity: String, words: [] }],
	blocksRaw: [],
	blocksNer: [{text: String, order: Number, wordIndex: [{word:String, wordF:String, index:Number}], results: [ {text:String, entityType: [{type: String}], spotlightUri: String, tool: [{type: String}], confidence: Number, typeMode: String, matchIndex: [] }  ]}],
	blocksNerParsed: [{text: String, order: Number, wordIndex: [{word:String, wordF:String, index:Number}], results: [ {text:String, entityType: [{type: String}], spotlightUri: String, tool: [{type: String}], confidence: Number, typeMode: String, matchIndex: [] }  ]}],
	blockRegexes: [],
	blockFilters: [],
	nerStatus: { type: Number, default: 0 },
	identities: [],
	rdftypes: [],
	exportRules: [],
	nerCompiledPeopleSorted: []
});

//{blocks:[],label:String,type:String, color:String, linkedIdentities:[], id:Number}


// 	blocks: [{ name: String, id: Number, subject: [{ name: String, uri: String }], predicate: [{ name: String, uri: String }] }],


module.exports = mongoose.model('document', Document);