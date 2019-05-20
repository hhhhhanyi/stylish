const express = require('express');
const app = express();

app.get('/test', (req,res,next)=>{
  res.send('success!!!!!');
});

app.listen(80, ()=> {
  console.log("Success!!!!!!");
});

