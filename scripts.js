const mapElement = document.getElementById('map');
const map = L.map(mapElement).setView([53.18, 45], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attributionControl: false
}).addTo(map);

document.getElementsByClassName( 'leaflet-control-attribution' )[0].style.display = 'none';

const footerElement = document.getElementById('footer');
const headerElement = document.getElementById('header');





const init = () => {
  const trackMetaLSKey = 'track-meta';
	const trackDataLSKey = 'track-data';
	const pointsDataLSKey = 'points-data';
	const logsDataLSKey = 'logs-data';

	const trackDataStr = localStorage.getItem(trackDataLSKey);
	const pointsDataStr = localStorage.getItem(pointsDataLSKey);
	const logsDataStr = localStorage.getItem(logsDataLSKey);
	const trackMetaStr = localStorage.getItem(trackMetaLSKey);
	
	const points = JSON.parse(pointsDataStr || '[]');
	const track = JSON.parse(trackDataStr || '[]');
	const logs = JSON.parse(logsDataStr || '[]');
	const meta = JSON.parse(trackMetaStr || '{}');

	let currentPositionMarker;
	let polylineForNearest;
	let logMarkersGroup;

	let polylinePassed;
	let polylineFutured;

	let lastSpeedKmH;
	let avgSpeedKmH;

	if (!track.length) {
		headerElement.innerHTML = '';
		const inp = document.createElement('input');
		inp.setAttribute('type', 'file');
		inp.setAttribute('accept', '.gpx');
		inp.onchange = async (e) => {
			const file = e.target.files[0];
			const fileContent = await file.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(fileContent, "text/xml");
			const points = Array.from(doc.getElementsByTagName('trkpt'));
			const wpts = Array.from(doc.getElementsByTagName('wpt'));
			const data = []; // [lat, lon, alt*]
			const pointsData = []; // [lat, lon, alt*]
			const meta = {};
      
      meta.name = doc.querySelector('trk>name')?.textContent ?? doc.querySelector('metadata>name')?.textContent;
      meta.description = doc.querySelector('metadata>desc')?.textContent;
      meta.uploadAt = new Date();


			points.forEach((p) => {
				const d = [
					parseFloat(p.getAttribute('lat')),
					parseFloat(p.getAttribute('lon'))
				];
			
				const eleEl = p.querySelector('ele');
				if (eleEl) {
					d.push(parseFloat(eleEl.textContent))
				}

				data.push(d);
			});

			wpts.forEach((p, i) => {
				let d = [
					parseFloat(p.getAttribute('lat')),
					parseFloat(p.getAttribute('lon'))
				];

				const eleEl = p.querySelector('ele');
				if (eleEl) {
					d.push(parseFloat(eleEl.textContent))
				}



				const name = p.querySelector('name')?.textContent ?? `Point #${i}`;

				let trackIndex = data.findIndex(([lat, lon]) => d[0] == lat && d[1] == lon);

				if (trackIndex < 0) {
					const [nearPoint, nearDist, nearInd] = getNearestPointInfo(d, data);
					trackIndex = nearInd;
					d = nearPoint;
				}

				pointsData.push({ name, coords: d, trackIndex });
			});

			localStorage.setItem(pointsDataLSKey, JSON.stringify(pointsData));
			localStorage.setItem(trackDataLSKey, JSON.stringify(data));
			localStorage.setItem(trackMetaLSKey, JSON.stringify(meta));
			init();
      window.location.reload()
		}
	
		const lbl = document.createElement('label');
    lbl.classList.add('needFile')
		lbl.textContent = 'Загрузите GPX трек';
		lbl.appendChild(document.createElement('br'))
		lbl.appendChild(inp)
		headerElement.appendChild(lbl)
	} else {


		const btn = document.getElementById('fab');
		btn.onclick = () => {
			computeFromCurrentPosition()
		}

    btn.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      computeFromCurrentPosition(prompt('Комментарий к отметке', ''))
    }

		const polyline = L.polyline(track.map(([a, b]) => ([a,b])), {color: 'grey', weight: 6, opacity: 0.5})
		polyline.addTo(map)
		map.fitBounds(polyline.getBounds());
		
		points.forEach((point) => {
			
			const icon = L.divIcon({
				className: 'routepoint-div-icon',
				html: "<div data-name='" + point.name + "'></div>",
				iconSize: [8, 8],
				iconAnchor: [4, 4]
			})
					
			const marker = L.marker(point.coords, { icon });
			const popup = L.popup().setContent(point.name);
			marker.on('contextmenu',(e) => {
				L.DomEvent.stopPropagation(e);
				if (confirm('Удалить ' + point.name + '?')) {
					map.removeLayer(marker);
					localStorage.setItem(pointsDataLSKey, JSON.stringify(points.filter(p => p.coords[0] !== point.coords[0] && p.coords[1] !== point.coords[1])));
				}
			})

			marker.bindPopup(popup).openPopup();
			marker.addTo(map);
		})
		
		polyline.on('click',(e) => {
			L.DomEvent.stopPropagation(e);
			const name = prompt('Введите название точки', '')
			if (name) {
				const [nearPoint, nearDist, nearInd] = getNearestPointInfo([e.latlng.lat, e.latlng.lng], track);
				
				points.push({ name, coords: nearPoint, trackIndex: nearInd });
				
				localStorage.setItem(pointsDataLSKey, JSON.stringify(points));

				const marker = L.marker(nearPoint);
				const popup = L.popup().setContent(name);

				marker.bindPopup(popup).openPopup();
				marker.addTo(map);
			}
		});
		
	}
	
	function drawLogs(lo) {
		logMarkersGroup && map.removeLayer(logMarkersGroup)
		logMarkersGroup = L.featureGroup();
		logMarkersGroup.addTo(map);

		lo.forEach((log) => {
			const icon = L.divIcon({
				className: 'routelog-div-icon',
				html: "<div data-name='" + new Date(log.date).toLocaleTimeString().substr(0,5) + (log.dateEnd ? `-${new Date(log.dateEnd).toLocaleTimeString().substr(0,5)}` : '') + (log.comment ? '*' : '') +"' class='" + (log.dateEnd ? 'routelog-div-icon-pause': '') + "'></div>",
				iconSize: [4, 4],
				iconAnchor: [2, 2]
			})
			const marker = L.marker(log.coords, { icon });
			const popup = L.popup().setContent([log.date, log.dateEnd, log.comment].join(' <br> '));

			marker.bindPopup(popup).openPopup();
			marker.addTo(logMarkersGroup);
		})

	}

  function drawCurrentPosition(coords) {
    currentPositionMarker && map.removeLayer(currentPositionMarker)
    

    const icon = L.divIcon({
      className: 'iamhere-div-icon',
      html: "<div></div>",
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })

    currentPositionMarker = L.marker(coords, { icon });
    currentPositionMarker.addTo(map);
    map.panTo(coords);
  }

  function computeAvgSpeed(lgs, date = new Date()) {
    const parts = [];
    let sum = 0;
    for(i = 1; i<lgs.length; i++) {
      const current = lgs[i];
      const prev = lgs[i - 1];
      const lasLog = i === lgs.length - 1 ? lgs[lgs.length - 1]: null;

      const diffMs = lasLog ? date - new Date(lasLog.dateEnd || lasLog.date) : new Date(current.date) - new Date(prev.dateEnd || prev.date) ;
      const diffMeters =  getDistanceForTrack(track.slice( prev.trackIndex, current.trackIndex));

      const speedKmH = (diffMeters / 1000) / (diffMs / 1000 / 60 / 60);
      parts.push(speedKmH)
      sum += speedKmH;
    }

    return sum / parts.length
  }

  function handleCurrentPosition(coords, date = new Date(), comment) {
    let [nearPoint, nearDist, nearInd] = [
      track[0], getDistance(coords, track[0]), 0
    ];

    if (logs.length > 0) {
      [nearPoint, nearDist, nearInd] = getNearestPointInfo(coords, track, logs[logs.length - 1].trackIndex);
    }

    // Рядом с треком (следующая точка в радиусе 100 метров)
    if (nearDist < 100) {
      const now = date;
      let lasLog = logs.length ? logs[logs.length - 1] : null;

      const stackBySeconds = 60; // Схлопывать если время между отметками меньше N секунд
      const stackByMeters = 50; // Схлопывать если расстоние между отметками меньше N метров

      
      if (lasLog) {
        // Тремся на той же точке
        if (lasLog.trackIndex === nearInd || (now - new Date(lasLog.date) <= (stackBySeconds * 1000) || getDistance(lasLog.coords, nearPoint) <= stackByMeters)) {
          lasLog.dateEnd = now.toISOString();
          if (comment) {
            lasLog.comment = lasLog.comment ? [lasLog.comment,comment].join('\n') : comment;
          }
          localStorage.setItem(logsDataLSKey, JSON.stringify(logs));
          drawLogs(logs)
        } else {
        
          const diffMs = now - new Date(lasLog.dateEnd || lasLog.date);
          const diffMeters = getDistanceForTrack(track.slice(lasLog.trackIndex, nearInd + 1));

          const speedKmH = (diffMeters / 1000) / (diffMs / 1000 / 60 / 60);

          lastSpeedKmH = speedKmH;

          avgSpeedKmH = computeAvgSpeed(logs, date)

      

          logs.push({ date: now.toISOString(), coords: nearPoint, trackIndex: nearInd, speed: speedKmH, comment });

          localStorage.setItem(logsDataLSKey, JSON.stringify(logs));

        }

      } else {
        logs.push({ date: now.toISOString(), coords: nearPoint, trackIndex: nearInd, speed: 0, comment });
        localStorage.setItem(logsDataLSKey, JSON.stringify(logs));
        drawLogs(logs)
      }

 
    } else {
      alert('Вы находитесь слишком далеко от трека');
    }
    
    polylineForNearest && map.removeLayer(polylineForNearest);
    polylineForNearest = L.polyline([coords, nearPoint], {weight: 3, color: 'gray', dashArray: '5, 8'})
    const popup = L.popup().setContent(`До ближайшей точки ${nearDist} m.`);
    polylineForNearest.bindPopup(popup).openPopup();
    polylineForNearest.addTo(map);
    
    polylinePassed && map.removeLayer(polylinePassed);
    polylineFutured && map.removeLayer(polylineFutured);

    const passedTrackPart = track.slice(0, nearInd+1);
    const futuredTrackPart = track.slice(nearInd);
    
    const totalDist = getDistanceForTrack(track);
    const passDist = getDistanceForTrack(passedTrackPart);
    const futureDist = getDistanceForTrack(futuredTrackPart);
    
    let nearestPoint = points.length ? points[0] : { coords: track[track.length - 1], trackIndex: track.length - 1, name: 'Финиш' };

    let nearestPointDist = getDistance(coords, nearestPoint.coords);
    
    const futurePoints = points.filter((p) => p.trackIndex >= nearInd).sort((a, b) =>  a.trackIndex - b.trackIndex);
    
    
    const nextPointTrack = futurePoints.length ? futuredTrackPart.slice(0, (futurePoints[0].trackIndex - passedTrackPart.length) + 2): [];
    if (futurePoints.length) {
      nearestPoint = futurePoints[0];
      nearestPointDist = getDistanceForTrack(nextPointTrack)
    }
    
    headerElement.innerHTML = '';

    const stat = document.createElement('div');
    stat.classList.add('statContainer')

    const commonGroup = crEl('fieldset', {},
      crEl('legend', 'Всего'),
      crEl('div', 
        crEl('div', {d:{ label: 'км' }}, (totalDist / 1000).toFixed(1))
      )
    );

    stat.appendChild(commonGroup)

    const passedGroup = crEl('fieldset', {},
      crEl('legend', 'Пройдено'),
      crEl('div', 
        crEl('div', {d:{ label: 'км' }}, (passDist / 1000).toFixed(1)),
        crEl('div', {d:{ label: '%' }}, Math.round((passDist / totalDist) * 100).toLocaleString())
      )
    );

    stat.appendChild(passedGroup)

    const futureGroup = crEl('fieldset', {},
    crEl('legend', 'Осталось'),
    crEl('div', 
      crEl('div', {d:{ label: 'км' }}, (futureDist / 1000).toFixed(1)),
      crEl('div', {d:{ label: '%' }}, Math.round((futureDist / totalDist) * 100).toLocaleString())
    )
  );

  stat.appendChild(futureGroup)

  const distanceForNear = getDistanceForTrack(track.slice(nearInd, nearestPoint.trackIndex));
  
  const nearestGroup = crEl('fieldset', {},
  crEl('legend', nearestPoint.name),
  crEl('div', 
  distanceForNear < 50 ? 'Вы тут' : [
    crEl('div', {d:{ label: 'м' }}, Math.round(distanceForNear).toString()),
  avgSpeedKmH ? crEl('div', {d:{ label: 'минут' }}, Math.ceil(((distanceForNear/1000) / avgSpeedKmH) * 60).toString()) : '—'
  ]
  
  )
);

stat.appendChild(nearestGroup)

const speedGroup = crEl('fieldset', {},
crEl('legend', 'Скорость'),
crEl('div', 
lastSpeedKmH ?  crEl('div', {d:{ label: 'км/ч', title: 'недавняя' }}, lastSpeedKmH.toFixed(1)) : '—',
avgSpeedKmH ?  crEl('div', {d:{ label: 'км/ч', title: 'средняя' }}, avgSpeedKmH.toFixed(1)) : '—'
)
);

stat.appendChild(speedGroup)
  
console.log(window.auth)
    headerElement.appendChild(crEl('div', {c:'header'}, 
      crEl('span', meta.name),
      crEl('button', {
        e: {click: () => {
          console.log(logs);

          const normalizeLogs = (log) => {
            if (!log.comment) log.comment = '';
            if (!log.dateEnd) log.dateEnd = null;
            if (!log.speed) log.speed = 0;
            return log;
          }

          window.db.set(`logs/${window.auth.user.uid}/${new Date().toISOString().substring(0, 10)}`, logs.map(normalizeLogs));
        }},
      }, '⇪ ' + logs.length),
      crEl('span', {}, 
      window.auth?.user
      ? crEl('img', {
        src: window.auth.user.photoURL,
        height: 24,
        alt: '👱‍♂️',
        e: {
          contextmenu: () => confirm('Выйти из аккаунта?') && window.auth.logout(),
        },
        title: [window.auth.user.displayName, window.auth.user.email].join('\n'),
      })
      : crEl('button', {e:{click: () => window.auth.login()}}, 'Войти'))
    ));
    headerElement.appendChild(stat);
    
    polylinePassed = L.polyline(passedTrackPart, {color: 'green', opacity: 1})
    polylineFutured = L.polyline(futuredTrackPart, {color: 'red', opacity: 1})
    polylineNextPoint = L.polyline(nextPointTrack, {color: 'orange', opacity: 1})
    

    polylinePassed.addTo(map)
    polylineFutured.addTo(map)
        polylineNextPoint.addTo(map)

        return [nearPoint, nearDist, nearInd];
  }

  const drawChart = (currentPotitionIndex) => {
    const svg = document.getElementById('svg');
    const plln = document.getElementById('plln');
    const alts = track.map((d) => d[2]);
    const min = Math.min(...alts);
    const max = Math.max(...alts);
    const diff = Math.ceil(max) - Math.floor(min);

    const topOffset = 20;
    const leftOffset = 40;
    const bottomOffset = 15;

    svg.setAttribute('viewBox', `0 0 ${alts.length + leftOffset} ${diff + topOffset + bottomOffset}`);

    let lastKm = 0;
    let kmSum = 0;

    plln.setAttribute('points', alts.map((a, i) => {

        if (i > 0) {
            kmSum += getDistance(track[i-1], track[i]);
          
            if (kmSum/1000 > lastKm + 1) {
                lastKm++;

        
                const text = document.createElementNS("http://www.w3.org/2000/svg",'text')
                text.setAttribute('x',  i + leftOffset);
                text.setAttribute('style', 'text-anchor: middle;');
                text.setAttribute('y', diff + topOffset + bottomOffset);
                text.textContent = lastKm;

                svg.appendChild(text);

                const line = document.createElementNS("http://www.w3.org/2000/svg",'line')
                //<line x1="0" y1="0" x2="100" y2="20"  id="bottomline" />
                line.setAttribute('x1', i + leftOffset);
                line.setAttribute('y1', topOffset-3);
                line.setAttribute('x2', i+ leftOffset);
                line.setAttribute('y2', diff + topOffset );
               

                svg.appendChild(line);
            }
        }


        return ([i + leftOffset, Math.round(max - a) + topOffset, ].join(','))
    }).join(' '))

    const topline = document.getElementById('topline');
    const midline = document.getElementById('midline');
    const bottomline = document.getElementById('bottomline');

    topline.setAttribute('x1', leftOffset)
    midline.setAttribute('x1', leftOffset)
    bottomline.setAttribute('x1', leftOffset)
    topline.setAttribute('x2', alts.length+leftOffset)
    midline.setAttribute('x2', alts.length+leftOffset)
    bottomline.setAttribute('x2', alts.length+leftOffset)


    topline.setAttribute('y1', topOffset);
    topline.setAttribute('y2', topOffset);

    
    midline.setAttribute('y1', Math.round(diff / 2) + topOffset);
    midline.setAttribute('y2', Math.round(diff / 2) + topOffset);

    
    bottomline.setAttribute('y1', Math.floor(diff-1)+topOffset);
    bottomline.setAttribute('y2', Math.floor(diff-1)+topOffset);

    const toplineText = document.getElementById('toplineText');
    const midlineText = document.getElementById('midlineText');
    const bottomlineText = document.getElementById('bottomlineText');
    toplineText.setAttribute('y', topOffset+7);
    midlineText.setAttribute('y', Math.round(diff / 2)+topOffset);
    bottomlineText.setAttribute('y', Math.floor(diff-1)+topOffset);
    toplineText.textContent = Math.ceil(max) + ' м';
    midlineText.textContent = Math.ceil(max - (diff / 2));
    bottomlineText.textContent = Math.ceil(min);

    points.forEach((p, i, all) => {
        const line = document.createElementNS("http://www.w3.org/2000/svg",'line')
        //<line x1="0" y1="0" x2="100" y2="20"  id="bottomline" />
        line.setAttribute('x1', p.trackIndex + leftOffset);
        line.setAttribute('y1', topOffset-3);
        line.setAttribute('x2', p.trackIndex+ leftOffset);
        line.setAttribute('y2', diff + topOffset );
        line.setAttribute('class', 'pointLine' );

        svg.appendChild(line);
        
        const text = document.createElementNS("http://www.w3.org/2000/svg",'text')
        text.setAttribute('x',  p.trackIndex+ leftOffset);
        text.setAttribute('style', i === all.length - 1 ? 'text-anchor: end;' : i === 0 ? '': 'text-anchor: middle;');
        text.setAttribute('y', 12);
        text.textContent = p.name

        svg.appendChild(text);

    })

    if (currentPotitionIndex) {
      const line = document.createElementNS("http://www.w3.org/2000/svg",'line')
      //<line x1="0" y1="0" x2="100" y2="20"  id="bottomline" />
      line.setAttribute('x1', currentPotitionIndex + leftOffset);
      line.setAttribute('y1', topOffset-3);
      line.setAttribute('x2', currentPotitionIndex + leftOffset);
      line.setAttribute('y2', diff + topOffset );
      line.setAttribute('style', 'stroke: red');

      svg.appendChild(line);
      
      const text = document.createElementNS("http://www.w3.org/2000/svg",'text')
      text.setAttribute('x',  currentPotitionIndex + leftOffset);
      text.setAttribute('style', 'text-anchor: middle; fill: red');
      text.setAttribute('y', diff + topOffset +12);
      text.textContent = 'Я'

      svg.appendChild(text);
      text.scrollIntoView()
    }
  }

	function computeFromCurrentPosition(comment) {
    document.getElementById('fab').classList.add('loading');

		navigator.geolocation.getCurrentPosition(function (position) {
      document.getElementById('fab').classList.remove('loading');
      
      const coords = [position.coords.latitude, position.coords.longitude];

      drawCurrentPosition(coords);
			const [nearPoint, nearDist, nearInd] = handleCurrentPosition(coords, new Date(), comment);
      drawLogs(logs);
      drawChart(nearInd)
			
			//map.fitBounds(polylineForNearest.getBounds());
		});
	}

	drawLogs(logs);

  map.on('contextmenu', e => {
    L.DomEvent.stopPropagation(e);
  
    document.getElementById('demoDialog').showModal()
    document.getElementById('demodate').showPicker();

    const coords = [e.latlng.lat, e.latlng.lng];

    document.getElementById('demodate').onchange = (e) => {
      console.log('demodate', e.target.value)
      document.getElementById('demoDialog').close();
      
      drawCurrentPosition(coords);
			handleCurrentPosition(coords, new Date(new Date().setHours(...e.target.value.split(':'))));
      drawLogs(logs);
    }
  })

  computeFromCurrentPosition()

}

init();


