const path = require("path");
const express = require("express");
const request = require("request");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter, Users } = require("./db");
const { log, count } = require("console");
const schedule = require('node-schedule');



const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);


// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 更新计数
app.post("/api/count", async (req, res) => {
  const { action } = req.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }
  res.send({
    code: 0,
    data: await Counter.count(),
  });
});

app.get("/test", async function (req, res) {
  const { openid } = req.query;
  const info = await sendapi(openid);
  res.send(info);
})

app.post("/send", async function (req, res) {
  const { openid } = req.query // 通过get参数形式指定openid
  // 在这里直接是触发性发送，也可以自己跟业务做绑定，改成事件性发送
  const info = await sendapi(openid)
  res.send(info)
});


// 获取计数
app.get("/api/count", async (req, res) => {
  const result = await Counter.count();
  res.send({
    code: 0,
    data: result,
  });
});

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});


app.get("/send", async function (req, res) {
  const { openid } = req.query // 通过get参数形式指定openid
  // 在这里直接是触发性发送，也可以自己跟业务做绑定，改成事件性发送
  try {
    const jane = await Users.create({ opneid: openid })
    jane.opneid = openid
    await jane.save();
    console.log(jane.toJSON()); // 这样最好!
  } catch (error) {
    // console.log('用户ID添加数据库失败，可能是重复了', error);
  }
  res.send(openid)
});

async function sendapi(openid) {
  return new Promise((resolve, reject) => {
    request({
      url: "http://api.weixin.qq.com/cgi-bin/message/subscribe/send",
      method: "POST",
      body: JSON.stringify({
        touser: openid,
        template_id: "AvTEWA4L3QjYQVLNe_P-_jxg5dDMpNzn32v5B2JIXBk",
        miniprogram_state: "formal",
        data: {
          // 这里替换成自己的模板ID的详细事项，不要擅自添加或更改
          // 按照key前面的类型，对照参数限制填写，否则都会发送不成功
          // 
          thing3: {
            value: "签到奖励提醒",
          },
          thing1: {
            value: "未签到"
          },
          thing7: {
            value: "免费领取精美皮肤，还有超多钻石奖励！",
          },
        },
      }),
    }, function (error, res) {
      if (error) reject(error)
      resolve(res.body)
    });
  });
}

const port = process.env.PORT || 80;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
    scheduleCronstyle2()
  });
}

async function Messageing() {
  const users = await Users.findAll();
  console.log("All users:", JSON.stringify(users, null, 2));
  users.forEach((v, i) => {
    const openid = v.opneid;
    if (openid) {
      sendapi(openid);
    }
  })
}


const scheduleCronstyle = () => {
  //每天的早上十点钟定时执行一次: 
  let count = 1
  let test = schedule.scheduleJob('0 0 10 * * *', () => {
    console.log('定时器发送次数', count);
    count++;
  })


  setTimeout(() => {
    console.log('定时器取消')
    test.cancel();
  }, 10000);
}


const scheduleCronstyle2 = () => {
  let rule1 = new schedule.RecurrenceRule();
  rule1.dayOfWeek = [1, 2, 3, 4, 5, 6, 7];
  rule1.hour = [10]; // 每天10点开始推送   
  rule1.minute = [0];
  schedule.scheduleJob(rule1, () => {
    Messageing()
  });
}

bootstrap();
scheduleCronstyle()

