var mongoose=require("mongoose");

var bookSchema=new mongoose.Schema({
	title:String,
	author:String,
	price:String,
	category:String,
	rating:Number,
	desc:String
})

var Book=mongoose.model("Book",bookSchema);

exports.Book=Book;