/**

1.从plan.txt中自动拉去本周工作任务
2.从SVN里自动拉取最新的前N（默认为3）条互不相同的提交记录，作为当天的任务。
3.自动补上N条本周工作任务中，当天分配的任务（根据时间顺序分配）；

 * analyse.js 最新n条日志 作者
**/
var util = require('util');
var trim = require('trim');
var SVN = require('svn');
var manba = require('manba');
var fs = require('fs');

var svn = new SVN('G:/SVN/NS');

var arguments = process.argv.splice(2);
var MINLOG = arguments&&arguments.length?Number(arguments[0]):3;
var AUTHOR = arguments&&arguments.length>1?arguments[1]:'zhangliyi';
var STEP = 5;
var MAXDEPTH=10;

var revs=[],minrevision = Number.MAX_VALUE;


var dps = function(i,endcallback){
	if(revs.length>=MINLOG||i>=MAXDEPTH) {
		revs = revs.slice(0,MINLOG);
		endcallback();
		return;
	}
	svn.log({limit: i*STEP}, (error, result) =>{
	
	if(error){console.log('error:'+error)}
	
	result.forEach((rev) =>{
		  var message = rev.message;
		  if(AUTHOR==rev.author&&rev.revision<minrevision&&!/^[\da-zA-Z]+$/.test(message)&&!revs.some(function(e){return e.message==message;})){//忽略纯数字的备注，备注与之前不重复
			  revs.push(rev);
			  minrevision=rev.revision;
		  }
	  });
	  
	  dps(i+1,endcallback);
	  
	});
}

var logger = function(){
	var log ="";
	var date = manba(new Date());
	var weekText = date.format("w");
	var monText = date.format("M");
	var dayText = date.format("DD");
	
	var weekStart = date.startOf(manba.WEEK).add(1,manba.DAY);
	var weekEnd = date.endOf(manba.WEEK).add(1,manba.DAY);
	var dayOfWeek = date.distance(weekStart);
	var autoAppendNum,counter;
	
	fs.readFile('plan.txt', 'utf8',(err, data) => {
	  if (err) {
		if (err.code === "ENOENT") {
		  console.error('本周工作计划文件 plan.txt 不存在');
		  return;
		} else {
		  throw err;
		}
	  }
		log += "本周计划（"+weekStart.format('YYYY')+"."+weekStart.format('M')+"."+weekStart.format('D')+"-"+
		weekEnd.format('YYYY')+"."+weekEnd.format('M')+"."+weekEnd.format('D')+"）\r\n";
		
		var plans = data.split(/[\n]/);
		
		plans = plans.filter((e)=>trim(e));
		
		autoAppendNum = Math.floor(plans.length/5);
		
		counter = 0;
		plans.forEach((plan) =>{
			log+=++counter+":"+trim(plan)+"\r\n";
		})
	  
		log += "\r\n日报\r\n周"+weekText+" "+monText+"-"+dayText+"\r\n";
		
		counter = 0;
		revs.forEach((rev,i) =>{
			var message = rev.message;
			log+=++counter+":"+message+"\r\n";
		})
		
		//自动补上周任务列表中相应时间点的任务（按顺序来）
		plans.slice(Math.round(autoAppendNum*dayOfWeek),
					Math.min(plans.length,Math.round(autoAppendNum*(dayOfWeek+1))))
					.forEach((plan)=>{
			log+=++counter+":"+trim(plan)+"\r\n";
		})
		
		var fileName = date.format('ll')+'.log';
		fs.writeFile(fileName, log, 'utf-8',(err) => {
		  if (err) {
			  console.log('error');
			  throw err;
		  }
		  console.log('');
		  console.log("****************** 日志输出成功 ，内容: **********************");
		  console.log(log);
		  console.log("******************  "+fileName+"  **********************");
		});
	});
	
	


}

dps(1,logger);

