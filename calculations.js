function getAvgSpeedForLogs(track, logs, date = new Date()) {
  const parts = [];
  let sum = 0;
  for(i = 1; i<logs.length; i++) {
    const current = logs[i];
    const prev = logs[i - 1];
    const lasLog = i === logs.length - 1 ? logs[logs.length - 1]: null;

    const diffMs =  new Date(current.date) - new Date(prev.dateEnd || prev.date) ;
    const diffMeters =  getDistanceForTrack(track.slice( prev.trackIndex, current.trackIndex));

    const speedKmH = (diffMeters / 1000) / (diffMs / 1000 / 60 / 60);
    parts.push(speedKmH)
    sum += speedKmH;
  }
  console.log({sum, parts});
  return sum / parts.length
}
