// @ts-nocheck
const links = require('../links.config');
const express = require('express');
const app = express();
const superagent= require('superagent');
const cheerio = require('cheerio');
const fs = require('fs');
const cson = require('cson');
const path = require('path');
const { exit } = require('process');
const options = require("../chart.option");


const filePath = path.resolve(__dirname,"../view.json");
//获取到links


const viewResult = [];
const date = new Date();
//循环请求数据，异步获取到列表,axios.promiseAll
const getVieCount = (link,index) => {
    // const link = links[0];
    if(!link){
        return index;
    }
    let viewCount = '' , articleTitle = '';
    superagent.get(link).end((err, res) => {
        if (err) {
            // 如果访问失败或者出错，会这行这里
            console.log(`掘金文本访问获取失败.... - ${link}`)
        } else {
            let $ = cheerio.load(res.text);
            const label = $('.views-count').text() || '';
            const arr = label.match(/\d+/);
            viewCount = arr && arr[0] || '';
            articleTitle = $('.article-title').text();
            console.log(`index:${index} --- viewCount:${viewCount},articleTitle:${articleTitle}`);
            if(articleTitle){
                viewResult.push({
                    count: viewCount,
                    title: articleTitle
                });
            }else {
                console.log(`index:${index},url:${link},没有获取到参数。。。。`);
            }
        }
        if(index === links.length -1){
            //存储数据到json文件中
            const localData = getViewData();
            const dateTime = `${date.getMonth() + 1}-${date.getDate()}`
            const newData = {
                ...localData,
            }
            newData[`${dateTime}`] = viewResult;
            writeDataToJson(filePath,viewResult);
            console.log("write data successs...will exit..");
            exit(0);
        }
    });
    return {
        count: viewCount,
        title: articleTitle
    }
}

function getViewData(){
    const json = fs.readFileSync(filePath);
    const localData = cson.parseJSONString(json) || {};
    return localData;
}

function createChartOptions(){
    const localData = getViewData();
    if(!localData){
        return '';
    }
    const keys =  Object.keys(localData);
    //通过最后一个，标记最新的
    const key = keys[keys.length - 1];
    const viewArray = localData[key];
     //文章标题
    const titles = viewArray.map(view => view.title);
    options.legend.data = titles;

    keys.forEach((key,day) => {
        options.xAxis.data = options.xAxis.data  || [];
        options.xAxis.data.push(`day_${day+1}`);
        const arr = localData[key];
        options.series = options.series || [];
        arr.map(item => {
            let chartItem = options.series.find(ser => ser.name === item.title );
            if(!chartItem){
                chartItem = {
                    name: item.title,
                    type: 'line',
                    stack: '阅读总量',
                };
                options.series.push(chartItem);
            }
            chartItem.data = chartItem.data || [];
            chartItem.data.push(parseInt(item.count));
        });
    });

    return options;
}

function writeDataToJson(filePath,newData){
    //先读取文件
    const newDataStr = cson.createJSONString(newData);
    fs.writeFileSync(filePath,newDataStr,(error,res)=> {
        if(!error){
            console.log("update viewCount success...");
            return;
        }
        console.log("update viewCount fail...",error);
    }); 
}

app.get('/view', async (req, res, next) => {
    links.forEach((link,index) => {
        const delay = 100*index;
        const timer = setTimeout(() => {
            clearTimeout(timer);
            getVieCount(link,index);
        },delay);
    });
    res.send("send request success....")
})


app.get('/option',async (req, res, next)  => {
     //根据数据，创建option
     const option = createChartOptions();
     res.send(option)
})

app.listen(3000,() => {
    console.log("app starting at port 3000....");
});