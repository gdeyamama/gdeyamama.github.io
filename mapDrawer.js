let markersGroup;

const drawRoutePoints = (points, map) => {
  markersGroup && map.removeLayer(markersGroup)
  markersGroup = L.featureGroup();
  markersGroup.addTo(map);

  points.forEach((point) => {
			
    const icon = L.divIcon({
      className: 'routepoint-div-icon',
      html: "<div data-name='" + point.name + "'></div>",
      iconSize: [8, 8],
      iconAnchor: [4, 4]
    })
        
    const marker = L.marker(point.coords, { icon });

    const popup = L.popup().setContent(crEl(
      crEl('div', crEl('b', point.name)),
      crEl('p', point.desc),
      crEl('p', crEl('small', {s: {opacity:0.5}}, point.cmt)),
      crEl('p', {s:'text-align: right'}, crEl('small', crEl('a', {href:`geo:${point.lat},${point.lon}`}, point.coords.slice(0,2).map(c => c.toFixed(5)).join(', '))))
    ));

    marker.bindPopup(popup);
    marker.addTo(markersGroup);
  })
}

let logMarkersGroup;

function drawLogs(logs, map) {
  logMarkersGroup && map.removeLayer(logMarkersGroup)
  logMarkersGroup = L.featureGroup();
  logMarkersGroup.addTo(map);

  logs.forEach((log) => {
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

let currentPositionMarker;

function drawCurrentPosition(coords, map) {
  currentPositionMarker && map.removeLayer(currentPositionMarker)

  const icon = L.divIcon({
    className: 'iamhere-div-icon',
    html: "<div></div>",
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  })

  currentPositionMarker = L.marker(coords, { icon });
  currentPositionMarker.addTo(map);
}
