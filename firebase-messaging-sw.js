importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');
      const vapidKey = 'BNm_XFcD3OEB8txsriK-56ctLoMnZV2PsTKs6qpitcn6zrJhcS3vUU1nif7-bQPuPfeKDNOEZx9Vu9z_NzlRHlA';

      const firebaseConfig = {
        apiKey: "AIzaSyCo7VJ_rskVkgvi6gSUEj3A2cegIG4D0Rc",
        authDomain: "gdeyamama-41094.firebaseapp.com",
        projectId: "gdeyamama-41094",
        storageBucket: "gdeyamama-41094.appspot.com",
        messagingSenderId: "462554712065",
        appId: "1:462554712065:web:cf4a4c318c34b38b851800",
        databaseURL: "https://gdeyamama-41094-default-rtdb.europe-west1.firebasedatabase.app",
        storageBucket: 'gs://gdeyamama-41094.appspot.com',
      };
    
      // Initialize Firebase
      const app = firebase.initializeApp(firebaseConfig);
      
      const messaging = firebase.messaging(app);
      messaging.onBackgroundMessage((payload) => {
        console.log(
          "[firebase-messaging-sw.js] Received background message ",
          payload
        );
        const notification = new Notification(payload.notification.title, { body: payload.notification.body, icon: payload.notification.icon });
        notification.addEventListener('click', () => { notification.close() })
      })
        // const data = payload?.notification ?? {};
