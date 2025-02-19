let map;

let startPosition = [];
let destinationPosition = [];

async function fetchApiKey() {
  const response = await fetch('/api-key');
  const data = await response.json();
  return data.apiKey;
}

async function loadGoogleMapsAPI() {
  const GOOGLE_MAP_API_KEY = await fetchApiKey();
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAP_API_KEY}`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
  script.onload = initMap;
}

// Main
async function initMap() {
  // Request needed libraries.
  //@ts-ignore
  const { Map } = await google.maps.importLibrary("maps");
  const { SearchBox } = await google.maps.importLibrary("places");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

  // Initialize the map
  var map = new Map(document.getElementById('map'), {
    center: { lat: -34.6037, lng: -58.3816 }, // Coordinates for Buenos Aires
    zoom: 13,
    mapId: "MAP_ID",
  });

  let destinationPosition;
  let travelMode;
  let safetyMode;

  // Check if AI button is clicked
  const aiButton = document.getElementById('ai');

  const walkingButton = document.getElementById('walking');
  const cyclingButton = document.getElementById('cycling');

  aiButton.addEventListener("click", async function () {
    const routeJsonString = await askAIForRoute(aiButton);
    routeJson = JSON.parse(routeJsonString);

    if (window.markers) {
      window.markers.forEach(marker => marker.setMap(null));
    }
    window.markers = [];

    destinationPosition = await geoCoder(routeJson.end);
    map.setZoom(15);
    map.setCenter(destinationPosition);

    // Create a new marker
    const marker = new AdvancedMarkerElement({
      map: map,
      title: destinationPosition.name,
      position: destinationPosition,
      title: "Uluru",
    });
    // Store the marker
    window.markers.push(marker);

    console.log("Destination Position from AI:", destinationPosition);
    safetyMode = routeJson["safety mode"];
    console.log("Safety Mode:", safetyMode);
    travelMode = routeJson["traveling mode"];
    console.log("Travel Mode:", travelMode);

    // destinationPosition = await search(map, routeJson.end, SearchBox, AdvancedMarkerElement);
    // console.log("Destination Position from Search:", destinationPosition);

    if (travelMode === "walking") {
      walkingButton.style.backgroundColor = "#6ef8ea";
    } else if (travelMode === "cycling") {
      cyclingButton.style.backgroundColor = "#6ef8ea";
    }


    // if (destinationPosition) {
    //   getRoute(destinationPosition,safetyMode,travelMode);
    // } else {
    //     console.error('Destination position not found');
    // }
  });

  walkingButton.addEventListener("click", async function () {
    walkingButton.style.backgroundColor = "#6ef8ea";
    cyclingButton.style.backgroundColor = "#ffffff";
    travelMode = "walking";
    console.log("travel mode: " + travelMode);
  });

  cyclingButton.addEventListener("click", async function () {
    cyclingButton.style.backgroundColor = "#6ef8ea";
    walkingButton.style.backgroundColor = "#ffffff";
    travelMode = "cycling";
    console.log("travel mode: " + travelMode);
  });

  // Add a button to get directions
  const dirButton = document.getElementById('directionButton');

  if (dirButton) {
    dirButton.addEventListener("click", function () {
      console.log("travel mode: " + travelMode);
      getRoute(destinationPosition,safetyMode,travelMode);
    });
  } else {
    console.error('Directions button not found');
  }

  // If the user searches for a place
  // destinationPosition = await search(map, SearchBox, AdvancedMarkerElement);
  // console.log("Destination Position from Search:", destinationPosition);
}

async function search(map, SearchBox, AdvancedMarkerElement) {
  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function () {
    destinationBox.setBounds(map.getBounds());
  });
  // Create the search box and link it to the UI element.
  var destinationInput = document.getElementById('destination');
    var destinationBox = new SearchBox(destinationInput);

  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  return new Promise((resolve, reject) => {
    destinationBox.addListener('places_changed', function () {

      var places = destinationBox.getPlaces();

      if (places.length == 0) {
        return reject('No places found');
      }

      var bounds = new google.maps.LatLngBounds();
      var destinationPosition = null;

      places.forEach(function (destinationPlace) {

        if (!destinationPlace.geometry) {
          console.log("Returned place contains no geometry");
          return;
        }

        // Clear existing markers
        if (window.markers) {
          window.markers.forEach(marker => marker.setMap(null));
        }
        window.markers = [];

        // Create a new marker
        const marker = new AdvancedMarkerElement({
          map: map,
          title: destinationPlace.name,
          position: destinationPlace.geometry.location,
          title: "Uluru",
        });
        // Store the marker
        window.markers.push(marker);

        // Get the accurate position of the place
        destinationPosition = (destinationPlace.geometry.location.toJSON());
        console.log("Destination Position:", destinationPosition);
        if (destinationPlace.geometry.viewport) {
          // Only geocodes have viewport.
          bounds.union(destinationPlace.geometry.viewport);
        } else {
          bounds.extend(destinationPlace.geometry.location);
        }
      });
      map.fitBounds(bounds);
      if (destinationPosition) {
        // Add a button to get directions
        const dirButton = document.getElementById('directionButton');

        if (dirButton) {
          dirButton.addEventListener("click", function () {
            getRoute(destinationPosition);
          });
        } else {
          console.error('Directions button not found');
        }
        resolve(destinationPosition);
      } else {
        reject('No valid destination position found');
      }
    });
  });
}

async function getRoute(destinationPosition, safetyMode, travelMode) {
  // Suppose the user's current location is Plaza de Mayo, Buenos Aires
  startPosition = { lat: -34.6114173, lng: -58.38602299999999 }
  console.log("Current Position:", startPosition);


  // Redirect to the route page
  const destinationString = encodeURIComponent(JSON.stringify(destinationPosition));
  const startPositionString = encodeURIComponent(JSON.stringify(startPosition));
  const url = `Choose_Route.html?start=${startPositionString}&destination=${destinationString}&safetyMode=${safetyMode}&travelMode=${travelMode}`;
  window.location.href = url;
};

async function askAIForRoute(aiButton) {
  if (aiButton) {
    return new Promise(async (resolve, reject) => {
      try {
        const prompt = document.getElementById('prompt').value;
        const response = await fetch('/api/ask-gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log('API Response:', data);

        // Resolve the promise with the data
        resolve(data);
      } catch (error) {
        console.error('Error fetching AI route:', error);
        reject(error);
      }
    });
  } else {
    console.error('AI button not found');
    return Promise.reject('AI button not found');
  }
};

async function geoCoder(location) {
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: location }, function (results, status) {
      if (status === 'OK') {
        const position = results[0].geometry.location.toJSON();
        console.log("Geocoded Position:", position);
        // Resolve the promise with the data
        resolve(position);
      } else {
        console.error('Geocode was not successful for the following reason: ' + status);
        reject(error);
      }
    });
  });
};


// Load the Google Maps API script
loadGoogleMapsAPI();

//添加一个 emergency button 的长按事件，对应在 choose-route。html 中
document.addEventListener('DOMContentLoaded', function () {
  const emergencyButton = document.getElementById('emergency-button');
  let pressTimer;

  // 开始按压
  emergencyButton.addEventListener('mousedown', function () {
    pressTimer = setTimeout(() => {
      handleEmergencyCall();
    }, 3000); // 3秒后触发
  });

  // 如果手指移开或松开，取消计时器
  emergencyButton.addEventListener('mouseup', function () {
    clearTimeout(pressTimer);
  });

  emergencyButton.addEventListener('mouseleave', function () {
    clearTimeout(pressTimer);
  });







  // 处理紧急呼叫
  function handleEmergencyCall() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(function (position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // 这里可以根据实际需求修改紧急电话号码
        const emergencyNumber = '110'; // 中国警察报警电话

        // 创建紧急呼叫链接
        const emergencyUrl = `tel:${emergencyNumber}`;

        // 可以在这里添加发送位置信息到紧急服务的逻辑
        alert(`正在拨打警察电话，您的位置是：\n纬度:${latitude}\n经度: ${longitude}`);

        // 触发电话呼叫
        window.location.href = emergencyUrl;
      });
    } else {
      alert("您的浏览器不支持地理位置功能");
    }
  }
});
// emergency 事件 结束


