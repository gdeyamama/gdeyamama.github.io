const drawChart = (track, points, currentPotitionIndex) => {
  const svg = document.getElementById('svg');
  const plln = svg.getElementById('plln');

  const alts = track.map((d) => d[2]);
  const min = Math.min(...alts);
  const max = Math.max(...alts);
  const diff = Math.ceil(max) - Math.floor(min);

  const dw = document.body.clientWidth;
  const hCoeff = alts.length < dw ? Math.ceil(dw / alts.length)+1 : 1;
  const vCoeff = diff < 100 ? Math.ceil(100 / diff)+1 : 1

  const topOffset = 20;
  const leftOffset = 40;
  const bottomOffset = 15;

  svg.setAttribute('viewBox', `0 0 ${(alts.length * hCoeff) + leftOffset} ${(diff * vCoeff) + topOffset + bottomOffset}`);

  let lastKm = 0;
  let kmSum = 0;

  plln.setAttribute('points', alts.map((a, i) => {

      if (i > 0) {
          kmSum += getDistance(track[i-1], track[i]);
        
          if (kmSum/1000 > lastKm + 1) {
              lastKm++;

      
              const text = document.createElementNS("http://www.w3.org/2000/svg",'text')
              text.setAttribute('x',  (i * hCoeff) + leftOffset);
              text.setAttribute('style', 'text-anchor: middle;');
              text.setAttribute('y', (diff * vCoeff) + topOffset + bottomOffset);
              text.textContent = lastKm;

              svg.appendChild(text);

              const line = document.createElementNS("http://www.w3.org/2000/svg",'line')
              //<line x1="0" y1="0" x2="100" y2="20"  id="bottomline" />
              line.setAttribute('x1', (i * hCoeff) + leftOffset);
              line.setAttribute('y1', topOffset-3);
              line.setAttribute('x2', (i * hCoeff) + leftOffset);
              line.setAttribute('y2', (diff * vCoeff) + topOffset );
             

              svg.appendChild(line);
          }
      }


      return ([(i * hCoeff) + leftOffset, (Math.round(max - a) * vCoeff) + topOffset, ].join(','))
  }).join(' '))

  const topline = svg.getElementById('topline');
  const midline = svg.getElementById('midline');
  const bottomline = svg.getElementById('bottomline');

  topline.setAttribute('x1', leftOffset)
  midline.setAttribute('x1', leftOffset)
  bottomline.setAttribute('x1', leftOffset)
  topline.setAttribute('x2', (alts.length * hCoeff)+leftOffset)
  midline.setAttribute('x2', (alts.length * hCoeff)+leftOffset)
  bottomline.setAttribute('x2', (alts.length * hCoeff)+leftOffset)


  topline.setAttribute('y1', topOffset);
  topline.setAttribute('y2', topOffset);

  
  midline.setAttribute('y1', Math.round((diff * vCoeff) / 2) + topOffset);
  midline.setAttribute('y2', Math.round((diff * vCoeff) / 2) + topOffset);

  bottomline.setAttribute('y1', Math.floor((diff * vCoeff)-1)+topOffset);
  bottomline.setAttribute('y2', Math.floor((diff * vCoeff)-1)+topOffset);

  const toplineText = document.getElementById('toplineText');
  const midlineText = document.getElementById('midlineText');
  const bottomlineText = document.getElementById('bottomlineText');
  toplineText.setAttribute('y', topOffset+7);
  midlineText.setAttribute('y', Math.round((diff * vCoeff) / 2)+topOffset);
  bottomlineText.setAttribute('y', Math.floor((diff * vCoeff)-1)+topOffset);
  toplineText.textContent = Math.ceil(max) + ' м';
  midlineText.textContent = Math.ceil(max - (diff / 2));
  bottomlineText.textContent = Math.ceil(min);

  points.forEach((p, i, all) => {
      const lineId = `chart-point-line-${i}`;
      let line = svg.getElementById(lineId);
      
      if (!line) {
        line = document.createElementNS("http://www.w3.org/2000/svg",'line');
        line.setAttribute('x1', (p.trackIndex * hCoeff) + leftOffset);
        line.setAttribute('y1', topOffset-3);
        line.setAttribute('x2', (p.trackIndex * hCoeff)+ leftOffset);
        line.setAttribute('y2', (diff * vCoeff) + topOffset );
        line.setAttribute('class', 'pointLine');
        line.setAttribute('id', lineId);
        svg.appendChild(line);
      }

      const textId = `chart-point-txt-${i}`;
      let text = svg.getElementById(textId);

      if (!text) {
        text = document.createElementNS("http://www.w3.org/2000/svg",'text')
        text.setAttribute('x',  (p.trackIndex * hCoeff)+ leftOffset);
        text.setAttribute('style', i === all.length - 1 ? 'text-anchor: end;' : i === 0 ? '': 'text-anchor: middle;');
        text.setAttribute('y', 12);
        text.setAttribute('id', textId);
        text.textContent = p.name
        svg.appendChild(text);
      }
  })

  if (currentPotitionIndex) {
    const currentPosId = `chart-current-position-line`;
    let line = svg.getElementById(currentPosId)

    if (!line) {
      line = document.createElementNS("http://www.w3.org/2000/svg",'line');
      line.setAttribute('id', currentPosId);
      line.setAttribute('y1', topOffset-3);
      line.setAttribute('y2', (diff * vCoeff) + topOffset );
      line.setAttribute('style', 'stroke: red');
      svg.appendChild(line);
    }

    line.setAttribute('x1', (currentPotitionIndex * hCoeff) + leftOffset);
    line.setAttribute('x2', (currentPotitionIndex * hCoeff) + leftOffset);

    const currentPosIdText = `chart-current-position-text`;
    let text = svg.getElementById(currentPosIdText);

    if (!text) {
      text = document.createElementNS("http://www.w3.org/2000/svg",'text')
      text.setAttribute('style', 'text-anchor: middle; fill: red');
      text.setAttribute('y', (diff * vCoeff) + topOffset +12);
      text.textContent = '🏃‍♂️'
      text.setAttribute('id', currentPosIdText);
  
      svg.appendChild(text);
    }

    text.setAttribute('x',  (currentPotitionIndex * hCoeff) + leftOffset);
    text.scrollIntoView({  block: "center", inline: "center" })
  }

}
