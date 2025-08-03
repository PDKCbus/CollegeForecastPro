// Quick test of the OpenWeather API key
async function testWeatherAPI() {
  console.log('🌤️ Testing OpenWeather API Key');
  
  try {
    // Test current weather for Columbus, OH
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=39.9612&lon=-82.9988&appid=${process.env.OPENWEATHER_API_KEY}&units=imperial`
    );
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.log('API Error:', response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Working! Current weather:', {
      location: data.name,
      temp: data.main.temp,
      conditions: data.weather[0].main,
      wind: data.wind.speed
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWeatherAPI();