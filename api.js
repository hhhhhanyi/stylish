const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'b0341009',
	database : 'stylish'
});

const json_sql = `select json_object('id',id,'title',title,'description',description,'price',price,'texture',texture,'wash',wash,'place',place,'note',note,'story',story,'main_image',main_image,
  'images', json_array(other_image1,other_image2),
  'variants',(select GROUP_CONCAT(json_object('color_code',color_code,'size',sizes,'stock',stock)) from variants where details.id = variants.id),
  'colors',(select GROUP_CONCAT(json_object('code',color_code,'name',color_name)) from colors where details.id = colors.id),
  'sizes',(select GROUP_CONCAT(DISTINCT sizes) from variants where details.id = variants.id))AS json from details`;

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

router.get('/:id', (req, res) =>{
  let url_params = req.params.id;
  if (url_params=='all' || url_params=='women' || url_params=='men' || url_params=='accessories' || url_params=='search'){
    let sql;
    if (url_params=='all' || url_params=='women' || url_params=='men' || url_params=='accessories'){
      sql = json_sql + ` WHERE category = '`+ url_params +`'`;
    } else if (url_params=='search'){
      sql = json_sql + ` WHERE title LIKE '%`+ req.query.keyword +`%'`;
    }
    let query = db.query(sql, (err,results)=>{
      if(err) throw err;
      let page = parseInt(results.length/6)+1;
      for(k=1;k<=page;k++){
        let data = [];
        if (page == 1){
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
        } else{
          if(page == k){
            count = results.length%6-1;
          }else{
            count = 5;
          }
          for(i=0;i<=count;i++){
            let obj = format(results[i]);
            data.push(obj);
            if (obj.sizes&&obj.variants&&obj.colors){
              for(j=0;j<data[i].variants.length;j++){
                data[i].variants[j].stock = parseInt(data[i].variants[j].stock);
              }
            }
          }
          if (req.query.paging<=page){
            if(req.query.paging){
              page = req.query.paging;
            }else{
              page = 1;
            }
            json = {"data":data,"paging":parseInt(page)};
          }else {
            json = {"error": "Invalid token."};
          }
        }
      }
      res.send(json);
    });
  } else if(url_params=='details'){
      let sql = json_sql + ` WHERE id = '`+ req.query.id +`'`;
      let query = db.query(sql, (err,results)=>{
        if(err) throw err;
        let obj = format(results[0]);
        for(j=0;j<obj.variants.length;j++){
          obj.variants[j].stock = parseInt(obj.variants[j].stock);
        }
        json = {"data":obj};
        res.send(json);
      });
  } else if(url_params=='search'){
  } else {
      res.send({"error": "Invalid token."});
  }
});
module.exports = router;
