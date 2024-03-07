const mapElement = document.getElementById('map');
const map = L.map(mapElement).setView([53.18, 45], 13);
let viewersPushIds = [];

map.on('click', e => {
  console.log(e.latlng)
})

const urlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const baseLayer = L.tileLayer.offline(urlTemplate, {
	maxZoom: 19,
	attributionControl: false
}).addTo(map);

const saveControl = L.control.savetiles(baseLayer, {
  zoomlevels: [12, 15], // optional zoomlevels to save, default current zoomlevel
  alwaysDownload: false,
  confirm(layer, successCallback) {
    // eslint-disable-next-line no-alert
    if (window.confirm(`Сохранить карту OSM области маршрута для доступа без интернета (${layer._tilesforSave.length} кусков)`)) {
      console.log(`Save offline tiles ${layer._tilesforSave.length}`)
      successCallback();
    }
  },
  confirmRemoval(layer, successCallback) {
    // eslint-disable-next-line no-alert
    if (window.confirm('Удалить сохраненные Offline слои карты?')) {
      console.log(`remove offline tiles ${layer._tilesforSave.length}`)
      successCallback();
    }
  },
  saveText: '💾',
  rmText: '🗑️',
});
saveControl.addTo(map);

document.getElementsByClassName( 'leaflet-control-attribution' )[0].style.display = 'none';

//document.querySelector(`.savetiles.leaflet-bar`).style.display = 'none';

const footerElement = document.getElementById('footer');
const headerElement = document.getElementById('header');

const trackHashLSKey = 'track-hash';
const trackMetaLSKey = 'track-meta';
const trackDataLSKey = 'track-data';
const pointsDataLSKey = 'points-data';
const logsDataLSKey = 'logs-data';
const logsLastUploadLSKey = 'logs-data-upload-date';


const hideInstallLSKey = 'logs-data-upload-date';

function hideInstall() {
  localStorage.setItem(hideInstallLSKey,'1');
  document.getElementById('installInstructions').style.display = 'none'
};

document.getElementById('installInstructions').style.display = localStorage.getItem(hideInstallLSKey) ? 'none' : ''


const clear = () => {
  localStorage.removeItem(trackHashLSKey);
  localStorage.removeItem(trackMetaLSKey);
  localStorage.removeItem(trackDataLSKey);
  localStorage.removeItem(pointsDataLSKey);
  localStorage.removeItem(logsDataLSKey);
  localStorage.removeItem(logsLastUploadLSKey);
}


async function init(hashStr) {

  const trackHashStr = localStorage.getItem(trackHashLSKey);
	const trackDataStr = localStorage.getItem(trackDataLSKey);
	const pointsDataStr = localStorage.getItem(pointsDataLSKey);
	const logsDataStr = localStorage.getItem(logsDataLSKey);
	const trackMetaStr = localStorage.getItem(trackMetaLSKey);


  let [hashTrack, hashUser, hashDate] = hashStr.split('/');

  const todayViewerTrackKey = `viewers/${hashTrack}/${hashUser}/${new Date().toISOString().substring(0, 10)}`;

  if (!hashTrack || !hashTrack.length) {
    await checkUserOrAuth('Для получения списка маршрутов');
    const dbTracks = await window.db.get(`tracks`);
    hashTrack = await awaitModal((handleClose) => crEl(

      crEl('strong', 'Выберите маршрут:'),
      crEl('div', {s:{ overflowY:'auto', margin: '16px -16px' }}, 
        Object.entries(dbTracks).map(([k, v]) => crEl('div', {
          role:'button',
          c:'list-item',
          onclick: () => handleClose(true, k)
        },
          crEl(
            crEl('span', { title: [v.name, v.time, v.author.name, v.keywords, v.desc].join('\n')}, v.name),
            crEl('small', v.keywords)
          )
        ))
      ),
      

    ));

    window.location.hash = '#'+hashTrack;
    init(hashTrack);
  }

  const isAnotherTrack = hashTrack && trackHashStr && trackHashStr !== hashTrack;

  if (isAnotherTrack && confirm('Сохраненный на вашем устройстве трек отличается от того, что вы пытаетесь открыть? Обновить?')) {
    clear();
    localStorage.removeItem(trackHashLSKey)
    localStorage.removeItem(pointsDataLSKey);
    localStorage.removeItem(trackDataLSKey);
    localStorage.removeItem(trackMetaLSKey);
    localStorage.removeItem(logsLastUploadLSKey);

    return init(hashStr);
  }
	
	let points = JSON.parse(pointsDataStr || '[]');
	let track = JSON.parse(trackDataStr || '[]');
	let logs = JSON.parse(logsDataStr || '[]');
	let meta = JSON.parse(trackMetaStr || '{}');

	let polylineForNearest;
	let polylinePassed;
	let polylineFutured;

	let lastSpeedKmH;
	let avgSpeedKmH;

	if (!track.length) {
    await checkUserOrAuth('Для получения данных маршрута')
		const url = await window.cloudStorage.getFileUrl(`tracks/${hashTrack}.gpx`);
		const r = await fetch(url);
		const fileContent = await r.text();
    const { trackData, pointsData, metaData } = parseGPXstring(fileContent);

    localStorage.setItem(trackHashLSKey, hashTrack)
    localStorage.setItem(pointsDataLSKey, JSON.stringify(pointsData));
    localStorage.setItem(trackDataLSKey, JSON.stringify(trackData));
    localStorage.setItem(trackMetaLSKey, JSON.stringify(metaData));
    localStorage.removeItem(logsLastUploadLSKey);

    return init(hashStr);
	} 
  
  
  const polyline = L.polyline(
    track.map(([a, b]) => ([a,b])),
    {
      color: 'grey',
      weight: 6,
      opacity: 0.5
    }
  );

  polyline.addTo(map);
  
  map.fitBounds(polyline.getBounds());

  drawRoutePoints(points, map);

  drawHeader(meta);

  const btn = document.getElementById('fab');
  btn.onclick = () => {
    computeFromCurrentPosition()
  }


if (!hashUser) {
    const headerCenterContainerViewers = document.getElementById('headerCenterContainerViewers');
    headerCenterContainerViewers.innerHTML = '';
    headerCenterContainerViewers.appendChild(
      crEl('abbr', {onclick: async function () {
        this.innerText = '⏳';
        const viewersMap = await window.db.get(`viewers/${hashTrack}/${window.auth.user.uid}/${new Date().toISOString().substring(0, 10)}`);
        viewersPushIds = Object.values(viewersMap).filter((u) => u.pushId).map((u) => u.pushId);

        this.innerHTML = '';
        this.appendChild(
          crEl('span', {s:{ display:'flex', gap: '5px' }},
            Object.entries(viewersMap).map(([k,v]) => crEl('img', {
              src: v.photo,
              width: '16',
              s: v.pushId ? {border: '2px solid violet', borderRadius:'50%'} : {}, 
              onclick: () => alert([v.name, v.count + 'раз', new Date(v.lastView).toLocaleString()].join('\n'))
            }))
          )
        )
      }},
        '🔭'
      )
    );


  }
 

  
  const centerContainer = document.getElementById('headerCenterContainer');
  centerContainer.innerHTML = '';

  centerContainer.appendChild(
    hashUser
      ? crEl('strong', {id:'watchTarget'}, 'Наблюдатель')
      : crEl('button', {
        id: 'uploadBtn',
      e: {click: async function () {
        console.log(logs);

        this.innerText = '⏳';

        const normalizeLogs = (log) => {
          if (!log.comment) log.comment = '';
          if (!log.dateEnd) log.dateEnd = null;
          if (!log.speed) log.speed = 0;
          return log;
        }

        localStorage.setItem(logsLastUploadLSKey, new Date().toISOString())
        await checkUserOrAuth('Для отправки данных');
        await window.db.set(`logs/${window.auth.user.uid}/${trackHashStr}/${new Date().toISOString().substring(0, 10)}`, logs.map(normalizeLogs));
        this.innerText = '✅';

        
        if (viewersPushIds.length) {
          const lastLog = logs[logs.length - 1];
          let [nearPoint, nearDist, nearInd] = getNearestPointInfo(lastLog.coords, track, lastLog.trackIndex);
          
          const nPoint = points.find((p) => p.trackIndex >= nearInd);

          if (nPoint) {
            nearDist = getDistanceForTrack(track.slice(lastLog.nearInd, nPoint.trackIndex))
          }

          viewersPushIds.map((pushId) => {
            const message = {
              deviceId: pushId,
              title: window.auth.user.displayName,
              body: [lastLog.comment, `${(nearDist/1000).toFixed(1)} км до ${nPoint.name || nearPoint}`].filter(Boolean).join('\n'),
              icon: window.auth.user.photoURL,
              site: 'https://gdeyamama.github.io/' + trackHashStr + '/' + window.auth.user.uid + '/' + new Date().toISOString().substring(0, 10)
            }
            console.log('Push',{message})
            window.pushMsg.send(message)
          })
        }

      }},
    })
  )


  btn.oncontextmenu = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hashUser) {
       computeFromCurrentPosition(prompt('Комментарий к отметке', ''))
    } else {
      const userData = await window.db.get(`users/${hashUser}`);
      if (userData.pushId) {
        const message = {
          deviceId: userData.pushId,
          title: window.auth.user.displayName,
          body: prompt('Комментарий', 'Давай, Давай!!!'),
          icon: window.auth.user.photoURL,
          site: 'https://gdeyamama.github.io/'
        }

        window.pushMsg.send(message)
      }
    }

   
  }


  function updateLogs(up_logs) {
    
    !hashUser && localStorage.setItem(logsDataLSKey, JSON.stringify(up_logs));
    drawLogs(up_logs, map)
  }

  function handleCurrentPosition(coords, date = new Date(), comment) {

    const stackBySeconds = 60; // Схлопывать если время между отметками меньше N секунд
    const stackByMeters = 50; // Схлопывать если расстоние между отметками меньше N метров
    const allowPointsDistance = 100; // За сколько метров от любой точки трека можно отметиться на ней

    const lastLog = logs[logs.length - 1];
    const lastTrackIndex = lastLog?.trackIndex ?? 0;

    let [nearPoint, nearDist, nearInd] = getNearestPointInfo(coords, track, lastTrackIndex);

    if (logs.length == 0) {
      // Если нет логов считаем бижайшей нулевую точку маршрута (старт)
      const distToStart = getDistance(coords, track[0]);
      if (nearInd !=0 &&  distToStart < allowPointsDistance && confirm('Ближайшая к вам точка не является стартовой,\nно тут не далеко (' + Math.round(distToStart)+ 'м.). \nОтметиться на старте?')) {
        [nearPoint, nearDist, nearInd] = [ track[0], distToStart, 0];
      }
      
    } else {
      // Если есть логи ближайшей считаем ближайшую в треке  к сoords, начиная с индекса последнего лога
      [nearPoint, nearDist, nearInd] = getNearestPointInfo(coords, track, lastTrackIndex);
    }

    // Рядом с треком (следующая точка в радиусе 100 метров)
    if (nearDist <= allowPointsDistance) {
      const now = date;
      let lasLog = logs.length ? logs[logs.length - 1] : null;


      if (lasLog) {
        // Тремся на той же точке
        if (lasLog.trackIndex === nearInd || (now - new Date(lasLog.date) <= (stackBySeconds * 1000) || getDistance(lasLog.coords, nearPoint) <= stackByMeters)) {
          if(!hashUser) { lasLog.dateEnd = now.toISOString(); }
          if (comment) {
            lasLog.comment = lasLog.comment ? [lasLog.comment,comment].join('\n') : comment;
          }

          const prevLog = logs[logs.length - 2];

          if (prevLog) {
            const diffMs = new Date(lasLog.date) - new Date(prevLog.dateEnd || prevLog.date);
            const diffMeters = getDistanceForTrack(track.slice(prevLog.trackIndex, lasLog.trackIndex));
            const speedKmH = (diffMeters / 1000) / (diffMs / 1000 / 60 / 60);
    
            lastSpeedKmH = speedKmH;

          }

          updateLogs(logs);
        } else {
        


          

          const diffMs = now - new Date(lasLog.dateEnd || lasLog.date);
          const diffMeters = getDistanceForTrack(track.slice(lasLog.trackIndex, nearInd));
  
  
          const speedKmH = (diffMeters / 1000) / (diffMs / 1000 / 60 / 60);
  
          lastSpeedKmH = speedKmH;

          !hashUser && logs.push({ date: now.toISOString(), coords: nearPoint, trackIndex: nearInd, comment, speed: lastSpeedKmH });

          updateLogs(logs);

        }

        



        avgSpeedKmH = getAvgSpeedForLogs(track, logs, date)

    

      } else {
        !hashUser && logs.push({ date: now.toISOString(), coords: nearPoint, trackIndex: nearInd, speed: 0, comment });
        updateLogs(logs);
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
    
    document.getElementById('stat').innerHTML = '';

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
      crEl('div', {d:{ label: '%' }}, Math.round((futureDist / totalDist) * 100).toLocaleString()),
    )
  );

  stat.appendChild(futureGroup);


      

  const distanceForNear = getDistanceForTrack(track.slice(nearInd, nearestPoint.trackIndex));
  
  const nearestGroup = crEl('fieldset', {},
  crEl('legend', nearestPoint.name),
  crEl('div', 
  distanceForNear < 50 && nearDist < 50? 'Вы тут' : [
    crEl('div', {d:{ label: 'км' }}, (distanceForNear / 1000).toFixed(1)),
  avgSpeedKmH ? crEl('div', {d:{ label: '' }}, 
  new Date((((distanceForNear/1000) / avgSpeedKmH) * 60 * 60 * 1000) + new Date().getTimezoneOffset() * 60000).toLocaleTimeString([], {timeStyle: 'short'})
  ) : '—'
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

if (avgSpeedKmH) {
  const prognozGroup = crEl('fieldset', {},
  crEl('legend', 'Прогноз'),
  crEl('div', 
  avgSpeedKmH ? crEl('div', {d:{ title: 'финиш', label: '' }}, new Date(Date.now() + ((futureDist/1000) / avgSpeedKmH) * 60 * 60 * 1000).toLocaleTimeString([], {timeStyle: 'short'})) : '—'
  
  )
  );
  
  stat.appendChild(prognozGroup)
}

const logsWithEnds = logs.filter((l) => l.dateEnd);
if (logsWithEnds.length) {
  const pausesGroup = crEl('fieldset', {},
  crEl('legend', 'Остановки'),
  crEl('div', 
   crEl('div', {d:{ label: '', title: 'чч:мм' }}, new Date(logsWithEnds.reduce((acc, val) => new Date(val.dateEnd) - new Date(val.date), 0) + new Date().getTimezoneOffset() * 60000).toLocaleTimeString([], {timeStyle: 'short'})) ,
  )
  );
  
  stat.appendChild(pausesGroup)
}




document.getElementById('stat').appendChild(stat);

    const lastUploadDateStr = localStorage.getItem(logsLastUploadLSKey);

    const unuploadedLogs = logs.filter((l) => new Date(l.dateEnd || l.date) >= new Date(lastUploadDateStr))

    if (!hashUser) {
      const uploadBtn = document.getElementById('uploadBtn');
      if (uploadBtn) {
        uploadBtn.textContent = '⇪ ' + unuploadedLogs.length;


      }
      
    }
    
    
    polylinePassed = L.polyline(passedTrackPart, {color: 'green', opacity: 1})
    polylineFutured = L.polyline(futuredTrackPart, {color: 'red', opacity: 1})
    polylineNextPoint = L.polyline(nextPointTrack, {color: 'orange', opacity: 1})
    

    polylinePassed.addTo(map)
    polylineFutured.addTo(map)
    polylineNextPoint.addTo(map)

    return [nearPoint, nearDist, nearInd];
  }

	async function computeFromCurrentPosition(comment) {
    
    document.getElementById('fab').classList.add('loading');

    if (hashUser) {
      await checkUserOrAuth('Для получения данных');
      const userLogs = await window.db.get(`logs/${hashUser}/${trackHashStr}/${hashDate || new Date().toISOString().substring(0, 10)}`);
      logs = userLogs;
      drawLogs(userLogs, map);
      
      const {coords} = userLogs[userLogs.length-1]
      drawCurrentPosition(coords, map);
      map.panTo(coords);

      const [nearPoint, nearDist, nearInd] = handleCurrentPosition(coords, new Date());
      drawChart(track, points, nearInd)

      const todayViewerTrackKeyForCurrent = `${todayViewerTrackKey}/${window.auth.user.uid}`;
      const alreadyViewer = await window.db.get(todayViewerTrackKeyForCurrent);
      const userData = await window.db.get(`users/${window.auth.user.uid}`)

      if (alreadyViewer) {
        const path = { ...userData, count: alreadyViewer.count + 1, lastView: new Date().toISOString() };
        await window.db.set(todayViewerTrackKeyForCurrent, path);
      } else {
        
        await window.db.set(todayViewerTrackKeyForCurrent, {
          ...userData,
          count: 1,
          lastView: new Date().toISOString(),
        });
      }
      
      
      document.getElementById('fab').classList.remove('loading');
    } else {
      navigator.geolocation.getCurrentPosition(function (position) {
        document.getElementById('fab').classList.remove('loading');
        
        const coords = [position.coords.latitude, position.coords.longitude];
  
        drawCurrentPosition(coords, map);
        map.panTo(coords);
        const [nearPoint, nearDist, nearInd] = handleCurrentPosition(coords, new Date(), comment);
        drawLogs(logs, map);
        drawChart(track, points, nearInd)
        
        //map.fitBounds(polylineForNearest.getBounds());
      }, (err) => alert(err.message), {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    }
	}

	drawLogs(logs, map);
  drawChart(track, points)

  map.on('contextmenu', e => {
    L.DomEvent.stopPropagation(e);
  
    document.getElementById('demoDialog').showModal()
    document.getElementById('demodate').showPicker();

    const coords = [e.latlng.lat, e.latlng.lng];

    document.getElementById('demodate').onchange = (e) => {
      console.log('demodate', e.target.value)
      document.getElementById('demoDialog').close();
      
      drawCurrentPosition(coords, map);
      map.panTo(coords);
			handleCurrentPosition(coords, new Date(new Date().setHours(...e.target.value.split(':'))));
			const [nearPoint, nearDist, nearInd] = handleCurrentPosition(coords, new Date());
      drawLogs(logs, map);
      drawChart(track, points, nearInd)
    }
  })

  //computeFromCurrentPosition()

  if (hashUser) {
    await checkUserOrAuth('Для получения данных');
    const user = await window.db.get(`users/${hashUser}`);
    document.getElementById('fab').innerHTML = `<svg class="MuiSvgIcon-root MuiSvgIcon-fontSizeSmall  css-f5io2" focusable="false" aria-hidden="true" viewBox="0 0 24 24" width="24" data-testid="SyncIcon" aria-label="fontSize small"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8m0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4z" fill="white"></path></svg>`;
    document.getElementById('fab').title = user.name;

    document.getElementById('watchTarget').innerHTML = '';

document.getElementById('watchTarget').appendChild(crEl('small', {s:{display: 'flex', alignItems: 'center', gap: '4px'}},
    crEl('img', {src: user.photo, height: 24}),
    crEl('small', user.name.split(/\s/).map((s) => crEl('div', s)))
));

document.title = 'Наблюдение: ' + user.name + ' на маршруте ' + meta.name

    console.log(user);
  }

  const userContainer2 = document.getElementById('userContainer2');
  userContainer2.innerHTML = '';

}

init(window.location.hash.substr(1))

