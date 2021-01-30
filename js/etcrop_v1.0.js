var landing;
var dashboard;
var info;
var stations;
var userLocation;
var nearestStationName;
var nearestStationDistance;
var weather;
var currentDateTime;
var etref;
var etcrop;
var cropCoefficient;

var canopyCoverContainer;
var cropCoefficientContainer;
var etrefContainer;
var etcropContainer;
var imageOriginalContainer;
var imageClassifiedContainer;

var cameraUpload;

function preload() {

    // Get date and time
    currentDateTime = new Date();

    // Get location
    if(geoCheck() == true){
        userLocation =  getCurrentPosition(openweathermap);
	}else{
		alert('Geolocation is disabled. Enable phone geolocation in your phone settings and then refresh the page.')
	}
}


function setup() {
    noCanvas();

    // Display running version
    console.log('Running etcrop v1.0')
    
    // Camera button
    cameraBtn = document.getElementById('camera-btn');
    cameraUpload = createFileInput(gotFile);
    cameraUpload.parent("camera-btn");
    cameraUpload.elt.addEventListener('click', updateweather, true)
    cameraBtn.children[0].style.display = "none" // prevent display of "Choose file"

    // USer data table
    dataTableBtn = document.getElementById('data-table-btn');
    dataTableBtn.addEventListener('click', updatedatatable)
    
    // Landing
    landing = document.getElementById('landing');

    // Location
    info = document.getElementById('info');

    // Dashboard
    dashboard = document.getElementById('dashboard');

    // Dashboard components
    latitudeContainer = document.getElementById('latitude-value');
    longitudeContainer = document.getElementById('longitude-value');
    dateContainer = document.getElementById('date-value');
    timeContainer = document.getElementById('time-value');
    canopyCoverContainer = document.getElementById('canopy-cover-value');
    cropCoefficientContainer = document.getElementById('crop-coefficient-value');
    etrefContainer = document.getElementById("etref-value");
    etcropContainer = document.getElementById('etcrop-value');
    imageOriginalContainer = document.getElementById('image-original');
    imageClassifiedContainer = document.getElementById('image-classified');

    // Set datetime and location dashboard values
    latitudeContainer.innerText = userLocation.latitude.toFixed(6);
    longitudeContainer.innerText = userLocation.longitude.toFixed(6);
    dateContainer.innerText = currentDateTime.toLocaleDateString();
    timeContainer.innerText = currentDateTime.toLocaleTimeString('en-US', { hour12: false });

    // Display space and time information
    info.style.display = "block";

    // Save to local storage datetime and position data
    localStorage.setItem('user-last-latitude', userLocation.latitude);
    localStorage.setItem('user-last-longitude', userLocation.longitude)
    localStorage.setItem('user-last-datetime', currentDateTime);

}



// FUNCTIONS
function updatedatatable(){
    // Clean table before adding new rows
    document.getElementById("data-table").innerHTML = "";

    // If user has metadata from pictures, then display info in a table
    if(localStorage.getItem('user-data')){
        let userData = JSON.parse(localStorage.getItem('user-data'));
        createElement('tr', "<th>DateTime</th><th>Position</th><th>Metrics</th>").parent('data-table');
        
        for(let i=userData.length-1; i>=0; i--){
            let rowDate = new Date(userData[i].datetime);
            createElement('tr',
                        "<td> Date: " + rowDate.toLocaleDateString() + "</br> Time: " + rowDate.toLocaleTimeString('en-US', { hour12: false }) + "</td>" +
                        "<td> Lat: " + userData[i].lat.toFixed(6) + "</br> Lon: " + userData[i].lon.toFixed(6) + "</td>" +
                        "<td> ETref: " + userData[i].etref.toFixed(2) + 
                            "</br> ETcrop: " + userData[i].etcrop.toFixed(2) +
                            "</br> Kcb: " + userData[i].cropCoefficient.toFixed(2) +
                            "</br> CC: " + userData[i].percentCanopyCover.toFixed(1) +
                        "</td>").parent('data-table');
        }
    
    // If user does not have any data on storage, then display placeholder
    } else {
        createElement('div',"No data available.").parent('data-table');
    }
}

function dalton(){
    // Model proposed by Dalton in 1802

    // If we are here is because weather data retrieval was successful
    M.toast({html: 'Weather is ready!', displayLength:2000, inDuration: 500})

    // Compute sum of weather variables
    let windSpeedSum = 0;
    let vpdSum = 0;

    let N = weather.hourly.length;
    for(let i=0; i<N; i++){

        // Get weather variables from OpenWeatherMap API response
        let T = weather.hourly[i].temp - 273.15;
        let RH = weather.hourly[i].humidity
        let W = weather.hourly[i].wind_speed;

        // Compute vapor pressure deficit for each hour
        let es = 0.6108 * Math.exp(17.27 * (T) / (T + 237.3));
        let ea = es * (RH/100);
        let vpd = es - ea;

        // Compute sums to compute means
        vpdSum += vpd;
        windSpeedSum += W
    }

    // Compute average wind speed and vapor pressure deficit
    let windSpeedMean = windSpeedSum/N
    let vpdMean = vpdSum/N

    // Calculate reference ET using Dalton's method (mass transfer method)
    etref = (2.98 + 0.38*windSpeedMean) * vpdMean**0.69; // grass
    etref = Math.min(etref, 18);
    etref = Math.max(etref, 0.15);
    //etref = (3.34 + 0.77*windSpeedMean) * vpdMean**0.69; // alfalfa
}


function errorweatherapi(){
    M.toast({html: 'Connection failed.', displayLength:3000, inDuration: 500, classes: 'toast-warning'});
}


function openweathermap(){
    let dt = parseInt(( (new Date().getTime() - 24*60*60*1000) / 1000).toFixed(0));
    let URL = "https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=" + userLocation.latitude + "&lon=" + userLocation.longitude + "&dt=" + dt + "&appid=99fe4ecff5e236e5a687ccc63fd1a7c4";
    weather = loadJSON(URL, dalton, errorweatherapi)
}


function updateweather(){
    let lat1 = userLocation.latitude;
    let lon1 = userLocation.longitude;
    let lat2 = float(localStorage.getItem('user-last-latitude'));
    let lon2 = float(localStorage.getItem('user-last-longitude'));
    let timeChange = (currentDateTime.getTime() - new Date(localStorage.getItem('user-last-datetime')).getTime())/86400000;
    let distanceChange = haversine(lat1,lon1,lat2,lon2);

    if(distanceChange > 2 || timeChange >= 1){
        M.toast({html: 'Getting new weather', displayLength:1500, completeCallback: openweathermap})
    }
}


function dayofyear(){
    var today = new Date();
    var start = new Date(today.getFullYear(), 0, 0); // Constructing the Jan 1 for the given year
    var diff = today - start; // time differnece by second
    var oneDay = 1000 * 60 * 60 * 24;
    var days = Math.floor(diff / oneDay); // calculate days 
    return days;
}


function etcropfn(cc){
    if(cc >= 0 && cc <= 80){
        cropCoefficient = 0.17 + 1.225 * (cc/100); // grass
        //cropCoefficient = 0.17 + 1.1 * (cc/100); // alfalfa
    } else {
        cropCoefficient = 1.05;
    }
    etcrop = etref * cropCoefficient;
}


function haversine(lat1,lon1,lat2,lon2) {
    // Compute delta degrees and convert to radians
    let dLat = (lat2 - lat1) * Math.PI / 180;  
    let dLon = (lon2 - lon1) * Math.PI / 180;  

    // Earth radius in kilometers
    let  earthRadius = (6356.752 + 6378.137)/2

    // haversine
    let h  =  Math.sin(dLat / 2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2)**2;
    h = Math.min(h,1) // Prevent values greater than 1 due to floating point error.

    // Compute distance
    let d   = 2 * earthRadius * Math.asin(Math.sqrt(h)); // distance in kilometers

    return d
}


function storeuserdata(name,value) {

	// Get the existing data
	var existing = localStorage.getItem(name);

	// Create new array or convert the localStorage string to an array
    if(existing){
        existing = JSON.parse(existing);
    }else{
        existing = [];
    }

	// Add new data to localStorage Array
    existing.push(value);
    
    // Trim older data
    let N = 10;
    if(existing.length > N){
        existing = existing.splice(-N);
    }

	// Save back to localStorage
	localStorage.setItem(name, JSON.stringify(existing));
};


function gotFile(file) {
    if (file.type === 'image'){

        updateweather()

        // Remove current images on display (if any)
        if(document.getElementById('original-image').querySelector('img')){
            document.getElementById('original-image').querySelector('img').remove();
            document.getElementById('classified-image').querySelector('img').remove()
        }

        loadImage(file.data,function(imgOriginal){
            getCurrentPosition(); //update recent location to the local storage. 

            // Get upload timestamp
            currentDateTime = new Date();
            
            // Resize image so that the largest side has 1440 pixels
            if(imgOriginal.width>=imgOriginal.height){
                imgOriginal.resize(1440,0); 
            } else {
                imgOriginal.resize(0,1440);
            }
            imgOriginal.loadPixels();
            
            
            // Initiatve classified image
            imgClassified = createImage(imgOriginal.width, imgOriginal.height);
            imgClassified.loadPixels();

            // Classify image following manuscript settings
            let RGratio = 0.95;
            let RBratio = 0.95;
            let greenPixels = 0;

            for(let y=0; y<imgClassified.height; y++){
                for(let x=0; x<imgClassified.width; x++){
                    let index = (x + y * imgClassified.width)*4;
                
                    let R = float(imgOriginal.pixels[index+0]);
                    let G = float(imgOriginal.pixels[index+1]);
                    let B = float(imgOriginal.pixels[index+2]);
                
                    if (R/G < RGratio && B/G < RBratio && 2*G-R-B>20){
                        imgClassified.pixels[index+0] = 255;
                        imgClassified.pixels[index+1] = 255;
                        imgClassified.pixels[index+2] = 255;
                        imgClassified.pixels[index+3] = 255;
                        greenPixels += 1;
                        
                    } else {
                        imgClassified.pixels[index+0] = 0;
                        imgClassified.pixels[index+1] = 0;
                        imgClassified.pixels[index+2] = 0;
                        imgClassified.pixels[index+3] = 255;
                    }
                }
            }
            imgClassified.updatePixels();

            // Compute percent green canopy cover
            percentCanopyCover = greenPixels/(imgClassified.width * imgClassified.height)*100;

            // Compute ET crop
            etcropfn(percentCanopyCover)

            // Update location values
            latitudeContainer.innerText = userLocation.latitude.toFixed(6);
            longitudeContainer.innerText = userLocation.longitude.toFixed(6);
            dateContainer.innerText = currentDateTime.toLocaleDateString();
            timeContainer.innerText = currentDateTime.toLocaleTimeString('en-US', { hour12: false });

            // Update dashboard values
            canopyCoverContainer.innerText = percentCanopyCover.toFixed(1);
            cropCoefficientContainer.innerText = cropCoefficient.toFixed(2);
            etrefContainer.innerText = etref.toFixed(2);
            etcropContainer.innerText = etcrop.toFixed(2);

            // Add dashboard original image
            dashboardOriginalImage = createImg(imgOriginal.canvas.toDataURL(),'original image');
            dashboardOriginalImage.parent('original-image');

            // Add dashboard classified image
            dashboardClassifiedImage = createImg(imgClassified.canvas.toDataURL(),'classified image');
            dashboardClassifiedImage.parent('classified-image');

            // Update last user values
            localStorage.setItem('user-last-latitude', userLocation.latitude);
            localStorage.setItem('user-last-longitude', userLocation.longitude)
            localStorage.setItem('user-last-datetime', currentDateTime);
            localStorage.setItem('user-last-etref', etref);

            // Save to local storage
            storeuserdata('user-data',{
                'datetime': currentDateTime.getTime(),
                'lat': userLocation.latitude, 
                'lon': userLocation.longitude, 
                'etref': etref,
                'etcrop': etcrop,
                'percentCanopyCover': percentCanopyCover, 
                'cropCoefficient': cropCoefficient
            });

            // Hide landing
            landing.style.display = "none";
            
            // Displaying the result grid 
            info.style.visibility = 'visible';
            info.style.display = 'block';
 
            dashboard.style.visibility = 'visible';
            dashboard.style.display = "block";

        });

    } else {
        alert("The selected file is not supported. Please load an image in .JPG or .PNG format")
        }
}




// OLD FUNCTIONS
// function computeStationDistances(){
//     let N = stations.getRowCount()
//     for(let i=0; i<N; i++){
//         let stationLat = float(stations.getColumn("LATITUDE")[i]);
//         let stationLon = float(stations.getColumn("LONGITUDE")[i]);
//         let userLat = float(userLocation.latitude);
//         let userLon = float(userLocation.longitude);
//         let stationDistance = distance(userLat,userLon,stationLat,stationLon);
//         stations.set(i, 'DISTANCE', stationDistance);
//     }
//     console.log('Done computing distances')
// }

// function findNearestStation(){
//     let distances = stations.getColumn("DISTANCE")
//     let idxNearest = distances.indexOf(Math.min(...distances));
//     nearestStationName = stations.get(idxNearest,"NAME");
//     nearestStationDistance = stations.get(idxNearest,"DISTANCE")
//     console.log('Done finding nearest station')
// }

// function requestNearestStationData(){
//     let root = "http://mesonet.k-state.edu/rest/stationdata/?"

//     let yesterdayDate = new Date(new Date().getTime() - 86400000);
//     let yyyy = yesterdayDate.getFullYear().toString();
//     let mm = yesterdayDate.getMonth() + 1;
//     if(mm<10){
//         mm = "0" + mm.toString();
//     }else{
//         mm = mm.toString();
//     }
//     let dd = yesterdayDate.getDate();
//     if(dd<10){
//         dd = "0" + dd.toString();
//     }else{
//         dd = dd.toString();
//     }
//     let HH = "00"
//     let MM = "00"
//     let SS = "00"

//     let startDate = yyyy.toString() + mm + dd + HH + MM + SS;
//     let endDate = startDate;
//     let vars = "TEMP2MMIN,TEMP2MMAX,RELHUM2MMIN,RELHUM2MMAX,WSPD2MAVG,SR"

//     let URL = root + 'stn=' + nearestStationName + '&int=day' + '&t_start=' + startDate + '&t_end=' + endDate + "&vars=" + vars;
//     weather = loadTable(URL,'csv','header');
// }