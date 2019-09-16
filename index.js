const express = require('express')
const multer  = require('multer')
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');


const tika    = require('./app/modules/tika')
const db    = require('./app/modules/db')
const util    = require('./app/modules/util')
const ner    = require('./app/modules/ner')

const config = require('./app/modules/config')

const Document = require('./app/models/document');



const app = express()
const port = 3000
const path = require('path');
const htmlFolder = path.join(__dirname, 'app/html');


app.use(express.static('app'))
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.set('views', './app/html/');
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
app.use(express.json({limit: '10mb', extended: true}));


var upload = multer({ dest: '/tmp/' })


app.get('/login', function(req, res, next) {
  res.send('Go back and register!');
});

var passportGithub = require('./app/auth/github');

app.get('/auth/github', passportGithub.authenticate('github', { scope: [ 'user:email' ] }));

app.get('/auth/github/callback',
  passportGithub.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication
    // res.json(req.user);
    res.redirect('/');
  });


app.get('/', function(req, res) {
	console.log(req.user)
	console.log(req.isAuthenticated())
    // res.sendFile(path.join(htmlFolder, 'index.html'));
    res.render('index',{isAuthenticated: req.isAuthenticated(), user:req.user})
});

app.get('/upload', function(req, res) {
    res.sendFile(path.join(htmlFolder, 'upload.html'));
});


app.post('/upload', upload.single('file'), function (req, res, next) {
  tika.extractText(req.file.path, req.file.mimetype,(error, response, body)=>{
  	if (response.statusCode === 200 && body !== ''){
  		// var User = require('../models/user');
		var doc = new Document({ id: req.file.filename, status: 'clean', owner: (req.isAuthenticated()) ? req.user.email : '', textRaw: body });
		doc.save(function (err) {
		  if (err) {
		  	console.log(err)
		    res.status(500).end("Could not save the document to the database: " + err.message);
		  }else{
		  	res.redirect(`/document/${req.file.filename}/clean`);
		  }		
		});

  	}else{
  		if (body.length === 0){
  			console.log("here")
		    res.status(500).end("Tika server could not extract any text from the document you provided. Cannot continue.");
		}else if (response.statusCode !== 200) {
		    res.status(500).end("Tika server encountered and error while processing your document. Cannot continue.");			
		}else{
			res.status(500)
		}
  	}  	
  })  
})

app.get('/document/:docId/clean',  function (req, res) {
	docId = req.params.docId
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{
			if (doc.owner != ''){
				if (req.isAuthenticated() && req.user.email == doc.owner){
					res.render('clean',{doc: doc})
				}else{
					res.status(401).send("You are not signed in or are not the owner of this document.")
				}
			}else{
				res.render('clean',{doc: doc})
			}

		}
	})
})


app.post('/block',  function (req, res) {
	docId = req.body.id
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{
			if (doc.owner != ''){
				if (req.isAuthenticated() && req.user.email == doc.owner){
					// res.render('clean')
					doc.textClean = req.body.text
					doc.save(function (err) {
					  if (err){
					  	res.status(500).send(err)
					  }else{
					  	res.redirect(`/document/${docId}/block`);	
					  }
					  
					});

				}else{
					res.status(401).send("You are not signed in or are not the owner of this document.")
				}
			}else{
				// res.render('clean',{doc: doc})
				doc.textClean = req.body.text
				doc.save(function (err) {
				  if (err){
				  	res.status(500).send(err)
				  }else{
				  	res.redirect(`/document/${docId}/block`);	
				  }
				  
				});


				
			}

		}
	})
})

app.post('/ner',  function (req, res) {
	docId = req.body.id
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{
			if (doc.owner != ''){
				if (req.isAuthenticated() && req.user.email == doc.owner){
					// res.render('clean')
					doc.blocksRaw = req.body.blocks
					doc.blockRegexes = req.body.blockRegexes
					doc.blockFilters = req.body.blockFilters

					doc.save(function (err) {
					  if (err){
					  	res.status(500).send(err)
					  }else{
					  	res.status(200).send('OK')	

					  }
					  
					});

				}else{
					res.status(401).send("You are not signed in or are not the owner of this document.")
				}
			}else{
				doc.blocksRaw = req.body.blocks
				doc.blockRegexes = req.body.blockRegexes
				doc.blockFilters = req.body.blockFilters


				doc.save(function (err) {
				  if (err){
				  	res.status(500).send(err)
				  }else{
				  	res.status(200).send('OK')
				  	console.log('----------')
				  	console.log(req.body.blocks)
				  	console.log('----------')
				  }
				  
				});


				
			}

		}
	})
})

app.get('/document/:docId/ner',  function (req, res) {
	docId = req.params.docId	
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{
			if (doc.owner != ''){
				if (req.isAuthenticated() && req.user.email == doc.owner){

					if (doc.nerStatus ==0){
						ner.processNer(docId)
						// res.status(200).send('OK - is 0')
						res.redirect('/document/'+docId+'/ner/status');
					}else{
						res.status(200).send(JSON.stringify(doc.nerStatus))
					}					
					// res.render('ner',{doc: doc})
				}else{
					res.status(401).send("You are not signed in or are not the owner of this document.")
				}
			}else{

				if (doc.nerStatus == 0){
					ner.processNer(docId)
					res.redirect('/document/'+docId+'/ner/status');
					// res.status(200).send('OK - is 0')
				}else{
					res.status(200).send(JSON.stringify(doc.nerStatus))
				}
				// res.render('ner',{doc: doc, docjson: JSON.stringify(doc) })
			}

		}
	})
})


app.get('/document/:docId/dump',  function (req, res) {
	docId = req.params.docId	
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{


			res.set("Content-Disposition", "attachment;filename=docId.json");

			res.status(200).json(doc)


		}
	})
})



app.get('/document/:docId/ner/status',  function (req, res) {
	docId = req.params.docId	
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{
			res.render('ner_status',{docId: docId, status:doc.nerStatus, totalBlocks: doc.blocksRaw.length, processedBlocks:doc.blocksNer.length })


		}
	})
})
app.get('/document/:docId/ner/start',  function (req, res) {
	docId = req.params.docId	
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{
			res.render('ner_start',{docId: docId, status:doc.nerStatus, totalBlocks: doc.blocksRaw.length, processedBlocks:doc.blocksNer.length })


		}
	})
})

app.get('/document/:docId/parse',  function (req, res) {
	docId = req.params.docId	
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{


			var formatWord = function(word) {

				word = word.replace(/’s|’t/g,'')
				word = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"”“’‘'?]/g,"")
				word = word.replace(/\n/g,' ')
				word = word.replace(/<nl>/g,'')


				
				word = word.replace(/\s+/g,' ')
				word = word.toLowerCase().trim()
				// word = word.split(' ').join(' ')
				// console.log(`"${word}"`)

				return word

			}

			var data = doc.toObject()
			var newBlocks = []
			data.blocksNer.forEach((ner)=>{

				var text = ''
				var all_test = []
				// replace all line breaks for thsi 
				ner.text.replace(/\n/g,'<nl> ').split(' ').forEach((word, i)=>{
					// if (word == ''){ return false }
					var formatedWord = formatWord(word)
					text = text + ' ' + formatedWord
					// if (formatedWord != ''){
						all_test.push({word:word,wordF:formatedWord, index: i })
					// }
				})

				ner.wordIndex = all_test;

				for (let x = 0; x<ner.results.length; x++){

					ner.results[x].textF = formatWord(ner.results[x].text)			
					ner.results[x].matchIndex = []
					var len = ner.results[x].textF.split(" ").length
					for (let n = 0; n<all_test.length; n++){
						var matchIndex = []
						test_word = all_test[n].wordF
						matchIndex.push(n)
						if (len > 1){
							for (let c = 1; c<len; c++){
								if (all_test[n+c]){
									matchIndex.push(n+c)
									test_word = test_word + ' ' + all_test[n+c].wordF
								}						
							}
						}
						
						if (test_word == ner.results[x].textF){
							ner.results[x].matchIndex.push(matchIndex)
							// console.log(ner.results[x])
							// console.log(ner.results[x].textF,test_word)
							// console.log(matchIndex)
						}		


					}
					// console.log(ner.results[x].matchIndex.length)
					
					if (ner.results[x].matchIndex.length == 0){
						// if (ner.results[x].text=='Teresa Hulton'){
						// 	console.log('--------- len is zero')
						// 	console.log(ner.text)
						// }
						for (let n = 0; n<all_test.length; n++){
							var matchIndex = []
							test_word = all_test[n].wordF
							matchIndex.push(n)
							if (len > 0){
								for (let c = 1; c<len; c++){
									if (all_test[n+c]){
										matchIndex.push(n+c)
										test_word = test_word + ' ' + all_test[n+c].wordF
									}						
								}
							}
							
							// if (ner.results[x].text=='Teresa Hulton'){
							// 	console.log(test_word)
							// }

							// see if the it contains it and is large enough to add
							if (ner.results[x].textF.includes(test_word) === true){
								if (test_word.trim().length>3){
									// if (ner.results[x].text=='Teresa Hulton'){
									// 	console.log(test_word,'|',ner.results[x].textF,'|',ner.results[x].textF.includes(test_word))
									// }
									ner.results[x].matchIndex.push(matchIndex)
								}
							}


							if (ner.results[x].textF.split(' ').length>1 && ner.results[x].textF.length >= 10){
								if (test_word.includes(ner.results[x].textF) === true){
									ner.results[x].matchIndex.push(matchIndex)
								}
							}

						}


					}

					// if (ner.results[x].text=='Teresa Hulton'){

					// 	console.log(ner.results[x])
					// }



				}


				newBlocks.push(ner)
			})


			// newBlocks.forEach((b)=>{
			// 	b.results.forEach((bb)=>{

			// 		console.log(bb)
			// 		console.log('------------')
			// 	})
				

			// })

			doc.blocksNerParsed = newBlocks

			doc.save(function (err) {
			  if (err){
			  	res.status(500).send(err)
			  }else{
			  	res.redirect(`/document/${docId}/edit`);	
			  }
			  
			});


			// // var nerResults = []
			// // doc.blocksNer[5].results.forEach((r)=>{nerResults.push(r)})
			// // const fs = require('fs')

			// // fs.writeFileSync('test.what', JSON.stringify(doc.toObject(),null,2));

			// // var text = doc.blocksNer[5].text;
			// // console.log(nerResults)
			// // console.log(text)
			// res.status(200).send('cool story')


		}
	})
})

app.get('/document/:docId/edit',  function (req, res) {
	docId = req.params.docId	
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{
			if (doc.owner != ''){
				if (req.isAuthenticated() && req.user.email == doc.owner){

					// res.status(200).send(JSON.stringify(doc.blocksNerParsed))
									
					res.render('edit',{doc: doc, docjson: JSON.stringify(doc), config: JSON.stringify(config) })
				}else{
					res.status(401).send("You are not signed in or are not the owner of this document.")
				}
			}else{
				
				// res.status(200).send(JSON.stringify(doc.blocksNerParsed))

				res.render('edit',{doc: doc, docjson: JSON.stringify(doc), config: JSON.stringify(config) })
			}

		}
	})
})

app.get('/document/:docId/export',  function (req, res) {
	docId = req.params.docId	
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{


			// res.set("Content-Disposition", "attachment;filename=docId.json");
			var ex = {}
			ex.blocks = []

			var subjectMap = {}
			var subjectMapType = {}
			doc.identities.forEach((i)=>{
				subjectMap[i.label] = i.uri
				subjectMapType[i.label] = i.type

				if (subjectMap[i.label] == null || subjectMap[i.label] == ''){
					subjectMap[i.label] = 'NOURIERROR'
				}

			})


			doc.blocksNerParsed.forEach((b)=>{
				block = {}
				block.identities = []
				block.triples = []


				doc.identities.forEach((i)=>{


					i.manualWords.forEach((mw)=>{
						if (mw.b.toString() == b.order.toString()){
							block.identities.push({identLabel: i.label, identUri: i.uri, identType: i.type, identId: i.id, found: mw.w})
						}

					})

					i.linkedIdentities.forEach((li)=>{
						doc.nerCompiledPeopleSorted.forEach((nerCP)=>{

							nerCP.occ.forEach((occ)=>{
								if (occ.block === b.order && nerCP.id == li){

									occ.index.forEach((occIndex)=>{


										occIndex.forEach((occIndexW) =>{
											block.identities.push({identLabel: i.label, identUri: i.uri, identType: i.type, identId: i.id, found: occIndexW})


										})

									})
									
								}
							})

						})
					})


				})




				doc.exportRules.forEach((r)=>{

					var addedIdents = []


					if (r.block=='All' || r.block.toString() == b.order.toString()){


						block.identities.forEach((i)=>{

							if (i.identType == r.object){
								let t = {

									's': subjectMap[r.subject],
									'p': r.predicate,
									'o': i.identUri 


								}
								if (addedIdents.indexOf(t.s+t.p+t.o)==-1){
									block.triples.push(t)
									addedIdents.push(t.s+t.p+t.o)									
								}


							}

						})


					}



				})

				
			



				block.id = b.order
				block.text = b.text
				


				ex.blocks.push(block)
			})
			




			res.status(200).json(ex)


		}
	})
})

app.post('/saveedit',  function (req, res) {
	docId = req.body.id
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{
			if (doc.owner != ''){
				if (req.isAuthenticated() && req.user.email == doc.owner){
					// res.render('clean')
					doc.identities = req.body.identities
					doc.rdftypes = req.body.rdftypes
					doc.nerCompiledPeopleSorted = req.body.nerCompiledPeopleSorted
					doc.exportRules = req.body.exportRules



					doc.save(function (err) {
					  if (err){
					  	res.status(500).send(err)
					  }else{
					  	res.status(200).send('good');	
					  }
					  
					});

				}else{
					res.status(401).send("You are not signed in or are not the owner of this document.")
				}
			}else{
				// res.render('clean',{doc: doc})
				doc.identities = req.body.identities
				doc.rdftypes = req.body.rdftypes
				doc.nerCompiledPeopleSorted = req.body.nerCompiledPeopleSorted
				doc.exportRules = req.body.exportRules


				doc.save(function (err) {
				  if (err){
				  	res.status(500).send(err)
				  }else{
				  	res.status(200).send('good');	
				  }
				  
				});


				
			}

		}
	})
})




app.get('/document/:docId/block',  function (req, res) {
	docId = req.params.docId

	
	Document.findOne({ id: docId }, function (err, doc) {
		if (!doc){
			res.status(404).send("That document id was not found.")
		}else{

			var passData = {doc: doc, plugins:util.returnBlockFilters(), pluginsJson: JSON.stringify(util.returnBlockFilters())  };


			if (doc.owner != ''){
				if (req.isAuthenticated() && req.user.email == doc.owner){
					res.render('block',passData)
				}else{
					res.status(401).send("You are not signed in or are not the owner of this document.")
				}
			}else{
				res.render('block',passData)
			}

		}
	})
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
