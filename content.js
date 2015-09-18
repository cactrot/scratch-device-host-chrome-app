var connectionId = -1;
var selectedPort = "";
var serialPath = "";
var placeHolder = "Select a port.";
var portApp = null;
var recvData = [];
var recieving = false;

var charsBase64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// turn off debug output
var consoleHolder = console;
function debug(bool){
    if(!bool){
        consoleHolder = console;
        console = {};
        console.log = function(){};
    }else
        console = consoleHolder;
}
debug(true);

function ab_to_b64(arraybuffer) {
	var bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = '';

	for (i = 0; i < len; i += 3) {
		base64 += charsBase64[bytes[i] >> 2];
		base64 += charsBase64[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
		base64 += charsBase64[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
		base64 += charsBase64[bytes[i + 2] & 63];
	}

	if ((len % 3) === 2) {
		base64 = base64.substring(0, base64.length - 1) + '=';
	} else if (len % 3 === 1) {
		base64 = base64.substring(0, base64.length - 2) + '==';
	}

	return base64;
}

function b64_to_ab(base64) {
	var bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
	if (base64[base64.length - 1] === '=') {
		--bufferLength;
		if (base64[base64.length - 2] === '=') {
			--bufferLength;
		}
	}

	var arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
	for (i = 0; i < len; i += 4) {
		encoded1 = charsBase64.indexOf(base64[i]);
		encoded2 = charsBase64.indexOf(base64[i + 1]);
		encoded3 = charsBase64.indexOf(base64[i + 2]);
		encoded4 = charsBase64.indexOf(base64[i + 3]);
		bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
		bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
		bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
	}

	return arraybuffer;
}

document.addEventListener('DOMContentLoaded', function() {
	console.log('DOMContentLoaded');
	var portOptions = document.getElementById('ports');
	var onGetDevices = function(ports) {
		var portOption = document.createElement('option');
		portOption.value = portOption.innerText = placeHolder;
		portOptions.appendChild(portOption);
	  for (var i=0; i<ports.length; i++) {
		console.log(ports[i].path);
		var portOption = document.createElement('option');
		portOption.value = portOption.innerText = ports[i].path;
		portOptions.appendChild(portOption);
	  }
	}
	chrome.serial.getDevices(onGetDevices);
	
	portOptions.onchange = function() {
		if (connectionId != -1) {
		  chrome.serial.disconnect(connectionId, openSelectedPort);
		  return;
		}
		openSelectedPort();
    };
});

function openSelectedPort() {
  var portOptions = document.getElementById('ports');
  selectedPort = portOptions.options[portOptions.selectedIndex].value;
  if( selectedPort == placeHolder )
  {
	setStatus( placeHolder );
  } else {
	setStatus('Attempting to connect.');
    chrome.serial.connect(selectedPort, {bitrate: 57600}, onConnect);
  }
}

function onConnect(connectionInfo) {
  if (!connectionInfo) {
    setStatus('Could not open');
    return;
  }
  connectionId = connectionInfo.connectionId;
  setStatus('Connected');

  chrome.serial.onReceive.addListener(function(obj){
        if(connectionId == obj.connectionId){

		  setStatus( ab2str(obj.data));

		  if ( recieving ) {
			//portApp.postMessage(["serialRecv", "COM15", ab_to_b64(obj.data)]);
			portApp.postMessage(["serialRecv", selectedPort, ab_to_b64(obj.data)]);
		  } else {
			recvData.push( ab_to_b64(obj.data) );
		  }
        }
  });
}

function write(data) {
  function onWrite() {
    // log("onWrite", arguments);
  }

  data = new Uint8Array(data);
  // console.log("OUT", data);
  if(connectionId != -1 ){
    chrome.serial.send(connectionId, data.buffer, onWrite);
  }

};

var appendBuffer = function(buffer1, buffer2) {
      var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
      tmp.set(new Uint8Array(buffer1), 0);
      tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
      return tmp.buffer;
};

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function setStatus(status) {
  document.getElementById('status').innerText = status;
}

chrome.runtime.onSuspend.addListener( function() {
	connectionId = -1;
	var portOptions = document.getElementById('ports');
	portOptions.value = placeHolder;
});

chrome.runtime.onConnectExternal.addListener(function listener(port) {
	console.log("External connection event");
	console.log(port);
	portApp = port;

	port.onMessage.addListener(function(msg) {
	  console.log(msg);
	  if ( msg[1] == "version" ) {
		console.log("version");
		port.postMessage(["@", msg[0], "awesome"]);
	  }
	  if ( msg[1][0] == "serial_list" ) {
		console.log("serial_list");
		var portOptions = document.getElementById('ports');
		var ports = Array.from(portOptions.options).map(function(item){return item.value;})
		console.log( ports );
		port.postMessage(["@", msg[0], ports]); // ["COM15"] ports
	  }
	  if ( msg[1][0] == "serial_open_raw" )  {
		console.log("serial_open_raw");
		// open serial port named msg[1][1] --- COM15 for now
		var portOptions = document.getElementById('ports');
		var ports = Array.from(portOptions.options).map(function(item){return item.value;})
		portOptions.selectedIndex = ports.indexOf( msg[1][1] );
		if (connectionId != -1) {
			chrome.serial.disconnect(connectionId, openSelectedPort);
		} else {
			openSelectedPort();
		}
		port.postMessage(["@", msg[0], [1]]);
	  }
	  if ( msg[1][0] == "claim" )  {
		console.log("claim")
	  }
	  if ( msg[1][0] == "serial_send_raw" )  {
		console.log("serial_send_raw");
		console.log( msg[1][2] );
		
		if ( connectionId != -1 ) {
			write( b64_to_ab(msg[1][2]) );
		} else {
			//port.postMessage(["serialError", selectedPort, "Port not open."]);
		};
	  }
	  if ( msg[1][0] == "serial_recv_start" )  {
		console.log("serial_recv_start");
		
		port.onMessage.addListener(function recv_closer(msg) {
		  console.log(msg);
		  if ( msg[1][0] == "serial_close" ) {
			console.log("serial_close");
			recieving = false;
			if ( connectionId != -1 ) {
				chrome.serial.disconnect(connectionId, function(result){console.log(result);});
			}
			connectionId = -1;
			port.onMessage.removeListener(recv_closer);
		  }
		});

		recieving = true;
		while( recvData.length > 0 ) {
			data = recvData.shift();
			console.log( data );
			port.postMessage(["serialRecv", selectedPort, data]);
		}
	  }
	});
});


