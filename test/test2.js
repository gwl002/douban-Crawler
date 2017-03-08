var readline=require("readline")

var rl=readline.createInterface({
	input:process.stdin,
	output:process.stdout
})

rl.question("what do you think of nodejs?\n",function(answer){
	console.log("happy coding...",answer)
	rl.close()
})