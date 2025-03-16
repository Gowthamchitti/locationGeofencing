import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';


declare var google: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapElement!: ElementRef;
  map!: any;
  currentLocation: { lat: number; lng: number; placeName?: string } | null = null;
  destinationLocation: { lat: number; lng: number; placeName?: string } | null = null;
  notificationSent = false; // Flag to prevent duplicate notifications
  destinationMarker: any = null; // Store the single destination marker
   // Radius selection
   radiusOptions = [100, 250, 500,750, 1000, 2000]; // In meters
   selectedRadius = 500; // Default radius
  constructor() {}

  ngOnInit() {
    this.getCurrentLocation();
  }

  ngAfterViewInit() {
    this.loadMap();
  }

  async getCurrentLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      this.getPlaceName(this.currentLocation.lat, this.currentLocation.lng, 'currentLocation');
      this.loadMap();
    } catch (error) {
      console.error('Error getting location:', error);
    }
  }

  loadMap() {
    if (!this.mapElement) return;

    this.map = new google.maps.Map(this.mapElement.nativeElement, {
      center: this.currentLocation || { lat: 20.5937, lng: 78.9629 }, // Default India
      zoom: 15
    });

    // Place marker at current location
    if (this.currentLocation) {
      new google.maps.Marker({
        position: this.currentLocation,
        map: this.map,
        title: 'Your Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
      });
    }

    // Click event to select destination
    this.map.addListener('click', (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      this.destinationLocation = { lat, lng };
      this.getPlaceName(lat, lng, 'destinationLocation');
      if(this.destinationMarker){
        this.destinationMarker.setPosition({ lat, lng })
      }else{
        this.destinationMarker=new google.maps.Marker({
          position: { lat, lng },
          map: this.map,
          title: 'Destination',
          icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
        });
      }
      // Add marker for the destination
    
    });
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

  startMonitoring() {
    if (!this.destinationLocation) {
      alert('Please select a destination first.');
      return;
    }if (this.notificationSent){
      return
    }
    alert('Started monitoring...');

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

      if (distance < this.selectedRadius/1000 && !this.notificationSent) { // Notify when within 500 meters
        this.sendNotification();
        this.notificationSent = true; // Prevent duplicate notifications
      }
    }, 5000); // Check every 5 seconds
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    console.log("distance",R*c)
    return R * c; // Distance in km
  }

  async sendNotification() {
    await LocalNotifications.requestPermissions();
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'You Have Arrived!',
          body: `You are near ${this.destinationLocation?.placeName}`,
          id: 1,
          schedule: { at: new Date(Date.now() + 1000) },
        },
      ],
    });
  }
  reset(){
    this.destinationLocation=null
    this.notificationSent=false
    if(this.destinationMarker){
      this.destinationMarker.setMap(null);
      this.destinationMarker=null;
    }
  }
}
