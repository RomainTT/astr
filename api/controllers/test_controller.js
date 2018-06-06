const fs = require('fs');
var request = require('request');
var mongoose = require('mongoose');
var User = require('../models/user_model');
var Test = mongoose.model('Test');
var error401 = '<h1>401 UNAUTHORIZED</h1><p>Please add your email address and your token in the Authorization Header of your request (use <a href="http://docs.python-requests.org/en/master/user/authentication/#basic-authentication">Basic Auth</a>).<br>If you already did that, it means that you don\'t have the required permission for this action.</p>';

// GET: Returns the list of all tests
exports.getAllTests = (req, res) => {
  checkIfTestsHaveAnArchive()
  .then(() => {
    Test.find({})
    .where('archive').equals(true)
    .exec((err, data) => {
      if (err) {
        res.send(err);
      }
      else {
        res.json(data);
      }
    });
  });
};

// GET: Returns the list of all tests without any archive (to delete them)
exports.getAllTestsWithoutArchive = (req, res) => {
  checkIfTestsHaveAnArchive()
  .then(() => {
    Test.find({})
    .where('archive').equals(false)
    .exec((err, data) => {
      if (err) {
        res.send(err);
      }
      else {
        res.json(data);
      }
    });
  });
};

// POST: Returns the list of tests that match with the parameters given in the body request
exports.getTestsByQuery = (req, res) => {
  checkIfTestsHaveAnArchive()
  .then(() => {
    Test.find(req.body)
    .where('archive').equals(true)
    .exec((err, data) => {
      if (err) {
        res.send(err);
      }
      else {
        res.json(data);
      }
    });
  });
};

// POST: Returns the list of tests that match with the parameters given in the body request, with pagination
exports.getTestsByQueryAndPage = (req, res) => {
  checkIfTestsHaveAnArchive()
  .then(() => {
    var page = Number(req.params.page);
    var resultPerPage = Number(req.params.resultPerPage);
    Test.find(req.body)
    .where('archive').equals(true)
    .limit(resultPerPage)
    .skip((page-1)*resultPerPage)
    .exec((err, data) => {
      if (err) {
        res.send(err);
      }
      else {
        res.send(data);
      }
    });
  });
};

// POST: Add a new test in the DB in function of the parameters given in the body request
exports.addTest = (req, res) => {
  User.hasAuthorization(req, ['write_permission'])
  .then((hasAuthorization) => {
    if (hasAuthorization) {
      var newTest = new Test(req.body);
      newTest.created = Date.now();
      newTest.lastModification = Date.now();
      request.get({
        url: 'http://localhost:8000/api/test-subjects/name/' + newTest.type,
        json: true
      }, (err1, res1, testSubject) => {
        newTest.testSubjectId = testSubject._id;
        newTest.save((err, data) => {
          if (err) {
            res.send(err);
          }
          else {
            res.json({name: 'Success', message: 'Test successfully added', test: data});
          }
        });
      });
    } else {
      res.status(401).send(error401);
    }
  });
}

// GET: Returns the test with the associated ID
exports.getTest = (req, res) => {
  var id = req.params.id;
  Test.findById(id, (err, data) => {
    if (err) {
      res.send(err);
    }
    else {
      if(data === null){
        res.json({name: 'Failed', message: 'This id doesn\'t exist'});
      }
      else {
        res.json(data);
      }
    }
  });
}

// POST: Update the test with the associated ID in function of the parameters given in the body request
exports.updateTest = (req, res) => {
  User.hasAuthorization(req, ['master', 'owner'])
  .then((hasAuthorization) => {
    if (hasAuthorization) {
      var id = req.params.id;
      var body = req.body;
      body.lastModification = Date.now();
      Test.findByIdAndUpdate(id, body, (err, data) => {
        if (err) {
          res.send(err);
        }
        else {
          if(data === null){
            res.json({name: 'Failed', message: 'This id doesn\'t exist'});
          }
          else {
            res.json({name: 'Success', message: 'Test successfully modified', modified: body, before: data});
          }
        }
      });
    } else {
      res.status(401).send(error401);
    }
  });
}

// DELETE: Delete the test with the associated ID
exports.deleteTest = (req, res) => {
  User.hasAuthorization(req, ['master', 'owner'])
  .then((hasAuthorization) => {
    if (hasAuthorization) {
      var id = req.params.id;
      // delete the archive (file)
      fs.unlink('archives/' + id + '.zip', (err) => {
        if (err) console.log(err);
        else console.log('successfully deleted ' + id + '.zip');
      });
      Test.findByIdAndRemove(id, (err, data) => {
        if (err) {
          res.send(err);
        }
        else {
          if(data === null){
            res.json({name: 'Failed', message: 'This id doesn\'t exist'});
          }
          else {
            res.json({name: 'Success', message: 'Test successfully deleted', test: data});
          }
        }
      });
    } else {
      res.status(401).send(error401);
    }
  });
}

// GET: Returns the list of test authors (that wrote at least one test)
exports.getDistinctAuthors = (req, res) => {
  Test.distinct('author', {}, (err, data) => {
    if (err) {
      res.send(err);
    }
    else {
      res.json(data);
    }
  });
};

// GET: Returns the list of test subjects (used at least by one test)
exports.getDistinctSubjects = (req, res) => {
  Test.distinct('type', {}, (err, data) => {
    if (err) {
      res.send(err);
    }
    else {
      res.json(data);
    }
  });
};

// GET: Returns the list of configurations (used at least by one test)
exports.getDistinctConfigurations = (req, res) => {
  Test.distinct('configuration.name', {}, (err, data) => {
    if (err) {
      res.send(err);
    }
    else {
      res.json(data);
    }
  });
};

// GET: Returns the list of configurations of the associated subject (used at least by one test)
exports.getConfigurationsOfSubject = (req, res) => {
  var subject = req.params.subject;
  Test.distinct('configuration.name', {type: subject}, (err, data) => {
    if (err) {
      res.send(err);
    }
    else {
      res.json(data);
    }
  });
};

// GET: Returns the  options of the associated configuration (used at least one time)
exports.getOptionsOfConfig = (req, res) => {
  var configName = req.params.configname;
  Test.aggregate([
    {"$unwind": "$configuration"},
    {"$match": {"configuration.name": configName}},
    {"$group": {"_id": null, "values": {"$addToSet": "$configuration.value"}}},
    {"$project": {"values": true, "_id": false}}
  ])
  .exec((err, data) => {
    if (err) {
      res.send(err);
    }
    else {
      if(data.length === 1) {
        res.json(data[0].values);
      } else {
        res.json({'error': 'Nothing found'});
      }
    }
  });
};

// POST: Change the test type of all the tests matched by {type: previousName} (body contains previousName and newName)
exports.changeTestSubjectName = (req, res) => {
  User.hasAuthorization(req, ['master'])
  .then((hasAuthorization) => {
    if (hasAuthorization) {
      var previousName = req.body.previousName;
      var newName = req.body.newName;
      Test.update({type: previousName}, {type: newName}, {multi: true}, (err, data) => {
        if (err) {
          res.send(err);
        } else {
          res.json(data);
        }
      });
    } else {
      res.status(401).send(error401);
    }
  });
}

// POST: Push a new configuration in all tests matched by the test type/subject (body contains subject and config: {name, value})
exports.addConfig = (req, res) => {
  User.hasAuthorization(req, ['master'])
  .then((hasAuthorization) => {
    if (hasAuthorization) {
      var config = req.body.config;
      var subject = req.body.subject;
      Test.update({type: subject}, {$push: {configuration: config}}, {multi: true}, (err, data) => {
        if (err) {
          res.send(err);
        } else {
          res.json(data);
        }
      });
    } else {
      res.status(401).send(error401);
    }
  });
}

// POST: Change the name of the matched configuration in all tests matched by the test type/subject (body contains subject, previousName and newName)
exports.changeConfigName = (req, res) => {
  User.hasAuthorization(req, ['master'])
  .then((hasAuthorization) => {
    if (hasAuthorization) {
      var previousName = req.body.previousName;
      var newName = req.body.newName;
      var subject = req.body.subject;
      Test.update({type: subject, 'configuration.name': previousName}, {$set: {'configuration.$.name': newName}}, {multi: true}, (err, data) => {
        if (err) {
          res.send(err);
        } else {
          res.json(data);
        }
      });
    } else {
      res.status(401).send(error401);
    }
  });
}

function checkIfTestsHaveAnArchive() {
  return new Promise((resolve, reject) => {
    Test.find({}, (err, data) => {
      if (err) {
        console.log(err);
      }
      else {
        request.get({
          url: 'http://localhost:8000/api/download/files',
          json: true,
        }, (err, res2, archives) => {
          if (err) {
            console.log('Error:', err);
            reject(err);
          } else {
            data.forEach(function(test, idx, array) {
              if ('archive' in test) {
                if (test.archive !== archives.includes(test._id.toString())) {
                  Test.findByIdAndUpdate(test._id, {archive: archives.includes(test._id.toString())}, (err, data) => {
                    if (err) {
                      console.log(err);
                      reject(err);
                    }
                  });
                }
              } else {
                Test.findByIdAndUpdate(test._id, {archive: archives.includes(test._id.toString())}, (err, data) => {
                  if (err) {
                    console.log(err);
                    reject(err);
                  }
                });
              }
            });
            resolve();
          }
        });
      }
    });
  });
}
