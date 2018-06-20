var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SearchSchema = new Schema({
  user: {
    type: String,
    unique: false,
    required: true,
    trim: true
  },
  testAuthor: {
    type: String,
    unique: false,
    required: false,
    trim: true
  },
  testSubjectName: {
    type: String,
    unique: false,
    required: false,
    trim: true,
    uppercase: true
  },
  date: {
    type: String,
    unique: false,
    required: false,
    trim: true
  },
  configuration: [{
    name: { type: String, lowercase: true, trim: true },
    value: { type: String, uppercase: true, trim: true }
  }],
  created: {
    type: Date,
    default: Date.Now,
    required: true
  },
});

var Search = mongoose.model('Search', SearchSchema);
module.exports = Search;