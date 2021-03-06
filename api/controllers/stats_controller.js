var path = require('path');
var mongoose = require('mongoose');
var Archive = mongoose.model('Archive');
var diskspace = require('diskspace');
var getFolderSize = require('get-folder-size');
var Application = mongoose.model('Application');

// GET: Returns a dictionnary with the number of archives uploaded per month
exports.getArchivingFrequency = (req, res) => {
  Archive.aggregate([
    {'$project': {
          'month': {'$month': '$created'},
          'year': {'$year': '$created'},
        },
    },
    {'$group': {
        '_id': {'month': '$month', 'year': '$year'},
        'count': {'$sum': 1},
      },
    }], (err, data) => {
      if (err) {
        res.status(500).send(err);
      } else if (data.length > 0) {
        var result = {};
        var resultSorted = {};
        var dictMonth = {
          '1': 'January',
          '2': 'Febrary',
          '3': 'March',
          '4': 'April',
          '5': 'May',
          '6': 'June',
          '7': 'July',
          '8': 'August',
          '9': 'September',
          '10': 'October',
          '11': 'November',
          '12': 'December',
        };
        data.forEach(function(month) {
          let key = new Date(month._id.year, month._id.month, 2).valueOf();
          result[key] = month.count;
        });

        // insert missing months (when 0 archive in month)
        var min = Math.min(...Object.keys(result));
        var max = Math.max(...Object.keys(result));
        var tmp = min;
        while (tmp !== max) {
          if (!result[new Date(tmp).valueOf()] && tmp !== min) {
            result[new Date(tmp).valueOf()] = 0;
          }
          tmp = new Date(tmp).setMonth(new Date(tmp).getMonth() + 1).valueOf();
        }

        // sort in function of month and year
        Object.keys(result).sort().forEach(function(key, idx, array) {
          var newKey = dictMonth[new Date(parseInt(key)).getMonth()] + ' ' + new Date(parseInt(key)).getFullYear();
          resultSorted[newKey] = result[key];
        });

        res.json(resultSorted);
      } else {
        res.json({});
      }
    });
};

// GET: Returns a dictionnary with the disk usage information
exports.getDiskUsage = (req, res) => {
  diskspace.check('/', function(err1, result) {
    if (err1) {
      res.status(500).send(err1);
    } else {
      Application.findOne({}, (err, application) => {
        if (err) {
          console.log(err);
        } else {
          if (application.archivesPath === 'archives') {
            // default path (relative)
            getFolderSize(path.join(__dirname, '../../archives'), (err2, size) => {
              if (err2) {
                res.status(500).send(err2);
              } else {
                res.json({
                  total: formatBytes(result.total),
                  used: formatBytes(result.used),
                  free: formatBytes(result.free),
                  astr: formatBytes(size),
                  used_without_astr: formatBytes(result.used - size),
                  total_bytes: result.total,
                  used_bytes: result.used,
                  free_bytes: result.free,
                  astr_bytes: size,
                  used_without_astr_bytes: result.used - size,
                });
              }
            });
          } else {
            // custom path (absolute)
            getFolderSize(application.archivesPath, (err2, size) => {
              if (err2) {
                res.status(500).send(err2);
              } else {
                res.json({
                  total: formatBytes(result.total),
                  used: formatBytes(result.used),
                  free: formatBytes(result.free),
                  astr: formatBytes(size),
                  used_without_astr: formatBytes(result.used - size),
                  total_bytes: result.total,
                  used_bytes: result.used,
                  free_bytes: result.free,
                  astr_bytes: size,
                  used_without_astr_bytes: result.used - size,
                });
              }
            });
          }
        }
      });
    }
  });
};

function formatBytes(a,b){if(0==a)return"0 Bytes";var c=1024,d=b||2,e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],f=Math.floor(Math.log(a)/Math.log(c));return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]}
