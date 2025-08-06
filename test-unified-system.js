// Test unified geometry system
console.log('🎛️ TESTING UNIFIED GEOMETRY SYSTEM');

// Wait for scene to load then test
setTimeout(() => {
  // Test 1: Check all sections are registered
  console.log('📋 All registered sections:', transformUtils.getAllSectionNames());
  
  // Test 2: Check specific sections
  console.log('✅ Revenue Streams exists:', transformUtils.hasSection('Revenue Streams'));
  console.log('✅ Cost Structure exists:', transformUtils.hasSection('Cost Structure'));
  console.log('✅ Value Propositions exists:', transformUtils.hasSection('Value Propositions'));
  
  // Test 3: Simple height adjustment to all sections
  console.log('📏 Setting all sections to height 1.5...');
  transformUtils.adjustAllSectionsHeight(1.5);
  
  // Test 4: Individual section manipulation
  setTimeout(() => {
    console.log('📏 Setting Revenue Streams to height 2.0...');
    transformUtils.setSectionHeight('Revenue Streams', 2.0);
    
    console.log('📏 Setting Cost Structure to height 0.8...');
    transformUtils.setSectionHeight('Cost Structure', 0.8);
    
    // Test 5: Export current state
    setTimeout(() => {
      console.log('💾 Current system state:', transformUtils.exportCurrentState());
    }, 1000);
  }, 1000);
}, 3000);

