import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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
   radiusOptions = [50, 100, 250, 500,750, 1000, 2000]; // In meters
   selectedRadius = 500; // Default radius
   resetData =false;
   intervalId: any; // Declare a variable to store the interval ID
  marker: any;
  constructor() {}

  async ngOnInit() {

    await this.requestPermissions();
    this.getCurrentLocation();
    this.triggerVibration();
    this.sendNotification() //jhg
  }

  
  async requestPermissions() {
    try {
      // Request location permissions
      const locPermission = await Geolocation.requestPermissions();
      console.log('Location Permission:', locPermission);

      // Request notification permissions (Android 13+)
      const notifPermission = await LocalNotifications.requestPermissions();
      console.log('Notification Permission:', notifPermission);
    } catch (error) {
      console.error('Permission request error:', error);
      alert("Please grant permission")
    }
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

  async triggerVibration() {
    navigator.vibrate(1000);

    await Haptics.impact({ style: ImpactStyle.Medium });
    if ('vibrate' in navigator) {
      console.log("Virabtion enabled")
      navigator.vibrate([300, 100, 300]); // Vibrate pattern
    }
  }

  loadMap() {
    if (!this.mapElement) return;

    this.map = new google.maps.Map(this.mapElement.nativeElement, {
      center: this.currentLocation || { lat: 20.5937, lng: 78.9629 }, // Default India
      zoom: 15
    });
  // google.Maps.setPadding(0, 100, 0, 0);
  
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

    this.intervalId=setInterval(async () => {
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
        clearInterval(this.intervalId)
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
          sound:'default',
          smallIcon:'ic_launcher',
        },
      ],
    });
    this.triggerVibration();
  }
  refresh(){
    this.getCurrentLocation();
  }

  reset(){
    this.destinationLocation=null
    this.notificationSent=false
    clearInterval(this.intervalId)

    if(this.destinationMarker){
      this.destinationMarker.setMap(null);
      this.destinationMarker=null;
    }
  }
  async recenterMap() {
    const coordinates = await Geolocation.getCurrentPosition();

    const position = {
      lat: coordinates.coords.latitude,
      lng: coordinates.coords.longitude,
    };

    this.map.setCenter(position);
    this.marker.setPosition(position);
  }
}
