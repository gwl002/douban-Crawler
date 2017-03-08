var request=require("request").defaults({strictSSL:false})


request.get("https://read.douban.com/ebooks/tag/%E5%B0%8F%E8%AF%B4/?cat=book&sort=top&start=0",function(err,res,body){
	console.log(res.statusCode);
	console.log(res.headers)
})