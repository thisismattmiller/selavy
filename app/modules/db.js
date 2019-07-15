const mongoose = require('mongoose')

mongoose.connect('mongodb://mongo:27017/selavy', { useNewUrlParser: true })

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));




// var test = new mongoose.Schema({
//   name: String
// });