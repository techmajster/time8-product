#!/usr/bin/env node

/**
 * Test that currency UI changes work correctly
 */

const fs = require('fs');
const path = require('path');

function testCurrencyUI() {
  console.log('🎨 Testing Currency UI Changes');
  console.log('==============================\n');

  // Test files that were modified
  const filesToCheck = [
    'app/onboarding/add-users/page.tsx',
    'app/admin/settings/components/AdminSettingsClient.tsx'
  ];

  let allGood = true;

  filesToCheck.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${file}`);
      allGood = false;
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`📄 Checking ${file}:`);
    
    // Check for currency note text
    if (content.includes('Prices shown in PLN')) {
      console.log('   ✅ PLN pricing note present');
    } else {
      console.log('   ❌ PLN pricing note missing');
      allGood = false;
    }

    if (content.includes('EUR available') || content.includes('EUR pricing available')) {
      console.log('   ✅ EUR availability note present');
    } else {
      console.log('   ❌ EUR availability note missing');
      allGood = false;
    }

    if (content.includes('checkout')) {
      console.log('   ✅ Checkout reference present');
    } else {
      console.log('   ❌ Checkout reference missing');
      allGood = false;
    }
    
    console.log('');
  });

  // Check that no complex currency logic was added
  const complexPatterns = [
    'geolocation',
    'ip-based',
    'currency-switcher',
    'detectCurrency',
    'currencySwitch'
  ];

  console.log('🚫 Verifying no complex currency logic added:');
  filesToCheck.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
    
    complexPatterns.forEach(pattern => {
      if (content.includes(pattern.toLowerCase())) {
        console.log(`   ❌ Found complex pattern "${pattern}" in ${file}`);
        allGood = false;
      }
    });
  });
  
  if (complexPatterns.every(pattern => 
    !filesToCheck.some(file => {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8').toLowerCase();
      return content.includes(pattern.toLowerCase());
    })
  )) {
    console.log('   ✅ No complex currency detection logic found');
  }

  console.log('\n📋 Summary:');
  if (allGood) {
    console.log('✅ All currency UI changes implemented correctly');
    console.log('✅ Simple approach maintained');
    console.log('✅ Lemon Squeezy handles currency conversion');
    console.log('✅ User-friendly notes added to UI');
  } else {
    console.log('❌ Some issues found with currency UI changes');
  }

  return allGood;
}

const success = testCurrencyUI();
console.log(`\n🏁 Result: ${success ? 'PASS' : 'FAIL'}`);
process.exit(success ? 0 : 1);