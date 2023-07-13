importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

workbox.precaching.precacheAndRoute([{"revision":"3c96f722c4fb528b6a168a9006c318a7","url":"dist/app.js"},{"revision":"c3bf00e585782373e1b601c07b513d85","url":"dist/fonts/Quicksand_Bold.otf"},{"revision":"891d5740c1af1fad4da3afee1289c11c","url":"dist/images/cropped-bird_red-2.webp"},{"revision":"d6223ad2dfebbfe22e932087e0ec74f0","url":"dist/images/red_bird_256.webp"},{"revision":"b394d72bd7a8aeb4cc3e27318a8a2db2","url":"dist/index.html"},{"revision":"3898363e28ac803232de451798ccd214","url":"dist/styles/app.css"},{"revision":"8db80d14a94ef45c2fe93abb2a8b1ab0","url":"index.html"},{"revision":"f3c6bfd852491a14a1828369a8a8eca2","url":"manifest.json"}], {});

const channel = new BroadcastChannel("cr-message-channel");

let version = 0.9;
let cachingProgress = 0;
let cachableAssetsCount = 0;

self.addEventListener("install", async function (e) {
  self.addEventListener("message", async (event) => {
    console.log("Registration message received in the service worker ");
    if (event.data.type === "Registration") {
      if (!!!caches.keys().length) {
        cachingProgress = 0;
        let cacheName = await getCacheName(event.data.value);
      }
    }
  });
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  console.log("Service worker activated");
  event.waitUntil(self.clients.claim());
  channel.postMessage({ command: "Activated", data: {} });
});

channel.addEventListener("message", async function (event) {
  if (event.data.command === "Cache") {
    console.log("Caching request received in the service worker with data: ");
    console.log(event.data);
    cachingProgress = 0;
    await cacheTheBookJSONAndImages(event.data.data);
  }
});

function updateCachingProgress() {
  cachingProgress++;
  let progress = Math.round((cachingProgress / cachableAssetsCount) * 100);
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) =>
      client.postMessage({
        msg: "Loading",
        data: progress,
      })
    );
  });
}

function cacheTheBookJSONAndImages(data) {
  console.log("Caching the book JSON and images");
  let bookData = data["bookData"];
  let bookAudioAndImageFiles = [];
  
  for (let i = 0; i < bookData["pages"].length; i++) {
    let page = bookData["pages"][i];
    for (let j = 0; j < page["visualElements"].length; j++) {
      let visualElement = page["visualElements"][j];
      if (visualElement["type"] === "audio") {
        bookAudioAndImageFiles.push("/BookContent/LetsFlyLevel2En/content/" + visualElement["audioSrc"]);
        for (let k = 0; k < visualElement["audioTimestamps"]["timestamps"].length; k++) {
          bookAudioAndImageFiles.push("/BookContent/LetsFlyLevel2En/content/" + visualElement["audioTimestamps"]["timestamps"][k]["audioSrc"]);
        }
      } else if (visualElement["type"] === "image" && visualElement["imageSource"] !== "empty_glow_image") {
        bookAudioAndImageFiles.push("/BookContent/LetsFlyLevel2En/content/" + visualElement["imageSource"]);
      }
    }
  }

  cachableAssetsCount = bookAudioAndImageFiles.length;
  

  bookAudioAndImageFiles.push(data["contentFile"]);

  console.log("Book audio files: ", bookAudioAndImageFiles);

  caches.open(bookData["bookName"]).then((cache) => {
    for (let i = 0; i < bookAudioAndImageFiles.length; i++) {
      cache.add(bookAudioAndImageFiles[i]).finally(() => {
        updateCachingProgress();
      }).catch((error) => {
        console.log("Error while caching the book JSON", error);
      });
    }
    cache.addAll(bookAudioAndImageFiles).catch((error) => {
      console.log("Error while caching the book JSON", error);
    });
  });
}

self.addEventListener("fetch", function (event) {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.protocol === 'chrome-extension:') {
    return;
  }
  event.respondWith(
      caches.match(event.request).then(function (response) {
          if (response) {
            return response;
          }
          return fetch(event.request);
      })
  );
});