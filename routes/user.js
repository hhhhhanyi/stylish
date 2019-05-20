const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const crypto = require('crypto');
const https = require('https');
const request = require('request');
const credentials = require('.././util/credentials.js');

const db = mysql.createConnection({
	host     : credentials.MYSQL.host,
	user     : credentials.MYSQL.user,
	password : credentials.MYSQL.password,
	database : 'stylish'
});

/* User API */
router.post('/user/signup', (req, res) =>{
	let data;
	let name = req.body.name;
	let email = req.body.email;
	let password = req.body.password;
	let token = crypto.randomBytes(24).toString('hex');
	let date = Date.now();
	res.cookie('access_token', token);

	let sql = 'SELECT * FROM users WHERE email="'+email+ '";';
	db.query(sql, (err,result)=>{
		if(err) throw err;
		if(result[0]){
			res.send("此 email 已註冊過。");
		}else{
			sql = 'INSERT INTO users (provider,name,email,password,access_token,access_expired) VALUES ("native","'+name+'","'+email+'","'+password+'","'+token+'","'+ date +'");';
			db.query(sql, (err,result)=>{
				if(err) throw err;
				if(result){
					sql = "select json_object('access_token',access_token,'access_expired',access_expired,'users', json_object('id',id,'provider',provider,'name',name,'email',email,'picture','http://schoolvoyage.ga/images/123498.png')) AS json from users  where email ='"+ email + "';";
					db.query(sql, (err,result)=>{
						if(err) throw err;
						if(result[0]){
							data = JSON.parse(result[0].json);
							res.json(data);
						}else{
							data = {"error": "Invalid request body."};
							res.json(data);
						}
					});
				}
			});
		}
	});
});

router.post('/user/signin', (req, res) =>{
	let data = req.body;
	let provider = data.provider;
	let email = data.email;
	let password = data.password;

	if(provider=="native"){ //判斷為 native signin
		let sql = 'SELECT * FROM users WHERE email="'+email+'" AND password="'+password+'" AND provider="'+provider+'";';
		db.query(sql, (err,result)=>{ //確認 email、password、provider
			if(err) throw err;
			if(result[0]){ //database已有資料，UPDATE access_token。
				let access_token = crypto.randomBytes(24).toString('hex');
				let access_expired = Date.now();
				sql = "UPDATE users SET access_token='" + access_token + "' ,access_expired = '" + access_expired + "' where email ='"+ email + "' AND password='"+password+"';";
				db.query(sql, (err,result)=>{
					if(err) throw err;
					if(result){ //更新成功，傳送json
						sql = "select json_object('access_token',access_token,'access_expired',access_expired,'users', json_object('id',id,'provider',provider,'name',name,'email',email,'picture','http://schoolvoyage.ga/images/123498.png')) AS json from users where email ='"+ email + "';";
						db.query(sql, (err,result)=>{
							if(err) throw err;
							if(result[0]){
								data = JSON.parse(result[0].json);
								res.json(data);
							}else{
								data = {"error": "Invalid request body."};
								res.json(data);
							}
						});
						res.cookie('access_token', access_token);
					}else{ //database沒有資料，請用戶重新登入。
						res.send("請重新登入");
					}
				});
			} else {
				res.send("帳號密碼輸入錯誤！");
			}
		});
	}else if(provider=="facebook"){ //判斷為 facebook signin
		let access_token = req.body.access_token;
		let graph_url = 'https://graph.facebook.com/me?fields=id,name,email,picture&access_token='+access_token;
		request(graph_url, function (error, response, body){
			let data_json = JSON.parse(body);
			let name = data_json.name;
			email = data_json.email;
			let picture = data_json.picture.data.url;
			let sql = 'SELECT * FROM users WHERE email="'+email+'" AND provider="'+provider+'";';
			db.query(sql, (err,result)=>{
				if(err) throw err;
				if(result[0]){ //database已有資料，UPDATE access_token。
					let access_expired = Date.now();
					sql = "UPDATE users SET access_token='" + access_token + "' ,access_expired = '" + access_expired + "' where email ='"+ email+"';";
					db.query(sql, (err,result)=>{
						if(err) throw err;
						if(result){ //更新成功，傳送json
							sql = "select json_object('access_token',access_token,'access_expired',access_expired,'users', json_object('id',id,'provider',provider,'name',name,'email',email,'picture', picture)) AS json FROM users WHERE email ='"+ email + "';";
							db.query(sql, (err,result)=>{
								if(err) throw err;
								if(result[0]){
									data = JSON.parse(result[0].json);
									res.cookie('access_token', access_token);
									res.json(data);
								} else{
									data = {"error": "Invalid request body."};
									res.json(data);
								}
							});
						} else{
							res.send("請重新登入");
						}
					});
				} else{ //database沒有資料，輸入provider,name,email,picture,access_token,access_expired。
					data_json = JSON.parse(body);
					name = data_json.name;
					email = data_json.email;
					picture = data_json.picture.data.url;
					let date = Date.now();
					sql = 'INSERT INTO users (provider,name,email,access_token,picture,access_expired) VALUES ("facebook","'+name+'","'+email+'","'+access_token+'","'+picture+'","'+date+'");';
					db.query(sql, (err,result)=>{ //輸入資料成功，傳送json
						if(err) throw err;
						if(result){
							sql = "select json_object('access_token',access_token,'access_expired',access_expired,'users', json_object('id',id,'provider',provider,'name',name,'email',email,'picture','http://schoolvoyage.ga/images/123498.png')) AS json from users where email ='"+ email + "';";
							db.query(sql, (err,result)=>{
								if(err) throw err;
								if(result){
									data = JSON.parse(result[0].json);
									res.cookie('access_token', access_token);
									res.json(data);
								} else{
									data = {"error": "Invalid request body."};
									res.json(data);
								}
							});
						} else{
							res.send("請重新登入");
						}
					});
				}
			});
		});
	}
});

router.post('/user/profile', (req,res) =>{
	let access_token = req.cookies.access_token;
	let access_expired = Date.now() - 360000;

	let sql = "select access_expired from users where access_token ='"+ access_token + "'";
	db.query(sql, (err,result)=>{
		if(err) throw err;
		if(result[0]){
			if (access_expired - result[0].access_expired > 0){
				console.log("no!");
				res.clearCookie("access_token");
			}
			sql = "select 'id',id,'provider',provider,'name',name,'email',email,'picture',picture from users where access_token ='"+ access_token + "'";
			db.query(sql, (err,result)=>{
				if(err) throw err;
				if(result[0]){
					res.send({ "data":result[0]});
				}else{
					res.send({"error": "Invalid request body."});
				}
			});
		}else{
			res.send({"error": "Invalid request body."});
		}
	});
});

router.post('/order/checkout', (req, res) => {
	let name = req.body.order.recipient.name;
	let phone = req.body.order.recipient.phone;
	let email = req.body.order.recipient.email;
	let address = req.body.order.recipient.address;
	let orders = {name, email, phone, address, status:"unpaid"};
	let sql = 'INSERT INTO orders SET ?';
	db.query(sql, orders ,(err,result)=>{
		if(err) throw err;
		if(result){
			let id = result.insertId;
          const post_data = {
              "prime": req.body.prime,
              "partner_key": "partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG",
              "merchant_id": "AppWorksSchool_CTBC",
              "amount": 1,
              "currency": "TWD",
              "order_number":id.toString(),
              "details": "An apple",
              "cardholder": {
                "phone_number": phone,
                "name": name,
                "email": email
              },
              "remember": true
          };
          const post_options = {
            host: 'sandbox.tappaysdk.com',
            port: 443,
            path: '/tpc/payment/pay-by-prime',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': 'partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG'
            }
          };
          const post_req = https.request(post_options, function(response) {
            response.setEncoding('utf8');
            response.on('data', function (body) {
              if (JSON.parse(body).status == 0){
                console.log(body);
                let sql = "UPDATE orders SET status = 'paid' WHERE id = '"+ id + "';";
                db.query(sql, (err,result)=>{
                  if(err) throw err;
                  if(result){
                    sql = "select id AS number from orders where id ='"+ id + "';";
                    db.query(sql, (err,result)=>{
                        if(err) throw err;
                        if(result){
                          res.json({"data":result[0]});
                        }else{
                          res.json({"error": "Invalid request body."});
                        }
                    });
                  }else{
                    res.send("資料庫傳送失敗");
                  }
                });
              }else{
                res.send("付款失敗！");
              }
            });
          });
          post_req.write(JSON.stringify(post_data));
          post_req.end();
        }else{
          res.json({"error": "Invalid request body."});
        }
    });
  });

  module.exports = router;
