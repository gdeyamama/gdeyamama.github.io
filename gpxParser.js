// const { trackData, pointsData, metaData } = parseGPXstring(str);
const parseGPXstring = (gpxString) => {
  const parser = new DOMParser();
	const doc = parser.parseFromString(gpxString, "text/xml");

  const trkpts = Array.from(doc.getElementsByTagName('trkpt'));
  const rtepts = Array.from(doc.getElementsByTagName('rtept'));
  const wpts = Array.from(doc.getElementsByTagName('wpt'));
			
  const trackData = []; // [lat, lon, alt*]
  const pointsData = [];
  const metaData = {};

  const parsedmeta = {
    name: doc.querySelector('metadata>name')?.textContent
        || doc.querySelector('rte>name')?.textContent
        || doc.querySelector('trk>name')?.textContent
        || e.target.files[0].name,
    desc: doc.querySelector('metadata>desc')?.textContent
        || doc.querySelector('rte>desc')?.textContent
        || doc.querySelector('trk>desc')?.textContent
        || '',
    author: {
      name: doc.querySelector('metadata>author>name')?.textContent,
      email: doc.querySelector('metadata>author>email')?.textContent
    },
    time: doc.querySelector('metadata>time')?.textContent,
    keywords: doc.querySelector('metadata>keywords')?.textContent
  };
			
	Object.assign(metaData, parsedmeta);
  
  const allTracksPoints = [...trkpts, ...rtepts];
    allTracksPoints.forEach((p) => {
      const d = [
        parseFloat(p.getAttribute('lat')),
        parseFloat(p.getAttribute('lon'))
      ];
    
      const eleEl = p.querySelector('ele');
      if (eleEl) {
        d.push(parseFloat(eleEl.textContent))
      }

      trackData.push(d);
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
      
      const lat = parseFloat(p.getAttribute('lat'));
      const lon = parseFloat(p.getAttribute('lon'));
      const trackIndex = trackData.findIndex(([la, lo]) => la == lat && lo == lon);
      
      const point = {
        lat,
        lon,
        ele: parseFloat(p.querySelector('ele')?.textContent || trackData[trackIndex]?.[2] || 0),
        name: p.querySelector('name')?.textContent ?? `Point #${i}`,
        cmt: p.querySelector('cmt')?.textContent ?? '',
        desc: p.querySelector('desc')?.textContent ?? '',
        src: trackIndex
      }

      if (trackIndex < 0) {
        const [nearPoint, nearDist, nearInd] = getNearestPointInfo([lat, lon], trackData);
        point.src = nearInd;
        point.lat = nearPoint[0];
        point.lon = nearPoint[1];
        point.ele = nearPoint[2];
      }
      
      point.coords = [point.lat, point.lon, point.ele];
      point.trackIndex = point.src

      pointsData.push(point)
    });

    return { trackData, pointsData, metaData };
}

