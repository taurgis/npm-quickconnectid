/*
 * nmp-quickconnectid v0.2 (https://github.com/taurgis/js-quickconnectid)
 *
 * Copyright 2017, Thomas Theunen
 * https://www.thomastheunen.eu
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

var request = require('request');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var QuickConnect = function() {
  var requestQueue = [];
  var quickConnectID = "";

  function determineServerURL(id, success, fail) {
    quickConnectID = id;

    getServerData(function(response) {
      if (response[0].server && response[0].service) {
        createTunnelRequests(response[0], function(tunnelResponse) {
          if (tunnelResponse) {
            createCallRelayRequests(tunnelResponse);
          }

          createCallDSMDirectlyRequests(response[0]);
          createCallRelayRequests(response[0]);

          processRequestQueue(function(url) {
            if (success)
              success(url);
          }, function(error) {
            if (fail)
              fail(error);
          });
        });
      } else {
        if (fail)
          fail('No server found');
      }
    }, function() {
      fail('No server found ')
    });
  }

  function processRequestQueue(success, error) {

    for (var i = 0; i < requestQueue.length; i++) {
      var options = {
        method: 'get',
        url: requestQueue[i],
        json: true
      }

      request(options, function(err, httpResponse, body) {
        if (!err && body.boot_done) {
          success(httpResponse.req._headers.host);
        }
      });
    }
  }

  function getServerData(success, error) {
    var serverRequestData = [{
        "version": 1,
        "command": "get_server_info",
        "stop_when_error": "false",
        "stop_when_success": "false",
        "id": "dsm_portal_https",
        "serverID": quickConnectID
      },
      {
        "version": 1,
        "command": "get_server_info",
        "stop_when_error": "false",
        "stop_when_success": "false",
        "id": "dsm_portal",
        "serverID": quickConnectID
      }
    ];

    var options = {
      method: 'post',
      body: serverRequestData,
      json: true,
      url: 'https://global.quickconnect.to/Serv.php'
    }

    request(options, function(err, httpResponse, body) {
      if (err && error) {
        error(err);
      } else {
        success(body);
      }
    });
  }

  function createTunnelRequests(serverData, success, error) {
    if (serverData.env.control_host) {
      var serverRequestData = {
        "command": "request_tunnel",
        "version": 1,
        "serverID": quickConnectID,
        "id": "dsm_portal_https"
      }


      var options = {
        method: 'post',
        body: serverRequestData,
        json: true,
        url: 'https://' + serverData.env.control_host + '/Serv.php'
      }

      request(options, function(err, httpResponse, body) {
        if (err && error) {
          error(err)
        } else {
          success(body);
        }
      });
    } else {
      success();
    }
  }

  function createCallRelayRequests(serverData) {
    var relayIp = serverData.service.relay_ip;
    var relayPort = serverData.service.relay_port;
    var relayRegion = serverData.env.relay_region;

    if (relayIp) {
      var pingPong = createPingPongCall(relayIp, relayPort);
      requestQueue.push(pingPong);
    }
  }


  function createCallDSMDirectlyRequests(serverData) {
    var port = serverData.service.port;
    var externalPort = serverData.service.ext_port;

    if (serverData.server.interface) {
      for (var i = 0; i < serverData.server.interface.length; i++) {
        var serverInterface = serverData.server.interface[i];

        if (serverInterface.ip) {
          createPingPongCall(serverInterface.ip, port);
        }

        if (serverInterface.ipv6 && serverInterface.ipv6.length > 0) {
          for (var j = 0; j < serverInterface.ipv6.length; j++) {
            var ipv6 = serverInterface.ipv6[i];
            createPingPongCall('[' + ipv6.address + ']', port);
          }
        }
      }
    }
  }

  function createPingPongCall(ip, port) {
    var callUrl = 'https://' + ip + (port ? ":" + port : "") + "/webman/pingpong.cgi?action=cors";
    if (requestQueue.indexOf(callUrl) < 0)
      requestQueue.push(callUrl);
  }

  return {
    "determineServerURL": determineServerURL
  }
}

module.exports = new QuickConnect();
