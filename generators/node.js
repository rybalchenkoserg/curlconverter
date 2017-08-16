/* eslint-disable no-template-curly-in-string */

var util = require('../util')
var jsesc = require('jsesc')
var urlUtil = require('url')
var queryString = require('querystring')

var toNode = function (curlCommand, options) {
  let opt = options || {var: {cookies: false}}
  var request = util.parseCurlCommand(curlCommand)
  let events = ('events' in opt)
  if (events && ('afterParse' in opt.events) && (typeof opt.events.afterParse === 'function')) {
    opt.events.afterParse(request, opt)
  }
  var nodeCode = 'var request = require(\'request\');\n\n'
  let varUrl = ('var' in opt) && (typeof opt.var === 'object') && (opt.var.url)
  let code = ('code' in opt)
  if (request.headers || request.cookies) {
    if (code && ('begin' in opt.code) && (typeof opt.code.begin === 'string')) {
      nodeCode += opt.code.begin
    }

    let varCookie = request.cookies && ('var' in opt) && (typeof opt.var === 'object') && (opt.var.cookies)
    if (varCookie) {
      nodeCode += `var cookies =  ${opt.var.cookies};\n`
    }

    if (varUrl) {
      if (typeof varUrl === 'string') {
        nodeCode += `var url =  '${opt.var.url}';\n`
      } else if (typeof varUrl === 'boolean') {
        if ('urlQuery' in opt.var && typeof opt.var.urlQuery === 'boolean') {
          let urlComponents = urlUtil.parse(request.url)
          let queryParams = queryString.parse(urlComponents.query)
          nodeCode += `var queryParams = ${JSON.stringify(queryParams, null, 2)};\n`
        //  nodeCode += 'var url = '
        } else {
         // nodeCode += `var url =  '${request.url}';\n`
        }
        nodeCode += `var url =  '${request.url}';\n`
      }
    }

    nodeCode += 'var headers = {\n'
    var headerCount = Object.keys(request.headers).length
    var i = 0
    for (var headerName in request.headers) {
      nodeCode += '    \'' + headerName + '\': \'' + request.headers[headerName] + '\''
      if (i < headerCount - 1 || request.cookies) {
        nodeCode += ',\n'
      } else {
        nodeCode += '\n'
      }
      i++
    }
    if (request.cookies) {
      var cookieString = util.serializeCookies(request.cookies)
      nodeCode += varCookie ? '    \'Cookie\': `${cookies}`\n' : '    \'Cookie\': \'' + cookieString + '\'\n'
    }
    nodeCode += '};\n\n'
  }

  if (request.data) {
    // escape single quotes if there are any in there
    if (request.data.indexOf('\'') > -1) {
      request.data = jsesc(request.data)
    }
    nodeCode += 'var dataString = \'' + request.data + '\';\n\n'
  }

  nodeCode += 'var options = {\n'
  nodeCode += varUrl ? '    url: `${url}`' : '    url: \'' + request.url + '\''
  if (request.method !== 'get') {
    nodeCode += ',\n    method: \'' + request.method.toUpperCase() + '\''
  }

  if ('reqOptions' in opt && 'gzip' in opt.reqOptions && !!opt.reqOptions.gzip) {
    nodeCode += ',\n    gzip: true'
  }

  if (request.headers || request.cookies) {
    nodeCode += ',\n'
    nodeCode += '    headers: headers'
  }
  if (request.data) {
    nodeCode += ',\n    body: dataString'
  }

  if (request.auth) {
    nodeCode += ',\n'
    var splitAuth = request.auth.split(':')
    var user = splitAuth[0] || ''
    var password = splitAuth[1] || ''
    nodeCode += '    auth: {\n'
    nodeCode += '        \'user\': \'' + user + '\',\n'
    nodeCode += '        \'pass\': \'' + password + '\'\n'
    nodeCode += '    }\n'
  } else {
    nodeCode += '\n'
  }
  nodeCode += '};\n\n'

  nodeCode += 'function callback(error, response, body) {\n'
  if (code && ('callback' in opt.code) && (typeof opt.code.callback === 'string')) {
    nodeCode += opt.code.callback
  } else {
    nodeCode += '    if (!error && response.statusCode == 200) {\n'
    nodeCode += '        console.log(body);\n'
    nodeCode += '    }\n'
  }
  nodeCode += '}\n\n'
  if (code && ('beforeRequest' in opt.code) && (typeof opt.code.beforeRequest === 'string')) {
    nodeCode += opt.code.beforeRequest
  }
  nodeCode += 'request(options, callback);'

  return nodeCode + '\n'
}

module.exports = toNode
