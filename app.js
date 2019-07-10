var express = require('express');
var router = express.Router();
var User = require('./models/user');
var moment=require('moment');
const crypto = require('crypto');
const secret = 'abcdefg';

var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

// const server = 'www.indo123.co/';
// const server = 'http://localhost/';
const fs = require("fs");

const fileUpload = require('express-fileupload');

const path = require('path');
var ObjectId = require('mongodb').ObjectID;

const db = require("./db");
const collection = "todo";
const collection2 = "user";
const collection3 = "t";
const collection4 = "tuanzhang";
const collection5 = "joinmember";
const hi = "hi";

const app = express();




// Middleware for handling Error
// Sends Error Response Back to User
app.use((err, req, res, next) => {
    res.status(err.status).json({
        error: {
            message: err.message
        }
    });
})


db.connect((err) => {
    // If err unable to connect to database
    // End application
    if (err) {
        console.log('unable to connect to database');
        process.exit(1);
    }
    // Successfully connected to database
    // Start up our Express Application
    // And listen for Request
    else {
        app.listen(6666, () => {

            console.log('connected to database, app listening on port 6666');
        });
    }
});





// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
//   });
// parses json data sent to us by the user 
app.use(bodyParser.json({
    limit: '50mb',
    extended: true
}));

app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000

}));



// connect to MongoDB

mongoose.connect('mongodb://admin:2867337AaXc@localhost:27017/backend?authSource=admin');
// mongoose.connect("mongodb://root:261500Aa@localhost:27017/crud_mongodb?authSource=admin")
var db2 = mongoose.connection;

//handle mongo error
db2.on('error', console.error.bind(console, 'connection error:'));
db2.once('open', function() {
    console.log('success')
});

// use sessions for tracking logins
app.use(session({
    secret: 'work hard',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
        mongooseConnection: db2
    })
}));


app.use('/', router);

//POST route for updating data
router.post('/login', function(req, res, next) {
  
    if (req.body.logemail && req.body.logpassword) {//login
        User.authenticate(req.body.logemail, req.body.logpassword, function(error, user) {
            if (error || !user) {
            var err = new Error('Wrong email or password.');
            err.status = 401;
            return next(err);
            } else {
            req.session.userId = user._id;
            res.json({userId:req.session.userId})
            // return res.redirect('/profile');
            }
        });
    } else {
      var err = new Error('All fields required.');
      err.status = 400;
      return next(err);
    }
  })
  




//POST route for updating data
router.post('/register', function(req, res, next) {
    // confirm that user typed same password twice
    if (req.body.password !== req.body.passwordConf) {
      var err = new Error('Passwords do not match.');
      err.status = 400;
      res.send("passwords dont match");
      return next(err);
    }
  
    if (req.body.email &&
      req.body.username &&
      req.body.password &&
      req.body.passwordConf) {//register
  
      var userData = {
        email: req.body.email,
        username: req.body.username,
        password: req.body.password,
        leftRatio:0.5,
        a:50,
        coin:0
      }
  
      User.create(userData, function(error, user) {
        if (error) {
          return next(error);
        } else {
          req.session.userId = user._id;
          // return res.redirect('/profile');
          res.json({
            msg:'register success'
          })
        }
      });
  
    } else {
      var err = new Error('All fields required.');
      err.status = 400;
      return next(err);
    }
  })
  





  // GET route after registering
  router.post('/successLog', function(req, res, next) {
        
        User.findById(req.session.userId)
        .exec(function(error, user) {
          if (error) {
            return next(error);
          } else {
            if (user === null) {
              res.json({
                msg:'please log in',
                status:false
              })
            } else {
              res.json({
                user:user,
                status:true
              })
            }
          }
        });


  });
  
  

  
  // GET for logout logout
  router.post('/logout', function(req, res, next) {
    if (req.session) {
      // delete session object
      req.session.destroy(function(err) {
        if (err) {
          return next(err);
        } else {
          // return res.redirect('/');
          res.json({
            msg:'log out'
          })
        }
      });
    }
  });




  app.get('/coinbase',(req,res)=>{

    db.getDB().collection('coinbase').insertOne({coinbase:crypto.createHmac('sha1', secret).update('name1234').digest('hex'),isValid:1}, (err, result) => { //加入成员表
        res.json({message:'success'})
    });
})



//admin top up
app.post('/topup', (req, res) => {

    var key = req.body.key;
    var userId=req.body.userId;

    db.getDB().collection('coinbase').find({
        coinbase: key
    }).toArray((err, documents) => {
        if(documents.length==0){
            res.json({message:'no key'})
        }else{
            if(documents[0].isValid==0){
                res.json({message:'already used'})
            }else{
                db.getDB().collection('coinbase').updateOne({
                    coinbase: key
                },{
                    $set: {
                        isValid: 0
                    }
                },(err, res) => {
                    db.getDB().collection('transferHistory').insertOne({userId:userId,coin:100,type:'topup'}, (err, result)=>{
                        res.json({message:'success'})
                    })
                })
            }
            
        }
    })
});


app.post('/consume', (req, res) => {
    var userId=req.body.userId;
    db.getDB().collection('transferHistory').insertOne({userId:userId,coin:-1,type:'consume'}, (err, result)=>{
        res.json({
            result:result
        })
    })
})



//my coin
app.post('/mycoin', (req, res) => {

    var userId = req.body.userId;
    db.getDB().collection('transferHistory').find({
        userId: userId
    }).toArray((err, documents) => {
        var coin=0;
        for(let i=0;i<documents.length;i++){
            coin=coin+documents[i].coin;
        }
        res.json({transferHistory:documents,totalCoin:coin})
    })






});











// // serve static html file to user
// // app.get('/', (req, res) => {
// //     res.sendFile(path.join(__dirname, 'index.html'));
// // });




app.post('/userEquity', function(req, res) {

    db.getDB().collection('users').find({
        _id: new ObjectId(req.body.user._id)
    }).toArray((err, documents) => {        
        res.json({
            leftRatio:documents[0].leftRatio,
            a:documents[0].a,
        })
    })
})




app.post('/getPriority', function(req, res) {
    res.json({
        leftRatio:0.7,
        a:10
    })
})






app.post('/findPhoto', function(req, res) {

    db.getDB().collection('photo').find({
    }).sort({createAt:1}).toArray((err, documents) => {        
        res.json({
            photo:documents
        })
    })
})


app.post('/findMovie', function(req, res) {

    db.getDB().collection('movie').find({
    }).sort({createAt:1}).toArray((err, documents) => {        
        res.json({
            movie:documents
        })
    })
})
// default options
app.use(fileUpload());

app.post('/uploadmovie', function(req, res) {
    if (Object.keys(req.files).length == 0) {
        return res.status(400).send('No files were uploaded.');
    }

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let sampleFile = req.files.sampleFile;
    // let name = req.files.sampleFile.name.replace(/\s+/g,"");
    let name = req.files.sampleFile.name;
    var imgSuffix=name.split('.')[name.split('.').length-1];
    name = crypto.createHmac('sha1', secret)
                   .update(name)
                   .digest('hex');
    name=name+'.'+imgSuffix
    // name = name.replace(/\-+/g,"");
    // name = name.replace(/\.+/g,"");

    // name=name.substring(0, 10);

    // name=name+'.'+imgSuffix
    console.log(req.files)
    // Use the mv() method to place the file somewhere on your server
    // sampleFile.mv('./clip/Blur/' + name, function(err) {
    //     res.json({imageUrl:'https://www.indo123.co/clip/Blur/' + name,imgName:name});
    // });

    sampleFile.mv('/usr/local/var/www/frontend/movie/base/' + name, function(err) {
        console.log(name)
        db.getDB().collection('movie').insertOne({name:name,createAt:new Date(),uploadBy:'root'}, (err, result) => { //加入成员表

            res.json({imageUrl:'http://localhost/frontend/movie/base/' + name,imgName:name});


        });
    });    
});

app.post('/upload', function(req, res) {
    if (Object.keys(req.files).length == 0) {
        return res.status(400).send('No files were uploaded.');
    }

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let sampleFile = req.files.sampleFile;
    // let name = req.files.sampleFile.name.replace(/\s+/g,"");
    let name = req.files.sampleFile.name;
    var imgSuffix=name.split('.')[name.split('.').length-1];
    name = crypto.createHmac('sha1', secret)
                   .update(name)
                   .digest('hex');
    name=name+'.'+imgSuffix
    // name = name.replace(/\-+/g,"");
    // name = name.replace(/\.+/g,"");

    // name=name.substring(0, 10);

    // name=name+'.'+imgSuffix
    console.log(req.files)
    // Use the mv() method to place the file somewhere on your server
    // sampleFile.mv('./clip/Blur/' + name, function(err) {
    //     res.json({imageUrl:'https://www.indo123.co/clip/Blur/' + name,imgName:name});
    // });

    sampleFile.mv('/usr/local/var/www/frontend/clip/second/' + name, function(err) {
        console.log(name)
        db.getDB().collection('photo').insertOne({name:name,createAt:new Date(),uploadBy:'root'}, (err, result) => { //加入成员表

            res.json({imageUrl:'http://localhost/frontend/clip/second/' + name,imgName:name});


        });
    });    
});




//base64
app.post('/base64', (req, res) => {

    var base64Data = req.body.base64.replace(/^data:image\/png;base64,/, "");

    // fs.writeFile('./clip/Blur/first/'+req.body.imgName, base64Data, {
    //     encoding: 'base64'
    // }, function(err) {
    //     console.log(err);
    //     res.json({
    //         msg:'success uploaded base64'
    //     })
    // });

    fs.writeFile('/usr/local/var/www/frontend/clip/first/'+req.body.imgName, base64Data, {
        encoding: 'base64'
    }, function(err) {
        console.log(err);
        res.json({
            msg:'success uploaded base64'
        })
    });

});























//seed
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './dist/seed.html'));
})




//参加团
app.post('/seed', (req, res) => {

    db.getDB().collection(collection3).find({
        _id: new ObjectId(req.body.t)
    }).toArray((err, documents) => {

        let tuanzhangId = documents[0].t;



        db.getDB().collection(collection5).find({
            memberPhone: req.body.memberPhone
        }).toArray((err, documents) => {
            if (documents.length == 0) { //是新成员

                console.log('new')
                //判断当前的团是否满了
                db.getDB().collection(collection3).find({
                    _id: new ObjectId(req.body.t)
                }).toArray((err, documents) => {

                    if (documents[0].m.length < 10) { //没有满
                        console.log('not full join')
                        req.body.tuanId = req.body.t;
                        req.body.joinedt = [req.body.t];
                        req.body.time = 1; //第一次参加
                        req.body.tuanzhangId = tuanzhangId;

                        db.getDB().collection(collection3).updateOne({ //进入抽奖表
                            _id: new ObjectId(req.body.t)
                        }, {
                            $push: {
                                m: req.body
                            }
                        }, {
                            returnOriginal: false
                        }, (err, result) => {
                            db.getDB().collection(collection5).insertOne(req.body, (err, result) => { //加入成员表

                                res.json({
                                    msg: "success!",
                                    error: null
                                });

                            });

                        });



                    } else { //当前的团已经满了
                        console.log('full')
                        res.json({
                            msg: "full!",
                            error: null
                        });




                    }
                });
            } else { //是老成员，已经参加过
                console.log('old')
                const joinedts = documents[0].joinedt;

                let existSameT = joinedts.filter((joinedt) => {
                    return joinedt == req.body.t
                });//参加过这个团


                //查询参加次数
                let joinTime = documents[0].time
                //判断当前的团是否满了
                db.getDB().collection(collection3).find({
                    _id: new ObjectId(req.body.t)
                }).toArray((err, documents) => {


                    if (documents[0].m.length < 10) { //当前的团没有满


                        if (existSameT.length > 0) { //加入过同一个团
                            res.json({
                                msg: 'existed'
                            })
                        } else {//没有加入过这个团

                            console.log('not full join')
                            req.body.tuanId = req.body.t;
                            req.body.time = ++joinTime; //参加次数更新
                            req.body.tuanzhangId = tuanzhangId;



                            db.getDB().collection(collection3).updateOne({ //进入抽奖表
                                _id: new ObjectId(req.body.t)
                            }, {
                                $push: {
                                    m: req.body
                                }
                            }, {
                                returnOriginal: false
                            }, (err, result) => { //更新成员表



                                db.getDB().collection(collection5).updateOne({
                                    memberPhone: req.body.memberPhone
                                }, {
                                    $set: {
                                        time: req.body.time
                                    },
                                    $push: {
                                        joinedt: req.body.t
                                    }
                                }, (err, result) => {
                                    console.log(req.body.time)
                                    res.json({
                                        msg: "success!",
                                        error: null
                                    });
                                })



                            });



                        }

                    } else { //当前的团已经满了
                        console.log('full')

                        res.json({
                            msg: "full!",
                            error: null
                        });

                    }
                });



            }


        });
    })



});




//dave团长
app.get('/dave', (req, res) => {
    res.sendFile(path.join(__dirname, './dist/dave.html'));
});

// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, './dist/dave.html'));
// });

app.get('/mn', (req, res) => {
    res.sendFile(path.join(__dirname, 'mn.html'));
});

app.get('/cc', (req, res) => {
    res.sendFile(path.join(__dirname, 'cc.html'));
});






//抽奖
app.post('/davec', (req, res) => {

    db.getDB().collection(collection3).find({
        _id: new ObjectId(req.body.t)
    }).toArray((err, documents) => {
        if (documents[0] && documents[0].haveWinner) {
            res.json(documents[0].haveWinner)

        } else {

            let r = getRandomInt(0, 9);

            let w = documents[0].m;

            let winner = w[r];



            db.getDB().collection(collection3).updateOne({
                _id: new ObjectId(req.body.t)
            }, {
                $set: {
                    haveWinner: winner
                }
            }, (err, result) => {
                res.json(winner);

            })



        }

    })



});


//参加团
app.post('/davet', (req, res) => {

    db.getDB().collection(collection3).find({
        _id: new ObjectId(req.body.t)
    }).toArray((err, documents) => {

        let tuanzhangId = documents[0].t;



        db.getDB().collection(collection5).find({
            memberPhone: req.body.memberPhone
        }).toArray((err, documents) => {
            if (documents.length == 0) { //是新成员

                console.log('new')
                //判断当前的团是否满了
                db.getDB().collection(collection3).find({
                    _id: new ObjectId(req.body.t)
                }).toArray((err, documents) => {

                    if (documents[0].m.length < 10) { //没有满
                        console.log('not full join')
                        req.body.tuanId = req.body.t;
                        req.body.joinedt = [req.body.t];
                        req.body.time = 1; //第一次参加
                        req.body.tuanzhangId = tuanzhangId;

                        db.getDB().collection(collection3).updateOne({ //进入抽奖表
                            _id: new ObjectId(req.body.t)
                        }, {
                            $push: {
                                m: req.body
                            }
                        }, {
                            returnOriginal: false
                        }, (err, result) => {
                            db.getDB().collection(collection5).insertOne(req.body, (err, result) => { //加入成员表

                                res.json({
                                    msg: "success!",
                                    error: null
                                });

                            });

                        });



                    } else { //当前的团已经满了
                        console.log('full')

                        //查看当前团长是否有没有满的团
                        db.getDB().collection(collection3).find({
                            t: tuanzhangId
                        }).toArray((err, documents) => {
                            let notfull = documents.filter((document) => {
                                return document.m.length < 10
                            });
                            if (notfull.length > 0) { //存在没有满的团
                                let existedTuanId = notfull[0]._id;

                                req.body.tuanzhangId = tuanzhangId;
                                req.body.tuanId = existedTuanId;
                                req.body.joinedt = [existedTuanId];

                                req.body.time = 1; //第一次参加

                                db.getDB().collection(collection3).updateOne({ //进入抽奖表
                                    _id: new ObjectId(existedTuanId)
                                }, {
                                    $push: {
                                        m: req.body
                                    }
                                }, {
                                    returnOriginal: false
                                }, (err, result) => {
                                    db.getDB().collection(collection5).insertOne(req.body, (err, result) => { //加入成员表


                                        res.json({
                                            full: true,
                                            msg: "dave?t=" + existedTuanId,
                                            error: null
                                        });

                                    });

                                });

                            } else { //当前团长的团都满了

                                db.getDB().collection(collection3).insertOne({ //创建抽奖表
                                    t: tuanzhangId,
                                    m: [{
                                        tuanzhangId: tuanzhangId,
                                        memberPhone: tuanzhangId,
                                        memberName: tuanzhangId,
                                        time: 1,
                                        tuanId: '',
                                        role: 'tuanzhang'

                                    }]
                                }, (err, result) => {
                                    //返回团id
                                    let newTuanId = result.insertedId;
                                    let newTuanIdString = newTuanId.toString();
                                    req.body.tuanId = newTuanId;
                                    req.body.joinedt = [newTuanIdString];

                                    req.body.time = 1; //第一次参加
                                    req.body.tuanzhangId = tuanzhangId;


                                    db.getDB().collection(collection3).updateOne({ //进入抽奖表
                                        _id: new ObjectId(newTuanId)
                                    }, {
                                        $push: {
                                            m: req.body
                                        }
                                    }, {
                                        returnOriginal: false
                                    }, (err, result) => {

                                        db.getDB().collection(collection5).insertOne(req.body, (err, result) => { //加入成员表

                                            res.json({
                                                full: true,
                                                msg: "dave?t=" + newTuanId,
                                                error: null
                                            });

                                        });
                                    });

                                });

                            }


                        });



                    }
                });
            } else { //是老成员，已经参加过
                console.log('old')
                const joinedts = documents[0].joinedt;

                let existSameT = joinedts.filter((joinedt) => {
                    return joinedt == req.body.t
                });//参加过这个团


                //查询参加次数
                let joinTime = documents[0].time
                //判断当前的团是否满了
                db.getDB().collection(collection3).find({
                    _id: new ObjectId(req.body.t)
                }).toArray((err, documents) => {


                    if (documents[0].m.length < 10) { //当前的团没有满


                        if (existSameT.length > 0) { //加入过同一个团
                            res.json({
                                msg: 'existed'
                            })
                        } else {//没有加入过这个团

                            console.log('not full join')
                            req.body.tuanId = req.body.t;
                            req.body.time = ++joinTime; //参加次数更新
                            req.body.tuanzhangId = tuanzhangId;



                            db.getDB().collection(collection3).updateOne({ //进入抽奖表
                                _id: new ObjectId(req.body.t)
                            }, {
                                $push: {
                                    m: req.body
                                }
                            }, {
                                returnOriginal: false
                            }, (err, result) => { //更新成员表



                                db.getDB().collection(collection5).updateOne({
                                    memberPhone: req.body.memberPhone
                                }, {
                                    $set: {
                                        time: req.body.time
                                    },
                                    $push: {
                                        joinedt: req.body.t
                                    }
                                }, (err, result) => {
                                    console.log(req.body.time)
                                    res.json({
                                        msg: "success!",
                                        error: null
                                    });
                                })



                            });



                        }

                    } else { //当前的团已经满了
                        console.log('full')

                        //查看当前团长是否有其他没有满的团
                        db.getDB().collection(collection3).find({
                            t: tuanzhangId
                        }).toArray((err, documents) => {
                            let notfull = documents.filter((document) => {
                                return document.m.length < 10
                            });//其他没有满的团


                            if (notfull.length > 0) { //当前团长，存在没有满的团

                                Array.prototype.remove = function(val) {
                                    var index = this.indexOf(val);
                                    if (index > -1) {
                                        this.splice(index, 1);
                                    }
                                };
                                var notExistSameT = [];
                                for (let i = 0; i < notfull.length; i++) {
                                    notExistSameT.push(notfull[i]._id.toString())
                                }

                                console.log(notExistSameT)//没有满的团
                                console.log(joinedts)//加入过的团

                                for (let i = 0; i < joinedts.length; i++) {

                                    notExistSameT.remove(joinedts[i].toString())//没有满的团，去除加入过的团
                                }

                                console.log(notExistSameT)//没有满的团，并且没有加入过的团



                                //存在没加入过的团

                                if (notExistSameT.length > 0) {

                                    let existedTuanId = notExistSameT[0];//从第一个，没有满的团，并且没有加入过的团，开始
                                    console.log(existedTuanId)

                                    req.body.tuanzhangId = tuanzhangId;
                                    req.body.tuanId = existedTuanId;
                                    req.body.time = ++joinTime; //参加次数更新

                                    db.getDB().collection(collection3).updateOne({ //进入抽奖表
                                        _id: new ObjectId(existedTuanId)
                                    }, {
                                        $push: {
                                            m: req.body
                                        }
                                    }, {
                                        returnOriginal: false
                                    }, (err, result) => { //更新成员表



                                        db.getDB().collection(collection5).updateOne({
                                            memberPhone: req.body.memberPhone
                                        }, {
                                            $set: {
                                                time: req.body.time
                                            },

                                            $push: {
                                                joinedt: existedTuanId
                                            }
                                        }, (err, result) => {

                                            res.json({
                                                full: true,
                                                msg: "dave?t=" + existedTuanId,
                                                error: null
                                            });
                                        })

                                    });

                                } else {//所有团都加入过

                                    res.json({
                                        msg: 'existed'
                                    })
                                }


                            } else { //当前团长的团都满了

                                db.getDB().collection(collection3).insertOne({ //创建抽奖表
                                    t: tuanzhangId,
                                    m: [{
                                        tuanzhangId: tuanzhangId,
                                        memberPhone: tuanzhangId,
                                        memberName: tuanzhangId,
                                        time: 1,
                                        tuanId: '',
                                        role: 'tuanzhang'

                                    }]
                                }, (err, result) => {
                                    //返回团id
                                    let newTuanId = result.insertedId;
                                    let newTuanIdInserted = result.insertedId.toString()
                                    req.body.tuanId = newTuanId;
                                    req.body.time = ++joinTime; //参加次数更新
                                    req.body.tuanzhangId = tuanzhangId;


                                    db.getDB().collection(collection3).updateOne({ //进入抽奖表
                                        _id: new ObjectId(newTuanId)
                                    }, {
                                        $push: {
                                            m: req.body
                                        }
                                    }, {
                                        returnOriginal: false
                                    }, (err, result) => { //更新成员表



                                        db.getDB().collection(collection5).updateOne({
                                            memberPhone: req.body.memberPhone
                                        }, {
                                            $set: {
                                                time: req.body.time
                                            },
                                            $push: {
                                                joinedt: newTuanIdInserted
                                            }
                                        }, (err, result) => {

                                            res.json({
                                                full: true,
                                                msg: "dave?t=" + newTuanId,
                                                error: null
                                            });
                                        })


                                    });

                                });

                            }


                        });



                    }
                });



            }


        });
    })



});



//设置团的详情
app.get('/setd', (req, res) => {
    res.sendFile(path.join(__dirname, 'setd.html'));
});



app.post('/setd', (req, res) => { //设置每个团开奖时间，团的图片对象数组



    console.log(req.body.endDate)
    console.log(req.body)


    db.getDB().collection(collection3).updateOne({
        _id: new ObjectId(req.body.t)
    }, {
        $set: {
            endDate: req.body.endDate,
            imgUrl: req.body.imgUrl,
            videoUrl: req.body.videoUrl
        }
    }, (err, result) => {
        res.json(result);

    })



});




//whatstime
app.post('/whatstime',(req,res)=>{
    res.json({
        whatstime:moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
    })
})

//倒计时
//倒计时开奖
// let endDate = new Date("2019-04-28 03:06:00");
// let nowDate=new Date();
// let diffSecond = parseInt((endDate-nowDate)/1000); //结束时间到现在差的秒数



app.post('/getT', (req, res) => { //查询每个团开奖时间，团的图片对象数组


    let result = {};

    db.getDB().collection(collection3).find({
        _id: new ObjectId(req.body.t)
    }).toArray((err, documents) => {
        if (documents.length == 0) { //团不存在

        } else {
            if (documents[0].endDate) {
                result.diffSecond = parseInt((new Date(documents[0].endDate) - new Date()) / 1000);
                
            } else {
                result.diffSecond = parseInt((new Date("2019-04-28 17:55:50") - new Date()) / 1000)

            }

            if (documents[0].imgUrl) {
                result.imgUrl = documents[0].imgUrl

            } else {
                result.imgUrl = []
            }

            if (documents[0].videoUrl) {
                result.videoUrl = documents[0].videoUrl

            } else {
                result.videoUrl = []
            }

            res.json(result);

        }
    })


});



app.get('/hi', (req, res) => {
    res.sendFile(path.join(__dirname, 'hi.html'));
});


//参加团
app.post('/hi', (req, res) => {

    db.getDB().collection(collection3).find({
        _id: new ObjectId(req.body.t)
    }).toArray((err, documents) => {

        let tuanzhangId = documents[0].t;



        db.getDB().collection(collection5).find({
            memberPhone: req.body.memberPhone
        }).toArray((err, documents) => {
            if (documents.length == 0) { //是新成员


                //判断当前的团是否满了
                db.getDB().collection(collection3).find({
                    _id: new ObjectId(req.body.t)
                }).toArray((err, documents) => {


                    if (documents[0].m.length < 10) { //没有满
                        console.log('not full join')
                        req.body.tuanId = req.body.t;
                        req.body.time = 1; //第一次参加
                        req.body.tuanzhangId = tuanzhangId;

                        db.getDB().collection(collection3).updateOne({ //进入抽奖表
                            _id: new ObjectId(req.body.t)
                        }, {
                            $push: {
                                m: req.body
                            }
                        }, {
                            returnOriginal: false
                        }, (err, result) => {
                            db.getDB().collection(collection5).insertOne(req.body, (err, result) => { //加入成员表

                                res.json({
                                    msg: "success!",
                                    error: null
                                });

                            });

                        });



                    } else { //当前的团已经满了
                        console.log('full')

                        //查看当前团长是否有没有满的团
                        db.getDB().collection(collection3).find({
                            t: tuanzhangId
                        }).toArray((err, documents) => {
                            let notfull = documents.filter((document) => {
                                return document.m.length < 10
                            });
                            if (notfull.length > 0) { //存在没有满的团
                                let existedTuanId = notfull[0]._id;

                                req.body.tuanzhangId = tuanzhangId;
                                req.body.tuanId = existedTuanId;
                                req.body.time = 1; //第一次参加

                                db.getDB().collection(collection3).updateOne({ //进入抽奖表
                                    _id: new ObjectId(existedTuanId)
                                }, {
                                    $push: {
                                        m: req.body
                                    }
                                }, {
                                    returnOriginal: false
                                }, (err, result) => {
                                    db.getDB().collection(collection5).insertOne(req.body, (err, result) => { //加入成员表


                                        res.json({
                                            full: true,
                                            msg: "tuan?t=" + existedTuanId,
                                            error: null
                                        });

                                    });

                                });

                            } else { //当前团长的团都满了

                                db.getDB().collection(collection3).insertOne({ //创建抽奖表
                                    t: tuanzhangId,
                                    m: [{
                                        tuanzhangId: tuanzhangId,
                                        memberPhone: tuanzhangId,
                                        memberName: tuanzhangId,
                                        time: 1,
                                        tuanId: '',
                                        role: 'tuanzhang'

                                    }]
                                }, (err, result) => {
                                    //返回团id
                                    let newTuanId = result.insertedId;
                                    req.body.tuanId = newTuanId;
                                    req.body.time = 1; //第一次参加
                                    req.body.tuanzhangId = tuanzhangId;


                                    db.getDB().collection(collection3).updateOne({ //进入抽奖表
                                        _id: new ObjectId(newTuanId)
                                    }, {
                                        $push: {
                                            m: req.body
                                        }
                                    }, {
                                        returnOriginal: false
                                    }, (err, result) => {

                                        db.getDB().collection(collection5).insertOne(req.body, (err, result) => { //加入成员表

                                            res.json({
                                                full: true,
                                                msg: "tuan?t=" + newTuanId,
                                                error: null
                                            });

                                        });
                                    });

                                });

                            }


                        });



                    }
                });
            } else {
                res.json({
                    msg: "exist!!!",
                    error: null,
                });
            }


        });
    })



});


//查询现在的团
app.post('/hit', (req, res) => {
    db.getDB().collection(collection3).find({
        _id: new ObjectId(req.body.t)
    }).toArray((err, documents) => {

        res.json(documents[0]);


    });

});



//抽奖
app.post('/hiBtn', (req, res) => {


    db.getDB().collection(collection3).find({
        _id: new ObjectId(req.body.t)
    }).toArray((err, documents) => {
        if (documents[0] && documents[0].haveWinner) {


        } else {

            let r = getRandomInt(0, 9);

            let w = documents[0].m;

            let winner = w[r];



            db.getDB().collection(collection3).updateOne({
                _id: new ObjectId(req.body.t)
            }, {
                $set: {
                    haveWinner: winner
                }
            }, (err, result) => {
                res.json(winner);

            })



        }



    });


});



/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}



//抽奖
app.post('/choujiangBtn', (req, res) => {



    db.getDB().collection(collection3).find({
        _id: new ObjectId(req.body.t)
    }).toArray((err, documents) => {
        if (documents[0] && documents[0].haveWinner) {


        } else {

            let r = getRandomInt(0, 9);

            let w = documents[0].m;

            let winner = w[r];



            db.getDB().collection(collection3).updateOne({
                _id: new ObjectId(req.body.t)
            }, {
                $set: {
                    haveWinner: winner
                }
            }, (err, result) => {
                res.json(winner);

            })



        }



    });


});



//团员加入


app.post('/joinTuan', (req, res) => {

    db.getDB().collection(collection3).find({
        _id: new ObjectId(req.body.t)
    }).toArray((err, documents) => {

        let tuanzhangId = documents[0].t;



        db.getDB().collection(collection5).find({
            memberPhone: req.body.memberPhone
        }).toArray((err, documents) => {
            if (documents.length == 0) { //是新成员


                //判断当前的团是否满了
                db.getDB().collection(collection3).find({
                    _id: new ObjectId(req.body.t)
                }).toArray((err, documents) => {


                    if (documents[0].m.length < 10) { //没有满
                        console.log('not full join')
                        req.body.tuanId = req.body.t;
                        req.body.time = 1; //第一次参加
                        req.body.tuanzhangId = tuanzhangId;

                        db.getDB().collection(collection3).updateOne({ //进入抽奖表
                            _id: new ObjectId(req.body.t)
                        }, {
                            $push: {
                                m: req.body
                            }
                        }, {
                            returnOriginal: false
                        }, (err, result) => {
                            db.getDB().collection(collection5).insertOne(req.body, (err, result) => { //加入成员表

                                res.json({
                                    msg: "success!",
                                    error: null
                                });

                            });

                        });



                    } else { //当前的团已经满了
                        console.log('full')

                        //查看当前团长是否有没有满的团
                        db.getDB().collection(collection3).find({
                            t: tuanzhangId
                        }).toArray((err, documents) => {
                            let notfull = documents.filter((document) => {
                                return document.m.length < 10
                            });
                            if (notfull.length > 0) { //存在没有满的团
                                let existedTuanId = notfull[0]._id;

                                req.body.tuanzhangId = tuanzhangId;
                                req.body.tuanId = existedTuanId;
                                req.body.time = 1; //第一次参加

                                db.getDB().collection(collection3).updateOne({ //进入抽奖表
                                    _id: new ObjectId(existedTuanId)
                                }, {
                                    $push: {
                                        m: req.body
                                    }
                                }, {
                                    returnOriginal: false
                                }, (err, result) => {
                                    db.getDB().collection(collection5).insertOne(req.body, (err, result) => { //加入成员表


                                        res.json({
                                            full: true,
                                            msg: "tuan?t=" + existedTuanId,
                                            error: null
                                        });

                                    });

                                });

                            } else { //当前团长的团都满了

                                db.getDB().collection(collection3).insertOne({ //创建抽奖表
                                    t: tuanzhangId,
                                    m: [{
                                        tuanzhangId: tuanzhangId,
                                        memberPhone: tuanzhangId,
                                        memberName: tuanzhangId,
                                        time: 1,
                                        tuanId: '',
                                        role: 'tuanzhang'

                                    }]
                                }, (err, result) => {
                                    //返回团id
                                    let newTuanId = result.insertedId;
                                    req.body.tuanId = newTuanId;
                                    req.body.time = 1; //第一次参加
                                    req.body.tuanzhangId = tuanzhangId;


                                    db.getDB().collection(collection3).updateOne({ //进入抽奖表
                                        _id: new ObjectId(newTuanId)
                                    }, {
                                        $push: {
                                            m: req.body
                                        }
                                    }, {
                                        returnOriginal: false
                                    }, (err, result) => {

                                        db.getDB().collection(collection5).insertOne(req.body, (err, result) => { //加入成员表

                                            res.json({
                                                full: true,
                                                msg: "tuan?t=" + newTuanId,
                                                error: null
                                            });

                                        });
                                    });

                                });

                            }


                        });



                    }
                });
            } else {
                res.json({
                    msg: "exist!!!",
                    error: null
                });
            }


        });
    })



});



//查询团员所在的团


app.get('/myt', (req, res) => {
    res.sendFile(path.join(__dirname, 'myt.html'));
});
app.post('/myt', (req, res) => {
    db.getDB().collection(collection5).find({
        memberPhone: req.body.memberPhone
    }).toArray((err, documents) => {
        if (documents[0] && documents[0].tuanId) {
            res.json({
                msg: "tuan?t=" + documents[0].tuanId,
                error: null
            });
        }


    });

});



//查询当前的团

app.get('/tuan', (req, res) => {
    res.sendFile(path.join(__dirname, 'tuan.html'));
});

app.post('/tuan', (req, res) => {
    db.getDB().collection(collection3).find({
        _id: new ObjectId(req.body.t)
    }).toArray((err, documents) => {

        res.json(documents[0]);


    });

});



//团长加入

app.get('/tuanzhang', (req, res) => {
    res.sendFile(path.join(__dirname, 'tuanzhang.html'));
});



//团长创建新团
app.post('/tuanzhangcreate', (req, res) => {


    db.getDB().collection(collection4).find({
        tuanzhangPhone: req.body.tuanzhangPhone
    }).toArray((err, documents) => {

        if (documents.length == 0) { //团长不存在
            db.getDB().collection(collection4).insertOne(req.body, (err, result) => { //插入团长表
                db.getDB().collection(collection3).insertOne({ //创建抽奖表
                    t: req.body.tuanzhangPhone,
                    m: [{
                        tuanzhangId: req.body.tuanzhangPhone,
                        memberPhone: req.body.tuanzhangPhone,
                        memberName: req.body.tuanzhangName,
                        time: 1,
                        tuanId: '',
                        role: 'tuanzhang'

                    }]
                }, (err, result) => {
                    //返回团id
                    console.log(result.insertedId)

                    res.json({
                        msg: "hi?t=" + result.insertedId,
                        error: null
                    });

                });

            });
        } else { //团长已经存在
            db.getDB().collection(collection3).insertOne({ //创建抽奖表
                t: req.body.tuanzhangPhone,
                m: [{
                    tuanzhangId: req.body.tuanzhangPhone,
                    memberPhone: req.body.tuanzhangPhone,
                    memberName: req.body.tuanzhangName,
                    time: 1,
                    tuanId: '',
                    role: 'tuanzhang'

                }]
            }, (err, result) => {
                //返回团id
                console.log(result.insertedId)

                res.json({
                    msg: "hi?t=" + result.insertedId,
                    error: null
                });

            });
        }

    });



});



//团长查询

app.get('/tzq', (req, res) => {
    res.sendFile(path.join(__dirname, 'tzq.html'));
});

app.post('/tzq', (req, res) => {
    db.getDB().collection(collection3).find({
        t: req.body.memberPhone
    }).toArray((err, documents) => {

        res.json({
            documents: documents,
            // server: server
        });


    });

});



app.get('/getChild', (req, res) => { //等级结构

    db.getDB().collection(collection).find({}).toArray((err, documents) => {
        if (err)
            console.log(err);
        else {
            let list = [];
            for (let i = 0; i < documents.length; i++) {
                list.push({
                    me: documents[i].todo,
                    previousUser: documents[i].previousUser
                })
            }


            let result = findChildren(list, 1);

            res.json(result);
        }
    });
});

function findChildren(source, previousUser) {
    let cloneData = JSON.parse(JSON.stringify(source)) // 对源数据深度克隆
    let result = cloneData.filter(father => { // 循环所有项，并添加children属性
        let branchArr = cloneData.filter(child => father.me == child.previousUser); // 返回每一项的子级数组
        branchArr.length > 0 ? father.children = branchArr : '' //给父级添加一个children属性，并赋值
        return father.previousUser == previousUser; //返回第一层
    });
    return result;
}

function setTreeData(source) {
    let cloneData = JSON.parse(JSON.stringify(source)) // 对源数据深度克隆
    let result = cloneData.filter(father => { // 循环所有项，并添加children属性
        let branchArr = cloneData.filter(child => father.me == child.previousUser); // 返回每一项的子级数组
        branchArr.length > 0 ? father.children = branchArr : '' //给父级添加一个children属性，并赋值
        return father.previousUser == 0; //返回第一层
    });
    return result;
}



//create
// app.post('/', (req, res, next) => {
//     // Document to be inserted
//     const userInput = req.body;


//     db.getDB().collection(collection).find({
//         todo: userInput.todo
//     }).toArray((err, documents) => {
//         if (err)
//             console.log(err);
//         else {
//             if (documents.length == 0) {
//                 db.getDB().collection(collection).insertOne(userInput, (err, result) => {
//                     if (err) {
//                         const error = new Error("Failed to insert Todo Document");
//                         error.status = 400;
//                         next(error);
//                     } else
//                         res.json({
//                             result: result,
//                             document: result.ops[0],
//                             msg: "Successfully inserted Todo!!!",
//                             error: null
//                         });
//                 });
//             } else {
//                 const error = new Error("exist");
//                 error.status = 400;
//                 next(error);
//             }

//         }
//     });



// });


