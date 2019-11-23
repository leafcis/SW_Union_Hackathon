const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken')
const app = express();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const axios = require('axios')
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, new Date().valueOf() + " " + file.originalname);
    }
  }),
});
const config = require('./config.js')
const { User, List } = require('./schema')

const db = mongoose.connection;
db.on('error', console.error)
db.once('open', () => {
  console.log("Connect Success!")
})

mongoose.connect('mongodb://localhost/contract')

const server = app.listen(3000, function(){
    console.log("Express server has started on port 3000")
})

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())
app.use(express.static('public'))

app.set('jwt-secret', config.secret)

app.get('/info', (req, res) => {
  let decode = check(req)
  if(check(req) === false) {
    res.status(400)
    res.send()
  } else {
    User.find({id : decode.id}, 'Name Email phoneNumber', (err, data) => {
      res.status(200)
      res.send({
        data: {
          user: data[0]
        }
      })
    })
  }
})

app.post('/auth', (req, res) => {
  const { id, password } = req.body;
  const secret = req.app.get('jwt-secret');

  const check = (user) => {
    if(!user) {
      throw new Error('로그인 실패')
    } else {
      if(user.verify(password)) {
        const token = new Promise((res, rej) => {
          jwt.sign({
            id: user.id,
          }, secret, (err, token) => {
            if(err) rej(err)
            res(token)
          })}
        )
        return token
      } else {
        throw new Error('로그인 실패')
      }
    }
  }

  const response = (token) => {
    res.status(200)
    res.send({
      data: {
        accessToken : token
      }
    })
  }

  const onError = () => {
    res.status(403)
    res.send()
  }

  User.checkId(id)
  .then(check)
  .then(response)
  .catch(onError)
})

app.post('/register', (req, res) => {
  const { Email, Name, phoneNumber, id, password } = req.body;
  const create = (user) => {
    if(user) {
      throw new Error('이미 존재하는 아이디입니다.');
    } else {
      return User.create(Email, Name, phoneNumber, id, password)
    }
  }

  const response = () => {
    res.status(200);
    res.send({"status": 200});
  }

  const onError = (error) => {
    res.status(409)
    res.send();
  }

  User.checkId(id)
  .then(create)
  .then(response)
  .catch(onError)
})

app.get('/contract/:id', (req, res) => {
  let param = req.params.id
  let decode = check(req)
  if(check(req) === false) {
    res.status(403)
    res.send()
  } else {
    List.find({_id:param} ,(err, docs) => {
      console.log(param)
      console.log(docs[0])
      res.status(200)
      res.send(
        {
          data : {
            data : docs[0], isA : (decode.id === docs[0].a_id), url : "http://172.26.0.167:3000/uploads/" + docs[0].file_name
            ,
            a_url : docs[0].a_url == "" ? "" : "http://172.26.0.167:3000/uploads/" + docs[0].a_url,
            b_url : docs[0].b_url == "" ? "" : "http://172.26.0.167:3000/uploads/" + docs[0].b_url,
          }
        }
      )
    })
  }
})

app.get('/contract', (req, res) => {
  let decode = check(req)
  if(check(req) === false) {
    res.status(403)
    res.send()
  } else {
    List.find({ $or: [{a_id:decode.id},{b_id:decode.id}]}, (err, docs) => {
      res.status(200)
      res.send(
        {
          data : {
            list : [ ...docs ]
          }
        }
      )
    })
  }
})

app.post('/contract/accept', upload.single('picture'), async (req, res) => {
  const { _id } = req.query;
  let decode = check(req)
  if(check(req) === false) {
    res.status(401)
    return res.send()
  } else {
    const re = await List.find({_id:_id}, 'a_id')
    console.log(re)
    if(decode.id === re[0].a_id) {
      await List.updateOne({_id:_id}, {a_resolve: true, a_url:req.file.filename})
    }
    else{
    await List.updateOne({_id:_id}, {b_resolve : true})
    await List.updateOne({_id:_id}, {b_url:req.file.filename})
    }

    const resp = await List.find({_id:_id}, 'a_resolve b_resolve a_id b_id file_name')
    if(resp[0].a_resolve !== false && resp[0].b_resolve !== false) {
      await List.updateOne({_id:_id}, {isResolve : true})
      axios.post(`http://172.26.0.168:5000/create?send=${resp[0].a_id}&recv=${resp[0].b_id}&fileId=${resp[0].file_name}`)
      .then(res => {
        console.log(res.data)
      axios.get(`http://172.26.0.168:5000/proof?send=${resp[0].a_id}&recv=${resp[0].b_id}&fileId=${resp[0].file_name}`)
      .catch(async err => {
          let value = await List.find({file_name:resp[0].file_name}, '_id')
          await List.remove({_id:value[0]._id})
      })
      })
    }

    res.status(200)
    res.send({status: 200})
}
})

app.post('/contract', upload.single('picture'), (req, res) => {
  const { title, b_id } = req.query;
    let decode = check(req)
    if(check(req) === false) {
      res.status(401)
      return res.send()
    } else {
      if(decode.id === b_id) {
        res.status(401)
        return res.send({message : '스스로를 선택할 수 없습니다.'})
      }
      User.checkId(b_id).then(response => {
        if(response !== null) {
          List.create(title, decode.id, b_id, false, false, req.file.filename, false, "", "")
          res.status(200)
          res.send({message: 'ㅊㅊ'})
        }
        else {
          res.status(401)
          res.send({message: '없는 아이디입니다.'})
        }
      })
    }
})

function check(req) {
  const token = req.headers['x-access-token'] || req.query.token
  if(!token) {
      return false;
  }
  let decode;
  try {
    decode = jwt.verify(token, req.app.get('jwt-secret'))
  }
  catch {
    return false;
  }
  return decode;
}