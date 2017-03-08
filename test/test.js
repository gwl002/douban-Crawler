var Crawler=require("crawler");
var BASE_URL="https://accounts.douban.com/login";




var c = new Crawler({
    maxConnections :5,
    rateLimit:1000,
    strictSSL:false,  //禁用严格SSL验证，对https协议url使用
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
            console.log($.text());
        }
        done();
    }
});




c.queue([{
    uri:BASE_URL,
    method:"GET",
    callback:function(error,res,done){
        if(error){
            console.log(error)
        }else{
            console.log(res.statusCode,res.request.method,res.request.headers)
            var $ = res.$;
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
            console.log($.text());
        }
        done();
    }
}]);