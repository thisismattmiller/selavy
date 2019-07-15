
const fs  = require('fs')

exports.returnBlockFilters = function(){
	var blockFilters = []
	fs.readdirSync(`${__dirname}/../html/js/plugins/blocks/`).forEach(file => {
		console.log(file)
	  if (file.search(".js")>-1){
	  	blockFilters.push(file)
	  }
	})
	return blockFilters
}