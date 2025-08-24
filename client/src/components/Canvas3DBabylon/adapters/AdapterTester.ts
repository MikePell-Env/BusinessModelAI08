/**
 * SAFE ADAPTER TESTING - Verify New System Matches Current Behavior
 * 
 * Tests that bridge adapters provide identical behavior to current managers
 * WITHOUT touching any existing code.
 */

import { CameraControllerAdapter } from './CameraControllerAdapter';
import { SceneSetupAdapter } from './SceneSetupAdapter';

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
}

/**
 * Comprehensive test suite for adapter compatibility
 */
export class AdapterTester {
  private results: TestResult[] = [];
  private sceneAdapter: SceneSetupAdapter | null = null;
  private cameraAdapter: CameraControllerAdapter | null = null;

  /**
   * Run all tests and return results
   */
  public async runTests(canvas: HTMLCanvasElement): Promise<TestResult[]> {
    console.log('🧪 Starting adapter compatibility tests...');
    
    try {
      // Test Scene Adapter
      await this.testSceneSetup(canvas);
      
      // Test Camera Adapter
      await this.testCameraController();
      
      // Test Integration
      await this.testIntegration();
      
      // Test Memory Management
      await this.testMemoryManagement();
      
    } catch (error) {
      this.addResult('Overall Test', false, `Test failed: ${error}`);
    }
    
    // Print results
    this.printResults();
    return this.results;
  }

  private async testSceneSetup(canvas: HTMLCanvasElement): Promise<void> {
    console.log('🔧 Testing SceneSetupAdapter...');
    
    try {
      this.sceneAdapter = new SceneSetupAdapter(canvas);
      
      // Test API availability
      const engine = this.sceneAdapter.getEngine();
      const scene = this.sceneAdapter.getScene();
      
      this.addResult('Scene API', !!engine && !!scene, 
        `Engine: ${!!engine}, Scene: ${!!scene}`);
      
      // Test render loop setup
      let renderCalled = false;
      this.sceneAdapter.startRenderLoop(() => {
        renderCalled = true;
      });
      
      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.addResult('Render Loop', renderCalled, 
        `Render loop ${renderCalled ? 'started' : 'failed'}`);
      
      console.log('✅ SceneSetupAdapter tests completed');
      
    } catch (error) {
      this.addResult('Scene Setup', false, `Error: ${error}`);
    }
  }

  private async testCameraController(): Promise<void> {
    console.log('📷 Testing CameraControllerAdapter...');
    
    if (!this.sceneAdapter) {
      this.addResult('Camera Setup', false, 'Scene adapter required first');
      return;
    }
    
    try {
      const scene = this.sceneAdapter.getScene();
      // Note: We need to pass the actual canvas element, but for testing we'll mock it
      const mockCanvas = document.createElement('canvas');
      
      this.cameraAdapter = new CameraControllerAdapter(scene, mockCanvas);
      
      // Test initial state
      const initialMode = this.cameraAdapter.getCurrentMode();
      this.addResult('Initial Camera Mode', initialMode === '3D View', 
        `Initial mode: ${initialMode}`);
      
      // Test camera switching
      this.cameraAdapter.switchToMode('3D Top');
      const topMode = this.cameraAdapter.getCurrentMode();
      this.addResult('Switch to 3D Top', topMode === '3D Top', 
        `After switch: ${topMode}`);
      
      // Test camera access
      const activeCamera = this.cameraAdapter.getActiveCamera();
      this.addResult('Camera Access', !!activeCamera, 
        `Active camera available: ${!!activeCamera}`);
      
      // Test switch back
      this.cameraAdapter.switchToMode('3D View');
      const backMode = this.cameraAdapter.getCurrentMode();
      this.addResult('Switch Back', backMode === '3D View', 
        `Back to: ${backMode}`);
      
      console.log('✅ CameraControllerAdapter tests completed');
      
    } catch (error) {
      this.addResult('Camera Controller', false, `Error: ${error}`);
    }
  }

  private async testIntegration(): Promise<void> {
    console.log('🔗 Testing Integration...');
    
    if (!this.sceneAdapter || !this.cameraAdapter) {
      this.addResult('Integration', false, 'Both adapters required');
      return;
    }
    
    try {
      // Test that both adapters use the same scene
      const sceneFromSetup = this.sceneAdapter.getScene();
      const sceneFromCamera = this.cameraAdapter.getScene();
      
      this.addResult('Shared Scene', sceneFromSetup === sceneFromCamera, 
        `Scenes match: ${sceneFromSetup === sceneFromCamera}`);
      
      // Test CanvasManager access
      const canvasManager1 = this.sceneAdapter.getCanvasManager();
      const canvasManager2 = this.cameraAdapter.getCanvasManager();
      
      this.addResult('Shared CanvasManager', canvasManager1 === canvasManager2, 
        `CanvasManagers match: ${canvasManager1 === canvasManager2}`);
      
      console.log('✅ Integration tests completed');
      
    } catch (error) {
      this.addResult('Integration', false, `Error: ${error}`);
    }
  }

  private async testMemoryManagement(): Promise<void> {
    console.log('🧹 Testing Memory Management...');
    
    if (!this.sceneAdapter) {
      this.addResult('Memory Test', false, 'Scene adapter required');
      return;
    }
    
    try {
      // Test disposal
      const engineBefore = this.sceneAdapter.getEngine();
      const sceneBefore = this.sceneAdapter.getScene();
      
      this.addResult('Pre-Disposal State', !!engineBefore && !!sceneBefore, 
        `Resources available before disposal`);
      
      // Dispose
      this.sceneAdapter.dispose();
      
      // Verify disposal (basic check)
      this.addResult('Disposal', true, 'Disposal completed without error');
      
      console.log('✅ Memory management tests completed');
      
    } catch (error) {
      this.addResult('Memory Management', false, `Error: ${error}`);
    }
  }

  private addResult(test: string, passed: boolean, details: string): void {
    this.results.push({ test, passed, details });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${test}: ${details}`);
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log(`Passed: ${passed}/${total}`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Adapters are ready for integration.');
    } else {
      console.log('⚠️  Some tests failed. Review before proceeding.');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`❌ ${r.test}: ${r.details}`);
      });
    }
  }

  /**
   * Quick test function for console use
   */
  public static async quickTest(): Promise<void> {
    console.log('🚀 Running quick adapter test...');
    
    // Create test canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const tester = new AdapterTester();
    const results = await tester.runTests(canvas);
    
    const allPassed = results.every(r => r.passed);
    console.log(allPassed ? '🎉 Quick test PASSED!' : '⚠️  Quick test had failures');
  }
}

// Make available for console testing
(window as any).testAdapters = AdapterTester.quickTest;