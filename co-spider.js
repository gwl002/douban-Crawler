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
var co=require("co");

//配置请求体
var j=request.jar()
var headers={"User-Agent":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.101 Safari/537.36"}
var req=request.defaults({strictSSL:false,jar:j,headers:headers})

//登陆信息
var LOGIN_INFO={
	form_email:"gong.wenlan@163.com",
	form_password:"235813gwl002",
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
	nick=$("title").text().trim();
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

function *gen(){
	var captcha_id=yield get_captcha();
	yield compose_loginInfo(captcha_id);
	yield login();
	var user=yield get_userInfo();
	console.log(user);
	return ;
}


co(gen).catch(err=>{console.log(err)});
