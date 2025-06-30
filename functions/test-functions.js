#!/usr/bin/env node

/**
 * Test script for Firebase Cloud Functions
 * Run this after starting the Firebase emulator with `npm run serve`
 */

const https = require("https");
const http = require("http");

const FUNCTIONS_BASE_URL = "http://localhost:5001"; // Default Firebase Functions emulator port
const PROJECT_ID = process.env.GCLOUD_PROJECT || "linear-discord-ticket-bot";
const REGION = process.env.FUNCTION_REGION || "us-central1";

/**
 * Make HTTP request to function
 */
function makeRequest(url, method = "POST", data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Firebase-Functions-Test/1.0",
      },
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers["Content-Length"] = Buffer.byteLength(jsonData);
    }

    const protocol = urlObj.protocol === "https:" ? https : http;
    const req = protocol.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Test the manual retry trigger function
 */
async function testManualRetryTrigger() {
  console.log("\n🔧 Testing Manual Retry Trigger Function...");

  const functionUrl = `${FUNCTIONS_BASE_URL}/${PROJECT_ID}/${REGION}/triggerRetryManual-0`;

  try {
    console.log(`Making request to: ${functionUrl}`);
    const response = await makeRequest(functionUrl);

    console.log("✅ Response Status:", response.status);
    console.log("📄 Response Data:", JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      console.log("✅ Manual retry trigger test PASSED");
    } else {
      console.log("❌ Manual retry trigger test FAILED");
    }
  } catch (error) {
    console.error("❌ Error testing manual retry trigger:", error.message);
  }
}

/**
 * Test the health check function
 */
async function testHealthCheck() {
  console.log("\n📊 Testing Health Check Function...");

  const functionUrl = `${FUNCTIONS_BASE_URL}/${PROJECT_ID}/${REGION}/retryTasksHealth-0`;

  try {
    console.log(`Making request to: ${functionUrl}`);
    const response = await makeRequest(functionUrl);

    console.log("✅ Response Status:", response.status);
    console.log("📄 Response Data:", JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      console.log("✅ Health check test PASSED");
    } else {
      console.log("❌ Health check test FAILED");
    }
  } catch (error) {
    console.error("❌ Error testing health check:", error.message);
  }
}

/**
 * Test the main retry tasks function
 */
async function testRetryTasks() {
  console.log("\n🔄 Testing Retry Tasks Function...");

  const functionUrl = `${FUNCTIONS_BASE_URL}/${PROJECT_ID}/${REGION}/retryTasks-0`;

  try {
    console.log(`Making request to: ${functionUrl}`);
    const response = await makeRequest(functionUrl);

    console.log("✅ Response Status:", response.status);
    console.log("📄 Response Data:", JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      console.log("✅ Retry tasks test PASSED");
    } else {
      console.log("❌ Retry tasks test FAILED");
    }
  } catch (error) {
    console.error("❌ Error testing retry tasks:", error.message);
  }
}

/**
 * Display test information
 */
function displayTestInfo() {
  console.log("🧪 Firebase Cloud Functions Test Runner");
  console.log("=====================================");
  console.log("Project ID:", PROJECT_ID);
  console.log("Region:", REGION);
  console.log("Functions Base URL:", FUNCTIONS_BASE_URL);
  console.log("");
  console.log("Prerequisites:");
  console.log("1. Firebase emulator running: npm run serve");
  console.log("2. Next.js app running on http://localhost:3000");
  console.log("3. Environment variables set in functions/.env.local");
  console.log("");
}

/**
 * Main test runner
 */
async function runTests() {
  displayTestInfo();

  // Wait a moment for display
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("🚀 Starting function tests...\n");

  // Test all functions
  await testHealthCheck();
  await testManualRetryTrigger();
  await testRetryTasks();

  console.log("\n✅ All tests completed!");
  console.log(
    "\n💡 Tip: Check the Firebase emulator logs for detailed function execution logs.",
  );
}

// Check if this script is being run directly
if (require.main === module) {
  runTests().catch((error) => {
    console.error("❌ Test runner failed:", error);
    process.exit(1);
  });
}

module.exports = {
  testManualRetryTrigger,
  testHealthCheck,
  testRetryTasks,
  runTests,
};
