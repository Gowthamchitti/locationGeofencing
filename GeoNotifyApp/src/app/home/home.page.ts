import { Component, OnInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

declare var google: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone:false
})
export class HomePage implements OnInit {
  currentLocation: { lat: number; lng: number, placeName?: string } | null = null;
  destinationLocation: { lat: number; lng: number, placeName?: string } | null = null;
  searchQuery = '';
  locationSuggestions: string[] = [];
  autocompleteService: any;

  constructor() {}

  ngOnInit() {
    if (!window.hasOwnProperty('google')) {
      console.error('Google Maps library is not loaded!');
    }
    this.autocompleteService = new google.maps.places.AutocompleteService();
    this.getCurrentLocation();
  }

  async getCurrentLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      this.getPlaceName(this.currentLocation.lat, this.currentLocation.lng, 'currentLocation');
    } catch (error) {
      console.error('Error getting location:', error);
    }
  }

  getPlaceName(lat: number, lng: number, locationType: 'currentLocation' | 'destinationLocation') {
    const geocoder = new google.maps.Geocoder();
    const latlng = { lat, lng };
  
    geocoder.geocode({ location: latlng }, (results: any, status: any) => {
      if (status === 'OK' && results && results.length > 0) {
        if (locationType === 'currentLocation' && this.currentLocation) {
          this.currentLocation.placeName = results[0].formatted_address;
        } else if (locationType === 'destinationLocation' && this.destinationLocation) {
          this.destinationLocation.placeName = results[0].formatted_address;
        }
      } else {
        console.error('Geocoder failed due to:', status);
      }
    });
  }
  

  fetchLocationSuggestions() {
    if (this.searchQuery.length > 2) {
      this.autocompleteService.getPlacePredictions(
        { input: this.searchQuery },
        (predictions: any, status: any) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            this.locationSuggestions = predictions.map((p: any) => p.description);
          } else {
            this.locationSuggestions = [];
          }
        }
      );
    } else {
      this.locationSuggestions = [];
    }
  }

  selectDestination(suggestion: string) {
    const placesService = new google.maps.places.PlacesService(document.createElement('div'));
    placesService.findPlaceFromQuery(
      { query: suggestion, fields: ['geometry', 'formatted_address'] },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
          this.destinationLocation = {
            lat: results[0].geometry!.location.lat(),
            lng: results[0].geometry!.location.lng(),
            placeName: results[0].formatted_address
          };
          this.searchQuery = suggestion;
          this.locationSuggestions = [];
        }
      }
    );
  }

  startMonitoring() {
    if (!this.destinationLocation) {
      alert('Please select a destination first.');
      return;
    }
    alert("Started monitoring..,")
    setInterval(async () => {
      const position = await Geolocation.getCurrentPosition();
      this.currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      this.getPlaceName(this.currentLocation.lat, this.currentLocation.lng, 'currentLocation');

      const distance = this.calculateDistance(
        this.currentLocation.lat,
        this.currentLocation.lng,
        this.destinationLocation.lat,
        this.destinationLocation.lng
      );

      if (distance < 0.5) { // Notify when within 500 meters
        alert(`You are near ${this.destinationLocation.placeName}`);
        return
      }
    }, 5000); // Check every 5 seconds
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }
}
