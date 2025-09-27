// Quick integration test script
// Run with: node test-integration.js

const SERVER_URL = 'http://localhost:5000';

async function testAPI() {
  console.log('🔍 Testing Backend API Integration...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await fetch(`${SERVER_URL}/api/health`);
    const healthData = await healthResponse.json();

    if (healthData.success) {
      console.log('   ✅ Health check passed');
      console.log(`   📊 Server uptime: ${healthData.data.uptime.toFixed(2)}s`);
    } else {
      console.log('   ❌ Health check failed');
    }

    // Test 2: Root endpoint
    console.log('\n2. Testing Root Endpoint...');
    const rootResponse = await fetch(`${SERVER_URL}/`);
    const rootData = await rootResponse.json();

    if (rootData.success) {
      console.log('   ✅ Root endpoint working');
      console.log(`   📝 Message: ${rootData.message}`);
    } else {
      console.log('   ❌ Root endpoint failed');
    }

    // Test 3: CORS headers (important for React frontend)
    console.log('\n3. Testing CORS Configuration...');
    const corsResponse = await fetch(`${SERVER_URL}/api/health`, {
      method: 'OPTIONS'
    });

    const corsHeaders = corsResponse.headers.get('access-control-allow-origin');
    if (corsHeaders) {
      console.log('   ✅ CORS configured properly');
      console.log(`   🌐 Allowed origins: ${corsHeaders}`);
    } else {
      console.log('   ⚠️  CORS headers not found (might be okay)');
    }

    console.log('\n🎉 Basic integration tests completed!');
    console.log('\n📋 Next Steps for Frontend Integration:');
    console.log('   1. Update your React app API base URL to: http://localhost:5000/api');
    console.log('   2. Replace frontend fraud detection calls with backend API calls');
    console.log('   3. Test transaction creation and analysis endpoints');
    console.log('\n📖 See backend/README.md for complete API documentation');

  } catch (error) {
    console.error('❌ Integration test failed:');
    console.error('   Error:', error.message);
    console.log('\n🛠️  Troubleshooting:');
    console.log('   1. Make sure the backend server is running: npm start');
    console.log('   2. Check that port 5000 is not in use by another service');
    console.log('   3. Verify your .env file is configured correctly');
  }
}

// Run tests
testAPI();