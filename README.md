# scratch-device-host-chrome-app

A Chrome App to allow the scratch Arduino plugin to access the serial port

This is a proof of concept, it's a little rough but it works.

To test it I'm using the Chrome developer tools to edit the extension ID so it can connect.

scratch_nmh.js: line 12
from:
 var extensionID = 'clmabinlolakdafkoajkfjjengcdmnpm'; // The original ID
to:
 var extensionID = 'akaldphhachhmgiohihcjcelkgggjlmo'; // The ID of my copy of the app
 
