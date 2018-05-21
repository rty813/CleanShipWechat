function ab2str(buf) {
	var arr = Array.prototype.map.call(new Uint8Array(buf), x => x)
  var str = '';
  for (var i = 0; i < arr.length; i++) {
    str += String.fromCharCode(arr[i]);
  }
  return str;
}

function str2ab(str) {
  let buf = new ArrayBuffer(str.length); 
  var bufView = new DataView(buf);
  for (var i = 0; i < str.length; i++) {
    bufView.setUint8(i, str.charAt(i).charCodeAt());
  }
  return buf;
}

module.exports = {
  ab2str: ab2str,
  str2ab: str2ab
}