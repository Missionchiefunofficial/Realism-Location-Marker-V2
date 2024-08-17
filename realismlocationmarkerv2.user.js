// ==UserScript==
// @name         Building Locations "Realism Location Marker"
// @namespace    www.missionchief-unofficial.com
// @version      2.1
// @description  Displays Real locations in game map for players who want realism
// @author       MissionChief Unofficial Team
// @homepage     https://missionchief-unofficial.com
// @match        https://www.operacni-stredisko.cz/*
// @match        https://www.alarmcentral-spil.dk/*
// @match        https://www.leitstellenspiel.de/*
// @match        https://www.missionchief-australia.com/*
// @match        https://www.missionchief.co.uk/*
// @match        https://www.missionchief.com/*
// @match        https://www.centro-de-mando.es/*
// @match        https://www.centro-de-mando.mx/*
// @match        https://www.hatakeskuspeli.com/*
// @match        https://www.operateur112.fr/*
// @match        https://www.operatore112.it/*
// @match        https://www.missionchief-japan.com/*
// @match        https://www.missionchief-korea.com/*
// @match        https://www.nodsentralspillet.com/*
// @match        https://www.meldkamerspel.com/*
// @match        https://www.operatorratunkowy.pl/*
// @match        https://www.operador193.com/*
// @match        https://www.jogo-operador112.com/*
// @match        https://www.jocdispecerat112.com/*
// @match        https://www.dispetcher112.ru/*
// @match        https://www.dispecerske-centrum.com/*
// @match        https://www.larmcentralen-spelet.se/*
// @match        https://www.112-merkez.com/*
// @require      https://github.com/Missionchiefunofficial/osmtogeojson/raw/gh-pages/osmtogeojson.js
// @downloadURL  https://github.com/Missionchiefunofficial/Realism-Location-Marker-V2/raw/main/realismlocationmarkerv2.user.js
// @updateURL    https://github.com/Missionchiefunofficial/Realism-Location-Marker-V2/raw/main/realismlocationmarkerv2.user.js
// @icon         https://avatars.githubusercontent.com/u/170798253?s=400&u=f41df3f61e7c9381b488d8c7883af370e04d5ee6&v=4
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var scriptEnabled = false;
    var poiLayer;
    var selectedPOIType = null; // Default: MissionChief Unofficial Markers Off
    var requestToken = 0; // Added token variable

    // Counter and time of last reset in Local Storage
    var requestCounter = parseInt(localStorage.getItem('requestCounter')) || 0;
    var lastResetTime = parseInt(localStorage.getItem('lastResetTime')) || 0;

    // Check if reset is required (more than 24 hours passed)
    if (Date.now() - lastResetTime > 24 * 60 * 60 * 1000) {
        resetRequestCounter();
    }

    // Create dropdown menu
    var dropdown = document.createElement('select');
    dropdown.style.padding = '2px';
    dropdown.style.cursor = 'pointer';
    dropdown.style.border = 'none';
    dropdown.style.background = '#000000';
    dropdown.style.color = '#fff';
    dropdown.style.borderRadius = '0px';

    var poiTypes = [
        { label: "MissionChief Unofficial Markers Off V2", value: "" },
        { label: "Show Fire Station Locations", value: "amenity=fire_station" },
        { label: "Show Ambulance Station Locations", value: "emergency=ambulance_station" },
        { label: "Show Police Stations Locations", value: "amenity=police" },
        { label: "Show Hospital Locations", value: "amenity=hospital" },
        { label: "Show Prison Locations", value: "amenity=prison" },
        { label: "Show Lifeguard Station Locations", value: "emergency=lifeguard" },
        { label: "Show Dispatch Control Locations", value: "emergency=control_centre" },
        { label: "Show Disaster Response Locations", value: "emergency=disaster_response" },
        { label: "Show Mountain Rescue Locations", value: "emergency=mountain_rescue" }
    ];

    poiTypes.forEach(function (poi) {
        var option = document.createElement('option');
        option.value = poi.value;
        option.text = poi.label;
        dropdown.add(option);
    });

    dropdown.addEventListener('change', function () {
        selectedPOIType = dropdown.value;
        scriptEnabled = selectedPOIType === "" ? false : selectedPOIType !== "" && selectedPOIType !== ""; // Updated check
        updatePOI();
    });

    // Insert control button
    var leafletControl = document.querySelector('.leaflet-control-attribution');
    leafletControl.appendChild(dropdown);

    // Directly add and remove event listener
    map.on('zoomend moveend', updatePOI);

    function enableScript() {
        scriptEnabled = true;
        //console.log("Script enabled");
        updatePOI();
    }

    function disableScript() {
        if (scriptEnabled) {
            scriptEnabled = false;
            //console.log("Script disabled");
            clearPOILayer();
            requestToken++; // Increment the token to cancel outstanding requests
        }
    }

    function updatePOI() {
        //console.log("Update POI: scriptEnabled =", scriptEnabled, ", selectedPOIType =", selectedPOIType);

        var currentToken = requestToken; // Store the current token

        if (scriptEnabled && selectedPOIType !== null && selectedPOIType !== "") {
            if (requestCounter < 10000) {
                clearPOILayer();
                loadPOI(selectedPOIType, currentToken);
            } else {
                console.log("Maximum number of requests reached. Please wait until the next day.");
            }
        } else {
            clearPOILayer();
        }
    }

    function clearPOILayer() {
        if (poiLayer) {
            map.removeLayer(poiLayer);
            //console.log("POI layer removed");
        }
    }

    function loadPOI(type, currentToken) {
        // Check if the token matches and the option is not "POIs off" before adding the POIs
        if (currentToken === requestToken && type !== null && scriptEnabled) {
            console.log("loading data");

            incrementRequestCounter();

            let overpassApiUrl = buildOverpassApiUrl(map, type);

            $.get(overpassApiUrl, function (osmDataAsXml) {
                // Check if the token matches before adding the POIs
                if (currentToken === requestToken) {
                    var resultAsGeojson = osmtogeojson(osmDataAsXml);
poiLayer = L.geoJson(resultAsGeojson, {
    pointToLayer: function (feature, latlng) {
        var icon = L.icon({
            iconUrl: 'https://img.icons8.com/?size=80&id=1C7GGjJBWQzh',
            iconSize: [40, 40], // Icon size in pixels
            iconAnchor: [25, 50], // Anchor point of the icon, here middle bottom
            popupAnchor: [0, -25] // Popup anchor point: moves the popup relative to the icon's anchor point
        });

        var marker = L.marker(latlng, { icon: icon });

        // Add a popup with coordinates and feature properties
        const googleMapsLink = `<a href="https://www.google.com/maps/search/?api=1&query=${latlng.lat},${latlng.lng}" target="_blank">Click here to view on Google Maps</a>`;
        marker.bindPopup(
            `<b>Coordinates:</b> ${latlng.lat}, ${latlng.lng}<br /><b>Whats here:</b> ${type}<br />${googleMapsLink}<br /></b>NOTE: Marker may be slightly out due to maps displaying slightly differant coordinates <br />`
        );

        return marker;
    },
    filter: function (feature, layer) {
        var isPolygon = (feature.geometry) && (feature.geometry.type !== undefined) && (feature.geometry.type === "Polygon");
        if (isPolygon) {
            feature.geometry.type = "Point";
            var polygonCenter = L.latLngBounds(feature.geometry.coordinates[0]).getCenter();
            feature.geometry.coordinates = [polygonCenter.lat, polygonCenter.lng];
        }
        return true;
    }
}).addTo(map);
                    console.log("finish loading");
                }
            });
        }
    }

    function buildOverpassApiUrl(map, overpassQuery) {
        var bounds = map.getBounds().getSouth() + ',' + map.getBounds().getWest() + ',' + map.getBounds().getNorth() + ',' + map.getBounds().getEast();
        var nodeQuery = 'node[' + overpassQuery + '](' + bounds + ');';
        var wayQuery = 'way[' + overpassQuery + '](' + bounds + ');';
        var relationQuery = 'relation[' + overpassQuery + '](' + bounds + ');';
        var query = '?data=[out:xml][timeout:25];(' + nodeQuery + wayQuery + relationQuery + ');out body;>;out skel qt;';
        var baseUrl = 'https://overpass-api.de/api/interpreter';
        var resultUrl = baseUrl + query;
        return resultUrl;
    }

    function incrementRequestCounter() {
        requestCounter++;
        localStorage.setItem('requestCounter', requestCounter);
    }

    function resetRequestCounter() {
        requestCounter = 0;
        lastResetTime = Date.now();
        localStorage.setItem('requestCounter', requestCounter);
        localStorage.setItem('lastResetTime', lastResetTime);
    }

    // Initial setup
    disableScript();

})();
