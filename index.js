const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const https = require('https');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const redis = require('redis');
const fs = require('fs');
const client = redis.createClient(); // this creates a new client


const app = express();
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());
app.set('httpsport', 443);
var secret = "hanyi0831";
var repo = "/home/hhhhhanyi/aws_cicd";

var options = {
	key: fs.readFileSync('/etc/letsencrypt/live/hhhhhanyi.com-0001/privkey.pem'),
	cert: fs.readFileSync('/etc/letsencrypt/live/hhhhhanyi.com-0001/cert.pem'),
	ca: fs.readFileSync('/etc/letsencrypt/live/hhhhhanyi.com-0001/chain.pem')
};
var httpsServer = https.createServer(options, app);
httpsServer.listen(app.get('httpsport'));


app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
const s3 = new aws.S3();

aws.config.update({
	accessKeyId: 'AKIAILYZAB6GNT5RRHFA',
	secretAccessKey: '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',
	region: 'us-east-2'
});

// const storage = multer.diskStorage({
// 	destination: function (req, file, cb) {
// 		cb(null, 'static/upload/');
// 	},
// 	filename: function (req, file, cb) {
// 		cb(null, Date.now() + '_' + file.originalname);
// 	}
// });
// const upload = multer({ storage: storage });
const apiRoutes = require('./routes/api');
const userRoutes = require('./routes/user');

app.use('/api/1.0',apiRoutes);
app.use('/api/1.0',userRoutes);

const db = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : 'JIOJ24dwq9_224HU_332IWDML',
	database : 'stylish'
});

client.on('connect', () => {
	console.log('Redis client connected');
});

db.connect((err)=>{
	if(err) throw err;
	console.log('MySQL connected...');
});

const upload = multer({
	storage: multerS3({
		s3: s3,
		bucket: 'hhhhhanyi',
		acl: 'public-read',
		key: function (req, file, cb) {
			cb(null, Date.now() + '_' + file.originalname);
		},
	})
});


function creProduct(id, title, category, description, price, texture, wash, place, note, story ,main_image, other_image1, other_image2){
	let product = {id, title, category, description, price, texture, wash, place, note, story ,main_image, other_image1, other_image2};
	let sql = 'INSERT INTO details SET ?';
	db.query(sql, product, (err,result)=>{
		if(err) throw err;
		console.log(result);
	});
}

function creVariants(id, color_code, color_name, sizes, stock){
	let variants = {id, color_code, color_name, sizes, stock};
	let sql = 'INSERT INTO variants SET ?';
	db.query(sql, variants, (err,result)=>{
		if(err) throw err;
		console.log(result);
	});
}

function creColors(id, color_code, color_name){
	let colors = {id, color_code, color_name};
	let sql = 'INSERT INTO colors SET ?';
	db.query(sql, colors, (err,result)=>{
		if(err) throw err;
		console.log(result);
	});
}

function creCampaigns(id, image, story){
	let campaigns = {id, image, story};
	let sql = 'INSERT INTO campaigns SET ?';
	db.query(sql, campaigns, (err,result)=>{
		if(err) throw err;
		console.log(result);
	});
}

app.post('/addCampaign', upload.single('image'), (req,res)=>{
	let id = req.body.id;
	let story = req.body.story;
	let image = req.file.location;
	let sql = 'SELECT * FROM details WHERE id = "' + id + '"';
	db.query(sql, (err,result)=>{
		if(err) throw err;
		if (!result[0]) {
			res.send("沒有此商品，請重新輸入!");
		}else{
			creCampaigns(id, image, story);
			client.del('campaigns');
			res.send("success!");
		}
	});
});

app.get('/addCampaign',(req,res)=>{
	res.redirect("/admin/campaign.html");
});

app.post('/addProduct', upload.array('image', 3), (req,res)=>{
	let id = req.body.id;
	let title = req.body.title;
	let category = req.body.category;
	let description = req.body.description;
	let price = req.body.price;
	let texture = req.body.texture;
	let wash = req.body.wash;
	let place = req.body.place;
	let note = req.body.note;
	let story = req.body.story;
	let counter = 0;
	if (req.body.hidden){
		counter = req.body.hidden;
	}
	let count, size, variants_S ,variants_M ,variants_L ,color_code ,color_name ,sizes, stock;
	let main_image = req.files[0].location;
	let other_image1 = req.files[1].location;
	let other_image2 = req.files[2].location;
console.log(req.files[0]);
console.log(req.files[2].location);
	creProduct(id, title, category, description, price, texture, wash, place, note, story, main_image, other_image1, other_image2);
	client.send_command("SCAN", [0,"MATCH", `products_${category}_*`], function(err, reply) {
		for(var k=0; k<reply[1].length; k++){
			client.del(reply[1][k]);
		}
	});

	client.send_command("SCAN", [0,"MATCH", `products_all_*`], function(err, reply) {
		if(reply[1].length){
			for(var k=0; k<reply[1].length; k++){
				client.del(reply[1][k]);
			}
		}
	});

	for(var i=0; i<=counter; i++){
		count = "size"+i;
		size = req.body[count];
		variants_S = req.body.variants_S[i];
		variants_M = req.body.variants_M[i];
		variants_L = req.body.variants_L[i];
		color_code = req.body.color_code[i];
		color_name = req.body.color_name[i];
		creColors(id, color_code, color_name);
		for(var k=0; k<=size.length; k++){
			if (size[k] === 'S'){
				sizes = 'S';
				stock = variants_S;
				creVariants(id, color_code, color_name, sizes, stock);
			} else if(size[k] === 'M'){
				sizes = 'M';
				stock = variants_M;
				creVariants(id, color_code, color_name, sizes, stock);
			} else if(size[k] === 'L'){
				sizes = 'L';
				stock = variants_L;
				creVariants(id, color_code, color_name, sizes, stock);
			}
		}
	}
	console.log(req.files[0].filename);
	res.send("success!");
});

app.get('/addProduct',(req,res)=>{
	res.redirect("/admin/product.html");
});

app.use('/', express.static('static'));
app.listen(80, ()=> {
	console.log("Success!!!!!!");
});
