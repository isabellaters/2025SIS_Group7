// Simple test script for speech-to-text functionality
// Run with: node test-speech-to-text.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Test the Google AI service directly
async function testGoogleAI() {
  console.log('🧪 Testing Google AI Speech-to-Text...');
  
  const apiKey = 'AIzaSyAs_nans-JchazMk0iIdGMwPGn25Z_6ibU';
  
  if (!apiKey) {
    console.error('❌ No API key found');
    return false;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Google AI initialized successfully');
    
    // Test with a simple text prompt first
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = "Hello, this is a test of the Google AI service.";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Google AI text generation test successful');
    console.log('📝 Response:', text);
    
    return true;
  } catch (error) {
    console.error('❌ Google AI test failed:', error.message);
    return false;
  }
}

// Test microphone access
async function testMicrophoneAccess() {
  console.log('🎤 Testing microphone access...');
  
  try {
    // This will only work in a browser environment
    if (typeof navigator === 'undefined') {
      console.log('⚠️  Microphone test requires browser environment');
      return false;
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('✅ Microphone access granted');
    
    // Stop the stream
    stream.getTracks().forEach(track => track.stop());
    console.log('✅ Microphone stream stopped');
    
    return true;
  } catch (error) {
    console.error('❌ Microphone access failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Speech-to-Text Tests...\n');
  
  const googleTest = await testGoogleAI();
  console.log('');
  
  const micTest = await testMicrophoneAccess();
  console.log('');
  
  console.log('📊 Test Results:');
  console.log(`Google AI: ${googleTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Microphone: ${micTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (googleTest) {
    console.log('\n🎉 Google AI is working! The speech-to-text service should work.');
    console.log('💡 To test audio capture, run the Electron app and check the console for transcription output.');
  } else {
    console.log('\n❌ Google AI test failed. Check your API key and internet connection.');
  }
}

// Run the tests
runTests().catch(console.error);
