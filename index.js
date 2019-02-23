const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
var multer = require('multer');

const app = express();
app.use(bodyParser.urlencoded({ extended: false}));

var upload = multer({ dest: 'upload/' });


try{
fs.accessSync(folder);
}catch(e){
fs.mkdirSync(folder);
}
};
var uploadFolder = './upload/';
createFolder(uploadFolder);
// 通過 filename 屬性定製
var storage = multer.diskStorage({
destination: function (req, file, cb) {
cb(null, uploadFolder);  // 儲存的路徑，備註：需要自己建立
},
filename: function (req, file, cb) {
// 將儲存檔名設定為 欄位名   時間戳，比如 logo-1478521468943
cb(null, file.fieldname   '-'   Date.now());
}
});
// 通過 storage 選項來對 上傳行為 進行定製化
var upload = multer({ storage: storage })



const apiRoutes = require('./routes/api');
app.use('/api/1.0/products',apiRoutes);

const db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'b0341009',
	database : 'stylish'
});

db.connect((err)=>{
  if(err){
    throw err;
  }
  console.log('MySQL connected...');
});

// app.get('/createdb',(req,res) =>{
//   let sql = 'create database stylish';
//   db.query(sql, (err, result)=>{
//     if(err) throw err;
//     console.log(result);
//     res.send('Database created.....');
//   });
// });
// app.get('/createtable', (req,res) =>{
//   let sql = "CREATE TABLE details(id VARCHAR(255) NOT NULL, title VARCHAR(255) NOT NULL, category VARCHAR(255) NOT NULL, description VARCHAR(255) NOT NULL, price int(10) NOT NULL, texture VARCHAR(255) NOT NULL, wash VARCHAR(255) NOT NULL, place VARCHAR(255) NOT NULL, note VARCHAR(255) NOT NULL, story VARCHAR(255) NOT NULL, main_image VARCHAR(255) NOT NULL, other_image1 VARCHAR(255), other_image2 VARCHAR(255), PRIMARY KEY (id))";
//   db.query(sql, (err,result)=>{
//     if(err) throw err;
//     console.log(result);
//     res.send('details table created.....');
//   })
// });
// app.get('/createtable2', (req,res) =>{
//   let sql = "CREATE TABLE variants(id bigint(20) NOT NULL, color_code int(12) NOT NULL, color_name VARCHAR(255) NOT NULL, sizes VARCHAR(255) NOT NULL, stock VARCHAR(255) NOT NULL, PRIMARY KEY (id))";
//   db.query(sql, (err,result)=>{
//     if(err) throw err;
//     console.log(result);
//     res.send('variants table created.....');
//   })
// });
//
// app.get('/createtable2', (req,res) =>{
//   let sql = "CREATE TABLE colors(id VARCHAR(255) NOT NULL, color_code VARCHAR(255) NOT NULL, color_name VARCHAR(255) NOT NULL)";
//   db.query(sql, (err,result)=>{
//     if(err) throw err;
//     console.log(result);
//     res.send('variants table created.....');
//   })
// });
//
// app.get('/adddd', (req,res) =>{
//   let product = {id:'201807202157', color_code:'334455', color_name:'淺棕'};
//   let sql = 'INSERT INTO colors SET ?';
//   let query = db.query(sql, product, (err,result)=>{
//     if(err) throw err;
//     res.send(result);
//
//   });
// });
//
app.get('/show', (req,res) =>{
  let sql = 'SELECT * FROM details';
  let query = db.query(sql, (err,result)=>{
    if(err) throw err;
    res.send(result);
  });
});

function creProduct(id, title, category, description, price, texture, wash, place, note, story ,main_image, other_image1, other_image2){
  let product = {id, title, category, description, price, texture, wash, place, note, story ,main_image, other_image1, other_image2};
  let sql = 'INSERT INTO details SET ?';
  let query = db.query(sql, product, (err,result)=>{
    if(err) throw err;
    console.log(result);
  });
}

function creVariants(id, color_code, color_name, sizes, stock){
  let variants = {id, color_code, color_name, sizes, stock};
  sql = 'INSERT INTO variants SET ?';
  query = db.query(sql, variants, (err,result)=>{
    if(err) throw err;
    console.log(result);
  });
}

function creColors(id, color_code, color_name){
  let colors = {id, color_code, color_name};
  sql = 'INSERT INTO colors SET ?';
  query = db.query(sql, colors, (err,result)=>{
    if(err) throw err;
    console.log(result);
  });
}

app.post('/add', upload.array('image', 3), (req,res,next)=>{
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
  let a, count, size, variants_S ,variants_M ,variants_L ,color_code ,color_name ,sizes, stock;
  let file = req.files;
  let main_image = req.files[0].path;
  let other_image1 = req.files[1].path;
  let other_image2 = req.files[2].path;
  creProduct(id, title, category, description, price, texture, wash, place, note, story, main_image, other_image1, other_image2);

  for(i=0; i<=counter; i++){
    count = "size"+i;
    size = req.body[count];
    variants_S = req.body.variants_S[i];
    variants_M = req.body.variants_M[i];
    variants_L = req.body.variants_L[i];
    color_code = req.body.color_code[i];
    color_name = req.body.color_name[i];
    creColors(id, color_code, color_name);
    for(k=0; k<=size.length; k++){
        if (size[k] === 'S'){
          sizes = 'S';
          stock = variants_S;
          creVariants(id, color_code, color_name, sizes, stock);
        } else if(size[k] === 'M') {
          sizes = 'M';
          stock = variants_M;
          creVariants(id, color_code, color_name, sizes, stock);
        } else if(size[k] === 'L') {
          sizes = 'L';
          stock = variants_L;
          creVariants(id, color_code, color_name, sizes, stock);
        }
    }
  }
  res.send("success!");
});

 app.get('/add', (req,res,next)=>{
   let sql = 'SELECT * FROM details';
   let query = db.query(sql, (err,results)=>{
     if(err) throw err;
     console.log(results);
     res.send('products fetched.....');
   });
 });

app.use('/admin', express.static('static'));
app.listen(3000, ()=> {
  console.log("Success!!!!!!");
});
