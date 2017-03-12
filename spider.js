//模拟登陆豆瓣

var LOGIN_URL="https://accounts.douban.com/login"
var BASIC_URL="https://www.douban.com/"
var CAPTCHA_URL="https://www.douban.com/misc/captcha?size=s&id="
var NOVEL_URL="https://read.douban.com/ebooks/tag/%E5%B0%8F%E8%AF%B4/?cat=book&sort=top&start="

var request=require("request")
var cheerio=require("cheerio")
var fs=require("fs")
var async=require("async")
var open=require("open")  //调用浏览器
var readline=require("readline") //控制台输入
var mongoose=require("mongoose")
var Book=require("./models/book.js").Book

//配置请求体
var j=request.jar()
var headers={"User-Agent":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.101 Safari/537.36"}
var req=request.defaults({strictSSL:false,jar:j,headers:headers})

//登陆信息
var LOGIN_INFO={
	form_email:"your-email-address",
	form_password:"your-password",
	login:"登陆",
	redir:"https://www.douban.com",
	source:"None"
}


//从html中提取capthca信息
function extract_captcha(html){
	var $=cheerio.load(html);
	var captcha_id,captcha_image;
	captcha_id=$("input[name=captcha-id]").val();
	return captcha_id
}


//得到captcha_id
function get_captcha(){
	return new Promise(function(resolve,reject){
		req.get(LOGIN_URL,function(err,res,body){
			if(err){
				reject(err)
			}else{
				var captcha_id=extract_captcha(body);
				resolve(captcha_id)
			}
		})
	})
}

//组合登陆信息
function compose_loginInfo(captcha_id){
	return new Promise(function(resolve,reject){
		if(captcha_id){
			var captcha_url=CAPTCHA_URL+captcha_id;
			open(captcha_url);
			var rl=readline.createInterface({
				input:process.stdin,
				output:process.stdout
			})
			rl.question("请输入验证码:  ",function(value){
				LOGIN_INFO["captcha-solution"]=value;
				LOGIN_INFO["captcha-id"]=captcha_id;
				resolve();
				rl.close();
				
			})
			
		}else{
			console.log("----此次请求无需验证码----");
			resolve();
		}
		
	})
}

//登陆
function login(){
	return new Promise(function(resolve,reject){
		req.post({url:LOGIN_URL,form:LOGIN_INFO},function(err,res,body){
			if(err){
				reject(err);
			}else{
				if(res.headers["set-cookie"]){
					// console.log(j.getCookieString(LOGIN_URL)) 
					console.log("恭喜你，登陆成功！");
					console.log(body);
					resolve();
				}else{
					console.log("登陆失败")
					reject(new Error("login failure!"));
				}
				
			}
		})
	})
}

//从页面提取用户信息
function extract_userInfo(html){
	var $,name,id,address,joinTime,pl,matches;
	$=cheerio.load(html);
	nick=$("title").text();
	address=$(".user-info a").text();
	pl=$(".user-info .pl").text();
	matches=pl.match(/(\d+)\s+(\d{4}-\d{2}-\d{2}).+/) 
	id=matches[1];
	joinTime=matches[2];
	return {
		nick:nick,
		address:address,
		id:id,
		joinTime:joinTime
	}
	
}

//获取用户信息 
function get_userInfo(){
	return new Promise(function(resolve,reject){
		req.get(BASIC_URL+"mine/",function(err,res,body){
			if(err){
				reject(err);
			}else{
				var userInfo=extract_userInfo(body)
				resolve(userInfo);
			}
		})
	})
}

//爬取豆瓣电子书中所有小说的信息

//获取所有电子小说总量
function get_pageTotal(){
	return new Promise(function(resolve,reject){
		req.get(NOVEL_URL+0,function(err,res,body){
			if(err){
				reject(err);
			}else{
				var $=cheerio.load(body);
 				var pageTotal=$(".pagination ul").children().last().prev().text();
 				if(!pageTotal){
 					reject(new Error("ip  被封掉了吧！"))
 				}
				resolve(pageTotal);
			}
		})
	})
}

//提取每页小说信息 
function extract_novelInfo(html){
	var $=cheerio.load(html);
	var items=$(".item");
	var books=[];
	items.map(function(i,item){
		var title,price,author,category,rating,desc,book;
		title=$(item).find($(".title")).text()||"Null";
		price=$(item).find($(".price-tag")).text().replace(/[^\d\.]/g,"")||0;
		if($(item).find($(".price-tag")).hasClass("discount")){
			price=$(item).find($(".discount-price")).text().replace(/[^\d\.]/g,"")||0;
		}else{
			price=$(item).find($(".price-tag")).text().replace(/[^\d\.]/g,"")||0;
		}


		author=$(item).find($(".author-item")).text()||"Null";
		category=$(item).find($("span[itemprop='genre']")).text().split("/")[1]||"Null";
		rating=$(item).find($(".rating-average")).text()||0;
		desc=$(item).find($(".article-desc-brief")).text()||"Null";
		book={
			title:title,
			price:price,
			author:author,
			category:category,
			rating:rating,
			desc:desc
		};
		console.log(book.title)
		books.push(book);
	})
	return books;

}

//主爬虫
function novels_spider(pageTotal){
	var urls=[];
	for(var i=0;i<pageTotal;i++){
		urls.push(NOVEL_URL+20*i);
	} 
	async.mapLimit(urls,5
		,function(url,callback){
		req.get(url,function(err,res,body){
			if(err){
				console.log(err);
			}else{
				var books=extract_novelInfo(body);
				Book.create(books,function(err,docs){
					if(err){
						console.log(err);
						callback(null,err);
					}else{
						callback(null,docs);
					}
				});
			}
		})
	},function(err,result){
		console.log("爬取结束...，一共爬完"+result.length+"个页面。");
	})
}

//main
mongoose.connect("mongodb://localhost/book");
db=mongoose.connection;
db.on("error",function(err){
	console.log(err);
})
db.once("open",function(){
	console.log("数据库连接成功...");
})

function main(){
	Book.remove({},function(err){
		if(err){
			console.log(err)
		}else{
			get_captcha()
			.then(compose_loginInfo)
			.then(login)
		//.then(get_userInfo)
		//.then(function(user){
		//	console.log(user.nick+"常居"+user.address+"，于"+user.joinTime+"注册豆瓣，ID号为"+user.id+"。")
		//})
			.then(get_pageTotal)
			.then(function(pageTotal){
				console.log("开始爬取,一共有"+pageTotal+"个页面...")
				novels_spider(pageTotal);
			})
			.catch(function(err){console.log(err)})
		}
	})
}

main();




process.on("uncaughtException",function(err){
	console.log(err.stack);
})













