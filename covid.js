const request = require("request");
const express = require("express");
var cors = require("cors");
const maria = require("mysql");
var parseString = require("xml2js").parseString;
var http = require("http");
var fs = require("fs");
const schedule = require("node-schedule");

const connection = maria.createConnection({
  //db연결
  host: "peerline.asuscomm.com",
  port: 3306,
  user: "root",
  password: "Root!@123",
  database: "pm25",
});
var app = express();

connection.connect(function (err) {
  if (!err) {
    console.log("Database is connected ... \n\n");
  } else {
    console.log("Error connecting database ... \n\n");
  }
});
//service api
app.get("/covid/data", function (request, response) {
  connection.query(
    "SELECT * FROM covid_data ORDER BY id DESC LIMIT 19;",
    function (err, rows, fields) {
      if (!err) {
        console.log("server use");
        response.send({
          msg: "ok",
          data: rows,
        });
      } else console.log("Error while performing Query.");
    }
  );
});

app.get("/covid/user", function (request, response) {
  console.log(request.query.email);
  console.log(request.query.password);

  connection.query(
    `SELECT * FROM kakao_data where email = '${request.query.email}' and password='${request.query.password}'`,
    function (err, rows, fields) {
      if (!err) {
        console.log(rows);
        if (rows.length == 0) {
          response.status(500).send();
          return;
        }
        console.log("server use");
        response.send({
          msg: "ok",
          data: rows,
        });
      } else {
        console.log("Error while performing Query.");
        response.status(500).send();
      }
    }
  );
});

app.use(express.json());

app.post("/covid/user", function (request, response) {
  // express 에서 post body 를 json 으로 전달 받아서 파싱방법 찾아봐...

  console.log(request.body.email);
  console.log(request.body.password);
  console.log(request.body.local);

  connection.query(
    `insert into kakao_data values('${request.body.email}', '${request.body.password}', '${request.body.local}');`,
    function (err, rows, fields) {
      if (!err) {
        console.log("insert data");
        response.send({
          msg: "ok",
          data: rows,
        });
      } else {
        console.log("Error while performing Query.");
        response.status(500).send();
      }
    }
  );
});

app.all("/*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

// CORS 설정
app.use(cors());

app.use(function (res, res, next) {
  res.status(404).send("not found\n");
});

app.listen(8081, function () {
  console.log("api server is open");
});

var refresh = schedule.scheduleJob("30 30 11 * * *", function () {
  //db에 api 저장
  request(
    "http://openapi.data.go.kr/openapi/service/rest/Covid19/getCovid19SidoInfStateJson?ServiceKey=ekKiNvyf4%2FZ7oaCqfwyU9QK%2BLyAEYf5AkAB1K%2BzlqhZsTPv07pHbCLoFu%2FTcEW28LAfDKfogWFu9U%2BRb4Y7rrw%3D%3D",
    function (error, response, body) {
      var xml = body;

      console.log(body);

      parseString(body, function (err, result) {
        for (a = 0; a < 19; a++) {
          dt = result.response.body[0].items[0].item[a].createDt[0];
          gubun = result.response.body[0].items[0].item[a].gubun[0];
          defCnt = result.response.body[0].items[0].item[a].defCnt[0];
          deathCnt = result.response.body[0].items[0].item[a].deathCnt[0];
          isolClearCnt =
            result.response.body[0].items[0].item[a].isolClearCnt[0];
          isolIngCnt = result.response.body[0].items[0].item[a].isolIngCnt[0];
          incDec = result.response.body[0].items[0].item[a].incDec[0];
          overFlowCnt = result.response.body[0].items[0].item[a].overFlowCnt[0];

          var sql =
            "INSERT INTO covid_data (dt,gubun,defCnt,deathCnt,isolClearCnt,isolIngCnt,incDec,overFlowCnt) VALUES(?,?,?,?,?,?,?,?)";
          var params = [
            dt,
            gubun,
            defCnt,
            deathCnt,
            isolClearCnt,
            isolIngCnt,
            incDec,
            overFlowCnt,
          ];
          connection.query(sql, params, function (err, rows, fields) {
            if (err) {
              console.log(err);
            } else {
              console.log(rows.insertId);
            }
          });
        }
      });
    }
  );
});
