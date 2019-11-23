const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema({
  Email: String,
  Name: String,
  id: String,
  password: String,
  phoneNumber: String,
})

const List = new Schema({
  title: String,
  a_id: String,
  b_id: String,
  a_resolve: Boolean,
  b_resolve: Boolean,
  file_name: String,
  isResolve: Boolean,
  a_url: String,
  b_url: String
})

List.statics.create = function(title, a_id, b_id, a_resolve, b_resolve, file_name, isResolve, a_url, b_url) {
  const list = new this({
    title,
    a_id,
    b_id,
    a_resolve,
    b_resolve,
    file_name,
    isResolve,
    a_url,
    b_url
  })

  return list.save()
}

//

User.methods.verify = function(password) {
  return this.password === password
}

User.statics.create = function(Email, Name, phoneNumber, id, password) {
  const user = new this({
    Email,
    Name,
    phoneNumber,
    id,
    password
  })

  return user.save()
}

User.statics.checkId = function(id) {
  return this.findOne({
    id
  }).exec()
}

module.exports = {
  'User' : mongoose.model('User', User),
  'List' : mongoose.model('List', List),
}