const radius = 6378137.0 ; // earth radius in meter
const DE2RA = 0.01745329252; // degre to radian conversion

// return the distance between [lat1,lon1] and [lat2,lon2] in meters.
const getDistance = ([lat1, lon1], [lat2, lon2]) => {
	if (lat1 == lat2 && lon1 == lon2) return 0;
	lat1 *= DE2RA;
	lon1 *= DE2RA;
	lat2 *= DE2RA;
	lon2 *= DE2RA;
	const d = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2);
	return (radius * Math.acos(d));
};

const getDistanceForTrack = (trackPointsArr) => {
	let distance = 0;
	for (let i = 1; i < trackPointsArr.length; i++) {
		distance += getDistance(trackPointsArr[i - 1], trackPointsArr[i]);
	}
	return distance;
};

const getNearestPointInfo = (point, trackPointsArr, startIndex = 0) => {
	let nearPoint = trackPointsArr[startIndex];
	let nearDist = getDistance(point, trackPointsArr[startIndex]);
	let nearInd = startIndex;
	
	for (let i = (startIndex + 1); i < trackPointsArr.length; i++) {
		const curDist = getDistance(point, trackPointsArr[i]);
		if (curDist < nearDist) {
			nearDist = curDist;
			nearPoint = trackPointsArr[i];
			nearInd = i;
		}
	}
	
	return [nearPoint, nearDist, nearInd];
}

!function(e,t){"object"==typeof exports?module.exports=t():"function"==typeof define&&define.amd?define(t):e.crEl=t()}(this,function(){return function(){"use strict";var e,t,n,o,s,i,r=arguments,f="object"==typeof r[1]&&r[1]&&1!=r[1].nodeType&&r[1].ns?document.createElementNS(r[1].ns,r[0]):document.createElement(r[0]&&"string"==typeof r[0]?r[0]:"div");for(e=0,t=r.length;t>e;e++)if(e>0&&"string"==typeof r[e])f.appendChild(document.createTextNode(r[e]));else if("object"==typeof r[e]&&"[object Array]"===Object.prototype.toString.call(r[e]))for(var l=0;l<r[e].length;l++)"string"==typeof r[e][l]?f.appendChild(document.createTextNode(r[e][l])):1===r[e][l].nodeType&&f.appendChild(r[e][l]);else if("object"==typeof r[e]&&r[e]&&1===r[e].nodeType)f.appendChild(r[e]);else if("object"==typeof r[e])for(n in r[e])if("ns"===n);else if("e"===n||"events"===n||"event"===n)for(o in r[e][n])f["on"+o]=r[e][n][o];else if(/^on[a-zA-Z]+/.test(n))f[n]="function"==typeof r[e][n]?function(e){return function(){e.apply(f,arguments)}}(r[e][n]):r[e][n];else if("d"!==n&&"data"!==n||"[object Object]"!==Object.prototype.toString.call(r[e][n]))if("c"===n||"class"===n)if("classList"in f){var a=r[e][n].replace(/^\s+|\s+$/g,"").replace(/\s+/g," ").split(" ");for(s=0,i=a.length;i>s;s++)a[s].length&&f.classList.add(a[s])}else f.className=r[e][n];else if("s"===n||"style"===n)if("object"==typeof r[e][n])for(o in r[e][n])o in f.style&&(f.style[o]=r[e][n][o]);else f.style.cssText=r[e][n];else"boolean"==typeof r[e][n]?f[n]=r[e][n]:f.setAttribute(n,r[e][n]);else for(o in r[e][n])"dataset"in f?f.dataset[o]=r[e][n][o]:f.setAttribute("data-"+o.replace(/([A-Z])/g,function(e){return"-"+e.toLowerCase()}),r[e][n][o]);return f}});

const awaitModal = (cb) => {
  return new Promise((res, rej) => {
    let ok = false;
    let data = undefined;
    let el;

    const close = (isOk, mdata) => {
      ok = isOk;
      data = mdata;
      el.close();
    }
    
    el = crEl('dialog', { opern: true }, cb(close));

    el.addEventListener("close", (e) => {
      
      if (ok) {
        res(data);
      } else {
        rej(data)
      }
      document.body.removeChild(el);
    });

    document.body.appendChild(el);
    el.showModal();
  })
} 

const checkUserOrAuth = async (reason = 'Для продолжения операции') => {
  if (window.auth?.user) {
    return window.auth.user;
  }
  
  return await awaitModal((handleClose) => crEl(
      crEl('p', {s:{textAlign:'center'}},reason, crEl('br'), 'Авторизуйтесь с учетной записью Google'),
      crEl('p', {s:{textAlign:'center'}}, 
        crEl('button', { c:'button', e: { click: async function() {
          this.disabled = true;
          const u = await window.auth.login();
          handleClose(true, u)
        } } }, 'Войти')
      )
    ))
  
}
