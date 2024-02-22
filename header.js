const drawHeader = (meta) => {
  const handleTitleClick = () => {
    const d = crEl('dialog',
    crEl('h4', 
    crEl('button', {s: {float: 'right'}, e: {click: () => { d.close(); document.body.removeChild(d) }}}, '×'),
    meta.name),
    crEl('p', {s: {width: '80vw',whiteSpace: 'pre-line' }}, meta.desc)
    );
    document.body.appendChild(d)
    d.showModal()
  };

  headerElement.innerHTML = '';
  headerElement.appendChild(
    crEl('div', { c:'header' }, 
      crEl('span', { title: meta.desc, e: { click: handleTitleClick }}, meta.name),
      crEl('span', {id: 'headerCenterContainer'}),
      crEl('span', {}, 
        window.auth?.user
      ? crEl('img', {
        src: window.auth.user.photoURL,
        height: 24,
        alt: '👱‍♂️',
        e: {
          click: () => {
            const link = location.origin + window.location.hash.split('/') + '/' + window.auth.user.uid;
            awaitModal((handleClose) => crEl(
              crEl('p', {s:{textAlign:'center'}},'Ссылка на активность', crEl('br'), crEl('code', link)),
              crEl('p', {s:{textAlign:'center'}}, 
                crEl('button', { c:'button', e: { click: async function() {
                  handleClose(true, link)
                } } }, 'Скопировать')
              )
            )).then((txt) => {
              navigator.clipboard.writeText(txt)
            })
            
          },
          contextmenu: () => confirm('Выйти из аккаунта?') && window.auth.logout(),
        },
        title: [window.auth.user.displayName, window.auth.user.email].join('\n'),
      })
      : null)
    ))
}


