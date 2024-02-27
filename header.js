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

  const userContainer = crEl('span');

  window.addEventListener("authStateChange", async (e) => {
    //{ detail: { user } }
    window.auth.user = e.detail.user;

    const userData = await window.db.get(`users/${window.auth.user.uid}`)

    console.log({ userData });

    let pushToken; 

    userContainer.innerHTML = '';
    userContainer.appendChild(
      crEl('div', {s:{display: 'flex', alignItems:'center', gap:'12px'}},
        crEl('label',{s:{display: 'flex', alignItems:'center'}},
          crEl('input', { type: 'checkbox', checked: !!userData.pushId, onchange: async (e) => {
            e.target.disabled = true
            if (e.target.checked) {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                pushToken = await window.pushMsg.getToken();
                await window.db.set(`users/${window.auth.user.uid}`, {...userData, pushId: pushToken})
              } else {
                alert('Это не работает без достпа у уведомлениям');
              }
            } else {
              await window.db.set(`users/${window.auth.user.uid}`, {...userData, pushId: null})
            }
            e.target.disabled = false
          } }),
          crEl('small', '🗨')
        ),
        // crEl('button', {
        //   onclick: () => {
        //     const message = {
        //       deviceId: pushToken,
        //       title: 'Ololo',
        //       body: 'trololo',
        //       icon: 'ooo',
        //       site: 'https://ya.ru'
        //     }

        //     window.pushMsg.send(message)
        //   }

        // }, 's'),
        crEl('img', {
          src: window.auth.user.photoURL,
          height: 24,
          alt: '👱‍♂️',
          e: {
            click: () => {
              const link = location.origin + window.location.hash.split('/') + '/' + window.auth.user.uid;
              awaitModal((handleClose) => crEl(
                crEl('div', {s:{display:'flex', gap: '12px'}}, 
                crEl('img', { src: window.auth.user.photoURL }),
                crEl('div',
                  crEl('h3', {s:'margin-bottom:0; margin-top:0'}, window.auth.user.displayName),
                  crEl('div', {s:'opacity:0.5; margin-bottom: 16px'}, window.auth.user.email),
                  crEl('button', {onclick: () => confirm('Выйти из аккаунта?') && window.auth.logout().then(location.reload)}, 'Выйти')
                )
                ),
                crEl('hr'),
                crEl('p', {s:{textAlign:'center'}},'Ссылка на активность', crEl('br'), crEl('code', link)),
                crEl('p', {s:{display:'flex',  alignItems:'center', justifyContent:'center', gap: '8px'}}, 
                  crEl('button', { c:'button', e: { click: async function() {
                    handleClose(true, link)
                  } } }, 'Скопировать'),
                  crEl('button', { c:'button', e: { click: async function() {
                    const shareData = {
                      title: window.auth.user.displayName,
                      text: `${window.auth.user.displayName} на маршруте «${meta.name}»`,
                      url: link,
                    };
                    await navigator.share(shareData);
                    handleClose(true, link)
                  } } }, 'Поделиться')
                )
              )).then((txt) => {
                navigator.clipboard.writeText(txt)
              })
              
            }
          },
          title: [window.auth.user.displayName, window.auth.user.email].join('\n'),
        })
      )
    )

    
  })

  headerElement.innerHTML = '';
  headerElement.appendChild(
    crEl('div', { c:'header' }, 
      crEl('span', { title: meta.desc, e: { click: handleTitleClick }}, meta.name),
      crEl('span', {id: 'headerCenterContainerViewers'}),
      crEl('span', {id: 'headerCenterContainer'}),

      crEl('span', {id: 'userContainer2'}),
      userContainer
    ))
}


