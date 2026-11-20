#!/usr/bin/env node

/**
 * Test script to verify subscription endpoints and Stripe integration
 */

import { spawn } from "child_process";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8080";
const TEST_TIMEOUT = 30000;

async function testSubscriptionPage() {
  console.log("🧪 Testing subscription page...");
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "networkidle", timeout: TEST_TIMEOUT });
    
    // Check if page loaded
    const title = await page.locator("text=Planes de suscripción").isVisible();
    if (!title) {
      throw new Error("Subscription page title not found");
    }
    console.log("✅ Subscription page loaded successfully");
    
    // Check for subscription cards
    const cards = await page.locator("[class*='rounded-2xl']").count();
    if (cards < 4) {
      throw new Error(`Expected at least 4 subscription cards, found ${cards}`);
    }
    console.log(`✅ Found ${cards} subscription cards`);
    
    // Check for pricing information
    const prices = await page.locator("text=/\\$[0-9]+\\.[0-9]{2}/").count();
    if (prices < 4) {
      throw new Error(`Expected at least 4 prices, found ${prices}`);
    }
    console.log(`✅ Found ${prices} price displays`);
    
    // Check for feature lists
    const features = await page.locator("text=Clips").count();
    if (features < 2) {
      throw new Error(`Expected feature descriptions, found ${features}`);
    }
    console.log(`✅ Found subscription features`);
    
  } catch (error) {
    console.error("❌ Subscription page test failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function testSubscriptionEndpoint() {
  console.log("\n🧪 Testing subscription endpoint structure...");
  
  try {
    // Check if endpoint file exists and has proper structure
    const response = await fetch(`${BASE_URL}/api/stripe/subscription`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: "monthly", role: "business" }),
    });
    
    // We expect 401 (no auth) or 503 (Stripe not configured) - not 404
    if (response.status === 404) {
      throw new Error("Subscription endpoint not found (404)");
    }
    
    console.log(`✅ Subscription endpoint exists (status: ${response.status})`);
    
    const data = await response.json();
    if (data.error) {
      console.log(`✅ Endpoint returns expected error: ${data.error}`);
    }
    
  } catch (error) {
    console.error("❌ Subscription endpoint test failed:", error);
    throw error;
  }
}

async function runTests() {
  console.log("🚀 Starting subscription functionality tests...\n");
  
  try {
    await testSubscriptionPage();
    await testSubscriptionEndpoint();
    
    console.log("\n✅ All subscription tests passed!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Tests failed:", error.message);
    process.exit(1);
  }
}

runTests();
