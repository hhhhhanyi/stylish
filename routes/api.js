const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const redis = require('redis');

const db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'JIOJ24dwq9_224HU_332IWDML',
	database : 'stylish'
});

const client = redis.createClient(); // this creates a new client
client.on('connect', () => {
  console.log('Redis client connected');
});

const json_sql = `select json_object('id',id,'title',title,'description',description,'price',price,'texture',texture,'wash',wash,'place',place,'note',note,'story',story,'main_image',main_image,
  'variants',(select GROUP_CONCAT(json_object('color_code',color_code,'size',sizes,'stock',stock)) from variants where details.id = variants.id),
  'colors',(select GROUP_CONCAT(json_object('code',color_code,'name',color_name)) from colors where details.id = colors.id),
  'images', json_array(other_image1,other_image2),'sizes',(select GROUP_CONCAT(DISTINCT sizes) from variants where details.id = variants.id))AS json from details`;

function format(num){
  let obj,arr;
  obj = JSON.parse(num.json);
  if (obj.sizes&&obj.variants&&obj.colors){
    obj.sizes = obj.sizes.split(",");
    arr = '['+ obj.variants + ']';
    arr = JSON.parse(arr);
    obj.variants = arr;
    arr = '['+ obj.colors + ']';
    arr = JSON.parse(arr);
    obj.colors = arr;
  }
  return(obj);
}

/* Products API */
router.get('/products/:id', (req, res) =>{
  // client.del('products_undefined');
  let url_params = req.params.id;
  let paging;
  if(req.query.paging){
    paging = parseInt(req.query.paging);
  }else {
    paging = 0;
  }
  if (url_params=='all' || url_params=='women' || url_params=='men' || url_params=='accessories' || url_params=='search'){
    let sql;
    client.get(`products_${url_params}_${paging}`, (error, result) => {
      if (error) throw error;
      if (!result){
        if (url_params=='women' || url_params=='men' || url_params=='accessories'){
          sql = json_sql + ` WHERE category = '`+ url_params +`'`;
        } else if (url_params=='search'){
          sql = json_sql + ` WHERE title LIKE '%`+ url_query +`%'`;
        } else if(url_params=='all'){
          sql = json_sql;
        }
        let query = db.query(sql, (err,results)=>{
          if(err) throw err;
          if (!results[0]) {
            res.send({"data":[]});
          }else{
            let page = parseInt(parseInt((results.length-1)/6+1));
            let count_1,count_2,count;
            let data = [];
            if (page == 1){
              if(paging){
                json = {"data":[]};
              } else{
                for(i=0;i<results.length;i++){
                  let obj = format(results[i]);
                  data.push(obj);
                  if (obj.sizes&&obj.variants&&obj.colors){
                    for(j=0;j<data[i].variants.length;j++){
                      data[i].variants[j].stock = parseInt(data[i].variants[j].stock);
                    }
                  }
                }
                json = {"data":data};
                client.set(`products_${url_params}_${paging}`, JSON.stringify(json), redis.print);
              }
            } else{
              if (paging+1>page){
                json = {"data":[]};
              }else{
                if(!paging){
                  paging = 0;
                }
                if(page == paging+1){
                  count_1 = results.length-(results.length%6);
                  count_2 = results.length-1;
                }else{
                  count_1 = paging*6;
                  count_2 = paging*6+5;
                }
                count = 0;
                for(i=count_1;i<=count_2;i++){
                  let obj = format(results[i]);
                  data.push(obj);
                  if (obj.sizes&&obj.variants&&obj.colors){
                      for(j=0;j<data[count].variants.length;j++){
                        data[count].variants[j].stock = parseInt(data[count].variants[j].stock);
                      }
                  }
                count +=1;
                }
                if(page == paging+1){
                  json = {"data":data};
                  client.set(`products_${url_params}_${paging}`, JSON.stringify(json), redis.print);
                }else{
                  json = {"data":data,"paging":paging+1};
                  client.set(`products_${url_params}_${paging}`, JSON.stringify(json), redis.print);
                }
              }
            }
            console.log(results.length);
            res.send(json);
          }
        });
      }else{
        res.send(JSON.parse(result));
      }
    });
  } else if(url_params=='details'){
      client.get(`details_${req.query.id}`, (error, result) => {
        if (error) throw error;
        if (!result){
          let sql = json_sql + ` WHERE id = '`+ req.query.id +`'`;
          let query = db.query(sql, (err,results)=>{
            if(err) throw err;
            if (!results[0]) {
              res.send({"data":[]});
            }else{
              let obj = format(results[0]);
              for(j=0;j<obj.variants.length;j++){
                obj.variants[j].stock = parseInt(obj.variants[j].stock);
              }
              json = {"data":obj};
              res.send(json);
              client.set(`details_${req.query.id}`, JSON.stringify(results), redis.print);
            }
          });
        }else{
          let obj = format(JSON.parse(result)[0]);
          for(j=0;j<obj.variants.length;j++){
            obj.variants[j].stock = parseInt(obj.variants[j].stock);
          }
          json = {"data":obj};
          res.send(json);
        }
      });
  } else {
      res.send({"error": "Invalid token."});
  }
});

/* Marketing API */
router.get('/marketing/campaigns', (req, res) =>{
  client.get('campaigns', (error, result) => {
    if (error) throw error;
    if (!result){
      let sql= `select * FROM campaigns`;
      let query = db.query(sql, (err,results)=>{
        if(err) throw err;
        res.send({ "data":results });
        client.set('campaigns', JSON.stringify(results), redis.print);
      });
    }else{
      res.send({ "data":JSON.parse(result)});
    }
  });
});

module.exports = router;

