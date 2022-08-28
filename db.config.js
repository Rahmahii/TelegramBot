const mysql=require('mysql2')

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "###",
    database: 'Spiders'
  });

  con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
  });

  module.exports=con
